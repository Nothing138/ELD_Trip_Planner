from rest_framework.decorators import api_view
from rest_framework.response import Response
from rest_framework import status
from .models import Trip, TripLog
import requests
import math

ORS_API_KEY = "eyJvcmciOiI1YjNjZTM1OTc4NTExMTAwMDFjZjYyNDgiLCJpZCI6IjZmZDkwZjMyYjM4MTQ1MWQ5MjJjNGNkM2JlZDQ2MDZmIiwiaCI6Im11cm11cjY0In0="


def geocode_location(location_str):
    try:
        url = "https://nominatim.openstreetmap.org/search"
        params = {'q': location_str, 'format': 'json', 'limit': 1}
        headers = {'User-Agent': 'ELDTripPlanner/1.0'}
        res = requests.get(url, params=params, headers=headers, timeout=10)
        data = res.json()
        if data:
            return float(data[0]['lon']), float(data[0]['lat'])
    except Exception as e:
        print(f"Geocoding error: {e}")
    return None


def get_route(start_coords, end_coords):
    try:
        url = "https://api.openrouteservice.org/v2/directions/driving-car"
        headers = {
            'Authorization': ORS_API_KEY,
            'Content-Type': 'application/json',
        }
        body = {
            "coordinates": [list(start_coords), list(end_coords)],
            "instructions": True,
            "units": "mi",
        }
        res = requests.post(url, json=body, headers=headers, timeout=15)
        print(f"ORS Status: {res.status_code}")
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
            return {
                'distance_miles': round(distance_miles, 1),
                'duration_hours': round(duration_hours, 2),
                'steps': steps[:20],
            }
        else:
            print(f"ORS Error: {res.status_code} - {res.text}")
    except Exception as e:
        print(f"ORS error: {e}")
    return None


