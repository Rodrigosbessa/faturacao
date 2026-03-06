import docx
from django.core.management.base import BaseCommand
from django.contrib.auth import authenticate, login
from django.contrib import messages
from .models import Vendedor, Zona, Transporte, Impostos, Pagamento, Modalidade, Precos, Cliente1, Artigo, \
    DocumentoContador, Recibo, DocumentoTemp, Empresa, Moeda, TaxReason, \
    TempArtigos, DocumentoFinalizado, FinArtigos, ReciboLinhas
import json
from django.views.decorators.csrf import csrf_exempt

def index(request):
    return render(request, 'webapp.html')

def login_view(request):
    if request.method == "POST":
        username = request.POST.get("u")
        password = request.POST.get("p")

        user = authenticate(request, username=username, password=password)
        if user is not None:
            login(request, user)
            return render(request, "webapp.html", {"user": user})
        else:
            #
            messages.error(request, "Username ou password inválidos.")
            return render(request, "index.html")

    return render(request, "index.html")


def clientes_json(request):
    clientes = Cliente1.objects.all()
    data = []
    for c in clientes:
        data.append({
            "id_cliente": c.id_cliente,
            "codigo": c.codigo,
            "nome": c.nome,
            "contribuinte": c.contribuinte,
            "morada1": c.morada1,
            "codigo_postal": c.codigo_postal,
            "concelho": c.concelho,
        })
    # Wrapping it in a dictionary is the standard for DataTables
    return JsonResponse({'data': data})

def faturas_json(request):
    TIPO_EXTENSO = {
        'FT': 'Fatura',
        'FR': 'Fatura-Recibo',
        'FS': 'Fatura Simplificada',
        'NC': 'Nota de Crédito',
    }

    documentos = (
        DocumentoFinalizado.objects
        .filter(tipo__in=TIPO_EXTENSO.keys())
        .order_by('-id', '-data_emissao')
    )

    documentos_temp = (
        DocumentoTemp.objects
        .filter(tipo__in=TIPO_EXTENSO.keys())
        .select_related('cliente')
        .order_by('-id', '-criado_em')
    )

    data = []
    for doc in documentos_temp:
        cliente = doc.cliente
        valor_total = float(doc.valor_total) if getattr(doc, 'valor_total', None) else 0

        numero_completo = f"{doc.tipo}/{doc.serie}/{doc.ano}/{doc.numero}" if getattr(doc, 'serie',
                                                                                          None) else f"Temp-{doc.id}"

        data.append({
            "id_documento": doc.id,
             "tipo": f"{TIPO_EXTENSO.get(doc.tipo, doc.tipo)} (Temp)",
             "numero_doc": doc.numero,
             "numero": numero_completo,
             "cliente_id": cliente.id_cliente if cliente else None,
             "cliente_nome": cliente.nome if cliente else "",
             "data_emissao": doc.data_emissao.strftime('%Y-%m-%d') if doc.data_emissao else "",
             "vencimento": doc.data_vencimento if doc.data_vencimento else "",
              "valor_total": valor_total,
             "total_pago": 0,
             "restante": valor_total,
             "estado": doc.estado or 'Rascunho',
              "temporario": True  # flag para diferenciar
         })
    for doc in documentos:
        numero_completo = f"{doc.tipo}/{doc.serie}/{doc.ano}/{doc.numero}"

        data.append({
            "id_documento": doc.id,
            "tipo": TIPO_EXTENSO.get(doc.tipo, doc.tipo),
            "numero_doc": doc.numero,
            "numero": numero_completo,
            "cliente_id": doc.cliente_id,
            "cliente_nome": doc.cliente_nome,
            "data_emissao": doc.data_emissao.strftime('%Y-%m-%d') if doc.data_emissao else "",
            "vencimento": doc.data_vencimento,
            "valor_total": float(doc.valor_total),
            "total_pago": float(doc.total_pago),
            "restante": float(doc.valor_total - doc.total_pago),
            "estado": doc.estado_pagamento,
        })


    return JsonResponse(data, safe=False)


from django.db.models import Max

def proximo_codigo_cliente(request):
    ultimo = Cliente1.objects.aggregate(max_codigo=Max('codigo'))['max_codigo']

    if ultimo:
        # Remove o "C" e converte para número
        numero = int(ultimo.replace("C", "")) + 1
    else:
        numero = 1

    proximo = f"C{numero:03d}"
    return JsonResponse({"codigo": proximo})

def proximo_codigo_artigo(request):
    ultimo = Artigo.objects.aggregate(max_id=Max('id_artigo'))['max_id']

    if ultimo:
        numero = ultimo + 1
    else:
        numero = 1

    return JsonResponse({"codigo": numero})


def validar_nif_portugal(nif):
    nif = str(nif)
    if not nif.isdigit() or len(nif) != 9:
        return False

    if nif[0] not in '123456789':
        return False

    # Prefixos específicos de 2 dígitos
    if nif[0] == '4' and nif[1] != '5': return False

    soma = 0
    for i in range(8):
        soma += int(nif[i]) * (9 - i)

    resto = soma % 11
    digito_controlo = 0 if resto < 2 else 11 - resto
    return int(nif[8]) == digito_controlo

from django.core.validators import validate_email
from django.core.exceptions import ObjectDoesNotExist
def validar_dados_cliente(post_data, cliente_id=None, is_edit=False):
    """
    Valida os dados do cliente para garantir conformidade com a AT e integridade da BD.
    """
    regras = {
        'nome': ('Nome', 200),
        'contribuinte': ('NIF', 12),
        'morada1': ('Morada 1', 100),
        'morada2': ('Morada 2', 100),
        'codigo_postal': ('Código Postal', 8),
        'distrito': ('Distrito', 35),
        'concelho': ('Concelho', 35),
        'telemovel': ('Telemóvel', 12),
        'pais': ('Country',40),
        'sigla': ('Sigla', 2),
        'email': ('Email', 200),
    }

    obrigatorios = ['nome', 'morada1', 'codigo_postal', 'pais', 'distrito', 'concelho', 'vendedor', 'impostos']

    if is_edit:
        obrigatorios = [campo for campo in obrigatorios if campo != 'nome']

    for campo, (label, max_len) in regras.items():
        valor = post_data.get(campo, '').strip()

        if campo in obrigatorios and not valor:
            return False, f"O campo [{label}] é obrigatório."

        if len(valor) > max_len:
            return False, f"O campo [{label}] excede o limite de {max_len} caracteres."

    email = post_data.get('email', '').strip()
    if email:
        try:
            validate_email(email)
        except ValidationError:
            return False, "O formato do email introduzido é inválido."

    nif = post_data.get('contribuinte', '').replace(' ', '')
    pais = post_data.get('pais', 'PT').upper()


    if pais == "PT":
        if not nif:
            nif = "999999990"
            post_data['contribuinte'] = nif

        if nif != "999999990":
            if len(nif) != 9:
                return False, "O NIF para clientes em Portugal deve ter exatamente 9 dígitos."
            if not validar_nif_portugal(nif):
                return False, "O NIF introduzido é inválido para Portugal."
    else:
        if not nif:
            return False, "O NIF é obrigatório para clientes estrangeiros."

        query_duplicado = Cliente1.objects.filter(contribuinte=nif)
        if cliente_id:
            query_duplicado = query_duplicado.exclude(id_cliente=cliente_id)

        if query_duplicado.exists():
            return False, f"Já existe um cliente registado com o NIF {nif}."

    modelos_fk = [
        (Vendedor, 'vendedor', 'id_vendedor'),
        (Zona, 'zona', 'id_zona'),
        (Impostos, 'impostos', 'id_impostos'),
        (Pagamento, 'pagamento', 'id_pagamento'),
        (Modalidade, 'modalidade', 'id_modalidade'),
        (Precos, 'precos', 'id_precos'),
    ]

    for model, field_name, id_name in modelos_fk:
        val = post_data.get(field_name)
        if field_name in obrigatorios or (val and val != ""):
            try:
                model.objects.get(**{id_name: val})
            except (ObjectDoesNotExist, ValueError):
                label_fk = field_name.capitalize()
                return False, f"A opção selecionada para [{label_fk}] é inválida ou não existe."

    return True, "Validado com sucesso"

from django.urls import reverse
def adicionar_cliente(request):
    context = {
        "vendedores": Vendedor.objects.all(),
        "zonas": Zona.objects.all(),
        "transportes": Transporte.objects.all(),
        "impostos_list": Impostos.objects.all(),
        "pagamentos": Pagamento.objects.all(),
        "modalidades": Modalidade.objects.all(),
        "precos_list": Precos.objects.all(),
    }

    if request.method == "POST":

        valido, mensagem = validar_dados_cliente(request.POST, cliente_id=None)

        if not valido:
            messages.error(request, mensagem)
            context['dados'] = request.POST
            return JsonResponse({'status': 'error', 'message': mensagem}, status=400)
        try:
            with transaction.atomic():
                ultimo = Cliente1.objects.aggregate(max_codigo=Max('codigo'))['max_codigo']
                if ultimo:
                    numero = int(ultimo.replace("C", "")) + 1
                else:
                    numero = 1
                novo_codigo = f"C{numero:03d}"

                # ATRIBUIÇÃO À VARIÁVEL 'novo_cliente'
                novo_cliente = Cliente1.objects.create(
                    codigo=novo_codigo,
                    nome=request.POST.get('nome').strip(),
                    contribuinte=request.POST.get('contribuinte') or "999999990",
                    morada1=request.POST.get('morada1'),
                    morada2=request.POST.get('morada2'),
                    codigo_postal=request.POST.get('codigo_postal'),
                    telemovel=request.POST.get('telemovel'),
                    email=request.POST.get('email', '').lower().strip(),
                    pais=request.POST.get('pais'),
                    sigla=request.POST.get('sigla'),
                    distrito=request.POST.get('distrito'),
                    concelho=request.POST.get('concelho'),
                    vendedor_id=request.POST.get('vendedor'),
                    zona_id=request.POST.get('zona'),
                    transporte_id=request.POST.get('transporte'),
                    impostos_id=request.POST.get('impostos'),
                    pagamento_id=request.POST.get('pagamento'),
                    modalidade_id=request.POST.get('modalidade'),
                    precos_id=request.POST.get('precos'),
                )

                # Agora a variável 'novo_cliente' já existe para o print
                print(f"--- SUCESSO MYSQL: Gravado ID {novo_cliente.id_cliente} com Código {novo_cliente.codigo} ---")

            url_detalhes = reverse('cliente_detalhes', kwargs={'id_cliente': novo_cliente.id_cliente})

            # Retorna a URL para o JS redirecionar
            return JsonResponse({
                'status': 'success',
                'message': 'Cliente adicionado com sucesso!',
                'redirect_url': url_detalhes
            })

        except Exception as e:
            print(f"Erro na gravação: {e}")
            messages.error(request, "Ocorreu um erro inesperado ao gravar na base de dados.")
            context['dados'] = request.POST
            return JsonResponse({'status': 'error', 'message': 'Erro ao gravar na base de dados.'}, status=500)
    return render(request, 'subsubconteudo/criar.html',context)

@csrf_exempt
def adicionar_artigo(request):
    if request.method != "POST":
        return JsonResponse({"success": False, "error": "Método inválido"}, status=405)

    try:
        data = json.loads(request.body)
        artigo = Artigo.objects.create(
            nome=data.get("nome"),
            descricao=data.get("descricao"),
            preco=data.get("preco"),
            taxa=data.get("taxa"),
        )
        return JsonResponse({"success": True, "id_artigo": artigo.id_artigo})
    except Exception as e:
        return JsonResponse({"success": False, "error": str(e)})

def clientes_view(request):
    vendedores = Vendedor.objects.all().order_by('nome')
    clientes = Cliente1.objects.all()
    return render(request, "webapp.html", {
        "vendedores": vendedores,
        "abrir_modal_cliente": False,
        "clientes": clientes
    })

def artigos_view(request):
    artigos = Artigo.objects.all()
    return render(request, "webapp.html", {
        "abrir_modal_artigo": False,
        "artigos": artigos
    })

def registar_json(request):
    vendedores = list(Vendedor.objects.values('id_vendedor', 'nome'))
    zona = list(Zona.objects.values('id_zona', 'zona'))
    transporte = list(Transporte.objects.values('id_transporte', 'descricao'))
    impostos = list(Impostos.objects.values('id_impostos', 'nome'))
    pagamento = list(Pagamento.objects.values('id_pagamento', 'nome'))
    modalidade = list(Modalidade.objects.values('id_modalidade', 'nome'))
    precos = list(Precos.objects.values('id_precos', 'nome'))
    return JsonResponse({
        "vendedores": vendedores,
        "zonas": zona,
        "transportes": transporte,
        "impostos": impostos,
        "pagamentos": pagamento,
        "modalidades": modalidade,
        "precos": precos,
    })


from django.http import Http404

def cliente_dados(request, id_cliente):
    """
    Retorna os dados de um cliente específico em JSON,
    usado para preencher o modal de edição.
    """
    try:
        cliente = Cliente1.objects.get(id_cliente=id_cliente)
    except Cliente1.DoesNotExist:
        raise Http404("Cliente não encontrado")

    data = {
        "id_cliente": cliente.id_cliente,
        "codigo": cliente.codigo,
        "nome": cliente.nome,
        "morada1": cliente.morada1,
        "morada2": cliente.morada2,
        "codigo_postal": cliente.codigo_postal,
        "telemovel": cliente.telemovel,
        "sigla": cliente.sigla,
        "contribuinte": cliente.contribuinte,
        "pais": cliente.pais,
        "distrito": cliente.distrito,
        "concelho": cliente.concelho,
        "email": cliente.email,
        "vendedor_id": cliente.vendedor.id_vendedor if cliente.vendedor else None,
        "vendedor_nome": cliente.vendedor.nome if cliente.vendedor else None,

        "zona_id": cliente.zona.id_zona if cliente.zona else None,
        "zona_nome": cliente.zona.zona if cliente.zona else None,

        "transporte_id": cliente.transporte.id_transporte if cliente.transporte else None,
        "transporte_nome": cliente.transporte.descricao if cliente.transporte else None,

        "impostos_id": cliente.impostos.id_impostos if cliente.impostos else None,
        "impostos_nome": cliente.impostos.nome if cliente.impostos else None,

        "pagamento_id": cliente.pagamento.id_pagamento if cliente.pagamento else None,
        "pagamento_nome": cliente.pagamento.nome if cliente.pagamento else None,

        "modalidade_id": cliente.modalidade.id_modalidade if cliente.modalidade else None,
        "modalidade_nome": cliente.modalidade.nome if cliente.modalidade else None,

        "precos_id": cliente.precos.id_precos if cliente.precos else None,
        "precos_nome": cliente.precos.nome if cliente.precos else None,
    }

    return JsonResponse(data)

