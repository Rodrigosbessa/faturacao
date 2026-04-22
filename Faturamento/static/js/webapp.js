itens = document.querySelectorAll(".nav-item");
let tables = {
    clientes: null,
    artigos: null,
    faturas: null,
    guias: null,
    recibos: null
};

itens.forEach(item => {
    item.addEventListener("click", () => {
        // 1. Limpar o estado de todos os itens
        itens.forEach(i => {
            i.classList.remove("redondo");
            // Removemos o brilho/borda de destaque dos outros
            i.style.borderColor = "rgba(100, 255, 218, 0.1)";
            i.style.background = "transparent";

            const link = i.querySelector("a");
            if (link) link.style.color = "rgba(230, 241, 255, 0.7)"; // Branco azulado fosco
        });

        // 2. Aplicar o novo visual de "Ativo" ao item clicado
        item.classList.add("redondo");

        // Em vez de apenas "redondo", vamos dar o brilho Ciano diretamente
        item.style.background = "rgba(100, 255, 218, 0.15)";
        item.style.borderColor = "#64ffda";

        // 3. Mudar a cor do link interno para o Ciano vibrante (ou Branco)
        const linkAtivo = item.querySelector("a");
        if (linkAtivo) {
            linkAtivo.style.setProperty("color", "#64ffda", "important");
            linkAtivo.style.fontWeight = "bold";
        }
    });
});

$(document).ready(function(){

    $('.nav-item').click(function(e){
        e.preventDefault();
        var target = $(this).data('target');

        $('.conteudo-item').hide();

        $('.subconteudo-item').hide();

        $('.second-navbar-collapse .sub-item').removeClass('active-second');

        // Mostra o conteúdo selecionado
        $('#' + target).fadeIn(300);
    });

    // Segunda topbar (Clientes / Artigos / Faturas / Guias)
    $('.second-navbar-collapse .sub-item').click(function(e){
        e.preventDefault();
        var target = $(this).data('target');

        $('.second-navbar-collapse .sub-item').removeClass('active-second');
        $(this).addClass('active-second');

        $('.subconteudo-item').hide();

        $('#' + target).fadeIn(300, function() {
            if (target in tables) {
                initDataTable(target);
            }
        });
    });
});

function initDataTable(type) {
    // Se a tabela já existir, apenas faz reload e ajusta colunas
    if (tables[type] != null) {
        tables[type].ajax.reload(null, false);
        tables[type].columns.adjust();
        return;
    }

    // Configurações específicas por tipo
    let config = {};

    if (type === 'clientes') {
        config = {
            url: window.clientesUrl,
            dataSrc: "data", // Adapte para "" se a sua view de clientes também devolver uma lista direta []
            columns: [
                { data: 'codigo' },
                { data: 'nome' },
                { data: 'contribuinte' },
                { data: 'morada1' },
                { data: 'codigo_postal' },
                { data: 'concelho' },
                {
                    data: null,
                    render: (row) => btnAcoes(row.id_cliente, 'cliente')
                }
            ],
            rowClickUrl: (data) => `/cliente/${data.id_cliente}/detalhes/`
        };
    }
    else if (type === 'artigos') {
        config = {
            url: window.artigosUrl,
            dataSrc: "", // Indica lista direta []
            columns: [
                { data: 'codigo' },
                { data: 'nome' },
                { data: 'descricao' },
                {
                    data: 'preco',
                    render: (d) => parseFloat(d).toLocaleString('pt-PT', {style: 'currency', currency: 'EUR'})
                },
                { data: 'taxa', render: (d) => d + '%' },
                {
                    data: null,
                    render: (row) => btnAcoes(row.codigo, 'artigo')
                }
            ],
            rowClickUrl: (data) => `/artigo/${data.codigo}/editar/`
        };
    }
    else if (type === 'faturas') {
        config = {
            url: window.faturasUrl,
            dataSrc: "",
            order: [],
            columns: [
                { data: 'tipo' },         // Index 0
                {
                    data: 'numero',       // Index 1
                    render: (data, type, row) => row.temporario ? `<i class="text-muted">${data}</i>` : `<strong>${data}</strong>`
                },
                { data: 'cliente_nome' }, // Index 2
                { data: 'data_emissao' }, // Index 3
                { data: 'vencimento' },   // Index 4
                {
                    data: 'valor_total',  // Index 5
                    render: d => parseFloat(d).toLocaleString('pt-PT', {style: 'currency', currency: 'EUR'})
                },
                {
                    data: 'estado_pagamento',       // Index 6
                    render: function(data) {
                        let badgeClass = 'bg-secondary';
                        if (data === 'Pago') badgeClass = 'bg-success';
                        if (data === 'Pendente') badgeClass = 'bg-danger';
                        if (data === 'Parcial') badgeClass = 'bg-warning text-dark';
                        if (data === 'Rascunho') badgeClass = 'bg-info text-dark';

                        return `<span class="badge ${badgeClass}" style="padding: 5px 10px; border-radius: 12px;">${data}</span>`;
                    }
                },
                {
                    data: 'estado',  // Index para o estado (Finalizado/Anulado)
                    render: function(data, type, row) {
                        let estadoClass = '';
                        let estadoText = '';

                        // Se o documento for temporário, exibe "Rascunho"
                        if (row.temporario) {
                            estadoClass = 'text-info';  // Cor azul para Rascunho
                            estadoText = 'Rascunho';
                        } else {
                            if (data === 'Anulado') {
                                estadoClass = 'text-success'; // Cor verde para "Anulado"
                                estadoText = 'Anulado';
                            } else {
                                estadoClass = 'text-muted';  // Cor padrão para "Finalizado"
                                estadoText = 'Finalizado';
                            }
                        }

                        return `<span class="${estadoClass}">${estadoText}</span>`;  // Exibe o estado com a cor apropriada
                    }
                },
                {
                    data: null,
                    orderable: false,
                    className: 'text-center',
                    render: function(data, type, row) {
                        // Para documentos temporários (rascunho)
                        if (row.temporario) {
                            return `
                                <div class="btn-group">
                                    <button class="btn btn-sm btn-primary btn-continue" data-id="${row.id_documento}">
                                        <i class="fa fa-play"></i>
                                    </button>
                                    <button class="btn btn-sm btn-danger btn-delete-fatura-temp" data-id="${row.id_documento}">
                                        <i class="fa fa-trash"></i>
                                    </button>
                                </div>`;
                        }

                        // Para notas de crédito (NC) - se o estado não for 'Anulado'
                        else if (row.tipo.startsWith('Nota de Crédito') && row.estado !== 'Anulado') {
                            return `
                                <div class="btn-group">
                                    <button class="btn btn-sm btn-default btn-print" data-id="${row.id_documento}">
                                        <i class="fa fa-print"></i>
                                    </button>
                                    <button class="btn btn-sm btn-danger btn-delete-nc" data-id="${row.id_documento}">
                                        <i class="fa fa-trash"></i>
                                    </button>
                                </div>`;
                        }

                        // Para faturas finalizadas ou outros tipos de documentos
                        else {
                            return `
                                <div class="btn-group">
                                    <button class="btn btn-sm btn-default btn-print" data-id="${row.id_documento}">
                                        <i class="fa fa-print"></i>
                                    </button>
                                </div>`;
                        }
                    }
                }
            ],
            rowClickUrl: function(data) {
                if (data.temporario) {
                    return `/faturas/editar/?temp_id=${data.id_documento}&numero=${data.numero_doc}&cliente=${data.cliente_id}`;
                }
                return `/faturas/ver/${data.id_documento}/`;
            }
        };
    }
    else if (type === 'guias') {
        config = {
            url: window.guiasUrl,
            dataSrc: "",
            columns: [
                { data: 'tipo' },
                { data: 'numero' },
                { data: 'cliente_nome' },
                { data: 'data_emissao' },
                { data: 'local_descarga' },
                {
                    data: null,
                    render: () => `<span class="badge bg-success">Emitida</span>`
                },
                {
                    data: null,             // 6 - Ações
                    orderable: false,
                    className: 'text-center',
                    render: function(data, type, row) {
                        return `
                            <button class="btn btn-sm btn-default btn-print" data-id="${row.id_documento}" title="Imprimir Guia">
                                <i class="fa fa-print"></i>
                            </button>`;
                    }
                }
            ],
            rowClickUrl: (data) => `/faturas/ver/${data.id_documento}/`
        };
    }
    else if (type === 'recibos') {
        config = {
            url: window.recibosUrl, // URL da View acima
            dataSrc: "",
            columns: [
                { data: 'documento' },           // 0
                { data: 'data' },         // 1
                { data: 'cliente' },   // 2
                { data: 'total' },   // 3
                { data: 'estado' },  // 4
                {
                    data: null,
                    orderable: false,
                    render: function(data, type, row) {
                        return `
                            <button class="btn btn-sm btn-danger btn-anular-recibo" data-id="${row.id_recibo}">
                                <i class="fa fa-trash"></i>
                            </button>`;
                    }
                }
            ],
        };
    }

    tables[type] = $(`#tabela${type.charAt(0).toUpperCase() + type.slice(1)}`).DataTable({
        ajax: {
            url: config.url,
            dataSrc: config.dataSrc
        },
        columns: config.columns,
        order: config.order || [],
        dom: 'rtip',
        language: {
            "sEmptyTable": "Não foi encontrado nenhum registo",
            "sLoadingRecords": "A carregar...",
            "sProcessing": "A processar...",
            "sLengthMenu": "Mostrar _MENU_ registos",
            "sZeroRecords": "Não foram encontrados resultados",
            "sInfo": "Mostrando de _START_ até _END_ de _TOTAL_ registos",
            "sSearch": "Procurar:",
            "oPaginate": { "sNext": "Seguinte", "sPrevious": "Anterior" }
        },
        createdRow: function(row, data, dataIndex) {
            if (config.rowClickUrl) {
                $(row).css('cursor', 'pointer');
                $(row).on('click', function(e) {
                    // Evita o redirecionamento ao clicar nos botões de ação
                    if ($(e.target).closest('button, a, .btn').length) {
                        return;
                    }
                    window.location.href = typeof config.rowClickUrl === 'function' ? config.rowClickUrl(data) : config.rowClickUrl;
                });
            }
        }
    });

    // --- Filtros ---
    // Barra de Pesquisa Geral
    $(`#pesquisa${type.charAt(0).toUpperCase() + type.slice(1)}`).off('keyup').on('keyup', function() {
        tables[type].search(this.value).draw();
    });

    // Filtros Específicos para Faturas
    if (type === 'faturas') {
        $(`#filtroEstado`).off('change').on('change', function() {
            tables['faturas'].column(6).search($(this).val()).draw(); // Estado = Índice 6
        });

        $(`#filtroTipo`).off('change').on('change', function() {
            tables['faturas'].column(0).search($(this).val()).draw(); // Tipo = Índice 0
        });
    }
}

