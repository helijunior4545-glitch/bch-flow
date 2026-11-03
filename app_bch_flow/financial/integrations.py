"""Mercado Pago merchant connections, OAuth PKCE, refresh and credential isolation."""

from django.views.decorators.debug import sensitive_variables


import base64
import hashlib
import hmac
import json
import re
import secrets
from datetime import timedelta
from urllib.parse import urlencode, urlsplit
from urllib.request import Request
from django.conf import settings
from django.db import transaction
from django.utils import timezone
from django.utils.translation import gettext as _
from app_bch_flow.models import (
    BCHIdentity,
    BCHAuditEvent,
    FlowMerchantIdentity,
    FlowProviderConnection,
    FlowOAuthGrant,
    FlowAccount,
    FlowRequest,
)
from app_bch_flow.identity.sessions import digest_token
from .amounts import PaymentError, ProviderUnavailable
from .service import membership, APPROVE_ROLES
from .secrets import seal, unseal, cipher


@sensitive_variables()
def reauthenticate(actor, org_id, password):
    membership(actor, org_id, APPROVE_ROLES)
    with transaction.atomic():
        actor = BCHIdentity.objects.select_for_update().get(pk=actor.pk)
        failures = BCHAuditEvent.objects.filter(
            actor=actor,
            event_type="flow.integration.auth_failed",
            created_at__gte=timezone.now() - timedelta(minutes=5),
        ).count()
        valid = (
            actor.is_active
            and failures < 5
            and password
            and actor.check_password(password)
        )
        if not valid and failures < 5:
            BCHAuditEvent.objects.create(
                actor=actor,
                organization_id=org_id,
                event_type="flow.integration.auth_failed",
                metadata={},
            )
    if not valid:
        raise PaymentError(_("Invalid password or too many attempts. Try again later."))


@sensitive_variables()
def user_profile(token):
    from .providers import _read_json

    if (
        not isinstance(token, str)
        or not 10 <= len(token) <= 4096
        or "\n" in token
        or "\r" in token
    ):
        raise PaymentError(_("Invalid access token."))
    profile = _read_json(
        Request(
            "https://api.mercadopago.com/users/me",
            headers={"Authorization": "Bearer " + token},
        )
    )
    if (
        not re.fullmatch(r"[0-9]{1,80}", str(profile.get("id", "")))
        or profile.get("site_id") != "MLB"
    ):
        raise PaymentError(
            _("Connect a Brazilian Mercado Pago merchant account for BRL / Pix.")
        )
    return profile


@sensitive_variables()
def app_config():
    from .providers import local_secret

    config = getattr(settings, "FLOW_MP_OAUTH", {})
    client_id = config.get("client_id", "")
    redirect_uri = config.get("redirect_uri", "")
    parsed = urlsplit(redirect_uri)
    if (
        not str(client_id).isdigit()
        or parsed.scheme != "https"
        or not parsed.hostname
        or parsed.username
        or parsed.password
        or parsed.query
        or parsed.fragment
    ):
        raise ProviderUnavailable(
            _(
                "OAuth is not configured. Ask the administrator to register the application and HTTPS callback."
            )
        )
    secret = local_secret(config, "client_secret")
    if not secret:
        raise ProviderUnavailable(
            _(
                "OAuth is not configured. Ask the administrator to register the application and HTTPS callback."
            )
        )
    return str(client_id), redirect_uri, secret


@sensitive_variables()
def _token(payload):
    from .providers import _read_json

    return _read_json(
        Request(
            "https://api.mercadopago.com/oauth/token",
            data=json.dumps(payload).encode(),
            headers={"Content-Type": "application/json"},
        )
    )