def artigo_dados(request, id_artigo):
    """
    Retorna os dados de um cliente específico em JSON,
    usado para preencher o modal de edição.
    """
    try:
        artigo = Artigo.objects.get(id_artigo=id_artigo)
    except Artigo.DoesNotExist:
        raise Http404("Artigo não encontrado")

    data = {
        "codigo": artigo.id_artigo,
        "nome": artigo.nome,
        "descricao": artigo.descricao,
        "preco": artigo.preco,
        "taxa": artigo.taxa,
    }

    return JsonResponse(data)


def cliente_editar(request, id_cliente, ):
    if request.method != 'POST':
        return JsonResponse({'success': False, 'error': 'Método não permitido'}, status=405)

    try:
        data = json.loads(request.body)
    except json.JSONDecodeError:
        return JsonResponse({'success': False, 'error': 'JSON inválido'})

    valido, mensagem = validar_dados_cliente(data, cliente_id=id_cliente, is_edit=True)

    if not valido:
        print(f"DEBUG: Validação falhou! Motivo: {mensagem}")
        return JsonResponse({'success': False, 'error': mensagem}, status=400)
    try:
        cliente = Cliente1.objects.get(id_cliente=id_cliente)
    except Cliente1.DoesNotExist:
        return JsonResponse({'success': False, 'error': "Cliente não encontrado"}, status=404)

    cliente.morada1 = data.get('morada1', cliente.morada1)
    cliente.morada2 = data.get('morada2', cliente.morada2)
    cliente.codigo_postal = data.get('codigo_postal', cliente.codigo_postal)
    cliente.telemovel = data.get('telemovel', cliente.telemovel)
    cliente.sigla = data.get('sigla', cliente.sigla)
    cliente.contribuinte = data.get('contribuinte', cliente.contribuinte)
    cliente.pais = data.get('pais', cliente.pais)
    cliente.distrito = data.get('distrito', cliente.distrito)
    cliente.concelho = data.get('concelho', cliente.concelho)
    cliente.email = data.get('email', cliente.email)

    cliente.vendedor_id = data.get('vendedor') or None
    cliente.zona_id = data.get('zona') or None
    cliente.transporte_id = data.get('transporte') or None
    cliente.impostos_id = data.get('impostos') or None
    cliente.pagamento_id = data.get('pagamento') or None
    cliente.modalidade_id = data.get('modalidade') or None
    cliente.precos_id = data.get('precos') or None

    try:
        cliente.save()
    except Exception as e:
        return JsonResponse({'success': False, 'error': f'Erro ao gravar na BD: {str(e)}'}, status=500)

    return JsonResponse({'success': True, 'message': 'Cliente atualizado com sucesso'})

from django.shortcuts import get_object_or_404, redirect
from django.http import JsonResponse
from .models import Artigo

from django.shortcuts import get_object_or_404
from django.http import JsonResponse
from .models import Artigo

def artigo_editar(request, id_artigo):
    artigo = get_object_or_404(Artigo, id_artigo=id_artigo)

    if request.method == 'POST':
        nome = request.POST.get('nome', '').strip()
        descricao = request.POST.get('descricao', '').strip()
        tipo = request.POST.get('tipo', '').strip()
        taxa = request.POST.get('taxa', '').strip()
        preco = request.POST.get('preco', '').strip()

        errors = []

        if not nome:
            errors.append("Nome obrigatório")
        elif len(nome) > 40:
            errors.append("Nome deve ter no máximo 40 caracteres")

        if tipo not in ['P', 'S']:
            errors.append("Tipo inválido")

        if taxa:
            try:
                t = float(taxa.replace(',', '.'))
                if t not in [0, 6, 13, 23]:
                    errors.append("Taxa IVA inválida")
            except ValueError:
                errors.append("Taxa IVA inválida")

        if preco:
            try:
                p = float(preco.replace(',', '.'))
                if p < 0:
                    errors.append("Preço deve ser positivo")
                elif round(p, 2) != p:
                    errors.append("Preço deve ter no máximo 2 casas decimais")
            except ValueError:
                errors.append("Preço inválido")

        if descricao:
            if len(descricao) > 200:
                errors.append("Descrição deve ter no máximo 200 caracteres")

        if errors:
            return JsonResponse({'success': False, 'errors': errors}, status=400)

        # atualiza artigo
        artigo.nome = nome
        artigo.descricao = descricao if descricao else None
        artigo.tipo = tipo
        artigo.taxa = taxa if taxa else None
        artigo.preco = preco if preco else None
        artigo.save()

        return JsonResponse({'success': True})

    return render(request, "subsubconteudo/criar_editar_artigo.html", {"artigo": artigo})


@csrf_exempt
def cliente_apagar(request, id_cliente):
    if request.method != "POST":
        return JsonResponse({"success": False, "error": "Método não permitido"}, status=405)

    try:
        cliente = Cliente1.objects.get(id_cliente=id_cliente)

        # Verifica se existem documentos associados
        existe_documento = DocumentoFinalizado.objects.filter(
            cliente_id=id_cliente
        ).exists()

        if existe_documento:
            return JsonResponse({
                "success": False,
                "has_documents": True,  # Flag explícita
                "error": "Não é possível apagar o cliente porque existem documentos associados."
            }, status=400)

        cliente.delete()
        return JsonResponse({"success": True})

    except Cliente1.DoesNotExist:
        return JsonResponse({"success": False, "error": "Cliente não encontrado"})

from django.db.models import ProtectedError


@csrf_exempt
def artigo_apagar(request, id_artigo):
    if request.method != "POST":
        return JsonResponse({"success": False, "error": "Método não permitido"}, status=405)

    try:
        artigo = Artigo.objects.get(id_artigo=id_artigo)
        artigo.delete()
        return JsonResponse({"success": True})

    except Artigo.DoesNotExist:
        return JsonResponse({"success": False, "error": "Artigo não encontrado."})

    except ProtectedError:
        # Este é o erro que o Django lança quando há chaves estrangeiras protegidas
        return JsonResponse({
            "success": False,
            "error": "Não é possível eliminar este artigo porque ele já está associado a documentos ou registos financeiros."
        })

    except Exception as e:
        return JsonResponse({"success": False, "error": f"Erro inesperado: {str(e)}"})
def artigos_json(request):
    artigos = Artigo.objects.all()
    data = []
    for c in artigos:
        data.append({
            "codigo": c.id_artigo,
            "nome": c.nome,
            "descricao": c.descricao,
            "preco": c.preco,
            "taxa": c.taxa,
        })
    return JsonResponse(data, safe=False)

PRAZO_PAGAMENTO = {
    'Pronto Pagamento': 0,
    '30 DIAS': 30,
    '45 DIAS': 45,
    '60 DIAS': 60,
}
def get_clientes(request):
    clientes = Cliente1.objects.select_related('pagamento').all()
    data = []
    for c in clientes:
        prazo_dias = PRAZO_PAGAMENTO.get(c.pagamento.nome, 0) if c.pagamento else 0
        data.append({
            'id': c.id_cliente,
            'nome': c.nome,
            'prazo': prazo_dias,
        })
    return JsonResponse(data, safe=False)


def adicionar_item(request, template_name='faturas/nova_fatura.html'):
    artigos = Artigo.objects.all().order_by('descricao')

    context = {
        'artigos': artigos,
    }

    return render(request, template_name, context)

from django.views.decorators.csrf import csrf_exempt
import json


@csrf_exempt
def validar_linha(request):
    if request.method != "POST":
        return JsonResponse({"ok": False, "erros": ["Método inválido"]})

    try:
        data = json.loads(request.body)
    except json.JSONDecodeError:
        return JsonResponse({"ok": False, "erros": ["Dados inválidos"]})

    erros = []

    tipo_doc = data.get("tipoDocumento", "FT")
    code = data.get("code")
    item = data.get("item")

    try:
        quantity = float(data.get("quantity", 0))
        price = float(data.get("price", 0))
        discount = float(data.get("discount", 0))
        tax = int(data.get("tax", 0))
    except (ValueError, TypeError):
        return JsonResponse({"ok": False, "erros": ["Formatos numéricos inválidos"]})

    motivo_iva0 = data.get("motivo_iva0")
    validacao_final = data.get("validacao_final", False)


    if not code:
        erros.append("Deves selecionar um artigo (código).")
    if not item:
        erros.append("A descrição do artigo não pode estar vazia.")

    if tipo_doc == "GT":
        if price < 0:
            erros.append("O preço na guia não pode ser negativo.")
    else:
        if price <= 0:
            erros.append("O preço deve ser um número maior que 0.")

    if quantity <= 0:
        erros.append("A quantidade deve ser um número maior que 0.")

    if discount < 0:
        erros.append("O desconto deve ser um número >= 0.")

    if tax not in [0, 6, 13, 23]:
        erros.append("O IVA deve ser 0%, 6%, 13% ou 23%.")

    if tax == 0 and validacao_final:
        if not motivo_iva0:
            erros.append("Quando o IVA é 0%, é obrigatório indicar o motivo de isenção.")

    total_calculado = price * quantity
    if discount > total_calculado and price > 0:
        erros.append("O desconto não pode ser maior que o total da linha.")

    if erros:
        return JsonResponse({"ok": False, "erros": erros})

    return JsonResponse({"ok": True})

from .models import Transporte

def matriculas_dropdown(request):
    transportes = Transporte.objects.all().order_by('descricao')  # ou outro filtro
    data = [{"descricao": t.descricao} for t in transportes]
    return JsonResponse(data, safe=False)


from django.db import transaction
from django.views.decorators.csrf import csrf_exempt
from datetime import datetime, timedelta

@csrf_exempt
def criar_documento_temp(request):
    if request.method != "POST":
        return JsonResponse({"erro": "Método inválido."}, status=405)

    cliente_id = request.POST.get("cliente")
    documento = request.POST.get("documento")
    data_emissao = request.POST.get("data_emissao")
    data_vencimento = request.POST.get("data_vencimento")

    if not all([cliente_id, documento, data_emissao, data_vencimento]):
        return JsonResponse({"erro": "Campos obrigatórios em falta."}, status=400)

    try:
        cliente = Cliente1.objects.select_related(
            "transporte",
            "pagamento",
            "impostos"
        ).get(id_cliente=cliente_id)
    except Cliente1.DoesNotExist:
        return JsonResponse({"erro": "Cliente inválido."}, status=400)

    ano = int(data_emissao[:4])

    with transaction.atomic():
        contador, created = DocumentoContador.objects.select_for_update().get_or_create(
            tipo=documento,
            ano=ano,
            defaults={"serie": "A", "ultimo_numero": 0}
        )

        # Incrementa número
        numero = contador.ultimo_numero + 1
        contador.ultimo_numero = numero
        contador.save()

        doc = DocumentoTemp.objects.create(
            tipo=documento,
            serie=contador.serie,
            numero=numero,
            ano=ano,
            cliente=cliente,
            data_emissao=data_emissao,
            data_vencimento=data_vencimento,
            valor_total=0,
            transporte=cliente.transporte,
            impostos=cliente.impostos,
            pagamento=cliente.pagamento if cliente.pagamento else None,
            moeda_id=15
        )

    return JsonResponse({
        "id": doc.id,
        "tipo": doc.tipo,
        "serie": doc.serie,
        "numero": doc.numero,
        "ano": doc.ano,
    })

from django.http import JsonResponse
from .models import DocumentoTemp, Empresa


from django.http import JsonResponse
from django.utils import timezone

def obter_documento_temp(request, temp_id):
    try:
        doc = DocumentoTemp.objects.select_related(
            "cliente__transporte",
            "cliente__pagamento",
            "cliente__impostos",
            "moeda"
        ).get(id=temp_id)
    except DocumentoTemp.DoesNotExist:
        return JsonResponse({"erro": "Documento não encontrado"}, status=404)

    empresa = Empresa.objects.first()
    if not empresa:
        return JsonResponse({"erro": "Empresa não configurada."}, status=400)

    moedas = list(Moeda.objects.values("id", "codigo", "nome", "simbolo"))

    modalidades = list(Modalidade.objects.values("id_modalidade", "nome"))

    tax_reasons = list(TaxReason.objects.values("code", "description"))

    cliente_data = None
    if doc.cliente:
        cliente_data = {
            "id": doc.cliente.id_cliente,
            "codigo": doc.cliente.codigo,
            "nome": doc.cliente.nome,
            "morada1": doc.cliente.morada1,
            "morada2": doc.cliente.morada2,
            "codigo_postal": doc.cliente.codigo_postal,
            "pais": doc.cliente.pais,
            "concelho": doc.cliente.concelho,
            "contribuinte": doc.cliente.contribuinte,
            "email": doc.cliente.email,
            "transporte": doc.cliente.transporte.descricao,
            "modalidade": {
                "id": doc.cliente.modalidade.id_modalidade,
                "nome": doc.cliente.modalidade.nome
            } if doc.cliente.modalidade else None,
            "impostos": doc.cliente.impostos.nome
        }
        if doc.cliente.impostos.nome.upper() == "IVA":
            cliente_data["local_descarga"] = doc.cliente.morada1
        else:
            cliente_data["local_descarga"] = ""

    artigos_qs = TempArtigos.objects.filter(id_temp=doc).select_related(
        "id_art",
        "motivo"
    )

    artigos = []

    for a in artigos_qs:
        artigos.append({
            "id": a.id_art.id_artigo,
            "tipo": a.tipo,
            "descricao": a.descricao,
            "quantidade": a.quantidade,
            "preco": float(a.preco),
            "desconto": float(a.desconto),
            "taxa": float(a.taxa),
            "total": float(a.total),
            "motivo": a.motivo.code if a.motivo else None,
            "motivo_descricao": a.motivo.description if a.motivo else None
        })

    return JsonResponse({
        # --- DOCUMENTO ---
        "id": doc.id,
        "tipo": doc.tipo,
        "serie": doc.serie,
        "numero": doc.numero,
        "ano": doc.ano,
        "ordem_compra": doc.ordem_compra,
        "numero_compromisso": doc.numero_compromisso,
        "descricao": doc.descricao,
        "rodape": doc.rodape,
        "data_emissao": doc.data_emissao,
        "data_vencimento": doc.data_vencimento,
        "valor_total": doc.valor_total,
        "data_carga": doc.data_carga,
        "data_descarga": doc.data_descarga,
        "expedicao": doc.expedicao,
        "matricula": doc.transporte.descricao,


        # --- CLIENTE ---
        "cliente": cliente_data,
        "modalidades": modalidades,

        # --- MOEDA ---
        "moeda": {
            "id": doc.moeda.id,
            "codigo": doc.moeda.codigo,
            "nome": doc.moeda.nome,
            "simbolo": doc.moeda.simbolo,
        },

        # lista de moedas disponíveis
        "moedas": moedas,

        # --- EMPRESA ---
        "empresa": {
            "nome": empresa.nome,
            "morada": empresa.morada,
            "codigo_postal": empresa.codigo_postal,
            "cidade": empresa.cidade,
            "pais": empresa.pais,
            "email": empresa.email,
            "nif": empresa.nif,
            "telefone": empresa.telefone,
            "local": empresa.local
        },

        "tax_reasons": tax_reasons,
        "artigos": artigos
    })

