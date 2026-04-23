from allauth.socialaccount.forms import SignupForm
from django import forms

from allauth.socialaccount.forms import SignupForm
from django import forms

class MyCustomSocialSignupForm(SignupForm):
    password = forms.CharField(
        widget=forms.PasswordInput(attrs={'placeholder': 'Password'}),
        label="Password",
        required=False  # opcional
    )
    password_confirm = forms.CharField(
        widget=forms.PasswordInput(attrs={'placeholder': 'Confirmar Password'}),
        label="Confirmar Password",
        required=False
    )

    def clean(self):
        cleaned_data = super().clean()
        password = cleaned_data.get("password")
        password_confirm = cleaned_data.get("password_confirm")
        if password or password_confirm:
            if password != password_confirm:
                raise forms.ValidationError("As passwords não coincidem.")
        return cleaned_data

    def save(self, request):
        user = super().save(request)
        email = self.sociallogin.account.extra_data.get('email')
        if email:
            user.email = email
        if self.cleaned_data.get("password"):
            user.set_password(self.cleaned_data["password"])
        user.save()
        return user

from allauth.socialaccount.adapter import DefaultSocialAccountAdapter

class MySocialAccountAdapter(DefaultSocialAccountAdapter):

    def pre_social_login(self, request, sociallogin):
        """
        Liga social account a user existente apenas se houver email
        """
        email = sociallogin.account.extra_data.get('email')
        if not email:
            return

        try:
            user = User.objects.get(email__iexact=email)
            sociallogin.connect(request, user)
        except User.DoesNotExist:
            pass

from django import forms
from .models import Empresa

class EmpresaForm(forms.ModelForm):
    def clean_nif(self):
        nif = self.cleaned_data.get('nif')

        if not nif.isdigit() or len(nif) != 9:
            raise forms.ValidationError("O NIF deve conter exatamente 9 dígitos.")


        soma = 0
        for i in range(8):
            soma += int(nif[i]) * (9 - i)

        resto = soma % 11
        digito_controlo = 0 if resto < 2 else 11 - resto

        if int(nif[8]) != digito_controlo:
            raise forms.ValidationError("O NIF introduzido não é válido.")


        if nif[0] not in '123456789':
            raise forms.ValidationError("O NIF deve começar por um dígito válido.")

        return nif

    def clean_codigo_postal(self):
        cp = self.cleaned_data.get('codigo_postal')
        import re
        if not re.match(r'^\d{4}-\d{3}$', cp):
            raise forms.ValidationError("Formato inválido. Use 0000-000.")
        return cp

    def __init__(self, *args, **kwargs):
        super().__init__(*args, **kwargs)

        for field in self.fields:
            if field != 'pais':
                self.fields[field].widget.attrs.update({'class': 'form-control'})

    class Meta:
        model = Empresa
        fields = ['nome', 'morada', 'codigo_postal', 'cidade', 'pais', 'email', 'nif', 'telefone', 'local']


from django import forms
from django.contrib.auth.models import User
from django.core.exceptions import ValidationError

class CustomRegistroForm(forms.ModelForm):
    email = forms.EmailField(required=False, help_text="Opcional. Apenas para recursos extra, como MFA.")

    class Meta:
        model = User
        fields = ['username', 'email', 'password']

    def clean_email(self):
        email = self.cleaned_data.get('email')
        if email and User.objects.filter(email=email).exists():
            raise ValidationError("Este e-mail já está em uso. Escolha outro ou recupere a sua conta.")
        return email