"""Translate the server's reserved BCH package into hdwalletv1 signing data."""
from embit import transaction as bitcoin_tx
from embit.base import EmbitError
from django.core.exceptions import ObjectDoesNotExist
from app_bch_flow.financial.amounts import PaymentError, units
from app_bch_flow.financial.nodes import public_wallet
from .validation import validate_withdrawal


def build_sign_request(actor, withdrawal):
    validate_withdrawal(actor, withdrawal)
    package = withdrawal.signing_payload
    if (not package or package.get('asset') != 'BCH'
            or package.get('environment') != 'live' or package.get('chain') != 'main'
            or package.get('provider') != 'nownodes' or package.get('withdrawal') != str(withdrawal.pk)):
        raise PaymentError('Prepare this BCH signing package first.')
    try:
        raw = package['unsigned_transaction']
        if not isinstance(raw, str) or len(raw) > 200000:
            raise ValueError
        tx = bitcoin_tx.Transaction.parse(bytes.fromhex(raw))
        if tx.serialize().hex() != raw.lower() or not 1 <= len(tx.vin) <= 100:
            raise ValueError
        coins = package['inputs']
        if len(coins) != len(tx.vin):
            raise ValueError
        account_key, _fingerprint = public_wallet(withdrawal.account.wallet.public_key)
        sources, paths, public_keys = [], [], []
        for index, (vin, coin) in enumerate(zip(tx.vin, coins)):
            if vin.txid.hex() != coin['txid'] or vin.vout != coin['vout'] or vin.script_sig.data:
                raise ValueError
            branch, child = map(int, coin['derivation'].split('/'))
            if branch not in (0, 1) or not 0 <= child < 2**31:
                raise ValueError
            registered = withdrawal.account.wallet.addresses.get(branch=branch, index=child)
            if registered.address != coin['address']:
                raise ValueError
            public_key = account_key.derive([branch, child]).key.sec()
            from embit import ec, script
            expected_script = script.p2pkh(ec.PublicKey.parse(public_key)).data.hex()
            if coin['script_pubkey'] != expected_script:
                raise ValueError
            value = units(coin['amount'], 'BCH')
            sources.append({'txid':coin['txid'], 'vout':coin['vout'], 'valueSatoshis':str(value),
                            'lockingBytecode':expected_script, 'sequenceNumber':vin.sequence})
            paths.append([index, 'receive' if branch == 0 else 'change', child])
            public_keys.append(public_key.hex())
    except (ValueError, TypeError, KeyError, AttributeError, IndexError, ObjectDoesNotExist, EmbitError):
        raise PaymentError('The reserved signing package is invalid. Refresh before continuing.') from None
    return {'transaction':raw, 'sourceOutputs':sources, 'inputPaths':paths,
            'publicKeys':public_keys, 'broadcast':False, 'withdrawal':str(withdrawal.pk)}
