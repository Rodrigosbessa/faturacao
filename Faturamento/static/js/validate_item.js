function parseNumero(valor) {
    if (!valor) return 0;
    return parseFloat(valor.toString().replace(',', '.')) || 0;
}
function formatNumero(valor) {
    return valor.toFixed(2).replace('.', ',');
}
function getCookie(name) {
    let cookieValue = null;
    if (document.cookie && document.cookie !== '') {
        const cookies = document.cookie.split(';');
        for (let i = 0; i < cookies.length; i++) {
            const cookie = cookies[i].trim();
            // Verifica se começa com o nome + "="
            if (cookie.substring(0, name.length + 1) === (name + '=')) {
                cookieValue = decodeURIComponent(cookie.substring(name.length + 1));
                break;
            }
        }
    }
    return cookieValue;
}
function atualizarResumoComDelay(delay = 200) {

    const $resumo = $("#resumo_fatura");

    clearTimeout(window._resumoTimeout);

    window._resumoTimeout = setTimeout(() => {

        atualizarResumoMotivos();

        const simboloAtual = $("#currency_text").text();
        atualizarResumoFatura(simboloAtual);

        $resumo.addClass("updated");
        setTimeout(() => $resumo.removeClass("updated"), 400);

    }, delay);
}

let linhaEmEdicao = null;

function validarNumericoInput(input, tipo) {
    let campo = campos.find(c => c.id.includes(tipo));
    if (!campo) return;

    // Permitir campo vazio enquanto o utilizador escreve
    if (input.value.trim() === "") return;

    let valor = parseFloat(input.value.replace(',', '.'));

    if (isNaN(valor)) {
        valor = campo.min;
    }

    if (valor < campo.min) valor = campo.min;
    if (valor > campo.max) valor = campo.max;

    valor = Math.round(valor / campo.step) * campo.step;

    input.value = valor
        .toFixed(campo.step.toString().split('.')[1]?.length || 0)
        .replace('.', ',');
}
// Seleção dos campos
const campos = [
    {id: '#quantity', min: 1, max: 1000, step: 1},
    {id: '#price', min: 0, max: 1000000, step: 0.01},
    {id: '#discount', min: 0, max: 1000000, step: 0.01},
    {id: '#tax', min: 0, max: 100, step: 0.01}
];

$(function () {
    $("#price, #quantity, #discount, #tax").on("blur", function () {
        if ($(this).val().trim() === "") {
            $(this).val("0,00");
            calcularTotalInput();
            return;
        }

        let v = parseNumero($(this).val());

        if ($(this).attr("id") === "quantity" && v < 1) v = 1;
        if ($(this).attr("id") === "discount" && v < 0) v = 0;
        if ($(this).attr("id") === "price" && v < 0) v = 0;

        $(this).val(formatNumero(v));

        calcularTotalInput();
    });

});

function calcularTotalInput() {
    let preco = parseNumero($("#price").val());
    let desconto = parseNumero($("#discount").val());
    let quantidade = parseInt($("#quantity").val(), 10) || 1;
    let iva = parseNumero($("#tax").val()); // só informativo

    if (quantidade <= 0) quantidade = 1;
    if (desconto < 0) desconto = 0;
    if (desconto > preco) desconto = preco;

    let subtotal = preco * quantidade;

    if (desconto > subtotal) desconto = subtotal;

    let total = subtotal - desconto;

    $("#total").val(total.toFixed(2).replace('.', ','));
}

function calcularTotalLinha($linha) {
    if (!$linha || !$linha.length) return;

    let preco = parseFloat($linha.find("input.price").val().replace(',', '.')) || 0;
    let desconto = parseFloat($linha.find("input.discount").val().replace(',', '.')) || 0;
    let quantidade = parseInt($linha.find("input.quantity").val(), 10) || 0;

    if (quantidade < 0) quantidade = 0;
    if (desconto < 0) desconto = 0;

    let subtotal = preco * quantidade;

    // 🔹 agora o desconto é sobre o total
    if (desconto > subtotal) desconto = subtotal;

    let total = subtotal - desconto;

    $linha.find("input.total").val(total.toFixed(2));
}

$(document).on("input",
    "tr.product_edit input.price, tr.product_edit input.quantity, tr.product_edit input.discount, tr.product_edit input.tax",
    function () {

        let $linha = $(this).closest("tr");
        calcularTotalLinha($linha); // apenas calcula
});

$(document).on("blur", "tr.product_edit input.price, tr.product_edit input.quantity, tr.product_edit input.discount, tr.product_edit input.tax", function(e) {
    if (e.type === "blur" || e.key === "Enter") {
        let tipo;
        if ($(this).hasClass("quantity")) tipo = 'quantity';
        if ($(this).hasClass("price")) tipo = 'price';
        if ($(this).hasClass("discount")) tipo = 'discount';
        if ($(this).hasClass("tax")) tipo = 'tax';

        validarNumericoInput(this, tipo);

        let $linha = $(this).closest("tr");
        calcularTotalLinha($linha);
    }
});

$("#price, #quantity, #discount, #tax").on("blur", function(e) {
    let tipo = this.id; // 'price', 'quantity', 'discount', 'tax'
    validarNumericoInput(this, tipo);

    if (this.id === 'price' || this.id === 'quantity' || this.id === 'discount') {
        calcularTotalInput(); // recalcula total do próximo artigo
    }
});


function atualizarSupIVA() {

    let indice = 1;

    $("tr").each(function () {

        const $linha = $(this);
        const motivo = $linha.data("motivoIVA0");

        const $campoIVA = $linha.find("td:has(.tax)");

        // limpar antigos
        $campoIVA.find("sup.iva-sup").remove();

        if (motivo) {
            $campoIVA.append(
                `<sup class="iva-sup">*${indice}</sup>`
            );

            // guardar o índice na linha
            $linha.data("indiceIVA0", indice);

            indice++;
        } else {
            $linha.removeData("indiceIVA0");
        }
    });
}

