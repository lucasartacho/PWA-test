from django.urls import path

from .views import AgricultorLoginView, AgricultorMeView, AgricultorSelosView

urlpatterns = [
    path("login/", AgricultorLoginView.as_view(), name="agricultor-login"),
    path("me/", AgricultorMeView.as_view(), name="agricultor-me"),
    path("selos/", AgricultorSelosView.as_view(), name="agricultor-selos"),
]
