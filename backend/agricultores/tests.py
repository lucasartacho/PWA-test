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
