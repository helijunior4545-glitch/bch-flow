from django import forms
class OrganizationForm(forms.Form):
    name = forms.CharField(max_length=160,min_length=2)
    slug = forms.SlugField(max_length=80)
