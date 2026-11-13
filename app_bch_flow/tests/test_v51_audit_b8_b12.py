import unittest
from datetime import datetime, timedelta, timezone
from app_bch_flow.blockchain import v51_audit_b8_b12 as a

TX = "a"*64
HASH = "b"*64
ADDR = "bitcoincash:qplrn4mdqrakml5yqels9q432nkdkjkd85u3zsmljn"
NOW = datetime(2026, 11, 2, tzinfo=timezone.utc)

def invoice():
    return {"network":"mainnet","status":"created","amount_satoshis":10000,
            "receiving_cashaddr":ADDR,"expires_at":NOW+timedelta(hours=1)}
def output():
    return {"network":"mainnet","txid":TX,"vout":0,"satoshis":10000,"address":ADDR}
def branch():
    return {"ancestor_hash":HASH,"tip_hash":TX,"tip_height":100,"observed_work":123}
def header():
    return {"height":100,"hash":TX,"previous_hash":HASH,"bits":0x1d00ffff}

class AuditBundleTests(unittest.TestCase):
    def test_b8_valid_still_blocked(self):
        r=a.b8_daa_prerequisites([header()],start_height=100)
        self.assertEqual(r["decision"],"blocked")
        self.assertFalse(r["bch_daa_verified"])
    def test_b9_same_tip_still_blocked(self):
        r=a.b9_compare_branches(branch(),branch())
        self.assertTrue(r["same_tip"])
        self.assertFalse(r["canonical_chain_verified"])
    def test_b10_matching_p2pkh_is_still_not_payment(self):
        kind, payload = a._cashaddr_payload(ADDR)
        self.assertEqual(kind, 0)
        script = (b"\x76\xa9\x14"+payload+b"\x88\xac").hex()
        r=a.b10_compare_script_address(script, ADDR)
        self.assertTrue(r["script_address_equivalence_verified"])
        self.assertFalse(r["settlement_authorized"])
    def test_b10_address_mismatch_blocked(self):
        r=a.b10_compare_script_address("00",ADDR)
        self.assertIn("script_address_mismatch",r["reasons"])
    def test_b11_exact_candidate_still_blocked(self):
        r=a.b11_invoice_candidate(invoice(),output(),now=NOW)
        self.assertTrue(r["amounts_equal"])
        self.assertFalse(r["invoice_attributed"])
    def test_b12_supervised_still_blocked(self):
        r=a.b12_supervised_gate({"decision":"blocked","settlement_authorized":False},actor_role="admin",
            review_reason="Investigate transaction",reviewer_is_submitter=False)
        self.assertFalse(r["settlement_authorized"])
    def test_b8_bad_start_rejected(self):
        with self.assertRaises(a.AuditGateError):
            a.b8_daa_prerequisites([header()],start_height=-1)
    def test_b8_bool_start_rejected(self):
        with self.assertRaises(a.AuditGateError):
            a.b8_daa_prerequisites([header()],start_height=True)
    def test_b8_empty_rejected(self):
        with self.assertRaises(a.AuditGateError):
            a.b8_daa_prerequisites([],start_height=100)
    def test_b8_nonlist_rejected(self):
        with self.assertRaises(a.AuditGateError):
            a.b8_daa_prerequisites("hi",start_height=100)
    def test_b8_bad_bits_rejected(self):
        with self.assertRaises(a.AuditGateError):
            a.b8_daa_prerequisites([{**header(),"bits":0}],start_height=100)
    def test_b8_bad_height_rejected(self):
        with self.assertRaises(a.AuditGateError):
            a.b8_daa_prerequisites([{**header(),"height":101}],start_height=100)
    def test_b8_bad_hash_rejected(self):
        with self.assertRaises(a.AuditGateError):
            a.b8_daa_prerequisites([{**header(),"hash":"z"}],start_height=100)
    def test_b8_bad_link_rejected(self):
        with self.assertRaises(a.AuditGateError):
            a.b8_daa_prerequisites([header(),{**header(),"height":101,"hash":HASH,"previous_hash":HASH}],start_height=100)
    def test_b9_bad_left_rejected(self):
        with self.assertRaises(a.AuditGateError):
            a.b9_compare_branches(None,branch())
    def test_b9_bad_tip_rejected(self):
        with self.assertRaises(a.AuditGateError):
            a.b9_compare_branches({**branch(),"tip_hash":"x"},branch())
    def test_b9_bad_work_rejected(self):
        with self.assertRaises(a.AuditGateError):
            a.b9_compare_branches({**branch(),"observed_work":0},branch())
    def test_b9_bool_height_rejected(self):
        with self.assertRaises(a.AuditGateError):
            a.b9_compare_branches({**branch(),"tip_height":True},branch())
    def test_b9_bad_ancestor_rejected(self):
        with self.assertRaises(a.AuditGateError):
            a.b9_compare_branches(branch(),branch(),trusted_common_ancestor="x")
    def test_b10_odd_hex_rejected(self):
        with self.assertRaises(a.AuditGateError):
            a.b10_compare_script_address("abc",ADDR)
    def test_b10_bad_hex_rejected(self):
        with self.assertRaises(a.AuditGateError):
            a.b10_compare_script_address("zz",ADDR)
    def test_b10_bad_addr_rejected(self):
        with self.assertRaises(a.AuditGateError):
            a.b10_compare_script_address("00","bad")
    def test_b10_non_string_rejected(self):
        with self.assertRaises(a.AuditGateError):
            a.b10_compare_script_address(None,ADDR)
    def test_b10_mixed_case_rejected(self):
        with self.assertRaises(a.AuditGateError):
            a.b10_compare_script_address("00",ADDR[:12].upper()+ADDR[12:])
    def test_b11_bad_invoice_rejected(self):
        with self.assertRaises(a.AuditGateError):
            a.b11_invoice_candidate(None,output(),now=NOW)
    def test_b11_bad_time_rejected(self):
        with self.assertRaises(a.AuditGateError):
            a.b11_invoice_candidate(invoice(),output(),now=NOW.replace(tzinfo=None))
    def test_b11_bad_txid_rejected(self):
        with self.assertRaises(a.AuditGateError):
            a.b11_invoice_candidate(invoice(),{**output(),"txid":"x"},now=NOW)
    def test_b11_bad_vout_rejected(self):
        with self.assertRaises(a.AuditGateError):
            a.b11_invoice_candidate(invoice(),{**output(),"vout":True},now=NOW)
    def test_b11_zero_sats_rejected(self):
        with self.assertRaises(a.AuditGateError):
            a.b11_invoice_candidate(invoice(),{**output(),"satoshis":0},now=NOW)
    def test_b11_invalid_addr_rejected(self):
        with self.assertRaises(a.AuditGateError):
            a.b11_invoice_candidate({**invoice(),"receiving_cashaddr":"bad"},output(),now=NOW)
    def test_b11_invalid_res_rejected(self):
        with self.assertRaises(a.AuditGateError):
            a.b11_invoice_candidate(invoice(),output(),now=NOW,reserved_outpoints=["bad"])
    def test_b11_naive_expiry_rejected(self):
        with self.assertRaises(a.AuditGateError):
            a.b11_invoice_candidate({**invoice(),"expires_at":NOW.replace(tzinfo=None)},output(),now=NOW+timedelta(hours=2))
    def test_b12_bad_candidate_rejected(self):
        with self.assertRaises(a.AuditGateError):
            a.b12_supervised_gate(None,actor_role="admin",review_reason="Investigation needed",reviewer_is_submitter=False)
    def test_b12_bad_flag_rejected(self):
        with self.assertRaises(a.AuditGateError):
            a.b12_supervised_gate({},actor_role="admin",review_reason="Investigation needed",reviewer_is_submitter=1)
    def test_b12_bad_approvals_rejected(self):
        with self.assertRaises(a.AuditGateError):
            a.b12_supervised_gate({},actor_role="admin",review_reason="Investigation needed",reviewer_is_submitter=False,approvals=None)
    def test_b9_different_tips_are_not_canonical(self):
        r=a.b9_compare_branches(branch(),{**branch(),"tip_hash":HASH})
        self.assertIn("fork_or_tip_disagreement",r["reasons"])
    def test_b9_work_is_not_finality(self):
        r=a.b9_compare_branches(branch(),{**branch(),"observed_work":999999999})
        self.assertFalse(r["canonical_chain_verified"])
    def test_b11_expired_is_blocked(self):
        r=a.b11_invoice_candidate({**invoice(),"expires_at":NOW},output(),now=NOW)
        self.assertIn("invoice_expired",r["reasons"])
    def test_b11_reserved_is_blocked(self):
        r=a.b11_invoice_candidate(invoice(),output(),now=NOW,reserved_outpoints=[(TX,0)])
        self.assertIn("outpoint_reserved",r["reasons"])
    def test_b11_wrong_amount_is_blocked(self):
        r=a.b11_invoice_candidate(invoice(),{**output(),"satoshis":9000},now=NOW)
        self.assertIn("amount_mismatch",r["reasons"])
    def test_b12_self_review_is_blocked(self):
        r=a.b12_supervised_gate({"decision":"blocked","settlement_authorized":False},actor_role="admin",review_reason="Investigation needed",reviewer_is_submitter=True)
        self.assertIn("separation_of_duties_missing",r["reasons"])
    def test_b12_duplicate_approvals_blocked(self):
        r=a.b12_supervised_gate({},actor_role="admin",review_reason="Investigation needed",reviewer_is_submitter=False,approvals=["x","x"])
        self.assertIn("duplicate_approvals",r["reasons"])
    def test_b12_unauthorized_role_blocked(self):
        r=a.b12_supervised_gate({},actor_role="viewer",review_reason="Investigation needed",reviewer_is_submitter=False)
        self.assertIn("reviewer_not_authorized",r["reasons"])
    def test_b12_never_approves_untrusted_candidate(self):
        r=a.b12_supervised_gate({"decision":"approved","settlement_authorized":True},actor_role="owner",review_reason="Investigation needed",reviewer_is_submitter=False)
        self.assertIn("untrusted_candidate_state",r["reasons"])
