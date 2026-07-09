<?php

namespace Database\Seeders;

use App\Models\Organization;
use App\Models\SchoolClass;
use App\Models\Student;
use App\Models\User;
use Illuminate\Database\Seeder;
use Illuminate\Support\Facades\Schema;
use Illuminate\Support\Str;

class StudentSeeder extends Seeder
{
    /**
     * Seed the application's student records.
     */
    public function run(): void
    {
        $studentTableColumns = Schema::getColumnListing('students');

        $organization = Organization::query()->firstOrCreate(
            ['email' => 'admin@gurukul.com'],
            [
                'name' => 'Gurukul Public School',
                'slug' => 'gurukul-public-school',
                'phone' => '9876543210',
                'address' => '12 Knowledge Park',
                'city' => 'Lucknow',
                'state' => 'Uttar Pradesh',
                'country' => 'India',
                'pincode' => '226010',
                'website' => 'https://gurukul.example.com',
                'type' => 'school',
                'status' => 'active',
                'subscription_plan' => 'basic',
                'max_students' => 1000,
                'max_staff' => 100,
                'settings' => [
                    'academic_year_start' => '2025-04-01',
                    'currency' => 'INR',
                    'timezone' => 'Asia/Kolkata',
                ],
            ]
        );

        User::query()
            ->where('email', 'admin@gurukul.com')
            ->update(['organization_id' => $organization->id]);

        $students = [
            ['A001', 'Aarav', 'Sharma', '10', 'A', '101', 'male'],
            ['A002', 'Diya', 'Verma', '10', 'A', '102', 'female'],
            ['A003', 'Vivaan', 'Singh', '9', 'B', '27', 'male'],
            ['A004', 'Anaya', 'Gupta', '8', 'A', '15', 'female'],
            ['A005', 'Advik', 'Yadav', '7', 'C', '8', 'male'],
            ['A006', 'Myra', 'Patel', '6', 'B', '18', 'female'],
            ['A007', 'Krish', 'Mishra', '5', 'A', '11', 'male'],
            ['A008', 'Sara', 'Khan', '4', 'B', '21', 'female'],
            ['A009', 'Reyansh', 'Joshi', '3', 'A', '9', 'male'],
            ['A010', 'Kiara', 'Mehta', '2', 'C', '4', 'female'],
            ['A011', 'Arjun', 'Nair', '11', 'Science', '12', 'male'],
            ['A012', 'Siya', 'Rao', '12', 'Commerce', '6', 'female'],
        ];

        foreach ($students as [$admissionNo, $firstName, $lastName, $className, $section, $rollNumber, $gender]) {
            $email = Str::lower($firstName . '.' . $lastName . '@students.gurukul.com');
            $schoolClass = SchoolClass::query()->firstOrCreate(
                [
                    'organization_id' => $organization->id,
                    'name' => $className,
                    'section' => $section,
                ],
                [
                    'academic_year_id' => null,
                    'status' => 'active',
                ]
            );

            $studentAttributes = [
                'organization_id' => $organization->id,
                'class_id' => $schoolClass->id,
                'roll_number' => $rollNumber,
                'first_name' => $firstName,
                'last_name' => $lastName,
                'date_of_birth' => fake()->dateTimeBetween('-18 years', '-6 years')->format('Y-m-d'),
                'gender' => $gender,
                'blood_group' => fake()->randomElement(['A+', 'B+', 'O+', 'AB+']),
                'nationality' => 'Indian',
                'religion' => fake()->randomElement(['Hindu', 'Muslim', 'Sikh', 'Christian']),
                'caste' => fake()->randomElement(['General', 'OBC', 'SC', 'ST']),
                'category' => fake()->randomElement(['General', 'OBC', 'SC', 'ST']),
                'mother_tongue' => fake()->randomElement(['Hindi', 'English']),
                'email' => $email,
                'phone' => '98' . fake()->numerify('########'),
                'current_address' => fake()->streetAddress(),
                'permanent_address' => fake()->streetAddress(),
                'city' => 'Lucknow',
                'state' => 'Uttar Pradesh',
                'pincode' => fake()->numerify('2260##'),
                'father_name' => fake()->name('male'),
                'father_phone' => '97' . fake()->numerify('########'),
                'father_email' => fake()->safeEmail(),
                'father_occupation' => fake()->jobTitle(),
                'father_income' => fake()->numberBetween(250000, 900000),
                'mother_name' => fake()->name('female'),
                'mother_phone' => '96' . fake()->numerify('########'),
                'mother_email' => fake()->safeEmail(),
                'mother_occupation' => fake()->jobTitle(),
                'mother_income' => fake()->numberBetween(180000, 700000),
                'guardian_name' => fake()->name(),
                'guardian_phone' => '95' . fake()->numerify('########'),
                'guardian_email' => fake()->safeEmail(),
                'guardian_relation' => fake()->randomElement(['Father', 'Mother', 'Uncle', 'Aunt']),
                'admission_date' => fake()->dateTimeBetween('-4 years', 'now')->format('Y-m-d'),
                'previous_school' => fake()->company() . ' School',
                'previous_class' => (string) max(1, ((int) preg_replace('/\D/', '', $className)) - 1),
                'previous_percentage' => fake()->randomFloat(2, 60, 95),
                'medical_conditions' => fake()->boolean(15) ? 'Seasonal allergies' : null,
                'allergies' => fake()->boolean(20) ? 'Dust' : null,
                'emergency_contact_name' => fake()->name(),
                'emergency_contact_phone' => '94' . fake()->numerify('########'),
                'emergency_contact_relation' => fake()->randomElement(['Father', 'Mother', 'Guardian']),
                'transport_required' => fake()->boolean(40),
                'transport_pickup_point' => fake()->boolean(40) ? fake()->streetName() . ' Stop' : null,
                'transport_vehicle' => fake()->boolean(40) ? 'Bus ' . fake()->numberBetween(1, 20) : null,
                'transport_route' => fake()->boolean(40) ? 'Route ' . fake()->randomElement(['A', 'B', 'C']) : null,
                'transport_route_details' => fake()->boolean(40) ? 'Route ' . fake()->randomElement(['A', 'B', 'C']) . ' via ' . fake()->streetName() : null,
                'hostel_required' => fake()->boolean(10),
                'hostel_room' => fake()->boolean(10) ? 'H-' . fake()->numerify('##') : null,
                'status' => 'active',
                'notes' => 'Seeded demo student for development and testing.',
            ];

            Student::query()->updateOrCreate(
                ['admission_no' => $admissionNo],
                array_intersect_key($studentAttributes, array_flip($studentTableColumns))
            );
        }
    }
}