window.atualizarResumoMotivos = function() {
    atualizarSupIVA();

    const mapa = {};

    $("tr").each(function () {

        const motivo = $(this).data("motivoIVA0");
        const indice = $(this).data("indiceIVA0");

        if (motivo && indice) {

            if (!mapa[motivo]) {
                mapa[motivo] = [];
            }

            mapa[motivo].push(indice);
        }
    });

    const motivos = Object.keys(mapa);

    // 🔥 Se não houver → remover bloco
    if (motivos.length === 0) {
        $("#taxreason_block").remove();
        return;
    }

    // 🔥 Criar bloco se faltar
    if ($("#taxreason_block").length === 0) {

        const bloco = `
<div class="taxreason" id="taxreason_block">
    <div class="text" id="taxreason_text"></div>

    <div class="input">
        <textarea name="taxreason" id="taxreason" cols="90" rows="4">
Isento de IVA de acordo com artigo 9º do Código do IVA (CIVA)
        </textarea>
    </div>
</div>
`;

        $("tbody#iva_lines").closest("table").after(bloco);
    }

    // 🔥 Construir texto
    let html = `
<div class="taxtitle">Condições de Enquadramento de IVA:</div>
`;

    let taxReasons = [];

    if (typeof response !== 'undefined' && response.tax_reasons) {
        taxReasons = response.tax_reasons;
    } else if (typeof doc !== 'undefined' && doc.tax_reasons) {
        taxReasons = doc.tax_reasons;
    }

    motivos.forEach((motivo) => {

        // Buscar a descrição do motivo com base no código
        const motivoData = taxReasons.find(t => t.code === motivo); // Encontra o motivo na lista da API

        // Se encontrar o motivo e tiver descrição, construa o texto
        if (motivoData) {
            const descricao = motivoData.description || ""; // Descrição do motivo

            const indices = mapa[motivo]
                .sort((a, b) => a - b)
                .map(i => `(<sup>*${i}</sup>)`) // Índices com o número da linha
                .join("");

            html += `${indices} ${motivo} - ${descricao}<br>`;  // Inclui a descrição do motivo
        }
    });

    $("#taxreason_text").html(html);
}
$(function() {

    // Modal de erro genérico
    $("#box-erro").dialog({
        autoOpen: false,
        modal: true,
        width: 400,
        buttons: {
            OK: function() {
                $(this).dialog("close");
            }
        }
    });

    function getTipoFromInput() {
        let $imgs = $("tr.input td.buttons.type img");

        let ativo = $imgs.filter(function () {
            return $(this).attr("src").includes("_on");
        });

        if (!ativo.length) return null;

        if (ativo.attr("src").includes("service")) return "S";
        if (ativo.attr("src").includes("tax")) return "T";
        if (ativo.attr("src").includes("product")) return "P";

        return null;
    }
    function getTipoIcon(tipo) {
        let src = "";
        if (tipo === "Produto" || tipo === "P") {
            src = "/static/images/icon_type_product_on.png";
        } else if (tipo === "Serviço" || tipo === "S") {
            src = "/static/images/icon_type_service_on.png";
        } else if (tipo === "Taxa" || tipo === "T") {
            src = "/static/images/icon_type_tax_on.png";
        }
        if (!src) return ""; // caso inválido

        return `<img src="${src}" width="18" height="18" alt="">`;
    }
    function calcularTotal(qtd, precoFinal, desconto) {
        if (qtd <= 0) qtd = 1;
        if (desconto < 0) desconto = 0;
        if (desconto > precoFinal) desconto = precoFinal;

        let precoUnitarioFinal = precoFinal - desconto;
        return precoUnitarioFinal * qtd;
    }

    // Botão adicionar artigo
    function gerarItemId() {
        return Math.floor(Math.random() * 100000000);
    }

    window.criarLinhaNaTabela = function(tipo, code, item, quantity, price, discount, tax, motivoIVA0 = null) {

        let total = calcularTotal(quantity, price, discount);
        let itemId = gerarItemId();

        let novaLinha = `
    <tr class="product product_edit item${itemId}" id="item${itemId}">
        <td nowrap class="buttons type view_type" style="text-align: center;">
            ${getTipoIcon(tipo)}
        </td>
    
        <td style="text-align: center; vertical-align: middle;">
            <span class="edit_input">
                <input type="text" class="code" value="${code}" style="width:45px; display: none" disabled="">
            </span>
            <span class="view_input">${code}</span>
        </td>
    
        <td class="item-column">
            <span class="edit_input">
                <input type="text" class="item" value="${item}" style="width:175px ; display: none">
            </span>
            <span class="view_input">${item}</span>
        </td>
    
        <td class="centered">
            <span class="edit_input">
                <input type="text" class="quantity" value="${quantity}" name="quantity[]" style="display: none">
            </span>
            <span class="view_input">${quantity}</span>
        </td>
    
        <td class="money">
            <span class="edit_input">
                <input type="text" class="price" value="${price}" name="price[]" style="display: none">
            </span>
            <span class="view_input">${formatNumero(price)}</span>
        </td>
    
        <td class="money">
            <span class="edit_input">
                <input type="text" class="discount" value="${discount}" name="discount[]" style="display: none">
            </span>
            <span class="view_input">${formatNumero(discount)}</span>
        </td>
    
        <td class="centered">
            <input class="motivo_tax" type="hidden" value="${motivoIVA0 ? motivoIVA0 : ''}">
            <span class="edit_input">
                <input type="text" class="tax" value="${tax}" name="tax[]" style="display: none">
            </span>
            <span class="view_input">${tax}</span>
        </td>
    
        <td class="money">
            <span class="edit_input">
                <input type="text" class="total" value="${formatNumero(total)}" disabled name="total[]" style="display: none">
            </span>
            <span class="view_input">${formatNumero(total)}</span>
        </td>
    
        <td class="buttons">
            <a class="edit item_edit" title="Editar"></a>
            <a class="save item_save" title="Salvar" style="display:none;">
                <i class="fa fa-check"></i>
            </a>
            <a class="delete item_delete" data-id="${itemId}" title="Apagar"></a>
        </td>
    </tr>`;

        $("tr.input").before(novaLinha);

        let $linhaNova = $(`#item${itemId}`);
        if (motivoIVA0) {
            $linhaNova.data("motivoIVA0", motivoIVA0);
        }

        atualizarResumoComDelay();

        linhaEmEdicao = null;

        $("#code, #item").val("");
        $("#quantity").val("1");
        $("#price, #discount, #total").val("0,00");
        $("#tax").val("23");


    }
    function inserirLinha() {
        // 🔹 valores da linha de inserção
        let tipo      = getTipoFromInput();
        let code      = $("#code").val();
        let item      = $("#item").val();
        let quantity  = parseNumero($("#quantity").val());
        let price     = parseNumero($("#price").val());
        let discount  = parseNumero($("#discount").val());
        let tax       = parseNumero($("#tax").val());
        let total     = calcularTotal(quantity, price, discount);

        let tipoParaValidar = "FT";
        if (doc && doc.tipo === "GT") {
            tipoParaValidar = "GT";
        }
        let dadosLinha = {
            tipoDocumento: tipoParaValidar,
            code: code,
            item: item,
            quantity: quantity,
            price: price,
            discount: discount,
            tax: tax,
            tipo: tipo,
            validacao_final: false
        };

        $.ajax({
            url: "/validar-linha/",  // endpoint backend que valida a linha
            method: "POST",
            contentType: "application/json",
            headers: { "X-CSRFToken": getCookie("csrftoken") }, // Django CSRF
            data: JSON.stringify(dadosLinha),
            success: function(response) {
                if (!response.ok) {
                    // mostrar erros do backend
                    $("#box-erro").html("<ul><li>" + response.erros.join("</li><li>") + "</li></ul>");
                    $("#box-erro").dialog("open");
                    return;
                }

                if (tax === 0 && window.impostoCliente !== "Autoliquidação") {

                    linhaEmEdicao = {
                        $linha: null,
                        tipo: tipo,
                        code: code,
                        item: item,
                        quantity: quantity,
                        price: price,
                        discount: discount,
                        tax: tax

                    };


                    $("#modal-iva0").dialog("open");
                    return;
                }

                criarLinhaNaTabela(tipo, code, item, quantity, price, discount, tax);
            }
        });
    }
    $("#item_update").on("click", function () {
        inserirLinha();
    });

    $("#modal-iva0").dialog({
        autoOpen: false,
        modal: true,
        width: 420,
        buttons: {
            "OK": function () {
                const motivo = $("#taxfreereason").val();
                if (!motivo) {
                    alert("Selecione o motivo.");
                    return;
                }

                if (linhaEmEdicao.$linha) {
                    // Linha existente (edição)
                    linhaEmEdicao.$linha.data("motivoIVA0", motivo);
                    linhaEmEdicao.$linha.find(".motivo_tax").val(motivo);
                    atualizarResumoMotivos()
                    finalizarSave(linhaEmEdicao.$linha);
                } else {
                    // Linha nova
                    criarLinhaNaTabela(
                        linhaEmEdicao.tipo,
                        linhaEmEdicao.code,
                        linhaEmEdicao.item,
                        linhaEmEdicao.quantity,
                        linhaEmEdicao.price,
                        linhaEmEdicao.discount,
                        linhaEmEdicao.tax,
                        motivo
                    );
                }

                linhaEmEdicao = null;
                $(this).dialog("close");
            },
            "Cancelar": function () {
                linhaEmEdicao = null;
                $(this).dialog("close");
            }
        }
    });

});