@sensitive_variables()
def save_connection(
    actor,
    org_id,
    environment,
    access_token,
    profile,
    method="manual",
    refresh_token="",
    expires_in=None,
    webhook_secret="",
):
    membership(actor, org_id, APPROVE_ROLES)
    if environment not in ("mercadopago_test", "live"):
        raise PaymentError(_("Invalid environment."))
    collector = str(profile["id"])
    access = seal(access_token)
    refresh = seal(refresh_token) if refresh_token else ""
    webhook = seal(webhook_secret) if webhook_secret else ""
    expires = None
    if expires_in is not None:
        if type(expires_in) is not int or not 60 <= expires_in <= 366 * 86400:
            raise PaymentError(_("The provider returned an invalid token lifetime."))
        expires = timezone.now() + timedelta(seconds=expires_in)
    with transaction.atomic():
        # Lock the organization before replacing credentials, including first connect.
        from app_bch_flow.models import BCHOrganization

        BCHOrganization.objects.select_for_update().get(pk=org_id)
        identity, _created = FlowMerchantIdentity.objects.get_or_create(
            provider="mercadopago",
            collector_id=collector,
            defaults={"organization_id": org_id},
        )
        if str(identity.organization_id) != str(org_id):
            raise PaymentError(
                _(
                    "This Mercado Pago account is already assigned to another organization."
                )
            )
        connection = (
            FlowProviderConnection.objects.select_for_update()
            .filter(
                organization_id=org_id, provider="mercadopago", environment=environment
            )
            .first()
        )
        old_collector = connection.collector_id if connection else ""
        # Preserve the legacy server-managed merchant binding too.
        configured = (
            getattr(settings, "FLOW_PAYMENT_PROVIDERS", {})
            .get(str(org_id), {})
            .get("BRL", {})
            .get(environment, {})
        )
        if not old_collector:
            import os

            old_collector = str(
                configured.get("collector_id")
                or os.environ.get(configured.get("collector_id_env", ""), "")
            )
        if (
            old_collector
            and old_collector != collector
            and FlowRequest.objects.filter(
                account__organization_id=org_id,
                account__asset="BRL",
                account__environment=environment,
            ).exists()
        ):
            raise PaymentError(
                _(
                    "Existing payment history belongs to another receiver. Contact support before changing the merchant account."
                )
            )
        # Do not allow another tenant's server-managed collector to be adopted.
        import os

        for organization, assets in getattr(
            settings, "FLOW_PAYMENT_PROVIDERS", {}
        ).items():
            if organization == str(org_id):
                continue
            for item in assets.get("BRL", {}).values():
                other = item.get("collector_id") or os.environ.get(
                    item.get("collector_id_env", ""), ""
                )
                if str(other) == collector:
                    raise PaymentError(
                        _(
                            "This Mercado Pago account is already assigned to another organization."
                        )
                    )
        if connection is None:
            connection = FlowProviderConnection(
                organization_id=org_id,
                provider="mercadopago",
                environment=environment,
                updated_by=actor,
            )
        connection.collector_id, connection.site_id = collector, profile["site_id"]
        connection.method, connection.status = method, "connected"
        connection.access_ciphertext, connection.refresh_ciphertext = access, refresh
        # OAuth uses the platform application's webhook secret; manual tokens may
        # bring their merchant application's own signature secret.
        connection.webhook_ciphertext = webhook
        connection.expires_at, connection.updated_by, connection.verified_at = (
            expires,
            actor,
            timezone.now(),
        )
        connection.save()
        BCHAuditEvent.objects.create(
            actor=actor,
            organization_id=org_id,
            event_type="flow.integration.connected",
            metadata={
                "provider": "mercadopago",
                "environment": environment,
                "collector_id": collector,
                "method": method,
            },
        )
    return connection


@sensitive_variables()
def connect_manual(actor, org_id, environment, token, webhook_secret, password):
    reauthenticate(actor, org_id, password)
    if environment == "mercadopago_test" and not token.startswith("TEST-"):
        raise PaymentError(_("Use a test access token for the test environment."))
    if environment == "live" and not token.startswith("APP_USR-"):
        raise PaymentError(
            _("Use a production access token for the production environment.")
        )
    cipher()
    profile = user_profile(token)
    return save_connection(
        actor, org_id, environment, token, profile, webhook_secret=webhook_secret
    )


