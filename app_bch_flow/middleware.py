"""Keep public jury sessions on the sandbox payment journey."""
from django.http import HttpResponse
from django.shortcuts import redirect
from django.urls import reverse
from django.utils.deprecation import MiddlewareMixin
from django.utils.translation import gettext as _
from app_bch_flow.views.authentication import current_identity


class JurySandboxMiddleware(MiddlewareMixin):
    allowed = frozenset({
        'home', 'login', 'register', 'logout', 'jury_enter', 'dashboard',
        'financial_home', 'financial_request', 'financial_receipt',
        'financial_checkout', 'financial_checkout_status', 'financial_qr',
    })

    def process_view(self, request, view_func, view_args, view_kwargs):
        match = request.resolver_match
        if not match or 'bch_flow' not in match.app_names:
            return None
        actor = current_identity(request)
        if not actor or not actor.is_demo or match.url_name in self.allowed:
            return None
        if request.method not in ('GET', 'HEAD'):
            return HttpResponse(_('Demo accounts can only use the sandbox.'), status=403)
        member = actor.memberships.filter(is_active=True, organization__is_active=True).first()
        if member:
            return redirect(reverse('bch_flow:financial_home', args=[member.organization_id]) + '?environment=sandbox')
        return HttpResponse(_('Demo accounts can only use the sandbox.'), status=403)
