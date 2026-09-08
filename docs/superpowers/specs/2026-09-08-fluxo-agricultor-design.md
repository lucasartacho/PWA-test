# Fluxo do(a) Agricultor(a)

**Data:** 2026-09-08
**Status:** Aprovado para implementação

## Contexto

Sub-projeto 3 (e último dos originalmente planejados) da decomposição do fluxo
completo do Protocolo de Benefícios dos SAFs. Os sub-projetos 1 (base de UI)
e 2 (fluxo da organização) estão concluídos. Este spec cobre o fluxo do(a)
agricultor(a): login por CPF (sem senha), tela de apresentação do Protocolo,
e seleção dos selos de benefício.

Como nos sub-projetos anteriores, construído como **fatia vertical completa**
(backend real, endpoints reais, sem dados mockados).

## Por que a autenticação é diferente da Organização

O(A) agricultor(a) não tem senha — o login é feito só digitando o CPF, e o
sistema verifica se aquele CPF foi cadastrado por alguma organização (ver
`docs/superpowers/specs/2026-09-06-fluxo-organizacao-design.md`). Isso é uma
decisão de produto explícita (acessibilidade em campo), não um descuido de
segurança — mas significa que o mecanismo de autenticação da Organização
(JWT via `djangorestframework-simplejwt`, que pressupõe verificação de senha)
não se aplica aqui.

**Mudança de modelo desde o sub-projeto 2:** o CPF passa a identificar uma
**pessoa**, não um cadastro específico de uma organização — depois da correção
que tornou o CPF único por organização (não mais globalmente), o mesmo CPF
pode existir em `Agricultor`s de organizações diferentes. O login do
agricultor não escolhe organização: se o CPF existir em qualquer uma, o
acesso é liberado, representando a pessoa como um todo.

## Autenticação do agricultor

Mecanismo próprio, mais simples que o JWT da organização — usa
`django.core.signing` (já embutido no Django, sem dependência nova) para
gerar um token assinado e com validade, sem precisar de um modelo de usuário
Django para `Agricultor`.

- `POST /api/agricultor/login/` (pública): recebe `{"cpf": "..."}`. Se existir
  ao menos um `Agricultor` com esse CPF (em qualquer organização), gera e
  devolve um token assinado carregando o CPF como claim.
- Uma classe de autenticação DRF própria (`AgricultorTokenAuthentication`)
  verifica esse token nas rotas protegidas do agricultor, resolvendo o CPF a
  partir dele — sem envolver `Organizacao` ou o sistema de permissões padrão
  do Django.
- O token não expira em curtíssimo prazo (não há refresh token nesse fluxo,
  dado o mecanismo mais simples) — um prazo generoso (ex: 30 dias) é
  suficiente para esta fase.

## Modelo de dados

### `SelosSelecionados`

Guardado por **CPF**, não por organização — os selos pertencem à pessoa, e
precisam ficar visíveis para todas as organizações às quais ela pertence
(mesmo que essa visibilidade do lado da organização seja construída num
sub-projeto futuro — ver Fora de Escopo).

| Campo | Tipo | Notas |
|---|---|---|
| `cpf` | `CharField`, único | mesma validação de formato do `Agricultor.cpf` |
| `selos` | `JSONField` | lista de chaves dos selos escolhidos |
| `updated_at` | `DateTimeField(auto_now=True)` | |

Os 7 selos são fixos nesta fase (não configuráveis pela organização):

```
conserva_natureza    → "Conserva a natureza"
policultivo           → "Policultivo"
saberes_no_prato       → "Saberes no prato"
sem_agrotoxico           → "Produzido sem Agrotóxico"
solo_vivo                 → "Solo vivo"
cultivando_felicidade       → "Cultivando felicidade"
boniteza                     → "Boniteza"
```

## API

Nova app Django `agricultor_auth`.

| Método + rota | Auth | Função |
|---|---|---|
| `POST /api/agricultor/login/` | pública | `{cpf}` → `{token}` se o CPF existir em algum `Agricultor` |
| `GET /api/agricultor/me/` | token do agricultor | Nome (de um dos cadastros que casam com o CPF) + lista de selos já selecionados |
| `PUT /api/agricultor/selos/` | token do agricultor | Substitui a lista de selos selecionados |

## Frontend

### Sessão

Um `AgricultorAuthContext` próprio — **não reaproveita** o `AuthContext` da
organização, são identidades diferentes. Tabela nova no Dexie,
`agricultorSession` (só guarda o token, sem par access/refresh como no fluxo
da organização, já que este mecanismo não tem renovação).

### Rotas

| Rota | Tela | Acesso |
|---|---|---|
| `/agricultor` | Apresentação do Protocolo + botão "Como fazer?/O que é?" (abre modal com o texto de boas-vindas) + campo de CPF | pública |
| `/agricultor/inicio` | Pós-login: nome, botão "Protocolo", logout | protegida |
| `/agricultor/protocolo` | Seleção dos 7 selos (checkboxes) + salvar | protegida |

Isso substitui o stub `frontend/src/pages/AgricultorPage.jsx` (existe desde
o sub-projeto 1, nunca teve funcionalidade real).

## Fora de escopo (fases futuras)

- O passo a passo real de conquistar cada selo (por enquanto é só seleção
  de intenção, sem processo de verificação/aprovação).
- Mostrar os selos selecionados na tela de agricultores da organização (a
  tela existente continua com "Ainda não preenchido" fixo — conectar isso
  é um sub-projeto à parte, para não reabrir uma tela já entregue).
- Confirmação de cadastro por e-mail (SMTP), tanto para agrônomos quanto
  para agricultores — mencionado no pedido original, mas sem infraestrutura
  de e-mail nesta fase.
- Expiração/renovação mais sofisticada do token do agricultor (por ora, um
  prazo longo e fixo é suficiente).
