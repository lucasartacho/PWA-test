from django.core.exceptions import ValidationError
from django.test import TestCase
from django.urls import reverse
from rest_framework import status
from rest_framework.test import APITestCase

from agricultor_auth.models import SelosSelecionados
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

    def test_mesmo_cpf_em_organizacoes_diferentes_e_permitido(self):
        outra_organizacao = Organizacao.objects.create_user(
            cnpj="98765432000198",
            nome="Coop Dois",
            razao_social="Cooperativa Dois LTDA",
            password="senha-segura-123",
        )
        Agricultor.objects.create(
            organizacao=self.organizacao, nome="Maria", cpf="12345678900"
        )
        agricultor_outra_org = Agricultor.objects.create(
            organizacao=outra_organizacao, nome="Maria (outra coop)", cpf="12345678900"
        )
        self.assertEqual(agricultor_outra_org.cpf, "12345678900")
        self.assertEqual(agricultor_outra_org.organizacao, outra_organizacao)

    def test_cpf_invalido_falha_no_full_clean(self):
        agricultor = Agricultor(
            organizacao=self.organizacao, nome="Maria", cpf="abc"
        )
        with self.assertRaises(ValidationError):
            agricultor.full_clean()

    def test_cpf_com_tamanho_incorreto_falha_no_full_clean(self):
        agricultor = Agricultor(
            organizacao=self.organizacao, nome="Maria", cpf="123456789"
        )
        with self.assertRaises(ValidationError):
            agricultor.full_clean()


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

    def test_cpf_duplicado_na_mesma_organizacao_retorna_400_nao_500(self):
        self.client.force_authenticate(user=self.org_a)
        payload = {"nome": "Outro Agricultor", "cpf": self.agricultor_a.cpf}
        response = self.client.post(
            reverse("agricultor-list-create"), payload, format="json"
        )
        self.assertEqual(response.status_code, status.HTTP_400_BAD_REQUEST)

    def test_lista_inclui_selos_vazios_quando_nao_preencheu(self):
        self.client.force_authenticate(user=self.org_a)
        response = self.client.get(reverse("agricultor-list-create"))
        self.assertEqual(response.data[0]["selos"], [])

    def test_lista_inclui_selos_selecionados(self):
        SelosSelecionados.objects.create(
            cpf=self.agricultor_a.cpf, selos=["policultivo", "solo_vivo"]
        )
        self.client.force_authenticate(user=self.org_a)
        response = self.client.get(reverse("agricultor-list-create"))
        self.assertEqual(response.data[0]["selos"], ["policultivo", "solo_vivo"])
