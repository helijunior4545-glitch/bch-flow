from django.core.management.base import BaseCommand, CommandError
from django.views.decorators.debug import sensitive_variables
from app_bch_flow.identity.jury import provision_juror, configuration, JuryConfigurationError


class Command(BaseCommand):
    help = 'Create/reuse the normal jury customer account from server-side FLOW_JURY_* variables.'

    def add_arguments(self, parser):
        parser.add_argument('--if-configured', action='store_true')

    @sensitive_variables()
    def handle(self, *args, **options):
        email, password, _slug = configuration()
        if options['if_configured'] and not email and not password:
            self.stdout.write('Jury account configuration absent; skipped.')
            return
        try:
            _identity, _organization, created = provision_juror()
        except JuryConfigurationError as exc:
            raise CommandError(str(exc)) from None
        self.stdout.write(self.style.SUCCESS(
            'Jury customer account created. No funds or provider connections added.' if created
            else 'Jury customer account verified. Existing data preserved.'
        ))
