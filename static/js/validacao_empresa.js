document.addEventListener('DOMContentLoaded', function() {
    const form = document.querySelector('form');
    const nifInput = document.getElementById('id_nif');

    function validarNIF(nif) {
        if (nif.length !== 9) return false;

        const primeiroDigito = nif.charAt(0);
        let total = 0;
        for (let i = 0; i < 8; i++) {
            total += parseInt(nif.charAt(i)) * (9 - i);
        }
        let resto = total % 11;
        let digitoControlo = (resto === 0 || resto === 1) ? 0 : 11 - resto;

        return digitoControlo === parseInt(nif.charAt(8));
    }

    form.addEventListener('submit', function(event) {
        let valid = true;

        // Validar NIF
        if (!validarNIF(nifInput.value)) {
            alert('NIF inválido para o formato Português.');
            nifInput.focus();
            valid = false;
        }

        const cpInput = document.getElementById('id_codigo_postal');
        const cpRegex = /^\d{4}-\d{3}$/;
        if (!cpRegex.test(cpInput.value)) {
            alert('Código Postal inválido. Use o formato XXXX-XXX');
            cpInput.focus();
            valid = false;
        }

        if (!valid) {
            event.preventDefault();
        }
    });
});

document.addEventListener("DOMContentLoaded", () => {
    const countrySelect = document.getElementById("id_pais"); // Corrigido para o ID do Django

    const $spanPais = $(countrySelect).closest('div').find('.texto-ellipsis');

    function carregarPaises(siglaParaSelecionar) {
        fetch("https://restcountries.com/v3.1/all?fields=name,cca2")
            .then(res => res.json())
            .then(data => {
                data.sort((a, b) => a.name.common.localeCompare(b.name.common));

                // Montar o select com o formato [Valor: Código, Texto: Nome]
                let optionsHtml = '<option value="">Selecione um país...</option>';

                data.forEach(c => {
                    const isSelected = c.cca2 === siglaParaSelecionar;
                    optionsHtml += `<option value="${c.cca2}" ${isSelected ? 'selected' : ''}>
                        ${c.name.common}
                    </option>`;
                });

                countrySelect.innerHTML = optionsHtml;
            });
    }

    $(countrySelect).on('change', function() {
        const nomeCompleto = $(this).find('option:selected').text().trim();
        $spanPais.text(nomeCompleto);
    });

    carregarPaises("PT");
});
document.addEventListener("DOMContentLoaded", () => {
    // Campos do formulário Django
    const postalInput = document.getElementById("id_codigo_postal"); // ID gerado pelo Django
    const cidadeInput = document.getElementById("id_cidade");
    const paisInput = document.getElementById("id_pais");

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

                    // Preencher Cidade (Localidade)
                    if (cidadeInput) {
                        cidadeInput.value = d.Localidade;
                    }

                    // Preencher País
                    if (paisInput) {
                        paisInput.value = "PT";
                    }

                    console.log("Dados preenchidos com sucesso!");
                })
                .catch(err => console.error("Erro na API:", err));
        });
    }
});