def generate_eld_logs(current_location, pickup_location, dropoff_location,
                      cycle_used, to_pickup_miles, to_dropoff_miles):
    DRIVING_SPEED = 55
    MAX_DRIVING_HOURS = 11
    MAX_WINDOW_HOURS = 14
    BREAK_AFTER_HOURS = 8
    BREAK_DURATION = 0.5
    OFF_DUTY_HOURS = 10
    FUEL_EVERY_MILES = 1000
    FUEL_STOP_DURATION = 0.5
    PICKUP_DROPOFF_DURATION = 1.0

    logs = []
    day = 1
    current_hour = 0
    miles_since_fuel = 0
    total_cycle_hours = cycle_used
    phase = 'to_pickup'
    miles_to_pickup = to_pickup_miles
    miles_to_dropoff = to_dropoff_miles

    while phase != 'done' and day <= 10:
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
        hours_since_break = 0
        miles_this_day = 0

        # Pre-trip inspection
        day_schedule['activities'].append({
            'type': 'on_duty',
            'start': round(current_hour, 4),
            'end': round(current_hour + 0.5, 4),
            'label': 'Pre-trip Inspection',
            'location': current_location if day == 1 else 'En Route',
        })
        current_hour += 0.5

        while phase != 'done':
            if total_cycle_hours >= 70:
                day_schedule['activities'].append({
                    'type': 'off_duty',
                    'start': round(current_hour, 4),
                    'end': round(current_hour + 34, 4),
                    'label': '34-Hour Restart',
                    'location': 'Rest Area',
                })
                total_cycle_hours = 0
                current_hour += 34
                break

            if (current_hour - window_start) >= MAX_WINDOW_HOURS:
                break

            if driving_this_shift >= MAX_DRIVING_HOURS:
                break

            if hours_since_break >= BREAK_AFTER_HOURS:
                day_schedule['activities'].append({
                    'type': 'off_duty',
                    'start': round(current_hour, 4),
                    'end': round(current_hour + BREAK_DURATION, 4),
                    'label': '30-Min Rest Break',
                    'location': 'Rest Area',
                })
                current_hour += BREAK_DURATION
                total_cycle_hours += BREAK_DURATION
                hours_since_break = 0
                continue

            if phase == 'to_pickup' and miles_to_pickup <= 0:
                phase = 'pickup'

            if phase == 'pickup':
                day_schedule['activities'].append({
                    'type': 'on_duty',
                    'start': round(current_hour, 4),
                    'end': round(current_hour + PICKUP_DROPOFF_DURATION, 4),
                    'label': 'Pickup Stop',
                    'location': pickup_location,
                })
                current_hour += PICKUP_DROPOFF_DURATION
                total_cycle_hours += PICKUP_DROPOFF_DURATION
                phase = 'to_dropoff'
                continue

            if phase == 'to_dropoff' and miles_to_dropoff <= 0:
                phase = 'dropoff'

            if phase == 'dropoff':
                day_schedule['activities'].append({
                    'type': 'on_duty',
                    'start': round(current_hour, 4),
                    'end': round(current_hour + PICKUP_DROPOFF_DURATION, 4),
                    'label': 'Dropoff Stop',
                    'location': dropoff_location,
                })
                current_hour += PICKUP_DROPOFF_DURATION
                total_cycle_hours += PICKUP_DROPOFF_DURATION
                phase = 'done'
                break

            if miles_since_fuel >= FUEL_EVERY_MILES:
                day_schedule['activities'].append({
                    'type': 'on_duty',
                    'start': round(current_hour, 4),
                    'end': round(current_hour + FUEL_STOP_DURATION, 4),
                    'label': 'Fuel Stop',
                    'location': 'Truck Stop',
                })
                current_hour += FUEL_STOP_DURATION
                total_cycle_hours += FUEL_STOP_DURATION
                miles_since_fuel = 0
                continue

            available_driving = min(
                MAX_DRIVING_HOURS - driving_this_shift,
                MAX_WINDOW_HOURS - (current_hour - window_start),
                BREAK_AFTER_HOURS - hours_since_break,
                70 - total_cycle_hours,
            )

            if available_driving <= 0:
                break

            if phase == 'to_pickup':
                miles_can_drive = available_driving * DRIVING_SPEED
                if miles_can_drive >= miles_to_pickup:
                    drive_hours = miles_to_pickup / DRIVING_SPEED
                    miles_driven = miles_to_pickup
                    miles_to_pickup = 0
                else:
                    drive_hours = available_driving
                    miles_driven = drive_hours * DRIVING_SPEED
                    miles_to_pickup -= miles_driven
            else:
                miles_can_drive = available_driving * DRIVING_SPEED
                if miles_can_drive >= miles_to_dropoff:
                    drive_hours = miles_to_dropoff / DRIVING_SPEED
                    miles_driven = miles_to_dropoff
                    miles_to_dropoff = 0
                else:
                    drive_hours = available_driving
                    miles_driven = drive_hours * DRIVING_SPEED
                    miles_to_dropoff -= miles_driven

            if drive_hours <= 0:
                break

            day_schedule['activities'].append({
                'type': 'driving',
                'start': round(current_hour, 4),
                'end': round(current_hour + drive_hours, 4),
                'label': f'Driving ({round(miles_driven, 1)} mi)',
                'location': 'En Route',
            })

            current_hour += drive_hours
            driving_this_shift += drive_hours
            hours_since_break += drive_hours
            total_cycle_hours += drive_hours
            miles_since_fuel += miles_driven
            miles_this_day += miles_driven

        # End of shift
        if phase != 'done':
            day_schedule['activities'].append({
                'type': 'on_duty',
                'start': round(current_hour, 4),
                'end': round(current_hour + 0.5, 4),
                'label': 'Post-trip Inspection',
                'location': 'En Route',
            })
            current_hour += 0.5

            off_start = current_hour
            off_end = math.ceil(current_hour) + OFF_DUTY_HOURS
            day_schedule['activities'].append({
                'type': 'sleeper',
                'start': round(off_start, 4),
                'end': round(off_end, 4),
                'label': 'Sleeper Berth',
                'location': 'Truck Stop / Rest Area',
            })
            current_hour = off_end % 24
            day += 1

        # Calculate totals
        driving_total  = sum(a['end'] - a['start'] for a in day_schedule['activities'] if a['type'] == 'driving')
        on_duty_total  = sum(a['end'] - a['start'] for a in day_schedule['activities'] if a['type'] == 'on_duty')
        off_duty_total = sum(a['end'] - a['start'] for a in day_schedule['activities'] if a['type'] == 'off_duty')
        sleeper_total  = sum(a['end'] - a['start'] for a in day_schedule['activities'] if a['type'] == 'sleeper')

        day_schedule['total_driving_hours']  = round(driving_total, 2)
        day_schedule['total_on_duty_hours']  = round(on_duty_total, 2)
        day_schedule['total_off_duty_hours'] = round(off_duty_total, 2)
        day_schedule['total_sleeper_hours']  = round(sleeper_total, 2)
        day_schedule['miles_driven']         = round(miles_this_day, 1)

        logs.append(day_schedule)

    return logs


