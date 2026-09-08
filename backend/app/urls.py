from django.urls import include, path
from rest_framework_simplejwt.views import TokenObtainPairView, TokenRefreshView

urlpatterns = [
    path("api/health/", include("health.urls")),
    path("api/organizacoes/", include("organizacoes.urls")),
    path("api/agricultores/", include("agricultores.urls")),
    path("api/agricultor/", include("agricultor_auth.urls")),
    path("api/auth/login/", TokenObtainPairView.as_view(), name="token_obtain_pair"),
    path("api/auth/refresh/", TokenRefreshView.as_view(), name="token_refresh"),
]
