"""Sign into a pre-provisioned customer account without exposing its password."""
from django.shortcuts import redirect, render
from django.urls import reverse
from django.utils.translation import gettext as _
from django.views.decorators.cache import never_cache
from django.views.decorators.debug import sensitive_variables
from django.views.decorators.http import require_POST
from app_bch_flow.forms.authentication import LoginForm
from app_bch_flow.identity.jury import authenticate_juror, JuryConfigurationError, access_context, configuration
from app_bch_flow.identity.sessions import create_session, set_session_cookie, revoke_session, COOKIE_NAME
from .authentication import current_identity


@never_cache
@require_POST
@sensitive_variables()
def enter(request):
    current = current_identity(request)
    if current and not current.is_demo and current.email != configuration()[0]:
        return redirect('bch_flow:dashboard')
    try:
        identity, organization = authenticate_juror()
    except JuryConfigurationError:
        return render(request, 'app_bch_flow/authentication/login.html', {
            'form': LoginForm(), **access_context(),
            'jury_error': _('Jury access is not available yet. Please use regular sign in or contact the organizer.'),
        }, status=503)
    token, _session = create_session(identity)
    response = redirect(reverse('bch_flow:financial_home', args=[organization.pk]) + '?asset=BCH&environment=live')
    revoke_session(request.COOKIES.get(COOKIE_NAME))
    set_session_cookie(response, token, request=request)
    return response
