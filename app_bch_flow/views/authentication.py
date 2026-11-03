from django.utils.translation import gettext as _
from django.http import HttpResponse
from django.shortcuts import render,redirect
from django.views.decorators.http import require_http_methods,require_POST
from django.db import IntegrityError
from django.core.exceptions import ValidationError
from app_bch_flow.forms.authentication import RegistrationForm,LoginForm
from app_bch_flow.identity.services import register_identity,authenticate_identity
from app_bch_flow.identity.sessions import create_session,resolve_session,revoke_session,set_session_cookie,clear_session_cookie,COOKIE_NAME

def current_identity(request):
    session=resolve_session(request.COOKIES.get(COOKIE_NAME))
    return session.identity if session else None

@require_http_methods(['GET','POST'])
def register(request):
    form=RegistrationForm(request.POST or None)
    if request.method=='POST' and form.is_valid():
        try:
            identity=register_identity(form.cleaned_data['email'],form.cleaned_data['password'])
        except (IntegrityError,ValidationError):
            form.add_error('email',_('Unable to register this email'))
        else:
            token,_=create_session(identity)
            response=redirect('bch_flow:dashboard')
            set_session_cookie(response,token)
            return response
    return render(request,'app_bch_flow/authentication/register.html',{'form':form})

@require_http_methods(['GET','POST'])
def login(request):
    form=LoginForm(request.POST or None)
    if request.method=='POST' and form.is_valid():
        identity=authenticate_identity(form.cleaned_data['email'],form.cleaned_data['password'])
        if identity:
            token,_=create_session(identity)
            response=redirect('bch_flow:dashboard')
            set_session_cookie(response,token)
            return response
        form.add_error(None,_('Invalid credentials'))
    return render(request,'app_bch_flow/authentication/login.html',{'form':form})

@require_POST
def logout(request):
    revoke_session(request.COOKIES.get(COOKIE_NAME))
    response=redirect('bch_flow:home')
    clear_session_cookie(response)
    return response
