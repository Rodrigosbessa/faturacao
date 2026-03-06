$( function() {
    $( "#tabs" ).tabs();
} );
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
function editarCliente() {
    const btn = document.getElementById("btn-guardar-cliente");
    const idCliente = btn.getAttribute('data-id');

    if (!idCliente) {
        alert("ID do cliente não encontrado.");
        return;
    }

    btn.disabled = true;
    btn.innerHTML = '<span class="spinner"></span> A guardar...';

    const dados = {};
    document.querySelectorAll('#tabs-1 input, #tabs-1 select').forEach(el => {
        if (el.name) {
            dados[el.name] = el.value;
        }
    });

    // 2. Enviar via fetch usando o objeto 'dados'
    fetch(`/cliente/${idCliente}/editar/`, {
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
    const nifInput = document.querySelector('input[name="contribuinte"]');
    const morada1Input = document.querySelector('input[name="morada1"]');
    const morada2Input = document.querySelector('input[name="morada2"]');
    const postalInput = document.getElementById("postal");
    const telemovelInput = document.querySelector('input[name="telemovel"]');
    const countrySelect = document.getElementById("country");
    const siglaInput = document.getElementById("sigla");
    const siglaSpan = document.getElementById("sigla-text");
    const distritoInput = document.querySelector('input[name="distrito"]');
    const concelhoInput = document.querySelector('input[name="concelho"]');
    const emailInput = document.querySelector('input[name="email"]');
    const vendedorSelect = document.querySelector('select[name="vendedor"]');
    const impostosSelect = document.querySelector('select[name="impostos"]');

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

    // Importante: Se mudar o país, limpar ou revalidar o campo
    countrySelect.addEventListener("change", () => {
        nifInput.value = ""; // Opcional: limpa para evitar erros de formato
    });

    telemovelInput.addEventListener("input", () => {
        let tel = telemovelInput.value.replace(/\D/g, "");
        telemovelInput.value = tel.startsWith("351") ? tel.slice(0, 12) : tel.slice(0, 9);
    });

    countrySelect.addEventListener("change", () => {
        const sigla = countrySelect.value;
        siglaInput.value = sigla;
        if (siglaSpan) siglaSpan.textContent = sigla;
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

                distritoInput.value = formatarMaiusculas(d.Distrito);
                concelhoInput.value = formatarMaiusculas(d.Concelho);
                countrySelect.value = "PT";
                countrySelect.dispatchEvent(new Event('change'));

                if (typeof $ !== 'undefined') {
                    $(distritoInput).closest('td').find('.texto-ellipsis').text(distritoInput.value);
                    $(concelhoInput).closest('td').find('.texto-ellipsis').text(concelhoInput.value);
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
    vendedorSelect.addEventListener("change", () => {
        if (vendedorSelect.value !== "") {
            vendedorSelect.style.border = "1px solid #ccc";
        } else {
            vendedorSelect.style.border = "2px solid red";
        }
    });
    impostosSelect.addEventListener("change", () => {
        if (impostosSelect.value !== "") {
            impostosSelect.style.border = "1px solid #ccc";
            console.log("Regime de Imposto selecionado:", impostosSelect.options[impostosSelect.selectedIndex].text);
        } else {
            impostosSelect.style.border = "2px solid red";
        }
    });

    document.getElementById("btn-guardar-cliente").addEventListener("click", function() {
        nifInput.value = nifInput.value.replace(/\D/g, "");
        const nif = nifInput.value;
        if (nif.length > 0 && nif.length < 9 && nif !== "999999990") {
            alert("Erro AT: O NIF deve ter 9 dígitos."); nifInput.focus(); return;
        }

        let m1 = morada1Input.value.replace(/[<>]/g, "").trim();
        if (m1.length < 5) { alert("Erro AT: Morada 1 insuficiente."); morada1Input.focus(); return; }

        const cp = postalInput.value.trim();
        if (cp && m1.includes(cp)) m1 = m1.replace(cp, "").trim();
        morada1Input.value = formatarTitulo(m1);
        morada2Input.value = formatarTitulo(morada2Input.value.trim());

        distritoInput.value = distritoInput.value.replace(/[<>]/g, "").trim();
        concelhoInput.value = concelhoInput.value.replace(/[<>]/g, "").trim()
        if (!countrySelect.value) { alert("Erro AT: Selecione o País."); return; }
        if (distritoInput.value.length < 2 || concelhoInput.value.length < 2) {
            alert("Erro AT: Distrito e Concelho obrigatórios."); return;
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
            { name: 'morada1', label: 'Morada 1' },
            { name: 'codigo_postal', label: 'Código Postal' },
            { name: 'pais', label: 'País' },
            { name: 'distrito', label: 'Distrito' },
            { name: 'concelho', label: 'Concelho' },
            { name: 'vendedor', label: 'Vendedor' },
            { name: 'impostos', label: 'Regime de Impostos' }
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

        if (typeof editarCliente === "function") {
            editarCliente();
        } else {
            console.log("Validação OK. Chamar submissão.");
        }
    });
});
$(document).ready(function() {
    $('.btn-edit').on('click', function() {
        const $td = $(this).closest('td');

        $td.find('.valor-container').hide();
        // Tenta encontrar um select ou um input dentro desta célula
        const $field = $td.find('.edit-select, .edit-input');
        $field.show().focus();
    });

    // Quando o campo (select ou input) perder o foco
    $(document).on('blur change', '.edit-select, .edit-input', function() {
        const $field = $(this);
        const $td = $field.closest('td');

        // Se for select, pega o texto da opção; se for input, pega o valor
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
    const siglaInicial = $spanPais.text().trim().toUpperCase();

    function carregarPaises(siglaParaSelecionar) {
        fetch("https://restcountries.com/v3.1/all?fields=name,cca2")
            .then(res => res.json())
            .then(data => {
                // Ordenar por nome comum
                data.sort((a, b) => a.name.common.localeCompare(b.name.common));

                let optionsHtml = '<option value="">Selecione um país...</option>';
                let nomePorExtensoencontrado = "";

                data.forEach(c => {
                    const isSelected = c.cca2 === siglaParaSelecionar;
                    if (isSelected) {
                        nomePorExtensoencontrado = c.name.common;
                    }

                    optionsHtml += `<option value="${c.cca2}" ${isSelected ? 'selected' : ''}>
                        ${c.name.common}
                    </option>`;
                });

                // Preenche o Select
                countrySelect.innerHTML = optionsHtml;

                // --- O PONTO CHAVE ---
                // Se encontrarmos o nome correspondente à sigla, atualizamos o span
                if (nomePorExtensoencontrado) {
                    $spanPais.text(nomePorExtensoencontrado);
                }
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
                    $('input[name="distrito"]').val(d.Distrito).closest('td').find('.texto-ellipsis').text(d.Distrito);
                    $('input[name="concelho"]').val(d.Concelho).closest('td').find('.texto-ellipsis').text(d.Concelho);

                    // Seleciona Portugal no Select e dispara o change para o span mudar para "Portugal"
                    $(countrySelect).val("PT").trigger('change');
                });
        });
    }
    carregarPaises(siglaInicial);
});
document.addEventListener('click', function(e) {
    const linha = e.target.closest('.factura-linha');

    if (linha) {
        // 2. Extrai o ID que guardámos no data-id
        const id = linha.getAttribute('data-id');

        if (id) {
            // 3. Redireciona
            window.location.href = `/faturas/ver/${id}/`;
        }
    }
});

$(document).ready(function() {
    $('#modal-emitir-recibo').dialog({
        autoOpen: false,
        modal: true,
        width: 400,
        resizable: false,
        draggable: true
    });

    $('#btnEmitirRecibo').on('click', function(e) {
        e.preventDefault();
        var saldoTexto = $('#valor-divida-real').text().replace('€', '').trim();
        var saldoNumerico = parseFloat(saldoTexto.replace(',', '.'));

        if (saldoNumerico <= 0) {
            alert("Este cliente não tem valores em dívida.");
            return;
        }

        // Preenche o modal com a dívida real
        $('#display-total-acumulado').text(saldoTexto);
        $('#valor_recibo').val(saldoNumerico.toFixed(2));

        $('#modal-emitir-recibo').dialog('open');
    });

    // 3. Fechar modal
    $('#btnCancelarRecibo').on('click', function() {
        $('#modal-emitir-recibo').dialog('close');
    });

    // 4. Confirmar e Enviar para o Servidor
    $('#btnConfirmarRecibo').on('click', function(e) {
        e.preventDefault();

        const $btn = $(this);
        const urlAcao = $btn.data('url');
        const token = $btn.data('csrf');

        const valor = $('#valor_recibo').val();
        const metodo = $('#metodo_pagamento').val();

        if (!valor || valor <= 0) {
            alert("Por favor, insira um valor válido.");
            return;
        }
        if (!metodo) {
            alert("Selecione um método de pagamento.");
            return;
        }

        $btn.prop('disabled', true).text('A processar...');

        $.ajax({
            url: urlAcao,
            type: 'POST',
            data: {
                'valor': valor,
                'metodo': metodo
            },
            headers: {
                'X-CSRFToken': token
            },
            success: function(response) {
                alert("Recibo emitido com sucesso!");
                window.location.reload();
            },
            error: function(xhr) {
                const msg = xhr.responseJSON ? xhr.responseJSON.error : "Erro crítico no servidor.";
                alert("Erro: " + msg);

                // Reativa o botão em caso de erro
                $btn.prop('disabled', false).text('Confirmar e Emitir');
            }
        });
    });
});