function btnAcoes(id, tipo) {
    return `
        <div class="text-center">
            <button class="btn btn-sm btn-danger btn-delete-${tipo}" data-id="${id}"><i class="fa fa-trash"></i></button>
        </div>
    `;
}


function getCookie(name) {
    let cookieValue = null;
    if (document.cookie && document.cookie !== '') {
        const cookies = document.cookie.split(';');
        for (let i = 0; i < cookies.length; i++) {
            const cookie = cookies[i].trim();
            if (cookie.substring(0, name.length + 1) === (name + '=')) {
                cookieValue = decodeURIComponent(cookie.substring(name.length + 1));
                break;
            }
        }
    }
    return cookieValue;
}

const csrftoken = getCookie('csrftoken');

$(document).ready(function () {

    $('#btnAddCliente').on('click', function (e) {
        e.preventDefault();
        window.location.href = $(this).data('url');
    });

});

$(document).ready(function () {

    // Inicializar apenas o de confirmação, que é o primeiro a ser usado
    $("#modal-apagar-cliente").dialog({
        autoOpen: false,
        modal: true,
        width: 400,
        show: { effect: "fade", duration: 200 },
        hide: { effect: "fade", duration: 200 }
    });

    // Abrir confirmação
    $(document).on('click', '.btn-delete-cliente', function (e) {
        e.preventDefault();
        const idCliente = $(this).data('id');

        if ($('#id_cliente_apagar').length === 0) {
            $('body').append('<input type="hidden" id="id_cliente_apagar">');
        }
        $('#id_cliente_apagar').val(idCliente);
        $("#modal-apagar-cliente").dialog("open");
    });

    // Confirmar eliminação via AJAX
    $(document).on('click', '#btnConfirmarEliminarCliente', function (e) {
        e.preventDefault();
        const idCliente = $('#id_cliente_apagar').val();

        $.ajax({
            url: `/cliente/${idCliente}/apagar/`,
            type: 'POST',
            headers: { 'X-CSRFToken': getCookie('csrftoken') },
            success: function(resp) {
                if (resp.success) {
                    $("#modal-apagar-cliente").dialog("close");
                    if (typeof tables !== 'undefined' && tables.clientes) {
                        tables.clientes.ajax.reload(null, false);
                    } else { location.reload(); }
                } else {
                    tratarErroEliminacao(resp);
                }
            },
            error: function(xhr) {
                tratarErroEliminacao(xhr.responseJSON || { error: "Erro de servidor" });
            }
        });
    });

    function tratarErroEliminacao(data) {
        // 1. Fecha o modal de confirmação
        if ($("#modal-apagar-cliente").hasClass('ui-dialog-content')) {
            $("#modal-apagar-cliente").dialog("close");
        }

        const isDocError = data.has_documents || (data.error && data.error.includes("documentos"));

        if (isDocError) {
            const $modalAviso = $("#modal-nao-eliminar");

            if ($modalAviso.hasClass('ui-dialog-content')) {
                $modalAviso.dialog('destroy');
            }

            $modalAviso.find('.ui-dialog-buttonpane').remove();
            const mensagem = "Não é possível eliminar este cliente porque existem documentos associados.";
            $modalAviso.html('<p>' + mensagem + '</p>');

            $modalAviso.dialog({
                modal: true,
                width: 400,
                resizable: false,
                draggable: false,
                buttons: [
                    {
                        text: "OK",
                        class: "btn btn-danger",
                        click: function() {
                            $(this).dialog("close");
                        }
                    }
                ]
            }).dialog("open");

        } else {
            alert(data.error || "Erro ao processar o pedido.");
        }
    }
});

