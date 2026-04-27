from django.urls import path
from . import views

urlpatterns = [
    path('calculate-trip/', views.calculate_trip, name='calculate_trip'),
    path('trip/<int:trip_id>/', views.get_trip, name='get_trip'),
]