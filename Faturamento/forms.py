from allauth.socialaccount.forms import SignupForm
from django import forms

class MyCustomSocialSignupForm(SignupForm):
    password = forms.CharField(
        widget=forms.PasswordInput(attrs={'placeholder': 'Password'}),
        label="Password"
    )
    password_confirm = forms.CharField(
        widget=forms.PasswordInput(attrs={'placeholder': 'Confirmar Password'}),
        label="Confirmar Password"
    )

    def clean(self):
        cleaned_data = super().clean()
        password = cleaned_data.get("password")
        password_confirm = cleaned_data.get("password_confirm")

        if password and password_confirm and password != password_confirm:
            raise forms.ValidationError("As passwords não coincidem.")
        return cleaned_data

    def save(self, request):
        user = super().save(request)

        email = self.sociallogin.account.extra_data.get('email')
        if email:
            user.email = email

        # 3. Define a password que o utilizador escolheu no formulário
        user.set_password(self.cleaned_data["password"])
        user.save()

        return user

from django import forms
from .models import Empresa

class EmpresaForm(forms.ModelForm):
    def __init__(self, *args, **kwargs):
        super().__init__(*args, **kwargs)
        for field in self.fields:
            self.fields[field].widget.attrs.update({'class': 'form-control'})

    class Meta:
        model = Empresa
        fields = ['nome', 'morada', 'codigo_postal', 'cidade', 'pais', 'email', 'nif', 'telefone', 'local']