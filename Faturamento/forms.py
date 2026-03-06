from django import forms
from .models import Cliente

class ClienteForm(forms.ModelForm):
    class Meta:
        model = Cliente
        fields = '__all__'  # todos os campos do modelo
        widgets = {
            'observacoes': forms.Textarea(attrs={'rows':3}),
        }
