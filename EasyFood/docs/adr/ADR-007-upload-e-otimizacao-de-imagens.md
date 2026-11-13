# ADR-007: Upload e otimização de imagens

## Contexto
O sistema passou a ter fotos de perfil, capas de restaurantes e fotos de pratos. Era preciso decidir onde guardar os arquivos e como evitar imagens enormes, formatos inesperados e arquivos que não são imagens.

## Alternativas Consideradas
1. **Guardar a imagem no banco (BLOB):** simples, mas incha o SQLite e dificulta o cache.
2. **Serviço externo (S3, Cloudinary):** escalável, mas exige conta, chaves e dependência externa desproporcionais ao estágio atual.
3. **Arquivos em disco (`uploads/`) e só o caminho no banco:** simples e servido pelo próprio Express.

## Decisão
Escolhemos a **opção 3**, com um serviço compartilhado (`src/lib/imageService.js`) usado pelos três módulos:

* O **Multer** recebe o arquivo em memória (máximo de 5 MB, apenas JPEG, PNG ou WebP).
* O **Sharp** valida que é imagem de verdade (o tipo informado pelo cliente pode mentir), corrige a rotação EXIF, redimensiona (perfil 400x400, capa 1200x600, prato 800x600) e converte para WebP.
* O arquivo recebe nome aleatório (UUID) e fica em `uploads/<pasta>/`, servido em `/uploads`. O banco guarda apenas o caminho público.
* **Troca de imagem:** salva a nova, grava o caminho no banco e só então apaga a antiga. Se o banco falhar, a nova é descartada e a antiga permanece.
* Remover a imagem limpa o banco primeiro e depois apaga o arquivo. Caminhos fora de `/uploads` são ignorados (proteção contra path traversal).
* As rotas exigem token **antes** de ler o arquivo, e só o dono do registro altera a imagem. Itens sem foto mostram uma arte gerada no frontend.

## Justificativa
Guardar só o caminho mantém o banco pequeno, e converter tudo para WebP reduz o tamanho. Um serviço único evita repetir validação e limpeza em cada módulo.

## Consequências Positivas
* Imagens leves, em formato único e nomes imprevisíveis.
* Nenhum arquivo órfão quando o banco falha.

## Consequências Negativas
* O disco do servidor passa a fazer parte do estado da aplicação: a pasta `uploads/` precisa de backup e não funciona em hospedagens com disco efêmero.
* O Sharp usa binários nativos, que precisam ser baixados no `npm install`.
* Sem antivírus nem moderação do conteúdo enviado.

## Critérios de Revisão
Reavaliar ao hospedar em mais de uma instância ou em plataforma sem disco persistente, quando um armazenamento externo (S3 ou similar) será necessário.