$(document).on('click', '.item_edit', function() {

    let $linha = $(this).closest('tr');

    if (linhaEmEdicao && $.contains(document, linhaEmEdicao[0]) && linhaEmEdicao[0] !== $linha[0]) {
        alert("Já existe um artigo em edição. Guarde ou cancele antes de editar outro.");
        return;
    }

    linhaEmEdicao = $linha;

    // Mostrar inputs
    $linha.find('.edit_input input').show();
    $linha.find('.view_input').hide();

    // Trocar botões
    $(this).hide();
    $linha.find('.item_save').show();
});

function finalizarSave($linha) {

    $linha.find('.edit_input input').each(function() {
        let valor = $(this).val();

            // Formatar números corretamente
        if ($(this).hasClass('price') || $(this).hasClass('discount')) {
            valor = formatNumero(parseNumero(valor));
        }

        $(this).closest('td').find('.view_input').text(valor);
        $(this).hide();
        $(this).closest('td').find('.view_input').show();
    });

    $linha.find('.item_save').hide();
    $linha.find('.item_edit').show();

    linhaEmEdicao = null;
}
$(document).on('click', '.item_save', function() {

    let $linha = $(this).closest('tr');

    let data = {
        code: $linha.find('.code').val(),
        item: $linha.find('.item').val(),
        quantity: parseNumero($linha.find('.quantity').val()),
        price: parseNumero($linha.find('.price').val()),
        discount: parseNumero($linha.find('.discount').val()),
        tax: parseNumero($linha.find('.tax').val())
    };

    // IVA 0 → abrir modal
    if (data.tax === 0 && window.impostoCliente !== "Autoliquidação") {

        linhaEmEdicao = {
            data: data,
            $linha: $linha
        };

        $("#modal-iva0").dialog("open");
        return;
    }

    // IVA diferente de 0 → remover motivo
    if (data.tax !== 0) {
        $linha.removeData("motivoIVA0");
        $linha.find('.motivo_tax').val('');
    }
    const csrftoken = getCookie('csrftoken');

    $.ajax({
        url: '/validar-linha/',
        type: 'POST',
        headers: {'X-CSRFToken': csrftoken},
        contentType: 'application/json',
        data: JSON.stringify(data),

        success: function(response) {

            if (!response.ok) {
                let errosHTML = "<ul><li>" +
                    response.erros.join("</li><li>") +
                    "</li></ul>";

                $("#box-erro").html(errosHTML).dialog("open");
                return;
            }

            finalizarSave($linha);
            atualizarResumoComDelay();

            atualizarResumoMotivos();
        }
    });
});

$(document).on('click', '.item_delete', function() {
    const $linha = $(this).closest('tr');

    // Se estiver em edição, limpa referência
    if (linhaEmEdicao && linhaEmEdicao.$linha && linhaEmEdicao.$linha[0] === $linha[0]) {
        linhaEmEdicao = null;
    }

    // Remove a linha
    $linha.remove();

    atualizarResumoComDelay();
});

function atualizarResumoFatura(simboloMoeda) {
    let subtotal = 0;
    let total = 0;
    let ivaIncidencias = {}; // {taxa: valor}

    // Itera sobre cada linha de produto adicionada
    $("tr.product_edit").each(function() {
        let preco = parseNumero($(this).find("input.price").val());
        let quantidade = parseNumero($(this).find("input.quantity").val());
        let desconto = parseNumero($(this).find("input.discount").val());
        let taxa = parseNumero($(this).find("input.tax").val());

        let subtotalLinha = preco * quantidade - desconto;
        subtotal += subtotalLinha;

        if (!ivaIncidencias[taxa]) ivaIncidencias[taxa] = 0;
        ivaIncidencias[taxa] += subtotalLinha * (taxa / 100);
    });

    total = subtotal + Object.values(ivaIncidencias).reduce((a,b) => a + b, 0);

    // Atualiza subtotal e total com símbolo dinâmico
    $("#subtotal_value").text(formatNumero(subtotal) + " " + simboloMoeda);
    $("#total_value").text(formatNumero(total) + " " + simboloMoeda);

    // Limpa linhas de IVA
    $("#iva_lines").empty();

    // Adiciona linhas de IVA
    for (let taxa in ivaIncidencias) {

        let valorIva = ivaIncidencias[taxa];
        let base = 0;

        if (parseFloat(taxa) === 0) {
            // IVA 0 → base = valor sem IVA
            base = valorIva; // ou soma dos subtotais das linhas com taxa 0
        } else {
            base = valorIva / (parseFloat(taxa)/100);
        }

        let linhaIva = `
            <tr class="resume tax">
                <td colspan="3">IVA ${parseFloat(taxa).toFixed(2)}% (Incidência: ${formatNumero(base)})</td>
                <td colspan="100" class="value">${formatNumero(valorIva)} ${simboloMoeda}</td>
            </tr>`;
        $("#iva_lines").append(linhaIva);
    }
}

$(document).on("click", "#item_update", function () {

    const $btn = $(this);

    // Desativar botão + mostrar loading
    $btn.prop("disabled", true).addClass("loading");

    const simboloAtual = $("#currency_text").text();

    setTimeout(() => {
        atualizarResumoFatura(simboloAtual);

        // Reativar botão
        $btn.prop("disabled", false).removeClass("loading");

    }, 500); // delay curto e elegante
});

$(function() {

    $.datepicker.setDefaults($.datepicker.regional["pt"]);

    function attachDateTimePicker(inputSelector, textSelector, minDate = 0) {
        const input = $(inputSelector);
        const textDiv = $(textSelector);

        input.datetimepicker({
            dateFormat: "dd/mm/yy",
            timeFormat: "HH:mm",
            controlType: "slider",
            oneLine: true,
            minDate: minDate,
            onClose: function() {
                input.hide();
                textDiv.text(input.val()).show();
            }
        });
    }

    // Inicializa ao clicar no botão "edit"
    $("#button_edit_load").on("click", function() {
        $("#loaddate, #unloaddate").show();

        attachDateTimePicker("#loaddate", "#loaddate_text", 0);
        attachDateTimePicker("#unloaddate", "#unloaddate_text", 0);
    });

    // Validação correta usando parseDateTime
    function parseDateTimeValue(val) {
        if (!val) return null;
        return $.datepicker.parseDateTime("dd/mm/yy", "HH:mm", val);
    }

    function validateDates() {
        const loadVal = $("#loaddate").val();
        const unloadVal = $("#unloaddate").val();

        const loadDate = parseDateTimeValue(loadVal);
        const unloadDate = parseDateTimeValue(unloadVal);

        if (loadDate && unloadDate && loadDate > unloadDate) {
            alert("A data de carga não pode ser maior que a data de descarga!");
            $("#loaddate").val("");
            $("#loaddate_text").text("Clique para escolher").show();
        }
    }

    // Validar quando fecha qualquer input
    $("#loaddate, #unloaddate").on("change", validateDates);

});

