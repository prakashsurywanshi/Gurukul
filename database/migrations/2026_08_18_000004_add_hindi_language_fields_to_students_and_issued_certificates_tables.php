<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        Schema::table('students', function (Blueprint $table) {
            $stringColumns = [
                'first_name_hi', 'last_name_hi', 'religion_hi', 'caste_hi',
                'city_hi', 'state_hi', 'father_name_hi', 'father_occupation_hi',
                'mother_name_hi', 'mother_occupation_hi', 'previous_school_hi',
                'transport_pickup_point_hi',
            ];

            foreach ($stringColumns as $column) {
                if (! Schema::hasColumn('students', $column)) {
                    $table->string($column, 100)->nullable();
                }
            }

            $textColumns = ['address_hi', 'transport_route_details_hi', 'notes_hi'];

            foreach ($textColumns as $column) {
                if (! Schema::hasColumn('students', $column)) {
                    $table->text($column)->nullable();
                }
            }
        });

        Schema::table('issued_certificates', function (Blueprint $table) {
            $stringColumns = ['student_name_hi', 'class_hi', 'section_hi'];

            foreach ($stringColumns as $column) {
                if (! Schema::hasColumn('issued_certificates', $column)) {
                    $table->string($column)->nullable();
                }
            }

            if (! Schema::hasColumn('issued_certificates', 'reason_hi')) {
                $table->text('reason_hi')->nullable();
            }
        });
    }

    public function down(): void
    {
        // Intentionally no-op; guarded add keeps existing deployments safe.
    }
};