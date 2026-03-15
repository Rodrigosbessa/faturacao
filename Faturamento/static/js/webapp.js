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
        itens.forEach(i => {
            i.classList.remove("redondo");
            const link = i.querySelector("a");
            if (link) link.style.color = ""; // Reseta para a cor original
        });

        // 2. Aplicar classe ao item clicado
        item.classList.add("redondo");

        // 3. Mudar a cor do link interno para branco
        const linkAtivo = item.querySelector("a");
        if (linkAtivo) {
            linkAtivo.style.setProperty("color", "white", "important");
        }

        // --- O teu código de background ---
        const bodyStyle = document.body.style;
        bodyStyle.setProperty('--s', '62px');
        bodyStyle.setProperty('--c1', '#1d1d1d');
        bodyStyle.setProperty('--c2', '#4e4f51');
        bodyStyle.setProperty('--c3', '#3c3c3c');

        bodyStyle.background = `
          repeating-conic-gradient(from 30deg,#0000 0 120deg,var(--c3) 0 50%)
          calc(var(--s)/2) calc(var(--s)*tan(30deg)/2),
          repeating-conic-gradient(from 30deg,var(--c1) 0 60deg,var(--c2) 0 120deg,var(--c3) 0 50%)
        `;
        bodyStyle.backgroundSize = "var(--s) calc(var(--s)*tan(30deg))";
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
        width: 400,
        resizable: false,
        draggable: true,
        show: { effect: "fade", duration: 200 },
        hide: { effect: "fade", duration: 200 },
        open: function() {
            $(this).parent().focus();
        }
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

        const idArtigo = $('#id_artigo_apagar').val();

        if (!idArtigo) {
            alert("Erro: O ID do artigo não foi encontrado no campo oculto.");
            return;
        }

        $.ajax({
            url: `/artigo/${idArtigo}/apagar/`,
            type: 'POST',
            headers: { 'X-CSRFToken': getCookie('csrftoken') },
            success: function(resp) {
                console.log("-> Resposta do Servidor:", resp);
                if (resp.success) {
                    $("#modal-apagar-artigo").dialog("close");

                    // Recarregar a tabela (Verifica se a variável global é 'tables.artigos')
                    if (typeof tables !== 'undefined' && tables.artigos) {
                        tables.artigos.ajax.reload(null, false);
                    } else {
                        // Se a tabela não recarregar, este log avisa-nos
                        console.warn("Tabela não encontrada para reload. A fazer refresh à página...");
                        location.reload();
                    }
                } else {
                    alert("O Django diz: " + resp.error);
                }
            },
            error: function(xhr) {
                console.error("-> Erro Crítico no AJAX:", xhr.status, xhr.responseText);
                alert("Erro de comunicação: O servidor respondeu com erro " + xhr.status);
            }
        });
    });
});

let dashboardCarregado = false;
$('.nav-item[data-target="dashboard"]').on('click', function() {
    $('#dashboard').show();

    if (!dashboardCarregado) {
        $.ajax({
            url: "/api/dashboard/dados/",
            method: "GET",
            success: function(data) {
                // Preenche o Total Faturado
                $('#dash-total-faturado').text(formatarMoeda(data.total_faturado));

                // Preenche o Saldo em Dívida
                $('#dash-saldo-pendente').text(formatarMoeda(data.saldo_pendente));

                $('#dash-vencidos').text(data.total_vencidos);
                dashboardCarregado = true;
            },
            error: function() {
                console.error("Erro ao carregar dados do dashboard.");
            }
        });
    }
});

