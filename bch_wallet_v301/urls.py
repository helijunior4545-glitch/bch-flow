from django.urls import path
from . import views
app_name = 'bch_wallet_v301'
urlpatterns = [path('', views.wallet, name='wallet')]
