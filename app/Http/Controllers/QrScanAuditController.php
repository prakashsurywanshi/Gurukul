<?php

namespace App\Http\Controllers;

use App\Models\Attendance;
use App\Models\Organization;
use App\Models\QrScanLog;
use App\Models\User;
use Illuminate\Http\Request;
use Inertia\Inertia;
use Inertia\Response;

class QrScanAuditController extends Controller
{
    public function index(Request $request): Response
    {
        $user = $request->user();
        $organization = $this->resolveOrganizationForUser($user);
        abort_unless($organization, 403);
        $this->abortUnlessAdmin($user);

        $date = $request->query('date', now()->toDateString());

        if (! is_string($date) || ! preg_match('/^\d{4}-\d{2}-\d{2}$/', $date)) {
            $date = now()->toDateString();
        }

        $scansForDate = QrScanLog::query()
            ->where('organization_id', $organization->id)
            ->whereDate('scan_date', $date)
            ->count();

        $todaySuccess = QrScanLog::query()
            ->where('organization_id', $organization->id)
            ->whereDate('scan_date', $date)
            ->where('status', 'success')
            ->count();

        $logs = QrScanLog::query()
            ->where('organization_id', $organization->id)
            ->with('student:id,first_name,last_name,admission_no,class_id')
            ->with('scanner:id,name,role')
            ->latest()
            ->take(200)
            ->get()
            ->map(fn (QrScanLog $log) => [
                'id' => $log->id,
                'studentName' => trim(($log->student?->first_name ?? '').' '.($log->student?->last_name ?? '')),
                'admissionNo' => $log->student?->admission_no,
                'scannedByName' => $log->scanner?->name ?? 'System',
                'method' => $log->method,
                'status' => $log->status,
                'qrToken' => $log->qr_token,
                'ipAddress' => $log->ip_address,
                'scanDate' => $log->scan_date?->toDateString(),
                'createdAt' => $log->created_at?->toDateTimeString(),
            ])
            ->values();

        $attendanceToday = Attendance::query()
            ->where('organization_id', $organization->id)
            ->whereDate('date', $date)
            ->whereIn('status', ['present', 'late'])
            ->count();

        $totalScans = QrScanLog::query()->where('organization_id', $organization->id)->count();
        $successRate = $totalScans > 0 ? round((QrScanLog::query()->where('organization_id', $organization->id)->where('status', 'success')->count() / $totalScans) * 100) : 0;

        return Inertia::render('dashboard/QrScanAudit', [
            'user' => $user,
            'logs' => $logs,
            'date' => $date,
            'summary' => [
                'scansToday' => $scansForDate,
                'successToday' => $todaySuccess,
                'attendanceMarked' => $attendanceToday,
                'totalScans' => $totalScans,
                'successRate' => $successRate,
            ],
        ]);
    }

    private function abortUnlessAdmin(User $user): void
    {
        abort_unless(in_array($user->role, ['admin', 'super_admin'], true), 403);
    }

    private function resolveOrganizationForUser(User $user): ?Organization
    {
        if ($user->organization_id) {
            return Organization::query()->find($user->organization_id);
        }

        if ($user->role !== 'admin') {
            return null;
        }

        $organization = Organization::query()->where('email', $user->email)->first();

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