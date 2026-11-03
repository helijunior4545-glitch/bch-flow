from django.urls import path,include
from .views import landing
from .views.authentication import register,login,logout
from .views.dashboard import dashboard,new_organization
from .views import v3_workspace
app_name='bch_flow'
urlpatterns=[
    path('',landing.index,name='home'),
    path('register/',register,name='register'),
    path('login/',login,name='login'),
    path('logout/',logout,name='logout'),
    path('dashboard/',dashboard,name='dashboard'),
    path('dashboard/organizations/new/',new_organization,name='new_organization'),
    path('dashboard/organizations/<uuid:org_id>/',v3_workspace.workspace,name='v3_workspace'),
    path('dashboard/organizations/<uuid:org_id>/invoices/new/',v3_workspace.create_invoice,name='v3_invoice_new'),
    path('dashboard/organizations/<uuid:org_id>/invoices/<uuid:invoice_id>/',v3_workspace.invoice_detail,name='v3_invoice'),
    path('api/v1/',include('app_bch_flow.api.v1.urls')),
]

# BCH Flow Pay V1 — added by guarded installer. Keep routes before any catch-all.
from django.urls import path as _bch_pay_path
from app_bch_flow.views import pay_v1 as _bch_pay_views
urlpatterns = [
    _bch_pay_path('pay/v1/<str:token>/status/', _bch_pay_views.status, name='pay_v1_status'),
    _bch_pay_path('pay/v1/<str:token>/', _bch_pay_views.checkout, name='pay_v1_checkout'),
    _bch_pay_path('dashboard/organizations/<uuid:org_id>/invoices/<uuid:invoice_id>/share/', _bch_pay_views.share, name='pay_v1_share'),
] + urlpatterns

# BCH FLOW MERCHANT SIMULATION V3 — visual-only route
from django.urls import path as _bch_sim_path
from app_bch_flow.views.merchant_simulation_v3 import merchant_payment_simulation as _bch_sim_view
urlpatterns = [
    _bch_sim_path('dashboard/organizations/<uuid:org_id>/invoices/<uuid:invoice_id>/simulate/', _bch_sim_view, name='merchant_payment_simulation_v3'),
] + urlpatterns

# BCH FLOW WALLET V4.1 — additive read-only merchant wallet
from app_bch_flow.views import wallet_v41 as _bch_wallet_v41
urlpatterns = [
    path('dashboard/organizations/<uuid:org_id>/wallet/', _bch_wallet_v41.wallet_home, name='wallet_v41_home'),
    path('dashboard/organizations/<uuid:org_id>/wallet/send/', _bch_wallet_v41.send_preview, name='wallet_v41_send'),
] + urlpatterns

# BCH FLOW WALLET V4.2 — read-only TX diagnostic, no settlement
from app_bch_flow.views import wallet_v42 as _bch_wallet_v42
urlpatterns = [
    path('dashboard/organizations/<uuid:org_id>/wallet/diagnostic/', _bch_wallet_v42.transaction_lookup, name='wallet_v42_diagnostic'),
] + urlpatterns

# BCH FLOW WALLET V4.3 — opt-in read-only UTXO observation
from app_bch_flow.views import wallet_v43 as _bch_wallet_v43
urlpatterns = [
    path('dashboard/organizations/<uuid:org_id>/wallet/monitor/', _bch_wallet_v43.address_monitor, name='wallet_v43_monitor'),
] + urlpatterns

# BCH_FLOW_V24_UNIFIED_EVIDENCE — read-only, invoice-scoped evidence
from app_bch_flow.views.wallet_v24 import invoice_evidence as _bch_v24_evidence
urlpatterns = [path('dashboard/organizations/<uuid:org_id>/wallet/evidence/<uuid:invoice_id>/', _bch_v24_evidence, name='wallet_v24_evidence')] + urlpatterns

# BCH FLOW V5.3-D1 — single-use public proof endpoints
from app_bch_flow.views import v53d_challenge as _bch_v53d
urlpatterns = [
    path('dashboard/organizations/<uuid:org_id>/wallet/v53d/challenge/', _bch_v53d.issue, name='v53d_issue'),
    path('dashboard/organizations/<uuid:org_id>/wallet/v53d/verify/', _bch_v53d.verify, name='v53d_verify'),
] + urlpatterns

# BCH-FLOW-V320-ROUTE
from app_bch_flow.views.wallet_shell_v320 import modal as _v320_modal
urlpatterns = [path('dashboard/organizations/<uuid:org_id>/wallet/modal/<slug:panel>/', _v320_modal, name='wallet_v320_modal')] + urlpatterns
