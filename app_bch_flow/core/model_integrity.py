"""Explicit integrity gate for write services; DB cross-row invariants need locking."""
from django.core.exceptions import ValidationError
from django.db import transaction

@transaction.atomic(using='bch_flow')
def validate_and_save(instance):
    """Validate models before save. Caller must enforce actor permissions and transitions."""
    if instance._state.db not in (None, 'bch_flow'):
        raise ValidationError('Unexpected database for BCH Flow')
    instance.full_clean()
    instance.save(using='bch_flow')
    return instance