class Command(BaseCommand):
    help = "Apaga documentos temporários com tipo específico se tiverem mais de 7 dias sem alterações"

    def handle(self, *args, **kwargs):
        limite = timezone.now() - timedelta(days=7)
        documentos = DocumentoTemp.objects.filter(
            estado='Rascunho',        # ou qualquer filtro que desejar
            atualizado_em__lt=limite  # não foram alterados nos últimos 7 dias
        )
        count = documentos.count()
        documentos.delete()
        self.stdout.write(self.style.SUCCESS(f'Apagados {count} documentos antigos.'))

def apagar_documento(request):
    if request.method == "POST":
        try:
            import json
            data = json.loads(request.body)
            temp_id = data.get("id")

            if not temp_id:
                return JsonResponse({"success": False, "error": "ID do documento não fornecido."}, status=400)

            documento = DocumentoTemp.objects.filter(id=temp_id).first()
            if not documento:
                return JsonResponse({"success": False, "error": "Documento não encontrado."}, status=404)

            documento.delete()
            return JsonResponse({"success": True, "message": "Documento apagado com sucesso."})

        except Exception as e:
            return JsonResponse({"success": False, "error": f"Erro ao apagar documento: {str(e)}"}, status=400)

    return JsonResponse({"success": False, "error": "Método inválido."}, status=405)

import re
def validar_ordem_compra(ordem_compra):
    """ Valida se a ordem de compra segue o formato esperado (ex: 'PO12345'). """
    if ordem_compra:
        if not re.match(r'^[A-Za-z]{2,4}\d{1,6}$', ordem_compra):  # Exemplo de padrão alfanumérico (PO12345)
            raise ValidationError("Ordem de compra inválida. O formato esperado é 'PO12345'.")
    return ordem_compra

def validar_numero_compromisso(numero_compromisso):
    """ Valida se o número de compromisso é um número válido e dentro do limite esperado. """
    if numero_compromisso:
        if not numero_compromisso.isdigit():  # Verifica se o número de compromisso é numérico
            raise ValidationError("Número de compromisso inválido. Apenas números são permitidos.")
        if len(numero_compromisso) < 6 or len(numero_compromisso) > 12:
            raise ValidationError("Número de compromisso inválido. O comprimento deve ser entre 6 e 12 caracteres.")
    return numero_compromisso

def validar_texto_longo(campo_texto, limite=500):
    """ Verifica se o texto ultrapassa o limite de caracteres e o corta se necessário. """
    if campo_texto:
        if len(campo_texto) > limite:
            raise ValidationError(f"O texto não pode exceder {limite} caracteres.")
        return campo_texto
    return campo_texto

import logging

# Configurar o logger
logger = logging.getLogger(__name__)
from django.core.exceptions import ValidationError
from decimal import Decimal, ROUND_HALF_UP

def atualizar_documento(request):
    if request.method == "POST":
        try:
            data = json.loads(request.body)
            temp_id = data.get("temp_id")
            if not temp_id:
                return JsonResponse({"success": False, "error": "temp_id não fornecido"}, status=400)

            documento = DocumentoTemp.objects.filter(id=temp_id).first()
            if not documento:
                return JsonResponse({"success": False, "error": "Documento não encontrado"}, status=404)

            # Atualizar campos do documento
            documento.data_emissao = data.get("data_emissao") or documento.data_emissao
            documento.data_vencimento = data.get("data_vencimento") or documento.data_vencimento
            documento.ordem_compra = data.get("ordem_compra") or documento.ordem_compra
            documento.numero_compromisso = data.get("numero_comp") or documento.numero_compromisso
            documento.descricao = data.get("descricao") or documento.descricao
            documento.rodape = data.get("rodape") or documento.rodape
            documento.local_carga = data.get("local_carga") or documento.local_carga
            documento.local_descarga = data.get("local_descarga") or documento.local_descarga

            ordem_compra = data.get("ordem_compra")
            if ordem_compra:
                documento.ordem_compra = validar_ordem_compra(ordem_compra)

            # Validar e atualizar número de compromisso
            numero_compromisso = data.get("numero_comp")
            if numero_compromisso:
                documento.numero_compromisso = validar_numero_compromisso(numero_compromisso)

            descricao = data.get("descricao")
            if descricao:
                documento.descricao = validar_texto_longo(descricao, limite=500)

            rodape = data.get("rodape")
            if rodape:
                documento.rodape = validar_texto_longo(rodape, limite=200)
            try:
                data_emissao = data.get("data_emissao")
                if data_emissao:
                    documento.data_emissao = datetime.strptime(data_emissao, "%d/%m/%Y")

                    # Verificar se a data de emissão é maior ou igual à data atual
                    if documento.data_emissao.date() < timezone.now().date():
                        return JsonResponse(
                            {"success": False, "error": "A data de emissão não pode ser anterior à data atual."},
                            status=400)

                local_carga = data.get("local_carga")
                if local_carga:
                    if len(local_carga) > 255:  # Limite de 255 caracteres para local de carga
                        raise ValidationError("O local de carga não pode ter mais que 255 caracteres.")

                local_descarga = data.get("local_descarga")
                if local_descarga:
                    if len(local_descarga) > 255:  # Limite de 255 caracteres para local de descarga
                        raise ValidationError("O local de descarga não pode ter mais que 255 caracteres.")

                data_vencimento = data.get("data_vencimento")
                if data_vencimento:
                    documento.data_vencimento = datetime.strptime(data_vencimento, "%d/%m/%Y")

                    # Verificar se a data de vencimento é maior ou igual à data atual
                    if documento.data_vencimento.date() < timezone.now().date():
                        return JsonResponse(
                            {"success": False, "error": "A data de vencimento não pode ser anterior à data atual."},
                            status=400)

                    # Validar se a data de vencimento não é anterior à data de emissão
                    if documento.data_vencimento.date() < documento.data_emissao.date():
                        return JsonResponse({"success": False,
                                             "error": "A data de vencimento não pode ser anterior à data de emissão."},
                                            status=400)

                data_carga = data.get("data_carga")
                if data_carga:
                    # converter string para datetime
                    dt_carga_naive = datetime.strptime(data_carga, "%d/%m/%Y %H:%M")

                    # tornar timezone-aware
                    documento.data_carga = timezone.make_aware(dt_carga_naive, timezone.get_current_timezone())

                    if documento.data_carga.date() < timezone.now().date():
                        return JsonResponse(
                            {"success": False, "error": "A data de carga não pode ser anterior à data atual."},
                            status=400
                        )

                # Data de descarga
                data_descarga = data.get("data_descarga")
                if data_descarga:
                    dt_descarga_naive = datetime.strptime(data_descarga, "%d/%m/%Y %H:%M")
                    documento.data_descarga = timezone.make_aware(dt_descarga_naive, timezone.get_current_timezone())

                    if documento.data_descarga < timezone.now() :
                        return JsonResponse(
                            {"success": False, "error": "A data de descarga não pode ser anterior à data atual."},
                            status=400
                        )

                    if documento.data_descarga < documento.data_carga:
                        return JsonResponse(
                            {"success": False, "error": "A data de descarga não pode ser anterior à data de carga."},
                            status=400
                        )
            except ValueError as e:
                return JsonResponse({"success": False, "error": f"Erro no formato da data: {str(e)}"}, status=400)

            if documento.data_carga and documento.data_emissao:
                if documento.data_carga.date() < documento.data_emissao.date():
                    return JsonResponse(
                        {"success": False, "error": "A data de carga não pode ser anterior à data de emissão."},
                        status=400
                    )
            documento.expedicao = data.get("expedicao") or documento.expedicao

            expedicao = data.get("expedicao")
            if expedicao:
                if len(expedicao) > 255:  # Limite de 255 caracteres para local de descarga
                    raise ValidationError("O modo de expedição não pode ter mais que 255 caracteres.")

            cliente_id = data.get("cliente_id")
            if not cliente_id:
                return JsonResponse(
                    {"success": False, "error": "Cliente obrigatório."},
                    status=400
                )
            if cliente_id:
                cliente_obj = Cliente1.objects.filter(id_cliente=cliente_id).first()
                if not cliente_obj:
                    return JsonResponse({"success": False, "error": f"Cliente {cliente_id} não encontrado."}, status=400)
                documento.cliente_id = cliente_obj.id_cliente

            metodo_pagamento = data.get("metodo_pagamento")
            if metodo_pagamento:
                pagamento_obj = Modalidade.objects.filter(nome=metodo_pagamento).first()
                if not pagamento_obj:
                    return JsonResponse({"success": False, "error": f"Modalidade de pagamento {metodo_pagamento} não encontrada."}, status=400)
                documento.pagamento_id = pagamento_obj.id_modalidade

            moeda_id = data.get("moeda")
            if moeda_id:
                moeda_obj = Moeda.objects.filter(id=moeda_id).first()
                if not moeda_obj:
                    return JsonResponse({"success": False, "error": f"Moeda {moeda_id} não encontrada."}, status=400)
                documento.moeda_id = moeda_obj.id

            # Transporte (opcional)
            transporte_descricao = data.get("matricula")
            if transporte_descricao:
                transporte_obj = Transporte.objects.filter(descricao=transporte_descricao).first()
                if not transporte_obj:
                    return JsonResponse({"success": False, "error": f"Transporte com matrícula {transporte_descricao} não encontrado."}, status=400)
                documento.transporte_id = transporte_obj.id_transporte


            TempArtigos.objects.filter(id_temp=documento.id).delete()

            # Criar novos artigos
            artigos_data = data.get("artigos", [])
            if not artigos_data:
                return JsonResponse(
                    {"success": False, "error": "O documento deve conter pelo menos um artigo."},
                    status=400
                )
            valor_total = Decimal("0.00")
            if artigos_data:
                for artigo_data in artigos_data:
                    try:
                        # Aqui pode ocorrer um erro se 'codigo' não for fornecido ou o formato de dados estiver errado
                        artigo_codigo = artigo_data.get("codigo")
                        if not artigo_codigo:
                            logger.error(f"Erro: Código do artigo não fornecido para os dados {artigo_data}")
                            return JsonResponse({"success": False, "error": "Código do artigo não fornecido"},
                                                status=400)

                        artigo_obj = Artigo.objects.filter(id_artigo=artigo_codigo).first()
                        if not artigo_obj:
                            logger.error(f"Erro: Artigo com código {artigo_codigo} não encontrado.")
                            return JsonResponse(
                                {"success": False, "error": f"Artigo com código {artigo_codigo} não encontrado."},
                                status=400)

                        # Continuar a criação do artigo, mais validações podem ser feitas aqui
                        tipo_artigo = artigo_obj.tipo
                        preco = Decimal(artigo_data.get("preco", "0").replace(",", "."))
                        if preco <= 0:
                            return JsonResponse(
                                {"success": False, "error": "O preço deve ser maior que zero."},
                                status=400
                            )
                        desconto = Decimal(artigo_data.get("desconto", "0").replace(",", "."))
                        if desconto < 0:
                            return JsonResponse(
                                {"success": False, "error": "O desconto não pode ser negativo."},
                                status=400
                            )

                        iva = Decimal(artigo_data.get("iva", "0").replace(",", "."))
                        TAXAS_VALIDAS = {0, 6, 13, 23}

                        if iva not in TAXAS_VALIDAS:
                            return JsonResponse(
                                {"success": False, "error": "Taxa de IVA inválida."},
                                status=400
                            )
                        total = Decimal(artigo_data.get("total", "0").replace(",", "."))


                        quantidade_raw = artigo_data.get("quantidade", 0)

                        try:
                            quantidade = int(quantidade_raw)
                        except (ValueError, TypeError):
                            return JsonResponse(
                                {"success": False, "error": "Quantidade inválida."},
                                status=400
                            )

                        if quantidade < 1 or quantidade > 10000:
                            return JsonResponse(
                                {"success": False, "error": "A quantidade deve estar entre 1 e 10000."},
                                status=400
                            )
                        if desconto > preco * quantidade:
                            return JsonResponse(
                                {"success": False, "error": "O desconto não pode ser superior ao valor da linha."},
                                status=400
                            )
                        descricao = artigo_data.get("descricao", "").strip()

                        if not descricao:
                            return JsonResponse(
                                {"success": False, "error": "A descrição do artigo é obrigatória."},
                                status=400
                            )

                        if len(descricao) > 255:
                            return JsonResponse(
                                {"success": False, "error": "A descrição não pode exceder 255 caracteres."},
                                status=400
                            )

                        subtotal = (preco * quantidade - desconto).quantize(Decimal("0.01"), rounding=ROUND_HALF_UP)
                        total_com_iva = (subtotal * (1 + iva / 100)).quantize(Decimal("0.01"), rounding=ROUND_HALF_UP)

                        total_recebido = total.quantize(
                            Decimal("0.01"), rounding=ROUND_HALF_UP
                        )

                        valor_total += total_com_iva

                        if subtotal != total_recebido:
                            return JsonResponse(
                                {
                                    "success": False,
                                    "error": f"Total inválido. Esperado: {subtotal}, Recebido: {total_recebido}"
                                },
                                status=400
                            )

                        motivo_tax = artigo_data.get("motivo")

                        if iva == 0:
                            # Motivo obrigatório
                            if not motivo_tax:
                                return JsonResponse(
                                    {"success": False, "error": "Motivo de IVA obrigatório quando a taxa é 0%."},
                                    status=400
                                )

                            tax_reason = TaxReason.objects.filter(code=motivo_tax).first()
                            if not tax_reason:
                                logger.error(f"Erro: Motivo IVA '{motivo_tax}' não encontrado.")
                                return JsonResponse(
                                    {"success": False, "error": f"Motivo IVA '{motivo_tax}' inválido."},
                                    status=400
                                )

                        else:
                            # Não deve haver motivo quando IVA ≠ 0
                            if motivo_tax:
                                return JsonResponse(
                                    {"success": False, "error": "Motivo de IVA só é permitido quando a taxa é 0%."},
                                    status=400
                                )

                            tax_reason = None

                        if documento.tipo == 'FS':
                            limite_consumidor_final = Decimal("1000.00")
                            limite_sujeito_passivo = Decimal("100.00")

                            tem_nif = False
                            if documento.cliente and documento.cliente.contribuinte:
                                if str(documento.cliente.contribuinte) != "999999990":
                                    tem_nif = True

                            if tem_nif and valor_total > limite_sujeito_passivo:
                                return JsonResponse({
                                    "success": False,
                                    "error": f"Fatura Simplificada para empresas não pode exceder {limite_sujeito_passivo}€. Use Fatura (FT)."
                                }, status=400)

                            if valor_total > limite_consumidor_final:
                                return JsonResponse({
                                    "success": False,
                                    "error": f"Fatura Simplificada não pode exceder {limite_consumidor_final}€. Use Fatura (FT)."
                                }, status=400)

                        TempArtigos.objects.create(
                            id_temp=documento,
                            id_art=artigo_obj,
                            tipo=tipo_artigo,
                            descricao=descricao,
                            quantidade=quantidade,
                            preco=preco,
                            desconto=desconto,
                            taxa=iva,
                            total=subtotal,
                            motivo_id=tax_reason.id if tax_reason else None
                        )

                    except Exception as e:
                        # Log de erro específico do artigo
                        logger.error(f"Erro ao processar artigo {artigo_data}: {str(e)}")
                        return JsonResponse({"success": False, "error": f"Erro ao processar artigo: {str(e)}"},
                                            status=400)

            documento.valor_total = valor_total
            documento.save()

            return JsonResponse({
                "success": True,
                "message": "Documento atualizado com sucesso!",
                "documento_id": documento.id
            })

        except Exception as e:
            logger.error(f"Erro inesperado ao atualizar documento: {str(e)}", exc_info=True)  # Log detalhado do erro
            return JsonResponse({"success": False, "error": f"Erro inesperado: {str(e)}"}, status=400)