function toISO(dateObj) {
    return dateObj.getFullYear() + "-" +
           String(dateObj.getMonth()+1).padStart(2,'0') + "-" +
           String(dateObj.getDate()).padStart(2,'0');
}

$(function() {

    $.datepicker.setDefaults($.datepicker.regional["pt"]);
    const mesesNome = ["Janeiro","Fevereiro","Março","Abril","Maio","Junho",
                       "Julho","Agosto","Setembro","Outubro","Novembro","Dezembro"];

    function attachDatePicker(editId, cancelId, saveId, textId, inputId, minDate = 0) {

        $('#' + editId).on('click', function() {
            const input = $('#' + inputId);
            const textDiv = $('#' + textId);

            textDiv.hide();
            input.parent().show();
            $('#' + cancelId + ', #' + saveId).show();
            $(this).hide();

            // Se o input estiver vazio, tentamos recuperar do texto da DIV
            // Mas o ideal é que o input já tenha o valor dd/mm/yy definido no carregamento
            if (!input.val() && textDiv.text().trim() !== "") {
                // Apenas como fallback caso o input perca o valor
                const d = $.datepicker.parseDate("d MM yy", textDiv.text().trim(), {
                    monthNames: mesesNome
                });
                input.val($.datepicker.formatDate("dd/mm/yy", d));
            }

            if (input.hasClass('hasDatepicker')) input.datepicker("destroy");

            // Calcula minDate dinamicamente
            let minVenc = 0;
            if (inputId === "payment_date_input") {
                const emissaoVal = $("#date_input").val();
                if (emissaoVal) {
                    try {
                        minVenc = $.datepicker.parseDate("dd/mm/yy", emissaoVal);
                    } catch(e) { minVenc = 0; }
                }

                // Se vencimento atual for menor que emissão, limpa
                const vencVal = input.val();
                if (vencVal) {
                    try {
                        const venc = $.datepicker.parseDate("dd/mm/yy", vencVal);
                        if (venc < minVenc) {
                            input.val("");
                            $("#payment_date_text").text("Clique para escolher").show();
                        }
                    } catch(e) {
                        input.val("");
                        $("#payment_date_text").text("Clique para escolher").show();
                    }
                }
            }

            // Inicializa datepicker
            if (inputId === "date_input") {

                // Calcula maxDate com base no vencimento atual
                let maxEmissao = null;
                const vencVal = $("#payment_date_input").val();

                if (vencVal) {
                    try {
                        maxEmissao = $.datepicker.parseDate("dd/mm/yy", vencVal);
                    } catch(e) { maxEmissao = null; }
                }

                input.datepicker({
                    dateFormat: "dd/mm/yy",
                    minDate: 0,          // 🚫 Não permite datas passadas
                    maxDate: maxEmissao, // 🚫 Não permite emissão > vencimento

                    onClose: function() {
                        const val = input.val();

                        if (val) {
                            try {
                                const d = $.datepicker.parseDate("dd/mm/yy", val);
                                textDiv.text(`${d.getDate()} ${mesesNome[d.getMonth()]} ${d.getFullYear()}`);
                            } catch(e) {
                                input.val("");
                            }
                        }

                        validateDates();
                    }
                }).datepicker("show");
            } else {
                // Datepicker do vencimento
                input.datepicker({
                    dateFormat: "dd/mm/yy",
                    minDate: minVenc,
                    onClose: function() {
                        const val = input.val();
                        if (val) {
                            try {
                                const d = $.datepicker.parseDate("dd/mm/yy", val);
                                textDiv.text(`${d.getDate()} ${mesesNome[d.getMonth()]} ${d.getFullYear()}`);
                            } catch(e) { input.val(""); }
                        }
                        validateDates();
                    }
                }).datepicker("show");
            }
        });
        $("#payment_date_input").on("change", function() {

            const vencVal = $(this).val();

            if (!vencVal) {
                $("#date_input").datepicker("option", "maxDate", null);
                return;
            }

            try {
                const venc = $.datepicker.parseDate("dd/mm/yy", vencVal);

                // Atualiza limite da emissão
                $("#date_input").datepicker("option", "maxDate", venc);

            } catch(e) {}
        });
        $('#' + cancelId).on('click', function() {
            $('#' + textId).show();
            $('#' + inputId).parent().hide();
            $('#' + editId).show();
            $('#' + cancelId + ', #' + saveId).hide();
        });

        $('#' + saveId).on('click', function() {
            const val = $('#' + inputId).val();
            if (val) {
                try {
                    const d = $.datepicker.parseDate("dd/mm/yy", val);

                    if (!validateDates()) {
                        return;
                    }
                    const textoFormatado = `${d.getDate()} ${mesesNome[d.getMonth()]} ${d.getFullYear()}`;
                    $('#' + textId).text(textoFormatado).show();

                    if (inputId === "date_input") {
                        $("#data_emissao").val(toISO(d));
                    } else if (inputId === "payment_date_input") {
                        const iso = toISO(d);

                        $("#data_vencimento").val(iso);

                        console.log("Depois:", $("#data_vencimento").val());
                    }

                    $('#' + inputId).parent().hide();
                    $('#' + editId).show();
                    $('#' + cancelId + ', #' + saveId).hide();

                } catch(e) {
                    console.error("Erro ao parsear data no salvar:", val, e);
                    alert("Data inválida!");
                }
            }
        });
    }

    function validateDates() {
        const parse = d => $.datepicker.parseDate("dd/mm/yy", d);
        const emissaoVal = $("#date_input").val();
        const vencimentoVal = $("#payment_date_input").val();
        if (!emissaoVal) return;

        let emissao;
        try { emissao = parse(emissaoVal); } catch(e) { return; }

        if (vencimentoVal) {
            try {
                const venc = parse(vencimentoVal);
                if (venc < emissao) {
                    alert("A data de vencimento não pode ser anterior à data de emissão!");
                    $("#payment_date_input").val("");
                    $("#payment_date_text").text("Clique para escolher").show();
                }
            } catch(e) {
                $("#payment_date_input").val("");
                $("#payment_date_text").text("Clique para escolher").show();
            }
        }
        return true;
    }

    // Inicializa os campos
    attachDatePicker('date_edit', 'date_cancel', 'date_update', 'date_text', 'date_input', 0);
    attachDatePicker('payment_date_edit', 'payment_date_cancel', 'payment_date_update', 'payment_date_text', 'payment_date_input', 0);

    // Atualiza minDate do vencimento quando emissão muda
    $("#date_input").on("change", function() {
        const emissaoVal = $(this).val();
        if (!emissaoVal) return;

        let emissao;
        try { emissao = $.datepicker.parseDate("dd/mm/yy", emissaoVal); } catch(e) { return; }

        // Atualiza minDate do vencimento
        $("#payment_date_input").datepicker("option", "minDate", emissao);

        // Limpa vencimento se for menor que nova emissão
        const vencVal = $("#payment_date_input").val();
        if (vencVal) {
            try {
                const venc = $.datepicker.parseDate("dd/mm/yy", vencVal);
                if (venc < emissao) {
                    $("#payment_date_input").val("");
                    $("#payment_date_text").text("Clique para escolher").show();
                }
            } catch(e) {
                $("#payment_date_input").val("");
                $("#payment_date_text").text("Clique para escolher").show();
            }
        }
    });

    // Valida datas ao carregar a página
    validateDates();

});

