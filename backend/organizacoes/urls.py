from django.urls import path

from .views import OrganizacaoCadastroView

urlpatterns = [
    path("", OrganizacaoCadastroView.as_view(), name="organizacao-cadastro"),
]
