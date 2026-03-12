from django.shortcuts import redirect
from functools import wraps

def empresa_obrigatoria(view_func):
    @wraps(view_func)
    def wrapper(request, *args, **kwargs):
        if not request.user.is_authenticated:
            return redirect('account_login')

        try:
            empresa = request.user.empresa
        except Exception:
            return redirect('completar_empresa')

        request.empresa = empresa

        return view_func(request, *args, **kwargs)

    return wrapper