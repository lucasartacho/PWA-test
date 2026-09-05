# PWA-test

Protocolo de benefícios — fundação técnica.

Testando stack de fundação React + Vite (PWA), IndexedDB/Dexie para armazenamento offline, Django + Django REST Framework no backend, PostgreSQL e Docker.

## Stack

React + Vite (PWA) · Dexie/IndexedDB · Django + DRF · PostgreSQL · Docker Compose

## Rodando localmente

1. Copie o template de variáveis de ambiente:
   ```bash
   cp .env.example .env
   ```
2. Suba tudo:
   ```bash
   docker compose up
   ```
3. Acesse:
   - Frontend: http://localhost:5173
   - API: http://localhost:8000/api/health/
