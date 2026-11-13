# ADR-006: A nota do restaurante vem das avaliações dos clientes

## Contexto
Na versão inicial, o dono digitava a nota do próprio restaurante no cadastro (`rating` de 0 a 5). Qualquer um podia cadastrar um restaurante com 5 estrelas, então a nota exibida não tinha significado.

## Alternativas Consideradas
1. **Manter a nota no cadastro, apenas validando de 0 a 5:** corrige valores inválidos, mas o dono continua se dando a nota que quiser.
2. **Esconder a nota na tela:** não resolve o problema, o restaurante nunca teria nota.
3. **Avaliações dos clientes, com a média gravada em `Restaurant.rating`:** a nota passa a ter significado e a API continua devolvendo `rating`.

## Decisão
Escolhemos a **opção 3**, com o módulo `src/modules/reviews/` (routes, controller e service) e a tabela `Review`:

* `POST /restaurants/:restaurantId/reviews` com `{ "rating": 1..5 }` cria ou troca a nota do usuário logado.
* `GET /restaurants/:restaurantId/reviews/me` devolve a nota que o usuário já deu (para acender as estrelas).
* **Uma avaliação por usuário por restaurante** (`@@unique([userId, restaurantId])`): avaliar de novo troca a nota.
* O dono **não** avalia o próprio restaurante (403). A nota é um inteiro de 1 a 5; qualquer outro valor devolve 400.
* A gravação da avaliação e o recálculo da média acontecem na **mesma transação**, com uma casa decimal.
* O `POST /restaurants` **ignora** o `rating` do corpo: todo restaurante nasce com 0 e aparece como **Novo** até a primeira avaliação.
* `GET /restaurants` passa a devolver também `reviewsCount`.
* A migration zera a nota dos restaurantes já cadastrados, pois eram valores digitados pelos donos.

## Justificativa
A média é gravada no restaurante para que a listagem continue sendo uma única consulta. A transação evita que a média fique fora de sincronia com as avaliações.

## Consequências Positivas
* A nota reflete a opinião dos clientes e não pode ser definida pelo dono.
* A API mantém o campo `rating`, então quem lê a listagem não precisa mudar.

## Consequências Negativas
* Dado derivado gravado: se alguém alterar `Review` direto no banco, a média só se corrige na próxima avaliação.
* O formulário de cadastro perdeu o campo "Nota", mudança visível em relação à versão inicial.
* Não há proteção contra contas falsas criadas só para avaliar.

## Critérios de Revisão
Reavaliar se forem adicionados comentários nas avaliações, moderação, ou se a média precisar ser calculada na leitura.