// Função auxiliar para formatar os valores de forma bonita
function formatarMoeda(valor) {
    return parseFloat(valor).toLocaleString('pt-PT', {
        style: 'currency',
        currency: 'EUR'
    });
}

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
                    {
                        type: 'line',
                        label: 'TOTAL FATURADO',
                        borderColor: '#343a40',
                        borderWidth: 2,
                        fill: false,
                        tension: 0.4,
                        data: data.chart_total,
                        order: 0
                    },
                    {
                        type: 'bar',
                        label: 'PAGO',
                        backgroundColor: '#28a745',
                        hoverBackgroundColor: '#1e7e34', // Escurece ao passar o rato
                        data: data.chart_pagos,
                        stack: 'Stack 0',
                    },
                    {
                        type: 'bar',
                        label: 'NÃO PAGO',
                        backgroundColor: '#17a2b8',
                        hoverBackgroundColor: '#117a8b',
                        data: data.chart_nao_pagos,
                        stack: 'Stack 0',
                    },
                    {
                        type: 'bar',
                        label: 'VENCIDO',
                        backgroundColor: '#dc3545',
                        hoverBackgroundColor: '#bd2130',
                        data: data.chart_vencidos,
                        stack: 'Stack 0',
                    }
                ]
            },
            options: {
                responsive: true,
                maintainAspectRatio: false,
                interaction: {
                    mode: 'index', // Foca no conjunto de dados daquele mês
                    intersect: false // Mais fácil de disparar o hover
                },
                scales: {
                    x: { stacked: true },
                    y: { stacked: true, beginAtZero: true }
                },
                plugins: {
                    legend: { position: 'bottom' },
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

        evolucaoChart = new Chart(ctx, {
            type: 'line',
            data: {
                labels: ['JAN', 'FEV', 'MAR', 'ABR', 'MAI', 'JUN', 'JUL', 'AGO', 'SET', 'OUT', 'NOV', 'DEZ'],
                datasets: [{
                    label: 'Volume de Negócios (€)',
                    data: data.chart_total, // Usa a mesma lista que já tens na view
                    backgroundColor: 'rgba(52, 58, 64, 0.1)', // Cinza claro transparente
                    borderColor: '#343a40', // Cinza escuro
                    borderWidth: 3,
                    fill: true,
                    tension: 0.3 // Suaviza a curva da linha
                }]
            },
            options: {
                responsive: true,
                maintainAspectRatio: false,
                plugins: {
                    legend: { display: false }
                },
                scales: {
                    y: { beginAtZero: true }
                }
            }
        });
    }

    function renderizarComparativoAnos(data) {
        const canvasElement = document.getElementById('comparativoChart');
        if (!canvasElement) return;

        // Destroi o anterior se já existir, para evitar o erro de "Canvas is already in use"
        if (comparativoChart instanceof Chart) {
            comparativoChart.destroy();
        }

        const ctx = canvasElement.getContext('2d');
        const mesAtual = data.mes_atual;
        const anoAtual = new Date().getFullYear(); // 2026

        // Definimos cores fixas para cada ano
        const cores = {
            '2024': '#003dff', // Cinza claro
            '2025': '#ff9100', // Cinza médio
            '2026': '#343a40'  // Preto/Cinza escuro (Ano atual em destaque)
        };

        const datasets = Object.keys(data.comparativo_anos).map((ano) => {
            const isAnoAtual = (ano == anoAtual);

            return {
                label: ano,
                data: data.comparativo_anos[ano],
                borderColor: cores[ano] || '#343a40',
                borderWidth: isAnoAtual ? 4 : 2, // Linha do ano atual mais grossa
                fill: false,
                // Só aplicamos a segmentação (tracejado) se for o ano atual
                segment: isAnoAtual ? {
                    borderColor: ctx => (ctx.p0DataIndex >= mesAtual - 1 ? 'rgba(52, 58, 64, 0.4)' : undefined),
                    borderDash: ctx => (ctx.p0DataIndex >= mesAtual - 1 ? [6, 6] : undefined),
                } : undefined,
                tension: 0.3
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
                    legend: { position: 'top' }
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

        anualChart = new Chart(ctx, {
            type: 'bar',
            data: {
                labels: labels,
                datasets: [{
                    label: 'Volume de Negócios Anual (€)',
                    data: valores,
                    backgroundColor: '#003dff',
                    borderRadius: 5
                }]
            },
            options: {
                responsive: true,
                maintainAspectRatio: false,
                scales: { y: { beginAtZero: true } }
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
                        label: 'Faturação Ano Selecionado (€)',
                        data: data.top_clientes_valores_ano,
                        backgroundColor: '#003dff',
                        borderRadius: 5
                    },
                    {
                        label: 'Total Histórico (€)',
                        data: data.top_clientes_valores_historico,
                        backgroundColor: '#888888', // Uma cor cinza para diferenciar
                        borderRadius: 5
                    }
                ]
            },
            options: {
                responsive: true,
                maintainAspectRatio: false, // Isso permite que ele estique até a altura do container
                indexAxis: 'y',           // Mantendo seu gráfico de barras horizontal
                scales: {
                    x: { beginAtZero: true }
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

    window.DashboardManager = {
        dados: null,
        setDados(data) { this.dados = data; },

        abrirTabela(tipo) {
            if (!this.dados || !this.dados.lista_detalhada) {
                console.error("ERRO: Os dados não foram carregados!");
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
            // 1. Verificação de segurança: Se a lista for undefined ou null, força um array vazio
            const listaSegura = lista || [];

            const container = document.getElementById('tabela-faturas-container');
            const tbody = document.getElementById('corpo-tabela-faturas');

            tbody.innerHTML = '';

            // 2. Se a lista estiver vazia, avisa o utilizador
            if (listaSegura.length === 0) {
                tbody.innerHTML = '<tr><td colspan="5" class="text-center">Nenhum registo encontrado.</td></tr>';
            } else {
                // 3. Agora é seguro iterar
                listaSegura.forEach(doc => {
                    // Aqui usamos o valor_total diretamente do objeto doc
                    const valorParaMostrar = parseFloat(doc.valor_total || 0);

                    tbody.innerHTML += `<tr>
                        <td>${traduzirTipo(doc.tipo)}</td>
                        <td>${doc.numero}/${doc.ano}</td>
                        <td>${doc.cliente_nome}</td>
                        <td>${doc.data_emissao}</td>
                        <td class="text-right">€ ${valorParaMostrar.toFixed(2)}</td>
                    </tr>`;
                });
            }

            container.style.display = 'block';
            setTimeout(() => {
                container.classList.add('show');
                container.scrollIntoView({ behavior: 'smooth' });
            }, 10);
        }
    };
    window.fecharTabela = function() {
        const container = document.getElementById('tabela-faturas-container');
        container.classList.remove('show');
        setTimeout(() => { container.style.display = 'none'; }, 600);
    };

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
    btn.innerHTML = '<span class="spinner"></span> A guardar...';

    const dados = {};
    document.querySelectorAll('#tabs-1 input, #tabs-1 select').forEach(el => {
        if (el.name) {
            if (el.name === 'pais') {
                // Envia "Portugal" em vez de "PT"
                dados[el.name] = el.options[el.selectedIndex].text;
            } else {
                dados[el.name] = el.value;
            }
        }
    });

    // 2. Enviar via fetch usando o objeto 'dados'
    fetch(`/empresa/${idEmpresa}/editar/`, {
        method: 'POST',
        headers: {
            'X-CSRFToken': getCookie('csrftoken'),
            'Content-Type': 'application/json'
        },
        body: JSON.stringify(dados) // Agora a variável 'dados' existe!
    })
    .then(response => response.json())
    .then(data => {
        console.log("Resposta do servidor:", data);

        if (data.success) {
            alert(data.message || "Sucesso!");
            window.location.reload();
        } else {
            alert("Erro do Servidor: " + (data.error || "Erro desconhecido"));
            btn.disabled = false;
            btn.innerText = "Guardar Alterações";
        }
    })
    .catch(error => {
        console.error('Erro:', error);
        alert("Erro de comunicação com o servidor.");
        btn.disabled = false;
        btn.innerText = "Guardar Alterações";
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
    $('.btn-edit').on('click', function() {
        const $td = $(this).closest('td');

        $td.find('.valor-container').hide();
        const $field = $td.find('.edit-select, .edit-input');
        $field.show().focus();
    });

    // Quando o campo (select ou input) perder o foco
    $(document).on('blur change', '.edit-select, .edit-input', function() {
        const $field = $(this);
        const $td = $field.closest('td');

        const novoTexto = $field.is('select') ?
                          $field.find('option:selected').text() :
                          $field.val();

        $td.find('.texto-ellipsis').text(novoTexto);
        $field.hide();
        $td.find('.valor-container').show();
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

document.getElementById('btn-adicionar-transporte').addEventListener('click', function() {
    const matricula = document.getElementById('nova-matricula').value.trim();

    if (matricula.length < 3 || matricula.length > 10) {
        alert("Matrícula inválida.");
        return;
    }

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
            alert("Matrícula adicionada!");
            document.getElementById('nova-matricula').value = ""; // Limpa
            // Opcional: recarregar a lista de transportes aqui
        } else {
            alert("Erro: " + data.error);
        }
    });
});

$('#btn-gerar-saft-mensal').on('click', function() {
    $.ajax({
        url: URL_OBTER_PERIODOS,
        method: "GET",
        success: function(data) {
            let select = $('#select-saft-periodo');
            select.empty().append('<option value="">Selecione o período...</option>');

            // Mapeamento de meses
            const meses = ["", "Janeiro", "Fevereiro", "Março", "Abril", "Maio", "Junho",
                           "Julho", "Agosto", "Setembro", "Outubro", "Novembro", "Dezembro"];

            data.periodos.forEach(p => {
                select.append(`<option value="${p.ano}-${p.mes}">${p.ano} - ${meses[p.mes]}</option>`);
            });

            $('#modalSaft').modal('show');
        }
    });
});

$('#btn-confirmar-saft').on('click', function() {
    let valor = $('#select-saft-periodo').val();
    if (!valor) return alert("Selecione um período.");

    let [ano, mes] = valor.split('-');
    window.location.href = `/gerar-saft/?mes=${mes}&ano=${ano}`;
});