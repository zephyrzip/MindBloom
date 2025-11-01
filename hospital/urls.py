from django.urls import path
from . import views

urlpatterns = [
    path('api/hospitals/add/', views.add_hospital_api, name='add_hospital_api'),
    path('api/hospitals/', views.get_hospitals_api, name='get_hospitals_api'),
    path('hospitals/', views.hospital_list_view, name='hospital_list_view'),
]