@api_view(['POST'])
def calculate_trip(request):
    try:
        data = request.data
        current_location  = data.get('current_location', '')
        pickup_location   = data.get('pickup_location', '')
        dropoff_location  = data.get('dropoff_location', '')
        cycle_used        = float(data.get('current_cycle_used', 0))
        driver_name       = data.get('driver_name', '').strip()
        trip_date         = data.get('trip_date', None)

        if not all([current_location, pickup_location, dropoff_location]):
            return Response({'error': 'All locations are required'}, status=status.HTTP_400_BAD_REQUEST)

        # Geocode
        current_coords = geocode_location(current_location)
        pickup_coords  = geocode_location(pickup_location)
        dropoff_coords = geocode_location(dropoff_location)

        print(f"Coords — Current: {current_coords}, Pickup: {pickup_coords}, Dropoff: {dropoff_coords}")

        # Real routes
        to_pickup_miles  = 150
        to_dropoff_miles = 800
        to_pickup_route  = None
        to_dropoff_route = None
        using_real_distance = False

        if current_coords and pickup_coords:
            to_pickup_route = get_route(current_coords, pickup_coords)
            if to_pickup_route:
                to_pickup_miles = to_pickup_route['distance_miles']
                using_real_distance = True
                print(f"To pickup: {to_pickup_miles} miles")

        if pickup_coords and dropoff_coords:
            to_dropoff_route = get_route(pickup_coords, dropoff_coords)
            if to_dropoff_route:
                to_dropoff_miles = to_dropoff_route['distance_miles']
                print(f"To dropoff: {to_dropoff_miles} miles")

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
            current_location, pickup_location, dropoff_location,
            cycle_used, to_pickup_miles, to_dropoff_miles,
        )

        # Save to database  ← now includes driver_name + trip_date
        trip_kwargs = dict(
            current_location=current_location,
            pickup_location=pickup_location,
            dropoff_location=dropoff_location,
            current_cycle_used=cycle_used,
        )
        if driver_name:
            trip_kwargs['driver_name'] = driver_name
        if trip_date:
            trip_kwargs['trip_date'] = trip_date

        trip = Trip.objects.create(**trip_kwargs)
        for log in logs:
            TripLog.objects.create(trip=trip, day_number=log['day'], log_data=log)

        return Response({
            'trip_id':              trip.id,
            'driver_name':          driver_name,
            'trip_date':            trip_date,
            'logs':                 logs,
            'total_days':           len(logs),
            'using_real_distance':  using_real_distance,
            'route': {
                'current_location':  current_location,
                'pickup_location':   pickup_location,
                'dropoff_location':  dropoff_location,
                'total_miles':       round(total_miles, 1),
                'to_pickup_miles':   round(to_pickup_miles, 1),
                'to_dropoff_miles':  round(to_dropoff_miles, 1),
                'estimated_distance': f'{round(total_miles, 1)} miles',
                'current_coords':    current_coords,
                'pickup_coords':     pickup_coords,
                'dropoff_coords':    dropoff_coords,
                'route_instructions': route_instructions,
            }
        })

    except Exception as e:
        import traceback
        print(traceback.format_exc())
        return Response({'error': str(e)}, status=status.HTTP_500_INTERNAL_SERVER_ERROR)


@api_view(['GET'])
def get_trip(request, trip_id):
    try:
        trip = Trip.objects.get(id=trip_id)
        logs = TripLog.objects.filter(trip=trip).order_by('day_number')
        current_coords = geocode_location(trip.current_location)
        pickup_coords  = geocode_location(trip.pickup_location)
        dropoff_coords = geocode_location(trip.dropoff_location)

        # Get to_pickup and to_dropoff miles from first & last logs if available
        log_list = [log.log_data for log in logs]
        total_miles = sum(l.get('miles_driven', 0) for l in log_list)

        return Response({
            'trip_id':         trip.id,
            'driver_name':     getattr(trip, 'driver_name', ''),
            'trip_date':       str(getattr(trip, 'trip_date', '') or ''),
            'current_location':  trip.current_location,
            'pickup_location':   trip.pickup_location,
            'dropoff_location':  trip.dropoff_location,
            'current_cycle_used': trip.current_cycle_used,
            'logs':            log_list,
            'total_days':      logs.count(),
            'route': {
                'current_location':  trip.current_location,
                'pickup_location':   trip.pickup_location,
                'dropoff_location':  trip.dropoff_location,
                'current_coords':    current_coords,
                'pickup_coords':     pickup_coords,
                'dropoff_coords':    dropoff_coords,
                'estimated_distance': f'{round(total_miles, 1)} miles' if total_miles else 'N/A',
                'to_pickup_miles':   0,
                'to_dropoff_miles':  0,
                'route_instructions': [],
            }
        })
    except Trip.DoesNotExist:
        return Response({'error': 'Trip not found'}, status=status.HTTP_404_NOT_FOUND)


@api_view(['GET'])
def get_all_trips(request):
    trips = Trip.objects.all().order_by('-created_at')[:20]
    return Response({
        'trips': [
            {
                'trip_id':         t.id,
                'driver_name':     getattr(t, 'driver_name', ''),
                'trip_date':       str(getattr(t, 'trip_date', '') or ''),
                'current_location':  t.current_location,
                'pickup_location':   t.pickup_location,
                'dropoff_location':  t.dropoff_location,
                'current_cycle_used': t.current_cycle_used,
                'created_at':      t.created_at,
            }
            for t in trips
        ]
    })