@sensitive_variables()
def start_oauth(actor, org_id, environment, session_token, password):
    reauthenticate(actor, org_id, password)
    if environment not in ("mercadopago_test", "live") or not session_token:
        raise PaymentError(_("Invalid environment or session."))
    client_id, redirect_uri, _secret = app_config()
    state = secrets.token_urlsafe(32)
    verifier = secrets.token_urlsafe(48)
    challenge = (
        base64.urlsafe_b64encode(hashlib.sha256(verifier.encode()).digest())
        .decode()
        .rstrip("=")
    )
    FlowOAuthGrant.objects.create(
        organization_id=org_id,
        actor=actor,
        environment=environment,
        state_digest=hashlib.sha256(state.encode()).hexdigest(),
        session_digest=digest_token(session_token),
        verifier_ciphertext=seal(verifier),
        expires_at=timezone.now() + timedelta(minutes=10),
    )
    return "https://auth.mercadopago.com/authorization?" + urlencode(
        {
            "client_id": client_id,
            "response_type": "code",
            "platform_id": "mp",
            "redirect_uri": redirect_uri,
            "state": state,
            "code_challenge": challenge,
            "code_challenge_method": "S256",
        }
    )


@sensitive_variables()
def finish_oauth(actor, session_token, state, code, error=False):
    if (
        not actor
        or not session_token
        or not re.fullmatch(r"[a-zA-Z0-9_-]{40,100}", state or "")
    ):
        raise PaymentError(
            _("The authorization session is invalid or expired. Connect again.")
        )
    with transaction.atomic():
        grant = (
            FlowOAuthGrant.objects.select_for_update()
            .filter(state_digest=hashlib.sha256(state.encode()).hexdigest())
            .first()
        )
        if (
            grant is None
            or grant.consumed_at
            or grant.expires_at <= timezone.now()
            or grant.actor_id != actor.pk
            or not hmac.compare_digest(
                grant.session_digest, digest_token(session_token)
            )
        ):
            raise PaymentError(
                _("The authorization session is invalid or expired. Connect again.")
            )
        membership(actor, grant.organization_id, APPROVE_ROLES)
        grant.consumed_at = timezone.now()
        grant.save(update_fields=["consumed_at"])
    if error or not code or len(code) > 4096:
        raise PaymentError(_("Authorization was cancelled. No credentials were saved."))
    client_id, redirect_uri, secret = app_config()
    data = _token(
        {
            "client_id": client_id,
            "client_secret": secret,
            "grant_type": "authorization_code",
            "code": code,
            "redirect_uri": redirect_uri,
            "code_verifier": unseal(grant.verifier_ciphertext),
        }
    )
    if data.get("live_mode") is not (grant.environment == "live"):
        raise PaymentError(
            _("The authorized account does not match the selected environment.")
        )
    profile = user_profile(data.get("access_token", ""))
    if str(data.get("user_id")) != str(profile["id"]):
        raise PaymentError(_("The provider returned an unexpected merchant identity."))
    return save_connection(
        actor,
        grant.organization_id,
        grant.environment,
        data["access_token"],
        profile,
        method="oauth",
        refresh_token=data.get("refresh_token", ""),
        expires_in=data.get("expires_in"),
    )


