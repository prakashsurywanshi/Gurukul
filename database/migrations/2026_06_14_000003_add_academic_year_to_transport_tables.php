<?php

use App\Models\Organization;
use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        $this->addAcademicYearColumn('transport_routes', 'organization_id');
        $this->addAcademicYearColumn('transport_vehicles', 'organization_id');
        $this->addAcademicYearColumn('student_transport', 'student_id');
        $this->addAcademicYearColumn('daily_trips');

        $this->backfillTransportSessions();
    }

    public function down(): void
    {
        $this->dropAcademicYearColumn('daily_trips');
        $this->dropAcademicYearColumn('student_transport');
        $this->dropAcademicYearColumn('transport_vehicles');
        $this->dropAcademicYearColumn('transport_routes');
    }

    private function addAcademicYearColumn(string $table, ?string $after = null): void
    {
        if (! Schema::hasTable($table) || Schema::hasColumn($table, 'academic_year_id')) {
            return;
        }

        Schema::table($table, function (Blueprint $tableBlueprint) use ($after) {
            $column = $tableBlueprint
                ->foreignId('academic_year_id')
                ->nullable()
                ->constrained('academic_years')
                ->nullOnDelete();

            if ($after) {
                $column->after($after);
            }

            $tableBlueprint->index(['academic_year_id']);
        });
    }

    private function dropAcademicYearColumn(string $table): void
    {
        if (! Schema::hasTable($table) || ! Schema::hasColumn($table, 'academic_year_id')) {
            return;
        }

        Schema::table($table, function (Blueprint $tableBlueprint) {
            $tableBlueprint->dropConstrainedForeignId('academic_year_id');
        });
    }

    private function backfillTransportSessions(): void
    {
        Organization::query()
            ->with('students:id,organization_id')
            ->get()
            ->each(function (Organization $organization) {
                $academicYearId = $organization->selectedAcademicYear()?->id;

                if (! $academicYearId) {
                    return;
                }

                DB::table('transport_routes')
                    ->where('organization_id', $organization->id)
                    ->whereNull('academic_year_id')
                    ->update(['academic_year_id' => $academicYearId]);

                DB::table('transport_vehicles')
                    ->where('organization_id', $organization->id)
                    ->whereNull('academic_year_id')
                    ->update(['academic_year_id' => $academicYearId]);

                DB::table('student_transport')
                    ->join('students', 'student_transport.student_id', '=', 'students.id')
                    ->where('students.organization_id', $organization->id)
                    ->whereNull('student_transport.academic_year_id')
                    ->update(['student_transport.academic_year_id' => $academicYearId]);

                DB::table('daily_trips')
                    ->leftJoin('transport_routes', 'daily_trips.route_id', '=', 'transport_routes.id')
                    ->leftJoin('transport_vehicles', 'daily_trips.vehicle_id', '=', 'transport_vehicles.id')
                    ->whereNull('daily_trips.academic_year_id')
                    ->where(function ($query) use ($organization) {
                        $query
                            ->where('transport_routes.organization_id', $organization->id)
                            ->orWhere('transport_vehicles.organization_id', $organization->id);
                    })
                    ->update(['daily_trips.academic_year_id' => $academicYearId]);
            });
    }
};
