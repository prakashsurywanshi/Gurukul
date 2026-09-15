<?php

namespace App\Console\Commands;

use App\Models\AcademicYear;
use App\Models\Organization;
use App\Services\StaffPermissionService;
use Illuminate\Console\Command;
use Illuminate\Support\Facades\DB;

class ImportLegacySchoolCommand extends Command
{
    protected $signature = 'legacy:import
        {--source=q_gurukul_legacy : Legacy database name to import from}
        {--offset=100000 : Numeric offset applied to every legacy row id}';

    protected $description = 'Import a legacy school snapshot as a new organization (uniform id-offset ETL preserving FK links).';

    private const INCLUDED_TABLES = [
        'academic_years', 'users', 'classes', 'students', 'student_academic_histories',
        'subjects', 'class_subject', 'fee_types', 'fee_structures', 'student_fees',
        'fee_payments', 'attendance', 'exams', 'exam_schedules', 'exam_results',
        'hostels', 'hostel_rooms', 'hostel_beds', 'hostel_allocations', 'hostel_fee_structures',
        'transport_routes', 'transport_vehicles', 'student_transport', 'daily_trips',
        'library_books', 'library_members', 'library_circulations',
        'messages', 'message_recipients',
        'homework', 'homework_submissions',
        'online_exams', 'online_exam_attempts',
        'timetables', 'todos',
    ];

    public function handle(StaffPermissionService $permissions): int
    {
        $source = (string) $this->option('source');
        $offset = (int) $this->option('offset');

        $legacyConfig = array_merge(config('database.connections.mysql'), ['database' => $source]);
        config(['database.connections.legacy' => $legacyConfig]);
        DB::purge('legacy');

        if (! $this->legacyReachable()) {
            $this->error("Legacy source database [{$source}] is unreachable.");

            return self::FAILURE;
        }

        $legacyOrg = DB::connection('legacy')->table('organizations')->first();

        if (! $legacyOrg) {
            $this->error('Legacy source contains no organization row.');

            return self::FAILURE;
        }

        if (Organization::query()->where('slug', $legacyOrg->slug)->exists()) {
            $this->error("An organization with slug [{$legacyOrg->slug}] already exists; aborting the import.");

            return self::FAILURE;
        }

        $legacyOrgId = (int) $legacyOrg->id;
        $newOrgId = $legacyOrgId + $offset;

        DB::transaction(function () use ($legacyOrg, $legacyOrgId, $newOrgId, $offset) {
            $this->insertTable('organizations', [$legacyOrgId], $offset);

            foreach (self::INCLUDED_TABLES as $table) {
                $this->insertTable($table, [$legacyOrgId], $offset);
            }

            $this->bootstrapOrganization($newOrgId);

            $this->line("Imported organization as id [{$newOrgId}] with catalog roles/permissions/settings.");
        });

        $this->info('Legacy school import completed.');

        return self::SUCCESS;
    }

    private function insertTable(string $table, array $legacyOrgIdValues, int $offset): void
    {
        $columns = $this->trustedColumns($table);

        if (empty($columns)) {
            $this->line("  [skip] {$table}: no shared columns.");

            return;
        }

        $query = DB::connection('legacy')->table($table);

        if (in_array('organization_id', $columns, true)) {
            $query->where(function ($builder) use ($legacyOrgIdValues) {
                $builder->whereIn('organization_id', $legacyOrgIdValues)
                    ->orWhereNull('organization_id');
            });
        }

        $rows = $query->get($columns);

        if ($rows->isEmpty()) {
            $this->line("  [skip] {$table}: no rows.");

            return;
        }

        $transforms = $this->transformsFor($table, $offset);

        foreach ($rows->chunk(200) as $chunk) {
            $inserts = $chunk->map(function ($row) use ($transforms, $table) {
                $data = (array) $row;

                foreach ($transforms as $column => $transform) {
                    if (isset($data[$column]) && $data[$column] !== null) {
                        $data[$column] = $transform($data[$column]);
                    }
                }

                if ($table === 'students' && isset($data['admission_no'])) {
                    $admissionNo = (string) $data['admission_no'];

                    if ($admissionNo !== '' && ! str_starts_with($admissionNo, 'NC-')) {
                        $data['admission_no'] = 'NC-'.$admissionNo;
                    }
                }

                return $data;
            })->all();

            DB::table($table)->insert($inserts);
        }

        $this->line("  [ok] {$table}: ".$rows->count().' rows');
    }

    private function transformsFor(string $table, int $offset): array
    {
        $transforms = [];

        if (in_array('id', $this->trustedColumns($table), true)) {
            $transforms['id'] = fn ($value) => (int) $value + $offset;
        }

        if (in_array('organization_id', $this->trustedColumns($table), true)) {
            $transforms['organization_id'] = fn ($value) => (int) $value + $offset;
        }

        $linkedTables = array_merge(self::INCLUDED_TABLES, ['organizations']);

        foreach ($this->foreignKeyColumns($table) as $column => $referencedTable) {
            if (in_array($referencedTable, $linkedTables, true)) {
                $transforms[$column] = fn ($value) => (int) $value + $offset;
            } else {
                $transforms[$column] = fn () => null;
            }
        }

        return $transforms;
    }

    private function foreignKeyColumns(string $table): array
    {
        $rows = DB::table('information_schema.KEY_COLUMN_USAGE')
            ->where('TABLE_SCHEMA', DB::connection()->getDatabaseName())
            ->where('TABLE_NAME', $table)
            ->whereNotNull('REFERENCED_TABLE_NAME')
            ->get(['COLUMN_NAME', 'REFERENCED_TABLE_NAME']);

        return $rows->pluck('REFERENCED_TABLE_NAME', 'COLUMN_NAME')->all();
    }

    private function bootstrapOrganization(int $organizationId): void
    {
        $organization = Organization::query()->findOrFail($organizationId);

        app(StaffPermissionService::class)->ensureRolesExist($organization);

        $currentYear = AcademicYear::query()
            ->where('organization_id', $organizationId)
            ->where('is_current', true)
            ->first();

        $organization->forceFill([
            'settings' => array_merge($organization->settings ?? [], [
                'academic_year_start' => $currentYear?->start_date?->toDateString() ?? '2025-04-01',
            ]),
        ])->save();
    }

    private function trustedColumns(string $table): array
    {
        $legacy = $this->columnsFor('legacy', $table);
        $modern = $this->columnsFor(DB::getDefaultConnection(), $table);

        return array_values(array_intersect($legacy, $modern));
    }

    private function columnsFor(string $connection, string $table): array
    {
        return array_map(
            fn ($column) => $column->Field,
            DB::connection($connection)->select('SHOW COLUMNS FROM `'.$table.'`')
        );
    }

    private function legacyReachable(): bool
    {
        try {
            DB::connection('legacy')->select('SELECT 1');

            return ! empty($this->columnsFor('legacy', 'organizations'));
        } catch (\Throwable) {
            return false;
        }
    }
}