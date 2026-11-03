from django.shortcuts import render

def index(request):
    return render(request, "app_bch_flow/landing/index.html")
