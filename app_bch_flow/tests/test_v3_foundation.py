"""BCH Flow V3 foundation regression tests. Run only against an isolated test DB."""
from django.test import TestCase
from django.core.exceptions import ValidationError
from app_bch_flow.identity.services import register_identity, authenticate_identity, create_organization, require_membership
from app_bch_flow.identity.sessions import create_session, resolve_session, revoke_session
from app_bch_flow.models import BCHMembership, BCHOrganization


class V3FoundationTests(TestCase):
    databases = {'default'}

    def test_identity_registration_authentication(self):
        identity = register_identity('  EXAMPLE@TEST.INVALID ', 'a-very-long-password-123')
        self.assertEqual(identity.email, 'example@test.invalid')
        self.assertIsNotNone(authenticate_identity('EXAMPLE@TEST.INVALID', 'a-very-long-password-123'))
        self.assertIsNone(authenticate_identity('EXAMPLE@TEST.INVALID', 'incorrect-password'))

    def test_reject_short_password(self):
        with self.assertRaises(ValidationError):
            register_identity('example@test.invalid', 'short')

    def test_organization_creation_uses_default_database(self):
        identity = register_identity('owner@test.invalid', 'a-very-long-password-123')
        org = create_organization(identity, 'Example Org', 'example-org')
        self.assertEqual(org._state.db, 'default')
        membership = require_membership(identity, org, roles=('owner',))
        self.assertEqual(membership.role, 'owner')

    def test_cross_organization_membership_denied(self):
        owner = register_identity('owner@test.invalid', 'a-very-long-password-123')
        stranger = register_identity('stranger@test.invalid', 'a-very-long-password-123')
        org = create_organization(owner, 'Example Org', 'example-org')
        with self.assertRaises(BCHMembership.DoesNotExist):
            require_membership(stranger, org)

    def test_session_revocation(self):
        identity = register_identity('owner@test.invalid', 'a-very-long-password-123')
        token, _ = create_session(identity)
        self.assertIsNotNone(resolve_session(token))
        revoke_session(token)
        self.assertIsNone(resolve_session(token))
