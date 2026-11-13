# EasyFood

API e frontend para cadastro, cardápio e avaliação de restaurantes, com **autenticação via JWT**. A listagem de restaurantes e dos cardápios é pública; cadastrar restaurantes, montar o cardápio, enviar fotos e avaliar exige login.

Projeto desenvolvido para a disciplina de **Software Architecture & Design Patterns**.

## O que o sistema faz

* **Visitante:** vê restaurantes (com busca, filtro por categoria, ordenação e favoritos) e o cardápio de cada um.
* **Cliente:** cria conta, avalia restaurantes de 1 a 5 estrelas (a nota do restaurante é a média) e tem foto de perfil.
* **Proprietário** (quem cadastra um restaurante): edita os dados, envia a capa, monta o cardápio com fotos, marca pratos como indisponíveis, desativa ou exclui o restaurante. Vê um painel com seus números.
* **Administrador:** vê indicadores gerais e todos os restaurantes.

## Tecnologias

| Camada | Tecnologia |
|---|---|
| Servidor | Node.js (ES Modules) e Express 5 |
| Banco de dados | SQLite com Prisma ORM |
| Autenticação | JWT (`jsonwebtoken`) e hash de senhas com `bcrypt` |
| Imagens | `multer` (upload) e `sharp` (otimização para WebP) |
| E-mail (opcional) | MailerSend |
| Configuração | Variáveis de ambiente com `dotenv` |
| Frontend | HTML, CSS e JavaScript puros (pasta `public/`) |

## Pré-requisitos

