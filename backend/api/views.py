from rest_framework.decorators import api_view
from rest_framework.response import Response
from rest_framework import status
from .models import Trip, TripLog
import requests
import math

ORS_API_KEY = "eyJvcmciOiI1YjNjZTM1OTc4NTExMTAwMDFjZjYyNDgiLCJpZCI6IjZmZDkwZjMyYjM4MTQ1MWQ5MjJjNGNkM2JlZDQ2MDZmIiwiaCI6Im11cm11cjY0In0="

def geocode_location(location_str):
    """Convert location string to coordinates using Nominatim"""
    try:
        url = f"https://nominatim.openstreetmap.org/search"
        params = {
            'q': location_str,
            'format': 'json',
            'limit': 1,
        }
        headers = {'User-Agent': 'ELDTripPlanner/1.0'}
        res = requests.get(url, params=params, headers=headers, timeout=10)
        data = res.json()
        if data:
            return float(data[0]['lon']), float(data[0]['lat'])
    except Exception as e:
        print(f"Geocoding error: {e}")
    return None

def get_route(start_coords, end_coords):
    """Get route from OpenRouteService"""
    try:
        url = "https://api.openrouteservice.org/v2/directions/driving-hgv"
        headers = {
            'Authorization': ORS_API_KEY,
            'Content-Type': 'application/json',
        }
        body = {
            "coordinates": [start_coords, end_coords],
            "instructions": True,
            "units": "mi",
        }
        res = requests.post(url, json=body, headers=headers, timeout=15)
        if res.status_code == 200:
            data = res.json()
            route = data['routes'][0]
            distance_miles = route['summary']['distance']
            duration_hours = route['summary']['duration'] / 3600
            steps = []
            for segment in route['segments']:
                for step in segment['steps']:
                    steps.append({
                        'instruction': step['instruction'],
                        'distance': round(step['distance'] * 0.000621371, 2),
                        'duration': round(step['duration'] / 60, 1),
                        'name': step.get('name', ''),
                    })
            geometry = route['geometry']
            return {
                'distance_miles': round(distance_miles, 1),
                'duration_hours': round(duration_hours, 2),
                'steps': steps[:20],
                'geometry': geometry,
            }
    except Exception as e:
        print(f"ORS error: {e}")
    return None

