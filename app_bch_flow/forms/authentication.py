from django.utils.translation import gettext_lazy as _
from django import forms
class RegistrationForm(forms.Form):
    email = forms.EmailField(max_length=254,label=_('Email'))
    password = forms.CharField(label=_('Password'),min_length=12,max_length=128,widget=forms.PasswordInput)
    password_confirm = forms.CharField(label=_('Confirm password'),widget=forms.PasswordInput)
    def clean(self):
        data=super().clean()
        if data.get('password') != data.get('password_confirm'):
            raise forms.ValidationError(_('Passwords do not match'))
        return data
class LoginForm(forms.Form):
    email = forms.EmailField(max_length=254,label=_('Email'))
    password = forms.CharField(label=_('Password'),widget=forms.PasswordInput)