$(function() {
    // Carrega dados via Ajax
    $.ajax({
        url: "/matriculas-dropdown/",
        method: "GET",
        success: function(data) {
            const select = $("#registration_select");
            data.forEach(function(item) {
                select.append(
                    $("<option></option>")
                        .val(item.descricao)
                        .text(item.descricao)
                );
            });
        }
    });
});
function getQueryParam(name) {
    return new URLSearchParams(window.location.search).get(name);
}
function isoParaPT(dataISO) {
    if (!dataISO) return "";

    const [ano, mes, dia] = dataISO.split("-");
    return `${dia}/${mes}/${ano}`;
}
$(function() {

    $("#modal-erro-validacao").dialog({
        autoOpen: false,
        modal: true,
        width: 450,
        buttons: {
            "Fechar": function () {
                $(this).dialog("close");
            }
        }
    });

});

function abrirModalErro(mensagem) {
    $("#modal-erro-mensagem").html(mensagem);
    $("#modal-erro-validacao").dialog("open");
}


$(function() {
    $("#modal-sucesso").dialog({
        autoOpen: false,
        modal: true,
        width: 400,
        buttons: {
            "OK": function () {
                $(this).dialog("close");
                if (document.referrer) {
                    window.location.href = document.referrer;
                } else {
                    window.location.href = "";
                }
            }
        }
    });
});

$(function() {
    $("#modal-sucesso-finalizado").dialog({
        autoOpen: false,
        modal: true,
        width: 400,
        buttons: {
            "OK": function () {
                $(this).dialog("close");
                if (document.referrer) {
                    window.location.href = document.referrer;
                } else {
                    window.location.href = "";
                }
            }
        }
    });
});

function apagarDocumento() {
    const urlParams = new URLSearchParams(window.location.search);
    const temp_id = urlParams.get("temp_id"); // pega temp_id da URL
    const csrftoken = getCookie('csrftoken'); // função que pega CSRF

    $.ajax({
        url: "/apagar-documento/",
        method: "POST",
        headers: {"X-CSRFToken": csrftoken},
        contentType: "application/json",
        data: JSON.stringify({id: temp_id}),
        success: function(response) {
            if (response.success) {
                alert(response.message);

                if (document.referrer) {
                    window.location.href = document.referrer;
                } else {
                    window.location.href = "";
                }
            } else {
                alert("Erro: " + response.error);
            }
        }
    });
}

$(function() {
    // Inicializa o modal
    $("#modal-apagar").dialog({
        autoOpen: false,
        modal: true,
        width: 400,
        buttons: {
            "Sim, apagar": function() {
                $(this).dialog("close");

                apagarDocumento();
            },
            "Cancelar": function() {
                $(this).dialog("close");
            }
        }
    });

    // Abrir modal ao clicar no link
    $("#tools_delete").on("click", function(e) {
        e.preventDefault();
        $("#modal-apagar").dialog("open");
    });
});

function setupDateIcons(editId, cancelId, saveId, textId, inputId, isSelect = false) {
    // Configurar o efeito de hover e clique para o ícone de editar
    $('#' + editId)
        .hover(
            function () { $(this).attr('src', editIconOn); }, // Muda para 'on' quando o mouse passa
            function () { $(this).attr('src', editIconOff); } // Muda para 'off' quando o mouse sai
        )
        .on('click', function () {
            $('#' + textId).hide();
            $('#' + inputId).parent().show();
            $('#' + cancelId + ', #' + saveId).show();
            $(this).hide();
        });

    // Configurar o efeito de hover e clique para o ícone de cancelar
    $('#' + cancelId)
        .hover(
            function () { $(this).attr('src', cancelIconOn); }, // Muda para 'on' quando o mouse passa
            function () { $(this).attr('src', cancelIconOff); } // Muda para 'off' quando o mouse sai
        )
        .on('click', function () {
            $('#' + textId).show();
            $('#' + inputId).parent().hide();
            $('#' + editId).show();
            $('#' + cancelId + ', #' + saveId).hide();
        });

    $('#' + saveId)
        .hover(
            function () { $(this).attr('src', saveIconOn); }, // Muda para 'on' quando o mouse passa
            function () { $(this).attr('src', saveIconOff); } // Muda para 'off' quando o mouse sai
        )
        .on('click', function () {
            let newVal;

            // Verifica se é um campo de seleção ou de texto
            if (isSelect) {
                newVal = $('#' + inputId + ' option:selected').text();
            } else {
                newVal = $('#' + inputId).val();
            }

            // Atualiza o texto visível
            $('#' + textId).text(newVal).show();
            $('#' + inputId).parent().hide();
            $('#' + editId).show();
            $('#' + cancelId + ', #' + saveId).hide();

            // 🔹 Se for moeda, atualizar valores no resumo
            if (textId === "currency_text") {
                const simbolo = newVal;

                // Atualiza o valor no subtotal
                const subtotal = $("#subtotal_value").text().replace(/[^\d,\.]/g, '');
                $("#subtotal_value").text(`${subtotal} ${simbolo}`);

                // Atualiza o valor total
                const total = $("#total_value").text().replace(/[^\d,\.]/g, '');
                $("#total_value").text(`${total} ${simbolo}`);

                // Atualiza cada valor de IVA
                $("#iva_lines .value").each(function(){
                    const val = $(this).text().replace(/[^\d,\.]/g, '');
                    $(this).text(`${val} ${simbolo}`);
                });
            }
        });
}


$(function () {
    // 📅 Data de Emissão
    setupDateIcons(
        'date_edit',
        'date_cancel',
        'date_update',
        'date_text',
        'date_input'
    );

    // 📅 Data de Vencimento
    setupDateIcons(
        'payment_date_edit',
        'payment_date_cancel',
        'payment_date_update',
        'payment_date_text',
        'payment_date_input'
    );

    // 📝 Descrição
    setupDateIcons(
        'button_edit',
        'button_cancel',
        'button_update',
        'description_text',
        'description'
    );
    // Footer
    setupDateIcons(
        'button_edit_footer',
        'button_cancel_footer',
        'button_update_footer',
        'footer_text',
        'footer'
    );


});


$(function () {

    // HOVER DOS ÍCONES
    $('#button_edit_load, #button_cancel_load, #button_update_load').hover(
        function () {
            $(this).attr('src', $(this).data('on'));
        },
        function () {
            $(this).attr('src', $(this).data('off'));
        }
    );

    // EDITAR — mostrar todos os inputs
    $('#button_edit_load').on('click', function () {
        $('.loadblock .text').hide();
        $('.loadblock .input input, .loadblock .input select').show(); // incluir selects

        // copiar texto para input ou selecionar a opção
        $('.loadblock .item').each(function () {
            const text = $(this).find('.text').text().trim();
            const input = $(this).find('.input input, .input select');
            if(input.is('input')) {
                input.val(text);
            } else if(input.is('select')) {
                input.val(text); // se o texto for o valor da opção
            }
        });

        $('#button_cancel_load, #button_update_load').show();
        $(this).hide();
    });

    // CANCELAR — voltar ao estado inicial
    $('#button_cancel_load').on('click', function () {

        $('.loadblock .input input, .loadblock .input select').hide();
        $('.loadblock .text').show();

        $('#button_edit_load').show();
        $('#button_cancel_load, #button_update_load').hide();
    });

    // SALVAR — copiar inputs → texto
    $('#button_update_load').on('click', function () {
        $('.loadblock .item').each(function () {
            const input = $(this).find('.input input, .input select');
            const val = input.val();
            $(this).find('.text').text(val);
        });

        $('.loadblock .input input, .loadblock .input select').hide();
        $('.loadblock .text').show();

        $('#button_edit_load').show();
        $('#button_cancel_load, #button_update_load').hide();
    });

});

