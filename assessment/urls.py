from django.urls import path
from . import views

urlpatterns = [
    # ============ Assessment URLs ============
    path('api/check-eligibility/', views.check_assessment_eligibility, name='check_eligibility'),
    path('api/submit-assessment/', views.submit_assessment, name='submit_assessment'),
    path('api/pincode-stats/<str:pincode>/', views.get_pincode_stats, name='pincode_stats'),
    path('api/all-pincode-stats/', views.get_all_pincode_stats, name='all_pincode_stats'),
    # ============ Pincode Geometry URLs ============
    path('api/get-pincode-from-location/', views.get_pincode_from_location, name='get_pincode_from_location'),
]
