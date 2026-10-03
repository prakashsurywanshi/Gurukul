<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        Schema::table('admission_inquiries', function (Blueprint $table) {
            $table->foreignId('organization_id')
                ->nullable()
                ->after('id')
                ->constrained('organizations')
                ->nullOnDelete();
        });

        // Backfill: inquiries that were already enrolled know their tenant via
        // the student they produced. Anything else can only be attributed when
        // the deployment serves a single organization.
        DB::table('admission_inquiries')
            ->whereNull('organization_id')
            ->whereNotNull('enrolled_student_id')
            ->orderBy('id')
            ->chunkById(200, function ($inquiries) {
                foreach ($inquiries as $inquiry) {
                    $organizationId = DB::table('students')
                        ->where('id', $inquiry->enrolled_student_id)
                        ->value('organization_id');

                    if ($organizationId) {
                        DB::table('admission_inquiries')
                            ->where('id', $inquiry->id)
                            ->update(['organization_id' => $organizationId]);
                    }
                }
            });

        if (DB::table('organizations')->count() === 1) {
            $organizationId = DB::table('organizations')->value('id');

            DB::table('admission_inquiries')
                ->whereNull('organization_id')
                ->update(['organization_id' => $organizationId]);
        }
    }

    public function down(): void
    {
        Schema::table('admission_inquiries', function (Blueprint $table) {
            $table->dropConstrainedForeignId('organization_id');
        });
    }
};