@sensitive_variables()
def disconnect(actor, org_id, environment, password):
    reauthenticate(actor, org_id, password)
    with transaction.atomic():
        from app_bch_flow.models import BCHOrganization

        BCHOrganization.objects.select_for_update().get(pk=org_id)
        list(
            FlowAccount.objects.select_for_update()
            .filter(organization_id=org_id, asset="BRL", environment=environment)
            .order_by("pk")
        )
        connection = (
            FlowProviderConnection.objects.select_for_update()
            .filter(
                organization_id=org_id, provider="mercadopago", environment=environment
            )
            .first()
        )
        if connection:
            connection.status = "disconnected"
            connection.access_ciphertext = connection.refresh_ciphertext = (
                connection.webhook_ciphertext
            ) = ""
            connection.expires_at = None
            connection.updated_by = actor
            connection.save()
        FlowRequest.objects.filter(
            account__organization_id=org_id,
            account__asset="BRL",
            account__environment=environment,
            status__in=["open", "partial"],
        ).update(status="review")
        FlowOAuthGrant.objects.filter(
            organization_id=org_id, consumed_at__isnull=True
        ).update(consumed_at=timezone.now())
        BCHAuditEvent.objects.create(
            actor=actor,
            organization_id=org_id,
            event_type="flow.integration.disconnected",
            metadata={"provider": "mercadopago", "environment": environment},
        )
    # This unlinks local processing. The merchant can revoke the application in
    # Mercado Pago too; do not invent an unsupported remote revocation endpoint.


@sensitive_variables()
def connection_credentials(org_id, environment):
    with transaction.atomic():
        connection = (
            FlowProviderConnection.objects.select_for_update()
            .filter(
                organization_id=org_id, provider="mercadopago", environment=environment
            )
            .first()
        )
        if connection is None:
            return None
        if connection.status != "connected":
            raise ProviderUnavailable(
                _("Mercado Pago is disconnected. Connect it in Integrations.")
            )
        if (
            connection.expires_at
            and connection.expires_at <= timezone.now() + timedelta(seconds=60)
        ):
            if not connection.refresh_ciphertext:
                raise ProviderUnavailable(
                    _("The access token expired. Reconnect Mercado Pago.")
                )
            client_id, _redirect, secret = app_config()
            data = _token(
                {
                    "client_id": client_id,
                    "client_secret": secret,
                    "grant_type": "refresh_token",
                    "refresh_token": unseal(connection.refresh_ciphertext),
                }
            )
            if str(data.get("user_id")) != connection.collector_id or data.get(
                "live_mode"
            ) is not (environment == "live"):
                raise ProviderUnavailable(
                    _("The refreshed credential does not match this merchant.")
                )
            lifetime = data.get("expires_in")
            if (
                type(lifetime) is not int
                or not 60 <= lifetime <= 366 * 86400
                or not data.get("access_token")
                or not data.get("refresh_token")
            ):
                raise ProviderUnavailable(
                    _("The provider returned an invalid token lifetime.")
                )
            connection.access_ciphertext = seal(data["access_token"])
            connection.refresh_ciphertext = seal(data["refresh_token"])
            connection.expires_at = timezone.now() + timedelta(seconds=lifetime)
            connection.save(
                update_fields=[
                    "access_ciphertext",
                    "refresh_ciphertext",
                    "expires_at",
                    "updated_at",
                ]
            )
        return {
            "collector_id": connection.collector_id,
            "access_token": unseal(connection.access_ciphertext),
            "webhook_secret": unseal(connection.webhook_ciphertext)
            if connection.webhook_ciphertext
            else "",
        }


@sensitive_variables()
def merchant_webhook_secret(account):
    from .providers import provider_config, local_secret

    connection = FlowProviderConnection.objects.filter(
        organization_id=account.organization_id,
        provider="mercadopago",
        environment=account.environment,
    ).first()
    if connection is None:
        return local_secret(provider_config(account), "webhook_secret")
    if connection.status != "connected":
        raise ProviderUnavailable(
            _("Mercado Pago is disconnected. Connect it in Integrations.")
        )
    if connection.webhook_ciphertext:
        return unseal(connection.webhook_ciphertext)
    return local_secret(getattr(settings, "FLOW_MP_OAUTH", {}), "webhook_secret")
