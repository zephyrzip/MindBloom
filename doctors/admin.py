from django.contrib import admin
from .models import Doctor

@admin.register(Doctor)
class DoctorAdmin(admin.ModelAdmin):
    list_display = ['name', 'specialist', 'fees', 'created_at']
    list_filter = ['specialist', 'created_at']
    search_fields = ['name', 'specialist']
    ordering = ['name']
