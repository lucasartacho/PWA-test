from django.core.validators import RegexValidator
from django.db import models

from organizacoes.models import Organizacao


class Agricultor(models.Model):
    organizacao = models.ForeignKey(
        Organizacao, on_delete=models.CASCADE, related_name="agricultores"
    )
    nome = models.CharField(max_length=255)
    cpf = models.CharField(
        max_length=11,
        validators=[
            RegexValidator(r"^\d{11}$", "CPF deve conter exatamente 11 dígitos numéricos.")
        ],
    )
    associado_ou_cooperado = models.BooleanField(default=False)
    agricultor_familiar = models.BooleanField(default=False)
    tem_saf = models.BooleanField(default=False)
    usa_agrotoxico = models.BooleanField(default=False)
    created_at = models.DateTimeField(auto_now_add=True)

    class Meta:
        unique_together = ("organizacao", "cpf")

    def __str__(self):
        return self.nome
