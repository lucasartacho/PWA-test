from rest_framework import generics, permissions

from .models import Agricultor
from .serializers import AgricultorSerializer


class AgricultorListCreateView(generics.ListCreateAPIView):
    serializer_class = AgricultorSerializer
    permission_classes = [permissions.IsAuthenticated]

    def get_queryset(self):
        return Agricultor.objects.filter(organizacao=self.request.user)

    def perform_create(self, serializer):
        serializer.save(organizacao=self.request.user)


class AgricultorDetailView(generics.RetrieveUpdateDestroyAPIView):
    serializer_class = AgricultorSerializer
    permission_classes = [permissions.IsAuthenticated]

    def get_queryset(self):
        return Agricultor.objects.filter(organizacao=self.request.user)
