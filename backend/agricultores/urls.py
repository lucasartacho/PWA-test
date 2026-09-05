from django.urls import path

from .views import AgricultorDetailView, AgricultorListCreateView

urlpatterns = [
    path("", AgricultorListCreateView.as_view(), name="agricultor-list-create"),
    path("<int:pk>/", AgricultorDetailView.as_view(), name="agricultor-detail"),
]
