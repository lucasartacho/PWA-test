from rest_framework import generics, permissions

from .models import Organizacao
from .serializers import OrganizacaoCadastroSerializer


class OrganizacaoCadastroView(generics.CreateAPIView):
    queryset = Organizacao.objects.all()
    serializer_class = OrganizacaoCadastroSerializer
    permission_classes = [permissions.AllowAny]