from .models import DocumentoTemp, TempArtigos

def editar_fatura(request):
    """
    View para editar uma fatura temporária.
    Recebe o temp_id (id do DocumentoTemp) na URL.
    Retorna todos os dados do documento e todos os artigos relacionados.
    """

    # Pega o ID do documento da URL
    temp_id = request.GET.get('temp_id')

    # Busca o documento temporário
    documento = get_object_or_404(DocumentoTemp, id=temp_id)

    # Busca todos os artigos ligados a este documento
    # select_related para otimizar joins com id_art e motivo
    artigos = TempArtigos.objects.filter(id_temp=documento).select_related('id_art', 'motivo')

    artigos_novos = Artigo.objects.all()

    # Renderiza o template, passando documento e artigos
    return render(request, 'faturas/editar_faturas.html', {
        'documento': documento,
        'artigos': artigos,
        'artigos_novos': artigos_novos
    })

def gerar_codigo_at(documento):
    """
    Gera um código único da AT para o documento.
    Formato: TIPO-SERIE-ANO-NUMERO
    Exemplo: FT-A-2026-000123
    """
    return f"{documento.tipo}-{documento.serie}-{documento.ano}-{str(documento.numero).zfill(6)}"

from django.conf import settings

from docx.oxml.ns import qn

from docxtpl import DocxTemplate
from decimal import Decimal
from collections import defaultdict
from copy import deepcopy
from docx.oxml import OxmlElement
import copy
from docx.enum.text import WD_ALIGN_PARAGRAPH
from docx.text.paragraph import Paragraph

def remover_bordas(cell):
    tc = cell._tc
    tcPr = tc.get_or_add_tcPr()

    tcBorders = OxmlElement('w:tcBorders')

    for lado in ('top', 'left', 'bottom', 'right', 'insideH', 'insideV'):
        elem = OxmlElement(f'w:{lado}')
        elem.set(qn('w:val'), 'nil')  # sem borda
        tcBorders.append(elem)

    tcPr.append(tcBorders)


import qrcode
from io import BytesIO
from docx.shared import Mm
from docxtpl import InlineImage


def gerar_qr(documento: DocumentoFinalizado, docx_obj):
    """
    Gera o QR Code oficial da fatura e retorna como InlineImage para inserir no docx.
    """
    # Montar dados do QR Code
    qr_data = (
        f"A:{documento.empresa_contribuinte}*"
        f"B:{documento.cliente_contribuinte or '999999990'}*"
        f"C:{documento.cliente_pais or 'PT'}*"
        f"D:{documento.tipo}*"
        f"E:N*"
        f"F:{documento.data_emissao.strftime('%Y%m%d')}*"
        f"G:{documento.tipo} {documento.serie}/{documento.numero}*"
        f"H:{documento.valor_total:.2f}*"
        f"P:{documento.codigo_at_tributaria or ''}"
    )

    qr = qrcode.QRCode(
        version=1,
        error_correction=qrcode.constants.ERROR_CORRECT_L,
        box_size=4,
        border=1,
    )
    qr.add_data(qr_data)
    qr.make(fit=True)

    img = qr.make_image(fill_color="black", back_color="white")

    # Salvar em buffer
    qr_buffer = BytesIO()
    img.save(qr_buffer, format="PNG")
    qr_buffer.seek(0)

    # Criar InlineImage do docxtpl
    qr_inline = InlineImage(docx_obj, qr_buffer, width=Mm(30))  # 30 mm de largura
    return qr_inline

from docx.shared import Pt, RGBColor
from docx.oxml.ns import nsdecls
from docx.oxml import parse_xml

def encontrar_tabela_por_conteudo(doc, fragmento_texto):
    fragmento = fragmento_texto.lower().strip()
    for i, tabela in enumerate(doc.tables):
        for row in tabela.rows:
            for cell in row.cells:
                if fragmento in cell.text.lower():
                    return tabela
    return None

def gerar_word_fatura(documento_final, via="original"):

    modelo_path = os.path.join(
        settings.BASE_DIR,
        "Faturamento/docs/Documento.docx"
    )
    artigos = FinArtigos.objects.filter(id_final=documento_final)

    mapa_iva = defaultdict(lambda: {"base": Decimal("0.00"), "valor": Decimal("0.00")})
    subtotal = Decimal("0.00")
    for art in artigos:
        taxa = Decimal(str(art.taxa))
        base = art.quantidade * art.preco
        base -= art.desconto or Decimal("0.00")
        subtotal += base
        valor_iva = base * taxa / Decimal("100")
        mapa_iva[taxa]["base"] += base
        mapa_iva[taxa]["valor"] += valor_iva

    context = {
        "documento_nome": str(documento_final),
        "tipo_documento": documento_final.tipo,
        "tipo_fatura": documento_final.get_tipo_display(),
        "nome_empresa": documento_final.empresa_nome,
        "morada_empresa": documento_final.empresa_morada,
        "postal_empresa": documento_final.empresa_codigo_postal,
        "concelho_empresa": documento_final.empresa_cidade,
        "nif_empresa": documento_final.empresa_contribuinte,

        "nome_cliente": documento_final.cliente_nome,
        "morada_cliente": documento_final.cliente_morada1,
        "postal_cliente": documento_final.cliente_codigo_postal,
        "concelho_cliente": documento_final.cliente_concelho,
        "nif_cliente": documento_final.cliente_contribuinte,

        "data_emissao": documento_final.data_emissao.strftime("%d/%m/%Y"),
        "data_vencimento": documento_final.data_vencimento.strftime("%d/%m/%Y"),


        "cod_at": documento_final.codigo_at_tributaria,
        "tipo_moeda": documento_final.moeda_simbolo,
        "ordem_compra": documento_final.ordem_compra,
        "numero_compromisso": documento_final.numero_compromisso,
        "subtotal": subtotal,
        "total_fatura": documento_final.valor_total,
        "metodo_pagamento": (
            documento_final.modalidade_nome
            if documento_final.modalidade_nome else None
        ),
        "local_carga": documento_final.local_carga if documento_final.local_carga else "",
        "local_descarga": documento_final.local_descarga if documento_final.local_descarga else "",

        # Formatação de datas (caso existam)
        "data_carga": (
            documento_final.data_carga.strftime("%d/%m/%Y")
            if documento_final.data_carga else ""
        ),
        "data_descarga": (
            documento_final.data_descarga.strftime("%d/%m/%Y")
            if documento_final.data_descarga else ""
        ),

        "expedição": documento_final.expedicao if documento_final.expedicao else "",
        "matricula": documento_final.transporte_descricao if documento_final.transporte_descricao else "",
    }


    if documento_final.descricao:
        context["descricao"] = documento_final.descricao

    if documento_final.rodape:
        context["rodape"] = documento_final.rodape

    # =============================
    # ARTIGOS
    # =============================

    artigos = FinArtigos.objects.filter(id_final=documento_final)

    vias_nomes = {
        "original": ["Original"],
        "duplicado": ["Original", "Duplicado"],
        "triplicado": ["Original", "Duplicado", "Triplicado"]
    }.get(via, ["Original"])
    documentos_vias = []


    for nome_via in vias_nomes:
        doc_via = DocxTemplate(modelo_path)


        # Criar contexto específico para esta via
        ctx = deepcopy(context)
        ctx["ficheiro"] = nome_via
        ctx["num_folha"] = 1
        ctx["total_folhas"] = 1
        ctx["qr_code"] = gerar_qr(documento_final, doc_via)

        # Renderiza as tags (incluindo as do cabeçalho e o IF da carga/descarga)
        doc_via.render(ctx)

        tabela_artigos = encontrar_tabela_por_conteudo(doc_via, "lista")

        for idx, a in enumerate(artigos, start=1):
            row = tabela_artigos.add_row().cells
            cor_hex = "F2F2F2" if idx % 2 != 0 else "E6E6E6"

            textos = [
                a.descricao,
                str(a.quantidade),
                f"{a.preco:.2f}",
                f"{a.desconto:.2f}",
                f"{a.taxa:.0f} *{idx}" if a.motivo else f"{a.taxa:.0f}",
                f"{a.total:.2f}"
            ]

            for i, cell in enumerate(row):
                # CORREÇÃO: Gerar um novo elemento de shading para CADA célula
                shading_elm = parse_xml(f'<w:shd {nsdecls("w")} w:fill="{cor_hex}"/>')
                cell._tc.get_or_add_tcPr().append(shading_elm)

                # Se a tua função remover_bordas mexer no XML da célula,
                # garante que ela não apaga o tcPr que acabaste de criar
                remover_bordas(cell)

                par = cell.paragraphs[0]
                # Limpar runs existentes
                for run_existente in par.runs:
                    par._element.remove(run_existente._element)

                par.paragraph_format.space_before = Pt(6)
                par.paragraph_format.space_after = Pt(6)
                par.paragraph_format.line_spacing = 1.2

                run = par.add_run(textos[i])
                run.font.name = "Geologica"
                run._element.rPr.rFonts.set(qn('w:eastAsia'), 'Geologica')
                run.font.size = Pt(9)
                par.alignment = WD_ALIGN_PARAGRAPH.CENTER

        # =============================
        # RESUMO DE IVA
        # ============================
        tabela_resumo = encontrar_tabela_por_conteudo(doc_via, "subtotal")

        # 1️⃣ Localizar o elemento XML (TR) da linha do Subtotal
        linha_referencia_tr = None
        for linha in tabela_resumo.rows:
            if "subtotal" in linha.cells[0].text.lower():
                linha_referencia_tr = linha._tr
                break

        # Se não encontrar o subtotal, usamos a primeira linha como base
        if linha_referencia_tr is None:
            linha_referencia_tr = tabela_resumo.rows[0]._tr

        # 2️⃣ Inserir as linhas de IVA
        for taxa, dados in sorted(mapa_iva.items(), reverse=True):
            # Criamos um novo elemento de linha (TR)
            # Em vez de add_row(), criamos um elemento vazio para ter controle total
            nova_linha_tr = copy.deepcopy(linha_referencia_tr)

            # Limpamos o texto das células da linha clonada
            for cell_xml in nova_linha_tr.xpath('.//w:t'):
                cell_xml.text = ""

            # Inserimos a nova linha logo após a linha de referência no XML
            linha_referencia_tr.addnext(nova_linha_tr)

            # Agora acessamos essa linha como um objeto do python-docx para formatar
            from docx.table import _Row
            nova_linha = _Row(nova_linha_tr, tabela_resumo)

            # Preencher os dados (assumindo que a tabela tem pelo menos 2 colunas)
            textos = [
                f"IVA {taxa:.0f}% (Incidência {dados['base']:.2f})",
                f"{dados['valor']:.2f} {documento_final.moeda_simbolo}"
            ]

            for j, texto in enumerate(textos):
                celula = nova_linha.cells[j]
                # Limpar parágrafos existentes e adicionar o novo
                p = celula.paragraphs[0]
                p.clear()
                run = p.add_run(texto)
                run.font.name = "Geologica"
                run.font.size = Pt(9)

            # IMPORTANTE: A próxima taxa deve vir depois desta que acabámos de criar
            # Por isso, a nova linha passa a ser a nossa referência
            linha_referencia_tr = nova_linha_tr

        motivos_agregados = defaultdict(list)

        for idx, art in enumerate(artigos, start=1):
            if art.motivo:
                motivos_agregados[art.motivo.description].append(idx)

        # --- 2️⃣ Inserir título se houver motivos ---
        tabela_xml = tabela_resumo._tbl
        parent = tabela_xml.getparent()

        from docx.oxml import OxmlElement
        if motivos_agregados:
            # 1️⃣ Criar parágrafo do título

            p_titulo_xml = OxmlElement("w:p")
            tabela_xml.addnext(p_titulo_xml)
            p_titulo = Paragraph(p_titulo_xml, tabela_resumo._parent)
            p_titulo.paragraph_format.space_before = Pt(24)

            run_titulo = p_titulo.add_run("Condições de Enquadramento de IVA:")
            run_titulo.bold = True
            run_titulo.font.name = "Geologica"
            run_titulo._element.rPr.rFonts.set(qn('w:eastAsia'), 'Geologica')
            run_titulo.font.size = Pt(10)
            p_titulo.alignment = WD_ALIGN_PARAGRAPH.LEFT

            ultimo_elemento = p_titulo_xml

            # 2️⃣ Inserir linhas agrupadas
            for descricao, indices in motivos_agregados.items():
                p_xml = OxmlElement("w:p")
                ultimo_elemento.addnext(p_xml)
                p = Paragraph(p_xml, tabela_resumo._parent)

                numeros = "".join([f"(*{i})" for i in indices])
                run = p.add_run(f"- {numeros} {descricao}")
                run.font.name = "Geologica"
                run._element.rPr.rFonts.set(qn('w:eastAsia'), 'Geologica')
                run.font.size = Pt(9)
                p.alignment = WD_ALIGN_PARAGRAPH.LEFT

                ultimo_elemento = p_xml

        documentos_vias.append(doc_via)

    doc_final = documentos_vias[0]

    for extra_doc in documentos_vias[1:]:
        # Pegamos todos os elementos do corpo da via extra
        elementos_para_copiar = [
            deepcopy(el) for el in extra_doc.element.body
            if not isinstance(el, docx.oxml.section.CT_SectPr)
        ]

        if elementos_para_copiar:
            # 1. Forçamos uma quebra de página APENAS no primeiro parágrafo da nova via
            # Isso garante que a nova via começa no topo, sem criar páginas extras vazias
            primeiro_elemento = elementos_para_copiar[0]

            # Se o primeiro elemento for um parágrafo (<w:p>), inserimos a quebra lá
            if primeiro_elemento.tag.endswith('p'):
                run = OxmlElement('w:r')
                br = OxmlElement('w:br')
                br.set(qn('w:type'), 'page')
                run.append(br)
                primeiro_elemento.insert(0, run)
            else:
                # Se o primeiro elemento for uma tabela, criamos um parágrafo de quebra antes
                p = OxmlElement('w:p')
                r = OxmlElement('w:r')
                br = OxmlElement('w:br')
                br.set(qn('w:type'), 'page')
                r.append(br)
                p.append(r)
                doc_final.element.body.append(p)

            # 2. Adicionamos todos os elementos ao documento final
            for el in elementos_para_copiar:
                doc_final.element.body.append(el)

    buffer = BytesIO()
    doc_final.save(buffer)
    buffer.seek(0)

    return buffer


