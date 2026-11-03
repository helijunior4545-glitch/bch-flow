from django import forms
class RegistrationForm(forms.Form):
    email = forms.EmailField(max_length=254)
    password = forms.CharField(min_length=12,max_length=128,widget=forms.PasswordInput)
    password_confirm = forms.CharField(widget=forms.PasswordInput)
    def clean(self):
        data=super().clean()
        if data.get('password') != data.get('password_confirm'):
            raise forms.ValidationError('Passwords do not match')
        return data
class LoginForm(forms.Form):
    email = forms.EmailField(max_length=254)
    password = forms.CharField(widget=forms.PasswordInput)
