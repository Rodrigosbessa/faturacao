# Faturamento/adapter.py
from allauth.socialaccount.adapter import DefaultSocialAccountAdapter


class MySocialAccountAdapter(DefaultSocialAccountAdapter):
    def save_user(self, request, sociallogin, form=None):
        # Chama o comportamento padrão do allauth para salvar o utilizador
        user = super().save_user(request, sociallogin, form)

        # FORÇA: Logo após criar/salvar o user via Google, 
        # garantimos que a sessão de verificação está False
        request.session['mfa_verified'] = False
        return user