import sys
import subprocess
import os
import tempfile
import shutil


def converter_word_para_pdf(word_buffer):
    temp_dir = tempfile.mkdtemp()
    word_path = os.path.join(temp_dir, "input.docx")

    with open(word_path, "wb") as f:
        f.write(word_buffer.getbuffer())

    try:
        if sys.platform == "win32":
            # SE ESTIVER NO TEU PC (WINDOWS)
            # Precisas de ter o LibreOffice instalado.
            # O caminho padrão costuma ser este:
            libreoffice_path = r'C:\Program Files\LibreOffice\program\soffice.exe'
        else:
            # SE ESTIVER ONLINE (LINUX)
            libreoffice_path = 'libreoffice'

        subprocess.run([
            libreoffice_path,
            '--headless',
            '--convert-to', 'pdf',
            '--outdir', temp_dir,
            word_path
        ], check=True)

        pdf_path = os.path.join(temp_dir, "input.pdf")
        with open(pdf_path, "rb") as f:
            return f.read()

    finally:
        shutil.rmtree(temp_dir)

def gerar_pdf_fatura(request, documento_id):
    # Pega o documento
    documento = DocumentoFinalizado.objects.get(id=documento_id)

    via = request.GET.get("via", "original")

    word_buffer = gerar_word_fatura(documento, via)
    pdf_bytes = converter_word_para_pdf(word_buffer)

    # Retorna PDF como resposta HTTP
    response = HttpResponse(pdf_bytes, content_type='application/pdf')
    response['Content-Disposition'] = f'inline; filename="Fatura_{documento.id}.pdf"'
    return response

from django.http import HttpResponse
def finalizar_documento(request):
    if request.method == "POST":
        try:
            data = json.loads(request.body)
            temp_id = data.get("temp_id")
            if not temp_id:
                return JsonResponse({"success": False, "error": "temp_id não fornecido"}, status=400)

            documento = DocumentoTemp.objects.filter(id=temp_id).first()
            if not documento:
                return JsonResponse({"success": False, "error": "Documento não encontrado"}, status=404)

            documento.data_emissao = data.get("data_emissao") or documento.data_emissao
            documento.data_vencimento = data.get("data_vencimento") or documento.data_vencimento
            documento.ordem_compra = data.get("ordem_compra") or documento.ordem_compra
            documento.numero_compromisso = data.get("numero_comp") or documento.numero_compromisso
            documento.descricao = data.get("descricao") or documento.descricao
            documento.rodape = data.get("rodape") or documento.rodape
            documento.local_carga = data.get("local_carga") or documento.local_carga
            documento.local_descarga = data.get("local_descarga") or documento.local_descarga

            ordem_compra = data.get("ordem_compra")
            if ordem_compra:
                documento.ordem_compra = validar_ordem_compra(ordem_compra)

            numero_compromisso = data.get("numero_comp")
            if numero_compromisso:
                documento.numero_compromisso = validar_numero_compromisso(numero_compromisso)

            descricao = data.get("descricao")
            if descricao:
                documento.descricao = validar_texto_longo(descricao, limite=200)

            rodape = data.get("rodape")
            if rodape:
                documento.rodape = validar_texto_longo(rodape, limite=200)
            try:
                data_emissao = data.get("data_emissao")
                if data_emissao:
                    documento.data_emissao = datetime.strptime(data_emissao, "%d/%m/%Y")

                    # Verificar se a data de emissão é maior ou igual à data atual
                    if documento.data_emissao.date() < timezone.now().date():
                        return JsonResponse(
                            {"success": False, "error": "A data de emissão não pode ser anterior à data atual."},
                            status=400)

                tipo = documento.tipo

                local_carga = data.get("local_carga")
                local_descarga = data.get("local_descarga")

                if tipo in ("FR", "FT"):
                    if len(local_carga) > 255:
                        raise ValidationError("O local de carga não pode ter mais que 255 caracteres.")

                    if len(local_descarga) > 255:
                        raise ValidationError("O local de descarga não pode ter mais que 255 caracteres.")

                data_vencimento = data.get("data_vencimento")
                if data_vencimento:
                    documento.data_vencimento = datetime.strptime(data_vencimento, "%d/%m/%Y")

                    # Verificar se a data de vencimento é maior ou igual à data atual
                    if documento.data_vencimento.date() < timezone.now().date():
                        return JsonResponse(
                            {"success": False, "error": "A data de vencimento não pode ser anterior à data atual."},
                            status=400)

                    # Validar se a data de vencimento não é anterior à data de emissão
                    if documento.data_vencimento.date() < documento.data_emissao.date():
                        return JsonResponse({"success": False,
                                             "error": "A data de vencimento não pode ser anterior à data de emissão."},
                                            status=400)

                data_carga_str = data.get("data_carga")
                data_descarga_str = data.get("data_descarga")

                # ===== DATA DE CARGA =====
                if data_carga_str:
                    dt_carga_naive = datetime.strptime(data_carga_str, "%d/%m/%Y %H:%M")
                    data_carga = timezone.make_aware(
                        dt_carga_naive,
                        timezone.get_current_timezone()
                    )

                    if data_carga.date() < timezone.now().date():
                        return JsonResponse(
                            {"success": False, "error": "A data de carga não pode ser anterior à data atual."},
                            status=400
                        )

                    documento.data_carga = data_carga

                # ===== DATA DE DESCARGA =====
                if data_descarga_str:
                    dt_descarga_naive = datetime.strptime(data_descarga_str, "%d/%m/%Y %H:%M")
                    data_descarga = timezone.make_aware(
                        dt_descarga_naive,
                        timezone.get_current_timezone()
                    )

                    if data_descarga < timezone.now():
                        return JsonResponse(
                            {"success": False, "error": "A data de descarga não pode ser anterior à data atual."},
                            status=400
                        )

                    # Só comparar se existir data_carga
                    if data_carga_str and data_descarga < documento.data_carga:
                        return JsonResponse(
                            {"success": False, "error": "A data de descarga não pode ser anterior à data de carga."},
                            status=400
                        )

                    documento.data_descarga = data_descarga
            except ValueError as e:
                return JsonResponse({"success": False, "error": f"Erro no formato da data: {str(e)}"}, status=400)

            if documento.data_carga and documento.data_emissao:
                if documento.data_carga.date() < documento.data_emissao.date():
                    return JsonResponse(
                        {"success": False, "error": "A data de carga não pode ser anterior à data de emissão."},
                        status=400
                    )
            documento.expedicao = data.get("expedicao") or documento.expedicao

            expedicao = data.get("expedicao")
            if expedicao:
                if len(expedicao) > 255:  # Limite de 255 caracteres para local de descarga
                    raise ValidationError("O modo de expedição não pode ter mais que 255 caracteres.")

            cliente_id = data.get("cliente_id")
            if not cliente_id:
                return JsonResponse(
                    {"success": False, "error": "Cliente obrigatório."},
                    status=400
                )
            if cliente_id:
                cliente_obj = Cliente1.objects.filter(id_cliente=cliente_id).first()
                if not cliente_obj:
                    return JsonResponse({"success": False, "error": f"Cliente {cliente_id} não encontrado."}, status=400)
                documento.cliente_id = cliente_obj.id_cliente

            pagamento_obj = ""
            metodo_pagamento = data.get("metodo_pagamento")

            if metodo_pagamento:
                pagamento_obj = Modalidade.objects.filter(nome=metodo_pagamento).first()
                if pagamento_obj:
                    documento.pagamento_id = pagamento_obj.id_modalidade

            moeda_obj = None
            moeda_id = data.get("moeda")
            if moeda_id:
                moeda_obj = Moeda.objects.filter(id=moeda_id).first()
                if not moeda_obj:
                    return JsonResponse({"success": False, "error": f"Moeda {moeda_id} não encontrada."}, status=400)
                documento.moeda_id = moeda_obj.id

            transporte_descricao = data.get("matricula")


            if transporte_descricao:
                transporte_obj = Transporte.objects.filter(
                    descricao=transporte_descricao
                ).first()

                if not transporte_obj:
                    return JsonResponse(
                        {"success": False,
                         "error": f"Transporte com matrícula {transporte_descricao} não encontrado."},
                        status=400
                    )

                documento.transporte_id = transporte_obj.id_transporte

            artigos_data = data.get("artigos", [])
            artigos_validos = []
            if artigos_data:
                for artigo_data in artigos_data:
                    try:
                        artigo_codigo = artigo_data.get("codigo")
                        if not artigo_codigo:
                            logger.error(f"Erro: Código do artigo não fornecido para os dados {artigo_data}")
                            return JsonResponse({"success": False, "error": "Código do artigo não fornecido"},
                                                status=400)

                        artigo_obj = Artigo.objects.filter(id_artigo=artigo_codigo).first()
                        if not artigo_obj:
                            logger.error(f"Erro: Artigo com código {artigo_codigo} não encontrado.")
                            return JsonResponse(
                                {"success": False, "error": f"Artigo com código {artigo_codigo} não encontrado."},
                                status=400)

                        # Continuar a criação do artigo, mais validações podem ser feitas aqui
                        tipo_artigo = artigo_obj.tipo
                        preco = Decimal(artigo_data.get("preco", "0").replace(",", "."))
                        if preco <= 0:
                            return JsonResponse(
                                {"success": False, "error": "O preço deve ser maior que zero."},
                                status=400
                            )
                        desconto = Decimal(artigo_data.get("desconto", "0").replace(",", "."))
                        if desconto < 0:
                            return JsonResponse(
                                {"success": False, "error": "O desconto não pode ser negativo."},
                                status=400
                            )

                        iva = Decimal(artigo_data.get("iva", "0").replace(",", "."))
                        TAXAS_VALIDAS = {0, 6, 13, 23}

                        if iva not in TAXAS_VALIDAS:
                            return JsonResponse(
                                {"success": False, "error": "Taxa de IVA inválida."},
                                status=400
                            )
                        total = Decimal(artigo_data.get("total", "0").replace(",", "."))


                        quantidade_raw = artigo_data.get("quantidade", 0)

                        try:
                            quantidade = int(quantidade_raw)
                        except (ValueError, TypeError):
                            return JsonResponse(
                                {"success": False, "error": "Quantidade inválida."},
                                status=400
                            )

                        if quantidade < 1 or quantidade > 10000:
                            return JsonResponse(
                                {"success": False, "error": "A quantidade deve estar entre 1 e 10000."},
                                status=400
                            )
                        if desconto > preco * quantidade:
                            return JsonResponse(
                                {"success": False, "error": "O desconto não pode ser superior ao valor da linha."},
                                status=400
                            )
                        descricao_artigo = artigo_data.get("descricao", "").strip()

                        if not descricao_artigo:
                            return JsonResponse(
                                {"success": False, "error": "A descrição do artigo é obrigatória."},
                                status=400
                            )

                        if len(descricao) > 255:
                            return JsonResponse(
                                {"success": False, "error": "A descrição não pode exceder 255 caracteres."},
                                status=400
                            )

                        subtotal = (preco * quantidade - desconto).quantize(Decimal("0.01"), rounding=ROUND_HALF_UP)

                        total_recebido = total.quantize(
                            Decimal("0.01"), rounding=ROUND_HALF_UP
                        )

                        if subtotal != total_recebido:
                            return JsonResponse(
                                {
                                    "success": False,
                                    "error": f"Total inválido. Esperado: {subtotal}, Recebido: {total_recebido}"
                                },
                                status=400
                            )

                        motivo_tax = artigo_data.get("motivo")

                        if iva == 0:
                            # Motivo obrigatório
                            if not motivo_tax:
                                return JsonResponse(
                                    {"success": False, "error": "Motivo de IVA obrigatório quando a taxa é 0%."},
                                    status=400
                                )

                            tax_reason = TaxReason.objects.filter(code=motivo_tax).first()
                            if not tax_reason:
                                logger.error(f"Erro: Motivo IVA '{motivo_tax}' não encontrado.")
                                return JsonResponse(
                                    {"success": False, "error": f"Motivo IVA '{motivo_tax}' inválido."},
                                    status=400
                                )

                        else:
                            # Não deve haver motivo quando IVA ≠ 0
                            if motivo_tax:
                                return JsonResponse(
                                    {"success": False, "error": "Motivo de IVA só é permitido quando a taxa é 0%."},
                                    status=400
                                )

                            tax_reason = None

                        artigos_validos.append({
                            "id_art": artigo_obj,
                            "tipo": tipo_artigo,
                            "descricao": descricao_artigo,
                            "quantidade": quantidade,
                            "preco": preco,
                            "desconto": desconto,
                            "taxa": iva,
                            "total": subtotal,
                            "motivo": tax_reason,
                        })

                    except Exception as e:
                        logger.error(f"Erro ao processar artigo {artigo_data}: {str(e)}")
                        return JsonResponse({"success": False, "error": f"Erro ao processar artigo: {str(e)}"},
                                            status=400)

            artigos_data = data.get("artigos", [])
            if not artigos_data:
                return JsonResponse(
                    {"success": False, "error": "O documento deve conter pelo menos um artigo."},
                    status=400
                )
            valor_total = Decimal("0.00")
            for artigo_data in artigos_data:
                quantidade_raw = artigo_data.get("quantidade", 0)

                try:
                    quantidade = int(quantidade_raw)
                except (ValueError, TypeError):
                    return JsonResponse(
                        {"success": False, "error": "Quantidade inválida."},
                        status=400
                    )

                desconto = Decimal(artigo_data.get("desconto", "0").replace(",", "."))
                preco = Decimal(artigo_data.get("preco", "0").replace(",", "."))
                iva = Decimal(artigo_data.get("iva", "0").replace(",", "."))
                subtotal = (preco * quantidade - desconto).quantize(Decimal("0.01"), rounding=ROUND_HALF_UP)
                total_com_iva = (subtotal * (1 + iva / 100)).quantize(Decimal("0.01"), rounding=ROUND_HALF_UP)
                valor_total += total_com_iva

            if documento.tipo in ['FR', 'FS']:
                total_pago = valor_total
            else:
                total_pago = 0
            if documento.tipo == 'FS':
                limite_consumidor_final = Decimal("1000.00")
                limite_sujeito_passivo = Decimal("100.00")

                tem_nif = False
                if documento.cliente and documento.cliente.contribuinte:
                    if str(documento.cliente.contribuinte) != "999999990":
                        tem_nif = True

                if tem_nif and valor_total > limite_sujeito_passivo:
                    return JsonResponse({
                        "success": False,
                        "error": f"Fatura Simplificada para empresas não pode exceder {limite_sujeito_passivo}€. Use Fatura (FT)."
                    }, status=400)

                if valor_total > limite_consumidor_final:
                    return JsonResponse({
                        "success": False,
                        "error": f"Fatura Simplificada não pode exceder {limite_consumidor_final}€. Use Fatura (FT)."
                    }, status=400)

            empr = Empresa.objects.first()
            codigo_at_tributaria = gerar_codigo_at(documento)
            documento.valor_total = valor_total
            documento_final = DocumentoFinalizado.objects.create(
                tipo=documento.tipo,
                serie=documento.serie,
                numero=documento.numero,
                ano=documento.ano,

                cliente_id=documento.cliente.id_cliente if documento.cliente else None,
                cliente_nome=documento.cliente.nome if documento.cliente else "",
                cliente_morada1=documento.cliente.morada1 if documento.cliente else "",
                cliente_morada2=documento.cliente.morada2 if documento.cliente else "",
                cliente_codigo_postal=documento.cliente.codigo_postal if documento.cliente else "",
                cliente_concelho=documento.cliente.concelho if documento.cliente else "",
                cliente_pais=documento.cliente.pais if documento.cliente else "",
                cliente_email=documento.cliente.email if documento.cliente else "",
                cliente_contribuinte=documento.cliente.contribuinte if documento.cliente else "",

                empresa_nome=empr.nome,
                empresa_morada=empr.morada,
                empresa_codigo_postal=empr.codigo_postal,
                empresa_cidade=empr.cidade,
                empresa_pais=empr.pais,
                empresa_email=empr.email,
                empresa_contribuinte=empr.nif,

                modalidade_nome=pagamento_obj,
                moeda_simbolo=moeda_obj.simbolo,
                ordem_compra=ordem_compra,
                numero_compromisso=numero_compromisso,
                descricao=documento.descricao,
                rodape=rodape,
                data_emissao=documento.data_emissao,
                data_vencimento=documento.data_vencimento,
                valor_total=valor_total,
                total_pago=total_pago,
                local_carga=local_carga,
                local_descarga=local_descarga,
                data_carga=documento.data_carga,
                data_descarga=documento.data_descarga,
                expedicao=expedicao,
                transporte_descricao=documento.transporte.descricao,
                codigo_at_tributaria=codigo_at_tributaria,

                estado='Finalizado'
            )

            if documento_final.tipo in ['FR', 'FS']:
                try:
                    ano_atual = timezone.now().year
                    ultimo_re = Recibo.objects.filter(ano=ano_atual).order_by('-numero').first()
                    novo_num_re = (ultimo_re.numero + 1) if ultimo_re else 1

                    novo_recibo = Recibo.objects.create(
                        tipo='RE',
                        serie=str(ano_atual),
                        numero=novo_num_re,
                        ano=ano_atual,
                        cliente_id=documento_final.cliente_id,
                        data_emissao=documento_final.data_emissao,
                        modalidade_nome=documento_final.modalidade_nome.nome if documento_final.modalidade_nome else "Numerário",
                        valor_total=documento_final.valor_total,
                        estado='Normal'
                    )

                    ReciboLinhas.objects.create(
                        id_recibo_final=novo_recibo,
                        id_doc_final=documento_final,
                        documento_tipo=documento_final.tipo,
                        documento_numero=f"{documento_final.serie}-{documento_final.numero}/{documento_final.ano}",
                        data_emissao=documento_final.data_emissao,
                        valor_documento=documento_final.valor_total,
                        valor_recebido=documento_final.valor_total,
                        valor_em_divida=0
                    )

                    logger.info(f"Recibo {novo_recibo.numero} gerado automaticamente para {documento_final.tipo}")

                except Exception as re_err:
                    logger.error(f"Erro ao gerar recibo automático: {str(re_err)}")

            for artigo in artigos_validos:
                FinArtigos.objects.create(
                    id_final=documento_final,
                    id_art=artigo["id_art"],
                    tipo=artigo["tipo"],
                    descricao=artigo["descricao"],
                    quantidade=artigo["quantidade"],
                    preco=artigo["preco"],
                    desconto=artigo["desconto"],
                    taxa=artigo["taxa"],
                    total=artigo["total"],
                    motivo_id=artigo["motivo"].id if artigo["motivo"] else None
                )

            documento.delete()

            return JsonResponse({
                "success": True,
                "id": documento_final.id,
                "message": "Documento finalizado com sucesso!"
            })

        except ValidationError as e:
            return JsonResponse(
                {"success": False, "error": "; ".join(e.messages)},
                status=400
            )
        except Exception as e:
            print(f"ERRO NO BACKEND: {str(e)}")  # Isto vai aparecer no seu terminal preto
            import traceback
            traceback.print_exc()  # Isto mostra a linha exata onde falhou
            return JsonResponse({"success": False, "error": str(e)}, status=400)
    else:
        return JsonResponse(
            {"success": False, "error": "Método não permitido. Use POST."},
            status=405
        )


