from app_bch_flow.wallets.wizardconnect.protocol import relay_urls
from django import forms
from django.db import IntegrityError
from django.http import Http404
from django.shortcuts import redirect, render
from django.urls import reverse
from django.utils.translation import gettext_lazy as _, gettext
from django.views.decorators.cache import never_cache
from django.views.decorators.debug import sensitive_post_parameters
from django.views.decorators.http import require_http_methods, require_GET
from app_bch_flow.models import FlowProviderConnection, FlowNodeConnection
from app_bch_flow.identity.sessions import COOKIE_NAME
from app_bch_flow.views.authentication import current_identity
from .views import _member
from .service import APPROVE_ROLES
from . import integrations
from .secrets import cipher
from .amounts import PaymentError

ENVIRONMENTS = [("mercadopago_test", _("Test environment")), ("live", _("Production"))]


class ManualForm(forms.Form):
    environment = forms.ChoiceField(label=_("Environment"), choices=ENVIRONMENTS)
    access_token = forms.CharField(
        label=_("Access token"),
        max_length=4096,
        widget=forms.PasswordInput(
            render_value=False, attrs={"autocomplete": "off", "spellcheck": "false"}
        ),
    )
    webhook_secret = forms.CharField(
        label=_("Webhook signing secret"),
        min_length=16,
        max_length=4096,
        widget=forms.PasswordInput(render_value=False, attrs={"autocomplete": "off"}),
    )
    password = forms.CharField(
        label=_("BCH Flow account password"),
        max_length=200,
        widget=forms.PasswordInput(attrs={"autocomplete": "current-password"}),
    )


class OAuthForm(forms.Form):
    environment = forms.ChoiceField(label=_("Environment"), choices=ENVIRONMENTS)
    password = forms.CharField(
        label=_("BCH Flow account password"),
        max_length=200,
        widget=forms.PasswordInput(attrs={"autocomplete": "current-password"}),
    )



class NodeForm(forms.Form):
    name = forms.CharField(label=_("Wallet name"), max_length=80, required=False, help_text=_("Example: Main wallet or Store wallet."))
    provider = forms.ChoiceField(label=_("Blockchain provider"), choices=[('nownodes', 'NOWNodes'), ('core', 'Bitcoin Core / BCH Node')])
    asset = forms.ChoiceField(
        label=_("Wallet asset"),
        choices=[('BCH', 'Bitcoin Cash (BCH)'), ('BTC', 'Bitcoin (BTC)')],
        initial='BCH',
    )
    api_key = forms.CharField(label=_("NOWNodes API key"), max_length=4096, required=False, widget=forms.PasswordInput(attrs={'autocomplete': 'off'}))
    public_key = forms.CharField(label=_("Account public key (xpub / zpub)"), max_length=120, required=False, help_text=_("BTC: BIP84 account key. BCH: BIP44 account key. Never enter a seed or private key."))
    confirmations = forms.IntegerField(label=_("Required confirmations"), min_value=1, max_value=100, initial=3)
    password = forms.CharField(label=_("BCH Flow account password"), max_length=200, widget=forms.PasswordInput(attrs={'autocomplete': 'current-password'}))

