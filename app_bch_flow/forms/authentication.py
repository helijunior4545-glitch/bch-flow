from django.utils.translation import gettext_lazy as _
from django import forms
class RegistrationForm(forms.Form):
    email = forms.EmailField(max_length=254,label=_('Email'), widget=forms.EmailInput(attrs={'autocomplete':'email'}))
    password = forms.CharField(label=_('Password'),min_length=12,max_length=128,help_text=_('Use at least 12 characters.'),widget=forms.PasswordInput(attrs={'autocomplete':'new-password'}))
    password_confirm = forms.CharField(label=_('Confirm password'),widget=forms.PasswordInput(attrs={'autocomplete':'new-password'}))
    def clean(self):
        data=super().clean()
        if data.get('password') != data.get('password_confirm'):
            raise forms.ValidationError(_('Passwords do not match'))
        return data
class LoginForm(forms.Form):
    email = forms.EmailField(max_length=254,label=_('Email'),widget=forms.EmailInput(attrs={'autocomplete':'email'}))
    password = forms.CharField(label=_('Password'),widget=forms.PasswordInput(attrs={'autocomplete':'current-password'}))