$(function() {

    const defaultText = "Caso pretenda pode adicionar aqui uma descrição...";
    let originalText = "";   // 🔥 guarda valor real

    // EDITAR
    $('#button_edit').on('click', function() {

        $('.description_block').css('background', '#ffffff');

        originalText = $('#description_text').text().trim();

        let currentText = originalText;

        if (currentText === defaultText) {
            currentText = "";
        }

        $('#description').val(currentText);

        $('#description_text').hide();
        $('.description_input').show();

        $('#button_cancel, #button_update').show();
        $(this).hide();
    });

    // SALVAR
    $('#button_update').on('click', function() {

        let newVal = $('#description').val().trim();

        if (newVal === "" || newVal === defaultText) {
            newVal = "";
        }

        $('#description_text')
            .text(newVal === "" ? defaultText : newVal)
            .show();

        $('.description_input').hide();
        $('.description_block').css('background', '#c5c5c5');

        $('#button_edit').show();
        $('#button_cancel, #button_update').hide();
    });

    // ❌ CANCELAR (AGORA CORRETO)
    $('#button_cancel').on('click', function() {

        // 🔥 Restaurar valor original também no textarea
        let restoreVal = originalText === defaultText ? "" : originalText;

        $('#description').val(restoreVal);

        $('#description_text')
            .text(originalText)
            .show();

        $('.description_input').hide();
        $('.description_block').css('background', '#c5c5c5');

        $('#button_edit').show();
        $('#button_cancel, #button_update').hide();
    });

});

$(function () {

    const defaultFooterText = "Caso pretenda pode adicionar aqui um rodapé...";
    let originalFooterText = "";   // 🔥 guarda valor original

    // HOVER (ícones)
    $('.icon-btn').hover(
        function () {
            $(this).attr('src', $(this).data('on'));
        },
        function () {
            $(this).attr('src', $(this).data('off'));
        }
    );

    // EDITAR
    $('#button_edit_footer').on('click', function () {

        originalFooterText = $('#footer_text').text().trim();

        let currentText = originalFooterText;

        // Se for texto padrão → textarea vazio
        if (currentText === defaultFooterText) {
            currentText = "";
        }

        $('#footer').val(currentText);

        $('#footer_text').hide();
        $('#footer').show();

        $('#button_cancel_footer, #button_update_footer').show();
        $(this).hide();
    });

    // ❌ CANCELAR (AGORA CORRETO)
    $('#button_cancel_footer').on('click', function () {

        // 🔥 Restaurar valor real do textarea
        let restoreVal =
            originalFooterText === defaultFooterText
                ? ""
                : originalFooterText;

        $('#footer').val(restoreVal);

        $('#footer_text')
            .text(originalFooterText)
            .show();

        $('#footer').hide();

        $('#button_edit_footer').show();
        $('#button_cancel_footer, #button_update_footer').hide();
    });

    // SALVAR
    $('#button_update_footer').on('click', function () {

        let newVal = $('#footer').val().trim();

        if (newVal === "" || newVal === defaultFooterText) {
            newVal = "";
        }

        $('#footer_text')
            .text(newVal === "" ? defaultFooterText : newVal)
            .show();

        $('#footer').hide();

        $('#button_edit_footer').show();
        $('#button_cancel_footer, #button_update_footer').hide();
    });

});

function verificarMoreFields() {

    let temConteudo = false;

    $('.morefields-group input').each(function () {
        if ($(this).val().trim() !== '') {
            temConteudo = true;
            return false;
        }
    });

    if (temConteudo) {
        $('.morefields-group').show();
    }
}
$(document).ready(function () {

    $('#toggle_morefields').click(function () {
        $('.morefields-group').toggle();
    });

    verificarMoreFields();

});

$(function () {

    $("#box-artigo").dialog({
        autoOpen: false,
        modal: true,
        width: 800,
        buttons: {
            Cancel: function () {
                $(this).dialog("close");
            }
        }
    });

    $(document).on("click", "tr.input .code, tr.input .item, tr.product .code, tr.product .item, tr.product .view_input", function () {
        $("#box-artigo").dialog("open");

        // guardar a linha correta
        window.linhaEmEdicao = $(this).closest("tr");
    });

    $(document).on("click", ".select-artigo", function (e) {
        e.preventDefault();
        const id = $(this).data("id");
        const descricao = $(this).data("descricao") || '';
        const preco = parseFloat($(this).data("preco"));
        let taxaArtigo = parseFloat($(this).data("taxa")) || 0;

        let taxa;
        if (window.impostoCliente === "Autoliquidação") {
            taxa = 0;
        } else if (window.impostoCliente === "IVA") {
            taxa = taxaArtigo || 23;
        } else {
            taxa = taxaArtigo || 0;
        }
        const tipoRaw = $(this).data("tipo") || '';

        if (!window.linhaEmEdicao) return;

        const $linha = window.linhaEmEdicao;

        // preencher inputs da linha
        $linha.find(".item").val(descricao);
        $linha.find(".code").val(id);
        $linha.find("#poriginal").val(preco.toFixed(2));
        $linha.find(".price").val(preco.toFixed(2).replace('.', ','));
        $linha.find("#producttype").val(tipoRaw);
        $linha.find(".tax").val(taxa);
        $linha.find(".quantity").val(1);
        $linha.find(".discount").val('');
        $linha.find(".total").val(preco.toFixed(2).replace('.', ','));

        let tipoNormalizado = (tipoRaw || '')
            .toString()
            .trim()
            .toLowerCase()
            .normalize("NFD")
            .replace(/[\u0300-\u036f]/g, "");

        if ($linha.hasClass("product_edit")) {
            let $iconCell = $linha.find("td.buttons.type");

            if (tipoNormalizado === 's') {
                $iconCell.html('<img src="' + iconTypeServiceOn + '" width="18" height="18">');
            } else if (tipoNormalizado === 'p') {
                $iconCell.html('<img src="' + iconTypeProductOn + '" width="18" height="18">');
            } else {
                $iconCell.html('');
            }

        }
        else {

            if (tipoNormalizado === 's') {
                $("#item_type_service img").attr("src", iconTypeServiceOn);
                $("#item_type_product img").attr("src", iconTypeProductOff);
            } else if (tipoNormalizado === 'p') {
                $("#item_type_product img").attr("src", iconTypeProductOn);
                $("#item_type_service img").attr("src", iconTypeServiceOff);
            } else {
                $("#item_type_service img").attr("src", iconTypeServiceOff);
                $("#item_type_product img").attr("src", iconTypeProductOff);
            }
        }

        $("#box-artigo").dialog("close");
    });

    // atualizar total ao mudar quantidade
    $("#quantity").on("input", function () {
        const preco = parseFloat($("#poriginal").val()) || 0;
        const quantidade = parseInt($(this).val()) || 1;
        const total = preco * quantidade;
        $("#total").val(total.toFixed(2).replace('.', ','));
    });

    // filtro
    $("#search-artigo").on("keyup", function () {
        const search = $(this).val().toLowerCase();
        $("#box-artigo ul li").each(function () {
            $(this).toggle($(this).text().toLowerCase().includes(search));
        });
    });

});

