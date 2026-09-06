from django.core.exceptions import ValidationError
from django.test import TestCase
from django.urls import reverse
from rest_framework import status
from rest_framework.test import APITestCase

from .models import Organizacao


class OrganizacaoModelValidationTests(TestCase):
    def test_cnpj_invalido_falha_no_full_clean(self):
        org = Organizacao(
            cnpj="abc123",
            nome="Coop Teste",
            razao_social="Cooperativa Teste LTDA",
        )
        with self.assertRaises(ValidationError):
            org.full_clean()

    def test_cnpj_com_tamanho_incorreto_falha_no_full_clean(self):
        org = Organizacao(
            cnpj="123456789",
            nome="Coop Teste",
            razao_social="Cooperativa Teste LTDA",
        )
        with self.assertRaises(ValidationError):
            org.full_clean()


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