$(document).ready(function () {
    $("#modal-apagar-artigo").dialog({
        autoOpen: false,
        modal: true,
        width: 420, // Aumentado ligeiramente para o design SaaS
        resizable: false,
        draggable: false, // Melhora a sensação de "Modal" fixo
        show: { effect: "fade", duration: 250 },
        hide: { effect: "fade", duration: 200 }
    });

    $(document).on('click', '.btn-delete-artigo', function (e) {
        e.preventDefault();
        const idArtigo = $(this).data('id');

        if ($('#id_artigo_apagar').length === 0) {
            $('body').append('<input type="hidden" id="id_artigo_apagar">');
        }
        $('#id_artigo_apagar').val(idArtigo);

        $("#modal-apagar-artigo").dialog("open");
    });

    $(document).on('click', '#btnConfirmarEliminar', function (e) {
        e.preventDefault();
        const btn = $(this);
        const idArtigo = $('#id_artigo_apagar').val();

        if (btn.prop('disabled')) return; // Evita duplo clique

        // Feedback de Loading
        const originalText = btn.html();
        btn.prop('disabled', true).html('<i class="fas fa-spinner fa-spin mr-2"></i> A eliminar...');

        $.ajax({
            url: `/artigo/${idArtigo}/apagar/`,
            type: 'POST',
            headers: { 'X-CSRFToken': getCookie('csrftoken') },
            success: function(resp) {
                if (resp.success) {
                    $("#modal-apagar-artigo").dialog("close");

                    // Notificação de sucesso (Opcional, se tiveres Toastr)
                    if (typeof tables !== 'undefined' && tables.artigos) {
                        tables.artigos.ajax.reload(null, false);
                    } else {
                        location.reload();
                    }
                } else {
                    alert("Erro: " + resp.error);
                    btn.prop('disabled', false).html(originalText);
                }
            },
            error: function(xhr) {
                alert("Erro de comunicação.");
                btn.prop('disabled', false).html(originalText);
            }
        });
    });
});

