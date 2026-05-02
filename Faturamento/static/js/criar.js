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
document.querySelectorAll('.edit-input, .edit-select').forEach(el => {
    el.addEventListener("input", () => el.style.border = "");
    el.addEventListener("change", () => el.style.border = "");
});
document.addEventListener("DOMContentLoaded", () => {
    const siglaInput = document.getElementById("sigla");
    const siglaSpan = document.getElementById("sigla-text");
    const countrySelect = document.getElementById("country");
    const distritoInput = document.querySelector('input[name="distrito"]');
    const concelhoInput = document.querySelector('input[name="concelho"]');
    const postalInput = document.getElementById("postal");

    const clientePaisAtual = "{{ cliente.pais }}".trim();

    
    fetch("https://restcountries.com/v3.1/all?fields=name,cca2")
        .then(res => res.json())
        .then(data => {
            data.sort((a, b) => a.name.common.localeCompare(b.name.common));
            countrySelect.innerHTML = '<option value="">Selecione o país</option>';

            data.forEach(c => {
                const option = document.createElement("option");
                option.value = c.cca2;
                option.textContent = c.name.common;

                if(c.name.common === clientePaisAtual || c.cca2 === clientePaisAtual) {
                    option.selected = true;
                    
                    siglaInput.value = c.cca2;
                    if(siglaSpan) siglaSpan.textContent = c.cca2;
                }
                countrySelect.appendChild(option);
            });
        });

    
    countrySelect.addEventListener("change", () => {
        const sigla = countrySelect.value;
        siglaInput.value = sigla;
        if(siglaSpan) siglaSpan.textContent = sigla;
    });

    postalInput.addEventListener("blur", () => {
        const postal = postalInput.value.replace(/\D/g, "").trim();
        if(postal.length < 7) return;

        
        const loadingEl = document.getElementById("loading-postal");
        if(loadingEl) loadingEl.style.display = "block";

        const appId = "ptapi693b74384109f7.12233290";

        fetch(`https://api.duminio.com/ptcp/v2/${appId}/${postal}`)
            .then(res => res.json())
            .then(data => {
                if(!data || data.length === 0) return;

                const d = data[0];
                distritoInput.value = d.Distrito;
                $(distritoInput).closest('td').find('.texto-ellipsis').text(d.Distrito);

                concelhoInput.value = d.Concelho;
                $(concelhoInput).closest('td').find('.texto-ellipsis').text(d.Concelho);

                countrySelect.value = "PT";
                siglaInput.value = "PT";
                if(siglaSpan) siglaSpan.textContent = "PT";
                $(countrySelect).closest('td').find('.texto-ellipsis').text("Portugal");
            })
            .catch(err => console.error("Erro:", err))
            .finally(() => {
                
                if(loadingEl) loadingEl.style.display = "none";
            });
    });
});

document.querySelectorAll('.edit-input, .edit-select').forEach(el => {
    el.addEventListener("input", () => el.style.border = "");
    el.addEventListener("change", () => el.style.border = "");
});
document.addEventListener("DOMContentLoaded", () => {
    const nomeInput = document.querySelector('input[name="nome"]');
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

    nomeInput.addEventListener("blur", () => {
        let valor = nomeInput.value.trim().replace(/\s+/g, " ");
        if (valor) {
            nomeInput.value = formatarTitulo(valor);
        }
    });

    nomeInput.addEventListener("input", () => {
        const nome = nomeInput.value.trim();
        if (nome.length >= 3) {
            const novaSigla = nome.substring(0, 3).toUpperCase();
            siglaInput.value = novaSigla;
            if (siglaSpan) siglaSpan.textContent = novaSigla;
        }
    });
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
            { name: 'nome', label: 'Nome' },
            { name: 'morada1', label: 'Morada 1' },
            { name: 'codigo_postal', label: 'Código Postal' },
            { name: 'pais', label: 'País' },
            { name: 'distrito', label: 'Distrito' },
            { name: 'concelho', label: 'Concelho' },
            { name: 'vendedor', label: 'Vendedor' },
            { name: 'impostos', label: 'Regime de Impostos' }
        ];

        for (let campo of obrigatorios) {
            let el = document.querySelector(`input[name="${campo.name}"], select[name="${campo.name}"]`);

            if (el) {
                let valor = el.value.trim();
                if (valor === "" || valor === "---") {
                    alert(`Erro AT: O campo [${campo.label}] é obrigatório.`);

                    const $td = $(el).closest('td');
                    $td.find('.valor-container').hide();
                    $(el).show().focus();

                    el.style.border = "2px solid red";
                    return;
                }
            }
        }

        if (countrySelect.value === "PT" && nif.length > 0 && nif.length !== 9) {
            alert("Erro AT: Um NIF português tem de ter exatamente 9 dígitos.");
            nifInput.focus();
            return;
        }

        if (typeof adicionarCliente === "function") {
            adicionarCliente();
        } else {
            console.log("Validação OK. Chamar submissão.");
        }
    });
});

