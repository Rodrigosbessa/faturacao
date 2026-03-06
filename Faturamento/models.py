from django.contrib.auth.models import User
from datetime import timedelta
from django.db import models

class Vendedor(models.Model):
    id_vendedor = models.AutoField(primary_key=True)
    nome = models.CharField(max_length=40)

    class Meta:
        db_table = 'vendedor'  # indica que usa a tabela existente no MySQL

    def __str__(self):
        return self.nome

class Zona(models.Model):
    id_zona = models.AutoField(primary_key=True)
    zona = models.CharField(max_length=40)
    moeda = models.CharField(max_length=10)

    class Meta:
        db_table = 'zona'

    def __str__(self):
        return self.zona


class Transporte(models.Model):
    id_transporte = models.AutoField(primary_key=True)
    descricao = models.CharField(max_length=40)

    class Meta:
        db_table = 'transporte'

    def __str__(self):
        return self.descricao


class Impostos(models.Model):
    id_impostos = models.AutoField(primary_key=True)
    nome = models.CharField(max_length=40)

    class Meta:
        db_table = 'impostos'

    def __str__(self):
        return self.nome


class Pagamento(models.Model):
    id_pagamento = models.AutoField(primary_key=True)
    nome = models.CharField(max_length=40)

    class Meta:
        db_table = 'pagamento'

    def __str__(self):
        return self.nome



class Modalidade(models.Model):
    id_modalidade = models.AutoField(primary_key=True)
    nome = models.CharField(max_length=40)

    class Meta:
        db_table = 'modalidade'

    def __str__(self):
        return self.nome


class Precos(models.Model):
    id_precos = models.AutoField(primary_key=True)
    nome = models.CharField(max_length=40)

    class Meta:
        db_table = 'precos'

    def __str__(self):
        return self.nome


def validar_nif_portugal(nif):
    nif = str(nif)
    # 1. Tem de ter 9 dígitos e ser numérico
    if not nif.isdigit() or len(nif) != 9:
        return False

    # 2. Primeiros dígitos válidos em PT
    # 1, 2, 3 (Pessoas Singulares); 5 (Empresas); 6 (Organismos Públicos);
    # 8 (Empresas não residentes); 9 (Pessoas Coletivas/Consumidor Final)
    if nif[0] not in '1235689':
        return False

    # 3. Algoritmo do dígito de controlo (Check-digit)
    soma = 0
    for i in range(8):
        soma += int(nif[i]) * (9 - i)

    resto = soma % 11
    digito_controlo = 0 if resto < 2 else 11 - resto

    return int(nif[8]) == digito_controlo

from django.core.exceptions import ValidationError
def nif_validator(value):
    if not validar_nif_portugal(value):
        raise ValidationError("O NIF introduzido não é válido.")

class Cliente1(models.Model):
    id_cliente = models.BigAutoField(primary_key=True)
    codigo = models.CharField(max_length=20)
    nome = models.CharField(max_length=255)
    morada1 = models.CharField(max_length=128)
    morada2 = models.CharField(max_length=128, blank=True, null=True)
    codigo_postal = models.CharField(max_length=12)
    telemovel = models.CharField(max_length=20, blank=True, null=True)
    sigla = models.CharField(max_length=3)
    contribuinte = models.CharField(max_length=20, validators=[nif_validator])
    pais = models.CharField(max_length=40)
    distrito = models.CharField(max_length=40)
    concelho = models.CharField(max_length=40)
    email = models.EmailField(max_length=254, blank=True, null=True)

    vendedor = models.ForeignKey(
        Vendedor,
        on_delete=models.PROTECT,
        db_column='vendedor'
    )
    zona = models.ForeignKey(
        Zona,
        on_delete=models.PROTECT,
        db_column='zona'
    )
    transporte = models.ForeignKey(
        Transporte,
        on_delete=models.PROTECT,
        db_column='transporte'
    )
    impostos = models.ForeignKey(
        Impostos,
        on_delete=models.PROTECT,
        db_column='impostos'
    )
    pagamento = models.ForeignKey(
        Pagamento,
        on_delete=models.PROTECT,
        db_column='pagamento'
    )
    modalidade = models.ForeignKey(
        Modalidade,
        on_delete=models.PROTECT,
        db_column='modalidade'
    )
    precos = models.ForeignKey(
        Precos,
        on_delete=models.PROTECT,
        db_column='precos'
    )

    data_criacao = models.DateTimeField(auto_now_add=True)

    class Meta:
        db_table = 'cliente'

    def __str__(self):
        return f"{self.codigo} - {self.nome}"