let dashboardCarregado = false;
// Função auxiliar para formatar os valores de forma bonita
function formatarMoeda(valor) {
    return parseFloat(valor).toLocaleString('pt-PT', {
        style: 'currency',
        currency: 'EUR'
    });
}
const DashboardManager = {
    dados: null,
    setDados: function(data) { this.dados = data; },

    abrirTabela: function(tipo) {
        console.log("A abrir tabela:", tipo);
        if (!this.dados) {
            console.error("Dados não encontrados! O AJAX falhou ou não terminou.");
            return;
        }

        const hoje = new Date();
        hoje.setHours(0, 0, 0, 0);

        // 1. Ver os dados brutos que chegam do Django
        console.log("Dados brutos:", this.dados.lista_detalhada);

        const notasCredito = this.dados.lista_detalhada.filter(d => d.tipo === 'NC');
        console.log("Notas de Crédito encontradas:", notasCredito);

        const mapaAbatimentos = {};

        notasCredito.forEach(nc => {
            const ref = nc.documento_origem_id;
            if (ref) {
                if (!mapaAbatimentos[ref]) mapaAbatimentos[ref] = 0;
                mapaAbatimentos[ref] += Math.abs(parseFloat(nc.valor_total));
            }
        });
        console.log("Mapa de Abatimentos (IDs das faturas vs Valor da NC):", mapaAbatimentos);

        const faturasProcessadas = this.dados.lista_detalhada
            .filter(d => ['FT', 'FR', 'FS'].includes(d.tipo))
            .map(f => {
                const abatimentoNC = mapaAbatimentos[f.id] || 0;
                const valorReal = parseFloat(f.valor_total) - abatimentoNC;
                const saldoPendente = valorReal - parseFloat(f.total_pago || 0);

                // Ver cálculo linha a linha
                console.log(`Fatura ${f.numero}: Total=${f.valor_total}, Abate=${abatimentoNC}, Pago=${f.total_pago}, Saldo=${saldoPendente}`);

                return {
                    ...f,
                    saldoPendente: saldoPendente
                };
            });

        console.log("Resultado Final das Faturas Processadas:", faturasProcessadas);

        let listaFiltrada = [];
        const titulo = document.querySelector('#tabela-faturas-container .card-title');

        switch(tipo) {
            case 'faturado':
                listaFiltrada = this.dados.lista_detalhada;
                titulo.innerText = "Todas as Faturas";
                break;

            case 'divida':
                // Agora usa o nosso cálculo dinâmico, ignorando estados de pagamento do DB
                listaFiltrada = faturasProcessadas.filter(f => f.saldoPendente > 0.01);
                titulo.innerText = "Documentos por Pagar";
                break;

            case 'vencidos':
                listaFiltrada = faturasProcessadas.filter(f => {
                    const dataVenc = new Date(f.data_vencimento);
                    return f.saldoPendente > 0.01 && dataVenc < hoje;
                });
                titulo.innerText = "Documentos Vencidos";
                break;
        }

        this.renderizarTabela(listaFiltrada);
    },

    renderizarTabela(lista) {
        const listaSegura = lista || [];
        const container = document.getElementById('tabela-faturas-container');
        const tbody = document.getElementById('corpo-tabela-faturas');

        tbody.innerHTML = '';

        if (listaSegura.length === 0) {
            tbody.innerHTML = '<tr><td colspan="5" class="text-center" style="color: #8892b0; padding: 20px;">Nenhum registo encontrado.</td></tr>';
        } else {
            listaSegura.forEach(doc => {
                const valorParaMostrar = parseFloat(doc.valor_total || 0);
                tbody.innerHTML += `
                    <tr style="border-bottom: 1px solid rgba(100, 255, 218, 0.05);">
                        <td>${doc.tipo}</td>
                        <td>${doc.numero}/${doc.ano}</td>
                        <td>${doc.cliente_nome}</td>
                        <td>${doc.data_emissao}</td>
                        <td class="text-right" style="font-weight: bold; color: #64ffda;">€ ${valorParaMostrar.toFixed(2)}</td>
                    </tr>`;
            });
        }

        // O TRUQUE: Força o display flex com priority para ganhar do CSS global
        container.style.setProperty('display', 'flex', 'important');
        container.classList.add('show');
        // Pequeno delay para a animação de entrada funcionar
        setTimeout(() => {
            container.style.opacity = '1';
            container.classList.add('show');
            container.scrollIntoView({ behavior: 'smooth', block: 'center' });
        }, 50);
    },
};
window.DashboardManager = DashboardManager;
$('.nav-item[data-target="dashboard"]').on('click', function() {
    $('#dashboard').show();

    if (!dashboardCarregado) {
        $.ajax({
            url: "/api/dashboard/dados/",
            method: "GET",
            success: function(data) {
                // CRUCIAL: Passar os dados para o Manager
                DashboardManager.setDados(data);

                $('#dash-total-faturado').text(formatarMoeda(data.total_faturado));
                $('#dash-saldo-pendente').text(formatarMoeda(data.saldo_pendente));
                $('#dash-vencidos').text(data.total_vencidos);

                dashboardCarregado = true;
            },
            error: function() { console.error("Erro no AJAX"); }
        });
    }
});
window.fecharTabela = function() {
    const container = document.getElementById('tabela-faturas-container');
    container.classList.remove('show');
    container.style.opacity = '0';
    setTimeout(() => {
        container.style.setProperty('display', 'none', 'important');
    }, 400);
};
$(function () {
    const ctx = document.getElementById('faturacaoChart').getContext('2d');

    let faturacaoChart, evolucaoChart, comparativoChart, anualChart, topClientesChart;
    function renderizarGrafico(data) {
        const ctx = document.getElementById('faturacaoChart').getContext('2d');

        if (faturacaoChart) faturacaoChart.destroy();

        faturacaoChart = new Chart(ctx, {
            type: 'bar', // Definimos o tipo base
            data: {
                labels: ['JAN', 'FEV', 'MAR', 'ABR', 'MAI', 'JUN', 'JUL', 'AGO', 'SET', 'OUT', 'NOV', 'DEZ'],
                datasets: [
                                        // Dentro do teu datasets do Chart.js:
                    {
                        type: 'line',
                        label: 'TOTAL FATURADO',
                        borderColor: '#64ffda', // Ciano Neon
                        pointBackgroundColor: '#64ffda',
                        borderWidth: 3,
                        fill: true,
                        backgroundColor: 'rgba(100, 255, 218, 0.1)', // Sombra ciano por baixo da linha
                        tension: 0.4,
                        data: data.chart_total,
                    },
                    {
                        type: 'bar',
                        label: 'PAGO',
                        backgroundColor: 'rgba(69, 239, 112, 0.7)', // Verde neon suave
                        hoverBackgroundColor: '#45ef70',
                        data: data.chart_pagos,
                        stack: 'Stack 0',
                        barPercentage: 0.6,
                        categoryPercentage: 0.5
                    },
                    {
                        type: 'bar',
                        label: 'NÃO PAGO',
                        backgroundColor: 'rgba(0, 210, 255, 0.7)', // Azul neon
                        hoverBackgroundColor: '#00d2ff',
                        data: data.chart_nao_pagos,
                        stack: 'Stack 0',
                        barPercentage: 0.6,
                        categoryPercentage: 0.5
                    },
                    {
                        type: 'bar',
                        label: 'VENCIDO',
                        backgroundColor: 'rgba(255, 70, 70, 0.8)',
                        hoverBackgroundColor: '#ff4646',
                        borderColor: '#ff4646',
                        borderWidth: 1,
                        data: data.chart_vencidos,
                        stack: 'Stack 0',
                        barPercentage: 0.6,      // Controla a largura da barra (0.6 a 0.8 é o ideal)
                        categoryPercentage: 0.5,
                    }
                ]
            },
            options: {
                responsive: true,
                maintainAspectRatio: false,
                scales: {
                    x: {
                        stacked: true,      // Mantém as barras uma em cima da outra
                        offset: true,       // CRUCIAL: Garante que o ponto da linha fica no centro do slot do mês
                        grid: {
                            display: false  // Limpa o ruído visual
                        }
                    },
                    y: {
                        stacked: true,
                        beginAtZero: true
                    }
                },
                plugins: {
                    legend: {
                        labels: { color: '#ccd6f6', font: { family: 'Geologica' } }
                    },
                    tooltip: {
                        // Melhora a aparência ao passar o rato
                        backgroundColor: 'rgba(0,0,0,0.8)',
                        padding: 12,
                        titleFont: { size: 14 },
                        bodyFont: { size: 13 },
                        callbacks: {
                            label: function(context) {
                                let label = context.dataset.label || '';
                                if (label) label += ': ';
                                if (context.parsed.y !== null) {
                                    label += new Intl.NumberFormat('pt-PT', { style: 'currency', currency: 'EUR' }).format(context.parsed.y);
                                }
                                return label;
                            }
                        }
                    }
                }
            }
        });
    }

    function renderizarEvolucaoMensal(data) {
        const ctx = document.getElementById('evolucaoFaturacaoChart').getContext('2d');

        if (evolucaoChart) evolucaoChart.destroy();

        // Criamos um gradiente para o preenchimento (opcional, mas fica incrível)
        const gradient = ctx.createLinearGradient(0, 0, 0, 400);
        gradient.addColorStop(0, 'rgba(0, 210, 255, 0.3)');   // Azul no topo
        gradient.addColorStop(1, 'rgba(0, 210, 255, 0.01)'); // Transparente na base

        evolucaoChart = new Chart(ctx, {
            type: 'line',
            data: {
                labels: ['JAN', 'FEV', 'MAR', 'ABR', 'MAI', 'JUN', 'JUL', 'AGO', 'SET', 'OUT', 'NOV', 'DEZ'],
                datasets: [{
                    label: 'Volume de Negócios',
                    data: data.chart_total,
                    fill: true,
                    backgroundColor: gradient,
                    borderColor: '#00d2ff', // Azul Neon vibrante
                    borderWidth: 3,
                    pointBackgroundColor: '#00d2ff',
                    pointBorderColor: '#0a192f', // Fundo escuro para destacar o ponto
                    pointBorderWidth: 2,
                    pointRadius: 4,
                    pointHoverRadius: 6,
                    tension: 0.4 // Curva suave e profissional
                }]
            },
            options: {
                responsive: true,
                maintainAspectRatio: false,
                plugins: {
                    legend: { display: false }, // Escondemos a legenda para um look minimalista
                    tooltip: {
                        backgroundColor: 'rgba(10, 25, 47, 0.9)',
                        titleColor: '#64ffda',
                        bodyColor: '#ccd6f6',
                        borderColor: '#00d2ff',
                        borderWidth: 1,
                        displayColors: false,
                        callbacks: {
                            label: function(context) {
                                return ' Faturação: ' + new Intl.NumberFormat('pt-PT', {
                                    style: 'currency',
                                    currency: 'EUR'
                                }).format(context.parsed.y);
                            }
                        }
                    }
                },
                scales: {
                    x: {
                        grid: { display: false }, // Remove as linhas verticais
                        ticks: { color: '#8892b0' }
                    },
                    y: {
                        beginAtZero: true,
                        grid: {
                            color: 'rgba(204, 214, 246, 0.05)', // Linhas horizontais quase invisíveis
                            drawBorder: false
                        },
                        ticks: {
                            color: '#8892b0',
                            callback: function(value) {
                                return value.toLocaleString('pt-PT') + ' €';
                            }
                        }
                    }
                }
            }
        });
    }

    function renderizarComparativoAnos(data) {
        const canvasElement = document.getElementById('comparativoChart');
        if (!canvasElement) return;

        if (comparativoChart instanceof Chart) {
            comparativoChart.destroy();
        }

        const ctx = canvasElement.getContext('2d');
        const mesAtual = data.mes_atual; // Mês onde a linha passa a ser tracejada
        const anoAtual = new Date().getFullYear();

        // Paleta de Cores Futurista
        const cores = {
            '2024': '#7000ff', // Roxo Profundo
            '2025': '#00d2ff', // Azul Turquesa
            '2026': '#64ffda'  // Ciano/Verde Neon (Destaque)
        };

        const datasets = Object.keys(data.comparativo_anos).map((ano) => {
            const isAnoAtual = (ano == anoAtual);
            const corBase = cores[ano] || '#8892b0';

            return {
                label: 'Ano ' + ano,
                data: data.comparativo_anos[ano],
                borderColor: corBase,
                borderWidth: isAnoAtual ? 4 : 2,
                pointBackgroundColor: corBase,
                pointRadius: isAnoAtual ? 4 : 2,
                fill: false,
                tension: 0.4,
                // A MAGIA: Segmentação para meses futuros
                segment: isAnoAtual ? {
                    borderColor: ctx => (ctx.p0DataIndex >= mesAtual - 1 ? 'rgba(100, 255, 218, 0.3)' : undefined),
                    borderDash: ctx => (ctx.p0DataIndex >= mesAtual - 1 ? [6, 6] : undefined),
                } : undefined
            };
        });

        comparativoChart = new Chart(ctx, {
            type: 'line',
            data: {
                labels: ['JAN', 'FEV', 'MAR', 'ABR', 'MAI', 'JUN', 'JUL', 'AGO', 'SET', 'OUT', 'NOV', 'DEZ'],
                datasets: datasets
            },
            options: {
                responsive: true,
                maintainAspectRatio: false,
                plugins: {
                    legend: {
                        position: 'top',
                        labels: {
                            color: '#ccd6f6',
                            font: { family: 'Geologica', size: 12 },
                            padding: 20,
                            usePointStyle: true
                        }
                    },
                    tooltip: {
                        backgroundColor: 'rgba(10, 25, 47, 0.9)',
                        titleColor: '#64ffda',
                        bodyColor: '#ccd6f6',
                        borderColor: 'rgba(100, 255, 218, 0.5)',
                        borderWidth: 1,
                        padding: 12,
                        callbacks: {
                            label: function(context) {
                                let label = context.dataset.label + ': ';
                                label += new Intl.NumberFormat('pt-PT', { style: 'currency', currency: 'EUR' }).format(context.parsed.y);
                                if (context.dataset.label.includes('2026') && context.dataIndex >= mesAtual - 1) {
                                    label += ' (Projeção)';
                                }
                                return label;
                            }
                        }
                    }
                },
                scales: {
                    x: {
                        grid: { display: false },
                        ticks: { color: '#8892b0' }
                    },
                    y: {
                        beginAtZero: true,
                        grid: { color: 'rgba(204, 214, 246, 0.05)', drawBorder: false },
                        ticks: {
                            color: '#8892b0',
                            callback: value => value.toLocaleString('pt-PT') + ' €'
                        }
                    }
                }
            }
        });
    }

    function renderizarComparativoAnual(data) {
        const canvasElement = document.getElementById('comparativoAnualChart');
        if (!canvasElement) return;

        if (anualChart) anualChart.destroy();

        const ctx = canvasElement.getContext('2d');

        // Preparar dados
        const anoSelecionado = parseInt(data.ano_atual);
        const anosOrdenados = Object.keys(data.totais_anuais).map(Number).sort((a, b) => a - b);
        const labels = anosOrdenados.filter(a => a <= anoSelecionado);
        const valores = labels.map(a => data.totais_anuais[a.toString()]);

        // Criação de um gradiente vertical para as barras
        const gradient = ctx.createLinearGradient(0, 0, 0, 400);
        gradient.addColorStop(0, 'rgba(100, 255, 218, 1)');   // Ciano Neon Sólido no topo
        gradient.addColorStop(1, 'rgba(100, 255, 218, 0.2)'); // Ciano Transparente na base

        anualChart = new Chart(ctx, {
            type: 'bar',
            data: {
                labels: labels,
                datasets: [{
                    label: 'Faturação Total Anual',
                    data: valores,
                    backgroundColor: gradient,
                    borderColor: '#64ffda',
                    borderWidth: 1,
                    borderRadius: 8, // Barras mais arredondadas e modernas
                    hoverBackgroundColor: '#64ffda', // Brilha ao passar o rato
                    barPercentage: 0.6, // Dá espaço entre as barras
                }]
            },
            options: {
                responsive: true,
                maintainAspectRatio: false,
                plugins: {
                    legend: { display: false }, // O título do gráfico já explica o que é
                    tooltip: {
                        backgroundColor: 'rgba(10, 25, 47, 0.9)',
                        titleFont: { size: 16, weight: 'bold' },
                        bodyFont: { size: 14 },
                        displayColors: false,
                        padding: 12,
                        callbacks: {
                            label: function(context) {
                                return ' Total: ' + new Intl.NumberFormat('pt-PT', {
                                    style: 'currency',
                                    currency: 'EUR'
                                }).format(context.parsed.y);
                            }
                        }
                    }
                },
                scales: {
                    x: {
                        grid: { display: false },
                        ticks: {
                            color: '#ccd6f6',
                            font: { weight: 'bold' }
                        }
                    },
                    y: {
                        beginAtZero: true,
                        grid: {
                            color: 'rgba(204, 214, 246, 0.05)',
                            drawBorder: false
                        },
                        ticks: {
                            color: '#8892b0',
                            callback: value => value.toLocaleString('pt-PT') + ' €'
                        }
                    }
                }
            }
        });
    }

    function renderizarTopClientes(data) {
        const canvasElement = document.getElementById('topClientesChart');
        if (!canvasElement) return;

        if (topClientesChart) topClientesChart.destroy();

        const ctx = canvasElement.getContext('2d');

        topClientesChart = new Chart(ctx, {
            type: 'bar',
            data: {
                labels: data.top_clientes_labels,
                datasets: [
                    {
                        label: 'Ano Selecionado',
                        data: data.top_clientes_valores_ano,
                        backgroundColor: 'rgba(100, 255, 218, 0.8)', // Verde Água Neon
                        borderColor: '#64ffda',
                        borderWidth: 1,
                        borderRadius: 5,
                        barPercentage: 0.8,
                        categoryPercentage: 0.8
                    },
                    {
                        label: 'Total Histórico',
                        data: data.top_clientes_valores_historico,
                        backgroundColor: 'rgba(112, 0, 255, 0.4)', // Roxo Neon Translúcido
                        borderColor: '#7000ff',
                        borderWidth: 1,
                        borderRadius: 5,
                        barPercentage: 0.6,
                        categoryPercentage: 0.8
                    }
                ]
            },
            options: {
                indexAxis: 'y', // Mantém o gráfico horizontal
                responsive: true,
                maintainAspectRatio: false,
                plugins: {
                    legend: {
                        position: 'top',
                        labels: {
                            color: '#ccd6f6',
                            font: {family: 'Geologica', size: 11},
                            usePointStyle: true,
                            padding: 15
                        }
                    },
                    tooltip: {
                        backgroundColor: 'rgba(10, 25, 47, 0.95)',
                        titleColor: '#64ffda',
                        bodyColor: '#ccd6f6',
                        borderColor: 'rgba(100, 255, 218, 0.3)',
                        borderWidth: 1,
                        callbacks: {
                            label: function (context) {
                                return ' ' + context.dataset.label + ': ' +
                                    new Intl.NumberFormat('pt-PT', {
                                        style: 'currency',
                                        currency: 'EUR'
                                    }).format(context.parsed.x);
                            }
                        }
                    }
                },
                scales: {
                    x: {
                        beginAtZero: true,
                        grid: {color: 'rgba(204, 214, 246, 0.05)', drawBorder: false},
                        ticks: {color: '#8892b0'}
                    },
                    y: {
                        grid: {display: false},
                        ticks: {
                            color: '#ccd6f6',
                            font: {weight: '600'}
                        }
                    }
                }
            }
        });
    }

    function carregarDadosDashboard(anoSelecionado = null) {
        $.ajax({
            url: "/api/dashboard/dados/",
            method: "GET",
            data: { 'ano': anoSelecionado },
            success: function(data) {
                // 1. Atualizar Títulos (Usa a classe conforme combinamos)
                $('.ano-titulo-grafico').text(data.ano_atual);

                // 2. Preencher Select apenas se estiver vazio (Carregamento inicial)
                const selectAno = $('#select-ano-grafico');
                if (selectAno.children().length === 0) {
                    data.anos_lista.forEach(a => {
                        const selected = (a == data.ano_atual) ? 'selected' : '';
                        selectAno.append(`<option value="${a}" ${selected}>${a}</option>`);
                    });
                } else {
                    // Se o utilizador mudou manualmente, garantimos que o valor está correto
                    selectAno.val(data.ano_atual);
                }

                // 3. Atualizar Cards de Texto
                $('#dash-total-faturado').text(new Intl.NumberFormat('pt-PT', { style: 'currency', currency: 'EUR' }).format(data.total_faturado));
                $('#dash-saldo-pendente').text(new Intl.NumberFormat('pt-PT', { style: 'currency', currency: 'EUR' }).format(data.saldo_pendente));
                $('#dash-vencidos').text(data.total_vencidos);

                // 4. Renderizar tudo
                renderizarGrafico(data);
                renderizarEvolucaoMensal(data);
                renderizarComparativoAnos(data);
                renderizarComparativoAnual(data);
                renderizarTopClientes(data);
                DashboardManager.setDados(data);

                if (data.empresa) {
                    const e = data.empresa;

                    // Atualiza os textos (Spans)
                    $('.empresa-nome').text(e.nome);
                    $('.empresa-morada').text(e.morada);
                    $('.empresa-nif').text(e.nif);
                    $('.empresa-local').text(e.local);
                    $('.empresa-cidade').text(e.cidade);
                    $('.empresa-postal').text(e.codigo_postal);
                    $('.empresa-telefone').text(e.telefone || '---');
                    $('.empresa-email').text(e.email || '---');

                    $('#btn-guardar-empresa').attr('data-id', e.id);
                    $('input[name="nome"]').val(e.nome);
                    $('input[name="morada"]').val(e.morada);
                    $('input[name="nif"]').val(e.nif);
                    $('input[name="local"]').val(e.local);
                    $('input[name="cidade"]').val(e.cidade);
                    $('input[name="codigo_postal"]').val(e.codigo_postal);
                    $('input[name="telefone"]').val(e.telefone);
                    $('input[name="email"]').val(e.email);
                    const select = document.getElementById('country');

                    // Procura a opção que tem o texto igual ao e.pais (ex: "Portugal")
                    for (let i = 0; i < select.options.length; i++) {
                        if (select.options[i].text.trim().toLowerCase() === e.pais.trim().toLowerCase()) {
                            select.selectedIndex = i;
                            break;
                        }
                    }

                    // Atualiza o span visual para garantir que fica igual ao nome no select
                    $('.empresa-pais').text(e.pais);

                    // Dispara o change para garantir que qualquer outra lógica (como NIF) reaja
                    $(select).trigger('change');
                }
            }
        });
    }
    // Função para traduzir a sigla
    function traduzirTipo(sigla) {
        const tipos = {
            'FT': 'Fatura',
            'FR': 'Fatura-Recibo',
            'FS': 'Fatura Simplificada',
            'NC': 'Nota de Crédito'
        };
        return tipos[sigla] || sigla;
    }

    $('#select-ano-grafico').on('change', function() {
        carregarDadosDashboard($(this).val());
    });
    $(document).ready(function() {
        carregarDadosDashboard();
    });

});