$(function () {
        // OK do preço
    $("#box-preco").dialog({
        autoOpen: false,
        modal: true,
        width: 300,
        buttons: {
            OK: function() {
                if (!linhaEmEdicao) return;
                const precoComIva = parseNumero($("#preco_com_iva").val());
                const iva = parseNumero(linhaEmEdicao.find(".tax").val());
                const precoSemIva = precoComIva / (1 + iva/100);

                linhaEmEdicao.find(".price").val(formatNumero(precoSemIva));
                calcularTotalLinha(linhaEmEdicao);

                $(this).dialog("close");
            }
        }
    });

    // Abrir modal ao clicar no ícone de preço
    $(document).on("click", ".price_container img", function() {
        linhaEmEdicao = $(this).closest("tr");
        const iva = parseNumero(linhaEmEdicao.find(".tax").val());

        if (iva > 0) $("#preco-container").show();
        else $("#preco-container").hide();

        const preco = parseNumero(linhaEmEdicao.find(".price").val());
        $("#preco_com_iva").val(formatNumero(preco*(1+iva/100)));
        $("#preco_sem_iva").text(formatNumero(preco));

        $("#box-preco").dialog("open");
    });

    // Enter para confirmar preço
    $("#preco_com_iva").on("keydown", function(e){
        if(e.key==="Enter"){
            e.preventDefault();
            $("#box-preco").dialog("option","buttons").OK.call($("#box-preco"));
        }
    });
});



$(function () {

    $("#box-desconto").dialog({
        autoOpen:false,
        modal:true,
        width:400,
        buttons:{
            OK: function(){ aplicarDesconto(); $(this).dialog("close"); },
            Cancel: function(){ $(this).dialog("close"); }
        }
    });

    // Abrir modal ao clicar no ícone de desconto
    $(document).on("click", ".discount_container img", function(){
        linhaEmEdicao = $(this).closest("tr");

        const preco = parseNumero(linhaEmEdicao.find(".price").val());
        const quantidade = parseNumero(linhaEmEdicao.find(".quantity").val());
        const descontoAtual = parseNumero(linhaEmEdicao.find(".discount").val());
        const percent = (preco*quantidade)? (descontoAtual/(preco*quantidade))*100 : 0;

        $("#discount_percent").val(formatNumero(percent));
        atualizarDescontoValor();
        $("#box-desconto").dialog("open");
    });

    // Atualiza valor do desconto enquanto digita
    $("#discount_percent").on("input", atualizarDescontoValor);
    $("#discount_percent").on("blur", aplicarDesconto);
    $("#discount_percent").on("keydown", function(e){
        if(e.key==="Enter"){ e.preventDefault(); aplicarDesconto(); $("#box-desconto").dialog("close"); }
    });

    function atualizarDescontoValor(){
        if(!linhaEmEdicao) return;
        let percent = parseNumero($("#discount_percent").val());
        if(percent<0) percent=0; if(percent>100) percent=100;

        const preco = parseNumero(linhaEmEdicao.find(".price").val());
        const valorDesconto = preco * (percent/100);

        $("#desconto_valor").text(formatNumero(valorDesconto));
    }

    function aplicarDesconto(){
        if(!linhaEmEdicao) return;
        let percent = parseNumero($("#discount_percent").val());
        if(percent<0) percent=0; if(percent>100) percent=100;

        const preco = parseNumero(linhaEmEdicao.find(".price").val());
        const valorDesconto = preco*(percent/100);

        linhaEmEdicao.find(".discount").val(formatNumero(valorDesconto));
        $("#desconto_valor").text(formatNumero(valorDesconto));

        calcularTotalLinha(linhaEmEdicao);
    }
});
async function finalizarDocumento(btn, modal) {

    const temp_id = getQueryParam("temp_id");
    const cliente_id = getQueryParam("cliente");

    const documento = {
        temp_id: temp_id,
        cliente_id: cliente_id,
        data_emissao: $("#data_emissao").length
            ? isoParaPT($("#data_emissao").val().trim())
            : "",

        data_vencimento: $("#data_vencimento").length
            ? isoParaPT($("#data_vencimento").val().trim())
            : "",
        metodo_pagamento: $("#payment_method_value").length ? $("#payment_method_value").val().trim() : "",
        moeda: $("#currency_value").length ? $("#currency_value").val().trim() : "",
        ordem_compra: $("#purchaseorder").length ? $("#purchaseorder").val().trim() : "",
        numero_comp: $("#tcustom2").length ? $("#tcustom2").val().trim() : "",
        descricao: $("#description").length ? $("#description").val().trim() : "",
        rodape: $("#footer").length ? $("#footer").val().trim() : "",
        local_carga: $("#loadplace").length ? $("#loadplace").val().trim() : "",
        local_descarga: $("#unloadplace").length ? $("#unloadplace").val().trim() : "",
        data_carga: $("#loaddate").length ? $("#loaddate").val().trim() : "",
        data_descarga: $("#unloaddate").length ? $("#unloaddate").val().trim() : "",
        expedicao: $("#expedition").length ? $("#expedition").val().trim() : "",
        matricula: $("#registration_select").length ? $("#registration_select").val() : "",
        artigos: []
    };

    $(".items tr.product").each(function () {
        const row = $(this);

        documento.artigos.push({
            codigo: row.find(".view_input").eq(0).text().trim(),
            descricao: row.find(".view_input").eq(1).text().trim(),
            quantidade: row.find(".view_input").eq(2).text().trim(),
            preco: row.find(".view_input").eq(3).text().trim(),
            desconto: row.find(".view_input").eq(4).text().trim(),
            iva: row.find(".view_input").eq(5).text().trim(),
            total: row.find(".view_input").eq(6).text().trim(),
            motivo: row.find('.motivo_tax').val()
        });
    });

    try {
        const response = await fetch("/finalizar-documento/", {
            method: "POST",
            headers: {
                "Content-Type": "application/json",
                "X-CSRFToken": getCookie('csrftoken')
            },
            body: JSON.stringify(documento)
        });

        const data = await response.json();

        if (response.ok && data.success) {
            window.location.href = `/faturas/ver/${data.id}/`;

            if (modal) modal.dialog("close");
        } else {
            // ERRO: Reativar os botões e mostrar erro
            if (btn) btn.prop("disabled", false);
            if (modal) modal.dialog("close");
            abrirModalErro(data.error || "Erro ao processar documento.");
        }

    } catch (err) {
        console.error("Erro crítico:", err);
        if (btn) btn.prop("disabled", false);
        if (modal) modal.dialog("close");
        abrirModalErro("Não foi possível comunicar com o servidor.");
    }
}

