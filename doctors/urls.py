from django.urls import path
from . import views    

urlpatterns = [
    path('api/save-doctor/', views.save_doctor, name='save_doctor'),
    path('api/doctors/<str:specialist>/', views.get_doctors_by_specialist, name='get_doctors_by_specialist'),   
]