$( function() {
    $( "#tabs" ).tabs();
} );

function editarEmpresa() {
    const btn = document.getElementById("btn-guardar-empresa");
    const idEmpresa = btn.getAttribute('data-id');

    if (!idEmpresa) {
        alert("ID da Empresa não encontrado.");
        return;
    }

    btn.disabled = true;
    btn.innerHTML = '<span class="spinner-border spinner-border-sm"></span> A guardar...';

    const dados = {};
    // Captura inputs de ambas as tabs para garantir que nada fica de fora
    document.querySelectorAll('#tabs-1 input, #tabs-1 select, #tabs-2 input').forEach(el => {
        if (el.name) {
            if (el.name === 'pais') {
                dados[el.name] = el.options[el.selectedIndex].text;
            } else {
                dados[el.name] = el.value;
            }
        }
    });

    fetch(`/empresa/${idEmpresa}/editar/`, {
        method: 'POST',
        headers: {
            'X-CSRFToken': getCookie('csrftoken'),
            'Content-Type': 'application/json'
        },
        body: JSON.stringify(dados)
    })
    .then(response => response.json())
    .then(data => {
        if (data.success) {
            alert(data.message || "Dados atualizados!");
            window.location.reload();
        } else {
            alert("Erro: " + (data.error || "Erro desconhecido"));
            btn.disabled = false;
            btn.innerText = "Atualizar Dados da Empresa";
        }
    })
    .catch(error => {
        console.error('Erro:', error);
        alert("Erro de comunicação.");
        btn.disabled = false;
        btn.innerText = "Atualizar Dados da Empresa";
    });
}