def generate_eld_logs(current_location, pickup_location, dropoff_location, cycle_used, to_pickup_miles, to_dropoff_miles):
    DRIVING_SPEED = 55
    MAX_DRIVING_HOURS = 11
    MAX_WINDOW_HOURS = 14
    BREAK_AFTER_HOURS = 8
    BREAK_DURATION = 0.5
    OFF_DUTY_HOURS = 10
    FUEL_EVERY_MILES = 1000
    FUEL_STOP_DURATION = 0.5
    PICKUP_DROPOFF_DURATION = 1.0

    total_miles = to_pickup_miles + to_dropoff_miles
    logs = []
    day = 1
    current_hour = 0
    hours_driven_today = 0
    hours_on_duty_today = 0
    miles_since_fuel = 0
    total_cycle_hours = cycle_used
    phase = 'to_pickup'
    miles_to_pickup = to_pickup_miles
    miles_to_dropoff = to_dropoff_miles

    while phase != 'done':
        day_schedule = {
            'day': day,
            'activities': [],
            'total_driving_hours': 0,
            'total_on_duty_hours': 0,
            'total_off_duty_hours': 0,
            'total_sleeper_hours': 0,
            'miles_driven': 0,
        }

        window_start = current_hour
        driving_this_shift = 0
        on_duty_this_shift = 0
        hours_since_break = 0
        miles_this_day = 0

        # Pre-trip inspection
        pre_trip = 0.5
        day_schedule['activities'].append({
            'type': 'on_duty',
            'start': current_hour,
            'end': current_hour + pre_trip,
            'label': 'Pre-trip Inspection',
            'location': current_location if day == 1 else 'En Route',
        })
        current_hour += pre_trip
        on_duty_this_shift += pre_trip
        hours_on_duty_today += pre_trip

        while phase != 'done':
            # 70 hour cycle limit
            if total_cycle_hours >= 70:
                day_schedule['activities'].append({
                    'type': 'off_duty',
                    'start': current_hour,
                    'end': current_hour + 34,
                    'label': '34-Hour Restart',
                    'location': 'Rest Area',
                })
                total_cycle_hours = 0
                current_hour += 34
                break

            # 14 hour window
            if (current_hour - window_start) >= MAX_WINDOW_HOURS:
                break

            # Max driving reached
            if driving_this_shift >= MAX_DRIVING_HOURS:
                break

            # 30 min break after 8 hours driving
            if hours_since_break >= BREAK_AFTER_HOURS:
                day_schedule['activities'].append({
                    'type': 'off_duty',
                    'start': current_hour,
                    'end': current_hour + BREAK_DURATION,
                    'label': '30-Min Rest Break',
                    'location': 'Rest Area',
                })
                current_hour += BREAK_DURATION
                on_duty_this_shift += BREAK_DURATION
                hours_since_break = 0
                continue

            # Pickup
            if phase == 'to_pickup' and miles_to_pickup <= 0:
                phase = 'pickup'

            if phase == 'pickup':
                day_schedule['activities'].append({
                    'type': 'on_duty',
                    'start': current_hour,
                    'end': current_hour + PICKUP_DROPOFF_DURATION,
                    'label': 'Pickup Stop',
                    'location': pickup_location,
                })
                current_hour += PICKUP_DROPOFF_DURATION
                on_duty_this_shift += PICKUP_DROPOFF_DURATION
                hours_on_duty_today += PICKUP_DROPOFF_DURATION
                total_cycle_hours += PICKUP_DROPOFF_DURATION
                phase = 'to_dropoff'
                continue

            # Dropoff
            if phase == 'to_dropoff' and miles_to_dropoff <= 0:
                phase = 'dropoff'

            if phase == 'dropoff':
                day_schedule['activities'].append({
                    'type': 'on_duty',
                    'start': current_hour,
                    'end': current_hour + PICKUP_DROPOFF_DURATION,
                    'label': 'Dropoff Stop',
                    'location': dropoff_location,
                })
                current_hour += PICKUP_DROPOFF_DURATION
                on_duty_this_shift += PICKUP_DROPOFF_DURATION
                hours_on_duty_today += PICKUP_DROPOFF_DURATION
                total_cycle_hours += PICKUP_DROPOFF_DURATION
                phase = 'done'
                break

            # Fuel stop
            if miles_since_fuel >= FUEL_EVERY_MILES:
                day_schedule['activities'].append({
                    'type': 'on_duty',
                    'start': current_hour,
                    'end': current_hour + FUEL_STOP_DURATION,
                    'label': 'Fuel Stop',
                    'location': 'Truck Stop',
                })
                current_hour += FUEL_STOP_DURATION
                on_duty_this_shift += FUEL_STOP_DURATION
                hours_on_duty_today += FUEL_STOP_DURATION
                total_cycle_hours += FUEL_STOP_DURATION
                miles_since_fuel = 0
                continue

            # Calculate available driving time
            available_driving = min(
                MAX_DRIVING_HOURS - driving_this_shift,
                MAX_WINDOW_HOURS - (current_hour - window_start),
                BREAK_AFTER_HOURS - hours_since_break,
                70 - total_cycle_hours
            )

            if available_driving <= 0:
                break

            # Drive
            if phase == 'to_pickup':
                miles_can_drive = available_driving * DRIVING_SPEED
                if miles_can_drive >= miles_to_pickup:
                    drive_hours = miles_to_pickup / DRIVING_SPEED
                    miles_driven = miles_to_pickup
                    miles_to_pickup = 0
                else:
                    drive_hours = available_driving
                    miles_driven = miles_can_drive
                    miles_to_pickup -= miles_driven
            elif phase == 'to_dropoff':
                miles_can_drive = available_driving * DRIVING_SPEED
                if miles_can_drive >= miles_to_dropoff:
                    drive_hours = miles_to_dropoff / DRIVING_SPEED
                    miles_driven = miles_to_dropoff
                    miles_to_dropoff = 0
                else:
                    drive_hours = available_driving
                    miles_driven = miles_can_drive
                    miles_to_dropoff -= miles_driven
            else:
                break

            if drive_hours <= 0:
                break

            day_schedule['activities'].append({
                'type': 'driving',
                'start': current_hour,
                'end': current_hour + drive_hours,
                'label': f'Driving ({round(miles_driven)} miles)',
                'location': 'En Route',
            })

            current_hour += drive_hours
            driving_this_shift += drive_hours
            hours_since_break += drive_hours
            on_duty_this_shift += drive_hours
            hours_driven_today += drive_hours
            hours_on_duty_today += drive_hours
            total_cycle_hours += drive_hours
            miles_since_fuel += miles_driven
            miles_this_day += miles_driven

        # End of shift
        if phase != 'done':
            day_schedule['activities'].append({
                'type': 'on_duty',
                'start': current_hour,
                'end': current_hour + 0.5,
                'label': 'Post-trip Inspection',
                'location': 'En Route',
            })
            current_hour += 0.5
            on_duty_this_shift += 0.5

            off_start = current_hour
            off_end = math.ceil(current_hour) + OFF_DUTY_HOURS
            day_schedule['activities'].append({
                'type': 'sleeper',
                'start': off_start,
                'end': off_end,
                'label': 'Sleeper Berth',
                'location': 'Truck Stop / Rest Area',
            })
            current_hour = off_end % 24
            day += 1

        # Totals
        driving_total = sum(a['end'] - a['start'] for a in day_schedule['activities'] if a['type'] == 'driving')
        on_duty_total = sum(a['end'] - a['start'] for a in day_schedule['activities'] if a['type'] == 'on_duty')
        off_duty_total = sum(a['end'] - a['start'] for a in day_schedule['activities'] if a['type'] == 'off_duty')
        sleeper_total = sum(a['end'] - a['start'] for a in day_schedule['activities'] if a['type'] == 'sleeper')

        day_schedule['total_driving_hours'] = round(driving_total, 2)
        day_schedule['total_on_duty_hours'] = round(on_duty_total, 2)
        day_schedule['total_off_duty_hours'] = round(off_duty_total, 2)
        day_schedule['total_sleeper_hours'] = round(sleeper_total, 2)
        day_schedule['miles_driven'] = round(miles_this_day, 1)

        logs.append(day_schedule)

        if day > 10:
            break

    return logs


