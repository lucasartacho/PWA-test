from agricultor_auth.models import SelosSelecionados
from rest_framework import serializers

from .models import Agricultor


class AgricultorSerializer(serializers.ModelSerializer):
    organizacao = serializers.HiddenField(default=serializers.CurrentUserDefault())
    selos = serializers.SerializerMethodField()

    class Meta:
        model = Agricultor
        fields = [
            "id",
            "organizacao",
            "nome",
            "cpf",
            "associado_ou_cooperado",
            "agricultor_familiar",
            "tem_saf",
            "usa_agrotoxico",
            "selos",
            "created_at",
        ]
        read_only_fields = ["id", "created_at"]

    def get_selos(self, obj):
        registro = SelosSelecionados.objects.filter(cpf=obj.cpf).first()
        return registro.selos if registro else []
