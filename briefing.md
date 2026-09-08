# Briefing do Projeto

Contexto de produto que não muda a cada fatia vertical — consolidado a partir
das seções "Contexto" repetidas nas specs de
[docs/superpowers/specs/](docs/superpowers/specs/). Decisões de UI ficam no
[design.md](design.md); decisões técnicas de cada fatia ficam nas specs.

## O produto

App de **Protocolo de Benefícios dos SAFs** (Sistemas Agroflorestais):
organizações (associações/cooperativas) cadastram agricultores e preenchem,
para cada um, um protocolo que atribui "selos" com base em critérios do
sistema produtivo — hoje conhecidos (associado/cooperado, agricultura
familiar, tem SAF, usa agrotóxico), mas o mecanismo de preenchimento e
atribuição de selos em si ainda não foi projetado (fica para uma spec
futura).

Fonte de verdade do fluxo completo: Figma **"Fluxo do Protocolo de
Benefícios"**.

## Perfis de usuário

- **Organização** (Associação ou Cooperativa): cadastra a si mesma, faz
  login, cadastra e gerencia os agricultores vinculados a ela. Em
  implementação — ver
  [2026-09-06-fluxo-organizacao-design.md](docs/superpowers/specs/2026-09-06-fluxo-organizacao-design.md).
- **Agricultor(a)**: login por CPF, tela de apresentação, seleção de selos.
  Ainda não implementado (fora de escopo das specs atuais).

## Restrição central: offline-first

O app precisa funcionar sem conexão — salvar respostas localmente e
sincronizar quando a rede voltar. É a motivação para Dexie/IndexedDB no
frontend em vez de depender só do backend. Isso importa para qualquer
decisão de fluxo: toda tela que grava dado precisa considerar o caminho
offline, não só o caminho feliz com API disponível.

## Restrição: mobile-first

É um webapp (PWA), não um app nativo — o layout é desenhado primeiro para
tela de celular e depois adaptado para telas maiores, não o contrário.
Reforça a mesma lógica do offline-first: o uso real (organização/agricultor
no campo) tende a ser por celular. Ver paleta e breakpoints em
[design.md](design.md).

## Como o projeto está sendo decomposto

Fatias verticais completas (frontend + backend + banco real, sem mock),
por decisão explícita do usuário — ver [CLAUDE.md](CLAUDE.md) e a
justificativa em
[2026-09-06-fluxo-organizacao-design.md:14-18](docs/superpowers/specs/2026-09-06-fluxo-organizacao-design.md).
Cada sub-projeto vira uma spec própria em `docs/superpowers/specs/`.

Progresso até aqui:
1. Fundação técnica (Docker, esqueleto frontend/backend/banco) — concluído.
2. Base de UI (Material UI + roteamento) — concluído.
3. Fluxo da Organização (cadastro, login, CRUD de agricultores) — em
   implementação.
4. Fluxo do(a) Agricultor(a) — não iniciado.
5. Preenchimento do Protocolo e atribuição de selos — não projetado ainda;
   é o núcleo de negócio do produto e ainda não tem spec.

## Fora de escopo até agora (decisões deliberadas, não esquecimento)

- Lógica de atribuição de selos.
- Ilustração customizada de empty states (ver [design.md](design.md)).
- HTTPS, blacklist de token JWT, deploy em produção.

Atualize este arquivo quando o entendimento do produto mudar — ele é sobre
o *problema*, não sobre a implementação de uma fatia específica.
