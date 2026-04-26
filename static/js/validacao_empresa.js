document.addEventListener("DOMContentLoaded", () => {
    const countrySelect = document.getElementById("id_pais"); 

    const $spanPais = $(countrySelect).closest('div').find('.texto-ellipsis');

    function carregarPaises(siglaParaSelecionar) {
        fetch("https://restcountries.com/v3.1/all?fields=name,cca2")
            .then(res => res.json())
            .then(data => {
                data.sort((a, b) => a.name.common.localeCompare(b.name.common));

                
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
    
    const postalInput = document.getElementById("id_codigo_postal"); 
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

                    
                    if (cidadeInput) {
                        cidadeInput.value = d.Localidade;
                    }

                    
                    if (paisInput) {
                        paisInput.value = "PT";
                    }

                    console.log("Dados preenchidos com sucesso!");
                })
                .catch(err => console.error("Erro na API:", err));
        });
    }
});