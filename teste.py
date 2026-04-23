import codecs

with codecs.open('backup_limpo.json', 'r', 'utf-8-sig') as f:
    conteudo = f.read()

with codecs.open('final.json', 'w', 'utf-8') as f:
    f.write(conteudo)

print("Ficheiro 'final.json' criado com sucesso sem o BOM!")