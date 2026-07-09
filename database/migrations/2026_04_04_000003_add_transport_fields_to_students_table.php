<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        Schema::table('students', function (Blueprint $table) {
            $table->string('transport_pickup_point')->nullable()->after('transport_required');
            $table->string('transport_vehicle')->nullable()->after('transport_pickup_point');
            $table->text('transport_route_details')->nullable()->after('transport_route');
        });
    }

    public function down(): void
    {
        Schema::table('students', function (Blueprint $table) {
            $table->dropColumn([
                'transport_pickup_point',
                'transport_vehicle',
                'transport_route_details',
            ]);
        });
    }
};
