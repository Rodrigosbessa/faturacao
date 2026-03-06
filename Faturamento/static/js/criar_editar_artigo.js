$( function() {
    $( "#tabs" ).tabs();
} );

document.getElementById("btn-guardar-cliente").addEventListener("click", function() {

    let nome = document.querySelector('[name="nome"]').value.trim();
    let descricao = document.querySelector('[name="descricao"]').value.trim();
    let tipo = document.querySelector('[name="tipo"]').value;
    let taxa = document.querySelector('[name="taxa"]').value;
    let preco = document.querySelector('[name="preco"]').value;

    if(nome === ""){
        alert("O nome do produto é obrigatório.");
        return;
    }

    if(tipo === ""){
        alert("Selecione o tipo de produto.");
        return;
    }

    if(taxa !== "" && (isNaN(taxa) || taxa < 0 || taxa > 100)){
        alert("Taxa de IVA inválida.");
        return;
    }

    if(preco !== "" && (isNaN(preco) || preco < 0)){
        alert("Preço inválido.");
        return;
    }

    let pathParts = window.location.pathname.split('/');
    let id_artigo = pathParts[pathParts.indexOf('artigo') + 1];

    // monta os dados para enviar
    let formData = new FormData();
    formData.append('nome', nome);
    formData.append('descricao', descricao);
    formData.append('tipo', tipo);
    formData.append('taxa', taxa);
    formData.append('preco', preco);

    // envia via fetch POST
    fetch(`/artigo/${id_artigo}/editar/`, {
        method: 'POST',
        body: formData,
        headers: {
            'X-CSRFToken': getCookie('csrftoken')
        },
    })
    .then(response => response.json().then(data => ({status: response.status, body: data})))
    .then(res => {
        if(res.status === 200 && res.body.success){
            alert("Artigo atualizado com sucesso!");
        } else if(res.body.errors){
            alert("Erros:\n" + res.body.errors.join("\n"));
        } else {
            alert("Erro inesperado ao enviar os dados.");
        }
    })
    .catch(error => {
        console.error(error);
        alert("Erro de conexão ao enviar os dados.");
    });

});

function getCookie(name) {
    let cookieValue = null;
    if (document.cookie && document.cookie !== '') {
        const cookies = document.cookie.split(';');
        for (let i = 0; i < cookies.length; i++) {
            const cookie = cookies[i].trim();
            // verifica se o cookie começa com o nome
            if (cookie.substring(0, name.length + 1) === (name + '=')) {
                cookieValue = decodeURIComponent(cookie.substring(name.length + 1));
                break;
            }
        }
    }
    return cookieValue;
}
