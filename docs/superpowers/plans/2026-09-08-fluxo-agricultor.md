# Fluxo do(a) Agricultor(a) Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Real, end-to-end CPF-only login for agricultores(as), a presentation screen with an explanation modal, and a 7-selo selection screen — a vertical slice, no mocked data.

**Architecture:** A new Django app `agricultor_auth` holds a CPF-keyed `SelosSelecionados` model and a lightweight authentication mechanism built on `django.core.signing` (not `djangorestframework-simplejwt` — there's no password to verify, so the JWT machinery doesn't fit). On the frontend, a second, independent auth context (`AgricultorAuthContext`) and Dexie table (`agricultorSession`) mirror the organização flow's patterns without reusing its code, since these are different identities.

**Tech Stack:** Django 5 + DRF 3.15 (custom `BaseAuthentication`, no simplejwt), PostgreSQL, React 18 + MUI 5 + `react-router-dom`, Dexie 4, Vitest + Testing Library.

**Spec:** [docs/superpowers/specs/2026-09-08-fluxo-agricultor-design.md](../specs/2026-09-08-fluxo-agricultor-design.md)

## Global Constraints

- Token: `django.core.signing.dumps/loads`, salt `"agricultor-auth"`, `max_age` 30 days (`60 * 60 * 24 * 30` seconds). No refresh mechanism.
- `SelosSelecionados.cpf`: unique, `RegexValidator(r"^\d{11}$")` (same rule as `Agricultor.cpf`).
- The 7 selo keys are fixed: `conserva_natureza`, `policultivo`, `saberes_no_prato`, `sem_agrotoxico`, `solo_vivo`, `cultivando_felicidade`, `boniteza`.
- `AgricultorTokenAuthentication` must implement `authenticate_header()` so an unauthenticated request returns `401`, not DRF's default `403`.
- Frontend session lives in a **separate** Dexie table (`agricultorSession`) and a **separate** React context (`AgricultorAuthContext`) — never reuse the organização's `AuthContext`/`session` table.
- CPF masking reuses `formatCPF`/`onlyDigits` from `frontend/src/format.js` (already built, don't recreate).
- API error display reuses the `ApiValidationError`/field-level `error`+`helperText` pattern already established on the organização's forms.
- Label-matching in tests: any `required` MUI `TextField` needs a regex `getByLabelText` match (e.g. `/^CPF/i`), never an exact string — MUI's visible asterisk becomes part of the accessible label text.
- Every `.then(data => setState(...))` load effect must have a `.catch()` wired to visible error UI, with a covering test — this exact gap was found and fixed three times in the organização sub-project; don't reintroduce it here.

---

### Task 1: `SelosSelecionados` model + `agricultor_auth` app scaffold

**Files:**
- Create: `backend/agricultor_auth/__init__.py`
- Create: `backend/agricultor_auth/models.py`
- Create: `backend/agricultor_auth/tests.py`
- Modify: `backend/app/settings.py`

**Interfaces:**
- Consumes: nothing new.
- Produces: `SelosSelecionados` model (`cpf` unique, `selos` JSONField list, `updated_at`). Consumed by Task 3's endpoints.

- [ ] **Step 1: Write the failing tests**

Create `backend/agricultor_auth/__init__.py` (empty), then `backend/agricultor_auth/tests.py`:

```python
from django.core.exceptions import ValidationError
from django.test import TestCase

from .models import SelosSelecionados


class SelosSelecionadosModelTests(TestCase):
    def test_cria_com_lista_vazia_por_padrao(self):
        registro = SelosSelecionados.objects.create(cpf="12345678900")
        self.assertEqual(registro.selos, [])

    def test_cpf_deve_ser_unico(self):
        SelosSelecionados.objects.create(cpf="12345678900")
        with self.assertRaises(Exception):
            SelosSelecionados.objects.create(cpf="12345678900")

    def test_cpf_invalido_falha_no_full_clean(self):
        registro = SelosSelecionados(cpf="abc")
        with self.assertRaises(ValidationError):
            registro.full_clean()
```

- [ ] **Step 2: Create `backend/agricultor_auth/models.py`**

```python
from django.core.validators import RegexValidator
from django.db import models


class SelosSelecionados(models.Model):
    cpf = models.CharField(
        max_length=11,
        unique=True,
        validators=[
            RegexValidator(r"^\d{11}$", "CPF deve conter exatamente 11 dígitos numéricos.")
        ],
    )
    selos = models.JSONField(default=list)
    updated_at = models.DateTimeField(auto_now=True)

    def __str__(self):
        return self.cpf
```

- [ ] **Step 3: Add `"agricultor_auth"` to `INSTALLED_APPS` in `backend/app/settings.py`**

- [ ] **Step 4: Generate the migration and run the tests**

```bash
docker compose run --rm backend python manage.py makemigrations agricultor_auth
docker compose run --rm backend python manage.py test agricultor_auth
```

Expected: `OK` (3 tests).

- [ ] **Step 5: Apply the migration**

```bash
docker compose run --rm backend python manage.py migrate
```

- [ ] **Step 6: Commit**

```bash
git add backend/agricultor_auth backend/app/settings.py
git commit -m "feat: add SelosSelecionados model"
```

---

### Task 2: CPF-only login endpoint + token authentication

**Files:**
- Create: `backend/agricultor_auth/tokens.py`
- Create: `backend/agricultor_auth/authentication.py`
- Create: `backend/agricultor_auth/views.py`
- Create: `backend/agricultor_auth/urls.py`
- Modify: `backend/agricultor_auth/tests.py`
- Modify: `backend/app/urls.py`

**Interfaces:**
- Consumes: `Agricultor` model (from the organização sub-project, `backend/agricultores/models.py`) — login checks `Agricultor.objects.filter(cpf=...).exists()` across **all** organizações.
- Produces: `POST /api/agricultor/login/` → `200 {"token": "..."}` on a known CPF, `400` otherwise. `gerar_token(cpf)` / `verificar_token(token)` helpers and `AgricultorTokenAuthentication` — consumed by Task 3's endpoints and (indirectly, via the API) by the frontend's `loginAgricultor()` in Task 4.

- [ ] **Step 1: Create `backend/agricultor_auth/tokens.py`**

```python
from django.core import signing

TOKEN_SALT = "agricultor-auth"
TOKEN_MAX_AGE = 60 * 60 * 24 * 30  # 30 dias


def gerar_token(cpf):
    return signing.dumps({"cpf": cpf}, salt=TOKEN_SALT)


def verificar_token(token):
    data = signing.loads(token, salt=TOKEN_SALT, max_age=TOKEN_MAX_AGE)
    return data["cpf"]
```

- [ ] **Step 2: Create `backend/agricultor_auth/authentication.py`**

```python
from rest_framework import authentication, exceptions

from .tokens import verificar_token


class AgricultorIdentity:
    def __init__(self, cpf):
        self.cpf = cpf
        self.is_authenticated = True


class AgricultorTokenAuthentication(authentication.BaseAuthentication):
    keyword = "Bearer"

    def authenticate(self, request):
        header = request.headers.get("Authorization")
        if not header or not header.startswith(f"{self.keyword} "):
            return None
        token = header[len(self.keyword) + 1 :]
        try:
            cpf = verificar_token(token)
        except Exception as exc:
            raise exceptions.AuthenticationFailed("Token inválido ou expirado") from exc
        return (AgricultorIdentity(cpf), None)

    def authenticate_header(self, request):
        return self.keyword
```

(`authenticate_header` is what makes DRF return `401` instead of `403` for an unauthenticated request — without it, `IsAuthenticated` alone produces `403`.)

- [ ] **Step 3: Write the failing tests**

Add these imports to the **top** of `backend/agricultor_auth/tests.py`, alongside the
existing `from django.core.exceptions import ValidationError` /
`from django.test import TestCase` lines (don't put them inline before the new
class — keep the file's import block in one place):

```python
from django.urls import reverse
from rest_framework import status
from rest_framework.test import APITestCase

from agricultores.models import Agricultor
from organizacoes.models import Organizacao
```

Then append the new class at the bottom of the file, below
`SelosSelecionadosModelTests`:

```python
class AgricultorLoginAPITests(APITestCase):
    def setUp(self):
        self.organizacao = Organizacao.objects.create_user(
            cnpj="12345678000199",
            nome="Coop Teste",
            razao_social="Cooperativa Teste LTDA",
            password="senha-segura-123",
        )
        Agricultor.objects.create(
            organizacao=self.organizacao, nome="Maria Agricultora", cpf="12345678900"
        )

    def test_login_com_cpf_cadastrado_retorna_token(self):
        url = reverse("agricultor-login")
        response = self.client.post(url, {"cpf": "12345678900"}, format="json")
        self.assertEqual(response.status_code, status.HTTP_200_OK)
        self.assertIn("token", response.data)

    def test_login_com_cpf_nao_cadastrado_falha(self):
        url = reverse("agricultor-login")
        response = self.client.post(url, {"cpf": "99999999999"}, format="json")
        self.assertEqual(response.status_code, status.HTTP_400_BAD_REQUEST)

    def test_login_com_cpf_mal_formatado_falha(self):
        url = reverse("agricultor-login")
        response = self.client.post(url, {"cpf": "abc"}, format="json")
        self.assertEqual(response.status_code, status.HTTP_400_BAD_REQUEST)
```

- [ ] **Step 4: Create `backend/agricultor_auth/views.py`**

```python
from django.core.exceptions import ValidationError as DjangoValidationError
from django.core.validators import RegexValidator
from rest_framework import permissions
from rest_framework.exceptions import ValidationError
from rest_framework.response import Response
from rest_framework.views import APIView

from agricultores.models import Agricultor

from .tokens import gerar_token

CPF_VALIDATOR = RegexValidator(r"^\d{11}$", "CPF deve conter exatamente 11 dígitos numéricos.")


class AgricultorLoginView(APIView):
    permission_classes = [permissions.AllowAny]

    def post(self, request):
        cpf = request.data.get("cpf", "")
        try:
            CPF_VALIDATOR(cpf)
        except DjangoValidationError:
            raise ValidationError({"cpf": ["CPF deve conter exatamente 11 dígitos numéricos."]})
        if not Agricultor.objects.filter(cpf=cpf).exists():
            raise ValidationError({"cpf": ["CPF não encontrado em nenhuma organização."]})
        return Response({"token": gerar_token(cpf)})
```

- [ ] **Step 5: Create `backend/agricultor_auth/urls.py`**

```python
from django.urls import path

from .views import AgricultorLoginView

urlpatterns = [
    path("login/", AgricultorLoginView.as_view(), name="agricultor-login"),
]
```

- [ ] **Step 6: Wire it in `backend/app/urls.py`**

```python
urlpatterns = [
    path("api/health/", include("health.urls")),
    path("api/organizacoes/", include("organizacoes.urls")),
    path("api/agricultores/", include("agricultores.urls")),
    path("api/agricultor/", include("agricultor_auth.urls")),
    path("api/auth/login/", TokenObtainPairView.as_view(), name="token_obtain_pair"),
    path("api/auth/refresh/", TokenRefreshView.as_view(), name="token_refresh"),
]
```

- [ ] **Step 7: Run the tests**

```bash
docker compose run --rm backend python manage.py test agricultor_auth
```

Expected: `OK` (6 tests).

- [ ] **Step 8: Commit**

```bash
git add backend/agricultor_auth backend/app/urls.py
git commit -m "feat: add CPF-only login endpoint and token authentication for agricultores"
```

---

### Task 3: `/api/agricultor/me/` and `/api/agricultor/selos/`

**Files:**
- Modify: `backend/agricultor_auth/views.py`
- Modify: `backend/agricultor_auth/urls.py`
- Modify: `backend/agricultor_auth/tests.py`

**Interfaces:**
- Consumes: `AgricultorTokenAuthentication` (Task 2), `Agricultor` model, `SelosSelecionados` model (Task 1).
- Produces: `GET /api/agricultor/me/` → `{"nome": "...", "selos": [...]}`; `PUT /api/agricultor/selos/` → `{"selos": [...]}`. Consumed by the frontend's `getAgricultorMe()`/`salvarSelos()` in Task 4.

- [ ] **Step 1: Write the failing tests**

Add `from .tokens import gerar_token` to the **top** of
`backend/agricultor_auth/tests.py`, alongside the existing imports. Then
append the new class at the bottom of the file, below
`AgricultorLoginAPITests`:

```python
class AgricultorMeAndSelosAPITests(APITestCase):
    def setUp(self):
        self.organizacao = Organizacao.objects.create_user(
            cnpj="12345678000199",
            nome="Coop Teste",
            razao_social="Cooperativa Teste LTDA",
            password="senha-segura-123",
        )
        Agricultor.objects.create(
            organizacao=self.organizacao, nome="Maria Agricultora", cpf="12345678900"
        )
        self.token = gerar_token("12345678900")

    def auth_headers(self):
        return {"HTTP_AUTHORIZATION": f"Bearer {self.token}"}

    def test_me_requer_autenticacao(self):
        response = self.client.get(reverse("agricultor-me"))
        self.assertEqual(response.status_code, status.HTTP_401_UNAUTHORIZED)

    def test_me_retorna_nome_e_selos_vazios_inicialmente(self):
        response = self.client.get(reverse("agricultor-me"), **self.auth_headers())
        self.assertEqual(response.status_code, status.HTTP_200_OK)
        self.assertEqual(response.data["nome"], "Maria Agricultora")
        self.assertEqual(response.data["selos"], [])

    def test_salvar_e_recuperar_selos(self):
        response = self.client.put(
            reverse("agricultor-selos"),
            {"selos": ["policultivo", "solo_vivo"]},
            format="json",
            **self.auth_headers(),
        )
        self.assertEqual(response.status_code, status.HTTP_200_OK)
        response = self.client.get(reverse("agricultor-me"), **self.auth_headers())
        self.assertEqual(response.data["selos"], ["policultivo", "solo_vivo"])
```

- [ ] **Step 2: Add the two views to `backend/agricultor_auth/views.py`**

Add these imports to the top of the file (alongside the existing ones):

```python
from .authentication import AgricultorTokenAuthentication
from .models import SelosSelecionados
```

Append:

```python
class AgricultorMeView(APIView):
    authentication_classes = [AgricultorTokenAuthentication]
    permission_classes = [permissions.IsAuthenticated]

    def get(self, request):
        cpf = request.user.cpf
        agricultor = Agricultor.objects.filter(cpf=cpf).first()
        nome = agricultor.nome if agricultor else ""
        registro = SelosSelecionados.objects.filter(cpf=cpf).first()
        selos = registro.selos if registro else []
        return Response({"nome": nome, "selos": selos})


class AgricultorSelosView(APIView):
    authentication_classes = [AgricultorTokenAuthentication]
    permission_classes = [permissions.IsAuthenticated]

    def put(self, request):
        selos = request.data.get("selos", [])
        registro, _ = SelosSelecionados.objects.update_or_create(
            cpf=request.user.cpf, defaults={"selos": selos}
        )
        return Response({"selos": registro.selos})
```

- [ ] **Step 3: Add the two paths to `backend/agricultor_auth/urls.py`**

```python
from django.urls import path

from .views import AgricultorLoginView, AgricultorMeView, AgricultorSelosView

urlpatterns = [
    path("login/", AgricultorLoginView.as_view(), name="agricultor-login"),
    path("me/", AgricultorMeView.as_view(), name="agricultor-me"),
    path("selos/", AgricultorSelosView.as_view(), name="agricultor-selos"),
]
```

- [ ] **Step 4: Run the tests**

```bash
docker compose run --rm backend python manage.py test
```

Expected: `OK` (30 tests total across the whole backend — 21 from before this plan, plus 9 in `agricultor_auth`).

- [ ] **Step 5: Commit**

```bash
git add backend/agricultor_auth
git commit -m "feat: add agricultor me and selos endpoints"
```

---

### Task 4: Frontend — sessão do agricultor (Dexie + AgricultorAuthContext + API client)

**Files:**
- Modify: `frontend/src/db.js`
- Modify: `frontend/src/main.jsx`
- Create: `frontend/src/auth/AgricultorAuthContext.jsx`
- Create: `frontend/src/auth/AgricultorAuthContext.test.jsx`
- Create: `frontend/src/auth/agricultorAuthFetch.js`
- Create: `frontend/src/auth/agricultorAuthFetch.test.js`
- Create: `frontend/src/auth/agricultorApi.js`

**Interfaces:**
- Consumes: `db` (Dexie) from `frontend/src/db.js`; `ApiValidationError` from `frontend/src/api.js`; backend endpoints from Tasks 2-3.
- Produces: `useAgricultorAuth()` hook returning `{ session, login({token}), logout() }` (same 3-state shape as the organização's `useAuth()`: `undefined`/`null`/session object) — consumed by Tasks 5-7. `agricultorAuthFetch(path, options)` — consumed by `agricultorApi.js`. `agricultorApi.js` functions `loginAgricultor({cpf})`, `getAgricultorMe()`, `salvarSelos(selos)` — consumed by Tasks 5-7.

- [ ] **Step 1: Add the `agricultorSession` table to Dexie**

`frontend/src/db.js` — add a new version, keeping every earlier version's stores unchanged:

```javascript
db.version(3).stores({
  diagnostics: "++id, checkedAt",
  session: "&id",
  agricultorSession: "&id",
});
```

- [ ] **Step 2: Write the failing tests for `AgricultorAuthContext`**

`frontend/src/auth/AgricultorAuthContext.test.jsx`:

```jsx
import { render, screen, waitFor } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { AgricultorAuthProvider, useAgricultorAuth } from "./AgricultorAuthContext.jsx";
import { db } from "../db.js";

function Probe() {
  const { session, login, logout } = useAgricultorAuth();
  return (
    <div>
      <span>{session === undefined ? "carregando" : session ? "logado" : "deslogado"}</span>
      <button onClick={() => login({ token: "abc-token" })}>login</button>
      <button onClick={() => logout()}>logout</button>
    </div>
  );
}

describe("AgricultorAuthContext", () => {
  afterEach(async () => {
    await db.agricultorSession.clear();
  });

  it("começa deslogado quando não há sessão salva", async () => {
    render(
      <AgricultorAuthProvider>
        <Probe />
      </AgricultorAuthProvider>
    );
    await waitFor(() => expect(screen.getByText("deslogado")).toBeInTheDocument());
  });

  it("login salva o token no Dexie e atualiza o estado", async () => {
    render(
      <AgricultorAuthProvider>
        <Probe />
      </AgricultorAuthProvider>
    );
    await waitFor(() => expect(screen.getByText("deslogado")).toBeInTheDocument());
    await userEvent.click(screen.getByText("login"));
    await waitFor(() => expect(screen.getByText("logado")).toBeInTheDocument());
    const stored = await db.agricultorSession.get("current");
    expect(stored.token).toBe("abc-token");
  });

  it("logout limpa a sessão do Dexie", async () => {
    await db.agricultorSession.put({ id: "current", token: "abc-token" });
    render(
      <AgricultorAuthProvider>
        <Probe />
      </AgricultorAuthProvider>
    );
    await waitFor(() => expect(screen.getByText("logado")).toBeInTheDocument());
    await userEvent.click(screen.getByText("logout"));
    await waitFor(() => expect(screen.getByText("deslogado")).toBeInTheDocument());
    const stored = await db.agricultorSession.get("current");
    expect(stored).toBeUndefined();
  });

  it("cai pra deslogado se a leitura do Dexie falhar", async () => {
    vi.spyOn(db.agricultorSession, "get").mockRejectedValueOnce(new Error("boom"));
    render(
      <AgricultorAuthProvider>
        <Probe />
      </AgricultorAuthProvider>
    );
    await waitFor(() => expect(screen.getByText("deslogado")).toBeInTheDocument());
    vi.restoreAllMocks();
  });
});
```

- [ ] **Step 3: Create `frontend/src/auth/AgricultorAuthContext.jsx`**

```jsx
import { createContext, useCallback, useContext, useEffect, useState } from "react";
import { db } from "../db.js";

const AgricultorAuthContext = createContext(null);
const SESSION_ID = "current";

export function AgricultorAuthProvider({ children }) {
  const [session, setSession] = useState(undefined);

  useEffect(() => {
    db.agricultorSession
      .get(SESSION_ID)
      .then((stored) => setSession(stored ?? null))
      .catch(() => setSession(null));
  }, []);

  const login = useCallback(async ({ token }) => {
    const record = { id: SESSION_ID, token };
    await db.agricultorSession.put(record);
    setSession(record);
  }, []);

  const logout = useCallback(async () => {
    await db.agricultorSession.delete(SESSION_ID);
    setSession(null);
  }, []);

  return (
    <AgricultorAuthContext.Provider value={{ session, login, logout }}>
      {children}
    </AgricultorAuthContext.Provider>
  );
}

export function useAgricultorAuth() {
  const ctx = useContext(AgricultorAuthContext);
  if (!ctx) {
    throw new Error("useAgricultorAuth deve ser usado dentro de AgricultorAuthProvider");
  }
  return ctx;
}
```

- [ ] **Step 4: Run the `AgricultorAuthContext` tests**

```bash
docker compose run --rm frontend npm test -- AgricultorAuthContext
```

Expected: `4 passed`.

- [ ] **Step 5: Write the failing tests for `agricultorAuthFetch`**

`frontend/src/auth/agricultorAuthFetch.test.js`:

```javascript
import { db } from "../db.js";
import { agricultorAuthFetch } from "./agricultorAuthFetch.js";

describe("agricultorAuthFetch", () => {
  beforeEach(async () => {
    await db.agricultorSession.put({ id: "current", token: "abc-token" });
  });

  afterEach(async () => {
    await db.agricultorSession.clear();
    vi.restoreAllMocks();
  });

  it("attaches the token and returns the response", async () => {
    const fetchMock = vi
      .fn()
      .mockResolvedValue(new Response(JSON.stringify({ ok: true }), { status: 200 }));
    vi.stubGlobal("fetch", fetchMock);

    const response = await agricultorAuthFetch("/api/agricultor/me/");

    expect(response.status).toBe(200);
    const [, options] = fetchMock.mock.calls[0];
    expect(options.headers.Authorization).toBe("Bearer abc-token");
  });

  it("throws when there is no session", async () => {
    await db.agricultorSession.clear();
    await expect(agricultorAuthFetch("/api/agricultor/me/")).rejects.toThrow("Não autenticado");
  });
});
```

- [ ] **Step 6: Create `frontend/src/auth/agricultorAuthFetch.js`**

```javascript
import { db } from "../db.js";

const API_URL = import.meta.env.VITE_API_URL ?? "http://localhost:8000";
const SESSION_ID = "current";

export async function agricultorAuthFetch(path, options = {}) {
  const session = await db.agricultorSession.get(SESSION_ID);
  if (!session) {
    throw new Error("Não autenticado");
  }
  return fetch(`${API_URL}${path}`, {
    ...options,
    headers: {
      "Content-Type": "application/json",
      ...options.headers,
      Authorization: `Bearer ${session.token}`,
    },
  });
}
```

- [ ] **Step 7: Run the `agricultorAuthFetch` tests**

```bash
docker compose run --rm frontend npm test -- agricultorAuthFetch
```

Expected: `2 passed`.

- [ ] **Step 8: Create `frontend/src/auth/agricultorApi.js`**

```javascript
import { agricultorAuthFetch } from "./agricultorAuthFetch.js";
import { ApiValidationError } from "../api.js";

const API_URL = import.meta.env.VITE_API_URL ?? "http://localhost:8000";

export async function loginAgricultor({ cpf }) {
  const response = await fetch(`${API_URL}/api/agricultor/login/`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ cpf }),
  });
  if (!response.ok) {
    const data = await response.json().catch(() => ({}));
    throw new ApiValidationError(data, "Não foi possível entrar");
  }
  return response.json();
}

export async function getAgricultorMe() {
  const response = await agricultorAuthFetch("/api/agricultor/me/");
  if (!response.ok) throw new Error("Não foi possível carregar seus dados");
  return response.json();
}

export async function salvarSelos(selos) {
  const response = await agricultorAuthFetch("/api/agricultor/selos/", {
    method: "PUT",
    body: JSON.stringify({ selos }),
  });
  if (!response.ok) throw new Error("Não foi possível salvar os selos");
  return response.json();
}
```

- [ ] **Step 9: Wrap the app with `AgricultorAuthProvider`**

Replace `frontend/src/main.jsx` with (nesting order between `AuthProvider` and
`AgricultorAuthProvider` doesn't matter, they're independent — this just adds
one import and one wrapping element to the file's current content):

```jsx
import React from "react";
import ReactDOM from "react-dom/client";
import { BrowserRouter } from "react-router-dom";
import { ThemeProvider } from "@mui/material/styles";
import CssBaseline from "@mui/material/CssBaseline";
import App from "./App.jsx";
import { theme } from "./theme.js";
import { AuthProvider } from "./auth/AuthContext.jsx";
import { AgricultorAuthProvider } from "./auth/AgricultorAuthContext.jsx";

ReactDOM.createRoot(document.getElementById("root")).render(
  <React.StrictMode>
    <ThemeProvider theme={theme}>
      <CssBaseline />
      <AuthProvider>
        <AgricultorAuthProvider>
          <BrowserRouter>
            <App />
          </BrowserRouter>
        </AgricultorAuthProvider>
      </AuthProvider>
    </ThemeProvider>
  </React.StrictMode>
);
```

- [ ] **Step 10: Run the full frontend test suite**

```bash
docker compose run --rm frontend npm test
```

Expected: all tests pass (previous tests + the 6 new ones).

- [ ] **Step 11: Commit**

```bash
git add frontend/src/db.js frontend/src/main.jsx frontend/src/auth/AgricultorAuthContext.jsx frontend/src/auth/AgricultorAuthContext.test.jsx frontend/src/auth/agricultorAuthFetch.js frontend/src/auth/agricultorAuthFetch.test.js frontend/src/auth/agricultorApi.js
git commit -m "feat: add agricultor session handling (Dexie + AgricultorAuthContext + agricultorAuthFetch)"
```

---

### Task 5: Tela pública — apresentação, modal e login por CPF

**Files:**
- Create: `frontend/src/pages/AgricultorLoginPage.jsx`
- Create: `frontend/src/pages/AgricultorLoginPage.test.jsx`
- Delete: `frontend/src/pages/AgricultorPage.jsx` (the sub-project-1 stub, superseded)
- Modify: `frontend/src/App.jsx`

**Interfaces:**
- Consumes: `loginAgricultor` (Task 4's `agricultorApi.js`), `useAgricultorAuth()` (Task 4), `formatCPF`/`onlyDigits` (`frontend/src/format.js`), `ApiValidationError` (`frontend/src/api.js`).
- Produces: route `/agricultor`. Consumed by Task 6 (routing sits alongside the protected routes it adds).

- [ ] **Step 1: Write the failing tests**

`frontend/src/pages/AgricultorLoginPage.test.jsx`:

```jsx
import { render, screen, waitFor } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { MemoryRouter, Routes, Route } from "react-router-dom";
import AgricultorLoginPage from "./AgricultorLoginPage.jsx";
import { AgricultorAuthProvider } from "../auth/AgricultorAuthContext.jsx";

function renderPage() {
  return render(
    <AgricultorAuthProvider>
      <MemoryRouter initialEntries={["/agricultor"]}>
        <Routes>
          <Route path="/agricultor" element={<AgricultorLoginPage />} />
          <Route path="/agricultor/inicio" element={<div>Inicio Stub</div>} />
        </Routes>
      </MemoryRouter>
    </AgricultorAuthProvider>
  );
}

describe("AgricultorLoginPage", () => {
  afterEach(() => {
    vi.restoreAllMocks();
  });

  it("opens the explanation modal", async () => {
    renderPage();
    await userEvent.click(screen.getByRole("button", { name: "Como fazer? / O que é?" }));
    expect(
      screen.getByText(/bem-vindo\(a\) ao Protocolo de Levantamento de Benefícios/)
    ).toBeInTheDocument();
  });

  it("navigates to /agricultor/inicio after a successful login", async () => {
    vi.stubGlobal(
      "fetch",
      vi.fn().mockResolvedValue(new Response(JSON.stringify({ token: "abc" }), { status: 200 }))
    );
    renderPage();

    await userEvent.type(screen.getByLabelText(/^CPF/i), "12345678900");
    await userEvent.click(screen.getByRole("button", { name: "Entrar" }));

    await waitFor(() => expect(screen.getByText("Inicio Stub")).toBeInTheDocument());
  });

  it("shows an error when the CPF is not found", async () => {
    vi.stubGlobal(
      "fetch",
      vi.fn().mockResolvedValue(
        new Response(JSON.stringify({ cpf: ["CPF não encontrado em nenhuma organização."] }), {
          status: 400,
        })
      )
    );
    renderPage();

    await userEvent.type(screen.getByLabelText(/^CPF/i), "99999999999");
    await userEvent.click(screen.getByRole("button", { name: "Entrar" }));

    await waitFor(() =>
      expect(screen.getByText("CPF não encontrado em nenhuma organização.")).toBeInTheDocument()
    );
  });
});
```

- [ ] **Step 2: Create `frontend/src/pages/AgricultorLoginPage.jsx`**

```jsx
import { useState } from "react";
import { useNavigate } from "react-router-dom";
import Container from "@mui/material/Container";
import Typography from "@mui/material/Typography";
import TextField from "@mui/material/TextField";
import Button from "@mui/material/Button";
import Stack from "@mui/material/Stack";
import Alert from "@mui/material/Alert";
import Dialog from "@mui/material/Dialog";
import DialogTitle from "@mui/material/DialogTitle";
import DialogContent from "@mui/material/DialogContent";
import DialogContentText from "@mui/material/DialogContentText";
import DialogActions from "@mui/material/DialogActions";
import { loginAgricultor } from "../auth/agricultorApi.js";
import { ApiValidationError } from "../api.js";
import { formatCPF, onlyDigits } from "../format.js";
import { useAgricultorAuth } from "../auth/AgricultorAuthContext.jsx";

export default function AgricultorLoginPage() {
  const [cpf, setCpf] = useState("");
  const [error, setError] = useState(null);
  const [fieldErrors, setFieldErrors] = useState({});
  const [loading, setLoading] = useState(false);
  const [mostrarModal, setMostrarModal] = useState(false);
  const { login } = useAgricultorAuth();
  const navigate = useNavigate();

  async function handleSubmit(event) {
    event.preventDefault();
    setError(null);
    setFieldErrors({});
    setLoading(true);
    try {
      const tokens = await loginAgricultor({ cpf: onlyDigits(cpf) });
      await login(tokens);
      navigate("/agricultor/inicio");
    } catch (err) {
      setError(err.message);
      if (err instanceof ApiValidationError) {
        setFieldErrors(err.fields);
      }
    } finally {
      setLoading(false);
    }
  }

  return (
    <Container maxWidth="xs" sx={{ py: 8 }}>
      <Typography variant="h5" component="h1" gutterBottom>
        Protocolo de Levantamento de Benefícios dos SAFs
      </Typography>
      <Button onClick={() => setMostrarModal(true)} sx={{ mb: 2 }}>
        Como fazer? / O que é?
      </Button>
      <form onSubmit={handleSubmit}>
        <Stack spacing={2}>
          {error && <Alert severity="error">{error}</Alert>}
          <TextField
            label="CPF"
            value={cpf}
            onChange={(e) => setCpf(formatCPF(e.target.value))}
            required
            fullWidth
            inputMode="numeric"
            error={Boolean(fieldErrors.cpf)}
            helperText={fieldErrors.cpf?.[0] ?? "Coloque seu CPF para entrar no sistema"}
          />
          <Button type="submit" variant="contained" disabled={loading}>
            Entrar
          </Button>
        </Stack>
      </form>
      <Dialog open={mostrarModal} onClose={() => setMostrarModal(false)}>
        <DialogTitle>Protocolo de Levantamento de Benefícios dos SAFs</DialogTitle>
        <DialogContent>
          <DialogContentText>
            Prezado(a) agricultor(a), bem-vindo(a) ao Protocolo de Levantamento de Benefícios dos
            Sistemas Agroflorestais (SAFs)! Este Protocolo é destinado a você, agricultor(a)
            familiar que participa de associação ou cooperativa e que tem sistemas agroflorestais
            de base agroecológica em seu sítio. Com este sistema será possível registrar os
            benefícios do seu SAF e criar um arquivo para imprimir em rótulos ou embalagens,
            comunicando os benefícios dos SAFs aos consumidores de seus produtos.
          </DialogContentText>
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setMostrarModal(false)}>Fechar</Button>
        </DialogActions>
      </Dialog>
    </Container>
  );
}
```

- [ ] **Step 3: Delete the superseded stub**

```bash
rm frontend/src/pages/AgricultorPage.jsx
```

- [ ] **Step 4: Update `frontend/src/App.jsx`**

Replace the `AgricultorPage` import and its `/agricultor` route:

```jsx
import AgricultorLoginPage from "./pages/AgricultorLoginPage.jsx";
```

```jsx
<Route path="/agricultor" element={<AgricultorLoginPage />} />
```

(Task 6 adds the protected agricultor routes back into this file.)

- [ ] **Step 5: Run the frontend test suite**

```bash
docker compose run --rm frontend npm test
```

Expected: all tests pass.

- [ ] **Step 6: Commit**

```bash
git add frontend/src/pages/AgricultorLoginPage.jsx frontend/src/pages/AgricultorLoginPage.test.jsx frontend/src/App.jsx
git rm frontend/src/pages/AgricultorPage.jsx
git commit -m "feat: add agricultor login screen with CPF and explanation modal"
```

---

### Task 6: Rotas protegidas do agricultor — `RequireAgricultorAuth` + layout + tela inicial

**Files:**
- Create: `frontend/src/auth/RequireAgricultorAuth.jsx`
- Create: `frontend/src/auth/RequireAgricultorAuth.test.jsx`
- Create: `frontend/src/auth/AgricultorLayout.jsx`
- Create: `frontend/src/pages/AgricultorInicioPage.jsx`
- Create: `frontend/src/pages/AgricultorInicioPage.test.jsx`
- Modify: `frontend/src/App.jsx`

**Interfaces:**
- Consumes: `useAgricultorAuth()` (Task 4), `getAgricultorMe` (Task 4's `agricultorApi.js`).
- Produces: `<RequireAgricultorAuth>` wrapper, `<AgricultorLayout>` (AppBar + logout), route `/agricultor/inicio`. Consumed directly by `App.jsx`'s protected agricultor route group; Task 7 registers its page under that same group.

- [ ] **Step 1: Write the failing tests for `RequireAgricultorAuth`**

`frontend/src/auth/RequireAgricultorAuth.test.jsx`:

```jsx
import { render, screen, waitFor } from "@testing-library/react";
import { MemoryRouter, Routes, Route } from "react-router-dom";
import RequireAgricultorAuth from "./RequireAgricultorAuth.jsx";
import { AgricultorAuthProvider } from "./AgricultorAuthContext.jsx";
import { db } from "../db.js";

function renderProtected() {
  return render(
    <AgricultorAuthProvider>
      <MemoryRouter initialEntries={["/agricultor/inicio"]}>
        <Routes>
          <Route path="/agricultor" element={<div>Login Stub</div>} />
          <Route
            path="/agricultor/inicio"
            element={
              <RequireAgricultorAuth>
                <div>Inicio Protegido</div>
              </RequireAgricultorAuth>
            }
          />
        </Routes>
      </MemoryRouter>
    </AgricultorAuthProvider>
  );
}

describe("RequireAgricultorAuth", () => {
  afterEach(async () => {
    await db.agricultorSession.clear();
  });

  it("shows protected content when a session exists", async () => {
    await db.agricultorSession.put({ id: "current", token: "abc-token" });
    renderProtected();
    await waitFor(() => expect(screen.getByText("Inicio Protegido")).toBeInTheDocument());
  });

  it("redirects to login when there is no session", async () => {
    renderProtected();
    await waitFor(() => expect(screen.getByText("Login Stub")).toBeInTheDocument());
  });
});
```

- [ ] **Step 2: Create `frontend/src/auth/RequireAgricultorAuth.jsx`**

```jsx
import { Navigate } from "react-router-dom";
import { useAgricultorAuth } from "./AgricultorAuthContext.jsx";

export default function RequireAgricultorAuth({ children }) {
  const { session } = useAgricultorAuth();

  if (session === undefined) {
    return null;
  }

  if (session === null) {
    return <Navigate to="/agricultor" replace />;
  }

  return children;
}
```

- [ ] **Step 3: Run the tests**

```bash
docker compose run --rm frontend npm test -- RequireAgricultorAuth
```

Expected: `2 passed`.

- [ ] **Step 4: Create `frontend/src/auth/AgricultorLayout.jsx`**

```jsx
import { Outlet, useNavigate } from "react-router-dom";
import AppBar from "@mui/material/AppBar";
import Toolbar from "@mui/material/Toolbar";
import Typography from "@mui/material/Typography";
import Button from "@mui/material/Button";
import { useAgricultorAuth } from "./AgricultorAuthContext.jsx";

export default function AgricultorLayout() {
  const { logout } = useAgricultorAuth();
  const navigate = useNavigate();

  async function handleLogout() {
    await logout();
    navigate("/agricultor");
  }

  return (
    <>
      <AppBar position="static">
        <Toolbar sx={{ justifyContent: "space-between" }}>
          <Typography variant="h6">Protocolo de Benefícios dos SAFs</Typography>
          <Button color="inherit" onClick={handleLogout}>
            Sair
          </Button>
        </Toolbar>
      </AppBar>
      <Outlet />
    </>
  );
}
```

- [ ] **Step 5: Write the failing tests for `AgricultorInicioPage`**

`frontend/src/pages/AgricultorInicioPage.test.jsx`:

```jsx
import { render, screen, waitFor } from "@testing-library/react";
import { MemoryRouter } from "react-router-dom";
import AgricultorInicioPage from "./AgricultorInicioPage.jsx";
import * as agricultorApi from "../auth/agricultorApi.js";

describe("AgricultorInicioPage", () => {
  afterEach(() => {
    vi.restoreAllMocks();
  });

  it("shows a greeting with the agricultor's name", async () => {
    vi.spyOn(agricultorApi, "getAgricultorMe").mockResolvedValue({
      nome: "Maria Agricultora",
      selos: [],
    });
    render(
      <MemoryRouter>
        <AgricultorInicioPage />
      </MemoryRouter>
    );
    await waitFor(() => expect(screen.getByText("Olá, Maria Agricultora!")).toBeInTheDocument());
  });

  it("shows an error when loading fails", async () => {
    vi.spyOn(agricultorApi, "getAgricultorMe").mockRejectedValue(
      new Error("Não foi possível carregar seus dados")
    );
    render(
      <MemoryRouter>
        <AgricultorInicioPage />
      </MemoryRouter>
    );
    await waitFor(() =>
      expect(screen.getByText("Não foi possível carregar seus dados")).toBeInTheDocument()
    );
  });
});
```

- [ ] **Step 6: Create `frontend/src/pages/AgricultorInicioPage.jsx`**

```jsx
import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import Container from "@mui/material/Container";
import Typography from "@mui/material/Typography";
import Button from "@mui/material/Button";
import Stack from "@mui/material/Stack";
import { getAgricultorMe } from "../auth/agricultorApi.js";

export default function AgricultorInicioPage() {
  const [nome, setNome] = useState(null);
  const [error, setError] = useState(null);
  const navigate = useNavigate();

  useEffect(() => {
    getAgricultorMe()
      .then((dados) => setNome(dados.nome))
      .catch((err) => setError(err.message));
  }, []);

  return (
    <Container maxWidth="sm" sx={{ py: 8 }}>
      {error && <Typography color="error">{error}</Typography>}
      <Typography variant="h5" component="h1" gutterBottom>
        {nome ? `Olá, ${nome}!` : "Bem-vindo(a)!"}
      </Typography>
      <Stack spacing={2} sx={{ mt: 4 }}>
        <Button variant="contained" onClick={() => navigate("/agricultor/protocolo")}>
          Protocolo
        </Button>
      </Stack>
    </Container>
  );
}
```

- [ ] **Step 7: Update `frontend/src/App.jsx`** to add the protected agricultor route group

```jsx
import RequireAgricultorAuth from "./auth/RequireAgricultorAuth.jsx";
import AgricultorLayout from "./auth/AgricultorLayout.jsx";
import AgricultorInicioPage from "./pages/AgricultorInicioPage.jsx";
```

```jsx
<Route
  element={
    <RequireAgricultorAuth>
      <AgricultorLayout />
    </RequireAgricultorAuth>
  }
>
  <Route path="/agricultor/inicio" element={<AgricultorInicioPage />} />
</Route>
```

(Place this alongside, not nested inside, the organização's protected route group — they're independent guards. Task 7 adds `/agricultor/protocolo` as a sibling inside this same group.)

- [ ] **Step 8: Run the full frontend test suite**

```bash
docker compose run --rm frontend npm test
```

Expected: all tests pass.

- [ ] **Step 9: Commit**

```bash
git add frontend/src/auth/RequireAgricultorAuth.jsx frontend/src/auth/RequireAgricultorAuth.test.jsx frontend/src/auth/AgricultorLayout.jsx frontend/src/pages/AgricultorInicioPage.jsx frontend/src/pages/AgricultorInicioPage.test.jsx frontend/src/App.jsx
git commit -m "feat: add protected agricultor routes with logout and inicio screen"
```

---

### Task 7: Tela de seleção dos selos

**Files:**
- Create: `frontend/src/pages/AgricultorProtocoloPage.jsx`
- Create: `frontend/src/pages/AgricultorProtocoloPage.test.jsx`
- Modify: `frontend/src/App.jsx`

**Interfaces:**
- Consumes: `getAgricultorMe`, `salvarSelos` (Task 4's `agricultorApi.js`).
- Produces: route `/agricultor/protocolo`. Last task in this plan.

- [ ] **Step 1: Write the failing tests**

`frontend/src/pages/AgricultorProtocoloPage.test.jsx`:

```jsx
import { render, screen, waitFor } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import AgricultorProtocoloPage from "./AgricultorProtocoloPage.jsx";
import * as agricultorApi from "../auth/agricultorApi.js";

describe("AgricultorProtocoloPage", () => {
  afterEach(() => {
    vi.restoreAllMocks();
  });

  it("loads existing selos and reflects them as checked", async () => {
    vi.spyOn(agricultorApi, "getAgricultorMe").mockResolvedValue({
      nome: "Maria",
      selos: ["policultivo"],
    });
    render(<AgricultorProtocoloPage />);

    const policultivo = await screen.findByRole("checkbox", { name: "Policultivo" });
    expect(policultivo).toBeChecked();
    expect(screen.getByRole("checkbox", { name: "Solo vivo" })).not.toBeChecked();
  });

  it("saves the selected selos", async () => {
    vi.spyOn(agricultorApi, "getAgricultorMe").mockResolvedValue({ nome: "Maria", selos: [] });
    vi.spyOn(agricultorApi, "salvarSelos").mockResolvedValue({ selos: ["boniteza"] });
    render(<AgricultorProtocoloPage />);

    const boniteza = await screen.findByRole("checkbox", { name: "Boniteza" });
    await userEvent.click(boniteza);
    await userEvent.click(screen.getByRole("button", { name: "Salvar" }));

    await waitFor(() => expect(screen.getByText("Salvo!")).toBeInTheDocument());
    expect(agricultorApi.salvarSelos).toHaveBeenCalledWith(["boniteza"]);
  });

  it("shows an error when loading fails", async () => {
    vi.spyOn(agricultorApi, "getAgricultorMe").mockRejectedValue(
      new Error("Não foi possível carregar seus dados")
    );
    render(<AgricultorProtocoloPage />);
    await waitFor(() =>
      expect(screen.getByText("Não foi possível carregar seus dados")).toBeInTheDocument()
    );
  });
});
```

- [ ] **Step 2: Create `frontend/src/pages/AgricultorProtocoloPage.jsx`**

```jsx
import { useEffect, useState } from "react";
import Container from "@mui/material/Container";
import Typography from "@mui/material/Typography";
import FormGroup from "@mui/material/FormGroup";
import FormControlLabel from "@mui/material/FormControlLabel";
import Checkbox from "@mui/material/Checkbox";
import Button from "@mui/material/Button";
import Alert from "@mui/material/Alert";
import Stack from "@mui/material/Stack";
import { getAgricultorMe, salvarSelos } from "../auth/agricultorApi.js";

const SELOS = [
  ["conserva_natureza", "Conserva a natureza"],
  ["policultivo", "Policultivo"],
  ["saberes_no_prato", "Saberes no prato"],
  ["sem_agrotoxico", "Produzido sem Agrotóxico"],
  ["solo_vivo", "Solo vivo"],
  ["cultivando_felicidade", "Cultivando felicidade"],
  ["boniteza", "Boniteza"],
];

export default function AgricultorProtocoloPage() {
  const [selecionados, setSelecionados] = useState(null);
  const [error, setError] = useState(null);
  const [salvando, setSalvando] = useState(false);
  const [salvo, setSalvo] = useState(false);

  useEffect(() => {
    getAgricultorMe()
      .then((dados) => setSelecionados(dados.selos))
      .catch((err) => setError(err.message));
  }, []);

  function toggleSelo(chave) {
    setSalvo(false);
    setSelecionados((prev) =>
      prev.includes(chave) ? prev.filter((s) => s !== chave) : [...prev, chave]
    );
  }

  async function handleSalvar() {
    setError(null);
    setSalvando(true);
    try {
      await salvarSelos(selecionados);
      setSalvo(true);
    } catch (err) {
      setError(err.message);
    } finally {
      setSalvando(false);
    }
  }

  return (
    <Container maxWidth="sm" sx={{ py: 6 }}>
      <Typography variant="h5" component="h1" gutterBottom>
        Selos de benefício
      </Typography>
      {error && <Alert severity="error">{error}</Alert>}
      {salvo && <Alert severity="success">Salvo!</Alert>}
      {selecionados && (
        <>
          <FormGroup>
            {SELOS.map(([chave, rotulo]) => (
              <FormControlLabel
                key={chave}
                control={
                  <Checkbox
                    checked={selecionados.includes(chave)}
                    onChange={() => toggleSelo(chave)}
                  />
                }
                label={rotulo}
              />
            ))}
          </FormGroup>
          <Stack sx={{ mt: 2 }}>
            <Button variant="contained" onClick={handleSalvar} disabled={salvando}>
              Salvar
            </Button>
          </Stack>
        </>
      )}
    </Container>
  );
}
```

- [ ] **Step 3: Wire it into `frontend/src/App.jsx`** (inside the protected agricultor route group, alongside `AgricultorInicioPage`)

```jsx
import AgricultorProtocoloPage from "./pages/AgricultorProtocoloPage.jsx";
```

```jsx
<Route path="/agricultor/protocolo" element={<AgricultorProtocoloPage />} />
```

- [ ] **Step 4: Run the full frontend and backend test suites**

```bash
docker compose run --rm frontend npm test
docker compose run --rm backend python manage.py test
```

Expected: everything green.

- [ ] **Step 5: Verify the whole flow manually in a browser**

```bash
docker compose up -d --build
```

Cadastre uma organização e um agricultor (via o fluxo já existente), depois em `/agricultor` faça login com o CPF desse agricultor, confirme que abre o modal "Como fazer?", entre, veja a saudação com o nome, clique em "Protocolo", marque alguns selos, salve, recarregue a página e confirme que os selos marcados persistiram.

- [ ] **Step 6: Commit**

```bash
git add frontend/src/pages/AgricultorProtocoloPage.jsx frontend/src/pages/AgricultorProtocoloPage.test.jsx frontend/src/App.jsx
git commit -m "feat: add selo selection screen for agricultores"
```