$(function () {

    $("#modal-confirmar-fecho").dialog({
        autoOpen: false,
        modal: true,
        resizable: false,
        buttons: {
            "Sim, fechar": function () {
                const dialog = $(this);
                const buttons = dialog.parent().find("button");

                const temp_id = getQueryParam("temp_id");
                const cliente_id = getQueryParam("cliente");

                if (!temp_id || !cliente_id) {
                    abrirModalErro("Não é possível finalizar sem selecionar documento e cliente.");
                    return;
                }

                // Desativa para evitar cliques duplos
                buttons.prop("disabled", true);

                // Passamos os botões para a função para que ela os possa reativar em caso de erro
                finalizarDocumento(buttons, dialog);
            },
            "Cancelar": function () {
                $(this).dialog("close");
            }
        }
    });

});

$(function() {

    $("#tools_save").on("click", function () {
        const temp_id = getQueryParam("temp_id");
        const cliente_id = getQueryParam("cliente");

        const documento = {
            temp_id: temp_id,
            cliente_id: cliente_id,
            data_emissao: $("#data_emissao").length
                ? isoParaPT($("#data_emissao").val().trim())
                : "",

            data_vencimento: $("#data_vencimento").length
                ? isoParaPT($("#data_vencimento").val().trim())
                : "",
            metodo_pagamento: $("#payment_method_value").length ? $("#payment_method_value").val().trim() : "",            moeda: $("#currency_value").length ? $("#currency_value").val().trim() : "",
            ordem_compra: $("#purchaseorder").length ? $("#purchaseorder").val().trim() : "",
            numero_comp: $("#tcustom2").length ? $("#tcustom2").val().trim() : "",
            descricao: $("#description").length ? $("#description").val().trim() : "",
            rodape: $("#footer").length ? $("#footer").val().trim() : "",
            local_carga: $("#loadplace").length ? $("#loadplace").val().trim() : "",
            local_descarga: $("#unloadplace").length ? $("#unloadplace").val().trim() : "",
            data_carga: $("#loaddate").length ? $("#loaddate").val().trim() : "",
            data_descarga: $("#unloaddate").length ? $("#unloaddate").val().trim() : "",
            expedicao: $("#expedition").length ? $("#expedition").val().trim() : "",
            matricula: $("#registration_select").length ? $("#registration_select").val() : "",
            artigos: []
        };

        $(".items tr.product").each(function () {
            const row = $(this);

            const codigo = row.find(".view_input").eq(0).text().trim();
            const descricao = row.find(".view_input").eq(1).text().trim();
            const quantidade = row.find(".view_input").eq(2).text().trim();
            const preco = row.find(".view_input").eq(3).text().trim();
            const desconto = row.find(".view_input").eq(4).text().trim();
            const iva = row.find(".view_input").eq(5).text().trim();
            const total = row.find(".view_input").eq(6).text().trim();
            const motivo = row.find('.motivo_tax').val();

            documento.artigos.push({
                codigo: codigo,
                descricao: descricao,
                quantidade: quantidade,
                preco: preco,
                desconto: desconto,
                iva: iva,
                total: total,
                motivo: motivo
            });
        });

        const csrftoken = getCookie('csrftoken');

        $.ajax({
            url: "/atualizar-documento/",
            method: "POST",
            headers: {"X-CSRFToken": csrftoken},
            contentType: "application/json",
            data: JSON.stringify(documento),
            success: function(response) {

                if (response.success === false) {
                    abrirModalErro(response.error);
                    return;
                }

                $("#modal-sucesso").dialog("open");
            },

            error: function(xhr) {

                let mensagem = "Erro inesperado.";

                try {
                    const resposta = JSON.parse(xhr.responseText);
                    if (resposta.error) {
                        mensagem = resposta.error;
                    }
                } catch (e) {
                    console.error("Erro ao processar resposta do servidor.");
                }

                abrirModalErro(mensagem);
            }
        });
    });

    $("#tools_close").on("click", function () {
        $("#modal-confirmar-fecho").dialog("open");
    });

});

async function finalizarDocumentoGuia(btn, modal) {

    const cliente_id = getQueryParam("cliente");
    const tipo = getQueryParam("tipo")
    const serie = getQueryParam("serie")
    const numero = getQueryParam("numero")
    const ano = getQueryParam("ano")

    const data       = getQueryParam("data");

    const documento = {
        cliente_id: cliente_id,
        data_emissao: data ? isoParaPT(data) : "",
        tipo: tipo || "",
        serie: serie || "",
        numero: numero || "",
        ano: ano || "",
        moeda: $("#currency_value").length ? $("#currency_value").val().trim() : "",
        ordem_compra: $("#purchaseorder").length ? $("#purchaseorder").val().trim() : "",
        numero_comp: $("#tcustom2").length ? $("#tcustom2").val().trim() : "",
        descricao: $("#description").length ? $("#description").val().trim() : "",
        rodape: $("#footer").length ? $("#footer").val().trim() : "",
        local_carga: $("#loadplace").length ? $("#loadplace").val().trim() : "",
        local_descarga: $("#unloadplace").length ? $("#unloadplace").val().trim() : "",
        data_carga: $("#loaddate").length ? $("#loaddate").val().trim() : "",
        data_descarga: $("#unloaddate").length ? $("#unloaddate").val().trim() : "",
        expedicao: $("#expedition").length ? $("#expedition").val().trim() : "",
        matricula: $("#registration_select").length ? $("#registration_select").val() : "",
        artigos: []
    };

    $(".items tr.product").each(function () {
        const row = $(this);

        documento.artigos.push({
            codigo: row.find(".view_input").eq(0).text().trim(),
            descricao: row.find(".view_input").eq(1).text().trim(),
            quantidade: row.find(".view_input").eq(2).text().trim(),
            preco: row.find(".view_input").eq(3).text().trim(),
            desconto: row.find(".view_input").eq(4).text().trim(),
            iva: row.find(".view_input").eq(5).text().trim(),
            total: row.find(".view_input").eq(6).text().trim(),
            motivo: row.find('.motivo_tax').val()
        });
    });

    try {
        const response = await fetch("/finalizar-documento-guia/", {
            method: "POST",
            headers: {
                "Content-Type": "application/json",
                "X-CSRFToken": getCookie('csrftoken')
            },
            body: JSON.stringify(documento)
        });

        const data = await response.json();

        if (response.ok && data.success) {
            window.location.href = `/faturas/ver/${data.id}/`;

            if (modal) modal.dialog("close");
        } else {
            if (btn) btn.prop("disabled", false);
            if (modal) modal.dialog("close");
            abrirModalErro(data.error || "Erro ao processar documento.");
        }

    } catch (err) {
        console.error("Erro crítico:", err);
        if (btn) btn.prop("disabled", false);
        if (modal) modal.dialog("close");
        abrirModalErro("Não foi possível comunicar com o servidor.");
    }
}

$(function () {

    $("#modal-confirmar-fecho-guia").dialog({
        autoOpen: false,
        modal: true,
        resizable: false,
        buttons: {
            "Sim, fechar": function () {
                const dialog = $(this);
                const buttons = dialog.parent().find("button");

                const cliente_id = getQueryParam("cliente");

                if (!cliente_id) {
                    abrirModalErro("Não é possível finalizar sem selecionar documento e cliente.");
                    return;
                }

                // Desativa para evitar cliques duplos
                buttons.prop("disabled", true);

                // Passamos os botões para a função para que ela os possa reativar em caso de erro
                finalizarDocumentoGuia(buttons, dialog);
            },
            "Cancelar": function () {
                $(this).dialog("close");
            }
        }
    });

});

$(function() {
    $("#tools_close_guia").on("click", function () {
        $("#modal-confirmar-fecho-guia").dialog("open");
    });
});