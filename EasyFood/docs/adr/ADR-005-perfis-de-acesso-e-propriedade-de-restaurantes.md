# ADR-005: Perfis de acesso e propriedade de restaurantes

## Contexto
O ADR-004 deixou uma limitação registrada: qualquer usuário autenticado podia cadastrar restaurantes e não havia como saber quem gerenciava o quê. Com a chegada de cardápio, fotos e avaliações, passou a ser necessário decidir **quem pode alterar cada recurso**. O ADR-004 já indicava este ponto nos critérios de revisão ("perfis de acesso, como administrador e dono de restaurante").

## Alternativas Consideradas
1. **Manter tudo aberto a qualquer usuário autenticado:** simples, mas qualquer pessoa poderia editar ou apagar o restaurante de outra.
2. **Tabela de papéis separada (RBAC completo):** flexível, mas desproporcional para três perfis fixos.
3. **Campo `role` no usuário e `ownerId` no restaurante:** poucos campos novos e fácil de verificar em cada rota.

## Decisão
Escolhemos a **opção 3**:

* `User.role` com três valores: `CUSTOMER` (padrão), `OWNER` e `ADMIN`.
* `Restaurant.ownerId` guarda o dono. Quem cadastra o primeiro restaurante passa de `CUSTOMER` a `OWNER`; um `ADMIN` mantém o perfil.
* Somente o dono altera o restaurante, o cardápio e as fotos (403 para os demais, 404 se não existir).
* `ADMIN` acessa `/admin/overview` e `/admin/restaurants` (somente leitura).
* O middleware `verifyJWT` passou a **consultar o usuário no banco** a cada requisição: um token válido de uma conta apagada recebe 401, e o perfil usado é o atual, não o do momento do login.
* `ownerId` é **opcional** no schema, para não quebrar restaurantes criados antes desta decisão (ficam sem dono).

## Justificativa
Dois campos resolvem o problema com a arquitetura em camadas existente: a checagem fica no service, e o middleware só identifica quem chama. Consultar o banco no middleware custa uma leitura por requisição, aceitável com SQLite, e evita que dados obsoletos do token concedam acesso indevido.

## Consequências Positivas
* Cada restaurante só é gerenciado pelo seu dono.
* Mudanças de perfil e exclusão de contas valem imediatamente, sem esperar o token expirar.

## Consequências Negativas
* Uma consulta ao banco por requisição autenticada.
* Restaurantes sem dono (legados) não podem ser editados por ninguém até receberem um `ownerId`, por exemplo via `npx prisma studio`.
* O primeiro `ADMIN` precisa ser criado fora da API (seed ou edição do banco).
* Um restaurante tem um único dono; não há equipe.

## Critérios de Revisão
Reavaliar se for preciso mais de um dono por restaurante, permissões mais finas dentro do mesmo restaurante ou edição de qualquer restaurante pelo `ADMIN`.
