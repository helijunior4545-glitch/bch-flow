from django import forms
from django.db import IntegrityError
from django.http import Http404
from django.shortcuts import redirect, render
from django.urls import reverse
from django.utils.translation import gettext_lazy as _, gettext
from django.views.decorators.cache import never_cache
from django.views.decorators.debug import sensitive_post_parameters
from django.views.decorators.http import require_http_methods, require_GET
from app_bch_flow.models import FlowProviderConnection
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


@never_cache
@sensitive_post_parameters(
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
    if member.role not in APPROVE_ROLES:
        raise Http404
    manual = ManualForm(prefix="manual")
    oauth = OAuthForm(prefix="oauth")
    error = ""
    if request.method == "POST":
        try:
            action = request.POST.get("action")
            if action == "manual":
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
    return render(
        request,
        "app_bch_flow/financial/integrations.html",
        {
            "member": member,
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