async function adicionarCliente() {
    const btn = document.getElementById("btn-guardar-cliente");


    if (btn) {
        btn.disabled = true;
        btn.innerHTML = '<i class="fas fa-spinner fa-spin"></i> A criar...';
    }

    const dados = {};


    document.querySelectorAll('input, select').forEach(el => {
        if (el.name) {
            dados[el.name] = el.type === 'checkbox' ? el.checked : el.value.trim();
        }
    });

    try {
        const response = await fetch('/cliente/adicionar/', {
            method: 'POST',
            headers: {
                'X-CSRFToken': getCookie('csrftoken'),
                'Content-Type': 'application/json',
                'X-Requested-With': 'XMLHttpRequest'
            },
            body: JSON.stringify(dados)
        });

        const data = await response.json();
        if (data.success || data.status === 'success') {
            alert(data.message || "Cliente adicionado com sucesso!");

            if (data.redirect_url) {
                window.location.href = data.redirect_url;
            } else {
                window.location.reload();
            }
        } else {
            throw new Error(data.message || data.error || "Erro ao adicionar cliente.");
        }

    } catch (error) {
        alert(error.message);
        if (btn) {
            btn.disabled = false;
            btn.innerHTML = '<i class="fas fa-plus"></i> Adicionar Cliente';
        }
    }
}
$(document).ready(function() {

    $('.col_data').on('click', function() {
        const $td = $(this);
        const $container = $td.find('.valor-container');


        if ($container.is(':visible')) {
            $container.hide();
            const $field = $td.find('.edit-select, .edit-input');
            $field.show().focus();
        }
    });


    $('.edit-input, .edit-select').on('click', function(e) {
        e.stopPropagation();
    });
});
$(document).ready(function() {
    $('.btn-edit').on('click', function(e) {
        e.stopPropagation();
        const $td = $(this).closest('td');
        $td.find('.valor-container').hide();
        const $field = $td.find('.edit-select, .edit-input');
        $field.show().focus();
    });

    $(document).on('blur change', '.edit-select, .edit-input', function() {
        const $field = $(this);
        const $td = $field.closest('td');

        let novoTexto = "";
        if ($field.is('select')) {
            novoTexto = $field.find('option:selected').text();
        } else {
            novoTexto = $field.val();
        }

        if ($field.attr('name') === 'nome' && (!novoTexto || novoTexto.trim() === "")) {
            return;
        }

        $td.find('.texto-ellipsis').text(novoTexto || "---");
        $field.hide();
        $td.find('.valor-container').show();
    });
});


document.addEventListener("DOMContentLoaded", () => {
    const countrySelect = document.getElementById("country");
    const $spanPais = $(countrySelect).closest('td').find('.texto-ellipsis');
    const siglaHidden = document.getElementById("sigla")?.value;
    const siglaInicial = (siglaHidden || $spanPais.text().trim()).toUpperCase();

    function carregarPaises(siglaParaSelecionar) {
        fetch("https://restcountries.com/v3.1/all?fields=name,cca2")
            .then(res => res.json())
            .then(data => {

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


                countrySelect.innerHTML = optionsHtml;



                if (nomePorExtensoencontrado) {
                    $spanPais.text(nomePorExtensoencontrado);
                }
            })
            .catch(err => console.error("Erro ao carregar países:", err));
    }


    $(countrySelect).on('change', function() {
        const nomeCompleto = $(this).find('option:selected').text().trim();
        const codigoCca2 = $(this).val(); // Ex: "PT"

        if (codigoCca2 !== "") {
            $spanPais.text(nomeCompleto);
            $('#sigla').val(codigoCca2);
            $('#sigla-text').text(codigoCca2);
        }
    });


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


                    $('input[name="distrito"]').val(d.Distrito).closest('td').find('.texto-ellipsis').text(d.Distrito);
                    $('input[name="concelho"]').val(d.Concelho).closest('td').find('.texto-ellipsis').text(d.Concelho);


                    $(countrySelect).val("PT").trigger('change');
                });
        });
    }
    carregarPaises(siglaInicial);
});