@api_view(['POST'])
def calculate_trip(request):
    try:
        data = request.data
        current_location = data.get('current_location', '')
        pickup_location = data.get('pickup_location', '')
        dropoff_location = data.get('dropoff_location', '')
        cycle_used = float(data.get('current_cycle_used', 0))

        if not all([current_location, pickup_location, dropoff_location]):
            return Response(
                {'error': 'All locations are required'},
                status=status.HTTP_400_BAD_REQUEST
            )

        # Geocode all locations
        current_coords = geocode_location(current_location)
        pickup_coords = geocode_location(pickup_location)
        dropoff_coords = geocode_location(dropoff_location)

        # Get real routes
        to_pickup_route = None
        to_dropoff_route = None
        to_pickup_miles = 150
        to_dropoff_miles = 800

        if current_coords and pickup_coords:
            to_pickup_route = get_route(current_coords, pickup_coords)
            if to_pickup_route:
                to_pickup_miles = to_pickup_route['distance_miles']

        if pickup_coords and dropoff_coords:
            to_dropoff_route = get_route(pickup_coords, dropoff_coords)
            if to_dropoff_route:
                to_dropoff_miles = to_dropoff_route['distance_miles']

        total_miles = to_pickup_miles + to_dropoff_miles

        # Route instructions
        route_instructions = []
        if to_pickup_route and to_pickup_route.get('steps'):
            route_instructions.append({
                'segment': f'{current_location} → {pickup_location}',
                'distance': f'{to_pickup_miles} miles',
                'duration': f'{to_pickup_route["duration_hours"]} hrs',
                'steps': to_pickup_route['steps'][:10],
            })
        if to_dropoff_route and to_dropoff_route.get('steps'):
            route_instructions.append({
                'segment': f'{pickup_location} → {dropoff_location}',
                'distance': f'{to_dropoff_miles} miles',
                'duration': f'{to_dropoff_route["duration_hours"]} hrs',
                'steps': to_dropoff_route['steps'][:10],
            })

        # Generate ELD logs
        logs = generate_eld_logs(
            current_location,
            pickup_location,
            dropoff_location,
            cycle_used,
            to_pickup_miles,
            to_dropoff_miles,
        )

        # Save to database
        trip = Trip.objects.create(
            current_location=current_location,
            pickup_location=pickup_location,
            dropoff_location=dropoff_location,
            current_cycle_used=cycle_used,
        )

        for log in logs:
            TripLog.objects.create(
                trip=trip,
                day_number=log['day'],
                log_data=log,
            )

        return Response({
            'trip_id': trip.id,
            'logs': logs,
            'total_days': len(logs),
            'route': {
                'current_location': current_location,
                'pickup_location': pickup_location,
                'dropoff_location': dropoff_location,
                'total_miles': round(total_miles, 1),
                'to_pickup_miles': round(to_pickup_miles, 1),
                'to_dropoff_miles': round(to_dropoff_miles, 1),
                'estimated_distance': f'{round(total_miles, 1)} miles',
                'current_coords': current_coords,
                'pickup_coords': pickup_coords,
                'dropoff_coords': dropoff_coords,
                'route_instructions': route_instructions,
            }
        })

    except Exception as e:
        return Response(
            {'error': str(e)},
            status=status.HTTP_500_INTERNAL_SERVER_ERROR
        )


@api_view(['GET'])
def get_trip(request, trip_id):
    try:
        trip = Trip.objects.get(id=trip_id)
        logs = TripLog.objects.filter(trip=trip).order_by('day_number')
        return Response({
            'trip_id': trip.id,
            'current_location': trip.current_location,
            'pickup_location': trip.pickup_location,
            'dropoff_location': trip.dropoff_location,
            'current_cycle_used': trip.current_cycle_used,
            'logs': [log.log_data for log in logs],
            'total_days': logs.count(),
        })
    except Trip.DoesNotExist:
        return Response(
            {'error': 'Trip not found'},
            status=status.HTTP_404_NOT_FOUND
        )


@api_view(['GET'])
def get_all_trips(request):
    trips = Trip.objects.all().order_by('-created_at')[:10]
    return Response({
        'trips': [
            {
                'trip_id': t.id,
                'current_location': t.current_location,
                'pickup_location': t.pickup_location,
                'dropoff_location': t.dropoff_location,
                'current_cycle_used': t.current_cycle_used,
                'created_at': t.created_at,
            }
            for t in trips
        ]
    })