def ver_fatura(request, id):
    documento = get_object_or_404(DocumentoFinalizado, id=id)
    return render(
        request,
        "faturas/ver_faturas.html",
        {
            'doc_id': id,
            'id_cliente': documento.cliente_id,
            'tipo_documento': documento.tipo,
            'valor_em_divida': documento.valor_total - documento.total_pago,
            'modalidades': Modalidade.objects.all()
        }
    )


from django.http import JsonResponse


def api_documento_completo(request, doc_id):
    doc = get_object_or_404(DocumentoFinalizado, id=doc_id)
    artigos = FinArtigos.objects.filter(id_final=doc)

    lista_artigos = [{
        "tipo": a.tipo,
        "id": a.id_art.id_artigo,
        "descricao": a.descricao,
        "quantidade": a.quantidade,
        "preco": float(a.preco),
        "desconto": float(a.desconto),
        "taxa": float(a.taxa),
        "motivo": a.motivo.code if a.motivo else ""
    } for a in artigos]

    data = {
        "id": doc.id,
        "tipo": doc.tipo,
        "serie": doc.serie,
        "ano": doc.ano,
        "numero": doc.numero,
        "data_emissao": doc.data_emissao.isoformat(),
        "data_vencimento": doc.data_vencimento.isoformat(),
        "descricao": doc.descricao,
        "rodape": doc.rodape,
        "ordem_compra": doc.ordem_compra,
        "numero_compromisso": doc.numero_compromisso,
        "local_carga": doc.local_carga,
        "local_descarga": doc.local_descarga,
        "data_carga": doc.data_carga,
        "data_descarga": doc.data_descarga,
        "expedicao": doc.expedicao,
        "matricula": doc.transporte_descricao,  # Mapeado para o seu campo matricula
        "total_pago": doc.total_pago,
        "total_fatura":doc.valor_total,
        "empresa": {
            "nome": doc.empresa_nome,
            "morada": doc.empresa_morada,
            "codigo_postal": doc.empresa_codigo_postal,
            "cidade": doc.empresa_cidade,
            "pais": doc.empresa_pais,
            "email": doc.empresa_email,
            "nif": doc.empresa_contribuinte
        },

        "cliente": {
            "nome": doc.cliente_nome,
            "morada1": doc.cliente_morada1,
            "morada2": doc.cliente_morada2,
            "codigo_postal": doc.cliente_codigo_postal,
            "concelho": doc.cliente_concelho,
            "pais": doc.cliente_pais,
            "email": doc.cliente_email,
            "contribuinte": doc.cliente_contribuinte,
            "modalidade": {"nome": doc.modalidade_nome} if doc.modalidade_nome else None,
        },

        "moeda": {"id": 1, "simbolo": doc.moeda_simbolo},  # Ajuste o ID conforme sua lógica
        "moedas": list(Moeda.objects.values('id', 'simbolo')),  # Para preencher o select
        "modalidades": list(Modalidade.objects.values('id_modalidade', 'nome')),  # Para o select de pagamento
        "tax_reasons": list(TaxReason.objects.values('code', 'description')),  # Para o select de isenção
        "artigos": lista_artigos
    }
    return JsonResponse(data)

from django.db.models import Sum
from django.shortcuts import render, get_object_or_404

def cliente_detalhes(request, id_cliente):
    cliente = get_object_or_404(Cliente1, id_cliente=id_cliente)

    todos_docs = DocumentoFinalizado.objects.filter(cliente_id=id_cliente)

    faturas_financeiras = todos_docs.exclude(tipo='GT')
    guias_transporte = todos_docs.filter(tipo='GT')
    recibos = Recibo.objects.filter(cliente_id=id_cliente).order_by('-criado_em')
    total_faturado = faturas_financeiras.aggregate(Sum('valor_total'))['valor_total__sum'] or 0

    total_via_recibos = Recibo.objects.filter(
        cliente_id=id_cliente,
        estado='Normal'
    ).aggregate(Sum('valor_total'))['valor_total__sum'] or 0

    total_pago_no_ato = faturas_financeiras.filter(
        tipo__in=['FR']
    ).aggregate(Sum('total_pago'))['total_pago__sum'] or 0

    total_recebido = total_via_recibos + total_pago_no_ato
    saldo_pendente = total_faturado - total_recebido

    context = {
        "cliente": cliente,
        "faturas_financeiras": faturas_financeiras,
        "guias_transporte": guias_transporte,
        'total_acumulado': total_faturado,
        'total_recebido': total_recebido,
        'saldo_pendente': saldo_pendente,
        "vendedores": Vendedor.objects.all(),
        "zonas": Zona.objects.all(),
        "transportes": Transporte.objects.all(),
        "impostos_list": Impostos.objects.all(),
        "pagamentos": Pagamento.objects.all(),
        "modalidades": Modalidade.objects.all(),
        "precos_list": Precos.objects.all(),
        "recibos": recibos,
    }

    return render(request, "subsubconteudo/cliente_detalhes.html", context)

import csv
def exportar_cliente_csv(request, id_cliente):
    # 1. Buscar os dados
    cliente = Cliente1.objects.get(id_cliente=id_cliente)
    facturas = DocumentoFinalizado.objects.filter(cliente_id=id_cliente)

    NOMES_TIPOS = {
        'FT': 'Fatura',
        'FR': 'Fatura Recibo',
        'FS': 'Fatura Simplificada',
        'NC': 'Nota de Crédito',
    }
    # 2. Configurar o Response para download de CSV
    response = HttpResponse(content_type='text/csv; charset=utf-8-sig')  # utf-8-sig para o Excel abrir bem os acentos
    response['Content-Disposition'] = f'attachment; filename="dados_cliente_{cliente.contribuinte}.csv"'

    writer = csv.writer(response, delimiter=';')  # Ponto e vírgula costuma ser melhor para o Excel em PT

    # 3. ESCREVER DADOS DO CLIENTE (Cabeçalho + Dados)
    writer.writerow(['--- DADOS DO CLIENTE ---'])
    writer.writerow(['NIF', 'Nome', 'Email', 'Morada', 'CP', 'Cidade', 'Pais'])
    writer.writerow([
        cliente.contribuinte,
        cliente.nome,
        cliente.email,
        cliente.morada1,
        cliente.codigo_postal,
        cliente.concelho,
        cliente.pais
    ])

    writer.writerow([])  # Linha em branco para separar

    # 4. ESCREVER HISTÓRICO DE FATURAS
    writer.writerow(['--- HISTÓRICO DE FATURAS ---'])
    writer.writerow(['Tipo', 'Numero', 'Data Emissao', 'Valor Total', 'Moeda', 'Pais na Fatura', 'Estado'])

    for f in facturas:
        # 1. Converter a sigla para o nome por extenso
        tipo_extenso = NOMES_TIPOS.get(f.tipo, f.tipo)



        writer.writerow([
            tipo_extenso,
            f"{f.serie}-{f.numero}/{f.ano}",
            f.data_emissao,
            str(f.valor_total).replace('.', ','),  # Trocar ponto por vírgula para o Excel PT
            f.moeda_simbolo,
            f.cliente_pais,
            f.estado
        ])

    return response


def guias_json(request):
    TIPO_EXTENSO = {
        'GT': 'Guia de Transporte',
    }
    documentos = (
        DocumentoFinalizado.objects
        .filter(tipo__in=TIPO_EXTENSO.keys())
        .order_by('-id', '-data_emissao')
    )

    data = []
    for doc in documentos:
        numero_completo = f"{doc.tipo}/{doc.serie}/{doc.ano}/{doc.numero}"

        data.append({
            "id_documento": doc.id,
            "tipo": TIPO_EXTENSO.get(doc.tipo, doc.tipo),
            "numero": numero_completo,
            "cliente_nome": doc.cliente_nome,
            "data_emissao": doc.data_emissao.strftime('%Y-%m-%d') if doc.data_emissao else "",
            "local_descarga": doc.local_descarga or "---",
            "temporario": False
        })

    return JsonResponse(data, safe=False)