class Artigo(models.Model):
    id_artigo = models.BigAutoField(primary_key=True)
    nome = models.CharField(max_length=40)
    descricao = models.CharField(max_length=255, blank=True, null=True)
    preco = models.DecimalField(max_digits=10, decimal_places=2)
    taxa = models.DecimalField(max_digits=10, decimal_places=2)
    tipo = models.CharField(max_length=20, default='Produto')


    class Meta:
        db_table = 'artigo'

    def __str__(self):
        # Mostra nome e preco quando o objeto é impresso
        return f"{self.nome} ({self.preco})"

from django.db import models

# Tabela Documento Contador
class DocumentoContador(models.Model):
    TIPOS_SUPORTADOS = [
        ('FT', 'Fatura'),
        ('FR', 'Fatura-Recibo'),
        ('FS', 'Fatura Simplificada'),
        ('NC', 'Nota de Crédito'),
        ('ND', 'Nota de Débito'),
        ('GT', 'Guia de Transporte'),
    ]

    tipo = models.CharField(max_length=2, choices=TIPOS_SUPORTADOS)
    serie = models.CharField(max_length=10, default='A')
    ano = models.IntegerField()
    ultimo_numero = models.IntegerField(default=0)

    class Meta:
        db_table = "documento_contador"
        unique_together = ('tipo', 'serie', 'ano')

    def __str__(self):
        return f"Contador {self.tipo} - {self.serie}/{self.ano}: {self.ultimo_numero}"

class Moeda(models.Model):
    codigo = models.CharField(max_length=10)
    nome = models.CharField(max_length=50)
    simbolo = models.CharField(max_length=50, blank=True, null=True)

    def __str__(self):
        return f"{self.simbolo or self.codigo}"

    class Meta:
        db_table = 'moedas'


from django.db import models
from django.utils import timezone


class DocumentoTemp(models.Model):

    TIPOS = [
        ('FT', 'Fatura'),
        ('FR', 'Fatura Recibo'),
        ('FS', 'Fatura Simplificada'),
        ('NC', 'Nota de Crédito'),
    ]

    ESTADOS = [
        ('Rascunho', 'Rascunho'),
        ('Em Revisão', 'Em Revisão'),
    ]

    id = models.BigAutoField(primary_key=True)

    tipo = models.CharField(max_length=2, choices=TIPOS)
    serie = models.CharField(max_length=10)
    numero = models.IntegerField()
    ano = models.IntegerField()

    cliente = models.ForeignKey(
        'Cliente1',
        on_delete=models.SET_NULL,
        db_column='cliente_id',
        null=True,
        blank=True
    )

    # Datas
    data_emissao = models.DateField(default=timezone.now)
    data_vencimento = models.DateField()

    # Totais
    valor_total = models.DecimalField(max_digits=10, decimal_places=2, default=0)

    # Estado
    estado = models.CharField(max_length=20, choices=ESTADOS, default='Rascunho')

    # Snapshot comercial
    transporte = models.ForeignKey(
        'Transporte',
        on_delete=models.PROTECT,
        db_column='transporte_id'
    )

    pagamento = models.ForeignKey(
        'Pagamento',
        on_delete=models.PROTECT,
        db_column='pagamento_id',
        null=True,
        blank=True
    )

    impostos = models.ForeignKey(
        'Impostos',
        on_delete=models.PROTECT,
        db_column='impostos_id'
    )

    moeda = models.ForeignKey(
        'Moeda',
        on_delete=models.PROTECT,
        db_column='moeda_id',
        default=15
    )

    ordem_compra = models.CharField(max_length=128, null=True, blank=True)
    numero_compromisso = models.CharField(max_length=128, null=True, blank=True)
    descricao = models.TextField(null=True, blank=True)
    rodape = models.TextField(null=True, blank=True)

    # Auditoria
    criado_em = models.DateTimeField(auto_now_add=True)
    atualizado_em = models.DateTimeField(auto_now=True)

    # Transporte adicional
    local_carga = models.CharField(max_length=255, null=True, blank=True)
    local_descarga = models.CharField(max_length=255, null=True, blank=True)
    data_carga = models.DateTimeField(null=True, blank=True)
    data_descarga = models.DateTimeField(null=True, blank=True)
    expedicao = models.CharField(max_length=255, null=True, blank=True)

    documento_origem = models.ForeignKey(
        'DocumentoFinalizado',
        on_delete=models.SET_NULL,
        null=True,
        blank=True,
        related_name='documentos_temp_associados',
        db_column='documento_origem_id'
    )
    class Meta:
        db_table = 'documento_temp'
        unique_together = ('tipo', 'serie', 'numero', 'ano')
        ordering = ['-criado_em']

    def __str__(self):
        return f"{self.tipo} {self.serie}-{self.numero}/{self.ano}"

