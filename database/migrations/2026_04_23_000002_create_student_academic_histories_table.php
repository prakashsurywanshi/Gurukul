<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        if (! Schema::hasTable('student_academic_histories')) {
            Schema::create('student_academic_histories', function (Blueprint $table) {
                $table->id();
                $table->foreignId('organization_id')->constrained()->cascadeOnDelete();
                $table->foreignId('student_id')->constrained()->cascadeOnDelete();
                $table->foreignId('academic_year_id')->nullable()->constrained()->nullOnDelete();
                $table->foreignId('class_id')->nullable()->constrained('classes')->nullOnDelete();
                $table->string('session')->nullable();
                $table->string('roll_number')->nullable();
                $table->string('status', 50)->default('active');
                $table->boolean('is_current')->default(false);
                $table->string('entry_type', 50)->default('admission');
                $table->date('effective_date')->nullable();
                $table->text('notes')->nullable();
                $table->timestamps();

                $table->unique(['student_id', 'academic_year_id'], 'student_history_unique_session');
                $table->index(['organization_id', 'academic_year_id'], 'student_hist_org_year_idx');
                $table->index(['student_id', 'is_current'], 'student_hist_current_idx');
            });
        }

        $this->ensureIndex(
            'student_academic_histories',
            'student_history_unique_session',
            'ALTER TABLE `student_academic_histories` ADD UNIQUE `student_history_unique_session` (`student_id`, `academic_year_id`)'
        );
        $this->ensureIndex(
            'student_academic_histories',
            'student_hist_org_year_idx',
            'ALTER TABLE `student_academic_histories` ADD INDEX `student_hist_org_year_idx` (`organization_id`, `academic_year_id`)'
        );
        $this->ensureIndex(
            'student_academic_histories',
            'student_hist_current_idx',
            'ALTER TABLE `student_academic_histories` ADD INDEX `student_hist_current_idx` (`student_id`, `is_current`)'
        );

        $students = DB::table('students')
            ->leftJoin('classes', 'students.class_id', '=', 'classes.id')
            ->select(
                'students.id as student_id',
                'students.organization_id',
                'students.class_id',
                'students.roll_number',
                'students.status',
                'students.admission_date',
                'classes.academic_year_id',
                'classes.name as class_name',
                'classes.section as section_name'
            )
            ->whereNull('students.deleted_at')
            ->get();

        foreach ($students as $student) {
            $sessionName = null;

            if ($student->academic_year_id) {
                $sessionName = DB::table('academic_years')
                    ->where('id', $student->academic_year_id)
                    ->value('name');
            }

            DB::table('student_academic_histories')->updateOrInsert(
                [
                    'student_id' => $student->student_id,
                    'academic_year_id' => $student->academic_year_id,
                ],
                [
                    'organization_id' => $student->organization_id,
                    'class_id' => $student->class_id,
                    'session' => $sessionName,
                    'roll_number' => $student->roll_number,
                    'status' => $student->status ?: 'active',
                    'is_current' => true,
                    'entry_type' => 'migration',
                    'effective_date' => $student->admission_date,
                    'notes' => 'Backfilled from existing student current class assignment.',
                    'created_at' => now(),
                    'updated_at' => now(),
                ]
            );
        }
    }

    public function down(): void
    {
        Schema::dropIfExists('student_academic_histories');
    }

    private function ensureIndex(string $table, string $indexName, string $sql): void
    {
        if (DB::getDriverName() !== 'mysql') {
            return;
        }

        $indexExists = DB::table('information_schema.statistics')
            ->where('table_schema', DB::getDatabaseName())
            ->where('table_name', $table)
            ->where('index_name', $indexName)
            ->exists();

        if (! $indexExists) {
            DB::statement($sql);
        }
    }
};