@csrf_exempt
def reservar_numero_guia(request):
    if request.method != "POST":
        return JsonResponse({"erro": "Método inválido."}, status=405)

    cliente_id = request.POST.get("cliente")
    documento = request.POST.get("documento", "GT") # Default para Guia de Transporte
    data_emissao = request.POST.get("data_emissao")

    if not all([cliente_id, data_emissao]):
        return JsonResponse({"erro": "Cliente e Data são obrigatórios."}, status=400)

    ano = int(data_emissao[:4])

    try:
        with transaction.atomic():
            contador, created = DocumentoContador.objects.select_for_update().get_or_create(
                tipo=documento,
                ano=ano,
                defaults={"serie": "G", "ultimo_numero": 0}
            )

            proximo_numero = contador.ultimo_numero + 1
            contador.ultimo_numero = proximo_numero
            contador.save()

        return JsonResponse({
            "success": True,
            "cliente_id": cliente_id,
            "tipo": documento,
            "serie": "G",
            "numero": proximo_numero,
            "ano": ano,
            "data_emissao": data_emissao
        })
    except Exception as e:
        return JsonResponse({"erro": str(e)}, status=500)

def guia_documento(request):
    cliente_id = request.GET.get('cliente')
    tipo = request.GET.get('tipo', 'GT')
    serie = request.GET.get('serie')
    numero = request.GET.get('numero')
    ano = request.GET.get('ano')
    data_emissao = request.GET.get('data')

    # Busca o cliente para mostrar o nome/NIF no topo da página
    cliente = get_object_or_404(Cliente1, id_cliente=cliente_id)

    context = {
        'cliente': cliente,
        'tipo': tipo,
        'serie': serie,
        'numero': numero,
        'ano': ano,
        'data_emissao': data_emissao,
        'numero_completo': f"{tipo}/{serie}/{ano}/{numero}"
    }

    return render(request, 'guias/nova_guia.html', context)

def api_guia_preparar(request):
    cliente_id = request.GET.get('cliente')
    moeda_id = request.GET.get('moeda', 1)

    empresa = Empresa.objects.first()
    if not empresa:
        return JsonResponse({"erro": "Empresa não configurada."}, status=400)

    cliente_data = None
    if cliente_id:
        c = get_object_or_404(Cliente1.objects.select_related("transporte", "modalidade", "impostos"),
                              id_cliente=cliente_id)
        cliente_data = {
            "id": c.id_cliente,
            "codigo": c.codigo,
            "nome": c.nome,
            "morada1": c.morada1,
            "morada2": c.morada2,
            "codigo_postal": c.codigo_postal,
            "pais": c.pais,
            "concelho": c.concelho,
            "contribuinte": c.contribuinte,
            "email": c.email,
            "transporte": c.transporte.descricao if c.transporte else "",
            "impostos": c.impostos.nome if c.impostos else "IVA",
            "local_descarga": c.morada1,
        }

    # 4. Dados de Apoio (Selects)
    moedas = list(Moeda.objects.values("id", "codigo", "nome", "simbolo"))
    tax_reasons = list(TaxReason.objects.values("code", "description"))

    moeda_sel = Moeda.objects.filter(id=moeda_id).first() or Moeda.objects.first()

    return JsonResponse({
        # --- DOCUMENTO (Rascunho vindo da URL) ---
        "id": None,  # Não existe ID temp ainda
        "tipo": request.GET.get('tipo', 'GT'),
        "serie": request.GET.get('serie', 'G'),
        "numero": request.GET.get('numero'),
        "ano": request.GET.get('ano'),
        "ordem_compra": "",
        "numero_compromisso": "",
        "descricao": "",
        "rodape": "",
        "data_emissao": request.GET.get('data'),
        "valor_total": 0.00,

        "expedicao": "Viatura Própria",
        "matricula": "",

        "cliente": cliente_data,

        "moeda": {
            "id": moeda_sel.id,
            "codigo": moeda_sel.codigo,
            "nome": moeda_sel.nome,
            "simbolo": moeda_sel.simbolo,
        },
        "moedas": moedas,

        "empresa": {
            "nome": empresa.nome,
            "morada": empresa.morada,
            "codigo_postal": empresa.codigo_postal,
            "cidade": empresa.cidade,
            "pais": empresa.pais,
            "email": empresa.email,
            "nif": empresa.nif,
            "local": empresa.local
        },

        "tax_reasons": tax_reasons,
        "artigos": []
    })

def finalizar_documento_guia(request):
    if request.method == "POST":
        try:
            data = json.loads(request.body)
            ordem_compra = data.get("ordem_compra")
            local_carga = data.get("local_carga")
            local_descarga = data.get("local_descarga")
            tipo = data.get("tipo")

            if ordem_compra:
                ordem_compra = validar_ordem_compra(ordem_compra)

            numero_compromisso = data.get("numero_comp")
            if numero_compromisso:
               numero_compromisso = validar_numero_compromisso(numero_compromisso)

            descricao = data.get("descricao")
            if descricao:
                descricao = validar_texto_longo(descricao, limite=200)

            rodape = data.get("rodape")
            if rodape:
                rodape = validar_texto_longo(rodape, limite=200)
            try:
                data_emissao = data.get("data_emissao")
                if data_emissao:
                    data_emissao = datetime.strptime(data_emissao, "%d/%m/%Y")

                    # Verificar se a data de emissão é maior ou igual à data atual
                    if data_emissao.date() < timezone.now().date():
                        return JsonResponse(
                            {"success": False, "error": "A data de emissão não pode ser anterior à data atual."},
                            status=400)

                if tipo in ("GT"):
                    if len(local_carga) > 255:
                        raise ValidationError("O local de carga não pode ter mais que 255 caracteres.")

                    if len(local_descarga) > 255:
                        raise ValidationError("O local de descarga não pode ter mais que 255 caracteres.")

                data_carga_str = data.get("data_carga")
                data_descarga_str = data.get("data_descarga")

                data_carga = ""
                data_descarga = ""

                if data_carga_str:
                    dt_carga_naive = datetime.strptime(data_carga_str, "%d/%m/%Y %H:%M")
                    data_carga = timezone.make_aware(
                        dt_carga_naive,
                        timezone.get_current_timezone()
                    )

                    if data_carga.date() < timezone.now().date():
                        return JsonResponse(
                            {"success": False, "error": "A data de carga não pode ser anterior à data atual."},
                            status=400
                        )

                if data_descarga_str:
                    dt_descarga_naive = datetime.strptime(data_descarga_str, "%d/%m/%Y %H:%M")
                    data_descarga = timezone.make_aware(
                        dt_descarga_naive,
                        timezone.get_current_timezone()
                    )

                    if data_descarga < timezone.now():
                        return JsonResponse(
                            {"success": False, "error": "A data de descarga não pode ser anterior à data atual."},
                            status=400
                        )

                    # Só comparar se existir data_carga
                    if data_carga_str and data_descarga < data_carga:
                        return JsonResponse(
                            {"success": False, "error": "A data de descarga não pode ser anterior à data de carga."},
                            status=400
                        )

                    data_descarga = data_descarga
            except ValueError as e:
                return JsonResponse({"success": False, "error": f"Erro no formato da data: {str(e)}"}, status=400)

            if data_carga and data_emissao:
                if data_carga.date() < data_emissao.date():
                    return JsonResponse(
                        {"success": False, "error": "A data de carga não pode ser anterior à data de emissão."},
                        status=400
                    )
            expedicao = data.get("expedicao")
            if expedicao:
                if len(expedicao) > 255:  # Limite de 255 caracteres para local de descarga
                    raise ValidationError("O modo de expedição não pode ter mais que 255 caracteres.")

            cliente_id = data.get("cliente_id")
            if not cliente_id:
                return JsonResponse(
                    {"success": False, "error": "Cliente obrigatório."},
                    status=400
                )
            if cliente_id:
                cliente_obj = Cliente1.objects.filter(id_cliente=cliente_id).first()
                if not cliente_obj:
                    return JsonResponse({"success": False, "error": f"Cliente {cliente_id} não encontrado."}, status=400)
                cliente_id = cliente_obj.id_cliente

            moeda_obj = None
            moeda_id = data.get("moeda")
            if moeda_id:
                moeda_obj = Moeda.objects.filter(id=moeda_id).first()
                if not moeda_obj:
                    return JsonResponse({"success": False, "error": f"Moeda {moeda_id} não encontrada."}, status=400)
                moeda_id = moeda_obj.id

            transporte_descricao = data.get("matricula")


            if transporte_descricao:
                transporte_obj = Transporte.objects.filter(
                    descricao=transporte_descricao
                ).first()

                if not transporte_obj:
                    return JsonResponse(
                        {"success": False,
                         "error": f"Transporte com matrícula {transporte_descricao} não encontrado."},
                        status=400
                    )

                transporte_id = transporte_obj.id_transporte

            campos_obrigatorios = [
                'local_carga', 'local_descarga',
                'data_carga', 'data_descarga', 'matricula'
            ]
            for campo in campos_obrigatorios:
                valor = data.get(campo)
                if not valor or str(valor).strip() == "":
                    return JsonResponse({
                        "error": f"O campo {campo.replace('_', ' ')} é obrigatório."
                    }, status=400)

            artigos_data = data.get("artigos", [])
            artigos_validos = []
            if artigos_data:
                for artigo_data in artigos_data:
                    try:
                        # Aqui pode ocorrer um erro se 'codigo' não for fornecido ou o formato de dados estiver errado
                        artigo_codigo = artigo_data.get("codigo")
                        if not artigo_codigo:
                            logger.error(f"Erro: Código do artigo não fornecido para os dados {artigo_data}")
                            return JsonResponse({"success": False, "error": "Código do artigo não fornecido"},
                                                status=400)

                        artigo_obj = Artigo.objects.filter(id_artigo=artigo_codigo).first()
                        if not artigo_obj:
                            logger.error(f"Erro: Artigo com código {artigo_codigo} não encontrado.")
                            return JsonResponse(
                                {"success": False, "error": f"Artigo com código {artigo_codigo} não encontrado."},
                                status=400)

                        # Continuar a criação do artigo, mais validações podem ser feitas aqui
                        tipo_artigo = artigo_obj.tipo
                        preco = Decimal(artigo_data.get("preco", "0").replace(",", "."))
                        if preco < 0:
                            return JsonResponse(
                                {"success": False, "error": "O preço deve ser maior que zero."},
                                status=400
                            )
                        desconto = Decimal(artigo_data.get("desconto", "0").replace(",", "."))
                        if desconto < 0:
                            return JsonResponse(
                                {"success": False, "error": "O desconto não pode ser negativo."},
                                status=400
                            )

                        iva = Decimal(artigo_data.get("iva", "0").replace(",", "."))
                        TAXAS_VALIDAS = {0, 6, 13, 23}

                        if iva not in TAXAS_VALIDAS:
                            return JsonResponse(
                                {"success": False, "error": "Taxa de IVA inválida."},
                                status=400
                            )
                        total = Decimal(artigo_data.get("total", "0").replace(",", "."))


                        quantidade_raw = artigo_data.get("quantidade", 0)

                        try:
                            quantidade = int(quantidade_raw)
                        except (ValueError, TypeError):
                            return JsonResponse(
                                {"success": False, "error": "Quantidade inválida."},
                                status=400
                            )

                        if quantidade < 1 or quantidade > 10000:
                            return JsonResponse(
                                {"success": False, "error": "A quantidade deve estar entre 1 e 10000."},
                                status=400
                            )
                        if desconto > preco * quantidade:
                            return JsonResponse(
                                {"success": False, "error": "O desconto não pode ser superior ao valor da linha."},
                                status=400
                            )
                        descricao_artigo = artigo_data.get("descricao", "").strip()

                        if not descricao_artigo:
                            return JsonResponse(
                                {"success": False, "error": "A descrição do artigo é obrigatória."},
                                status=400
                            )

                        if len(descricao) > 255:
                            return JsonResponse(
                                {"success": False, "error": "A descrição não pode exceder 255 caracteres."},
                                status=400
                            )

                        subtotal = (preco * quantidade - desconto).quantize(Decimal("0.01"), rounding=ROUND_HALF_UP)

                        total_recebido = total.quantize(
                            Decimal("0.01"), rounding=ROUND_HALF_UP
                        )

                        if subtotal != total_recebido:
                            return JsonResponse(
                                {
                                    "success": False,
                                    "error": f"Total inválido. Esperado: {subtotal}, Recebido: {total_recebido}"
                                },
                                status=400
                            )

                        motivo_tax = artigo_data.get("motivo")

                        if iva == 0:
                            # Motivo obrigatório
                            if not motivo_tax:
                                return JsonResponse(
                                    {"success": False, "error": "Motivo de IVA obrigatório quando a taxa é 0%."},
                                    status=400
                                )

                            tax_reason = TaxReason.objects.filter(code=motivo_tax).first()
                            if not tax_reason:
                                logger.error(f"Erro: Motivo IVA '{motivo_tax}' não encontrado.")
                                return JsonResponse(
                                    {"success": False, "error": f"Motivo IVA '{motivo_tax}' inválido."},
                                    status=400
                                )

                        else:
                            if motivo_tax:
                                return JsonResponse(
                                    {"success": False, "error": "Motivo de IVA só é permitido quando a taxa é 0%."},
                                    status=400
                                )

                            tax_reason = None

                        artigos_validos.append({
                            "id_art": artigo_obj,
                            "tipo": tipo_artigo,
                            "descricao": descricao_artigo,
                            "quantidade": quantidade,
                            "preco": preco,
                            "desconto": desconto,
                            "taxa": iva,
                            "total": subtotal,
                            "motivo": tax_reason,
                        })

                    except Exception as e:
                        logger.error(f"Erro ao processar artigo {artigo_data}: {str(e)}")
                        return JsonResponse({"success": False, "error": f"Erro ao processar artigo: {str(e)}"},
                                            status=400)

            artigos_data = data.get("artigos", [])
            if not artigos_data:
                return JsonResponse(
                    {"success": False, "error": "O documento deve conter pelo menos um artigo."},
                    status=400
                )
            valor_total = Decimal("0.00")
            for artigo_data in artigos_data:
                quantidade_raw = artigo_data.get("quantidade", 0)

                try:
                    quantidade = int(quantidade_raw)
                except (ValueError, TypeError):
                    return JsonResponse(
                        {"success": False, "error": "Quantidade inválida."},
                        status=400
                    )

                desconto = Decimal(artigo_data.get("desconto", "0").replace(",", "."))
                preco = Decimal(artigo_data.get("preco", "0").replace(",", "."))
                iva = Decimal(artigo_data.get("iva", "0").replace(",", "."))
                subtotal = (preco * quantidade - desconto).quantize(Decimal("0.01"), rounding=ROUND_HALF_UP)
                total_com_iva = (subtotal * (1 + iva / 100)).quantize(Decimal("0.01"), rounding=ROUND_HALF_UP)
                valor_total += total_com_iva


            id_cliente = data.get("cliente_id")
            cliente = Cliente1.objects.filter(id_cliente=id_cliente).first()

            if not cliente:
                raise ValueError("Cliente não encontrado")

            serie = data.get("serie")
            ano = data.get("ano")
            numero_raw = data.get("numero")

            if not numero_raw:
                return JsonResponse(
                    {"success": False, "error": "Número do documento é obrigatório."},
                    status=400
                )

            try:
                numero = int(numero_raw)
            except (ValueError, TypeError):
                return JsonResponse(
                    {"success": False, "error": "Número do documento inválido."},
                    status=400
                )
            empr = Empresa.objects.first()
            with transaction.atomic():
                documento_final = DocumentoFinalizado.objects.create(
                    tipo=tipo,
                    serie=serie,
                    numero=numero,
                    ano=ano,

                    cliente_id=id_cliente,
                    cliente_nome=cliente.nome if cliente else "",
                    cliente_morada1=cliente.morada1 if cliente else "",
                    cliente_morada2=cliente.morada2 if cliente else "",
                    cliente_codigo_postal=cliente.codigo_postal if cliente else "",
                    cliente_concelho=cliente.concelho if cliente else "",
                    cliente_pais=cliente.pais if cliente else "",
                    cliente_email=cliente.email if cliente else "",
                    cliente_contribuinte=cliente.contribuinte if cliente else "",

                    empresa_nome=empr.nome,
                    empresa_morada=empr.morada,
                    empresa_codigo_postal=empr.codigo_postal,
                    empresa_cidade=empr.cidade,
                    empresa_pais=empr.pais,
                    empresa_email=empr.email,
                    empresa_contribuinte=empr.nif,

                    moeda_simbolo=moeda_obj.simbolo,
                    ordem_compra=ordem_compra,
                    numero_compromisso=numero_compromisso,
                    descricao=descricao,
                    rodape=rodape,
                    data_emissao=data_emissao,
                    data_vencimento=data_emissao + timedelta(days=30),
                    valor_total=valor_total,
                    total_pago=0,
                    local_carga=local_carga,
                    local_descarga=local_descarga,
                    data_carga=data_carga,
                    data_descarga=data_descarga,
                    expedicao=expedicao,
                    transporte_descricao=transporte_descricao,
                    codigo_at_tributaria= "",

                    estado='Finalizado'
                )

                for artigo in artigos_validos:
                    FinArtigos.objects.create(
                        id_final=documento_final,
                        id_art=artigo["id_art"],
                        tipo=artigo["tipo"],
                        descricao=artigo["descricao"],
                        quantidade=artigo["quantidade"],
                        preco=artigo["preco"],
                        desconto=artigo["desconto"],
                        taxa=artigo["taxa"],
                        total=artigo["total"],
                        motivo_id=artigo["motivo"].id if artigo["motivo"] else None
                    )

                codigo_at = gerar_codigo_at(documento_final)
                documento_final.codigo_at_tributaria = codigo_at
                documento_final.save(update_fields=["codigo_at_tributaria"])

            return JsonResponse({
                "success": True,
                "id": documento_final.id,
                "message": "Documento finalizado com sucesso!"
            })

        except ValidationError as e:
            return JsonResponse(
                {"success": False, "error": "; ".join(e.messages)},
                status=400
            )
        except Exception as e:
            print(f"ERRO NO BACKEND: {str(e)}")  # Isto vai aparecer no seu terminal preto
            import traceback
            traceback.print_exc()  # Isto mostra a linha exata onde falhou
            return JsonResponse({"success": False, "error": str(e)}, status=400)
    else:
        return JsonResponse(
            {"success": False, "error": "Método não permitido. Use POST."},
            status=405
        )
