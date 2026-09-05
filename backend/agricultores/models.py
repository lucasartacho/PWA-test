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
