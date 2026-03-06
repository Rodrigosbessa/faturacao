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
        itens.forEach(i => i.classList.remove("redondo"));
        item.classList.add("redondo");
        const bodyStyle = document.body.style;

        // Definindo as variáveis CSS e o background
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
                    data: 'estado',       // Index 6
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
                    data: null,
                    orderable: false,
                    className: 'text-center',
                    render: function(row) {
                        let btn = row.temporario ?
                            `<button class="btn btn-sm btn-primary"><i class="fa fa-play"></i></button>` :
                            `<button class="btn btn-sm btn-default"><i class="fa fa-print"></i></button>`;
                        return `<div class="btn-group">${btn}</div>`;
                    }
                },
                {
                    data: null,
                    orderable: false,
                    className: 'text-center',
                    render: function(data, type, row) {
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
                        } else {
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
                    return `/faturas/novo/?temp_id=${data.id_documento}`;
                }
                return `/faturas/ver/${data.id_documento}/`;
            }
        };
    }
    else if (type === 'guias') {
        config = {
            url: window.guiasUrl, // URL da View acima
            dataSrc: "",
            columns: [
                { data: 'tipo' },           // 0
                { data: 'numero' },         // 1
                { data: 'cliente_nome' },   // 2
                { data: 'data_emissao' },   // 3
                { data: 'local_descarga' },  // 4
                {
                    data: null,             // 5 - Estado Fixo
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





