$(function() {
    
    $("#tabs").tabs();

    

    
    $('.col_data').on('click', function(e) {
        
        if ($(this).find('.edit-input, .edit-select').is(':visible')) return;

        const $td = $(this);
        const $container = $td.find('.valor-container');
        const $field = $td.find('.edit-input, .edit-select');

        if ($field.length > 0) {
            $container.hide();
            $field.show().focus();
        }
    });

    
    $(document).on('blur change', '.edit-input, .edit-select', function() {
        const $field = $(this);
        const $td = $field.closest('td');
        const $container = $td.find('.valor-container');
        const $textSpan = $td.find('.texto-ellipsis');

        let novoTexto = "";

        if ($field.is('select')) {
            novoTexto = $field.find('option:selected').text();
        } else {
            novoTexto = $field.val();
            
            if ($field.attr('name') === 'preco' && novoTexto) novoTexto += " €";
            if ($field.attr('name') === 'taxa' && novoTexto) novoTexto += "%";
        }

        if (novoTexto.trim() !== "") {
            $textSpan.text(novoTexto);
        }

        $field.hide();
        $container.show();
    });

    
    $(document).on('click', '.edit-input, .edit-select', function(e) {
        e.stopPropagation();
    });


    

    document.getElementById("btn-guardar-cliente").addEventListener("click", function() {
        
        let nome = document.querySelector('[name="nome"]').value.trim();
        let descricao = document.querySelector('[name="descricao"]').value.trim();
        let tipo = document.querySelector('[name="tipo"]').value;
        let taxa = document.querySelector('[name="taxa"]').value;
        let preco = document.querySelector('[name="preco"]').value;

        
        if(nome === ""){ alert("O nome do produto é obrigatório."); return; }
        if(tipo === ""){ alert("Selecione o tipo de produto."); return; }

        if(taxa !== "" && (isNaN(taxa.replace('%','')) || taxa < 0 || taxa > 100)){
            alert("Taxa de IVA inválida."); return;
        }

        
        let formData = new FormData();
        formData.append('nome', nome);
        formData.append('descricao', descricao);
        formData.append('tipo', tipo);
        formData.append('taxa', taxa);
        formData.append('preco', preco);

        let url = (typeof idArtigo !== 'undefined' && idArtigo !== "")
                  ? `/artigo/${idArtigo}/editar/`
                  : '/artigo/adicionar/';

        fetch(url, {
            method: 'POST',
            body: formData,
            headers: {
                'X-CSRFToken': getCookie('csrftoken')
            },
        })
        .then(response => response.json())
        .then(data => {
            if(data.success){
                alert("Artigo guardado com sucesso!");
                window.location.reload();
            } else {
                alert("Erro: " + (data.errors ? data.errors.join("\n") : "Erro desconhecido"));
            }
        })
        .catch(error => {
            console.error(error);
            alert("Erro de conexão.");
        });
    });
});

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