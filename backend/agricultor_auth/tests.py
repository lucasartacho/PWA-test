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
