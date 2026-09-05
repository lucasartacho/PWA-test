# Fluxo da Organização (Etapa 1.1)

**Data:** 2026-09-06
**Status:** Aprovado para implementação

## Contexto

Sub-projeto 2 da decomposição do fluxo completo do Protocolo de
Benefícios dos SAFs (o sub-projeto 1, base de UI com Material UI e
roteamento, está concluído). Este spec cobre o fluxo da Associação ou
Cooperativa: cadastro da organização, login, cadastro de agricultores
pela organização, e CRUD dos dois perfis.

Diferente do sub-projeto 1 (só interface), este é construído como
**fatia vertical completa**: modelos reais no Postgres, endpoints reais
no Django/DRF, autenticação real — por decisão explícita do usuário, que
prefere provar cada fatia contra a infraestrutura real em vez de mockar
e religar depois.

Fora de escopo aqui (fica para sub-projetos futuros):
- Login e telas do(a) Agricultor(a) (CPF, apresentação, seleção de selos).
- O mecanismo de preenchimento do Protocolo em si e a atribuição de
  selos — por isso a tela de lista de agricultores mostra
  "Ainda não preenchido" para todos, sem inventar esse dado.
- Ilustração customizada do empty state (usamos um ícone do Material
  Design por enquanto).

## Modelos de dados (backend)

### `Organizacao`

Modelo de usuário customizado do Django (`AUTH_USER_MODEL`), usando a
infraestrutura de autenticação nativa (hash de senha via
`AbstractBaseUser`). `cnpj` é o campo de login (`USERNAME_FIELD`).

| Campo | Tipo | Notas |
|---|---|---|
| `cnpj` | `CharField`, único | identificador de login |
| `nome` | `CharField` | "Nome da Associação" |
| `razao_social` | `CharField` | |
| `exclusivamente_agricultura_familiar` | `BooleanField` | |
| `password` | herdado de `AbstractBaseUser` | hash, nunca texto puro |
| `created_at` | `DateTimeField(auto_now_add=True)` | |

### `Agricultor`

| Campo | Tipo | Notas |
|---|---|---|
| `organizacao` | `ForeignKey(Organizacao)` | quem cadastrou |
| `nome` | `CharField` | |
| `cpf` | `CharField`, único | |
| `associado_ou_cooperado` | `BooleanField` | |
| `agricultor_familiar` | `BooleanField` | |
| `tem_saf` | `BooleanField` | |
| `usa_agrotoxico` | `BooleanField` | |
| `created_at` | `DateTimeField(auto_now_add=True)` | |

## Autenticação e API

JWT via `djangorestframework-simplejwt`. Access token de curta duração
(1 hora), refresh token de duração maior (7 dias). Sem blacklist de
token nesta fase (YAGNI — pode ser adicionado depois se necessário).

| Método + rota | Auth | Função |
|---|---|---|
| `POST /api/organizacoes/` | pública | Cadastro de organização |
| `POST /api/auth/login/` | pública | Login (`cnpj` + `password`) → `{access, refresh}` |
| `POST /api/auth/refresh/` | pública (requer refresh token) | Renova o access token |
| `GET/PATCH/DELETE /api/organizacoes/me/` | autenticado | CRUD do próprio perfil |
| `GET/POST /api/agricultores/` | autenticado | Lista/cadastra agricultores da organização logada |
| `GET/PATCH/DELETE /api/agricultores/<id>/` | autenticado | CRUD de um agricultor — só se pertencer à organização logada |

Toda rota de agricultor filtra pela organização do token (via
`request.user`) — uma organização nunca acessa dados de outra, mesmo
sabendo o ID.

## Frontend

### Rotas

| Rota | Tela | Acesso |
|---|---|---|
| `/organizacao` | Login (CNPJ + senha) + link para cadastro | pública |
| `/organizacao/cadastro` | Apresentação do Protocolo + formulário de cadastro da organização | pública |
| `/organizacao/dashboard` | Empty state (ícone MUI) ou lista de agricultores | protegida |
| `/organizacao/agricultores/novo` | Formulário de cadastro de agricultor(a) | protegida |
| `/organizacao/agricultores/:id/editar` | Edição de um agricultor | protegida |
| `/organizacao/perfil` | CRUD do próprio perfil da organização | protegida |

"Protegida" = redireciona para `/organizacao` se não houver sessão
válida.

### Sessão e autenticação no cliente

- `AuthContext` (React Context) guarda o estado de sessão em memória.
- `access` e `refresh` tokens persistidos no Dexie (nova tabela
  `session`), para sobreviver a reaberturas do app mesmo offline.
- Toda chamada às rotas protegidas envia
  `Authorization: Bearer <access token>`. Uma resposta `401` dispara
  uma tentativa automática de renovação via `refresh` antes de redirecionar
  para o login.
- Logout: limpa o token do Dexie e do contexto, sem invalidação
  server-side nesta fase.

### Empty state

Tela de dashboard sem agricultores cadastrados usa um ícone do
Material Design (não uma ilustração customizada) com uma mensagem e o
botão de cadastrar o primeiro agricultor.

## Fora de escopo (fases futuras)

- Login e telas do(a) Agricultor(a).
- Preenchimento real do Protocolo e atribuição de selos.
- Ilustração customizada do empty state.
- Blacklist/invalidação server-side de tokens JWT.
- HTTPS (necessário antes de qualquer deploy real, já que JWT via HTTP
  puro pode ser interceptado — não se aplica em `localhost`).
