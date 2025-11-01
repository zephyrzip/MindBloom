# forms.py
from django import forms
from .models import Hospital

class HospitalForm(forms.ModelForm):
    class Meta:
        model = Hospital
        fields = ['name', 'emergency_number']
        widgets = {
            'name': forms.TextInput(attrs={
                'class': 'form-control',
                'placeholder': 'Enter hospital name'
            }),
            'emergency_number': forms.TextInput(attrs={
                'class': 'form-control',
                'placeholder': 'Enter emergency number'
            })
        }