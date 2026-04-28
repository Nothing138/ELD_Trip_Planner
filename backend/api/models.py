from django.db import models

class Trip(models.Model):
    current_location = models.CharField(max_length=255)
    pickup_location = models.CharField(max_length=255)
    dropoff_location = models.CharField(max_length=255)
    current_cycle_used = models.FloatField()
    driver_name = models.CharField(max_length=255, blank=True, default='')
    trip_date   = models.DateField(null=True, blank=True)

    created_at = models.DateTimeField(auto_now_add=True)

    def __str__(self):
        return f"Trip #{self.id} — {self.driver_name or 'Unknown Driver'} ({self.current_location} → {self.dropoff_location})"

class TripLog(models.Model):
    trip = models.ForeignKey(Trip, on_delete=models.CASCADE, related_name='logs')
    day_number = models.IntegerField()
    log_data = models.JSONField()
    created_at = models.DateTimeField(auto_now_add=True)

    def __str__(self):
        return f"Trip {self.trip.id} - Day {self.day_number}"