from django.urls import path

from .views import AgricultorLoginView

urlpatterns = [
    path("login/", AgricultorLoginView.as_view(), name="agricultor-login"),
]
