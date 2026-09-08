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
