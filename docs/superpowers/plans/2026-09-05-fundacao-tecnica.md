# Fundação Técnica do PWA-test Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Stand up a working technical foundation — Docker Compose orchestrating Postgres, a Django/DRF backend, and a React/Vite/Dexie PWA frontend — proving the full chain (frontend → backend → banco, + armazenamento local) works end to end, with no business features yet.

**Architecture:** Three Docker Compose services (`db`, `backend`, `frontend`) built up incrementally, one per task, each wired into `docker-compose.yml` as soon as it exists so every task is verifiable through the real orchestration instead of in isolation. The `db` service comes first (nothing else works without it); `backend` follows with an automated test running through the compose network; `frontend` follows with a manual browser check; the last code task wires the two together and is verified visually.

**Tech Stack:** React 18 + Vite 5 + vite-plugin-pwa, Dexie 4 (IndexedDB), Django 5 + Django REST Framework 3.15, PostgreSQL 16, Docker Compose.

**Spec:** [docs/superpowers/specs/2026-09-05-fundacao-tecnica-design.md](../specs/2026-09-05-fundacao-tecnica-design.md)

## Global Constraints

- Postgres image: `postgres:16-alpine`.
- Backend base image: `python:3.12-slim`.
- Frontend base image: `node:20-alpine`.
- Host ports: `db` → 5432, `backend` → 8000, `frontend` → 5173.
- CORS: only `http://localhost:5173` is allowed to call the backend.
- Health endpoint: `GET /api/health/` → `200 {"status": "ok", "db": "connected"}`.
- Secrets live only in `.env` (git-ignored); `.env.example` is the committed template.
- Single branch `main` for this phase — no feature branches yet.
- Repo layout is a monorepo: `frontend/` and `backend/` at the root, `docker-compose.yml` at the root.

---

### Task 1: Repo scaffolding + Postgres service

**Files:**
- Create: `.gitignore`
- Create: `.env.example`
- Create: `README.md`
- Create: `docker-compose.yml`

**Interfaces:**
- Consumes: nothing (first task).
- Produces: `.env` variable names `POSTGRES_DB`, `POSTGRES_USER`, `POSTGRES_PASSWORD` (Task 2 and 4 read these); a `db` service reachable at hostname `db` port `5432` on the Compose network (Task 2 connects to it); a top-level `docker-compose.yml` that later tasks add services to.

- [ ] **Step 1: Create `.gitignore`**

```gitignore
# Environment
.env

# Python
__pycache__/
*.pyc
backend/venv/
backend/*.egg-info/

# Node
frontend/node_modules/
frontend/dist/

# OS
.DS_Store

# IDE
.vscode/
.idea/
```

- [ ] **Step 2: Create `.env.example`**

```
# Postgres
POSTGRES_DB=pwa_test
POSTGRES_USER=pwa_test
POSTGRES_PASSWORD=change-me

# Django
DJANGO_SECRET_KEY=change-me
DJANGO_DEBUG=1

# Frontend
VITE_API_URL=http://localhost:8000
```

- [ ] **Step 3: Create `README.md`**

```markdown
# PWA-test

Protocolo de benefícios — fundação técnica.

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
```

- [ ] **Step 4: Create `docker-compose.yml` with only the `db` service**

```yaml
services:
  db:
    image: postgres:16-alpine
    env_file: .env
    environment:
      POSTGRES_DB: ${POSTGRES_DB}
      POSTGRES_USER: ${POSTGRES_USER}
      POSTGRES_PASSWORD: ${POSTGRES_PASSWORD}
    ports:
      - "5432:5432"
    volumes:
      - pgdata:/var/lib/postgresql/data
    healthcheck:
      test: ["CMD-SHELL", "pg_isready -U ${POSTGRES_USER} -d ${POSTGRES_DB}"]
      interval: 5s
      timeout: 5s
      retries: 5

volumes:
  pgdata:
```

- [ ] **Step 5: Create the real `.env` from the template**

