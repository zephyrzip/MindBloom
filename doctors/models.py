from django.db import models

class Doctor(models.Model):
    name = models.CharField(max_length=100)
    specialist = models.CharField(max_length=100)
    fees = models.DecimalField(max_digits=10, decimal_places=2)
    created_at = models.DateTimeField(auto_now_add=True)
    
    def __str__(self):
        return f"Dr. {self.name} - {self.specialist}"
    
    class Meta:
        app_label = 'doctors'
        ordering = ['name']