* [Node.js](https://nodejs.org/) 18 ou superior
* npm (já vem com o Node.js)

## Como rodar

```bash
# 1. Instale as dependências
npm install

# 2. Crie o arquivo de ambiente a partir do modelo
#    Linux/macOS:
cp .env.example .env
#    Windows (PowerShell):
Copy-Item .env.example .env

# 3. Edite o .env e defina um JWT_SECRET (veja a seção abaixo)

# 4. Crie o banco e as tabelas
npx prisma migrate dev

# 5. (Opcional) Popule o banco com usuários, restaurantes, cardápios e avaliações de exemplo
npx prisma db seed

# 6. Inicie o servidor
npm start
```

Depois, acesse **http://localhost:3000** no navegador.

> **Importante:** abra a página pelo endereço acima. Abrir o `index.html` direto do disco (`file:///...`) faz o navegador bloquear parte das chamadas à API.

Para desenvolvimento, com reinício automático a cada alteração:

```bash
npm run dev
```

### Usuários de exemplo (após o seed)

Senha de todos: `123456` (ou o valor de `SEED_PASSWORD`). **Só para desenvolvimento**: o seed não roda com `NODE_ENV=production`.

| E-mail | Perfil |
|---|---|
| `admin@easyfood.com` | Administrador |
| `dono@easyfood.com` | Proprietário (dono dos 3 restaurantes de exemplo) |
| `maria@easyfood.com`, `joao@easyfood.com` | Clientes |

## Variáveis de ambiente

Crie o arquivo `.env` na raiz do projeto (o `.env.example` serve de modelo):

| Variável | Obrigatória | Descrição |
|---|---|---|
| `DATABASE_URL` | Sim | Caminho do banco SQLite, relativo à pasta `prisma/`. Exemplo: `file:./dev.db` |
| `JWT_SECRET` | Sim | Chave usada para assinar os tokens (use 32 caracteres ou mais). O servidor não inicia sem ela |
| `PORT` | Não | Porta do servidor (padrão: `3000`) |
| `MAILER_API` e `DOMAIN_MAIL` | Não | Habilitam o e-mail de boas-vindas ao cadastrar restaurante. Sem eles, nenhum e-mail é enviado |
| `SEED_PASSWORD` | Não | Senha dos usuários criados pelo seed (padrão: `123456`) |

Para gerar uma chave aleatória para o `JWT_SECRET`:

```bash
node -e "console.log(require('crypto').randomBytes(48).toString('hex'))"
```

O arquivo `.env` **não deve ser versionado nem enviado**: ele já está no `.gitignore`.

## Endpoints

Rotas protegidas exigem o header `Authorization: Bearer <token>`.

### Autenticação

| Método | Rota | Acesso | Descrição |
|---|---|---|---|
| `POST` | `/auth/register` | Público | Cria um usuário (nome 2–150, e-mail válido, senha 6–72) |
| `POST` | `/auth/login` | Público | Autentica e devolve `{ token, user }` |
| `GET` | `/auth/me` | Protegido | Devolve o usuário logado |
| `POST` | `/auth/me/image` | Protegido | Envia a foto de perfil (campo `image`) |
| `DELETE` | `/auth/me/image` | Protegido | Remove a foto de perfil |

### Restaurantes

| Método | Rota | Acesso | Descrição |
|---|---|---|---|
| `GET` | `/restaurants` | Público | Lista os restaurantes ativos, com `rating` e `reviewsCount` |
| `POST` | `/restaurants` | Protegido | Cadastra restaurante (`name`, `category`); quem cadastra vira o dono |
| `GET` | `/restaurants/mine` | Protegido | Restaurantes do usuário (inclui desativados) |
| `GET` | `/restaurants/dashboard` | Protegido | Números do painel do proprietário |
| `PUT` | `/restaurants/:restaurantId` | Dono | Edita nome, categoria, descrição, endereço, telefone e `isActive` |
| `DELETE` | `/restaurants/:restaurantId` | Dono | Exclui o restaurante, o cardápio, as avaliações e as imagens |
| `POST` / `DELETE` | `/restaurants/:restaurantId/image` | Dono | Envia / remove a capa |

### Cardápio

| Método | Rota | Acesso | Descrição |
|---|---|---|---|
| `GET` | `/restaurants/:restaurantId/dishes` | Público | Pratos disponíveis (o dono vê todos) |
| `GET` | `/dishes/:dishId` | Público | Um prato |
| `POST` | `/restaurants/:restaurantId/dishes` | Dono | Cria prato (`name`, `category`, `price`, `description`, `isAvailable`) |
| `PUT` / `DELETE` | `/dishes/:dishId` | Dono | Edita / exclui o prato |
| `POST` / `DELETE` | `/dishes/:dishId/image` | Dono | Envia / remove a foto do prato |

### Avaliações

| Método | Rota | Acesso | Descrição |
|---|---|---|---|
| `POST` | `/restaurants/:restaurantId/reviews` | Protegido | Dá ou troca a nota (`{ "rating": 1..5 }`); o dono não avalia o próprio restaurante |
| `GET` | `/restaurants/:restaurantId/reviews/me` | Protegido | Nota que o usuário já deu |

### Administração

| Método | Rota | Acesso | Descrição |
|---|---|---|---|
| `GET` | `/admin/overview` | `ADMIN` | Totais de usuários, restaurantes, pratos e avaliações |
| `GET` | `/admin/restaurants` | `ADMIN` | Todos os restaurantes, com o proprietário |

### Exemplos

**Entrar:** `POST /auth/login`

```json
{ "email": "dono@easyfood.com", "password": "123456" }
```

**Cadastrar restaurante:** `POST /restaurants`

```json
{ "name": "Sabor & Arte", "category": "Brasileira" }
```

A nota **não** é enviada: ela é a média das avaliações (ADR-006).

**Cadastrar prato:** `POST /restaurants/1/dishes`

```json
{ "name": "Feijoada", "category": "Pratos quentes", "price": 39.9, "description": "Com acompanhamentos" }
```

Imagens são enviadas como `multipart/form-data`, no campo `image` (JPEG, PNG ou WebP, até 5 MB).

### Códigos de resposta

| Código | Quando acontece |
|---|---|
| `200` / `201` / `204` | Sucesso (consulta, criação, exclusão) |
| `400` | Dados inválidos ou ausentes |
| `401` | Token ausente, inválido ou expirado, conta apagada ou credenciais incorretas |
| `403` | Sem permissão (não é o dono, não é admin, ou dono avaliando o próprio restaurante) |
| `404` | Recurso não encontrado |
| `409` | E-mail já cadastrado ou nome de restaurante repetido para o mesmo dono |
| `413` / `415` / `422` | Imagem grande demais, formato não suportado ou arquivo corrompido |
| `429` | Muitas tentativas de login (bloqueio de 15 minutos) |
| `500` | Erro interno do servidor |

## Como usar o frontend

1. Acesse `http://localhost:3000`.
2. Clique em **Criar conta**, preencha nome, e-mail e senha. Você entra automaticamente.
3. Cadastre um restaurante pelo formulário "Novo estabelecimento": a tela do restaurante abre para você montar o cardápio.
4. Use a câmera para enviar a capa e as fotos dos pratos.
5. Em qualquer restaurante de outra pessoa, toque nas estrelas para avaliar.
6. Use busca, categoria, ordenação e o botão **Favoritos** para encontrar restaurantes. Favoritos ficam guardados no navegador, por conta.
7. Clique em **Sair** para encerrar a sessão.

O token fica guardado no `localStorage` do navegador.

## Estrutura do projeto

```
easyfood/
├── docs/
│   └── adr/                      # Registros de decisões de arquitetura
├── prisma/
│   ├── migrations/               # Histórico de migrations
│   ├── schema.prisma             # User, Restaurant, Dish, Review e Activity
│   └── seed.js                   # Dados de exemplo
├── public/
│   └── index.html                # Frontend
├── src/
│   ├── lib/                      # Prisma, validação, erros, imagens, e-mail e atividades
│   ├── middlewares/              # JWT/perfis e upload de arquivos
│   ├── modules/
│   │   ├── auth/                 # Cadastro, login, perfil e limite de tentativas
│   │   ├── restaurants/          # Restaurantes (dados, capa e painel)
│   │   ├── dishes/               # Cardápio
│   │   ├── reviews/              # Avaliações
│   │   └── admin/                # Visão administrativa
│   ├── app.js                    # Configuração do Express e rotas
│   └── server.js                 # Inicialização do servidor
├── test/                         # Testes (node --test)
├── uploads/                      # Imagens enviadas (criada em execução, fora do git)
├── .env.example
├── package.json
└── README.md
```

Cada módulo segue a arquitetura em camadas: **routes** (define as rotas), **controller** (valida a entrada e trata a requisição e a resposta) e **service** (regras de negócio e acesso ao banco).

## Decisões de arquitetura

As decisões técnicas do projeto estão documentadas em `docs/adr/`:

* **ADR-001:** armazenar restaurantes em memória (versão inicial)
* **ADR-002:** escolha do banco de dados (SQLite)
* **ADR-003:** persistência com SQLite via Prisma ORM
* **ADR-004:** autenticação com JWT e hash de senhas
* **ADR-005:** perfis de acesso e propriedade de restaurantes
* **ADR-006:** a nota do restaurante vem das avaliações dos clientes
* **ADR-007:** upload e otimização de imagens
* **ADR-008:** validação de entrada e limite de tentativas de login

## Scripts disponíveis

| Comando | O que faz |
|---|---|
| `npm start` | Inicia o servidor |
| `npm run dev` | Inicia com reinício automático (`node --watch`) |
| `npm test` | Roda os testes |
| `npx prisma migrate dev` | Aplica as migrations e atualiza o banco |
| `npx prisma db seed` | Insere dados de exemplo (pode rodar mais de uma vez) |
| `npx prisma studio` | Abre uma interface para consultar o banco |

## Atualizando um banco criado antes desta versão

`npx prisma migrate dev` aplica a nova migration sem apagar dados. Ela:

* coloca os e-mails em minúsculas;
* zera a nota dos restaurantes existentes (a nota agora vem das avaliações);
* deixa os restaurantes antigos **sem dono**. Para gerenciá-los, defina o `ownerId` no `npx prisma studio`.

## Problemas comuns

| Sintoma | Causa provável | Solução |
|---|---|---|
| "Erro ao conectar com o servidor da API" | Página aberta como arquivo ou servidor parado | Rode `npm start` e acesse `http://localhost:3000` |
| `JWT_SECRET não definido no .env` | Variável ausente | Defina o `JWT_SECRET` no `.env` |
| `Cannot find module ...` | Dependências não instaladas | Rode `npm install` |
| `EADDRINUSE` | Porta 3000 já em uso | Encerre o outro processo ou defina outra `PORT` no `.env` |
| Erro do Prisma sobre tabela inexistente | Migrations não aplicadas | Rode `npx prisma migrate dev` |
| `401` mesmo depois de logar | Token expirado, `JWT_SECRET` alterado ou conta apagada | Saia e entre novamente |
| `429` ao entrar | 5 senhas erradas seguidas | Aguarde o tempo informado (15 minutos) |
| Erro ao instalar o `sharp` | Binário nativo não baixado | Verifique a conexão e rode `npm install` de novo |

## Limitações conhecidas

Este projeto tem fins didáticos. Antes de uso em produção, seria necessário:

* Servir a aplicação por **HTTPS**.
* Guardar o token em cookie `httpOnly`, em vez de `localStorage`.
* Trocar o limite de tentativas de login em memória por um compartilhado entre instâncias.
* Guardar as imagens em armazenamento externo se houver mais de uma instância (ADR-007).
* Permitir a revogação de tokens antes da expiração.
* O primeiro administrador só é criado pelo seed ou direto no banco.

Mais detalhes nos **ADR-004**, **ADR-007** e **ADR-008**.
