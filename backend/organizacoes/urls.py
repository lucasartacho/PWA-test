from django.urls import path

from .views import OrganizacaoCadastroView, OrganizacaoMeView

urlpatterns = [
    path("", OrganizacaoCadastroView.as_view(), name="organizacao-cadastro"),
    path("me/", OrganizacaoMeView.as_view(), name="organizacao-me"),
]
