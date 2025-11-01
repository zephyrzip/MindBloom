from django.contrib.gis.db import models
from django.utils import timezone
from datetime import timedelta
import hashlib

# ============ MODEL 1: For Pincode Geometry ============
class PostalBoundaries(models.Model):
    ogc_fid = models.AutoField(primary_key=True)
    wkb_geometry = models.GeometryField(blank=True, null=True)
    pincode = models.CharField(max_length=10, blank=True, null=True)
    office_name = models.CharField(max_length=200, blank=True, null=True)
    division = models.CharField(max_length=100, blank=True, null=True)
    region = models.CharField(max_length=100, blank=True, null=True)
    circle = models.CharField(max_length=100, blank=True, null=True)

    class Meta:
        managed = False
        app_label = 'assessment'
        db_table = 'postal_boundaries'
        verbose_name = 'Postal Boundary'
        verbose_name_plural = 'Postal Boundaries'
    
    def __str__(self):
        return f"{self.pincode} - {self.office_name or 'Unknown'}"


# ============ MODEL 2: For Assessment Responses ============
class AssessmentResponse(models.Model):
    """Store individual assessment responses"""
    pincode = models.CharField(max_length=6, db_index=True)
    score = models.IntegerField()
    max_score = models.IntegerField(default=400)
    user_fingerprint = models.CharField(max_length=64, db_index=True)
    ip_address_hash = models.CharField(max_length=64, db_index=True)
    user_agent_hash = models.CharField(max_length=64, null=True, blank=True)
    timestamp = models.DateTimeField(auto_now_add=True, db_index=True)
    
    class Meta:
        app_label = 'assessment'
        ordering = ['-timestamp']
        indexes = [
            models.Index(fields=['pincode', 'timestamp']),
            models.Index(fields=['user_fingerprint', 'timestamp']),
        ]
    
    def __str__(self):
        return f"Assessment - {self.pincode} - Score: {self.score}/{self.max_score}"
    
    @staticmethod
    def can_submit_assessment(fingerprint, ip_hash):
        """Check if user can submit (7-day cooldown)"""
        three_days_ago = timezone.now() - timedelta(days=3)
        
        recent = AssessmentResponse.objects.filter(
            models.Q(user_fingerprint=fingerprint) | models.Q(ip_address_hash=ip_hash),
            timestamp__gte=three_days_ago
        ).first()
        
        if recent:
            days_remaining = 3 - (timezone.now() - recent.timestamp).days
            return False, days_remaining
        return True, 0


# ============ MODEL 3: For Pincode Statistics ============
class PincodeStats(models.Model):
    """Aggregated statistics per pincode"""
    pincode = models.CharField(max_length=6, unique=True, primary_key=True)
    total_assessments = models.IntegerField(default=0)
    average_score = models.FloatField(default=0.0)
    last_updated = models.DateTimeField(auto_now=True)
    
    # Distribution counts
    excellent_count = models.IntegerField(default=0)
    good_count = models.IntegerField(default=0)
    moderate_count = models.IntegerField(default=0)
    concerning_count = models.IntegerField(default=0)
    
    class Meta:
        app_label = 'assessment'
        verbose_name_plural = "Pincode Statistics"
    
    def __str__(self):
        return f"Stats: {self.pincode} - Avg: {self.average_score:.2f}"
    
    def get_stress_level(self):
        """Return stress level and color"""
        percentage = (self.average_score / 400) * 100
        
        if percentage <= 30:
            return 'excellent', '#10b981'
        elif percentage <= 50:
            return 'good', '#fbbf24'
        elif percentage <= 75:
            return 'moderate', '#f97316'
        else:
            return 'concerning', '#ef4444'
    
    def update_stats(self):
        """Recalculate from all responses"""
        responses = AssessmentResponse.objects.filter(pincode=self.pincode)
        
        if responses.exists():
            self.total_assessments = responses.count()
            self.average_score = responses.aggregate(
                models.Avg('score')
            )['score__avg']
            
            # Calculate distribution
            self.excellent_count = 0
            self.good_count = 0
            self.moderate_count = 0
            self.concerning_count = 0
            
            for resp in responses:
                pct = (resp.score / resp.max_score) * 100
                if pct <= 30:
                    self.excellent_count += 1
                elif pct <= 50:
                    self.good_count += 1
                elif pct <= 75:
                    self.moderate_count += 1
                else:
                    self.concerning_count += 1
            
            self.save()


# Helper function
def hash_data(data):
    return hashlib.sha256(str(data).encode()).hexdigest()