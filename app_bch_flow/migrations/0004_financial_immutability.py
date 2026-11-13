"""Protect journal history and approved intent from accidental ORM overwrites."""
from django.db import migrations

SQL = """
CREATE FUNCTION flow_journal_immutable() RETURNS trigger LANGUAGE plpgsql AS $$
BEGIN RAISE EXCEPTION 'Financial journal is append-only' USING ERRCODE = '23514'; END;
$$;
CREATE TRIGGER flow_journal_no_mutation BEFORE UPDATE OR DELETE ON app_bch_flow_flowjournal
FOR EACH ROW EXECUTE FUNCTION flow_journal_immutable();
CREATE FUNCTION flow_intent_immutable() RETURNS trigger LANGUAGE plpgsql AS $$
BEGIN
 IF NEW.account_id IS DISTINCT FROM OLD.account_id
 OR NEW.amount_units IS DISTINCT FROM OLD.amount_units
 OR NEW.destination IS DISTINCT FROM OLD.destination
 OR NEW.fee_limit_units IS DISTINCT FROM OLD.fee_limit_units
 OR NEW.requested_by_id IS DISTINCT FROM OLD.requested_by_id
 OR NEW.payload_hash IS DISTINCT FROM OLD.payload_hash
 OR NEW.idempotency_key IS DISTINCT FROM OLD.idempotency_key THEN
 RAISE EXCEPTION 'Withdrawal intent is immutable' USING ERRCODE = '23514'; END IF;
 RETURN NEW;
END;
$$;
CREATE TRIGGER flow_withdrawal_immutable BEFORE UPDATE ON app_bch_flow_flowwithdrawal
FOR EACH ROW EXECUTE FUNCTION flow_intent_immutable();
CREATE FUNCTION flow_receipt_immutable() RETURNS trigger LANGUAGE plpgsql AS $$
BEGIN
 IF NEW.request_id IS DISTINCT FROM OLD.request_id
 OR NEW.source_key IS DISTINCT FROM OLD.source_key
 OR NEW.amount_units IS DISTINCT FROM OLD.amount_units THEN
 RAISE EXCEPTION 'Receipt identity is immutable' USING ERRCODE = '23514'; END IF;
 RETURN NEW;
END;
$$;
CREATE TRIGGER flow_receipt_no_reassign BEFORE UPDATE ON app_bch_flow_flowreceipt
FOR EACH ROW EXECUTE FUNCTION flow_receipt_immutable();
"""


class Migration(migrations.Migration):
    dependencies = [('app_bch_flow', '0003_payment_orchestration')]
    operations = [migrations.RunSQL(SQL, reverse_sql='''
        DROP TRIGGER flow_receipt_no_reassign ON app_bch_flow_flowreceipt;
        DROP FUNCTION flow_receipt_immutable();
        DROP TRIGGER flow_withdrawal_immutable ON app_bch_flow_flowwithdrawal;
        DROP FUNCTION flow_intent_immutable();
        DROP TRIGGER flow_journal_no_mutation ON app_bch_flow_flowjournal;
        DROP FUNCTION flow_journal_immutable();
    ''')]
