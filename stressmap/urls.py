from django.urls import path
from . import views

urlpatterns = [
    path('stressmap/', views.stressmap, name='stressmap'),
    path('api/pincode-boundaries/', views.get_all_pincode_boundaries, name='pincode_boundaries'),
    path('api/pincode-boundary/<str:pincode>/', views.get_pincode_boundary, name='pincode_boundary'),
    path('api/map-data/', views.get_map_data, name='map_data'),
]
