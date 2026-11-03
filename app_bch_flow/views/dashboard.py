from django.shortcuts import render,redirect
from django.views.decorators.http import require_http_methods
from django.db import IntegrityError
from django.core.exceptions import ValidationError
from app_bch_flow.models import BCHMembership
from app_bch_flow.forms.organizations import OrganizationForm
from app_bch_flow.identity.services import create_organization
from app_bch_flow.views.authentication import current_identity

def dashboard(request):
    identity=current_identity(request)
    if identity is None:
        return redirect('bch_flow:login')
    memberships=BCHMembership.objects.select_related('organization').filter(identity=identity,is_active=True,organization__is_active=True)
    return render(request,'app_bch_flow/dashboard/index.html',{'identity':identity,'memberships':memberships})

@require_http_methods(['GET','POST'])
def new_organization(request):
    identity=current_identity(request)
    if identity is None:
        return redirect('bch_flow:login')
    form=OrganizationForm(request.POST or None)
    if request.method=='POST' and form.is_valid():
        try:
            create_organization(identity,form.cleaned_data['name'],form.cleaned_data['slug'])
        except (IntegrityError,ValidationError):
            form.add_error('slug','This organization name or slug is not available')
        else:
            return redirect('bch_flow:dashboard')
    return render(request,'app_bch_flow/dashboard/new_organization.html',{'form':form})
