import codecs

# Lê o ficheiro original com a codificação utf-8-sig (o 'sig' ignora o BOM automaticamente)
with codecs.open('backup_limpo.json', 'r', 'utf-8-sig') as f:
    conteudo = f.read()

# Grava um novo ficheiro 'final.json' garantindo que é UTF-8 puro
with codecs.open('final.json', 'w', 'utf-8') as f:
    f.write(conteudo)

print("Ficheiro 'final.json' criado com sucesso sem o BOM!")