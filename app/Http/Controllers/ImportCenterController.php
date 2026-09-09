<?php

namespace App\Http\Controllers;

use App\Models\Organization;
use App\Models\StudentImport;
use App\Models\User;
use App\Models\UserImport;
use App\Jobs\ImportStaffJob;
use App\Support\RolePermissionCatalog;
use Illuminate\Http\RedirectResponse;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\Auth;
use Illuminate\Support\Facades\Storage;
use Illuminate\Support\Facades\Route;
use Inertia\Inertia;
use Inertia\Response;
use Throwable;

class ImportCenterController extends Controller
{
    public function index(Request $request): Response
    {
        $user = Auth::user();
        $organization = $this->resolveOrganizationForUser($user);

        abort_unless($organization, 403);

        return Inertia::render('dashboard/ImportCenter', [
            'user' => $user,
            'templates' => $this->templates($user),
            'recentImportCount' => count($this->recentImports($organization)),
            'recentImports' => $this->recentImports($organization),
            'roleOptions' => collect(['super_admin', ...RolePermissionCatalog::staffRoleSlugs()])
                ->map(fn (string $slug) => [
                    'slug' => $slug,
                    'label' => $slug === 'super_admin' ? 'Super Admin' : RolePermissionCatalog::displayNameForSlug($slug),
                ])
                ->values(),
        ]);
    }

    public function importStaff(Request $request): RedirectResponse
    {
        $user = Auth::user();
        $organization = $this->resolveOrganizationForUser($user);

        if (!$organization || !in_array($user->role, ['admin', 'super_admin'], true)) {
            abort(403);
        }

        $validated = $request->validate([
            'staff' => ['required', 'array', 'min:1'],
            'staff.*.name' => ['required', 'string'],
            'staff.*.email' => ['required', 'string'],
        ]);

        $submittedCount = count($validated['staff']);
        $userImport = UserImport::query()->create([
            'organization_id' => $organization->id,
            'requested_by_user_id' => $user->id,
            'status' => 'queued',
            'queue' => 'imports',
            'submitted_count' => $submittedCount,
        ]);

        try {
            $sourcePath = 'staff-imports/import-'.$userImport->id.'.json';
            $encodedRows = json_encode(array_values($validated['staff']), JSON_THROW_ON_ERROR);

            if (!Storage::disk('local')->put($sourcePath, $encodedRows)) {
                throw new \RuntimeException('Staff import file could not be written.');
            }

            $userImport->update(['source_path' => $sourcePath]);
        } catch (Throwable $exception) {
            $userImport->update([
                'status' => 'failed',
                'error_message' => $exception->getMessage() ?: 'Staff import file could not be prepared.',
                'finished_at' => now(),
            ]);

            report($exception);

            return back()->with('error', 'Staff import could not be queued. Please try again.');
        }

        ImportStaffJob::dispatch($userImport->id);

        $message = $submittedCount.' staff member'.($submittedCount === 1 ? '' : 's').' queued for import. Track status in Recent Imports.';

        return redirect()->route('import-center')->with('success', $message);
    }

    public function destroyImport(Request $request, UserImport $userImport): RedirectResponse
    {
        $user = Auth::user();
        $organization = $this->resolveOrganizationForUser($user);

        abort_unless($organization && $userImport->organization_id === $organization->id, 403);

        if (in_array($userImport->status, ['queued', 'processing'], true)) {
            return back()->with('error', 'Active imports cannot be deleted while they are still running.');
        }

        if ($userImport->source_path) {
            Storage::disk('local')->delete($userImport->source_path);
        }

        $userImport->delete();

        return redirect()->route('import-center')->with('success', 'Import history entry deleted.');
    }

    private function templates(User $user): array
    {
        $enabled = [
            'Students' => [
                'description' => 'Bulk add students from a spreadsheet or CSV.',
                'href' => Route::has('students') ? route('students') : '/students',
                'icon' => 'UserRound',
            ],
            'Staff' => [
                'description' => 'Bulk add staff accounts with roles, departments and designations.',
                'href' => '#staff-import',
                'icon' => 'Users',
            ],
        ];

        if (Route::has('fees')) {
            $enabled['Fees'] = [
                'description' => 'Assign fee structures to students in bulk.',
                'href' => route('fees'),
                'icon' => 'IndianRupee',
            ];
        }

        if (Route::has('fees') && in_array($user->role, ['admin', 'super_admin', 'accountant'], true)) {
            $enabled['Income'] = [
                'description' => 'Import income entries in bulk.',
                'href' => '/income-management',
                'icon' => 'ArrowDownToLine',
            ];
            $enabled['Expenses'] = [
                'description' => 'Import expense entries in bulk.',
                'href' => '/expense-management',
                'icon' => 'ArrowUpFromLine',
            ];
        }

        if (Route::has('library')) {
            $enabled['Library Books'] = [
                'description' => 'Bulk add library books from a spreadsheet.',
                'href' => route('library'),
                'icon' => 'BookOpen',
            ];
        }

        return $enabled;
    }

    private function recentImports(Organization $organization): array
    {
        $student = StudentImport::query()
            ->where('organization_id', $organization->id)
            ->latest()
            ->limit(10)
            ->get()
            ->map(fn (StudentImport $import) => [
                'type' => 'Students',
                'id' => (string) $import->id,
                'status' => $import->status,
                'submitted_count' => $import->submitted_count,
                'created_count' => $import->created_count,
                'skipped_count' => $import->skipped_count,
                'error_message' => $import->error_message,
                'created_at' => optional($import->created_at)->toISOString(),
            ]);

        $staff = UserImport::query()
            ->where('organization_id', $organization->id)
            ->latest()
            ->limit(10)
            ->get()
            ->map(fn (UserImport $import) => [
                'type' => 'Staff',
                'id' => (string) $import->id,
                'status' => $import->status,
                'submitted_count' => $import->submitted_count,
                'created_count' => $import->created_count,
                'skipped_count' => $import->skipped_count,
                'error_message' => $import->error_message,
                'created_at' => optional($import->created_at)->toISOString(),
            ]);

        return $student->concat($staff)
            ->sortByDesc(fn (array $row) => $row['created_at'] ?? '')
            ->take(10)
            ->values()
            ->all();
    }

    private function resolveOrganizationForUser(User $user): ?Organization
    {
        if ($user->organization_id) {
            return Organization::query()->find($user->organization_id);
        }

        if ($user->role !== 'admin') {
            return null;
        }

        $organization = Organization::query()
            ->where('email', $user->email)
            ->first();

        if (!$organization && Organization::query()->count() === 1) {
            $organization = Organization::query()->first();
        }

        if ($organization) {
            $user->forceFill(['organization_id' => $organization->id])->save();
            $user->organization_id = $organization->id;
        }

        return $organization;
    }
}