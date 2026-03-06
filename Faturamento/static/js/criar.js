$( function() {
    $( "#tabs" ).tabs();
} );
document.addEventListener("DOMContentLoaded", () => {
    const siglaInput = document.getElementById("sigla");
    const siglaSpan = document.getElementById("sigla-text");
    const countrySelect = document.getElementById("country");
    const distritoInput = document.querySelector('input[name="distrito"]');
    const concelhoInput = document.querySelector('input[name="concelho"]');
    const postalInput = document.getElementById("postal");

    const clientePaisAtual = "{{ cliente.pais }}".trim();

    // --- 1. Preencher países ---
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
                    // Inicializa a sigla se já houver país
                    siglaInput.value = c.cca2;
                    if(siglaSpan) siglaSpan.textContent = c.cca2;
                }
                countrySelect.appendChild(option);
            });
        });

    // --- 2. Sincronizar Sigla ---
    countrySelect.addEventListener("change", () => {
        const sigla = countrySelect.value;
        siglaInput.value = sigla;
        if(siglaSpan) siglaSpan.textContent = sigla;
    });

    postalInput.addEventListener("blur", () => {
        const postal = postalInput.value.replace(/\D/g, "").trim();
        if(postal.length < 7) return;

        // 1. MOSTRAR O LOADING
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
                // 2. ESCONDER O LOADING (quer a API funcione ou dê erro)
                if(loadingEl) loadingEl.style.display = "none";
            });
    });
});

document.querySelectorAll('.edit-input, .edit-select').forEach(el => {
    el.addEventListener("input", () => el.style.border = "");
    el.addEventListener("change", () => el.style.border = "");
});
document.addEventListener("DOMContentLoaded", () => {
    // --- 1. Referências aos Elementos ---
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


    nifInput.addEventListener("input", () => {
        const pais = countrySelect.value;

        if (pais === "PT") {
            // Se for Portugal: apenas números e máximo 9
            nifInput.value = nifInput.value.replace(/\D/g, "").slice(0, 9);
        } else {
            // Se for estrangeiro: permite letras e números (alfanumérico) e até 12
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
        let nome = nomeInput.value.replace(/[<>]/g, "").trim();
        nome = formatarTitulo(nome);
        nomeInput.value = nome;
        if (nome.length === 0) { alert("Erro AT: Nome obrigatório."); nomeInput.focus(); return; }

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
        // Validação Localização
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

        if (typeof enviarFormulario === "function") {
            enviarFormulario();
        } else {
            console.log("Validação OK. Chamar submissão.");
        }
    });
});

function enviarFormulario() {
    const formData = new FormData();
    // Captura todos os campos
    document.querySelectorAll('input, select').forEach(el => {
        if (el.name) formData.append(el.name, el.value);
    });

    const csrftoken = getCookie('csrftoken');

    fetch('/cliente/adicionar/', {
        method: 'POST',
        headers: { 'X-CSRFToken': csrftoken, 'X-Requested-With': 'XMLHttpRequest' },
        body: formData
    })
    .then(response => response.json()) // Extrai o JSON
    .then(data => {
        if (data.status === 'success') {
            alert(data.message);
            // Em vez de recarregar, navega para a página de detalhes
            if (data.redirect_url) {
                window.location.href = data.redirect_url;
            } else {
                window.location.reload();
            }
        } else {
            alert("Erro no servidor: " + data.message);
        }
    })
    .catch(error => console.error('Erro:', error));
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