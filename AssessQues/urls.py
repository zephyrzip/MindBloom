from django.urls import path
from . import views

urlpatterns = [
    path('api/generate-question/', views.generate_question, name='generate_question'),
    path('api/test-perplexity/', views.test_perplexity_connection, name='test_perplexity'),
]