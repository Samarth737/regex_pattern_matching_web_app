from django.urls import path
from .views import get_results

urlpatterns = [
    path("getResults/", get_results, name="get_results"),
]