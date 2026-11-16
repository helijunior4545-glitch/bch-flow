"""Read-only wallet presentation data, scoped by tenant and environment."""
from datetime import timedelta
from django.db.models import F, Q, Sum
from django.db.models.functions import TruncDate
from django.utils import timezone
from app_bch_flow.models import FlowReceipt
from app_merchant_catalog.models import MerchantProduct, SoftwareOrder


def workspace_context(org_id, environment, account):
    now = timezone.now()
    chart = []
    if account and account.asset == 'BRL':
        rows = FlowReceipt.objects.filter(request__account=account, status='credited',
            credited_at__gte=now - timedelta(days=90)).annotate(day=TruncDate('credited_at')).values('day').annotate(total=Sum('amount_units')).order_by('day')
        chart = [{'time': row['day'].isoformat(), 'value': row['total'] / 100} for row in rows]
    orders = SoftwareOrder.objects.filter(payment__account__organization_id=org_id,
        payment__account__environment=environment, created_at__gte=now-timedelta(days=7))
    delivered = orders.filter(payment__account__environment='live', payment__account__frozen=False,
        payment__status__in=('paid', 'overpaid'), payment__received_units__gte=F('payment__amount_units'))
    delivered = delivered.exclude(payment__receipts__status='review').annotate(
        credited=Sum('payment__receipts__amount_units', filter=Q(payment__receipts__status='credited', payment__receipts__credited_at__isnull=False))
    ).filter(credited__gte=F('payment__amount_units'))
    return {
        'pix_chart': chart,
        'chart_today': timezone.localdate().isoformat(),
        'open_requests_count': account.requests.filter(status__in=('open', 'partial'), expires_at__gt=now).count() if account else 0,
        'pending_transfers_count': account.withdrawals.filter(status__in=('pending', 'approved', 'unknown', 'submitting')).count() if account else 0,
        'software_products_count': MerchantProduct.objects.filter(organization_id=org_id, archived_at__isnull=True, releases__isnull=False).distinct().count(),
        'software_sales_count': orders.count(),
        'software_deliveries_count': delivered.count(),
    }
