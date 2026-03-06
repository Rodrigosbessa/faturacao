$(document).ready(function () {

    $('#btnAddArtigo').click(function () {
        limparFormularioArtigo();
        $.get('/artigos/proximo-codigo/', function (data) {
            $('#registarArtigoModal #codigo').val(data.codigo);
            $('#registarArtigoModal').fadeIn(200);
        });
    });

    $(document).on('click', '.btn-edit-artigo', function() {
        const idArtigo = $(this).data('id');

        if (typeof limparFormularioArtigo === "function") limparFormularioArtigo();

        $.get(`/artigos/${idArtigo}/dados/`, function(artigo) {
            $('#registarArtigoModal #codigo').val(artigo.codigo);
            $('#registarArtigoModal #nome').val(artigo.nome);
            $('#registarArtigoModal #descricao').val(artigo.descricao || "");
            $('#registarArtigoModal #preco').val(artigo.preco);
            $('#registarArtigoModal #taxa').val(artigo.taxa);

            $('#registarArtigoModal').fadeIn(200);
        });
    });

    $('#btnCancelarRegistar').click(function () {
        $('#registarArtigoModal').fadeOut(200);
        limparFormularioArtigo();
    });

    $(window).click(function (e) {
        if ($(e.target).is('#registarArtigoModal')) {
            $('#registarArtigoModal').fadeOut(200);
            limparFormularioArtigo();
        }

    });

});

$(document).ready(function () {

    $('#formRegistarArtigo').on('submit', function (e) {
        e.preventDefault();

        const idArtigo = $('#registarArtigoModal #codigo').val();
        const data = {
            nome: $('#registarArtigoModal #nome').val(),
            descricao: $('#registarArtigoModal #descricao').val(),
            preco: $('#registarArtigoModal #preco').val(),
            taxa: $('#registarArtigoModal #taxa').val(),
        };

        const url = idArtigo ? `/artigo/${idArtigo}/editar/` : '/artigo/adicionar/';

        $.ajax({
            url: url,
            method: 'POST',
            contentType: 'application/json',
            headers: { 'X-CSRFToken': csrftoken },
            data: JSON.stringify(data),
            success: function (resp) {
                if(resp.success){
                    alert(idArtigo ? 'Artigo atualizado com sucesso' : 'Artigo registado com sucesso');
                    $('#registarArtigoModal').fadeOut(200);
                    limparFormularioArtigo();

                    if(idArtigo) {
                        const index = artigosData.findIndex(a => a.codigo == idArtigo);
                        if(index !== -1) {
                            artigosData[index] = {
                                ...artigosData[index],
                                nome: data.nome,
                                descricao: data.descricao,
                                preco: data.preco,
                                taxa: data.taxa
                            };
                        }
                    } else {
                        artigosData.push(resp.novo_artigo);
                    }
                    location.reload();
                } else {
                    alert(resp.error);
                }
            },
            error: function () {
                alert('Erro ao comunicar com o servidor');
            }
        });
    });
});






