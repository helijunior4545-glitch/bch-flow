"""BCH Flow Pay V1 pure token integrity checks (no financial mutations)."""
from django.core import signing
from django.test import SimpleTestCase
from app_bch_flow.views.pay_v1 import SALT, MAX_AGE_SECONDS

class PayV1TokenTests(SimpleTestCase):
    def test_token_round_trip(self):
        data = {'org': 'example-org', 'invoice': 'example-invoice'}
        token = signing.dumps(data, salt=SALT)
        self.assertEqual(signing.loads(token, salt=SALT, max_age=MAX_AGE_SECONDS), data)

    def test_tampering_rejected(self):
        token = signing.dumps({'org': 'a', 'invoice': 'b'}, salt=SALT)
        with self.assertRaises(signing.BadSignature):
            signing.loads(token + 'x', salt=SALT, max_age=MAX_AGE_SECONDS)
