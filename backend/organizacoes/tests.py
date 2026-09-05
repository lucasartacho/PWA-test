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
