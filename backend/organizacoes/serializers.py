from rest_framework import serializers

from .models import Organizacao


class OrganizacaoCadastroSerializer(serializers.ModelSerializer):
    password = serializers.CharField(write_only=True, min_length=8)

    class Meta:
        model = Organizacao
        fields = [
            "id",
            "cnpj",
            "nome",
            "razao_social",
            "exclusivamente_agricultura_familiar",
            "password",
        ]

    def create(self, validated_data):
        password = validated_data.pop("password")
        return Organizacao.objects.create_user(password=password, **validated_data)


class OrganizacaoSerializer(serializers.ModelSerializer):
    class Meta:
        model = Organizacao
        fields = [
            "id",
            "cnpj",
            "nome",
            "razao_social",
            "exclusivamente_agricultura_familiar",
            "created_at",
        ]
        read_only_fields = ["id", "cnpj", "created_at"]