document.querySelectorAll('.edit-input, .edit-select').forEach(el => {
    el.addEventListener("input", () => el.style.border = "");
    el.addEventListener("change", () => el.style.border = "");
});

document.addEventListener("DOMContentLoaded", () => {
    const nifInput = document.querySelector('input[name="nif"]');
    const moradaInput = document.querySelector('input[name="morada"]');
    const postalInput = document.getElementById("postal");
    const telemovelInput = document.querySelector('input[name="telefone"]');
    const countrySelect = document.getElementById("country");
    const siglaSpan = document.getElementById("sigla-text");
    const cidadeInput = document.querySelector('input[name="cidade"]');
    const emailInput = document.querySelector('input[name="email"]');
    const localInput = document.querySelector('input[name="local"]');


    const formatarTitulo = (str) => str.toLowerCase().replace(/(^\w|\s\w)/g, m => m.toUpperCase());
    const formatarMaiusculas = (str) => str.trim().toUpperCase();


    nifInput.addEventListener("input", () => {
        const pais = countrySelect.value;

        if (pais === "PT") {
            nifInput.value = nifInput.value.replace(/\D/g, "").slice(0, 9);
        } else {
            nifInput.value = nifInput.value.toUpperCase().replace(/[^A-Z0-9]/g, "").slice(0, 12);
        }
    });

    countrySelect.addEventListener("change", () => {
        nifInput.value = "";
    });

    telemovelInput.addEventListener("input", () => {
        let tel = telemovelInput.value.replace(/\D/g, "");
        telemovelInput.value = tel.startsWith("351") ? tel.slice(0, 12) : tel.slice(0, 9);
    });

   countrySelect.addEventListener("change", () => {
        const nomePais = countrySelect.options[countrySelect.selectedIndex].text;

        // Atualiza o span que o usuário vê na tabela
        if (siglaSpan) {
            siglaSpan.textContent = nomePais;
        }

        // Se você ainda quiser resetar o NIF ao trocar de país (como estava no seu código):
        if (nifInput) {
            nifInput.value = "";
        }
    });

    postalInput.addEventListener("blur", () => {
        const postal = postalInput.value.replace(/\D/g, "");
        if (postal.length < 7) return;

        const loadingEl = document.getElementById("loading-postal");
        if (loadingEl) loadingEl.style.display = "block";

        const appId = "ptapi693b74384109f7.12233290";
        fetch(`https://api.duminio.com/ptcp/v2/${appId}/${postal}`)
            .then(res => res.json())
            .then(data => {
                if (!data || data.length === 0 || data.error) return;
                const d = data[0];

                cidadeInput.value = formatarMaiusculas(d.Concelho);
                countrySelect.value = "PT";
                countrySelect.dispatchEvent(new Event('change'));

                if (typeof $ !== 'undefined') {
                    $(cidadeInput).closest('td').find('.texto-ellipsis').text(cidadeInput.value);
                    $(countrySelect).closest('td').find('.texto-ellipsis').text("PORTUGAL");
                }
            })
            .finally(() => {
                if (loadingEl) loadingEl.style.display = "none";
            });
    });

    emailInput.addEventListener("blur", () => {
        let email = emailInput.value.trim().toLowerCase();

        email = email.replace(/[<>]/g, "");
        emailInput.value = email;

        if (email === "") return;

        const emailRegex = /^[a-z0-9._%+-]+@[a-z0-9.-]+\.[a-z]{2,}$/;

        if (!emailRegex.test(email)) {
            alert("Atenção: O formato do email é inválido. Para garantir o envio da fatura eletrónica, use o formato nome@dominio.pt");
            emailInput.style.borderColor = "orange";
        } else {
            emailInput.style.borderColor = "";
        }
    });
    document.getElementById("btn-guardar-empresa").addEventListener("click", function() {
        nifInput.value = nifInput.value.replace(/\D/g, "");
        const nif = nifInput.value;
        if (nif.length > 0 && nif.length < 9 && nif !== "999999990") {
            alert("Erro AT: O NIF deve ter 9 dígitos."); nifInput.focus(); return;
        }

        let m1 = moradaInput.value.replace(/[<>]/g, "").trim();
        if (m1.length < 5) { alert("Erro AT: Morada insuficiente."); moradaInput.focus(); return; }

        let local = localInput.value.replace(/[<>]/g, "").trim();
        if (local.length < 5) { alert("Erro AT: Local insuficiente."); localInput.focus(); return; }

        const cp = postalInput.value.trim();
        if (cp && m1.includes(cp)) m1 = m1.replace(cp, "").trim();
        moradaInput.value = formatarTitulo(m1);

        cidadeInput.value = cidadeInput.value.replace(/[<>]/g, "").trim()
        if (!countrySelect.value) { alert("Erro AT: Selecione o País."); return; }
        if (cidadeInput.value.length < 2) {
            alert("Erro AT: Concelho obrigatório."); return;
        }

        if (countrySelect.value === "PT") {
            const puro = postalInput.value.replace(/\D/g, "");
            if (puro.length === 7) {
                postalInput.value = puro.substring(0, 4) + "-" + puro.substring(4);
            } else {
                alert("Erro AT: Código Postal inválido (deve ter 7 números)."); return;
            }
        }
        const emailValue = emailInput.value.trim().toLowerCase();
        if (emailValue !== "") {
            const emailRegex = /^[a-z0-9._%+-]+@[a-z0-9.-]+\.[a-z]{2,}$/;
            if (!emailRegex.test(emailValue)) {
                alert("O formato do email é inválido."); emailInput.focus(); return;
            }
            emailInput.value = emailValue.substring(0, 200);
        }
        const obrigatorios = [
            { name: 'nome', label: 'Nome da Empresa' },
            { name: 'nif', label: 'NIF / Contribuinte' },
            { name: 'morada', label: 'Morada' },
            { name: 'codigo_postal', label: 'Código Postal' },
            { name: 'pais', label: 'País' },
            { name: 'cidade', label: 'Cidade' },
            { name: 'local', label: 'Localidade' },
        ];

        for (let campo of obrigatorios) {
            let el = document.querySelector(`[name="${campo.name}"]`);
            // Ajuste aqui: verificamos el.value diretamente para funcionar em Selects e Inputs
            if (!el || !el.value || el.value.toString().trim() === "") {
                alert(`Erro AT: O campo [${campo.label}] é obrigatório.`);
                el.focus();
                el.style.border = "2px solid red";
                return;
            }
        }

        if (countrySelect.value === "PT" && nif.length > 0 && nif.length !== 9) {
            alert("Erro AT: Um NIF português tem de ter exatamente 9 dígitos.");
            nifInput.focus();
            return;
        }

        if (typeof editarEmpresa === "function") {
            editarEmpresa();
        } else {
            console.log("Validação OK. Chamar submissão.");
        }
    });
});

