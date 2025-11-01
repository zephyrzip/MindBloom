from django.shortcuts import render
from django.http import JsonResponse
from django.views.decorators.csrf import csrf_exempt
from django.views.decorators.http import require_http_methods
import json
from .models import Doctor

def admin_dashboard(request):
    """Simple admin portal to add doctors"""
    return render(request, 'admin_dashboard.html')

@csrf_exempt
@require_http_methods(["POST"])
def save_doctor(request):
    """API endpoint to save doctor data from admin portal"""
    try:
        data = json.loads(request.body)
        
        doctor = Doctor.objects.create(
            name=data['name'],
            specialist=data['specialist'],
            fees=float(data['fees'])
        )
        
        return JsonResponse({
            'success': True, 
            'message': 'Doctor saved successfully!',
            'doctor_id': doctor.id
        })
    
    except Exception as e:
        return JsonResponse({
            'success': False, 
            'message': f'Error saving doctor: {str(e)}'
        })

@require_http_methods(["GET"])
def get_doctors_by_specialist(request, specialist):
    """API endpoint to fetch doctors by specialist"""
    try:
        doctors = Doctor.objects.filter(specialist__iexact=specialist)
        
        doctors_data = []
        for doctor in doctors:
            doctors_data.append({
                'id': doctor.id,
                'name': doctor.name,
                'specialist': doctor.specialist,
                'fees': str(doctor.fees)
            })
        
        return JsonResponse({
            'success': True,
            'doctors': doctors_data
        })
    
    except Exception as e:
        return JsonResponse({
            'success': False,
            'message': f'Error fetching doctors: {str(e)}',
            'doctors': []
        })