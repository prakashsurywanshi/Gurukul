<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        Schema::table('income_entries', function (Blueprint $table) {
            $table->foreignId('academic_year_id')->nullable()->after('organization_id')->constrained('academic_years')->nullOnDelete();
        });

        Schema::table('expense_entries', function (Blueprint $table) {
            $table->foreignId('academic_year_id')->nullable()->after('organization_id')->constrained('academic_years')->nullOnDelete();
        });

        $organizations = DB::table('organizations')
            ->select('id', 'settings')
            ->get();

        foreach ($organizations as $organization) {
            $settings = json_decode($organization->settings ?? '[]', true);
            $selectedSession = is_array($settings) ? ($settings['session'] ?? null) : null;

            $academicYearId = DB::table('academic_years')
                ->where('organization_id', $organization->id)
                ->when(
                    is_string($selectedSession) && $selectedSession !== '',
                    fn ($query) => $query->where('name', $selectedSession),
                    fn ($query) => $query->where('is_current', true)
                )
                ->value('id');

            if (!$academicYearId) {
                continue;
            }

            DB::table('income_entries')
                ->where('organization_id', $organization->id)
                ->whereNull('academic_year_id')
                ->update(['academic_year_id' => $academicYearId]);

            DB::table('expense_entries')
                ->where('organization_id', $organization->id)
                ->whereNull('academic_year_id')
                ->update(['academic_year_id' => $academicYearId]);
        }
    }

    public function down(): void
    {
        Schema::table('expense_entries', function (Blueprint $table) {
            $table->dropConstrainedForeignId('academic_year_id');
        });

        Schema::table('income_entries', function (Blueprint $table) {
            $table->dropConstrainedForeignId('academic_year_id');
        });
    }
};
