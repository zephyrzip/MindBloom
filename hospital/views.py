# views.py
from django.shortcuts import render, redirect
from django.http import JsonResponse
from django.views.decorators.csrf import csrf_exempt
from django.contrib import messages
import json
from .models import Hospital
from .forms import HospitalForm

# Admin dashboard view to add hospitals
def admin_dashboard(request):
    if request.method == 'POST':
        form = HospitalForm(request.POST)
        if form.is_valid():
            form.save()
            messages.success(request, 'Hospital added successfully!')
            return redirect('admin_dashboard')
    else:
        form = HospitalForm()
    
    hospitals = Hospital.objects.all()
    return render(request, 'admin_dashboard.html', {'form': form, 'hospitals': hospitals})

# API endpoint to accept data from frontend (AJAX/Fetch)
@csrf_exempt
def add_hospital_api(request):
    if request.method == 'POST':
        try:
            data = json.loads(request.body)
            hospital = Hospital.objects.create(
                name=data.get('name'),
                emergency_number=data.get('emergency_number')
            )
            return JsonResponse({
                'status': 'success',
                'message': 'Hospital added successfully',
                'hospital_id': hospital.id
            })
        except Exception as e:
            return JsonResponse({
                'status': 'error',
                'message': str(e)
            }, status=400)
    
    return JsonResponse({'status': 'error', 'message': 'Only POST method allowed'}, status=405)

# API endpoint to fetch all hospitals
def get_hospitals_api(request):
    hospitals = Hospital.objects.all()
    hospitals_data = []
    
    for hospital in hospitals:
        hospitals_data.append({
            'id': hospital.id,
            'name': hospital.name,
            'emergency_number': hospital.emergency_number,
            'created_at': hospital.created_at.strftime('%Y-%m-%d %H:%M')
        })
    
    return JsonResponse({
        'status': 'success',
        'hospitals': hospitals_data
    })

# Frontend view to display hospitals (optional - only if you need a separate public page)
def hospital_list_view(request):
    hospitals = Hospital.objects.all()
    return render(request, 'admin_dashboard.html', {'hospitals': hospitals})