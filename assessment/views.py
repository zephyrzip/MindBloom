# views.py
from django.shortcuts import render
from django.http import JsonResponse
from django.views.decorators.csrf import csrf_exempt
from django.views.decorators.http import require_http_methods
from django.contrib.gis.geos import Point
from .models import (
    PostalBoundaries, 
    AssessmentResponse, 
    PincodeStats, 
    hash_data
)
import json
import logging
# from django.db.models import Q

logger = logging.getLogger(__name__)


# ============ Helper Functions ============
def get_client_ip(request):
    """Extract client IP from request"""
    x_forwarded_for = request.META.get('HTTP_X_FORWARDED_FOR')
    if x_forwarded_for:
        ip = x_forwarded_for.split(',')[0].strip()
    else:
        ip = request.META.get('REMOTE_ADDR', '')
    return ip


def get_user_agent(request):
    """Extract user agent from request"""
    return request.META.get('HTTP_USER_AGENT', '')


# ============ PINCODE GEOMETRY VIEWS ============

@csrf_exempt
@require_http_methods(["POST"])
def get_pincode_from_location(request):
    """
    Get pincode from latitude/longitude
    User sends their location, we return the pincode
    """
    try:
        data = json.loads(request.body)
        lat = data.get('latitude')
        lng = data.get('longitude')
        
        if not lat or not lng:
            return JsonResponse({
                'success': False,
                'error': 'Latitude and longitude required'
            }, status=400)
        
        # Validate coordinates
        try:
            lat = float(lat)
            lng = float(lng)
            if not (-90 <= lat <= 90) or not (-180 <= lng <= 180):
                raise ValueError("Invalid coordinate range")
        except (ValueError, TypeError):
            return JsonResponse({
                'success': False,
                'error': 'Invalid coordinates'
            }, status=400)
        
        # Create point from coordinates (Note: PostGIS uses lng, lat order)
        point = Point(lng, lat, srid=4326)
        
        # Find which pincode boundary contains this point
        pincode_area = PostalBoundaries.objects.filter(
            wkb_geometry__contains=point
        ).first()
        
        if pincode_area:
            return JsonResponse({
                'success': True,
                'pincode': pincode_area.pincode,
                'office_name': pincode_area.office_name,
                'division': pincode_area.division,
                'region': pincode_area.region,
                'circle': pincode_area.circle
            })
        else:
            return JsonResponse({
                'success': False,
                'message': 'No pincode found for this location. Please enter manually.',
                'coordinates': {'lat': lat, 'lng': lng}
            }, status=404)
    
    except json.JSONDecodeError:
        return JsonResponse({
            'success': False,
            'error': 'Invalid JSON data'
        }, status=400)
    except Exception as e:
        logger.error(f"Error getting pincode from location: {str(e)}", exc_info=True)
        return JsonResponse({
            'success': False,
            'error': 'Server error occurred'
        }, status=500)


# ============ ASSESSMENT VIEWS ============

@csrf_exempt
@require_http_methods(["POST"])
def check_assessment_eligibility(request):
    """
    Check if user can take assessment (7-day cooldown)
    """
    try:
        data = json.loads(request.body)
        fingerprint = data.get('fingerprint')
        
        if not fingerprint:
            return JsonResponse({
                'error': 'Fingerprint required'
            }, status=400)
        
        # Get client info
        ip_address = get_client_ip(request)
        ip_hash = hash_data(ip_address)
        fingerprint_hash = hash_data(fingerprint)
        
        # Check eligibility
        can_submit, days_remaining = AssessmentResponse.can_submit_assessment(
            fingerprint_hash, ip_hash
        )
        
        return JsonResponse({
            'can_submit': can_submit,
            'days_remaining': days_remaining,
            'message': (
                f'Please wait {days_remaining} more day{"s" if days_remaining != 1 else ""} before taking the assessment again.' 
                if not can_submit 
                else 'You are eligible to take the assessment.'
            )
        })
    
    except json.JSONDecodeError:
        return JsonResponse({
            'error': 'Invalid JSON data'
        }, status=400)
    except Exception as e:
        logger.error(f"Error checking eligibility: {str(e)}", exc_info=True)
        return JsonResponse({
            'error': 'Server error occurred'
        }, status=500)


