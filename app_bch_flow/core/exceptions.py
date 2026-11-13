class BCHFlowError(Exception):
    """Base domain error."""

class PaymentUnavailable(BCHFlowError):
    """Live payment operation not configured or verified."""

class TenantAccessDenied(BCHFlowError):
    """Organization access denied."""
