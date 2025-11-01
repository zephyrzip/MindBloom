from django.db import models

class Hospital(models.Model):
    name = models.CharField(max_length=200)
    emergency_number = models.CharField(max_length=20)
    created_at = models.DateTimeField(auto_now_add=True)
    updated_at = models.DateTimeField(auto_now=True)
    
    def __str__(self):
        return self.name
    
    class Meta:
        app_label = 'hospital'
        ordering = ['name']