$(document).ready(function() {
    // Inicialização do JQuery UI Tabs (se estiveres a usar)
    if ($("#tabs").tabs) { $("#tabs").tabs(); }

    // 1. Ao clicar no botão de editar
    $('.btn-edit').on('click', function(e) {
        e.stopPropagation();

        const $td = $(this).closest('td');
        const $container = $td.find('.valor-container');
        const $field = $td.find('.edit-select, .edit-input');

        // Animação simples de fade
        $container.fadeOut(100, function() {
            $field.fadeIn(100).focus();
            // Se for input de texto, coloca o cursor no final
            if($field.is('input')) {
                const val = $field.val();
                $field.val('').val(val);
            }
        });
    });

    // 2. Ao perder o foco ou mudar (Blur / Change)
    $(document).on('blur', '.edit-select, .edit-input', function() {
        const $field = $(this);
        const $td = $field.closest('td');
        const $container = $td.find('.valor-container');

        // Pequeno timeout para capturar cliques em selects
        setTimeout(() => {
            const novoTexto = $field.is('select') ?
                              $field.find('option:selected').text() :
                              $field.val();

            if (novoTexto.trim() !== "") {
                $container.find('.texto-ellipsis').text(novoTexto);
            }

            $field.hide();
            $container.fadeIn(100);
        }, 150);
    });

    // 3. Atalho: Enter para confirmar a edição
    $(document).on('keypress', '.edit-input', function(e) {
        if(e.which == 13) {
            $(this).blur();
        }
    });
});


