"""V4.2 immutable pre-review journal. NEVER a payment or consensus verification."""
import hashlib
import json
from dataclasses import dataclass
from django.db import connections, transaction
from app_bch_flow.models import BCHInvoice, BCHFinancialEvent
from .v35_reconciliation import EVENT_TYPE as OBSERVATION_TYPE
from .v41_attribution import assess_candidate

EVENT_TYPE = 'bch.v42.attribution_pre_review'

class EvidenceLinkError(ValueError):
    pass

@dataclass(frozen=True)
class EvidenceLinkResult:
    event_id: str
    created: bool
    decision: str
    digest: str
    observation_id: str

def journal_assessment(invoice_id, observation_id, candidate, *, write=False):
    """Link V4.1 assessment to an existing V3.5 journal, fail closed.

    PostgreSQL row lock provides same-invoice serialization for this service.
    This is not an outpoint reservation, a settlement, or chain verification.
    """
    if type(write) is not bool:
        raise EvidenceLinkError('write must be boolean')
    if connections['default'].vendor != 'postgresql':
        raise EvidenceLinkError('PostgreSQL required')
    with transaction.atomic(using='default'):
        try:
            invoice = BCHInvoice.objects.using('default').select_for_update().get(pk=invoice_id)
        except (BCHInvoice.DoesNotExist, TypeError, ValueError) as exc:
            raise EvidenceLinkError('Invoice not found') from exc
        if not invoice.organization.is_active:
            raise EvidenceLinkError('Inactive organization')
        try:
            obs = BCHFinancialEvent.objects.using('default').get(
                pk=observation_id, invoice=invoice, organization_id=invoice.organization_id,
                event_type=OBSERVATION_TYPE)
        except (BCHFinancialEvent.DoesNotExist, TypeError, ValueError) as exc:
            raise EvidenceLinkError('Observation not found for invoice') from exc
        meta = obs.metadata
        if not isinstance(meta, dict) or meta.get('source') != 'external_unverified':
            raise EvidenceLinkError('Invalid observation provenance')
        digest = meta.get('evidence_digest')
        if not isinstance(digest,str) or len(digest)!=64 or any(c not in '0123456789abcdef' for c in digest):
            raise EvidenceLinkError('Invalid observation digest')
        outputs = meta.get('matched_outputs')
        if not isinstance(outputs,list) or not outputs:
            raise EvidenceLinkError('No recorded output evidence')
        # Candidate must match the journal TXID, amounts and outpoint count.
        matches = [o for o in outputs if isinstance(o,dict) and o.get('txid')==candidate.txid]
        if not matches:
            raise EvidenceLinkError('Candidate TXID absent from observation')
        if any(type(o.get('satoshis')) is not int or o['satoshis']<0 or
               type(o.get('confirmations')) is not int or o['confirmations']<0 or
               type(o.get('vout')) is not int or o['vout']<0 for o in matches):
            raise EvidenceLinkError('Malformed output evidence')
        if len({o['vout'] for o in matches})!=len(matches):
            raise EvidenceLinkError('Duplicate outpoint')
        observed=sum(o['satoshis'] for o in matches)
        confirmed=sum(o['satoshis'] for o in matches
                      if o['confirmations'] >= meta.get('min_confirmations',1))
        if (candidate.observed_satoshis!=observed or
            candidate.confirmed_satoshis!=confirmed or
            candidate.output_count!=len(matches) or
            candidate.required_satoshis!=invoice.amount_satoshis):
            raise EvidenceLinkError('Candidate does not match recorded outputs')
        assessment=assess_candidate(invoice.pk,candidate)
        # Best-effort detection only; concurrent cross-invoice claims require DB uniqueness.
        keys={(candidate.txid,o['vout']) for o in matches}
        for other in BCHFinancialEvent.objects.using('default').filter(
            event_type=EVENT_TYPE).exclude(invoice=invoice).only('metadata').iterator():
            om=other.metadata
            if not isinstance(om,dict) or om.get('network')!=invoice.network:
                continue
            for output in om.get('outpoints',[]):
                if isinstance(output,dict) and (output.get('txid'),output.get('vout')) in keys:
                    raise EvidenceLinkError('Outpoint already linked to another invoice')
        canonical=dict(schema=1,invoice_id=str(invoice.pk),observation_id=str(obs.pk),
                       observation_digest=digest,txid=candidate.txid,
                       decision=assessment.decision,reasons=list(assessment.reasons),
                       observed_satoshis=observed,confirmed_satoshis=confirmed,
                       outpoints=sorted([dict(txid=candidate.txid,vout=o['vout']) for o in matches],
                                        key=lambda x:x['vout']),network=invoice.network)
        key=hashlib.sha256(json.dumps(canonical,sort_keys=True,separators=(',',':')).encode()).hexdigest()
        for prior in BCHFinancialEvent.objects.using('default').filter(
            invoice=invoice,event_type=EVENT_TYPE).only('id','metadata').iterator():
            if prior.metadata.get('assessment_digest')==key:
                return EvidenceLinkResult(str(prior.pk),False,assessment.decision,key,str(obs.pk))
        if not write:
            return EvidenceLinkResult('',False,assessment.decision,key,str(obs.pk))
        event=BCHFinancialEvent.objects.using('default').create(
            organization_id=invoice.organization_id,invoice=invoice,
            event_type=EVENT_TYPE,previous_status=invoice.status,next_status=invoice.status,
            metadata=dict(canonical,assessment_digest=key,
                          source='external_unverified',review_required=True,
                          warning='NOT VERIFIED; NOT SETTLEMENT'))
        return EvidenceLinkResult(str(event.pk),True,assessment.decision,key,str(obs.pk))
