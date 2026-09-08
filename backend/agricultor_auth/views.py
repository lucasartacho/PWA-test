from django.core.exceptions import ValidationError as DjangoValidationError
from django.core.validators import RegexValidator
from rest_framework import permissions
from rest_framework.exceptions import ValidationError
from rest_framework.response import Response
from rest_framework.views import APIView

from agricultores.models import Agricultor

from .authentication import AgricultorTokenAuthentication
from .models import SelosSelecionados
from .tokens import gerar_token

CPF_VALIDATOR = RegexValidator(r"^\d{11}$", "CPF deve conter exatamente 11 dígitos numéricos.")


class AgricultorLoginView(APIView):
    permission_classes = [permissions.AllowAny]

    def post(self, request):
        cpf = request.data.get("cpf", "")
        try:
            CPF_VALIDATOR(cpf)
        except DjangoValidationError:
            raise ValidationError({"cpf": ["CPF deve conter exatamente 11 dígitos numéricos."]})
        if not Agricultor.objects.filter(cpf=cpf).exists():
            raise ValidationError({"cpf": ["CPF não encontrado em nenhuma organização."]})
        return Response({"token": gerar_token(cpf)})


class AgricultorMeView(APIView):
    authentication_classes = [AgricultorTokenAuthentication]
    permission_classes = [permissions.IsAuthenticated]

    def get(self, request):
        cpf = request.user.cpf
        agricultor = Agricultor.objects.filter(cpf=cpf).first()
        nome = agricultor.nome if agricultor else ""
        registro = SelosSelecionados.objects.filter(cpf=cpf).first()
        selos = registro.selos if registro else []
        return Response({"nome": nome, "selos": selos})


class AgricultorSelosView(APIView):
    authentication_classes = [AgricultorTokenAuthentication]
    permission_classes = [permissions.IsAuthenticated]

    def put(self, request):
        selos = request.data.get("selos", [])
        registro, _ = SelosSelecionados.objects.update_or_create(
            cpf=request.user.cpf, defaults={"selos": selos}
        )
        return Response({"selos": registro.selos})
