<?php

namespace App\Jobs;

use App\Models\Organization;
use App\Models\StudentImport;
use App\Services\StudentImportService;
use Illuminate\Bus\Queueable;
use Illuminate\Contracts\Queue\ShouldQueue;
use Illuminate\Foundation\Bus\Dispatchable;
use Illuminate\Queue\InteractsWithQueue;
use Illuminate\Queue\SerializesModels;
use Illuminate\Support\Carbon;
use Illuminate\Support\Facades\Log;
use Illuminate\Support\Facades\Storage;
use Throwable;

class ImportStudentsJob implements ShouldQueue
{
    use Dispatchable;
    use InteractsWithQueue;
    use Queueable;
    use SerializesModels;

    public int $tries = 1;

    public int $timeout = 900;

    public function __construct(
        public readonly int $studentImportId,
    ) {
        $this->onConnection('database')->onQueue('imports');
    }

    public function handle(StudentImportService $studentImportService): void
    {
        $studentImport = StudentImport::query()->find($this->studentImportId);

        if (! $studentImport) {
            Log::warning('Student import job skipped because import record was not found.', [
                'student_import_id' => $this->studentImportId,
            ]);

            return;
        }

        $organization = Organization::query()->find($studentImport->organization_id);

        if (! $organization) {
            $studentImport->update([
                'status' => 'failed',
                'error_message' => 'Organization was not found.',
                'finished_at' => Carbon::now(),
            ]);

            Log::warning('Student import job skipped because organization was not found.', [
                'student_import_id' => $this->studentImportId,
                'organization_id' => $studentImport->organization_id,
                'requested_by_user_id' => $studentImport->requested_by_user_id,
            ]);

            return;
        }

        $studentImport->update([
            'status' => 'processing',
            'started_at' => Carbon::now(),
        ]);

        $studentRows = $this->loadStudentRows($studentImport);
        $result = $studentImportService->import($studentRows, $organization);
        $status = $result['error_count'] > 0 ? 'completed_with_errors' : 'completed';

        $studentImport->update([
            'status' => $status,
            'created_count' => $result['created_count'],
            'skipped_count' => $result['error_count'],
            'errors' => array_slice($result['errors'], 0, 20),
            'error_message' => $result['error_count'] > 0 ? $result['errors'][0] : null,
            'finished_at' => Carbon::now(),
        ]);

        Log::info('Student import job completed.', [
            'student_import_id' => $this->studentImportId,
            'organization_id' => $studentImport->organization_id,
            'requested_by_user_id' => $studentImport->requested_by_user_id,
            'submitted_count' => $studentImport->submitted_count,
            ...$result,
        ]);

        $this->deleteSourceFile($studentImport);
    }

    public function failed(Throwable $exception): void
    {
        StudentImport::query()
            ->whereKey($this->studentImportId)
            ->update([
                'status' => 'failed',
                'error_message' => $exception->getMessage() ?: 'Student import job failed.',
                'finished_at' => Carbon::now(),
            ]);

        $studentImport = StudentImport::query()->find($this->studentImportId);

        if ($studentImport) {
            $this->deleteSourceFile($studentImport);
        }
    }

    private function loadStudentRows(StudentImport $studentImport): array
    {
        if (! $studentImport->source_path || ! Storage::disk('local')->exists($studentImport->source_path)) {
            throw new \RuntimeException('Student import source file was not found.');
        }

        $decodedRows = json_decode(Storage::disk('local')->get($studentImport->source_path), true);

        if (! is_array($decodedRows)) {
            throw new \RuntimeException('Student import source file is invalid.');
        }

        return $decodedRows;
    }

    private function deleteSourceFile(StudentImport $studentImport): void
    {
        if ($studentImport->source_path) {
            Storage::disk('local')->delete($studentImport->source_path);
        }
    }
}
