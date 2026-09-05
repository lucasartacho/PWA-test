# Fluxo da Organização (Etapa 1.1) Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Real, end-to-end (fatia vertical) login and registration flow for Associações/Cooperativas — Django models, JWT auth, DRF endpoints, and the matching React/MUI screens — including farmer registration/CRUD by the organization.

**Architecture:** Two new Django apps (`organizacoes` with a custom JWT-authenticated user model, `agricultores` with a model scoped by foreign key to `organizacoes`), exposed through DRF endpoints secured by `djangorestframework-simplejwt`. The frontend gets an `AuthContext` backed by Dexie (so the session survives offline reopens) and a small set of MUI screens wired to the real API — no mocked data.

**Tech Stack:** Django 5 + DRF 3.15 + `djangorestframework-simplejwt`, PostgreSQL, React 18 + MUI 5 + `react-router-dom` 6, Dexie 4, Vitest + Testing Library.

**Spec:** [docs/superpowers/specs/2026-09-06-fluxo-organizacao-design.md](../specs/2026-09-06-fluxo-organizacao-design.md)

## Global Constraints

- `djangorestframework-simplejwt==5.3.1`.
- `AUTH_USER_MODEL = "organizacoes.Organizacao"`, CNPJ is `USERNAME_FIELD`.
- `SIMPLE_JWT`: `ACCESS_TOKEN_LIFETIME` 1 hour, `REFRESH_TOKEN_LIFETIME` 7 days. No token blacklist this phase.
- `REST_FRAMEWORK["DEFAULT_PERMISSION_CLASSES"]` becomes `IsAuthenticated` globally — every existing or new public view must opt out explicitly with `AllowAny`.
- CPF/CNPJ: format only (numeric, fixed length) — no checksum-digit validation this phase.
- Session tokens live in Dexie (`session` table, single row keyed `id: "current"`), not `localStorage`.
- "Já preencheu o Protocolo?" always renders as "Ainda não preenchido" — that mechanism doesn't exist yet.
- Empty state uses an MUI icon (`Inventory2OutlinedIcon`), not a custom illustration.

---

### Task 1: `Organizacao` custom user model + JWT foundations

**Files:**
- Create: `backend/organizacoes/__init__.py`
- Create: `backend/organizacoes/models.py`
- Create: `backend/organizacoes/tests.py`
- Modify: `backend/requirements.txt`
- Modify: `backend/app/settings.py`
- Modify: `backend/health/views.py` (regression fix — see below)

**Interfaces:**
- Consumes: nothing new.
- Produces: `Organizacao` model with `objects.create_user(cnpj, nome, razao_social, password=None, **extra)` and `objects.create_superuser(...)`, fields `cnpj` (unique, `USERNAME_FIELD`), `nome`, `razao_social`, `exclusivamente_agricultura_familiar` (bool), `created_at`, plus inherited `password`/`is_active`/`check_password()`. Consumed by every later task in this plan.

- [ ] **Step 1: Add the new dependency**

Append to `backend/requirements.txt`:

```
djangorestframework-simplejwt==5.3.1
```

- [ ] **Step 2: Write the failing tests**

Create `backend/organizacoes/__init__.py` (empty file), then `backend/organizacoes/tests.py`:

```python
from django.test import TestCase

from .models import Organizacao


class OrganizacaoManagerTests(TestCase):
    def test_create_user_hashes_password(self):
        org = Organizacao.objects.create_user(
            cnpj="12345678000199",
            nome="Coop Teste",
            razao_social="Cooperativa Teste LTDA",
            password="senha-segura-123",
        )
        self.assertNotEqual(org.password, "senha-segura-123")
        self.assertTrue(org.check_password("senha-segura-123"))

    def test_cnpj_must_be_unique(self):
        Organizacao.objects.create_user(
            cnpj="12345678000199",
            nome="Coop A",
            razao_social="Coop A LTDA",
            password="senha-segura-123",
        )
        with self.assertRaises(Exception):
            Organizacao.objects.create_user(
                cnpj="12345678000199",
                nome="Coop B",
                razao_social="Coop B LTDA",
                password="outra-senha",
            )
```

- [ ] **Step 3: Create `backend/organizacoes/models.py`**

```python
from django.contrib.auth.base_user import AbstractBaseUser, BaseUserManager
from django.contrib.auth.models import PermissionsMixin
from django.db import models


class OrganizacaoManager(BaseUserManager):
    def create_user(self, cnpj, nome, razao_social, password=None, **extra_fields):
        if not cnpj:
            raise ValueError("CNPJ é obrigatório")
        organizacao = self.model(
            cnpj=cnpj, nome=nome, razao_social=razao_social, **extra_fields
        )
        organizacao.set_password(password)
        organizacao.save(using=self._db)
        return organizacao

    def create_superuser(self, cnpj, nome, razao_social, password=None, **extra_fields):
        extra_fields.setdefault("is_staff", True)
        extra_fields.setdefault("is_superuser", True)
        return self.create_user(cnpj, nome, razao_social, password, **extra_fields)


class Organizacao(AbstractBaseUser, PermissionsMixin):
    cnpj = models.CharField(max_length=14, unique=True)
    nome = models.CharField(max_length=255)
    razao_social = models.CharField(max_length=255)
    exclusivamente_agricultura_familiar = models.BooleanField(default=False)
    created_at = models.DateTimeField(auto_now_add=True)

    is_active = models.BooleanField(default=True)
    is_staff = models.BooleanField(default=False)

    objects = OrganizacaoManager()

    USERNAME_FIELD = "cnpj"
    REQUIRED_FIELDS = ["nome", "razao_social"]

    def __str__(self):
        return self.nome
```

- [ ] **Step 4: Wire settings — `AUTH_USER_MODEL`, `organizacoes` app, DRF/JWT defaults**

In `backend/app/settings.py`, add `from datetime import timedelta` near the top imports, add `"organizacoes"` to `INSTALLED_APPS`, and add after the `DATABASES` block:

```python
AUTH_USER_MODEL = "organizacoes.Organizacao"

REST_FRAMEWORK = {
    "DEFAULT_AUTHENTICATION_CLASSES": [
        "rest_framework_simplejwt.authentication.JWTAuthentication",
    ],
    "DEFAULT_PERMISSION_CLASSES": [
        "rest_framework.permissions.IsAuthenticated",
    ],
}

SIMPLE_JWT = {
    "ACCESS_TOKEN_LIFETIME": timedelta(hours=1),
    "REFRESH_TOKEN_LIFETIME": timedelta(days=7),
}
```

- [ ] **Step 5: Fix the regression this causes — `/api/health/` must stay public**

`DEFAULT_PERMISSION_CLASSES` is now `IsAuthenticated` globally, which would break the existing health check. Update `backend/health/views.py`:

```python
from django.db import connection
from rest_framework.decorators import api_view, permission_classes
from rest_framework.permissions import AllowAny
from rest_framework.response import Response


@api_view(["GET"])
@permission_classes([AllowAny])
def health_check(request):
    with connection.cursor() as cursor:
        cursor.execute("SELECT 1")
        cursor.fetchone()
    return Response({"status": "ok", "db": "connected"})
```

- [ ] **Step 6: Install the new dependency and generate the migration**

```bash
docker compose build backend
docker compose run --rm backend python manage.py makemigrations organizacoes
```

Expected: `Migrations for 'organizacoes': ... 0001_initial.py`

- [ ] **Step 7: Run the tests**

```bash
docker compose run --rm backend python manage.py test organizacoes health
```

Expected: `OK` (3 tests — 2 new + the existing health check test, which must still pass).

- [ ] **Step 8: Apply the migration to the real dev database and verify health still works**

```bash
docker compose up -d db backend
docker compose run --rm backend python manage.py migrate
curl -s http://localhost:8000/api/health/
```

Expected: `{"status":"ok","db":"connected"}`

- [ ] **Step 9: Commit**

```bash
git add backend/organizacoes backend/requirements.txt backend/app/settings.py backend/health/views.py
git commit -m "feat: add Organizacao custom user model and JWT foundations"
```

---

### Task 2: `Agricultor` model

**Files:**
- Create: `backend/agricultores/__init__.py`
- Create: `backend/agricultores/models.py`
- Create: `backend/agricultores/tests.py`
- Modify: `backend/app/settings.py` (add `"agricultores"` to `INSTALLED_APPS`)

**Interfaces:**
- Consumes: `organizacoes.models.Organizacao` from Task 1.
- Produces: `Agricultor` model (fields `organizacao` FK, `nome`, `cpf` unique, `associado_ou_cooperado`, `agricultor_familiar`, `tem_saf`, `usa_agrotoxico`, `created_at`), accessible from an org via `organizacao.agricultores.all()`. Consumed by Task 6 (API) and Task 10/11 (frontend, indirectly through the API).

- [ ] **Step 1: Write the failing tests**

Create `backend/agricultores/__init__.py` (empty), then `backend/agricultores/tests.py`:

```python
from django.test import TestCase

from organizacoes.models import Organizacao

from .models import Agricultor


class AgricultorModelTests(TestCase):
    def setUp(self):
        self.organizacao = Organizacao.objects.create_user(
            cnpj="12345678000199",
            nome="Coop Teste",
            razao_social="Cooperativa Teste LTDA",
            password="senha-segura-123",
        )

    def test_agricultor_belongs_to_organizacao(self):
        agricultor = Agricultor.objects.create(
            organizacao=self.organizacao, nome="Maria Agricultora", cpf="12345678900"
        )
        self.assertEqual(agricultor.organizacao, self.organizacao)
        self.assertIn(agricultor, self.organizacao.agricultores.all())

    def test_cpf_must_be_unique(self):
        Agricultor.objects.create(
            organizacao=self.organizacao, nome="Maria", cpf="12345678900"
        )
        with self.assertRaises(Exception):
            Agricultor.objects.create(
                organizacao=self.organizacao, nome="Outra", cpf="12345678900"
            )
```

