"""V5.2.1: PostgreSQL-only runtime constraints and two-session arbitration.

Tests run exclusively in Django's disposable test database.
Concurrency probe uses an isolated test-only table, not BCHOutpointReservation.
"""
import threading
import uuid
from django.db import connections, close_old_connections
from django.test import TransactionTestCase

EXPECTED = {
    'bchflow_outpoint_reservation': 'bch_reservation_unique_outpoint',
    'bchflow_transaction': 'bchflow_unique_network_txid',
    'bchflow_idempotency_key': 'bchflow_unique_idempotency',
    'bchflow_payment': 'bchflow_unique_payment_output',
}

class V521PostgresRuntime(TransactionTestCase):
    databases = {'default'}

    def setUp(self):
        super().setUp()
        self.assertEqual(connections['default'].vendor, 'postgresql', 'PostgreSQL required')

    def _constraint(self, table, name):
        with connections['default'].cursor() as cur:
            cur.execute("""SELECT c.contype, pg_get_constraintdef(c.oid), c.convalidated
                           FROM pg_constraint c
                           JOIN pg_class t ON t.oid=c.conrelid
                           JOIN pg_namespace n ON n.oid=t.relnamespace
                           WHERE t.relname=%s AND c.conname=%s
                             AND n.nspname=current_schema()""", [table,name])
            return cur.fetchone()

    def test_01_reservation_unique_constraint_installed(self):
        row=self._constraint('bchflow_outpoint_reservation','bch_reservation_unique_outpoint')
        self.assertIsNotNone(row)
        self.assertEqual(row[0], 'u')
        self.assertTrue(row[2])
        self.assertIn('network',row[1]); self.assertIn('txid',row[1]); self.assertIn('output_index',row[1])

    def test_02_transaction_txid_unique_constraint_installed(self):
        row=self._constraint('bchflow_transaction','bchflow_unique_network_txid')
        self.assertIsNotNone(row)
        self.assertEqual(row[0],'u'); self.assertTrue(row[2])
        self.assertIn('network',row[1]); self.assertIn('txid',row[1])

    def test_03_idempotency_unique_constraint_installed(self):
        row=self._constraint('bchflow_idempotency_key','bchflow_unique_idempotency')
        self.assertIsNotNone(row)
        self.assertEqual(row[0],'u'); self.assertTrue(row[2])
        self.assertIn('organization_id',row[1]); self.assertIn('key',row[1])

    def test_04_payment_output_partial_unique_index_installed(self):
        with connections['default'].cursor() as cur:
            cur.execute("""SELECT indexdef FROM pg_indexes
                           WHERE schemaname=current_schema()
                             AND tablename=%s AND indexname=%s""",
                        ['bchflow_payment','bchflow_unique_payment_output'])
            row=cur.fetchone()
        self.assertIsNotNone(row, 'Partial unique index absent')
        self.assertIn('UNIQUE INDEX',row[0].upper())
        self.assertIn('transaction_id',row[0]); self.assertIn('output_index',row[0])
        self.assertIn('WHERE',row[0].upper())

    def test_05_two_connections_same_key_one_winner(self):
        # Dedicated test table isolates PostgreSQL race arbitration from application fixtures.
        # Does not prove BCH reserve_outpoint() is race safe.
        name='bchflow_v521_probe_'+uuid.uuid4().hex[:12]
        quoted='"'+name+'"'
        with connections['default'].cursor() as cur:
            cur.execute('CREATE TABLE '+quoted+' (key TEXT PRIMARY KEY, owner TEXT NOT NULL)')
        barrier=threading.Barrier(2, timeout=8)
        results=[]
        lock=threading.Lock()
        def worker(owner):
            close_old_connections()
            conn=connections['default']
            try:
                barrier.wait()
                with conn.cursor() as cur:
                    cur.execute('INSERT INTO '+quoted+' (key,owner) VALUES (%s,%s) ON CONFLICT DO NOTHING RETURNING owner', ['shared',owner])
                    won=cur.fetchone() is not None
                with lock:results.append(('ok',won))
            except Exception as exc:
                with lock:results.append(('error',repr(exc)))
            finally:
                conn.close()
        try:
            threads=[threading.Thread(target=worker,args=(str(i),),daemon=True) for i in range(2)]
            for t in threads:t.start()
            for t in threads:t.join(timeout=12)
            self.assertFalse(any(t.is_alive() for t in threads),'Worker timeout/deadlock')
            self.assertEqual(len(results),2,results)
            self.assertTrue(all(s=='ok' for s,_ in results),results)
            self.assertEqual(sum(1 for _,won in results if won),1,results)
            with connections['default'].cursor() as cur:
                cur.execute('SELECT count(*) FROM '+quoted)
                self.assertEqual(cur.fetchone()[0],1)
        finally:
            with connections['default'].cursor() as cur:
                cur.execute('DROP TABLE IF EXISTS '+quoted)
