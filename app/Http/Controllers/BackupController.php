<?php

namespace App\Http\Controllers;

use Illuminate\Http\RedirectResponse;
use Illuminate\Support\Facades\Artisan;
use Illuminate\Support\Facades\Auth;
use Illuminate\Support\Facades\Storage;
use Symfony\Component\HttpFoundation\BinaryFileResponse;
use Throwable;

class BackupController extends Controller
{
    public function index()
    {
        $user = auth()->user();

        if (!in_array($user->role, ['super_admin', 'admin'], true)) {
            abort(403);
        }

        return inertia('dashboard/AutomatedBackups', [
            'user' => $user,
            'backups' => $this->backups(),
        ]);
    }

    public function run(): RedirectResponse
    {
        $user = auth()->user();

        if (!in_array($user->role, ['super_admin', 'admin'], true)) {
            abort(403);
        }

        try {
            Artisan::call('backup:database');
        } catch (Throwable $e) {
            return back()->with('error', 'Backup failed: ' . $e->getMessage());
        }

        return back()->with('success', 'Backup completed successfully.');
    }

    public function download(string $file): BinaryFileResponse
    {
        $user = auth()->user();

        if (!in_array($user->role, ['super_admin', 'admin'], true)) {
            abort(403);
        }

        $path = Storage::disk('local')->path('backups/' . $file);

        if (!is_file($path)) {
            abort(404);
        }

        return response()->download($path);
    }

    public function delete(string $file): RedirectResponse
    {
        $user = auth()->user();

        if (!in_array($user->role, ['super_admin', 'admin'], true)) {
            abort(403);
        }

        Storage::disk('local')->delete('backups/' . $file);

        return back()->with('success', 'Backup deleted.');
    }

    public function restore(string $file): RedirectResponse
    {
        $user = auth()->user();

        if (!in_array($user->role, ['super_admin', 'admin'], true)) {
            abort(403);
        }

        if (!str_ends_with($file, '.sql')) {
            abort(422);
        }

        try {
            Artisan::call('backup:restore', ['file' => $file, '--disk' => 'local', '--yes' => true]);
        } catch (Throwable $e) {
            return back()->with('error', 'Restore failed: ' . $e->getMessage());
        }

        Auth::logout();

        return redirect()->route('login')->with('status', 'Database restored from ' . $file . '. Please log in again.');
    }

    private function backups(): array
    {
        $files = Storage::disk('local')->files('backups');

        $list = [];
        foreach ($files as $file) {
            if (!str_ends_with($file, '.sql')) {
                continue;
            }

            $list[] = [
                'name' => basename($file),
                'size' => Storage::disk('local')->size($file),
                'created_at' => \Illuminate\Support\Carbon::createFromTimestamp(Storage::disk('local')->lastModified($file))->toIso8601String(),
            ];
        }

        usort($list, fn ($a, $b) => $b['created_at'] <=> $a['created_at']);

        return $list;
    }
}