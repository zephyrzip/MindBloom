from django.contrib import admin
from django.utils.html import format_html
from .models import PostalBoundaries, AssessmentResponse, PincodeStats
from django.contrib.gis.admin import GISModelAdmin

@admin.register(PostalBoundaries)
class PostalBoundariesAdmin(admin.ModelAdmin):
    list_display = ['ogc_fid', 'pincode', 'office_name', 'division', 'region', 'circle', 'geometry_status']
    search_fields = ['pincode', 'office_name', 'division', 'region', 'circle']
    list_filter = ['region', 'circle', 'division']
    readonly_fields = ['ogc_fid', 'pincode', 'office_name', 'division', 'region', 'circle', 'geometry_status']
    list_per_page = 373
    
    def geometry_status(self, obj):
        if obj.wkb_geometry:
            return "✅ Geometry data present"
        return "❌ No geometry"
    geometry_status.short_description = "Geometry Status"

    def has_add_permission(self, request):
        return False

    def has_change_permission(self, request, obj=None):
        return False

    def has_delete_permission(self, request, obj=None):
        return False


@admin.register(AssessmentResponse)
class AssessmentResponseAdmin(admin.ModelAdmin):
    list_display = ['pincode', 'score', 'max_score', 'score_percentage', 'timestamp', 'stress_indicator']
    list_filter = ['timestamp', 'pincode']
    search_fields = ['pincode']
    readonly_fields = ['user_fingerprint', 'ip_address_hash', 'user_agent_hash', 'timestamp']
    date_hierarchy = 'timestamp'
    
    def score_percentage(self, obj):
        percentage = (obj.score / obj.max_score) * 100
        return f"{percentage:.1f}%"
    score_percentage.short_description = "Score %"
    
    def stress_indicator(self, obj):
        percentage = (obj.score / obj.max_score) * 100
        if percentage <= 30:
            color = '#10b981'
            label = 'Excellent'
        elif percentage <= 50:
            color = '#fbbf24'
            label = 'Good'
        elif percentage <= 75:
            color = '#f97316'
            label = 'Moderate'
        else:
            color = '#ef4444'
            label = 'Concerning'
        
        return format_html(
            '<span style="background-color: {}; color: white; padding: 3px 10px; border-radius: 3px;">{}</span>',
            color, label
        )
    stress_indicator.short_description = "Stress Level"
    
    def has_add_permission(self, request):
        # Prevent manual addition through admin
        return False
    
    def has_change_permission(self, request, obj=None):
        # Prevent editing through admin
        return False


@admin.register(PincodeStats)
class PincodeStatsAdmin(admin.ModelAdmin):
    list_display = ['pincode', 'total_assessments', 'average_score_display', 
                   'stress_level_display', 'last_updated', 'distribution_summary']
    search_fields = ['pincode']
    readonly_fields = ['pincode', 'total_assessments', 'average_score', 
                      'excellent_count', 'good_count', 'moderate_count', 
                      'concerning_count', 'last_updated']
    list_per_page = 50
    
    def average_score_display(self, obj):
        return f"{obj.average_score:.2f}"
    average_score_display.short_description = "Avg Score"
    
    def stress_level_display(self, obj):
        level, color = obj.get_stress_level()
        return format_html(
            '<span style="background-color: {}; color: white; padding: 3px 10px; border-radius: 3px;">{}</span>',
            color, level.upper()
        )
    stress_level_display.short_description = "Stress Level"
    
    def distribution_summary(self, obj):
        return format_html(
            '🟢 {} | 🟡 {} | 🟠 {} | 🔴 {}',
            obj.excellent_count,
            obj.good_count,
            obj.moderate_count,
            obj.concerning_count
        )
    distribution_summary.short_description = "Distribution"
    
    def has_add_permission(self, request):
        return False
    
    def has_delete_permission(self, request, obj=None):
        # Only allow superusers to delete
        return request.user.is_superuser
    
    actions = ['recalculate_stats']
    
    def recalculate_stats(self, request, queryset):
        count = 0
        for stats in queryset:
            stats.update_stats()
            count += 1
        self.message_user(request, f"Successfully recalculated statistics for {count} pincodes.")
    recalculate_stats.short_description = "Recalculate selected statistics"