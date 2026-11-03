# Implementation status

The repository now includes standalone identity and organization membership, legacy
BCH observation tools, and a separate multi-asset payment orchestration center.

See [Payment platform implementation and activation](../../docs/PAYMENT_PLATFORM.md)
for current capabilities, reproducible commands, provider configuration, validation
evidence and activation boundaries. The previous scaffold inventory was historical
and did not describe the later migrations, authentication or checkout implementations.

The local sandbox supports the complete receive/reserve/authorize/send flow for
simulated BTC, BCH and BRL units. Concrete full-node and Mercado Pago receiving
adapters are implemented but were not validated against actual external accounts
or networks in this environment. Legacy watch-only endpoints remain non-authoritative.

Mainnet and real-money readiness is not established. Pix payouts are not implemented;
external signer integration remains a manual package/sign/submit workflow. Read the
activation document before configuring a real provider or handling funds.

Merchant self-service connections and nine-language selection are now implemented.
English is the default. USD/EUR are independent sandbox currencies; real fiat rails
are still unavailable. See ../../docs/MERCHANT_CONNECTIONS_AND_LANGUAGES.md.