from django.db import IntegrityError
from django.db.models import F
@transaction.atomic
def criar_recibo_cliente(request, id):
    if request.method != "POST":
        return JsonResponse({"error": "Método não permitido. Utilize POST."}, status=405)
    metodo_nome = request.POST.get('metodo')

    # 1. Verifica se o campo foi preenchido
    if not metodo_nome:
        return JsonResponse({"error": "O método de pagamento é obrigatório."}, status=400)

    # 2. Verifica se o método existe na tua base de dados
    modalidade_valida = Modalidade.objects.filter(nome=metodo_nome).exists()
    if not modalidade_valida:
        return JsonResponse({"error": "Método de pagamento inválido ou não autorizado."}, status=400)

    try:
        valor_str = request.POST.get('valor', '0').replace(',', '.')
        valor_disponivel = Decimal(valor_str)
        metodo = request.POST.get('metodo')

        if valor_disponivel <= 0:
            return JsonResponse({"error": "O valor do recibo deve ser superior a zero."}, status=400)

        faturas_pendentes = DocumentoFinalizado.objects.filter(
            cliente_id=id,
            estado='Finalizado'
        ).exclude(
            tipo__in=['GT', 'FR']
        ).filter(
            total_pago__lt=F('valor_total')
        ).order_by('data_emissao', 'id')

        if not faturas_pendentes.exists():
            return JsonResponse({"error": "Este cliente não possui faturas pendentes de pagamento."}, status=400)

        # 4. Gerar Numeração Sequencial
        ano_atual = timezone.now().year
        ultimo = Recibo.objects.filter(ano=ano_atual).order_by('-numero').first()
        novo_numero = (ultimo.numero + 1) if ultimo else 1

        # 5. Criar o Cabeçalho do Recibo
        recibo = Recibo.objects.create(
            tipo='RE',
            serie=str(ano_atual),
            numero=novo_numero,
            ano=ano_atual,
            cliente_id=id,
            data_emissao=timezone.now().date(),
            modalidade_nome=metodo,
            valor_total=valor_disponivel,
            estado='Normal'
        )

        # 6. Distribuir o valor (Lógica FIFO)
        temp_valor = valor_disponivel
        for fatura in faturas_pendentes:
            if temp_valor <= 0:
                break

            divida_atual = fatura.valor_total - fatura.total_pago
            valor_a_abater = min(temp_valor, divida_atual)

            # Criar Linha do Recibo
            ReciboLinhas.objects.create(
                id_recibo_final=recibo,
                id_doc_final=fatura,
                documento_tipo=fatura.tipo,
                documento_numero=f"{fatura.serie}-{fatura.numero}/{fatura.ano}",
                data_emissao=fatura.data_emissao,
                valor_documento=fatura.valor_total,
                valor_recebido=valor_a_abater,
                valor_em_divida=divida_atual - valor_a_abater
            )

            # Atualizar Fatura
            fatura.total_pago += valor_a_abater
            fatura.save()

            temp_valor -= valor_a_abater

        return JsonResponse({
            "success": True,
            "message": "Recibo emitido e faturas liquidadas.",
            "recibo_id": recibo.id
        })

    except IntegrityError:
        return JsonResponse({"error": "Erro de concorrência na numeração. Tente novamente."}, status=500)
    except Exception as e:
        return JsonResponse({"error": f"Erro interno: {str(e)}"}, status=500)


@transaction.atomic
def criar_recibo_fatura(request, id_cliente, id_fatura):  # Recebe os dois IDs da URL
    if request.method != "POST":
        return JsonResponse({"error": "Método não permitido."}, status=405)

    metodo_nome = request.POST.get('metodo')
    if not metodo_nome:
        return JsonResponse({"error": "O método de pagamento é obrigatório."}, status=400)

    # Verifica modalidade
    if not Modalidade.objects.filter(nome=metodo_nome).exists():
        return JsonResponse({"error": "Método de pagamento inválido."}, status=400)

    try:
        valor_str = request.POST.get('valor', '0').replace(',', '.')
        valor_pago = Decimal(valor_str)

        if valor_pago <= 0:
            return JsonResponse({"error": "O valor deve ser superior a zero."}, status=400)

        # --- MUDANÇA AQUI: Busca apenas A fatura específica ---
        fatura = get_object_or_404(DocumentoFinalizado, id=id_fatura, cliente_id=id_cliente)

        divida_atual = fatura.valor_total - fatura.total_pago

        if divida_atual <= 0:
            return JsonResponse({"error": "Esta fatura já se encontra liquidada."}, status=400)

        # Validar se o utilizador não está a pagar mais do que deve nesta fatura
        if valor_pago > divida_atual:
            return JsonResponse(
                {"error": f"O valor inserido ({valor_pago}) excede a dívida da fatura ({divida_atual})."}, status=400)

        # 1. Gerar Numeração Sequencial do Recibo
        ano_atual = timezone.now().year
        ultimo = Recibo.objects.filter(ano=ano_atual).order_by('-numero').first()
        novo_numero = (ultimo.numero + 1) if ultimo else 1

        # 2. Criar o Cabeçalho do Recibo
        recibo = Recibo.objects.create(
            tipo='RE',
            serie=str(ano_atual),
            numero=novo_numero,
            ano=ano_atual,
            cliente_id=id_cliente,
            data_emissao=timezone.now().date(),
            modalidade_nome=metodo_nome,
            valor_total=valor_pago,
            estado='Normal'
        )

        # 3. Criar a Linha do Recibo para esta fatura única
        ReciboLinhas.objects.create(
            id_recibo_final=recibo,
            id_doc_final=fatura,
            documento_tipo=fatura.tipo,
            documento_numero=f"{fatura.serie}-{fatura.numero}/{fatura.ano}",
            data_emissao=fatura.data_emissao,
            valor_documento=fatura.valor_total,
            valor_recebido=valor_pago,
            valor_em_divida=divida_atual - valor_pago
        )

        # 4. Atualizar a Fatura
        fatura.total_pago += valor_pago
        fatura.save()

        return JsonResponse({
            "success": True,
            "message": f"Recibo emitido para a fatura {fatura.numero}.",
            "recibo_id": recibo.id
        })

    except IntegrityError:
        return JsonResponse({"error": "Erro de concorrência. Tente novamente."}, status=500)
    except Exception as e:
        return JsonResponse({"error": f"Erro interno: {str(e)}"}, status=500)


def recibos_json(request):
    recibos = Recibo.objects.all()

    ids_clientes = recibos.values_list('cliente_id', flat=True).distinct()

    clientes_map = dict(Cliente1.objects.filter(id_cliente__in=ids_clientes).values_list('id_cliente', 'nome'))

    data = []
    for r in recibos:
        data.append({
            "id_recibo": r.id,
            "documento": str(r),
            "data": r.data_emissao,
            "cliente": clientes_map.get(r.cliente_id, "Cliente não encontrado"),
            "total": float(r.valor_total),
            "estado": r.estado,
        })
    return JsonResponse(data, safe=False)


def anular_recibo(request, id_recibo):
    if request.method != 'POST':
        return JsonResponse({'success': False, 'message': 'Método inválido.'}, status=405)

    motivo = request.POST.get('motivo', '').strip()
    if len(motivo) < 10 or len(motivo) > 255:
        return JsonResponse({'success': False, 'message': 'Insira o motivo com os parametros corretos.'}, status=400)

    try:
        with transaction.atomic():
            recibo = Recibo.objects.select_for_update().filter(id=id_recibo).first()

            if not recibo:
                return JsonResponse({'success': False, 'message': 'Recibo não encontrado.'}, status=404)

            if recibo.estado == 'anulado':
                return JsonResponse({'success': False, 'message': 'Este recibo já foi anulado anteriormente.'},
                                    status=400)

            # 2. Reverter os valores nos documentos finalizados
            linhas = ReciboLinhas.objects.filter(id_recibo_final=recibo)

            for linha in linhas:
                doc = linha.id_doc_final
                doc.total_pago -= linha.valor_recebido

                # O seu método save() no model já vai cuidar de:
                # - Se total_pago for 0 -> 'Pendente'
                # - Se total_pago < valor_total -> 'Parcial'
                doc.save()

            recibo.estado = 'Anulado'
            recibo.motivo_anulacao = motivo
            recibo.data_anulacao = timezone.now()
            recibo.save()

            return JsonResponse({
                'success': True,
                'message': f'Recibo {recibo.numero} anulado. Saldos dos documentos atualizados.'
            })

    except Exception as e:
        # Em caso de erro, o transaction.atomic faz o rollback de tudo
        return JsonResponse({'success': False, 'message': f'Erro ao processar: {str(e)}'}, status=500)


from django.shortcuts import get_object_or_404, redirect
from django.contrib import messages


def emitir_nota_credito(request, fatura_id):
    fatura_original = get_object_or_404(DocumentoFinalizado, id=fatura_id)

    if fatura_original.tipo == 'NC':
        messages.error(request, "Não é possível emitir uma Nota de Crédito de outra Nota de Crédito.")
        return redirect('detalhe_fatura', fatura_id=fatura_id)

    if DocumentoFinalizado.objects.filter(documento_origem=fatura_original, tipo='NC').exists():
        messages.error(request, "Já existe uma Nota de Crédito emitida para esta fatura.")
        return redirect('detalhe_fatura', fatura_id=fatura_id)

    if DocumentoTemp.objects.filter(documento_origem=fatura_original, tipo='NC').exists():
        messages.error(request, "Já existe uma Nota de Crédito em rascunho para esta fatura.")
        return redirect('detalhe_fatura', fatura_id=fatura_id)

    with transaction.atomic():
        ano = timezone.now().year
        contador, created = DocumentoContador.objects.select_for_update().get_or_create(
            tipo='NC',
            ano=ano,
            defaults={"serie": "A", "ultimo_numero": 0}
        )

        numero = contador.ultimo_numero + 1
        contador.ultimo_numero = numero
        contador.save()
        artigos_originais = FinArtigos.objects.filter(id_final=fatura_original)

        try:
            nova_nc = DocumentoTemp.objects.create(
                tipo='NC',
                serie=contador.serie,
                numero=numero,
                ano=ano,
                cliente_id=fatura_original.cliente_id,
                valor_total=-fatura_original.valor_total,
                documento_origem=fatura_original,
                moeda_id=15,
                data_emissao=timezone.now(),
                data_vencimento=timezone.now(),
                estado='Rascunho'
            )

            for art in artigos_originais:
                TempArtigos.objects.create(
                    id_temp=nova_nc,
                    id_art=art.id_art,
                    tipo=art.tipo,
                    descricao=art.descricao,
                    quantidade=art.quantidade,
                    preco=art.preco,
                    desconto=art.desconto,
                    taxa=art.taxa,
                    total=-abs(art.total),
                    motivo=art.motivo
                )

            return JsonResponse({
                "id": nova_nc,
                "tipo": nova_nc.tipo,
                "serie": nova_nc.serie,
                "numero": nova_nc.numero,
                "ano": nova_nc.ano,
            }, status=201)

        except Exception as e:
            return JsonResponse({"erro": str(e)}, status=400)

