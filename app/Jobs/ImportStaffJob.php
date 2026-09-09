<?php

namespace App\Jobs;

use App\Models\Organization;
use App\Models\UserImport;
use App\Services\StaffImportService;
use Illuminate\Bus\Queueable;
use Illuminate\Contracts\Queue\ShouldQueue;
use Illuminate\Foundation\Bus\Dispatchable;
use Illuminate\Queue\InteractsWithQueue;
use Illuminate\Queue\SerializesModels;
use Illuminate\Support\Carbon;
use Illuminate\Support\Facades\Log;
use Illuminate\Support\Facades\Storage;
use Throwable;

class ImportStaffJob implements ShouldQueue
{
    use Dispatchable;
    use InteractsWithQueue;
    use Queueable;
    use SerializesModels;

    public int $tries = 1;

    public int $timeout = 900;

    public function __construct(
        public readonly int $userImportId,
    ) {
        $this->onConnection('database')->onQueue('imports');
    }

    public function handle(StaffImportService $staffImportService): void
    {
        $userImport = UserImport::query()->find($this->userImportId);

        if (!$userImport) {
            Log::warning('Staff import job skipped because import record was not found.', [
                'user_import_id' => $this->userImportId,
            ]);

            return;
        }

        $organization = Organization::query()->find($userImport->organization_id);

        if (!$organization) {
            $userImport->update([
                'status' => 'failed',
                'error_message' => 'Organization was not found.',
                'finished_at' => Carbon::now(),
            ]);

            Log::warning('Staff import job skipped because organization was not found.', [
                'user_import_id' => $this->userImportId,
                'organization_id' => $userImport->organization_id,
            ]);

            return;
        }

        $userImport->update([
            'status' => 'processing',
            'started_at' => Carbon::now(),
        ]);

        $userRows = $this->loadUserRows($userImport);
        $result = $staffImportService->import($userRows, $organization);
        $status = $result['error_count'] > 0 ? 'completed_with_errors' : 'completed';

        $userImport->update([
            'status' => $status,
            'created_count' => $result['created_count'],
            'skipped_count' => $result['error_count'],
            'errors' => array_slice($result['errors'], 0, 20),
            'error_message' => $result['error_count'] > 0 ? $result['errors'][0] : null,
            'finished_at' => Carbon::now(),
        ]);

        Log::info('Staff import job completed.', [
            'user_import_id' => $this->userImportId,
            'organization_id' => $userImport->organization_id,
            'submitted_count' => $userImport->submitted_count,
            ...$result,
        ]);

        $this->deleteSourceFile($userImport);
    }

    public function failed(Throwable $exception): void
    {
        UserImport::query()
            ->whereKey($this->userImportId)
            ->update([
                'status' => 'failed',
                'error_message' => $exception->getMessage() ?: 'Staff import job failed.',
                'finished_at' => Carbon::now(),
            ]);

        $userImport = UserImport::query()->find($this->userImportId);

        if ($userImport) {
            $this->deleteSourceFile($userImport);
        }
    }

    private function loadUserRows(UserImport $userImport): array
    {
        if (!$userImport->source_path || !Storage::disk('local')->exists($userImport->source_path)) {
            throw new \RuntimeException('Staff import source file was not found.');
        }

        $decodedRows = json_decode(Storage::disk('local')->get($userImport->source_path), true);

        if (!is_array($decodedRows)) {
            throw new \RuntimeException('Staff import source file is invalid.');
        }

        return $decodedRows;
    }

    private function deleteSourceFile(UserImport $userImport): void
    {
        if ($userImport->source_path) {
            Storage::disk('local')->delete($userImport->source_path);
        }
    }
}