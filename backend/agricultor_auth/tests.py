from django.core.exceptions import ValidationError
from django.test import TestCase
from django.urls import reverse
from rest_framework import status
from rest_framework.test import APITestCase

from agricultores.models import Agricultor
from organizacoes.models import Organizacao

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
