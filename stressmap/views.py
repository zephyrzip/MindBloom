from django.shortcuts import render
from assessment.models import PostalBoundaries, PincodeStats
from django.views.decorators.http import require_http_methods
from django.http import JsonResponse
import json
import logging

logger = logging.getLogger(__name__)

def stressmap_view(request):
    """Return stress color and pincode wkb_geometry as GeoJSON"""
    # Get all pincode stats in a dictionary for efficient lookup
    stats_qs = PincodeStats.objects.all()
    stats_dict = {s.pincode: s for s in stats_qs}
    
    features = []
    
    # Iterate through all postal boundaries
    for geom in PostalBoundaries.objects.all():
        stats = stats_dict.get(geom.pincode)
        if not stats:
            continue  # Skip if no stats available for this pincode
            
        stress_level, color = stats.get_stress_level()
        
        # Make sure geometry exists and is valid
        if geom.wkb_geometry:  # Fixed typo here
            features.append({
                "type": "Feature",
                "geometry": json.loads(geom.wkb_geometry.geojson),  # Fixed typo here
                "properties": {
                    "pincode": geom.pincode,
                    "office_name": geom.office_name,
                    "division_name": geom.division,
                    "region_name": geom.region,
                    "circle": geom.circle,
                    "total_assessments": stats.total_assessments,
                    "average_score": round(stats.average_score, 2),
                    "stress_level": stress_level,  # Fixed this line
                    "color": color,
                    "distribution": {
                        "excellent": stats.excellent_count,
                        "good": stats.good_count,
                        "moderate": stats.moderate_count,
                        "concerning": stats.concerning_count
                    }
                }
            })
    
    return JsonResponse({  # Moved this outside the loop
        "type": "FeatureCollection",
        "features": features,
        "count": len(features)
    })

@require_http_methods(["GET"])
def get_pincode_boundary(request, pincode):
    """
    Get boundary geometry for a specific pincode
    Returns GeoJSON
    """
    try:
        if not pincode or not pincode.isdigit() or len(pincode) != 6:
            return JsonResponse({
                'error': 'Invalid pincode format'
            }, status=400)
        
        pincode_geom = PostalBoundaries.objects.filter(pincode=pincode).first()
        
        if not pincode_geom or not pincode_geom.wkb_geometry:
            return JsonResponse({
                'error': 'Pincode boundary not found'
            }, status=404)
        
        return JsonResponse({
            'type': 'Feature',
            'properties': {
                'pincode': pincode_geom.pincode,
                'office_name': pincode_geom.office_name,
                'division': pincode_geom.division,
                'region': pincode_geom.region,
                'circle': pincode_geom.circle
            },
            'geometry': json.loads(pincode_geom.wkb_geometry.geojson)
        })
    
    except Exception as e:
        logger.error(f"Error fetching pincode boundary for {pincode}: {str(e)}", exc_info=True)
        return JsonResponse({'error': 'Server error'}, status=500)


@require_http_methods(["GET"])
def get_all_pincode_boundaries(request):
    """
    Get all pincode boundaries as GeoJSON FeatureCollection
    Supports filtering and pagination
    """
    try:
        # Get query parameters
        limit = int(request.GET.get('limit', 100))
        offset = int(request.GET.get('offset', 0))
        region = request.GET.get('region')
        circle = request.GET.get('circle')
        
        # Build queryset
        queryset = PostalBoundaries.objects.filter(
            wkb_geometry__isnull=False
        )
        
        if region:
            queryset = queryset.filter(region__iexact=region)
        if circle:
            queryset = queryset.filter(circle__iexact=circle)
        
        # Get total count before pagination
        total_count = queryset.count()
        
        # Apply pagination
        queryset = queryset[offset:offset + limit]
        
        # Build features
        features = []
        for geom in queryset:
            try:
                features.append({
                    'type': 'Feature',
                    'properties': {
                        'pincode': geom.pincode,
                        'office_name': geom.office_name,
                        'division': geom.division,
                        'region': geom.region,
                        'circle': geom.circle
                    },
                    'geometry': json.loads(geom.wkb_geometry.geojson)
                })
            except Exception as e:
                logger.warning(f"Error processing geometry for pincode {geom.pincode}: {str(e)}")
                continue
        
        return JsonResponse({
            'type': 'FeatureCollection',
            'features': features,
            'count': len(features),
            'total': total_count,
            'offset': offset,
            'limit': limit
        })
    
    except ValueError as e:
        return JsonResponse({
            'error': 'Invalid pagination parameters'
        }, status=400)
    except Exception as e:
        logger.error(f"Error fetching all boundaries: {str(e)}", exc_info=True)
        return JsonResponse({'error': 'Server error'}, status=500)


@require_http_methods(["GET"])
def get_map_data(request):
    """
    Combined endpoint: Returns GeoJSON with statistics
    Perfect for map visualization with color-coded boundaries
    """
    try:
        # Optional filters
        min_assessments = int(request.GET.get('min_assessments', 1))
        stress_level = request.GET.get('stress_level')
        region = request.GET.get('region')
        
        # Get all pincode stats
        stats_queryset = PincodeStats.objects.filter(
            total_assessments__gte=min_assessments
        )
        
        stats_dict = {stat.pincode: stat for stat in stats_queryset}
        
        # Get geometries for pincodes that have assessments
        geom_queryset = PostalBoundaries.objects.filter(
            pincode__in=stats_dict.keys(),
            wkb_geometry__isnull=False
        )
        
        if region:
            geom_queryset = geom_queryset.filter(region__iexact=region)
        
        features = []
        for geom in geom_queryset:
            stats = stats_dict.get(geom.pincode)
            if stats:
                level, color = stats.get_stress_level()
                
                # Filter by stress level if specified
                if stress_level and level != stress_level:
                    continue
                
                try:
                    features.append({
                        'type': 'Feature',
                        'properties': {
                            'pincode': geom.pincode,
                            'office_name': geom.office_name,
                            'division': geom.division,
                            'region': geom.region,
                            'circle': geom.circle,
                            'total_assessments': stats.total_assessments,
                            'average_score': round(stats.average_score, 2),
                            'stress_level': level,
                            'color': color,
                            'distribution': {
                                'excellent': stats.excellent_count,
                                'good': stats.good_count,
                                'moderate': stats.moderate_count,
                                'concerning': stats.concerning_count
                            }
                        },
                        'geometry': json.loads(geom.wkb_geometry.geojson)
                    })
                except Exception as e:
                    logger.warning(f"Error processing geometry for pincode {geom.pincode}: {str(e)}")
                    continue
        
        return JsonResponse({
            'type': 'FeatureCollection',
            'features': features,
            'count': len(features),
            'filters': {
                'min_assessments': min_assessments,
                'stress_level': stress_level,
                'region': region
            }
        })
    
    except ValueError:
        return JsonResponse({
            'error': 'Invalid filter parameters'
        }, status=400)
    except Exception as e:
        logger.error(f"Error fetching map data: {str(e)}", exc_info=True)
        return JsonResponse({
            'error': 'Server error occurred'
        }, status=500)

def stressmap(request):
    return render(request, 'stressmap.html', {})