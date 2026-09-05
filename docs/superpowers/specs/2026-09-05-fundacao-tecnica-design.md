# Fundação Técnica do PWA-test

**Data:** 2026-09-05
**Status:** Aprovado para implementação

## Contexto

PWA-test é um app de protocolo de benefícios com dois perfis de usuário
(organização e agricultor(a)), conforme o fluxo mapeado no Figma
("Fluxo do Protocolo de Benefícios"). O app precisa funcionar offline
(salvar respostas localmente e sincronizar quando a conexão retornar),
o que motiva o uso de armazenamento local no navegador.

Este spec cobre apenas a **fundação técnica**: a estrutura de projeto,
orquestração via Docker e os esqueletos mínimos de backend e frontend
provando que todas as peças conversam entre si. As features de negócio
(cadastro/login, entrada e saída de benefícios, lógica de sincronização
offline) ficam para specs seguintes, decompostas a partir do fluxo do
Figma.

## Stack

- **Frontend:** React + Vite, configurado como PWA (manifest + service
  worker), com Dexie sobre IndexedDB para armazenamento offline.
- **Backend:** Django + Django REST Framework (DRF).
- **Banco de dados:** PostgreSQL.
- **Orquestração:** Docker Compose (frontend, backend e banco, todos
  containerizados) — escolhido para paridade dev/prod, onboarding
  simples e testabilidade em CI.

## Estrutura do repositório (monorepo)

```
PWA-test/
├── docker-compose.yml
├── .env.example
├── .gitignore
├── README.md
├── docs/superpowers/specs/       # specs de design
├── frontend/
│   ├── Dockerfile
│   ├── package.json
│   ├── vite.config.js
│   ├── index.html
│   └── src/
│       ├── main.jsx
│       ├── App.jsx
│       ├── db.js
│       └── api.js
└── backend/
    ├── Dockerfile
    ├── requirements.txt
    ├── manage.py
    └── app/
        ├── settings.py
        ├── urls.py
        └── health/
            └── views.py
```

## Docker Compose

Três serviços em uma rede compartilhada:

| Serviço | Base | Porta (host) | Notas |
|---------|------|--------------|-------|
| `db` | `postgres:16-alpine` | 5432 | Volume nomeado para persistir dados |
| `backend` | Python 3.12 | 8000 | Volume bind-mount de `./backend`; `depends_on` com healthcheck do `db` |
| `frontend` | Node 20 | 5173 | Volume bind-mount de `./frontend` |

Variáveis sensíveis (senha do Postgres, `SECRET_KEY` do Django, URL da
API) ficam em `.env` (git-ignored), com `.env.example` versionado como
template.

## Backend

- Projeto Django mínimo com DRF instalado.
- Endpoint único de diagnóstico: `GET /api/health/` retorna
  `{"status": "ok", "db": "connected"}` após checar a conexão com o
  Postgres.
- CORS liberado para `http://localhost:5173` (origem do frontend em
  dev).
- Migrations padrão do Django rodadas (sem tabelas de negócio ainda).

## Frontend

- Vite + React, com plugin de PWA configurado (manifest + service
  worker básico).
- Dexie configurado com um banco local de teste (uma tabela simples).
- Tela única de diagnóstico: mostra o status retornado por
  `/api/health/` e faz uma leitura/escrita de teste no Dexie — prova
  que rede e armazenamento local funcionam.
- Nenhuma tela de negócio nesta fase.

## Critério de sucesso da fundação

`docker compose up` sobe os três serviços e a tela do frontend exibe
"Backend: conectado" e "Banco: conectado", confirmando a cadeia
completa: frontend → backend → banco, mais leitura/escrita local via
Dexie funcionando.

## Git e fluxo de trabalho

- Repositório único (monorepo), branch `main` nesta fase.
- Remote: `git@github.com:lucasartacho/PWA-test.git`.
- `.gitignore` cobre `.env`, `node_modules/`, `__pycache__/`, etc.
- Após a fundação funcionar e ser aprovada, commit único descrevendo a
  fundação completa, seguido de push para o remote (feito pelo
  assistente, por decisão do usuário).
- Fases seguintes (features do fluxo de benefícios) usarão branches por
  feature.

## Fora de escopo (fases futuras)

- Autenticação real (cadastro/login de organização e agricultor).
- Lógica de negócio do fluxo de benefícios (entrada/saída,
  sincronização offline real).
- Testes automatizados, CI/CD.
- Deploy em produção.

Cada um desses vira seu próprio spec, decomposto a partir do fluxo
mapeado no Figma.
