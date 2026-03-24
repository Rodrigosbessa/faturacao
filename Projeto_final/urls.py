"""
URL configuration for Projeto_final project.

The `urlpatterns` list routes URLs to views. For more information please see:
    https://docs.djangoproject.com/en/5.2/topics/http/urls/
Examples:
Function views
    1. Add an import:  from my_app import views
    2. Add a URL to urlpatterns:  path('', views.home, name='home')
Class-based views
    1. Add an import:  from other_app.views import Home
    2. Add a URL to urlpatterns:  path('', Home.as_view(), name='home')
Including another URLconf
    1. Import the include() function: from django.urls import include, path
    2. Add a URL to urlpatterns:  path('blog/', include('blog.urls'))
"""
from django.contrib import admin
from django.urls import path, include
from Faturamento import views
from allauth.account.views import LoginView

urlpatterns = [
    path('admin/', admin.site.urls),
    path('accounts/', include('allauth.urls')),
    path('accounts/mfa/', include('allauth.mfa.urls')),
    path('accounts/check-mfa/', views.check_mfa_status, name='check_mfa_status'),
    path('accounts/verify-otp/', views.otp_verify_view, name='otp_verify_view'),
    path('webapp/', views.webapp_view, name='webapp_home'),
    path('', views.webapp_view, name='index'),
    path('registar/json/', views.registar_json, name='registar_json'),
    path('completar-registo/', views.completar_registo_empresa, name='completar_empresa'),
    path('clientes/json/', views.clientes_json, name='clientes_json'),
    path("clientes/proximo-codigo/", views.proximo_codigo_cliente, name="proximo_codigo_cliente"),
    path('cliente/adicionar/', views.adicionar_cliente, name='adicionar_cliente'),
    path('clientes/<int:id_cliente>/dados/', views.cliente_dados, name='cliente_dados'),
    path('cliente/<int:id_cliente>/editar/', views.cliente_editar, name='cliente_editar'),
    path('cliente/<int:id_cliente>/apagar/', views.cliente_apagar, name='cliente_apagar'),
    path('artigos/json/', views.artigos_json, name='artigos_json'),
    path('artigo/adicionar/', views.artigo_editar, name='adicionar_artigo'),
    path('artigos/<int:id_artigo>/dados/', views.artigo_dados, name='artigo_dados'),
    path('artigo/<int:id_artigo>/editar/', views.artigo_editar, name='artigo_editar'),
    path('artigo/<int:id_artigo>/apagar/', views.artigo_apagar, name='artigo_apagar'),
    path('faturas/json/', views.faturas_json, name='faturas_json'),
    path('get-clientes/', views.get_clientes, name='get_clientes'),
    path('faturas/novo/', views.adicionar_item, {'template_name': 'faturas/nova_fatura.html'}, name='nova_fatura'),
    path('guias/novo/', views.adicionar_item, {'template_name': 'guias/nova_guia.html'}, name='nova_guia'),
    path("validar-linha/", views.validar_linha, name="validar_linha"),
    path('matriculas-dropdown/', views.matriculas_dropdown, name='matriculas_dropdown'),
    path('criar-documento-temp/', views.criar_documento_temp, name='criar_documento_temp'),
    path("api/documento-temp/<int:temp_id>/",views.obter_documento_temp,name="obter_documento_temp"),
    path('atualizar-documento/', views.atualizar_documento, name='atualizar_documento'),
    path('apagar-documento/', views.apagar_documento, name='apagar_documento'),
    path('faturas/editar/', views.editar_fatura, name='editar_fatura'),
    path('finalizar-documento/', views.finalizar_documento, name='finalizar_documento'),
    path('faturas/ver/<int:id>/', views.ver_fatura, name='ver_fatura'),
    path('api/documento-finalizado/<int:doc_id>/', views.api_documento_completo, name='api_documento_completo'),
    path('faturas/<int:documento_id>/pdf/', views.gerar_pdf_fatura, name='gerar_pdf_fatura'),
    path('cliente/<int:id_cliente>/detalhes/', views.cliente_detalhes, name='cliente_detalhes'),
    path('cliente/exportar/<int:id_cliente>/', views.exportar_cliente_csv, name='exportar_cliente_csv'),
    path('guias/json/', views.guias_json, name='guias_json'),
    path('guias/reservar-numero/', views.reservar_numero_guia, name='reservar_numero_guia'),
    path('guias/novo/', views.guia_documento, name='guia_documento'),
    path('api/guia/preparar/', views.api_guia_preparar, name='api_guia_preparar'),
    path('finalizar-documento-guia/', views.finalizar_documento_guia, name='finalizar_documento_guia'),
    path('cliente/<int:id>/criar-recibo/', views.criar_recibo_cliente, name='criar_recibo_cliente'),
    path('cliente/<int:id_cliente>/fatura/<int:id_fatura>/criar-recibo/',
         views.criar_recibo_fatura,
         name='criar_recibo_fatura'),
    path('recibos/json/', views.recibos_json, name='recibos_json'),
    path('recibos/anular/<int:id_recibo>/', views.anular_recibo, name='anular_recibo'),
    path('fatura/<int:fatura_id>/emitir-credito/', views.emitir_nota_credito, name='emitir_nota_credito'),
    path('api/dashboard/dados/', views.dados_dashboard_ajax, name='dados_dashboard_ajax'),
    path('empresa/<int:pk>/editar/', views.editar_empresa_ajax, name='editar_empresa_ajax'),
    path('transporte/adicionar/', views.adicionar_transporte_ajax, name='adicionar_transporte'),
    path('api/obter-periodos/', views.obter_periodos_disponiveis, name='obter_periodos'),
    path('gerar-saft/', views.gerar_saft, name='gerar_saft'),
]