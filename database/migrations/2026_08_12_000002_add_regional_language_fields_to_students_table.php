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
                'first_name_mr', 'last_name_mr', 'religion_mr', 'caste_mr',
                'city_mr', 'state_mr', 'father_name_mr', 'father_occupation_mr',
                'mother_name_mr', 'mother_occupation_mr', 'previous_school_mr',
                'transport_pickup_point_mr',
            ];

            foreach ($stringColumns as $column) {
                if (! Schema::hasColumn('students', $column)) {
                    $table->string($column)->nullable();
                }
            }

            $textColumns = ['address_mr', 'transport_route_details_mr', 'notes_mr'];

            foreach ($textColumns as $column) {
                if (! Schema::hasColumn('students', $column)) {
                    $table->text($column)->nullable();
                }
            }
        });
    }

    public function down(): void
    {
        // Intentionally no-op; guarded add keeps existing deployments safe.
    }
};