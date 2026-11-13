"""Conservative V4.3 claim on a V4.2 review event; no settlement."""
import re
from dataclasses import dataclass
from django.db import connections, transaction, IntegrityError
from app_bch_flow.models import BCHInvoice, BCHFinancialEvent
from app_bch_flow.models.outpoint_reservations import BCHOutpointReservation

class ReservationConflict(ValueError):
    pass

@dataclass(frozen=True)
class ReservationResult:
    reservation_id: str
    created: bool
    invoice_id: str
    outpoint: str


def reserve_outpoint(invoice_id, evidence_event_id, txid, output_index, *, write=False):
    """Idempotent for same invoice+event. Conflicts fail closed; no payment writes.

    Unique PostgreSQL constraint arbitrates simultaneous cross-invoice claims.
    A reservation is NOT evidence of address ownership or confirmed payment.
    """
    if type(write) is not bool or type(output_index) is not int or output_index < 0:
        raise ReservationConflict('Invalid reservation arguments')
    if not isinstance(txid,str) or not re.fullmatch(r'[0-9a-fA-F]{64}',txid):
        raise ReservationConflict('Invalid TXID')
    txid=txid.lower()
    if connections['default'].vendor != 'postgresql':
        raise ReservationConflict('PostgreSQL required')
    with transaction.atomic(using='default'):
        try:
            invoice=BCHInvoice.objects.using('default').select_for_update().get(pk=invoice_id)
            event=BCHFinancialEvent.objects.using('default').get(
                pk=evidence_event_id, invoice=invoice, organization_id=invoice.organization_id,
                event_type='bch.v42.attribution_pre_review')
        except (BCHInvoice.DoesNotExist,BCHFinancialEvent.DoesNotExist,TypeError,ValueError) as exc:
            raise ReservationConflict('Invoice or V4.2 event missing') from exc
        meta=event.metadata
        if not isinstance(meta,dict) or meta.get('network')!=invoice.network or meta.get('txid')!=txid:
            raise ReservationConflict('Evidence does not match invoice/network/TXID')
        if meta.get('decision')!='manual_review_only' or meta.get('review_required') is not True:
            raise ReservationConflict('Evidence not eligible for supervised review')
        if not isinstance(meta.get('assessment_digest'),str) or len(meta['assessment_digest'])!=64:
            raise ReservationConflict('Missing evidence digest')
        outpoints=meta.get('outpoints')
        if not isinstance(outpoints,list) or not any(isinstance(o,dict) and o.get('txid')==txid and type(o.get('vout')) is int and o['vout']==output_index for o in outpoints):
            raise ReservationConflict('Outpoint absent from V4.2 evidence')
        prior=BCHOutpointReservation.objects.using('default').filter(network=invoice.network,txid=txid,output_index=output_index).first()
        if prior:
            if prior.invoice_id==invoice.pk and prior.evidence_event_id==event.pk:
                return ReservationResult(str(prior.pk),False,str(invoice.pk),f'{invoice.network}:{txid}:{output_index}')
            raise ReservationConflict('Outpoint already reserved')
        if not write:
            return ReservationResult('',False,str(invoice.pk),f'{invoice.network}:{txid}:{output_index}')
        try:
            with transaction.atomic(using='default'):
                obj=BCHOutpointReservation.objects.using('default').create(
                    organization_id=invoice.organization_id,invoice=invoice,evidence_event=event,
                    network=invoice.network,txid=txid,output_index=output_index)
        except IntegrityError as exc:
            raise ReservationConflict('Concurrent outpoint reservation conflict') from exc
        return ReservationResult(str(obj.pk),True,str(invoice.pk),f'{invoice.network}:{txid}:{output_index}')
