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
    def clean_nif(self):
        nif = self.cleaned_data.get('nif')

        if not nif.isdigit() or len(nif) != 9:
            raise forms.ValidationError("O NIF deve conter exatamente 9 dígitos.")

        # 2. Validação da lógica do dígito de controlo
        # (Usando a sua função convertida para método)
        soma = 0
        for i in range(8):
            soma += int(nif[i]) * (9 - i)

        resto = soma % 11
        digito_controlo = 0 if resto < 2 else 11 - resto

        if int(nif[8]) != digito_controlo:
            raise forms.ValidationError("O NIF introduzido não é válido.")

        # 3. Regras de prefixo para Portugal
        # NIFs de empresas começam tipicamente por 5, 6, 8 ou 9
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
        # Aplica a classe 'form-control' a todos os campos
        for field in self.fields:
            if field != 'pais':  # O 'pais' já tem a classe definida no widget acima
                self.fields[field].widget.attrs.update({'class': 'form-control'})

    class Meta:
        model = Empresa
        fields = ['nome', 'morada', 'codigo_postal', 'cidade', 'pais', 'email', 'nif', 'telefone', 'local']