@csrf_exempt
@require_http_methods(["POST"])
def submit_assessment(request):
    """
    Submit assessment results and update statistics
    """
    try:
        data = json.loads(request.body)
        
        # Extract data
        pincode = data.get('pincode', '').strip()
        score = data.get('score')
        max_score = data.get('max_score', 400)
        fingerprint = data.get('fingerprint', '').strip()
        
        # Validation
        if not pincode or not fingerprint:
            return JsonResponse({
                'error': 'Pincode and fingerprint are required'
            }, status=400)
        
        if not pincode.isdigit() or len(pincode) != 6:
            return JsonResponse({
                'error': 'Invalid pincode format. Must be 6 digits.'
            }, status=400)
        
        if not isinstance(score, (int, float)) or score < 0:
            return JsonResponse({
                'error': 'Invalid score value'
            }, status=400)
        
        if not isinstance(max_score, (int, float)) or max_score <= 0:
            return JsonResponse({
                'error': 'Invalid max_score value'
            }, status=400)
        
        # Verify pincode exists in database
        pincode_exists = PostalBoundaries.objects.filter(pincode=pincode).exists()
        if not pincode_exists:
            return JsonResponse({
                'error': 'Pincode not found in our database. Please verify your pincode.'
            }, status=404)
        
        # Get client info
        ip_address = get_client_ip(request)
        user_agent = get_user_agent(request)
        
        # Hash sensitive data
        ip_hash = hash_data(ip_address)
        fingerprint_hash = hash_data(fingerprint)
        user_agent_hash = hash_data(user_agent) if user_agent else None
        
        # Check if user can submit (7-day cooldown)
        can_submit, days_remaining = AssessmentResponse.can_submit_assessment(
            fingerprint_hash, ip_hash
        )
        
        if not can_submit:
            return JsonResponse({
                'error': 'rate_limited',
                'message': f'You can take the assessment again in {days_remaining} day{"s" if days_remaining != 1 else ""}.',
                'days_remaining': days_remaining
            }, status=429)
        
        # Create assessment response
        assessment = AssessmentResponse.objects.create(
            pincode=pincode,
            score=int(score),
            max_score=int(max_score),
            user_fingerprint=fingerprint_hash,
            ip_address_hash=ip_hash,
            user_agent_hash=user_agent_hash
        )
        
        logger.info(f"Assessment submitted - Pincode: {pincode}, Score: {score}/{max_score}")
        
        # Update or create pincode statistics
        stats, created = PincodeStats.objects.get_or_create(pincode=pincode)
        stats.update_stats()
        
        # Get stress level info
        stress_level, color = stats.get_stress_level()
        
        return JsonResponse({
            'success': True,
            'message': 'Assessment submitted successfully',
            'pincode': pincode,
            'total_assessments': stats.total_assessments,
            'average_score': round(stats.average_score, 2),
            'stress_level': stress_level,
            'color': color,
            'assessment_id': assessment.id
        })
    
    except json.JSONDecodeError:
        return JsonResponse({
            'error': 'Invalid JSON data'
        }, status=400)
    except Exception as e:
        logger.error(f"Error submitting assessment: {str(e)}", exc_info=True)
        return JsonResponse({
            'error': 'Server error occurred. Please try again.'
        }, status=500)
    

# ============ STATISTICS VIEWS ============

@require_http_methods(["GET"])
def get_pincode_stats(request, pincode):
    """
    Get statistics for a specific pincode
    """
    try:
        if not pincode or not pincode.isdigit() or len(pincode) != 6:
            return JsonResponse({
                'error': 'Invalid pincode format'
            }, status=400)
        
        stats = PincodeStats.objects.filter(pincode=pincode).first()
        
        if not stats:
            # Check if pincode exists in boundaries
            pincode_exists = PostalBoundaries.objects.filter(pincode=pincode).exists()
            if not pincode_exists:
                return JsonResponse({
                    'error': 'Pincode not found'
                }, status=404)
            
            return JsonResponse({
                'pincode': pincode,
                'total_assessments': 0,
                'average_score': 0,
                'stress_level': 'no_data',
                'message': 'No assessments found for this pincode yet'
            })
        
        stress_level, color = stats.get_stress_level()
        
        return JsonResponse({
            'success': True,
            'pincode': pincode,
            'total_assessments': stats.total_assessments,
            'average_score': round(stats.average_score, 2),
            'stress_level': stress_level,
            'color': color,
            'distribution': {
                'excellent': stats.excellent_count,
                'good': stats.good_count,
                'moderate': stats.moderate_count,
                'concerning': stats.concerning_count
            },
            'last_updated': stats.last_updated.isoformat()
        })
    
    except Exception as e:
        logger.error(f"Error fetching pincode stats for {pincode}: {str(e)}", exc_info=True)
        return JsonResponse({
            'error': 'Server error occurred'
        }, status=500)


@require_http_methods(["GET"])
def get_all_pincode_stats(request):
    """
    Get statistics for all pincodes (for map visualization)
    Returns list of pincodes with their stress levels
    """
    try:
        # Optional filtering
        min_assessments = int(request.GET.get('min_assessments', 0))
        stress_level = request.GET.get('stress_level')
        
        queryset = PincodeStats.objects.all()
        
        if min_assessments > 0:
            queryset = queryset.filter(total_assessments__gte=min_assessments)
        
        data = []
        for stats in queryset:
            level, color = stats.get_stress_level()
            
            # Filter by stress level if specified
            if stress_level and level != stress_level:
                continue
            
            data.append({
                'pincode': stats.pincode,
                'total_assessments': stats.total_assessments,
                'average_score': round(stats.average_score, 2),
                'stress_level': level,
                'color': color,
                'last_updated': stats.last_updated.isoformat()
            })
        
        return JsonResponse({
            'success': True,
            'data': data,
            'total_pincodes': len(data)
        })
    
    except ValueError:
        return JsonResponse({
            'error': 'Invalid filter parameters'
        }, status=400)
    except Exception as e:
        logger.error(f"Error fetching all stats: {str(e)}", exc_info=True)
        return JsonResponse({
            'error': 'Server error occurred'
        }, status=500)

