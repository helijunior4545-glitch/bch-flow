"""Optional compatibility adapter for the existing NOWNodes V4.3 reader.

Only runs when explicitly passed to observe(..., enabled=True).
"""
from .contracts import Outpoint, Snapshot
from .engine import ProviderFailure

class LegacyNownodes:
    name = "nownodes_blockbook"

    def observe(self, address):
        from app_bch_flow.blockchain.v43_address_utxo import observe_address, ObservationUnavailable
        try:
            old = observe_address(address)
        except ObservationUnavailable as exc:
            code = str(exc)
            mapped = {
                "provider_key_missing": "provider_not_configured",
                "address_observation_disabled": "provider_not_configured",
                "provider_not_synced_or_wrong_chain": "provider_not_synced",
                "wrong_coin": "provider_wrong_network",
            }.get(code, "provider_error")
            raise ProviderFailure(mapped) from None
        return Snapshot(self.name, old.address, old.network,
            tuple(Outpoint(x["txid"], x["vout"], x["satoshis"], x["confirmations"]) for x in old.utxos))
