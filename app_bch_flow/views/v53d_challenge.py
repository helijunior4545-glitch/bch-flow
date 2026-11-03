# V5.3-D1: application-level proof only. No private keys or settlement.
import json
from datetime import timedelta
from django.db import transaction
from django.http import JsonResponse
from django.utils import timezone
from django.views.decorators.http import require_POST
from app_bch_flow.models import BCHMembership, BCHWalletChallenge
from app_bch_flow.views.authentication import current_identity
from app_bch_flow.wallet.v53b_cashaddr import validate_cashaddr_checksum
from app_bch_flow.wallet.v53c_proof import new_challenge, challenge_digest, verify_proof

MAX_BODY = 4096


def _json(request):
    if len(request.body) > MAX_BODY:
        return None
    try:
        value = json.loads(request.body.decode('utf-8'))
        return value if isinstance(value, dict) else None
    except (ValueError, UnicodeError):
        return None


def _identity_and_member(request, org_id):
    identity = current_identity(request)
    if identity is None:
        return None
    return BCHMembership.objects.filter(
        identity=identity, organization_id=org_id,
        is_active=True, organization__is_active=True,
        role__in=('owner', 'admin'),
    ).first()


def _error(message, status=400):
    return JsonResponse({'ok': False, 'error': message}, status=status)


@require_POST
def issue(request, org_id):
    member = _identity_and_member(request, org_id)
    if member is None:
        return _error('unauthorized', 403)
    data = _json(request)
    if data is None:
        return _error('invalid json')
    address, network = data.get('address'), data.get('network')
    if network != 'chipnet':
        return _error('V5.3-D1 permits chipnet only')
    if not validate_cashaddr_checksum(address, network=network):
        return _error('invalid chipnet address')
    now = timezone.now()
    challenge = new_challenge(
        organization_id=str(org_id), network=network,
        address=address, now=int(now.timestamp()),
    )
    digest = challenge_digest(challenge).hex()
    BCHWalletChallenge.objects.create(
        identity=member.identity, organization=member.organization,
        public_address=address, network=network, provider='xo_template',
        challenge_digest=digest, expires_at=now + timedelta(seconds=300),
    )
    response = JsonResponse({'ok': True, 'challenge': challenge,
                             'expires_in_seconds': 300})
    response['Cache-Control'] = 'no-store'
    return response


@require_POST
def verify(request, org_id):
    member = _identity_and_member(request, org_id)
    if member is None:
        return _error('unauthorized', 403)
    data = _json(request)
    if data is None:
        return _error('invalid json')
    challenge = data.get('challenge')
    public_key_hex = data.get('public_key_hex')
    signature_der_hex = data.get('signature_der_hex')
    if not all(isinstance(x, str) for x in
               (challenge, public_key_hex, signature_der_hex)):
        return _error('missing proof fields')
    if len(challenge) > 2048 or len(public_key_hex) > 132 or len(signature_der_hex) > 300:
        return _error('proof too large')
    digest = challenge_digest(challenge).hex()
    with transaction.atomic():
        record = BCHWalletChallenge.objects.select_for_update().filter(
            challenge_digest=digest, identity=member.identity,
            organization=member.organization, network='chipnet',
            provider='xo_template',
        ).first()
        if record is None or record.consumed_at is not None or record.expires_at <= timezone.now():
            return _error('challenge missing, expired or consumed', 409)
        valid = verify_proof(
            challenge=challenge, public_key_hex=public_key_hex,
            signature_der_hex=signature_der_hex,
            expected_organization_id=str(org_id), expected_network='chipnet',
            expected_address=record.public_address,
        )
        if not valid:
            return _error('invalid ownership proof', 403)
        record.consumed_at = timezone.now()
        record.save(update_fields=['consumed_at'])
    response = JsonResponse({
        'ok': True, 'ownership_proof_valid': True,
        'address': record.public_address, 'network': 'chipnet',
        'wallet_connected': False, 'send_enabled': False,
        'receive_enabled': False, 'settlement_enabled': False,
    })
    response['Cache-Control'] = 'no-store'
    return response
