from django.http import HttpResponseNotAllowed
from django.shortcuts import render

def wallet(request):
    if request.method != 'GET':
        return HttpResponseNotAllowed(['GET'])
    response = render(request, 'bch_wallet_v301/wallet.html')
    response['Cache-Control'] = 'no-store'
    response['X-Content-Type-Options'] = 'nosniff'
    return response
