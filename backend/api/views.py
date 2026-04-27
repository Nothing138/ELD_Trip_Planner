from rest_framework.decorators import api_view
from rest_framework.response import Response
from rest_framework import status
from .models import Trip, TripLog
import json
import math

def calculate_route(current_location, pickup_location, dropoff_location):
    """
    Calculate route details using OpenRouteService API (free)
    For now we use estimated distances
    """
    # Estimated distances (in miles) - will be replaced with real API
    segments = {
        'to_pickup': 150,
        'to_dropoff': 800,
    }
    return segments

def generate_eld_logs(current_location, pickup_location, dropoff_location, cycle_used):
    """
    Generate ELD logs based on FMCSA HOS rules:
    - 11 hour driving limit
    - 14 hour window
    - 30 min break after 8 hours driving
    - 70 hour / 8 day limit
    - 10 hour off duty required
    - Fuel stop every 1000 miles
    - 1 hour for pickup and dropoff
    """
    
    DRIVING_SPEED = 55  # mph average
    MAX_DRIVING_HOURS = 11
    MAX_WINDOW_HOURS = 14
    BREAK_AFTER_HOURS = 8
    BREAK_DURATION = 0.5
    OFF_DUTY_HOURS = 10
    FUEL_EVERY_MILES = 1000
    FUEL_STOP_DURATION = 0.5
    PICKUP_DROPOFF_DURATION = 1.0

    # Get distances
    to_pickup_miles = 150
    to_dropoff_miles = 800
    total_miles = to_pickup_miles + to_dropoff_miles

    logs = []
    day = 1
    current_hour = 0  # start of day in hours (0 = midnight)
    hours_driven_today = 0
    hours_on_duty_today = 0
    miles_since_fuel = 0
    total_cycle_hours = cycle_used
    remaining_miles = total_miles
    phase = 'to_pickup'  # to_pickup, pickup, to_dropoff, dropoff, done
    pickup_done = False
    dropoff_done = False
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
        }

        window_start = current_hour
        driving_this_shift = 0
        on_duty_this_shift = 0
        hours_since_break = 0

        # Start of day - pre-trip inspection (on duty not driving)
        pre_trip = 0.5
        day_schedule['activities'].append({
            'type': 'on_duty',
            'start': current_hour,
            'end': current_hour + pre_trip,
            'label': 'Pre-trip Inspection',
            'location': current_location if day == 1 else 'En Route'
        })
        current_hour += pre_trip
        on_duty_this_shift += pre_trip
        hours_on_duty_today += pre_trip

        while phase != 'done':
            # Check 70 hour cycle limit
            if total_cycle_hours >= 70:
                # Must take 34 hour restart
                day_schedule['activities'].append({
                    'type': 'off_duty',
                    'start': current_hour,
                    'end': current_hour + 34,
                    'label': '34-Hour Restart',
                    'location': 'Rest Area'
                })
                total_cycle_hours = 0
                current_hour += 34
                break

            # Check if 14 hour window exceeded
            if (current_hour - window_start) >= MAX_WINDOW_HOURS:
                break

            # Check if max driving reached
            if driving_this_shift >= MAX_DRIVING_HOURS:
                break

            # Need 30 min break after 8 hours driving
            if hours_since_break >= BREAK_AFTER_HOURS:
                day_schedule['activities'].append({
                    'type': 'off_duty',
                    'start': current_hour,
                    'end': current_hour + BREAK_DURATION,
                    'label': '30-Min Rest Break',
                    'location': 'Rest Area'
                })
                current_hour += BREAK_DURATION
                on_duty_this_shift += BREAK_DURATION
                hours_since_break = 0
                continue

            # Handle pickup
            if phase == 'to_pickup' and miles_to_pickup <= 0:
                phase = 'pickup'

            if phase == 'pickup':
                day_schedule['activities'].append({
                    'type': 'on_duty',
                    'start': current_hour,
                    'end': current_hour + PICKUP_DROPOFF_DURATION,
                    'label': 'Pickup',
                    'location': pickup_location
                })
                current_hour += PICKUP_DROPOFF_DURATION
                on_duty_this_shift += PICKUP_DROPOFF_DURATION
                hours_on_duty_today += PICKUP_DROPOFF_DURATION
                total_cycle_hours += PICKUP_DROPOFF_DURATION
                phase = 'to_dropoff'
                continue

            # Handle dropoff
            if phase == 'to_dropoff' and miles_to_dropoff <= 0:
                phase = 'dropoff'

            if phase == 'dropoff':
                day_schedule['activities'].append({
                    'type': 'on_duty',
                    'start': current_hour,
                    'end': current_hour + PICKUP_DROPOFF_DURATION,
                    'label': 'Dropoff',
                    'location': dropoff_location
                })
                current_hour += PICKUP_DROPOFF_DURATION
                on_duty_this_shift += PICKUP_DROPOFF_DURATION
                hours_on_duty_today += PICKUP_DROPOFF_DURATION
                total_cycle_hours += PICKUP_DROPOFF_DURATION
                phase = 'done'
                break

            # Check fuel stop
            if miles_since_fuel >= FUEL_EVERY_MILES:
                day_schedule['activities'].append({
                    'type': 'on_duty',
                    'start': current_hour,
                    'end': current_hour + FUEL_STOP_DURATION,
                    'label': 'Fuel Stop',
                    'location': 'Truck Stop'
                })
                current_hour += FUEL_STOP_DURATION
                on_duty_this_shift += FUEL_STOP_DURATION
                hours_on_duty_today += FUEL_STOP_DURATION
                total_cycle_hours += FUEL_STOP_DURATION
                miles_since_fuel = 0
                continue

            # Drive
            available_driving = min(
                MAX_DRIVING_HOURS - driving_this_shift,
                MAX_WINDOW_HOURS - (current_hour - window_start),
                BREAK_AFTER_HOURS - hours_since_break,
                70 - total_cycle_hours
            )

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
                'location': 'En Route'
            })

            current_hour += drive_hours
            driving_this_shift += drive_hours
            hours_since_break += drive_hours
            on_duty_this_shift += drive_hours
            hours_driven_today += drive_hours
            hours_on_duty_today += drive_hours
            total_cycle_hours += drive_hours
            miles_since_fuel += miles_driven

        # End of driving window - post trip inspection
        if phase != 'done':
            day_schedule['activities'].append({
                'type': 'on_duty',
                'start': current_hour,
                'end': current_hour + 0.5,
                'label': 'Post-trip Inspection',
                'location': 'En Route'
            })
            current_hour += 0.5
            on_duty_this_shift += 0.5

            # Off duty / sleeper berth
            off_duty_start = current_hour
            off_duty_end = math.ceil(current_hour) + OFF_DUTY_HOURS
            day_schedule['activities'].append({
                'type': 'sleeper',
                'start': off_duty_start,
                'end': off_duty_end,
                'label': 'Sleeper Berth',
                'location': 'Truck Stop / Rest Area'
            })
            current_hour = off_duty_end % 24
            day += 1

        # Calculate totals
        driving_total = sum(a['end'] - a['start'] for a in day_schedule['activities'] if a['type'] == 'driving')
        on_duty_total = sum(a['end'] - a['start'] for a in day_schedule['activities'] if a['type'] == 'on_duty')
        off_duty_total = sum(a['end'] - a['start'] for a in day_schedule['activities'] if a['type'] == 'off_duty')
        sleeper_total = sum(a['end'] - a['start'] for a in day_schedule['activities'] if a['type'] == 'sleeper')

        day_schedule['total_driving_hours'] = round(driving_total, 2)
        day_schedule['total_on_duty_hours'] = round(on_duty_total, 2)
        day_schedule['total_off_duty_hours'] = round(off_duty_total, 2)
        day_schedule['total_sleeper_hours'] = round(sleeper_total, 2)

        logs.append(day_schedule)

        if day > 10:  # safety break
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

        # Generate ELD logs
        logs = generate_eld_logs(
            current_location,
            pickup_location,
            dropoff_location,
            cycle_used
        )

        # Save to database
        trip = Trip.objects.create(
            current_location=current_location,
            pickup_location=pickup_location,
            dropoff_location=dropoff_location,
            current_cycle_used=cycle_used
        )

        for log in logs:
            TripLog.objects.create(
                trip=trip,
                day_number=log['day'],
                log_data=log
            )

        return Response({
            'trip_id': trip.id,
            'logs': logs,
            'total_days': len(logs),
            'route': {
                'current_location': current_location,
                'pickup_location': pickup_location,
                'dropoff_location': dropoff_location,
                'estimated_distance': '950 miles',
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