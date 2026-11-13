"""Operator-only supervised review command; never settles or moves funds."""
import os
import uuid
from django.core.management.base import BaseCommand, CommandError
from app_bch_flow.blockchain.v36_review import review_observation, ReviewError

class Command(BaseCommand):
    help = 'Review an unverified V3.5 observation without changing payment or invoice state.'

    def add_arguments(self, parser):
        parser.add_argument('invoice_id', type=uuid.UUID)
        parser.add_argument('observation_id', type=uuid.UUID)
        parser.add_argument('actor_id', type=uuid.UUID)
        parser.add_argument('--decision', required=True, choices=['accept_for_investigation', 'reject_evidence'])
        parser.add_argument('--reason', required=True)
        parser.add_argument('--write-review', action='store_true')

    def handle(self, *args, **options):
        if options['write_review'] and os.environ.get('BCHFLOW_V36_ALLOW_REVIEW_WRITE') != '1':
            raise CommandError('Set BCHFLOW_V36_ALLOW_REVIEW_WRITE=1 to record a review')
        try:
            result = review_observation(options['invoice_id'], options['observation_id'],
                options['actor_id'], decision=options['decision'], reason=options['reason'],
                write=options['write_review'])
        except (ReviewError, ValueError) as exc:
            raise CommandError(str(exc)) from exc
        self.stdout.write('decision=%s created=%s event_id=%s' % (
            result.decision, result.created, result.event_id or '(dry-run)'))
        self.stdout.write(self.style.WARNING('UNVERIFIED observation. No payment settlement or status change.'))
