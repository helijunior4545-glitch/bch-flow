BCH Flow Rodada 3: 127 regression tests, isolated 127/127 OK.
18 allowed transitions; 49 forbidden transitions; 20 insufficient amounts;
20 insufficient confirmations; 20 unproven address exclusivity.
Tests use actual v33_engine and payments/state_machine from supplied audit.
These do NOT validate PostgreSQL concurrency, transactional rollback,
crash recovery, canonical BCH chain, independent sources or settlement.
Expected full suite 773+127=900. Financial settlement must remain blocked.
