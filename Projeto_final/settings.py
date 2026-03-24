import os
import dj_database_url
from pathlib import Path
from dotenv import load_dotenv

load_dotenv()

BASE_DIR = Path(__file__).resolve().parent.parent
SECRET_KEY = os.getenv('SECRET_KEY')
DEBUG = os.getenv('DEBUG') == 'True'

ALLOWED_HOSTS = ['faturix-kya9.onrender.com', 'localhost', '127.0.0.1']

INSTALLED_APPS = [
    'django.contrib.admin',
    'django.contrib.auth',
    'django.contrib.contenttypes',
    'django.contrib.sessions',
    'django.contrib.messages',
    'django.contrib.staticfiles',
    'django.contrib.sites',
    
    # Allauth
    'allauth',
    'allauth.account',
    'allauth.socialaccount',
    'allauth.socialaccount.providers.google',
    
    # MFA / OTP
    'django_otp',
    'django_otp.plugins.otp_email',
    'django_otp.plugins.otp_totp',
    
    # A tua App
    'Faturamento.apps.FaturamentoConfig',
]

SITE_ID = 1

MIDDLEWARE = [
    'django.middleware.security.SecurityMiddleware',
    'whitenoise.middleware.WhiteNoiseMiddleware',
    'django.contrib.sessions.middleware.SessionMiddleware',
    'django.middleware.common.CommonMiddleware',
    'django.middleware.csrf.CsrfViewMiddleware',
    'django.contrib.auth.middleware.AuthenticationMiddleware',
    'django_otp.middleware.OTPMiddleware', # OTP deve vir depois do Auth
    'django.contrib.messages.middleware.MessageMiddleware',
    'django.middleware.clickjacking.XFrameOptionsMiddleware',
    'allauth.account.middleware.AccountMiddleware',
]

# --- E-MAIL (Muda para SMTP quando quiseres que chegue mesmo ao Gmail) ---
EMAIL_BACKEND = 'django.core.mail.backends.console.EmailBackend' 
EMAIL_HOST = 'smtp.sendgrid.net'
EMAIL_PORT = 587
EMAIL_USE_TLS = True
EMAIL_HOST_USER = 'apikey'
EMAIL_HOST_PASSWORD = os.getenv('SENDGRID_API_KEY')
DEFAULT_FROM_EMAIL = 'suporte@faturix.org'

# --- BANCO DE DADOS ---
DATABASES = {
    'default': dj_database_url.config(
        default=os.environ.get('DATABASE_URL'),
        conn_max_age=600,
        ssl_require=True
    )
}

# --- SEGURANÇA NO RENDER ---
SECURE_PROXY_SSL_HEADER = ('HTTP_X_FORWARDED_PROTO', 'https')
SECURE_SSL_REDIRECT = not DEBUG # Só redireciona se não estiveres em local
SESSION_COOKIE_SECURE = not DEBUG
CSRF_COOKIE_SECURE = not DEBUG
CSRF_TRUSTED_ORIGINS = ['https://faturix-kya9.onrender.com']

# --- REDIRECTS ---
LOGIN_URL = '/accounts/login/'
LOGIN_REDIRECT_URL = 'check_mfa_status'
LOGOUT_REDIRECT_URL = 'account_login'

# Removemos o MFA_ADAPTER do allauth porque estamos a usar o django-otp manual

# settings.py

# 1. Define o URL base para os ficheiros no browser
STATIC_URL = '/static/'

# 2. Onde o Django vai buscar os ficheiros durante o desenvolvimento
STATICFILES_DIRS = [
    BASE_DIR / 'static',
]

# 3. Onde o Django vai "VOMITAR" os ficheiros todos para o Render servir
STATIC_ROOT = BASE_DIR / 'staticfiles'

# 4. Configuração do WhiteNoise (Garante que isto vem DEPOIS das variáveis acima)
STATICFILES_STORAGE = 'whitenoise.storage.CompressedManifestStaticFilesStorage'

TEMPLATES = [
    {
        'BACKEND': 'django.template.backends.django.DjangoTemplates',
        'DIRS': [BASE_DIR / 'templates'], # Garante que a pasta templates existe na raiz
        'APP_DIRS': True,
        'OPTIONS': {
            'context_processors': [
                'django.template.context_processors.debug',
                'django.template.context_processors.request',
                'django.contrib.auth.context_processors.auth',
                'django.contrib.messages.context_processors.messages',
            ],
        },
    },
]