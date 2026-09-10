<?php

namespace App\Http\Controllers;

use App\Models\Attendance;
use App\Models\Organization;
use App\Models\QrScanLog;
use App\Models\SchoolClass;
use App\Models\Student;
use App\Models\User;
use Illuminate\Http\RedirectResponse;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\Auth;
use Illuminate\Support\Str;
use Illuminate\Validation\Rule;
use Throwable;

class QrAttendanceController extends Controller
{
    private const STATUSES = ['present', 'absent', 'late', 'half_day'];

    public function index(Request $request)
    {
        $user = Auth::user();
        $organization = $this->resolveOrganizationForUser($user);

        abort_unless($organization, 403);

        $selectedClassId = $request->query('class_id');
        $date = $request->query('date', now()->toDateString());

        if (! is_string($date) || ! preg_match('/^\d{4}-\d{2}-\d{2}$/', $date)) {
            $date = now()->toDateString();
        }

        $classes = SchoolClass::query()
            ->forCurrentSession($organization->id)
            ->where('status', 'active')
            ->when($user->role === 'teacher', fn ($query) => $query->where('class_teacher_id', $user->id))
            ->orderByRaw('CAST(name AS UNSIGNED), name')
            ->orderBy('section')
            ->get(['id', 'name', 'section'])
            ->map(fn (SchoolClass $schoolClass) => [
                'id' => (string) $schoolClass->id,
                'name' => $schoolClass->name,
                'section' => $schoolClass->section,
                'label' => trim(($schoolClass->name ?? '').' '.($schoolClass->section ?? '')),
            ])
            ->values()
            ->all();

        $students = collect();
        $attendanceRecords = collect();

        if ($selectedClassId) {
            $class = SchoolClass::query()->find($selectedClassId);

            if ($class) {
                $students = Student::query()
                    ->forCurrentSession($organization->id)
                    ->where('class_id', $class->id)
                    ->where('status', 'active')
                    ->with('schoolClass:id,name,section')
                    ->orderBy('roll_number')
                    ->get();

                foreach ($students as $student) {
                    if (! $student->qr_token) {
                        $student->qr_token = $this->generateQrToken($organization, $student);
                        $student->save();
                    }
                }

                $attendanceRecords = Attendance::query()
                    ->where('organization_id', $organization->id)
                    ->where('class_id', $class->id)
                    ->whereDate('date', $date)
                    ->get()
                    ->keyBy('student_id');
            }
        }

        return inertia('dashboard/QrAttendance', [
            'user' => $user,
            'organization' => [
                'id' => $organization->id,
                'name' => $organization->name,
            ],
            'classes' => $classes,
            'students' => $students->map(fn (Student $student) => [
                'id' => (string) $student->id,
                'admission_no' => $student->admission_no,
                'name' => trim(($student->first_name ?? '').' '.($student->last_name ?? '')),
                'class_id' => $student->class_id,
                'class' => $student->schoolClass?->name,
                'section' => $student->schoolClass?->section,
                'roll_number' => $student->roll_number,
                'qr_token' => $student->qr_token,
                'status' => optional($attendanceRecords->get($student->id))->status,
                'check_in_time' => optional($attendanceRecords->get($student->id))->check_in_time,
            ])->values()->all(),
            'selectedClassId' => $selectedClassId ? (string) $selectedClassId : null,
            'date' => $date,
        ]);
    }

    public function store(Request $request): RedirectResponse
    {
        $user = Auth::user();
        $organization = $this->resolveOrganizationForUser($user);

        abort_unless($organization, 403);

        $validated = $request->validate([
            'class_id' => ['required', 'integer', 'exists:classes,id'],
            'date' => ['required', 'date'],
            'entries' => ['required', 'array', 'min:1'],
            'entries.*.student_id' => ['required', 'integer', 'exists:students,id'],
            'entries.*.status' => ['required', Rule::in(self::STATUSES)],
        ]);

        $class = SchoolClass::query()->findOrFail($validated['class_id']);

        if ($class->organization_id !== $organization->id) {
            abort(403);
        }

        $studentIds = collect($validated['entries'])->pluck('student_id')->all();
        $validStudentIds = Student::query()
            ->where('organization_id', $organization->id)
            ->whereIn('id', $studentIds)
            ->pluck('id')
            ->all();

        $qrTokens = Student::query()->whereIn('id', $studentIds)->pluck('qr_token', 'id');

        foreach ($validated['entries'] as $entry) {
            if (! in_array($entry['student_id'], $validStudentIds, false)) {
                continue;
            }

            Attendance::query()->updateOrCreate(
                [
                    'organization_id' => $organization->id,
                    'student_id' => $entry['student_id'],
                    'class_id' => $class->id,
                    'date' => $validated['date'],
                ],
                [
                    'status' => $entry['status'],
                    'check_in_time' => $entry['status'] === 'present' ? now()->format('H:i:s') : null,
                    'marked_by' => $user->id,
                ]
            );

            QrScanLog::query()->create([
                'organization_id' => $organization->id,
                'student_id' => $entry['student_id'],
                'scanned_by' => $user->id,
                'method' => 'qr',
                'status' => in_array($entry['status'], ['present', 'late'], true) ? 'success' : 'failure',
                'qr_token' => $qrTokens[$entry['student_id']] ?? null,
                'ip_address' => $request->ip(),
                'user_agent' => $request->userAgent(),
                'scan_date' => $validated['date'],
            ]);
        }

        return redirect()->route('attendance-qr', [
            'class_id' => $class->id,
            'date' => $validated['date'],
        ])->with('success', 'Attendance saved successfully.');
    }

    private function generateQrToken(Organization $organization, Student $student): string
    {
        return strtoupper('QR-'.$organization->id.'-'.$student->id.'-'.Str::lower(Str::random(6)));
    }

    private function resolveOrganizationForUser(User $user): ?Organization
    {
        if ($user->organization_id) {
            return Organization::query()->find($user->organization_id);
        }

        if ($user->role === 'super_admin') {
            return Organization::query()->first();
        }

        if ($user->role !== 'admin') {
            return null;
        }

        try {
            $organization = Organization::query()->firstOrFail();
            $user->organization_id = $organization->id;
            $user->save();

            return $organization;
        } catch (Throwable) {
            return null;
        }
    }
}