- [ ] **Step 2: Create `backend/agricultores/models.py`**

```python
from django.db import models

from organizacoes.models import Organizacao


class Agricultor(models.Model):
    organizacao = models.ForeignKey(
        Organizacao, on_delete=models.CASCADE, related_name="agricultores"
    )
    nome = models.CharField(max_length=255)
    cpf = models.CharField(max_length=11, unique=True)
    associado_ou_cooperado = models.BooleanField(default=False)
    agricultor_familiar = models.BooleanField(default=False)
    tem_saf = models.BooleanField(default=False)
    usa_agrotoxico = models.BooleanField(default=False)
    created_at = models.DateTimeField(auto_now_add=True)

    def __str__(self):
        return self.nome
```

- [ ] **Step 3: Add `"agricultores"` to `INSTALLED_APPS` in `backend/app/settings.py`**

- [ ] **Step 4: Generate the migration and run the tests**

```bash
docker compose run --rm backend python manage.py makemigrations agricultores
docker compose run --rm backend python manage.py test agricultores
```

Expected: `OK` (2 tests).

- [ ] **Step 5: Apply the migration**

```bash
docker compose run --rm backend python manage.py migrate
```

- [ ] **Step 6: Commit**

```bash
git add backend/agricultores backend/app/settings.py
git commit -m "feat: add Agricultor model scoped to Organizacao"
```

---

### Task 3: Organização — cadastro endpoint

**Files:**
- Create: `backend/organizacoes/serializers.py`
- Create: `backend/organizacoes/views.py`
- Create: `backend/organizacoes/urls.py`
- Modify: `backend/organizacoes/tests.py`
- Modify: `backend/app/urls.py`

**Interfaces:**
- Consumes: `Organizacao.objects.create_user` from Task 1.
- Produces: `POST /api/organizacoes/` → `201` with the created organization (no password in the response). Consumed by the frontend's `cadastrarOrganizacao()` in Task 7.

- [ ] **Step 1: Append the failing test to `backend/organizacoes/tests.py`**

```python
from django.urls import reverse
from rest_framework import status
from rest_framework.test import APITestCase


class OrganizacaoCadastroAPITests(APITestCase):
    def test_cadastro_cria_organizacao(self):
        url = reverse("organizacao-cadastro")
        payload = {
            "cnpj": "12345678000199",
            "nome": "Coop Teste",
            "razao_social": "Cooperativa Teste LTDA",
            "exclusivamente_agricultura_familiar": True,
            "password": "senha-segura-123",
        }
        response = self.client.post(url, payload, format="json")
        self.assertEqual(response.status_code, status.HTTP_201_CREATED)
        self.assertNotIn("password", response.data)
        org = Organizacao.objects.get(cnpj="12345678000199")
        self.assertTrue(org.check_password("senha-segura-123"))
```

- [ ] **Step 2: Create `backend/organizacoes/serializers.py`**

```python
from rest_framework import serializers

from .models import Organizacao


class OrganizacaoCadastroSerializer(serializers.ModelSerializer):
    password = serializers.CharField(write_only=True, min_length=8)

    class Meta:
        model = Organizacao
        fields = [
            "id",
            "cnpj",
            "nome",
            "razao_social",
            "exclusivamente_agricultura_familiar",
            "password",
        ]

    def create(self, validated_data):
        password = validated_data.pop("password")
        return Organizacao.objects.create_user(password=password, **validated_data)


class OrganizacaoSerializer(serializers.ModelSerializer):
    class Meta:
        model = Organizacao
        fields = [
            "id",
            "cnpj",
            "nome",
            "razao_social",
            "exclusivamente_agricultura_familiar",
            "created_at",
        ]
        read_only_fields = ["id", "cnpj", "created_at"]
```

- [ ] **Step 3: Create `backend/organizacoes/views.py`**

```python
from rest_framework import generics, permissions

from .models import Organizacao
from .serializers import OrganizacaoCadastroSerializer, OrganizacaoSerializer


class OrganizacaoCadastroView(generics.CreateAPIView):
    queryset = Organizacao.objects.all()
    serializer_class = OrganizacaoCadastroSerializer
    permission_classes = [permissions.AllowAny]


class OrganizacaoMeView(generics.RetrieveUpdateDestroyAPIView):
    serializer_class = OrganizacaoSerializer
    permission_classes = [permissions.IsAuthenticated]

    def get_object(self):
        return self.request.user
```

(`OrganizacaoMeView` is wired here so Task 5 only has to add its tests — the view is trivial and belongs next to its sibling.)

- [ ] **Step 4: Create `backend/organizacoes/urls.py`**

```python
from django.urls import path

from .views import OrganizacaoCadastroView, OrganizacaoMeView

urlpatterns = [
    path("", OrganizacaoCadastroView.as_view(), name="organizacao-cadastro"),
    path("me/", OrganizacaoMeView.as_view(), name="organizacao-me"),
]
```

- [ ] **Step 5: Wire it in `backend/app/urls.py`**

```python
from django.urls import include, path

urlpatterns = [
    path("api/health/", include("health.urls")),
    path("api/organizacoes/", include("organizacoes.urls")),
]
```

- [ ] **Step 6: Run the tests**

```bash
docker compose run --rm backend python manage.py test organizacoes
```

Expected: `OK` (3 tests).

- [ ] **Step 7: Commit**

```bash
git add backend/organizacoes backend/app/urls.py
git commit -m "feat: add organizacao registration endpoint"
```

---

### Task 4: JWT login and refresh endpoints

**Files:**
- Modify: `backend/app/urls.py`
- Modify: `backend/organizacoes/tests.py`

**Interfaces:**
- Consumes: `Organizacao` (Task 1) — `simplejwt`'s stock `TokenObtainPairView` reads `USERNAME_FIELD` (`cnpj`) automatically, no custom serializer needed.
- Produces: `POST /api/auth/login/` → `{"access": "...", "refresh": "..."}`; `POST /api/auth/refresh/` → `{"access": "..."}`. Consumed by the frontend's `loginOrganizacao()` (Task 7) and `authFetch()`'s refresh logic (Task 7).

- [ ] **Step 1: Append the failing tests to `backend/organizacoes/tests.py`**

```python
class LoginAPITests(APITestCase):
    def setUp(self):
        self.organizacao = Organizacao.objects.create_user(
            cnpj="12345678000199",
            nome="Coop Teste",
            razao_social="Cooperativa Teste LTDA",
            password="senha-segura-123",
        )

    def test_login_com_credenciais_validas(self):
        url = reverse("token_obtain_pair")
        response = self.client.post(
            url,
            {"cnpj": "12345678000199", "password": "senha-segura-123"},
            format="json",
        )
        self.assertEqual(response.status_code, status.HTTP_200_OK)
        self.assertIn("access", response.data)
        self.assertIn("refresh", response.data)

    def test_login_com_senha_errada(self):
        url = reverse("token_obtain_pair")
        response = self.client.post(
            url, {"cnpj": "12345678000199", "password": "senha-errada"}, format="json"
        )
        self.assertEqual(response.status_code, status.HTTP_401_UNAUTHORIZED)
```

- [ ] **Step 2: Wire the stock views in `backend/app/urls.py`**

```python
from rest_framework_simplejwt.views import TokenObtainPairView, TokenRefreshView

urlpatterns = [
    path("api/health/", include("health.urls")),
    path("api/organizacoes/", include("organizacoes.urls")),
    path("api/auth/login/", TokenObtainPairView.as_view(), name="token_obtain_pair"),
    path("api/auth/refresh/", TokenRefreshView.as_view(), name="token_refresh"),
]
```

- [ ] **Step 3: Run the tests**

```bash
docker compose run --rm backend python manage.py test organizacoes
```

Expected: `OK` (5 tests).

- [ ] **Step 4: Verify manually**

```bash
docker compose up -d --build backend
curl -s -X POST http://localhost:8000/api/auth/login/ \
  -H "Content-Type: application/json" \
  -d '{"cnpj": "12345678000199", "password": "senha-segura-123"}'
```