@never_cache
@sensitive_post_parameters(
    "node-api_key",
    "node-password",
    "manual-access_token",
    "manual-webhook_secret",
    "manual-password",
    "oauth-password",
    "password",
)
@require_http_methods(["GET", "POST"])
def home(request, org_id):
    member = _member(request, org_id)
    if member is None:
        return redirect("bch_flow:login")
    if member.identity.is_demo:
        return redirect(reverse('bch_flow:financial_home', args=[org_id]) + '?environment=sandbox')
    if member.role not in APPROVE_ROLES:
        raise Http404
    node_form = NodeForm(prefix="node")
    manual = ManualForm(prefix="manual")
    oauth = OAuthForm(prefix="oauth")
    error = ""
    if request.method == "POST":
        try:
            action = request.POST.get("action")
            if action in ('delete_wallet', 'archive_wallet', 'restore_wallet'):
                from .nodes import manage_wallet
                manage_wallet(member.identity, org_id, request.POST.get('wallet'), action, request.POST.get('password', ''))
                return redirect('bch_flow:merchant_integrations', org_id=org_id)
            elif action == "node":
                node_form = NodeForm(request.POST, prefix="node")
                if node_form.is_valid():
                    data = node_form.cleaned_data
                    from .nodes import connect_nownodes
                    if data['provider'] == 'nownodes':
                        connect_nownodes(member.identity, org_id, data['asset'], data['api_key'], data['public_key'], data['confirmations'], data['password'], name=data['name'])
                    else:
                        from .providers import CoreNode
                        from app_bch_flow.models import FlowAccount
                        integrations.reauthenticate(member.identity, org_id, data['password'])
                        if FlowNodeConnection.objects.filter(organization_id=org_id, asset=data['asset'], environment='live').exists():
                            raise PaymentError(gettext('An existing public wallet cannot be replaced here.'))
                        CoreNode(FlowAccount(organization_id=org_id, asset=data['asset'], environment='live')).ready()
                    return redirect("bch_flow:merchant_integrations", org_id=org_id)
            elif action == "manual":
                manual = ManualForm(request.POST, prefix="manual")
                if manual.is_valid():
                    data = manual.cleaned_data
                    integrations.connect_manual(
                        member.identity,
                        org_id,
                        data["environment"],
                        data["access_token"],
                        data["webhook_secret"],
                        data["password"],
                    )
                    return redirect("bch_flow:merchant_integrations", org_id=org_id)
            elif action == "oauth":
                oauth = OAuthForm(request.POST, prefix="oauth")
                if oauth.is_valid():
                    target = integrations.start_oauth(
                        member.identity,
                        org_id,
                        oauth.cleaned_data["environment"],
                        request.COOKIES.get(COOKIE_NAME),
                        oauth.cleaned_data["password"],
                    )
                    return redirect(target)
            elif action == "disconnect":
                integrations.disconnect(
                    member.identity,
                    org_id,
                    request.POST.get("environment"),
                    request.POST.get("password", ""),
                )
                return redirect("bch_flow:merchant_integrations", org_id=org_id)
            else:
                raise PaymentError(gettext("Invalid operation."))
        except PaymentError as exc:
            error = str(exc)
        except IntegrityError:
            if request.POST.get("action") in ("node", "archive_wallet", "restore_wallet", "delete_wallet"):
                error = gettext(
                    "The wallet connection conflicts with an existing registration. "
                    "Use a distinct account public key for each wallet, "
                    "or refresh to check whether this connection was already saved."
                )
            else:
                error = gettext(
                    "This merchant is already linked elsewhere. Refresh and check the connection status."
                )
    encryption_ready = oauth_ready = True
    try:
        cipher()
    except PaymentError:
        encryption_ready = False
    try:
        integrations.app_config()
    except PaymentError:
        oauth_ready = False
    connections = FlowProviderConnection.objects.filter(
        organization_id=org_id, provider="mercadopago"
    ).order_by("environment")
    from .amounts import display
    from django.db.models import Count
    node_cards = list(FlowNodeConnection.objects.filter(organization_id=org_id).select_related('account').annotate(address_count=Count('addresses')).order_by('archived_at','created_at'))
    for node in node_cards:
        account = getattr(node, 'account', None)
        node.available_label = display(account.available_units if account else 0, node.asset)
        node.reserved_label = display(account.reserved_units if account else 0, node.asset)
    return render(
        request,
        "app_bch_flow/financial/integrations.html",
        {
            "member": member,
            "wizard_relays": relay_urls(),
            "node_form": node_form,
            "node_connections": node_cards,
            "manual_form": manual,
            "oauth_form": oauth,
            "connections": connections,
            "error": error,
            "encryption_ready": encryption_ready,
            "oauth_ready": oauth_ready,
        },
        status=400 if error else 200,
    )


@never_cache
@sensitive_post_parameters()
@require_GET
def oauth_callback(request):
    actor = current_identity(request)
    try:
        if (
            len(request.GET.getlist("state")) != 1
            or len(request.GET.getlist("code")) > 1
        ):
            raise PaymentError(
                gettext(
                    "The authorization session is invalid or expired. Connect again."
                )
            )
        connection = integrations.finish_oauth(
            actor,
            request.COOKIES.get(COOKIE_NAME),
            request.GET.get("state"),
            request.GET.get("code"),
            bool(request.GET.get("error")),
        )
        response = redirect(
            "bch_flow:merchant_integrations", org_id=connection.organization_id
        )
        response["Referrer-Policy"] = "no-referrer"
        return response
    except PaymentError as exc:
        response = render(
            request,
            "app_bch_flow/financial/oauth_result.html",
            {"error": str(exc), "language_next": reverse("bch_flow:dashboard")},
            status=400,
        )
    except IntegrityError:
        response = render(
            request,
            "app_bch_flow/financial/oauth_result.html",
            {
                "error": gettext(
                    "This merchant is already linked elsewhere. Refresh and check the connection status."
                ),
                "language_next": reverse("bch_flow:dashboard"),
            },
            status=409,
        )
    response["Referrer-Policy"] = "no-referrer"
    return response
