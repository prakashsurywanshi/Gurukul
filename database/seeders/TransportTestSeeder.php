<?php

namespace Database\Seeders;

use Illuminate\Database\Seeder;
use App\Models\TransportRoute;
use App\Models\TransportVehicle;
use App\Models\TransportAssignment;
use App\Models\DailyTrip;
use App\Models\Student;
use App\Models\Organization;

class TransportTestSeeder extends Seeder
{
    public function run()
    {
        $orgId = Organization::first()->id ?? 1;

        $route1 = TransportRoute::first();
        $route2 = TransportRoute::skip(1)->first();
        $v1 = TransportVehicle::first();
        $v2 = TransportVehicle::skip(1)->first();

        $s1 = Student::first();
        $s2 = Student::skip(1)->first();
        
        if ($route1 && $v1) DailyTrip::create(['route_id' => $route1->id, 'vehicle_id' => $v1->id, 'shift' => 'morning', 'pickup_points' => 'Powai Lake, IIT Gate', 'current_location' => 'IIT Gate', 'destination_point' => 'North Campus', 'departure_time' => '06:55', 'expected_arrival' => '07:50', 'supervisor' => 'Anita Kulkarni', 'trip_status' => 'in_progress', 'note' => 'Traffic smooth on eastern corridor.']);
        if ($route2 && $v2) DailyTrip::create(['route_id' => $route2->id, 'vehicle_id' => $v2->id, 'shift' => 'afternoon', 'pickup_points' => 'School Campus, Tilak Nagar', 'current_location' => 'Tilak Nagar', 'destination_point' => 'Chembur Camp', 'departure_time' => '14:40', 'expected_arrival' => '15:30', 'supervisor' => 'Rohan Patil', 'trip_status' => 'scheduled', 'note' => 'Afternoon dispatch ready.']);
    }
}