Expected: a JSON body with `access` and `refresh` keys (only works if the Task 1 test data isn't the only data — if the database was reset, register an organização via `/api/organizacoes/` first with the same payload).

- [ ] **Step 5: Commit**

```bash
git add backend/app/urls.py backend/organizacoes/tests.py
git commit -m "feat: add JWT login and refresh endpoints"
```

---

### Task 5: Organização — perfil (CRUD do próprio perfil)

**Files:**
- Modify: `backend/organizacoes/tests.py`

**Interfaces:**
- Consumes: `OrganizacaoMeView` (already created in Task 3).
- Produces: `GET/PATCH/DELETE /api/organizacoes/me/` behavior verified. Consumed by the frontend's `getPerfil()`/`atualizarPerfil()`/`excluirPerfil()` in Task 7.

- [ ] **Step 1: Append the failing tests to `backend/organizacoes/tests.py`**

```python
class OrganizacaoMeAPITests(APITestCase):
    def setUp(self):
        self.organizacao = Organizacao.objects.create_user(
            cnpj="12345678000199",
            nome="Coop Teste",
            razao_social="Cooperativa Teste LTDA",
            password="senha-segura-123",
        )
        self.url = reverse("organizacao-me")

    def test_requer_autenticacao(self):
        response = self.client.get(self.url)
        self.assertEqual(response.status_code, status.HTTP_401_UNAUTHORIZED)

    def test_retorna_perfil_proprio(self):
        self.client.force_authenticate(user=self.organizacao)
        response = self.client.get(self.url)
        self.assertEqual(response.status_code, status.HTTP_200_OK)
        self.assertEqual(response.data["cnpj"], "12345678000199")

    def test_atualiza_perfil_proprio(self):
        self.client.force_authenticate(user=self.organizacao)
        response = self.client.patch(self.url, {"nome": "Novo Nome"}, format="json")
        self.assertEqual(response.status_code, status.HTTP_200_OK)
        self.organizacao.refresh_from_db()
        self.assertEqual(self.organizacao.nome, "Novo Nome")

    def test_exclui_propria_conta(self):
        self.client.force_authenticate(user=self.organizacao)
        response = self.client.delete(self.url)
        self.assertEqual(response.status_code, status.HTTP_204_NO_CONTENT)
        self.assertFalse(Organizacao.objects.filter(cnpj="12345678000199").exists())
```

- [ ] **Step 2: Run the tests**

```bash
docker compose run --rm backend python manage.py test organizacoes
```

Expected: `OK` (9 tests). No implementation changes needed — `OrganizacaoMeView` was already built in Task 3; this task exists to prove its full contract with tests.

- [ ] **Step 3: Commit**

```bash
git add backend/organizacoes/tests.py
git commit -m "test: cover organizacao profile CRUD"
```

---

### Task 6: Agricultor — endpoints CRUD com isolamento por organização

**Files:**
- Create: `backend/agricultores/serializers.py`
- Create: `backend/agricultores/views.py`
- Create: `backend/agricultores/urls.py`
- Modify: `backend/agricultores/tests.py`
- Modify: `backend/app/urls.py`

**Interfaces:**
- Consumes: `Agricultor` model (Task 2), `Organizacao` (Task 1) via `request.user`.
- Produces: `GET/POST /api/agricultores/`, `GET/PATCH/DELETE /api/agricultores/<id>/`. Consumed by `organizacaoApi.js` in Task 7.

- [ ] **Step 1: Append the failing tests to `backend/agricultores/tests.py`**

```python
from django.urls import reverse
from rest_framework import status
from rest_framework.test import APITestCase


class AgricultorAPITests(APITestCase):
    def setUp(self):
        self.org_a = Organizacao.objects.create_user(
            cnpj="11111111000191",
            nome="Org A",
            razao_social="Org A LTDA",
            password="senha123456",
        )
        self.org_b = Organizacao.objects.create_user(
            cnpj="22222222000192",
            nome="Org B",
            razao_social="Org B LTDA",
            password="senha123456",
        )
        self.agricultor_a = Agricultor.objects.create(
            organizacao=self.org_a, nome="Agricultor A", cpf="11111111111"
        )

    def test_lista_so_mostra_agricultores_da_propria_organizacao(self):
        self.client.force_authenticate(user=self.org_b)
        response = self.client.get(reverse("agricultor-list-create"))
        self.assertEqual(response.status_code, status.HTTP_200_OK)
        self.assertEqual(len(response.data), 0)

    def test_cadastro_associa_organizacao_logada_automaticamente(self):
        self.client.force_authenticate(user=self.org_a)
        payload = {"nome": "Novo Agricultor", "cpf": "22222222222"}
        response = self.client.post(
            reverse("agricultor-list-create"), payload, format="json"
        )
        self.assertEqual(response.status_code, status.HTTP_201_CREATED)
        agricultor = Agricultor.objects.get(cpf="22222222222")
        self.assertEqual(agricultor.organizacao, self.org_a)

    def test_organizacao_nao_acessa_agricultor_de_outra(self):
        self.client.force_authenticate(user=self.org_b)
        url = reverse("agricultor-detail", args=[self.agricultor_a.id])
        response = self.client.get(url)
        self.assertEqual(response.status_code, status.HTTP_404_NOT_FOUND)
```

(This appends below the existing `AgricultorModelTests` — keep both, and add the import of `Organizacao` at the top if not already present.)

- [ ] **Step 2: Create `backend/agricultores/serializers.py`**

```python
from rest_framework import serializers

from .models import Agricultor


class AgricultorSerializer(serializers.ModelSerializer):
    class Meta:
        model = Agricultor
        fields = [
            "id",
            "nome",
            "cpf",
            "associado_ou_cooperado",
            "agricultor_familiar",
            "tem_saf",
            "usa_agrotoxico",
            "created_at",
        ]
        read_only_fields = ["id", "created_at"]
```

- [ ] **Step 3: Create `backend/agricultores/views.py`**

```python
from rest_framework import generics, permissions

from .models import Agricultor
from .serializers import AgricultorSerializer


class AgricultorListCreateView(generics.ListCreateAPIView):
    serializer_class = AgricultorSerializer
    permission_classes = [permissions.IsAuthenticated]

    def get_queryset(self):
        return Agricultor.objects.filter(organizacao=self.request.user)

    def perform_create(self, serializer):
        serializer.save(organizacao=self.request.user)


class AgricultorDetailView(generics.RetrieveUpdateDestroyAPIView):
    serializer_class = AgricultorSerializer
    permission_classes = [permissions.IsAuthenticated]

    def get_queryset(self):
        return Agricultor.objects.filter(organizacao=self.request.user)
```

- [ ] **Step 4: Create `backend/agricultores/urls.py`**

```python
from django.urls import path

from .views import AgricultorDetailView, AgricultorListCreateView

urlpatterns = [
    path("", AgricultorListCreateView.as_view(), name="agricultor-list-create"),
    path("<int:pk>/", AgricultorDetailView.as_view(), name="agricultor-detail"),
]
```

- [ ] **Step 5: Wire it in `backend/app/urls.py`**

```python
urlpatterns = [
    path("api/health/", include("health.urls")),
    path("api/organizacoes/", include("organizacoes.urls")),
    path("api/agricultores/", include("agricultores.urls")),
    path("api/auth/login/", TokenObtainPairView.as_view(), name="token_obtain_pair"),
    path("api/auth/refresh/", TokenRefreshView.as_view(), name="token_refresh"),
]
```

- [ ] **Step 6: Run the tests**

```bash
docker compose run --rm backend python manage.py test
```

Expected: `OK` (15 tests total across the whole backend).

- [ ] **Step 7: Commit**

```bash
git add backend/agricultores backend/app/urls.py
git commit -m "feat: add agricultor CRUD endpoints scoped to organizacao"
```

---

### Task 7: Frontend — sessão de autenticação (Dexie + AuthContext + API client)

**Files:**
- Modify: `frontend/package.json`
- Modify: `frontend/src/test-setup.js`
- Modify: `frontend/src/db.js`
- Modify: `frontend/src/api.js`
- Modify: `frontend/src/main.jsx`
- Create: `frontend/src/auth/AuthContext.jsx`
- Create: `frontend/src/auth/AuthContext.test.jsx`
- Create: `frontend/src/auth/authFetch.js`
- Create: `frontend/src/auth/authFetch.test.js`
- Create: `frontend/src/auth/organizacaoApi.js`

**Interfaces:**
- Consumes: `db` (Dexie instance) from `frontend/src/db.js`; backend endpoints from Tasks 3, 4, 5, 6.
- Produces: `useAuth()` hook returning `{ session, login({access, refresh}), logout() }`, where `session` is `undefined` (loading), `null` (logged out) or `{id, access, refresh}` (logged in) — consumed by Tasks 8-12. `authFetch(path, options)` returning a `Response`, and `organizacaoApi.js` functions (`getPerfil`, `atualizarPerfil`, `excluirPerfil`, `listarAgricultores`, `cadastrarAgricultor`, `obterAgricultor`, `atualizarAgricultor`, `excluirAgricultor`) — consumed by Tasks 10, 11, 12. `loginOrganizacao({cnpj, password})` and `cadastrarOrganizacao(dados)` added to `api.js` — consumed by Task 8.

- [ ] **Step 1: Add test/runtime dependencies**

In `frontend/package.json`, add to `devDependencies`:

```json
"fake-indexeddb": "^6.0.0"
```

- [ ] **Step 2: Polyfill IndexedDB for tests**

`frontend/src/test-setup.js`:

```javascript
import "fake-indexeddb/auto";
import "@testing-library/jest-dom/vitest";
```

- [ ] **Step 3: Add the `session` table to Dexie**

`frontend/src/db.js`:

```javascript
import Dexie from "dexie";

export const db = new Dexie("pwa-test");

db.version(1).stores({
  diagnostics: "++id, checkedAt",
});

db.version(2).stores({
  diagnostics: "++id, checkedAt",
  session: "&id",
});
```

- [ ] **Step 4: Rebuild the frontend image with the new dependency**

```bash
docker compose build frontend
docker compose rm -fsv frontend
docker compose up -d frontend
```

- [ ] **Step 5: Write the failing tests for `AuthContext`**

`frontend/src/auth/AuthContext.test.jsx`:

```jsx
import { render, screen, waitFor } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { AuthProvider, useAuth } from "./AuthContext.jsx";
import { db } from "../db.js";

function Probe() {
  const { session, login, logout } = useAuth();
  return (
    <div>
      <span>{session === undefined ? "carregando" : session ? "logado" : "deslogado"}</span>
      <button onClick={() => login({ access: "a", refresh: "b" })}>login</button>
      <button onClick={() => logout()}>logout</button>
    </div>
  );
}

describe("AuthContext", () => {
  afterEach(async () => {
    await db.session.clear();
  });

  it("começa deslogado quando não há sessão salva", async () => {
    render(
      <AuthProvider>
        <Probe />
      </AuthProvider>
    );
    await waitFor(() => expect(screen.getByText("deslogado")).toBeInTheDocument());
  });

  it("login salva a sessão no Dexie e atualiza o estado", async () => {
    render(
      <AuthProvider>
        <Probe />
      </AuthProvider>
    );
    await waitFor(() => expect(screen.getByText("deslogado")).toBeInTheDocument());
    await userEvent.click(screen.getByText("login"));
    await waitFor(() => expect(screen.getByText("logado")).toBeInTheDocument());
    const stored = await db.session.get("current");
    expect(stored.access).toBe("a");
  });

  it("logout limpa a sessão do Dexie", async () => {
    await db.session.put({ id: "current", access: "a", refresh: "b" });
    render(
      <AuthProvider>
        <Probe />
      </AuthProvider>
    );
    await waitFor(() => expect(screen.getByText("logado")).toBeInTheDocument());
    await userEvent.click(screen.getByText("logout"));
    await waitFor(() => expect(screen.getByText("deslogado")).toBeInTheDocument());
    const stored = await db.session.get("current");
    expect(stored).toBeUndefined();
  });
});
```

- [ ] **Step 6: Create `frontend/src/auth/AuthContext.jsx`**

```jsx
import { createContext, useCallback, useContext, useEffect, useState } from "react";
import { db } from "../db.js";

const AuthContext = createContext(null);
const SESSION_ID = "current";

export function AuthProvider({ children }) {
  const [session, setSession] = useState(undefined);

  useEffect(() => {
    db.session.get(SESSION_ID).then((stored) => setSession(stored ?? null));
  }, []);

  const login = useCallback(async ({ access, refresh }) => {
    const record = { id: SESSION_ID, access, refresh };
    await db.session.put(record);
    setSession(record);
  }, []);

  const logout = useCallback(async () => {
    await db.session.delete(SESSION_ID);
    setSession(null);
  }, []);

  return (
    <AuthContext.Provider value={{ session, login, logout }}>
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth() {
  const ctx = useContext(AuthContext);
  if (!ctx) {
    throw new Error("useAuth deve ser usado dentro de AuthProvider");
  }
  return ctx;
}
```

- [ ] **Step 7: Run the `AuthContext` tests**

```bash
docker compose run --rm frontend npm test -- AuthContext
```

Expected: `3 passed`.

- [ ] **Step 8: Write the failing tests for `authFetch`**

`frontend/src/auth/authFetch.test.js`:

```javascript
import { db } from "../db.js";
import { authFetch } from "./authFetch.js";

describe("authFetch", () => {
  beforeEach(async () => {
    await db.session.put({ id: "current", access: "old-token", refresh: "refresh-token" });
  });

  afterEach(async () => {
    await db.session.clear();
    vi.restoreAllMocks();
  });

  it("attaches the access token and returns the response on success", async () => {
    const fetchMock = vi
      .fn()
      .mockResolvedValue(new Response(JSON.stringify({ ok: true }), { status: 200 }));
    vi.stubGlobal("fetch", fetchMock);

    const response = await authFetch("/api/organizacoes/me/");

    expect(response.status).toBe(200);
    const [, options] = fetchMock.mock.calls[0];
    expect(options.headers.Authorization).toBe("Bearer old-token");
  });

  it("refreshes the token and retries once on a 401", async () => {
    const fetchMock = vi
      .fn()
      .mockResolvedValueOnce(new Response(null, { status: 401 }))
      .mockResolvedValueOnce(
        new Response(JSON.stringify({ access: "new-token" }), { status: 200 })
      )
      .mockResolvedValueOnce(new Response(JSON.stringify({ ok: true }), { status: 200 }));
    vi.stubGlobal("fetch", fetchMock);

    const response = await authFetch("/api/organizacoes/me/");

    expect(response.status).toBe(200);
    expect(fetchMock).toHaveBeenCalledTimes(3);
    const stored = await db.session.get("current");
    expect(stored.access).toBe("new-token");
  });
});
```

- [ ] **Step 9: Create `frontend/src/auth/authFetch.js`**

```javascript
import { db } from "../db.js";

const API_URL = import.meta.env.VITE_API_URL ?? "http://localhost:8000";
const SESSION_ID = "current";

async function refreshAccessToken(refresh) {
  const response = await fetch(`${API_URL}/api/auth/refresh/`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ refresh }),
  });
  if (!response.ok) return null;
  const data = await response.json();
  return data.access;
}

export async function authFetch(path, options = {}) {
  const session = await db.session.get(SESSION_ID);
  if (!session) {
    throw new Error("Não autenticado");
  }

  const doFetch = (accessToken) =>
    fetch(`${API_URL}${path}`, {
      ...options,
      headers: {
        "Content-Type": "application/json",
        ...options.headers,
        Authorization: `Bearer ${accessToken}`,
      },
    });

  let response = await doFetch(session.access);

  if (response.status === 401) {
    const newAccess = await refreshAccessToken(session.refresh);
    if (!newAccess) {
      await db.session.delete(SESSION_ID);
      throw new Error("Sessão expirada");
    }
    await db.session.update(SESSION_ID, { access: newAccess });
    response = await doFetch(newAccess);
  }

  return response;
}
```

- [ ] **Step 10: Run the `authFetch` tests**

```bash
docker compose run --rm frontend npm test -- authFetch
```

Expected: `2 passed`.

- [ ] **Step 11: Add public auth calls to `frontend/src/api.js`**

Append to the existing file:

```javascript
export async function loginOrganizacao({ cnpj, password }) {
  const response = await fetch(`${API_URL}/api/auth/login/`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ cnpj, password }),
  });
  if (!response.ok) {
    throw new Error("CNPJ ou senha inválidos");
  }
  return response.json();
}

export async function cadastrarOrganizacao(dados) {
  const response = await fetch(`${API_URL}/api/organizacoes/`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(dados),
  });
  if (!response.ok) {
    const data = await response.json().catch(() => ({}));
    throw new Error(data.cnpj?.[0] || "Não foi possível cadastrar a organização");
  }
  return response.json();
}
```

- [ ] **Step 12: Create `frontend/src/auth/organizacaoApi.js`**

```javascript
import { authFetch } from "./authFetch.js";

export async function getPerfil() {
  const response = await authFetch("/api/organizacoes/me/");
  if (!response.ok) throw new Error("Não foi possível carregar o perfil");
  return response.json();
}

export async function atualizarPerfil(dados) {
  const response = await authFetch("/api/organizacoes/me/", {
    method: "PATCH",
    body: JSON.stringify(dados),
  });
  if (!response.ok) throw new Error("Não foi possível atualizar o perfil");
  return response.json();
}

export async function excluirPerfil() {
  const response = await authFetch("/api/organizacoes/me/", { method: "DELETE" });
  if (!response.ok && response.status !== 204) {
    throw new Error("Não foi possível excluir o perfil");
  }
}

export async function listarAgricultores() {
  const response = await authFetch("/api/agricultores/");
  if (!response.ok) throw new Error("Não foi possível carregar os agricultores");
  return response.json();
}

export async function cadastrarAgricultor(dados) {
  const response = await authFetch("/api/agricultores/", {
    method: "POST",
    body: JSON.stringify(dados),
  });
  if (!response.ok) {
    const data = await response.json().catch(() => ({}));
    throw new Error(data.cpf?.[0] || "Não foi possível cadastrar o(a) agricultor(a)");
  }
  return response.json();
}

export async function obterAgricultor(id) {
  const response = await authFetch(`/api/agricultores/${id}/`);
  if (!response.ok) throw new Error("Agricultor(a) não encontrado(a)");
  return response.json();
}

export async function atualizarAgricultor(id, dados) {
  const response = await authFetch(`/api/agricultores/${id}/`, {
    method: "PATCH",
    body: JSON.stringify(dados),
  });
  if (!response.ok) throw new Error("Não foi possível atualizar o(a) agricultor(a)");
  return response.json();
}

export async function excluirAgricultor(id) {
  const response = await authFetch(`/api/agricultores/${id}/`, { method: "DELETE" });
  if (!response.ok && response.status !== 204) {
    throw new Error("Não foi possível excluir o(a) agricultor(a)");
  }
}
```

- [ ] **Step 13: Wrap the app with `AuthProvider`**

`frontend/src/main.jsx`:

```jsx
import React from "react";
import ReactDOM from "react-dom/client";
import { BrowserRouter } from "react-router-dom";
import { ThemeProvider } from "@mui/material/styles";
import CssBaseline from "@mui/material/CssBaseline";
import App from "./App.jsx";
import { theme } from "./theme.js";
import { AuthProvider } from "./auth/AuthContext.jsx";

ReactDOM.createRoot(document.getElementById("root")).render(
  <React.StrictMode>
    <ThemeProvider theme={theme}>
      <CssBaseline />
      <AuthProvider>
        <BrowserRouter>
          <App />
        </BrowserRouter>
      </AuthProvider>
    </ThemeProvider>
  </React.StrictMode>
);
```

- [ ] **Step 14: Run the full frontend test suite**

```bash
docker compose run --rm frontend npm test
```

Expected: all tests pass (previous `IndexPage` tests + the 5 new ones).

- [ ] **Step 15: Commit**

```bash
git add frontend/package.json frontend/package-lock.json frontend/src/test-setup.js frontend/src/db.js frontend/src/api.js frontend/src/main.jsx frontend/src/auth
git commit -m "feat: add JWT session handling (Dexie + AuthContext + authFetch)"
```

---

### Task 8: Telas públicas — login e cadastro da organização

**Files:**
- Create: `frontend/src/pages/OrganizacaoLoginPage.jsx`
- Create: `frontend/src/pages/OrganizacaoLoginPage.test.jsx`
- Create: `frontend/src/pages/OrganizacaoCadastroPage.jsx`
- Create: `frontend/src/pages/OrganizacaoCadastroPage.test.jsx`
- Delete: `frontend/src/pages/OrganizacaoPage.jsx` (superseded by the two pages above)
- Modify: `frontend/src/App.jsx`

**Interfaces:**
- Consumes: `loginOrganizacao`, `cadastrarOrganizacao` (Task 7's `api.js`), `useAuth()` (Task 7).
- Produces: routes `/organizacao` and `/organizacao/cadastro`. Consumed by Task 9 (routing sits alongside the protected routes it adds).

- [ ] **Step 1: Write the failing tests for the login page**

`frontend/src/pages/OrganizacaoLoginPage.test.jsx`:

```jsx
import { render, screen, waitFor } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { MemoryRouter, Routes, Route } from "react-router-dom";
import OrganizacaoLoginPage from "./OrganizacaoLoginPage.jsx";
import { AuthProvider } from "../auth/AuthContext.jsx";

function renderPage() {
  return render(
    <AuthProvider>
      <MemoryRouter initialEntries={["/organizacao"]}>
        <Routes>
          <Route path="/organizacao" element={<OrganizacaoLoginPage />} />
          <Route path="/organizacao/dashboard" element={<div>Dashboard Stub</div>} />
        </Routes>
      </MemoryRouter>
    </AuthProvider>
  );
}

describe("OrganizacaoLoginPage", () => {
  afterEach(() => {
    vi.restoreAllMocks();
  });

  it("navigates to the dashboard after a successful login", async () => {
    vi.stubGlobal(
      "fetch",
      vi
        .fn()
        .mockResolvedValue(new Response(JSON.stringify({ access: "a", refresh: "b" }), { status: 200 }))
    );
    renderPage();

    await userEvent.type(screen.getByLabelText("CNPJ"), "12345678000199");
    await userEvent.type(screen.getByLabelText("Senha"), "senha-segura-123");
    await userEvent.click(screen.getByRole("button", { name: "Entrar" }));

    await waitFor(() => expect(screen.getByText("Dashboard Stub")).toBeInTheDocument());
  });

  it("shows an error message on invalid credentials", async () => {
    vi.stubGlobal("fetch", vi.fn().mockResolvedValue(new Response(null, { status: 401 })));
    renderPage();

    await userEvent.type(screen.getByLabelText("CNPJ"), "12345678000199");
    await userEvent.type(screen.getByLabelText("Senha"), "senha-errada");
    await userEvent.click(screen.getByRole("button", { name: "Entrar" }));

    await waitFor(() =>
      expect(screen.getByText("CNPJ ou senha inválidos")).toBeInTheDocument()
    );
  });
});
```

- [ ] **Step 2: Create `frontend/src/pages/OrganizacaoLoginPage.jsx`**

```jsx
import { useState } from "react";
import { useNavigate, Link as RouterLink } from "react-router-dom";
import Container from "@mui/material/Container";
import Typography from "@mui/material/Typography";
import TextField from "@mui/material/TextField";
import Button from "@mui/material/Button";
import Stack from "@mui/material/Stack";
import Alert from "@mui/material/Alert";
import Link from "@mui/material/Link";
import { loginOrganizacao } from "../api.js";
import { useAuth } from "../auth/AuthContext.jsx";

export default function OrganizacaoLoginPage() {
  const [cnpj, setCnpj] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState(null);
  const [loading, setLoading] = useState(false);
  const { login } = useAuth();
  const navigate = useNavigate();

  async function handleSubmit(event) {
    event.preventDefault();
    setError(null);
    setLoading(true);
    try {
      const tokens = await loginOrganizacao({ cnpj, password });
      await login(tokens);
      navigate("/organizacao/dashboard");
    } catch (err) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  }

  return (
    <Container maxWidth="xs" sx={{ py: 8 }}>
      <Typography variant="h5" component="h1" gutterBottom>
        Associação ou Cooperativa
      </Typography>
      <form onSubmit={handleSubmit}>
        <Stack spacing={2}>
          {error && <Alert severity="error">{error}</Alert>}
          <TextField label="CNPJ" value={cnpj} onChange={(e) => setCnpj(e.target.value)} required fullWidth />
          <TextField
            label="Senha"
            type="password"
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            required
            fullWidth
          />
          <Button type="submit" variant="contained" disabled={loading}>
            Entrar
          </Button>
          <Link component={RouterLink} to="/organizacao/cadastro">
            Não tem conta? Cadastre-se
          </Link>
        </Stack>
      </form>
    </Container>
  );
}
```

- [ ] **Step 3: Run the login page tests**

```bash
docker compose run --rm frontend npm test -- OrganizacaoLoginPage
```

Expected: `2 passed`.

- [ ] **Step 4: Write the failing tests for the cadastro page**

`frontend/src/pages/OrganizacaoCadastroPage.test.jsx`:

```jsx
import { render, screen, waitFor } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { MemoryRouter, Routes, Route } from "react-router-dom";
import OrganizacaoCadastroPage from "./OrganizacaoCadastroPage.jsx";
import { AuthProvider } from "../auth/AuthContext.jsx";

function renderPage() {
  return render(
    <AuthProvider>
      <MemoryRouter initialEntries={["/organizacao/cadastro"]}>
        <Routes>
          <Route path="/organizacao/cadastro" element={<OrganizacaoCadastroPage />} />
          <Route path="/organizacao/dashboard" element={<div>Dashboard Stub</div>} />
        </Routes>
      </MemoryRouter>
    </AuthProvider>
  );
}

describe("OrganizacaoCadastroPage", () => {
  afterEach(() => {
    vi.restoreAllMocks();
  });

  it("cadastra e loga a organização, navegando pro dashboard", async () => {
    vi.stubGlobal(
      "fetch",
      vi
        .fn()
        .mockResolvedValueOnce(new Response(JSON.stringify({ id: 1 }), { status: 201 }))
        .mockResolvedValueOnce(
          new Response(JSON.stringify({ access: "a", refresh: "b" }), { status: 200 })
        )
    );
    renderPage();

    await userEvent.type(screen.getByLabelText("Nome da Associação"), "Coop Teste");
    await userEvent.type(screen.getByLabelText("Razão Social da Associação"), "Coop Teste LTDA");
    await userEvent.type(screen.getByLabelText("CNPJ"), "12345678000199");
    await userEvent.click(
      screen.getByLabelText(/exclusivamente da agricultura familiar/i)
    );
    await userEvent.click(await screen.findByRole("option", { name: "Sim" }));
    await userEvent.type(screen.getByLabelText("Definição de senha"), "senha-segura-123");
    await userEvent.click(screen.getByRole("button", { name: "Cadastrar" }));

    await waitFor(() => expect(screen.getByText("Dashboard Stub")).toBeInTheDocument());
  });
});
```

- [ ] **Step 5: Create `frontend/src/pages/OrganizacaoCadastroPage.jsx`**

```jsx
import { useState } from "react";
import { useNavigate } from "react-router-dom";
import Container from "@mui/material/Container";
import Typography from "@mui/material/Typography";
import TextField from "@mui/material/TextField";
import Button from "@mui/material/Button";
import Stack from "@mui/material/Stack";
import Alert from "@mui/material/Alert";
import MenuItem from "@mui/material/MenuItem";
import { cadastrarOrganizacao, loginOrganizacao } from "../api.js";
import { useAuth } from "../auth/AuthContext.jsx";

export default function OrganizacaoCadastroPage() {
  const [form, setForm] = useState({
    nome: "",
    razao_social: "",
    cnpj: "",
    exclusivamente_agricultura_familiar: "",
    password: "",
  });
  const [error, setError] = useState(null);
  const [loading, setLoading] = useState(false);
  const { login } = useAuth();
  const navigate = useNavigate();

  function setField(field) {
    return (event) => setForm((prev) => ({ ...prev, [field]: event.target.value }));
  }

  async function handleSubmit(event) {
    event.preventDefault();
    setError(null);
    setLoading(true);
    try {
      await cadastrarOrganizacao({
        nome: form.nome,
        razao_social: form.razao_social,
        cnpj: form.cnpj,
        exclusivamente_agricultura_familiar: form.exclusivamente_agricultura_familiar === "sim",
        password: form.password,
      });
      const tokens = await loginOrganizacao({ cnpj: form.cnpj, password: form.password });
      await login(tokens);
      navigate("/organizacao/dashboard");
    } catch (err) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  }

  return (
    <Container maxWidth="sm" sx={{ py: 8 }}>
      <Typography variant="h5" component="h1" gutterBottom>
        Bem-vindo(a) ao Protocolo de Levantamento de Benefícios dos Sistemas Agroflorestais (SAFs)!
      </Typography>
      <Typography variant="body1" color="text.secondary" sx={{ mb: 2 }}>
        Este Protocolo é destinado a agricultores(as) familiares organizados em associações ou
        cooperativas e que trabalham com sistemas agroflorestais de base agroecológica.
      </Typography>
      <Typography variant="body2" color="text.secondary" sx={{ mb: 4 }}>
        Para terem acesso ao Protocolo, a associação ou cooperativa precisa fazer o cadastro e
        também cadastrar os(as) agricultores(as).
      </Typography>
      <form onSubmit={handleSubmit}>
        <Stack spacing={2}>
          {error && <Alert severity="error">{error}</Alert>}
          <TextField label="Nome da Associação" value={form.nome} onChange={setField("nome")} required fullWidth />
          <TextField
            label="Razão Social da Associação"
            value={form.razao_social}
            onChange={setField("razao_social")}
            required
            fullWidth
          />
          <TextField label="CNPJ" value={form.cnpj} onChange={setField("cnpj")} required fullWidth />
          <TextField
            select
            label="Esta associação ou cooperativa é exclusivamente da agricultura familiar?"
            value={form.exclusivamente_agricultura_familiar}
            onChange={setField("exclusivamente_agricultura_familiar")}
            required
            fullWidth
          >
            <MenuItem value="sim">Sim</MenuItem>
            <MenuItem value="nao">Não</MenuItem>
          </TextField>
          <TextField
            label="Definição de senha"
            type="password"
            value={form.password}
            onChange={setField("password")}
            required
            fullWidth
          />
          <Button type="submit" variant="contained" disabled={loading}>
            Cadastrar
          </Button>
        </Stack>
      </form>
    </Container>
  );
}
```

- [ ] **Step 6: Delete the superseded stub**

```bash
rm frontend/src/pages/OrganizacaoPage.jsx
```

- [ ] **Step 7: Update `frontend/src/App.jsx`**

```jsx
import { Routes, Route } from "react-router-dom";
import IndexPage from "./pages/IndexPage.jsx";
import AgricultorPage from "./pages/AgricultorPage.jsx";
import DebugPage from "./pages/DebugPage.jsx";
import OrganizacaoLoginPage from "./pages/OrganizacaoLoginPage.jsx";
import OrganizacaoCadastroPage from "./pages/OrganizacaoCadastroPage.jsx";

export default function App() {
  return (
    <Routes>
      <Route path="/" element={<IndexPage />} />
      <Route path="/organizacao" element={<OrganizacaoLoginPage />} />
      <Route path="/organizacao/cadastro" element={<OrganizacaoCadastroPage />} />
      <Route path="/agricultor" element={<AgricultorPage />} />
      <Route path="/debug" element={<DebugPage />} />
    </Routes>
  );
}
```

(Task 9 adds the protected routes back into this file.)

- [ ] **Step 8: Run the frontend test suite**

```bash
docker compose run --rm frontend npm test
```

Expected: all tests pass.

- [ ] **Step 9: Commit**

```bash
git add frontend/src/pages/OrganizacaoLoginPage.jsx frontend/src/pages/OrganizacaoLoginPage.test.jsx frontend/src/pages/OrganizacaoCadastroPage.jsx frontend/src/pages/OrganizacaoCadastroPage.test.jsx frontend/src/App.jsx
git rm frontend/src/pages/OrganizacaoPage.jsx
git commit -m "feat: add organizacao login and cadastro screens"
```

---

### Task 9: Rotas protegidas — `RequireOrgAuth` + layout com logout

**Files:**
- Create: `frontend/src/auth/RequireOrgAuth.jsx`
- Create: `frontend/src/auth/RequireOrgAuth.test.jsx`
- Create: `frontend/src/auth/OrgLayout.jsx`
- Modify: `frontend/src/App.jsx`

**Interfaces:**
- Consumes: `useAuth()` (Task 7).
- Produces: `<RequireOrgAuth>` wrapper and `<OrgLayout>` (renders an `<Outlet/>` with a top bar + "Sair" button). Consumed directly by `App.jsx`'s protected route group; Tasks 10-12 just need to register their page under that group.

- [ ] **Step 1: Write the failing tests**

`frontend/src/auth/RequireOrgAuth.test.jsx`:

```jsx
import { render, screen, waitFor } from "@testing-library/react";
import { MemoryRouter, Routes, Route } from "react-router-dom";
import RequireOrgAuth from "./RequireOrgAuth.jsx";
import { AuthProvider } from "./AuthContext.jsx";
import { db } from "../db.js";

function renderProtected() {
  return render(
    <AuthProvider>
      <MemoryRouter initialEntries={["/organizacao/dashboard"]}>
        <Routes>
          <Route path="/organizacao" element={<div>Login Stub</div>} />
          <Route
            path="/organizacao/dashboard"
            element={
              <RequireOrgAuth>
                <div>Dashboard Protegido</div>
              </RequireOrgAuth>
            }
          />
        </Routes>
      </MemoryRouter>
    </AuthProvider>
  );
}

describe("RequireOrgAuth", () => {
  afterEach(async () => {
    await db.session.clear();
  });

  it("shows protected content when a session exists", async () => {
    await db.session.put({ id: "current", access: "a", refresh: "b" });
    renderProtected();
    await waitFor(() => expect(screen.getByText("Dashboard Protegido")).toBeInTheDocument());
  });

  it("redirects to login when there is no session", async () => {
    renderProtected();
    await waitFor(() => expect(screen.getByText("Login Stub")).toBeInTheDocument());
  });
});
```

- [ ] **Step 2: Create `frontend/src/auth/RequireOrgAuth.jsx`**

```jsx
import { Navigate } from "react-router-dom";
import { useAuth } from "./AuthContext.jsx";

export default function RequireOrgAuth({ children }) {
  const { session } = useAuth();

  if (session === undefined) {
    return null;
  }

  if (session === null) {
    return <Navigate to="/organizacao" replace />;
  }

  return children;
}
```

- [ ] **Step 3: Run the tests**

```bash
docker compose run --rm frontend npm test -- RequireOrgAuth
```

Expected: `2 passed`.

- [ ] **Step 4: Create `frontend/src/auth/OrgLayout.jsx`**

```jsx
import { Outlet, useNavigate } from "react-router-dom";
import AppBar from "@mui/material/AppBar";
import Toolbar from "@mui/material/Toolbar";
import Typography from "@mui/material/Typography";
import Button from "@mui/material/Button";
import { useAuth } from "./AuthContext.jsx";

export default function OrgLayout() {
  const { logout } = useAuth();
  const navigate = useNavigate();

  async function handleLogout() {
    await logout();
    navigate("/organizacao");
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

- [ ] **Step 5: Update `frontend/src/App.jsx`** to add the protected route group (pages still don't exist — Tasks 10-12 add them; use temporary stubs so this task is independently verifiable)

```jsx
import { Routes, Route } from "react-router-dom";
import IndexPage from "./pages/IndexPage.jsx";
import AgricultorPage from "./pages/AgricultorPage.jsx";
import DebugPage from "./pages/DebugPage.jsx";
import OrganizacaoLoginPage from "./pages/OrganizacaoLoginPage.jsx";
import OrganizacaoCadastroPage from "./pages/OrganizacaoCadastroPage.jsx";
import RequireOrgAuth from "./auth/RequireOrgAuth.jsx";
import OrgLayout from "./auth/OrgLayout.jsx";

export default function App() {
  return (
    <Routes>
      <Route path="/" element={<IndexPage />} />
      <Route path="/organizacao" element={<OrganizacaoLoginPage />} />
      <Route path="/organizacao/cadastro" element={<OrganizacaoCadastroPage />} />
      <Route
        element={
          <RequireOrgAuth>
            <OrgLayout />
          </RequireOrgAuth>
        }
      >
        <Route path="/organizacao/dashboard" element={<div>Dashboard em construção</div>} />
      </Route>
      <Route path="/agricultor" element={<AgricultorPage />} />
      <Route path="/debug" element={<DebugPage />} />
    </Routes>
  );
}
```

- [ ] **Step 6: Verify manually**

```bash
docker compose up -d --build frontend
```

Open `http://localhost:5173/organizacao/dashboard` in a browser — expect a redirect to `/organizacao` (no session yet).

- [ ] **Step 7: Commit**

```bash
git add frontend/src/auth/RequireOrgAuth.jsx frontend/src/auth/RequireOrgAuth.test.jsx frontend/src/auth/OrgLayout.jsx frontend/src/App.jsx
git commit -m "feat: add protected org routes with logout"
```

---

### Task 10: Dashboard — empty state e lista de agricultores

**Files:**
- Create: `frontend/src/pages/OrganizacaoDashboardPage.jsx`
- Create: `frontend/src/pages/OrganizacaoDashboardPage.test.jsx`
- Modify: `frontend/src/App.jsx` (replace the dashboard stub route)

**Interfaces:**
- Consumes: `listarAgricultores`, `excluirAgricultor` (Task 7's `organizacaoApi.js`).
- Produces: route `/organizacao/dashboard` fully implemented. No other task depends on this one directly.

- [ ] **Step 1: Write the failing tests**

`frontend/src/pages/OrganizacaoDashboardPage.test.jsx`:

```jsx
import { render, screen, waitFor } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { MemoryRouter } from "react-router-dom";
import OrganizacaoDashboardPage from "./OrganizacaoDashboardPage.jsx";
import * as organizacaoApi from "../auth/organizacaoApi.js";

describe("OrganizacaoDashboardPage", () => {
  afterEach(() => {
    vi.restoreAllMocks();
  });

  it("shows the empty state when there are no agricultores", async () => {
    vi.spyOn(organizacaoApi, "listarAgricultores").mockResolvedValue([]);
    render(
      <MemoryRouter>
        <OrganizacaoDashboardPage />
      </MemoryRouter>
    );
    await waitFor(() =>
      expect(screen.getByText("Nenhum(a) agricultor(a) cadastrado(a) ainda")).toBeInTheDocument()
    );
  });

  it("lists agricultores and removes one on delete", async () => {
    vi.spyOn(organizacaoApi, "listarAgricultores")
      .mockResolvedValueOnce([{ id: 1, nome: "Maria Agricultora" }])
      .mockResolvedValueOnce([]);
    vi.spyOn(organizacaoApi, "excluirAgricultor").mockResolvedValue();

    render(
      <MemoryRouter>
        <OrganizacaoDashboardPage />
      </MemoryRouter>
    );

    await waitFor(() => expect(screen.getByText("Maria Agricultora")).toBeInTheDocument());
    expect(screen.getByText("Protocolo: Ainda não preenchido")).toBeInTheDocument();

    await userEvent.click(screen.getByLabelText("Excluir Maria Agricultora"));

    await waitFor(() =>
      expect(screen.getByText("Nenhum(a) agricultor(a) cadastrado(a) ainda")).toBeInTheDocument()
    );
    expect(organizacaoApi.excluirAgricultor).toHaveBeenCalledWith(1);
  });
});
```

- [ ] **Step 2: Create `frontend/src/pages/OrganizacaoDashboardPage.jsx`**

```jsx
import { useEffect, useState } from "react";
import { Link as RouterLink } from "react-router-dom";
import Container from "@mui/material/Container";
import Typography from "@mui/material/Typography";
import Button from "@mui/material/Button";
import List from "@mui/material/List";
import ListItem from "@mui/material/ListItem";
import ListItemText from "@mui/material/ListItemText";
import IconButton from "@mui/material/IconButton";
import Stack from "@mui/material/Stack";
import Inventory2OutlinedIcon from "@mui/icons-material/Inventory2Outlined";
import EditIcon from "@mui/icons-material/Edit";
import DeleteIcon from "@mui/icons-material/Delete";
import { listarAgricultores, excluirAgricultor } from "../auth/organizacaoApi.js";

export default function OrganizacaoDashboardPage() {
  const [agricultores, setAgricultores] = useState(null);
  const [error, setError] = useState(null);

  async function load() {
    try {
      const dados = await listarAgricultores();
      setAgricultores(dados);
    } catch (err) {
      setError(err.message);
    }
  }

  useEffect(() => {
    load();
  }, []);

  async function handleDelete(id) {
    await excluirAgricultor(id);
    load();
  }

  if (agricultores === null) {
    return null;
  }

  return (
    <Container maxWidth="sm" sx={{ py: 6 }}>
      {error && <Typography color="error">{error}</Typography>}
      {agricultores.length === 0 ? (
        <Stack spacing={2} alignItems="center" sx={{ py: 8 }}>
          <Inventory2OutlinedIcon sx={{ fontSize: 64 }} color="disabled" />
          <Typography variant="h6">Nenhum(a) agricultor(a) cadastrado(a) ainda</Typography>
          <Button component={RouterLink} to="/organizacao/agricultores/novo" variant="contained">
            Cadastrar agricultor(a)
          </Button>
        </Stack>
      ) : (
        <>
          <Stack direction="row" justifyContent="space-between" alignItems="center" sx={{ mb: 2 }}>
            <Typography variant="h5">Agricultores(as)</Typography>
            <Button component={RouterLink} to="/organizacao/agricultores/novo" variant="contained">
              Cadastrar agricultor(a)
            </Button>
          </Stack>
          <List>
            {agricultores.map((agricultor) => (
              <ListItem
                key={agricultor.id}
                secondaryAction={
                  <>
                    <IconButton
                      component={RouterLink}
                      to={`/organizacao/agricultores/${agricultor.id}/editar`}
                      aria-label={`Editar ${agricultor.nome}`}
                    >
                      <EditIcon />
                    </IconButton>
                    <IconButton onClick={() => handleDelete(agricultor.id)} aria-label={`Excluir ${agricultor.nome}`}>
                      <DeleteIcon />
                    </IconButton>
                  </>
                }
              >
                <ListItemText primary={agricultor.nome} secondary="Protocolo: Ainda não preenchido" />
              </ListItem>
            ))}
          </List>
        </>
      )}
    </Container>
  );
}
```

- [ ] **Step 3: Wire it into `frontend/src/App.jsx`** (replace the stub route)

```jsx
import OrganizacaoDashboardPage from "./pages/OrganizacaoDashboardPage.jsx";
// ...
<Route path="/organizacao/dashboard" element={<OrganizacaoDashboardPage />} />
```

- [ ] **Step 4: Run the tests**

```bash
docker compose run --rm frontend npm test -- OrganizacaoDashboardPage
```

Expected: `2 passed`.

- [ ] **Step 5: Commit**

```bash
git add frontend/src/pages/OrganizacaoDashboardPage.jsx frontend/src/pages/OrganizacaoDashboardPage.test.jsx frontend/src/App.jsx
git commit -m "feat: add organizacao dashboard with empty state and agricultor list"
```

---

### Task 11: Formulário de agricultor (cadastro e edição)

**Files:**
- Create: `frontend/src/pages/AgricultorFormPage.jsx`
- Create: `frontend/src/pages/AgricultorFormPage.test.jsx`
- Modify: `frontend/src/App.jsx`

**Interfaces:**
- Consumes: `cadastrarAgricultor`, `obterAgricultor`, `atualizarAgricultor` (Task 7's `organizacaoApi.js`).
- Produces: routes `/organizacao/agricultores/novo` and `/organizacao/agricultores/:id/editar`.

- [ ] **Step 1: Write the failing tests**

`frontend/src/pages/AgricultorFormPage.test.jsx`:

```jsx
import { render, screen, waitFor } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { MemoryRouter, Routes, Route } from "react-router-dom";
import AgricultorFormPage from "./AgricultorFormPage.jsx";
import * as organizacaoApi from "../auth/organizacaoApi.js";

function renderForm(initialPath, path) {
  return render(
    <MemoryRouter initialEntries={[initialPath]}>
      <Routes>
        <Route path={path} element={<AgricultorFormPage />} />
        <Route path="/organizacao/dashboard" element={<div>Dashboard Stub</div>} />
      </Routes>
    </MemoryRouter>
  );
}

describe("AgricultorFormPage", () => {
  afterEach(() => {
    vi.restoreAllMocks();
  });

  it("cadastra um novo agricultor e navega pro dashboard", async () => {
    vi.spyOn(organizacaoApi, "cadastrarAgricultor").mockResolvedValue({ id: 1 });
    renderForm("/organizacao/agricultores/novo", "/organizacao/agricultores/novo");

    await userEvent.type(screen.getByLabelText("Nome do(a) Agricultor(a)"), "Maria Agricultora");
    await userEvent.type(screen.getByLabelText("CPF do(a) agricultor(a)"), "12345678900");
    for (const label of [
      /associado ou cooperado/i,
      /agricultor\(a\) familiar/i,
      /sistema agroflorestal/i,
      /agrotóxico/i,
    ]) {
      await userEvent.click(screen.getByLabelText(label));
      await userEvent.click(await screen.findByRole("option", { name: "Sim" }));
    }
    await userEvent.click(screen.getByRole("button", { name: "Cadastrar" }));

    await waitFor(() => expect(screen.getByText("Dashboard Stub")).toBeInTheDocument());
    expect(organizacaoApi.cadastrarAgricultor).toHaveBeenCalledWith({
      nome: "Maria Agricultora",
      cpf: "12345678900",
      associado_ou_cooperado: true,
      agricultor_familiar: true,
      tem_saf: true,
      usa_agrotoxico: true,
    });
  });

  it("carrega os dados existentes no modo edição", async () => {
    vi.spyOn(organizacaoApi, "obterAgricultor").mockResolvedValue({
      nome: "Maria Agricultora",
      cpf: "12345678900",
      associado_ou_cooperado: true,
      agricultor_familiar: false,
      tem_saf: true,
      usa_agrotoxico: false,
    });
    renderForm("/organizacao/agricultores/1/editar", "/organizacao/agricultores/:id/editar");

    await waitFor(() =>
      expect(screen.getByDisplayValue("Maria Agricultora")).toBeInTheDocument()
    );
    expect(screen.getByRole("button", { name: "Salvar" })).toBeInTheDocument();
  });
});
```

- [ ] **Step 2: Create `frontend/src/pages/AgricultorFormPage.jsx`**

```jsx
import { useEffect, useState } from "react";
import { useNavigate, useParams } from "react-router-dom";
import Container from "@mui/material/Container";
import Typography from "@mui/material/Typography";
import TextField from "@mui/material/TextField";
import MenuItem from "@mui/material/MenuItem";
import Button from "@mui/material/Button";
import Stack from "@mui/material/Stack";
import Alert from "@mui/material/Alert";
import { cadastrarAgricultor, obterAgricultor, atualizarAgricultor } from "../auth/organizacaoApi.js";

const CAMPOS_SIM_NAO = [
  ["associado_ou_cooperado", "O(A) agricultor(a) é associado ou cooperado?"],
  ["agricultor_familiar", "É agricultor(a) familiar?"],
  ["tem_saf", "O(A) agricultor(a) tem sistema agroflorestal (SAF) em sua propriedade/sítio?"],
  ["usa_agrotoxico", "O(A) agricultor(a) usa algum tipo de agrotóxico na propriedade?"],
];

const FORM_VAZIO = {
  nome: "",
  cpf: "",
  associado_ou_cooperado: "",
  agricultor_familiar: "",
  tem_saf: "",
  usa_agrotoxico: "",
};

export default function AgricultorFormPage() {
  const { id } = useParams();
  const isEdicao = Boolean(id);
  const [form, setForm] = useState(FORM_VAZIO);
  const [error, setError] = useState(null);
  const [loading, setLoading] = useState(false);
  const navigate = useNavigate();

  useEffect(() => {
    if (!isEdicao) return;
    obterAgricultor(id).then((dados) =>
      setForm({
        nome: dados.nome,
        cpf: dados.cpf,
        associado_ou_cooperado: dados.associado_ou_cooperado ? "sim" : "nao",
        agricultor_familiar: dados.agricultor_familiar ? "sim" : "nao",
        tem_saf: dados.tem_saf ? "sim" : "nao",
        usa_agrotoxico: dados.usa_agrotoxico ? "sim" : "nao",
      })
    );
  }, [id, isEdicao]);

  function setField(field) {
    return (event) => setForm((prev) => ({ ...prev, [field]: event.target.value }));
  }

  async function handleSubmit(event) {
    event.preventDefault();
    setError(null);
    setLoading(true);
    const payload = {
      nome: form.nome,
      cpf: form.cpf,
      associado_ou_cooperado: form.associado_ou_cooperado === "sim",
      agricultor_familiar: form.agricultor_familiar === "sim",
      tem_saf: form.tem_saf === "sim",
      usa_agrotoxico: form.usa_agrotoxico === "sim",
    };
    try {
      if (isEdicao) {
        await atualizarAgricultor(id, payload);
      } else {
        await cadastrarAgricultor(payload);
      }
      navigate("/organizacao/dashboard");
    } catch (err) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  }

  return (
    <Container maxWidth="sm" sx={{ py: 6 }}>
      <Typography variant="h5" component="h1" gutterBottom>
        {isEdicao ? "Editar agricultor(a)" : "Cadastrar agricultor(a)"}
      </Typography>
      <form onSubmit={handleSubmit}>
        <Stack spacing={2}>
          {error && <Alert severity="error">{error}</Alert>}
          <TextField label="Nome do(a) Agricultor(a)" value={form.nome} onChange={setField("nome")} required fullWidth />
          <TextField
            label="CPF do(a) agricultor(a)"
            value={form.cpf}
            onChange={setField("cpf")}
            required
            fullWidth
          />
          {CAMPOS_SIM_NAO.map(([campo, rotulo]) => (
            <TextField
              key={campo}
              select
              label={rotulo}
              value={form[campo]}
              onChange={setField(campo)}
              required
              fullWidth
            >
              <MenuItem value="sim">Sim</MenuItem>
              <MenuItem value="nao">Não</MenuItem>
            </TextField>
          ))}
          <Button type="submit" variant="contained" disabled={loading}>
            {isEdicao ? "Salvar" : "Cadastrar"}
          </Button>
        </Stack>
      </form>
    </Container>
  );
}
```

- [ ] **Step 3: Wire it into `frontend/src/App.jsx`** (inside the protected route group, alongside the dashboard)

```jsx
import AgricultorFormPage from "./pages/AgricultorFormPage.jsx";
// ...
<Route path="/organizacao/agricultores/novo" element={<AgricultorFormPage />} />
<Route path="/organizacao/agricultores/:id/editar" element={<AgricultorFormPage />} />
```

- [ ] **Step 4: Run the tests**

```bash
docker compose run --rm frontend npm test -- AgricultorFormPage
```

Expected: `2 passed`.

- [ ] **Step 5: Commit**

```bash
git add frontend/src/pages/AgricultorFormPage.jsx frontend/src/pages/AgricultorFormPage.test.jsx frontend/src/App.jsx
git commit -m "feat: add agricultor create/edit form"
```

---

### Task 12: Perfil da organização (CRUD)

**Files:**
- Create: `frontend/src/pages/OrganizacaoPerfilPage.jsx`
- Create: `frontend/src/pages/OrganizacaoPerfilPage.test.jsx`
- Modify: `frontend/src/App.jsx`

**Interfaces:**
- Consumes: `getPerfil`, `atualizarPerfil`, `excluirPerfil` (Task 7's `organizacaoApi.js`), `useAuth()` (Task 7).
- Produces: route `/organizacao/perfil`. Last task in this plan.

- [ ] **Step 1: Write the failing tests**

`frontend/src/pages/OrganizacaoPerfilPage.test.jsx`:

```jsx
import { render, screen, waitFor } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { MemoryRouter, Routes, Route } from "react-router-dom";
import OrganizacaoPerfilPage from "./OrganizacaoPerfilPage.jsx";
import * as organizacaoApi from "../auth/organizacaoApi.js";
import { AuthProvider } from "../auth/AuthContext.jsx";

function renderPage() {
  return render(
    <AuthProvider>
      <MemoryRouter initialEntries={["/organizacao/perfil"]}>
        <Routes>
          <Route path="/organizacao/perfil" element={<OrganizacaoPerfilPage />} />
          <Route path="/organizacao" element={<div>Login Stub</div>} />
        </Routes>
      </MemoryRouter>
    </AuthProvider>
  );
}

describe("OrganizacaoPerfilPage", () => {
  afterEach(() => {
    vi.restoreAllMocks();
  });

  it("carrega e exibe o perfil atual", async () => {
    vi.spyOn(organizacaoApi, "getPerfil").mockResolvedValue({
      nome: "Coop Teste",
      razao_social: "Cooperativa Teste LTDA",
      exclusivamente_agricultura_familiar: true,
    });
    renderPage();
    await waitFor(() => expect(screen.getByDisplayValue("Coop Teste")).toBeInTheDocument());
  });

  it("exclui o perfil, desloga e volta pro login", async () => {
    vi.spyOn(organizacaoApi, "getPerfil").mockResolvedValue({
      nome: "Coop Teste",
      razao_social: "Cooperativa Teste LTDA",
      exclusivamente_agricultura_familiar: true,
    });
    vi.spyOn(organizacaoApi, "excluirPerfil").mockResolvedValue();
    renderPage();

    await waitFor(() => expect(screen.getByDisplayValue("Coop Teste")).toBeInTheDocument());
    await userEvent.click(screen.getByRole("button", { name: "Excluir organização" }));
    await userEvent.click(screen.getByRole("button", { name: "Excluir" }));

    await waitFor(() => expect(screen.getByText("Login Stub")).toBeInTheDocument());
  });
});
```

- [ ] **Step 2: Create `frontend/src/pages/OrganizacaoPerfilPage.jsx`**

```jsx
import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import Container from "@mui/material/Container";
import Typography from "@mui/material/Typography";
import TextField from "@mui/material/TextField";
import MenuItem from "@mui/material/MenuItem";
import Button from "@mui/material/Button";
import Stack from "@mui/material/Stack";
import Alert from "@mui/material/Alert";
import Dialog from "@mui/material/Dialog";
import DialogTitle from "@mui/material/DialogTitle";
import DialogActions from "@mui/material/DialogActions";
import { getPerfil, atualizarPerfil, excluirPerfil } from "../auth/organizacaoApi.js";
import { useAuth } from "../auth/AuthContext.jsx";

export default function OrganizacaoPerfilPage() {
  const [form, setForm] = useState(null);
  const [error, setError] = useState(null);
  const [confirmandoExclusao, setConfirmandoExclusao] = useState(false);
  const { logout } = useAuth();
  const navigate = useNavigate();

  useEffect(() => {
    getPerfil().then((dados) =>
      setForm({
        nome: dados.nome,
        razao_social: dados.razao_social,
        exclusivamente_agricultura_familiar: dados.exclusivamente_agricultura_familiar ? "sim" : "nao",
      })
    );
  }, []);

  function setField(field) {
    return (event) => setForm((prev) => ({ ...prev, [field]: event.target.value }));
  }

  async function handleSubmit(event) {
    event.preventDefault();
    setError(null);
    try {
      await atualizarPerfil({
        nome: form.nome,
        razao_social: form.razao_social,
        exclusivamente_agricultura_familiar: form.exclusivamente_agricultura_familiar === "sim",
      });
    } catch (err) {
      setError(err.message);
    }
  }

  async function handleExcluir() {
    await excluirPerfil();
    await logout();
    navigate("/organizacao");
  }

  if (form === null) {
    return null;
  }

  return (
    <Container maxWidth="sm" sx={{ py: 6 }}>
      <Typography variant="h5" component="h1" gutterBottom>
        Perfil da organização
      </Typography>
      <form onSubmit={handleSubmit}>
        <Stack spacing={2}>
          {error && <Alert severity="error">{error}</Alert>}
          <TextField label="Nome da Associação" value={form.nome} onChange={setField("nome")} fullWidth />
          <TextField label="Razão Social" value={form.razao_social} onChange={setField("razao_social")} fullWidth />
          <TextField
            select
            label="Exclusivamente da agricultura familiar?"
            value={form.exclusivamente_agricultura_familiar}
            onChange={setField("exclusivamente_agricultura_familiar")}
            fullWidth
          >
            <MenuItem value="sim">Sim</MenuItem>
            <MenuItem value="nao">Não</MenuItem>
          </TextField>
          <Button type="submit" variant="contained">
            Salvar
          </Button>
          <Button color="error" onClick={() => setConfirmandoExclusao(true)}>
            Excluir organização
          </Button>
        </Stack>
      </form>
      <Dialog open={confirmandoExclusao} onClose={() => setConfirmandoExclusao(false)}>
        <DialogTitle>Excluir a organização e todos os agricultores cadastrados?</DialogTitle>
        <DialogActions>
          <Button onClick={() => setConfirmandoExclusao(false)}>Cancelar</Button>
          <Button color="error" onClick={handleExcluir}>
            Excluir
          </Button>
        </DialogActions>
      </Dialog>
    </Container>
  );
}
```

- [ ] **Step 3: Wire it into `frontend/src/App.jsx`** (inside the protected route group)

```jsx
import OrganizacaoPerfilPage from "./pages/OrganizacaoPerfilPage.jsx";
// ...
<Route path="/organizacao/perfil" element={<OrganizacaoPerfilPage />} />
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

Cadastre uma organização em `/organizacao/cadastro`, confirme que cai no dashboard vazio, cadastre um agricultor, confirme que aparece na lista com "Ainda não preenchido", edite-o, exclua-o, edite o perfil da organização, faça logout, faça login de novo com as mesmas credenciais.

- [ ] **Step 6: Commit**

```bash
git add frontend/src/pages/OrganizacaoPerfilPage.jsx frontend/src/pages/OrganizacaoPerfilPage.test.jsx frontend/src/App.jsx
git commit -m "feat: add organizacao profile CRUD screen"
```