document.addEventListener("DOMContentLoaded", () => {
    const countrySelect = document.getElementById("country");
    const $spanPais = $(countrySelect).closest('td').find('.texto-ellipsis');
    // Captura o nome que veio do Django (ex: "Portugal")
    const nomePaisNoSpan = $spanPais.text().trim();

    function carregarPaises() {
        fetch("https://restcountries.com/v3.1/all?fields=name,cca2")
            .then(res => res.json())
            .then(data => {
                data.sort((a, b) => a.name.common.localeCompare(b.name.common));

                let optionsHtml = '<option value="">Selecione um país...</option>';

                data.forEach(c => {
                    // Verifica se o nome da API é igual ao nome que veio no span
                    const isSelected = c.name.common.toLowerCase() === nomePaisNoSpan.toLowerCase();

                    optionsHtml += `<option value="${c.cca2}" ${isSelected ? 'selected' : ''}>
                        ${c.name.common}
                    </option>`;
                });

                countrySelect.innerHTML = optionsHtml;
            })
            .catch(err => console.error("Erro ao carregar países:", err));
    }

    // Evento de Change: Quando o usuário mudar manualmente o select
    $(countrySelect).on('change', function() {
        const nomeCompleto = $(this).find('option:selected').text();
        if ($(this).val() !== "") {
            $spanPais.text(nomeCompleto);
        }
    });

    // Lógica do Código Postal (Portugal)
    const postalInput = document.getElementById("postal");
    if (postalInput) {
        postalInput.addEventListener("blur", () => {
            const postal = postalInput.value.replace(/\D/g, "");
            if (postal.length < 7) return;

            const appId = "ptapi693b74384109f7.12233290";
            fetch(`https://api.duminio.com/ptcp/v2/${appId}/${postal}`)
                .then(res => res.json())
                .then(data => {
                    if (!data || data.length === 0) return;
                    const d = data[0];

                    // Atualiza Distrito e Concelho
                    $('input[name="cidade"]').val(d.Concelho).closest('td').find('.texto-ellipsis').text(d.Concelho);

                    // Seleciona Portugal no Select e dispara o change para o span mudar para "Portugal"
                    $(countrySelect).val("PT").trigger('change');
                });
        });
    }
    carregarPaises();
});

// --- GESTÃO DE TRANSPORTES (MATRÍCULAS) ---
document.getElementById('btn-adicionar-transporte').addEventListener('click', function() {
    const btn = this;
    const input = document.getElementById('nova-matricula');
    const matricula = input.value.trim().toUpperCase();

    if (matricula.length < 3 || matricula.length > 10) {
        alert("Matrícula inválida.");
        return;
    }

    // Feedback visual no botão
    const originalText = btn.innerHTML;
    btn.disabled = true;
    btn.innerHTML = '<i class="fas fa-spinner fa-spin"></i>';

    fetch('/transporte/adicionar/', {
        method: 'POST',
        headers: {
            'X-CSRFToken': getCookie('csrftoken'),
            'Content-Type': 'application/json'
        },
        body: JSON.stringify({ descricao: matricula })
    })
    .then(response => response.json())
    .then(data => {
        if (data.success) {
            // Adiciona à lista visualmente sem recarregar a página
            const lista = document.getElementById('lista-transportes');
            const novoItem = document.createElement('li');
            novoItem.className = "list-group-item d-flex justify-content-between align-items-center animated fadeIn";
            novoItem.innerHTML = `
                <span><i class="fas fa-truck-moving mr-2 text-primary"></i> <strong>${matricula}</strong></span>
                <span class="badge badge-success">Novo</span>
            `;
            lista.prepend(novoItem); // Adiciona no topo da lista

            input.value = ""; // Limpa campo
        } else {
            alert("Erro: " + data.error);
        }
    })
    .catch(err => alert("Erro na comunicação com o servidor."))
    .finally(() => {
        btn.disabled = false;
        btn.innerHTML = originalText;
    });
});

$(document).ready(function() {
    // Forçar que o modal comece escondido via JS (segurança extra)
    $('#modalSaft').modal({ show: false });

    // --- EXPORTAÇÃO SAF-T (MODAL E PERÍODOS) ---
    $('#btn-gerar-saft-mensal').on('click', function(e) {
        e.preventDefault(); // Impede qualquer comportamento padrão

        const btn = $(this);
        // Evita múltiplos cliques
        if (btn.prop('disabled')) return;

        btn.prop('disabled', true).prepend('<i class="fas fa-spinner fa-spin mr-2 spinner-tmp"></i>');

        $.ajax({
            url: "/api/obter-periodos/", // Confirma se esta rota está correta
            method: "GET",
            success: function(data) {
                let select = $('#select-saft-periodo');
                select.empty().append('<option value="">Selecione o mês de faturação...</option>');

                const meses = ["", "Janeiro", "Fevereiro", "Março", "Abril", "Maio", "Junho",
                               "Julho", "Agosto", "Setembro", "Outubro", "Novembro", "Dezembro"];

                if (data.periodos && data.periodos.length > 0) {
                    data.periodos.forEach(p => {
                        select.append(`<option value="${p.ano}-${p.mes}">${meses[p.mes]} de ${p.ano}</option>`);
                    });
                    // SÓ ABRE O MODAL SE TIVERMOS DADOS
                    $('#modalSaft').modal('show');
                } else {
                    alert("Não existem períodos de faturação disponíveis.");
                }
            },
            error: function() {
                alert("Erro ao obter os períodos de faturação.");
            },
            complete: function() {
                btn.prop('disabled', false).find('.spinner-tmp').remove();
            }
        });
    });

    $('#btn-confirmar-saft').on('click', function() {
        let valor = $('#select-saft-periodo').val();
        if (!valor) return alert("Por favor, selecione um período válido.");

        let [ano, mes] = valor.split('-');
        window.location.href = `/gerar-saft/?mes=${mes}&ano=${ano}`;
        $('#modalSaft').modal('hide');
    });
});