Run: `cp .env.example .env`
Expected: a new `.env` file exists (git-ignored, won't show in `git status`).

- [ ] **Step 6: Verify the `db` service comes up healthy**

Run: `docker compose up -d db && sleep 3 && docker compose ps`
Expected: the `db` row shows `running (healthy)`.

Run: `docker compose exec db pg_isready -U pwa_test -d pwa_test`
Expected: `accepting connections`.

- [ ] **Step 7: Commit**

```bash
git add .gitignore .env.example README.md docker-compose.yml
git commit -m "feat: add repo scaffolding and postgres service"
```

---

### Task 2: Backend — Django + DRF with `/api/health/`

**Files:**
- Create: `backend/Dockerfile`
- Create: `backend/requirements.txt`
- Create: `backend/manage.py`
- Create: `backend/app/__init__.py`
- Create: `backend/app/settings.py`
- Create: `backend/app/urls.py`
- Create: `backend/health/__init__.py`
- Create: `backend/health/views.py`
- Create: `backend/health/urls.py`
- Create: `backend/health/tests.py`
- Modify: `docker-compose.yml` (add the `backend` service)

**Interfaces:**
- Consumes: the `db` service from Task 1, reachable at host `db` port `5432`, credentials from `.env` (`POSTGRES_DB`/`POSTGRES_USER`/`POSTGRES_PASSWORD`).
- Produces: `GET /api/health/` on port 8000 → `200 {"status": "ok", "db": "connected"}` (Task 4's `frontend/src/api.js` calls this exact path and shape).

- [ ] **Step 1: Write `backend/health/tests.py` (the failing test)**

```python
from django.urls import reverse
from rest_framework.test import APITestCase


class HealthCheckTests(APITestCase):
    def test_health_check_returns_ok_and_db_connected(self):
        url = reverse("health-check")
        response = self.client.get(url)
        self.assertEqual(response.status_code, 200)
        self.assertEqual(response.json(), {"status": "ok", "db": "connected"})
```

- [ ] **Step 2: Create `backend/health/__init__.py`**

Empty file (marks `health` as a Python package).

- [ ] **Step 3: Create `backend/requirements.txt`**

```
Django==5.0.9
djangorestframework==3.15.2
psycopg2-binary==2.9.9
django-cors-headers==4.4.0
```

- [ ] **Step 4: Create `backend/app/__init__.py`**

Empty file.

- [ ] **Step 5: Create `backend/app/settings.py`**

```python
import os
from pathlib import Path

BASE_DIR = Path(__file__).resolve().parent.parent

SECRET_KEY = os.environ.get("DJANGO_SECRET_KEY", "dev-insecure-key")
DEBUG = os.environ.get("DJANGO_DEBUG", "0") == "1"
ALLOWED_HOSTS = ["*"]

INSTALLED_APPS = [
    "django.contrib.contenttypes",
    "django.contrib.auth",
    "rest_framework",
    "corsheaders",
    "health",
]

MIDDLEWARE = [
    "corsheaders.middleware.CorsMiddleware",
    "django.middleware.common.CommonMiddleware",
]

CORS_ALLOWED_ORIGINS = [
    "http://localhost:5173",
]

ROOT_URLCONF = "app.urls"

DATABASES = {
    "default": {
        "ENGINE": "django.db.backends.postgresql",
        "NAME": os.environ.get("POSTGRES_DB", "pwa_test"),
        "USER": os.environ.get("POSTGRES_USER", "pwa_test"),
        "PASSWORD": os.environ.get("POSTGRES_PASSWORD", "change-me"),
        "HOST": os.environ.get("POSTGRES_HOST", "db"),
        "PORT": os.environ.get("POSTGRES_PORT", "5432"),
    }
}

DEFAULT_AUTO_FIELD = "django.db.models.BigAutoField"
```

- [ ] **Step 6: Create `backend/app/urls.py`**

```python
from django.urls import include, path

urlpatterns = [
    path("api/health/", include("health.urls")),
]
```

- [ ] **Step 7: Create `backend/health/urls.py`**

```python
from django.urls import path

from .views import health_check

urlpatterns = [
    path("", health_check, name="health-check"),
]
```

- [ ] **Step 8: Create `backend/health/views.py` (minimal implementation)**

```python
from django.db import connection
from rest_framework.decorators import api_view
from rest_framework.response import Response


@api_view(["GET"])
def health_check(request):
    with connection.cursor() as cursor:
        cursor.execute("SELECT 1")
        cursor.fetchone()
    return Response({"status": "ok", "db": "connected"})
```

- [ ] **Step 9: Create `backend/manage.py`**

```python
#!/usr/bin/env python
import os
import sys


def main():
    os.environ.setdefault("DJANGO_SETTINGS_MODULE", "app.settings")
    try:
        from django.core.management import execute_from_command_line
    except ImportError as exc:
        raise ImportError(
            "Couldn't import Django. Are you sure it's installed and "
            "available on your PYTHONPATH environment variable? Did you "
            "forget to activate a virtual environment?"
        ) from exc
    execute_from_command_line(sys.argv)


if __name__ == "__main__":
    main()
```

- [ ] **Step 10: Create `backend/Dockerfile`**

```dockerfile
FROM python:3.12-slim

WORKDIR /app

ENV PYTHONDONTWRITEBYTECODE=1 \
    PYTHONUNBUFFERED=1

COPY requirements.txt .
RUN pip install --no-cache-dir -r requirements.txt

COPY . .

EXPOSE 8000

CMD ["python", "manage.py", "runserver", "0.0.0.0:8000"]
```

- [ ] **Step 11: Add the `backend` service to `docker-compose.yml`**

Add under `services:` (same level as `db`):

```yaml
  backend:
    build: ./backend
    env_file: .env
    environment:
      POSTGRES_HOST: db
    volumes:
      - ./backend:/app
    ports:
      - "8000:8000"
    depends_on:
      db:
        condition: service_healthy
```

- [ ] **Step 12: Run the test to verify it passes**

Run: `docker compose build backend && docker compose run --rm backend python manage.py test`
Expected: `Ran 1 test in ...s` followed by `OK`.

- [ ] **Step 13: Verify manually through the real HTTP path**

Run: `docker compose up -d db backend && sleep 2 && curl http://localhost:8000/api/health/`
Expected: `{"status":"ok","db":"connected"}`

- [ ] **Step 14: Commit**

```bash
git add backend docker-compose.yml
git commit -m "feat: add django/drf backend with health check endpoint"
```

---

### Task 3: Frontend — Vite + React + PWA + Dexie skeleton

**Files:**
- Create: `frontend/Dockerfile`
- Create: `frontend/package.json`
- Create: `frontend/vite.config.js`
- Create: `frontend/index.html`
- Create: `frontend/src/main.jsx`
- Create: `frontend/src/App.jsx`
- Create: `frontend/src/db.js`
- Modify: `docker-compose.yml` (add the `frontend` service)

**Interfaces:**
- Consumes: nothing from Task 2 yet (this task only proves the frontend container builds and serves a page).
- Produces: `db` export from `frontend/src/db.js` — a Dexie instance named `pwa-test` with a `diagnostics` table (columns `++id, checkedAt`) — consumed by Task 4's `App.jsx`. An `App` default export from `frontend/src/App.jsx`, replaced (not renamed) in Task 4.

- [ ] **Step 1: Create `frontend/package.json`**

```json
{
  "name": "pwa-test-frontend",
  "private": true,
  "version": "0.0.1",
  "type": "module",
  "scripts": {
    "dev": "vite --host 0.0.0.0",
    "build": "vite build",
    "preview": "vite preview"
  },
  "dependencies": {
    "dexie": "^4.0.8",
    "react": "^18.3.1",
    "react-dom": "^18.3.1"
  },
  "devDependencies": {
    "@vitejs/plugin-react": "^4.3.1",
    "vite": "^5.4.1",
    "vite-plugin-pwa": "^0.20.5"
  }
}
```

- [ ] **Step 2: Create `frontend/vite.config.js`**

```javascript
import { defineConfig } from "vite";
import react from "@vitejs/plugin-react";
import { VitePWA } from "vite-plugin-pwa";

export default defineConfig({
  plugins: [
    react(),
    VitePWA({
      registerType: "autoUpdate",
      manifest: {
        name: "PWA Test",
        short_name: "PWA Test",
        start_url: "/",
        display: "standalone",
        background_color: "#ffffff",
        theme_color: "#1a1a1a",
        icons: [],
      },
    }),
  ],
  server: {
    host: true,
    port: 5173,
  },
});
```

- [ ] **Step 3: Create `frontend/index.html`**

```html
<!doctype html>
<html lang="pt-BR">
  <head>
    <meta charset="UTF-8" />
    <meta name="viewport" content="width=device-width, initial-scale=1.0" />
    <title>PWA Test</title>
  </head>
  <body>
    <div id="root"></div>
    <script type="module" src="/src/main.jsx"></script>
  </body>
</html>
```

- [ ] **Step 4: Create `frontend/src/db.js`**

```javascript
import Dexie from "dexie";

export const db = new Dexie("pwa-test");

db.version(1).stores({
  diagnostics: "++id, checkedAt",
});
```

- [ ] **Step 5: Create `frontend/src/App.jsx` (placeholder, replaced in Task 4)**

```jsx
export default function App() {
  return (
    <main>
      <h1>PWA Test</h1>
      <p>Fundação em construção.</p>
    </main>
  );
}
```

- [ ] **Step 6: Create `frontend/src/main.jsx`**

```jsx
import React from "react";
import ReactDOM from "react-dom/client";
import App from "./App.jsx";

ReactDOM.createRoot(document.getElementById("root")).render(
  <React.StrictMode>
    <App />
  </React.StrictMode>
);
```

- [ ] **Step 7: Create `frontend/Dockerfile`**

```dockerfile
FROM node:20-alpine

WORKDIR /app

COPY package.json ./
RUN npm install

COPY . .

EXPOSE 5173

CMD ["npm", "run", "dev"]
```

- [ ] **Step 8: Add the `frontend` service to `docker-compose.yml`**

```yaml
  frontend:
    build: ./frontend
    environment:
      VITE_API_URL: ${VITE_API_URL}
    volumes:
      - ./frontend:/app
      - /app/node_modules
    ports:
      - "5173:5173"
```

(A pasta `/app/node_modules` como volume separado evita que o bind mount da sua máquina — que não tem `node_modules` — apague o que foi instalado dentro do container.)

- [ ] **Step 9: Verify the frontend builds and serves**

Run: `docker compose up -d --build frontend && sleep 2 && curl -s http://localhost:5173 | grep -o '<title>.*</title>'`
Expected: `<title>PWA Test</title>`

- [ ] **Step 10: Commit**

```bash
git add frontend docker-compose.yml
git commit -m "feat: add vite/react/pwa/dexie frontend skeleton"
```

---

### Task 4: Wire frontend to backend + Dexie diagnostic

**Files:**
- Create: `frontend/src/api.js`
- Modify: `frontend/src/App.jsx` (replace the Task 3 placeholder)

**Interfaces:**
- Consumes: `GET /api/health/` from Task 2 (shape `{"status": "ok", "db": "connected"}`); `db` (Dexie instance with `diagnostics` table) from Task 3's `frontend/src/db.js`.
- Produces: nothing further consumed by later tasks — this is the last code task; Task 5 only commits and pushes.

- [ ] **Step 1: Create `frontend/src/api.js`**

```javascript
const API_URL = import.meta.env.VITE_API_URL ?? "http://localhost:8000";

export async function checkHealth() {
  const response = await fetch(`${API_URL}/api/health/`);
  if (!response.ok) {
    throw new Error(`Health check failed: ${response.status}`);
  }
  return response.json();
}
```

- [ ] **Step 2: Replace `frontend/src/App.jsx`**

```jsx
import { useEffect, useState } from "react";
import { checkHealth } from "./api.js";
import { db } from "./db.js";

export default function App() {
  const [health, setHealth] = useState(null);
  const [dexieOk, setDexieOk] = useState(false);
  const [error, setError] = useState(null);

  useEffect(() => {
    checkHealth()
      .then(setHealth)
      .catch((err) => setError(err.message));

    db.diagnostics
      .add({ checkedAt: new Date().toISOString() })
      .then(() => db.diagnostics.count())
      .then((count) => setDexieOk(count > 0))
      .catch((err) => setError(err.message));
  }, []);

  return (
    <main>
      <h1>PWA Test — Diagnóstico da Fundação</h1>
      {error && <p>Erro: {error}</p>}
      <p>Backend: {health?.status === "ok" ? "conectado ✅" : "verificando..."}</p>
      <p>Banco: {health?.db === "connected" ? "conectado ✅" : "verificando..."}</p>
      <p>Armazenamento local (Dexie): {dexieOk ? "funcionando ✅" : "verificando..."}</p>
    </main>
  );
}
```

- [ ] **Step 3: Bring the whole stack up**

Run: `docker compose up -d --build`
Expected: `docker compose ps` shows `db`, `backend`, `frontend` all running (db healthy).

- [ ] **Step 4: Verify in a real browser**

Open `http://localhost:5173` in a browser and confirm the page shows:
```
Backend: conectado ✅
Banco: conectado ✅
Armazenamento local (Dexie): funcionando ✅
```
No errors in the browser console (check for CORS errors specifically — if `Backend` never leaves "verificando...", check `CORS_ALLOWED_ORIGINS` in `backend/app/settings.py` matches the frontend origin exactly).

- [ ] **Step 5: Commit**

```bash
git add frontend/src/api.js frontend/src/App.jsx
git commit -m "feat: wire frontend to backend health check and dexie diagnostics"
```

---

### Task 5: Push the foundation to GitHub

**Files:** none (git operations only).

**Interfaces:**
- Consumes: the `origin` remote already configured (`git@github.com:lucasartacho/PWA-test.git`) and the commits from Tasks 1-4 plus the earlier spec commit.
- Produces: nothing (terminal task).

- [ ] **Step 1: Confirm SSH access to GitHub**

Run: `ssh -T git@github.com`
Expected: `Hi lucasartacho! You've successfully authenticated...` (a permission-denied error here means the SSH key isn't set up — stop and resolve that with the user before continuing, don't switch remotes on your own).

- [ ] **Step 2: Confirm the working tree is clean and history is as expected**

Run: `git status && git log --oneline`
Expected: `nothing to commit, working tree clean` and one commit per task (5 total, plus the earlier spec commit).

- [ ] **Step 3: Push**

Run: `git push -u origin main`
Expected: push succeeds, remote `main` now matches local `main`.