class Empresa(models.Model):
    nome = models.CharField(max_length=150)
    morada = models.CharField(max_length=255)
    codigo_postal = models.CharField(max_length=20)
    cidade = models.CharField(max_length=100)
    pais = models.CharField(max_length=100, default="Portugal")
    email = models.EmailField(blank=True, null=True)
    nif = models.CharField(max_length=20)
    telefone = models.CharField(max_length=30, blank=True, null=True)
    local = models.CharField(max_length=150, blank=True, null=True)
    data_criacao = models.DateTimeField(auto_now_add=True)

    def __str__(self):
        return self.nome

    class Meta:
        db_table = 'empresa'

class TaxReason(models.Model):
    code = models.CharField(max_length=5, unique=True)
    description = models.CharField(max_length=255)

    def save(self, *args, **kwargs):
        if self.pk:
            raise ValueError("Registros de TaxReason não podem ser alterados")
        super().save(*args, **kwargs)

    def __str__(self):
        return f"{self.code} - {self.description}"

    class Meta:
        verbose_name = "Motivo de IVA"
        verbose_name_plural = "Motivos de IVA"
        db_table = 'tax_reasons'


from django.db import models


class TempArtigos(models.Model):
    id = models.BigAutoField(primary_key=True)

    id_temp = models.ForeignKey(
        DocumentoTemp,
        on_delete=models.CASCADE,
        db_column='id_temp',
    )

    id_art = models.ForeignKey(
        'Artigo',
        on_delete=models.PROTECT,
        db_column='id_art'
    )

    tipo = models.CharField(max_length=20)
    descricao = models.CharField(max_length=255)

    quantidade = models.IntegerField()
    preco = models.DecimalField(max_digits=10, decimal_places=2)
    desconto = models.DecimalField(max_digits=10, decimal_places=2)
    taxa = models.DecimalField(max_digits=10, decimal_places=2)
    total = models.DecimalField(max_digits=10, decimal_places=2)

    motivo = models.ForeignKey(
        'TaxReason',  # Nome da tabela de motivos
        on_delete=models.SET_NULL,  # Se o motivo for excluído, manter o artigo
        null=True,
        blank=True,
        db_column='motivo_id'  # Nome da coluna no banco de dados
    )

    class Meta:
        db_table = 'temp_artigos'


class DocumentoFinalizado(models.Model):
    TIPOS = [
        ('FT', 'Fatura'),
        ('FR', 'Fatura Recibo'),
        ('FS', 'Fatura Simplificada'),
        ('NC', 'Nota de Crédito'),
        ('GT', 'Guia de Transporte'),
    ]

    ESTADOS = [
        ('Finalizado', 'Finalizado'),
    ]

    id = models.BigAutoField(primary_key=True)

    tipo = models.CharField(max_length=2, choices=TIPOS)
    serie = models.CharField(max_length=10)
    numero = models.IntegerField()
    ano = models.IntegerField()

    cliente_id = models.BigIntegerField()
    cliente_nome = models.CharField(max_length=255)
    cliente_morada1 = models.CharField(max_length=128)
    cliente_morada2 = models.CharField(max_length=128, blank=True, null=True)
    cliente_codigo_postal = models.CharField(max_length=12)
    cliente_concelho = models.CharField(max_length=40)
    cliente_pais = models.CharField(max_length=40)
    cliente_email = models.EmailField(max_length=254, blank=True, null=True)
    cliente_contribuinte = models.CharField(max_length=20)

    empresa_nome = models.CharField(max_length=150)
    empresa_morada = models.CharField(max_length=255)
    empresa_codigo_postal = models.CharField(max_length=20)
    empresa_cidade = models.CharField(max_length=100)
    empresa_pais = models.CharField(max_length=100)
    empresa_email = models.EmailField(blank=True, null=True)
    empresa_contribuinte = models.CharField(max_length=20)

    data_emissao = models.DateField()
    data_vencimento = models.DateField()
    modalidade_nome = models.CharField(max_length=40, null=True, blank=True)
    moeda_simbolo = models.CharField(max_length=50)
    ordem_compra = models.CharField(max_length=128, null=True, blank=True)
    numero_compromisso = models.CharField(max_length=128, null=True, blank=True)
    descricao = models.TextField(null=True, blank=True)
    rodape = models.TextField(null=True, blank=True)
    valor_total = models.DecimalField(max_digits=10, decimal_places=2, default=0)
    total_pago = models.DecimalField(max_digits=10, decimal_places=2, default=0)
    local_carga = models.CharField(max_length=255, null=True, blank=True)
    local_descarga = models.CharField(max_length=255, null=True, blank=True)
    data_carga = models.DateTimeField(null=True, blank=True)
    data_descarga = models.DateTimeField(null=True, blank=True)
    expedicao = models.CharField(max_length=255, null=True, blank=True)
    transporte_descricao = models.CharField(max_length=40, null=True, blank=True)
    estado = models.CharField(max_length=20, choices=ESTADOS, default='Finalizado')

    PAGAMENTO_CHOICES = [
        ('Pendente', 'Pendente'),
        ('Parcial', 'Parcial'),
        ('Pago', 'Pago'),
    ]

    # Novo campo físico na base de dados
    estado_pagamento = models.CharField(
        max_length=10,
        choices=PAGAMENTO_CHOICES,
        default='Pendente'
    )

    criado_em = models.DateTimeField(auto_now_add=True)
    codigo_at_tributaria = models.CharField(
        max_length=20,
        null=True,
        blank=True,
        verbose_name="Código AT",
        help_text="Código fornecido pela Autoridade Tributária"
    )
    documento_origem = models.ForeignKey(
        'self',
        on_delete=models.SET_NULL,
        null=True,
        blank=True,
        related_name='documentos_retificativos',
        db_column='documento_origem_id'
    )

    class Meta:
        db_table = 'documento_finalizado'
        unique_together = ('tipo', 'serie', 'numero', 'ano')
        ordering = ['-criado_em']

    def __str__(self):
        return f"{self.tipo} {self.serie}-{self.numero}/{self.ano}"

    @property
    def valor_em_divida(self):
        return self.valor_total - self.total_pago

    def save(self, *args, **kwargs):
        if self.total_pago <= 0:
            self.estado_pagamento = 'Pendente'
        elif self.total_pago < self.valor_total:
            self.estado_pagamento = 'Parcial'
        else:
            self.estado_pagamento = 'Pago'

        super(DocumentoFinalizado, self).save(*args, **kwargs)

