from django.contrib.auth.base_user import AbstractBaseUser, BaseUserManager
from django.contrib.auth.models import PermissionsMixin
from django.core.validators import RegexValidator
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
    cnpj = models.CharField(
        max_length=14,
        unique=True,
        validators=[
            RegexValidator(r"^\d{14}$", "CNPJ deve conter exatamente 14 dígitos numéricos.")
        ],
    )
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
