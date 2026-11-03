"""Standalone local routing. Original BCH Flow routes are preserved."""
from django.contrib import admin
from django.http import JsonResponse
from django.urls import include, path


def local_health(request):
    return JsonResponse({'service': 'bch-flow', 'environment': 'local', 'status': 'running'})


urlpatterns = [
    path('wallet-v301/', include(('bch_wallet_v301.urls', 'bch_wallet_v301'), namespace='bch_wallet_v301')),
    path('health/', local_health, name='local_health'),
    path('admin/', admin.site.urls),
    path('bch-flow/', include(('app_bch_flow.urls', 'app_bch_flow'), namespace='app_bch_flow')),
]