class FinArtigos(models.Model):
    id = models.BigAutoField(primary_key=True)

    id_final = models.ForeignKey(
        DocumentoFinalizado,
        on_delete=models.CASCADE,
        db_column='id_temp',
    )

    id_art = models.ForeignKey(
        'Artigo',
        on_delete=models.PROTECT,
        db_column='id_art'
    )

    tipo = models.CharField(max_length=20)
    descricao = models.CharField(max_length=255)

    quantidade = models.IntegerField()
    preco = models.DecimalField(max_digits=10, decimal_places=2)
    desconto = models.DecimalField(max_digits=10, decimal_places=2)
    taxa = models.DecimalField(max_digits=10, decimal_places=2)
    total = models.DecimalField(max_digits=10, decimal_places=2)

    motivo = models.ForeignKey(
        'TaxReason',
        on_delete=models.SET_NULL,
        null=True,
        blank=True,
        db_column='motivo_id'
    )

    class Meta:
        db_table = 'final_artigos'


class Recibo(models.Model):
    TIPOS = [
        ('RE', 'Recibo'),
    ]

    id = models.BigAutoField(primary_key=True)

    tipo = models.CharField(max_length=2, choices=TIPOS, default='RE')
    serie = models.CharField(max_length=10)
    numero = models.IntegerField()
    ano = models.IntegerField()

    cliente_id = models.BigIntegerField()

    data_emissao = models.DateField()
    modalidade_nome = models.CharField(max_length=40, null=True, blank=True, help_text="Ex: Transferência, Numerário")

    valor_total = models.DecimalField(max_digits=10, decimal_places=2, default=0)

    ESTADOS_RECIBO = [
        ('Normal', 'Normal'),
        ('Anulado', 'Anulado'),
    ]
    estado = models.CharField(max_length=10, choices=ESTADOS_RECIBO, default='Normal')
    data_anulacao = models.DateTimeField(null=True, blank=True)
    motivo_anulacao = models.TextField(null=True, blank=True)
    criado_em = models.DateTimeField(auto_now_add=True)


    class Meta:
        db_table = 'recibo'
        unique_together = ('tipo', 'serie', 'numero', 'ano')
        ordering = ['-criado_em']

    def __str__(self):
        return f"{self.tipo} {self.serie}-{self.numero}/{self.ano}"


class ReciboLinhas(models.Model):
    id = models.BigAutoField(primary_key=True)

    id_recibo_final = models.ForeignKey(
        'Recibo',
        on_delete=models.CASCADE,
        related_name='linhas',
        db_column='id_recibo'
    )

    id_doc_final = models.ForeignKey(
        'DocumentoFinalizado',
        on_delete=models.PROTECT,
        db_column='id_doc_final'
    )

    documento_tipo = models.CharField(max_length=20)
    documento_numero = models.CharField(max_length=50)
    data_emissao = models.DateField()

    valor_documento = models.DecimalField(max_digits=10, decimal_places=2)
    valor_recebido = models.DecimalField(max_digits=10, decimal_places=2)
    valor_em_divida = models.DecimalField(max_digits=10, decimal_places=2)

    class Meta:
        db_table = 'recibo_linhas'