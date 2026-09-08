from rest_framework import serializers

from .models import Agricultor


class AgricultorSerializer(serializers.ModelSerializer):
    organizacao = serializers.HiddenField(default=serializers.CurrentUserDefault())

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
            "created_at",
        ]
        read_only_fields = ["id", "created_at"]
