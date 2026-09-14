<?php

namespace App\Http\Controllers;

use App\Models\AcademicYear;
use App\Models\Organization;
use App\Models\SchoolClass;
use App\Models\SavedReport;
use App\Models\Semester;
use App\Models\User;
use Illuminate\Http\Request;
use Illuminate\Support\Carbon;
use Illuminate\Support\Collection;
use Illuminate\Support\Facades\Auth;
use Inertia\Inertia;
use Inertia\Response as InertiaResponse;

class SavedReportController extends Controller
{
    public const MODULES = [
        'students',
        'attendance',
        'fees',
        'exams',
        'library',
        'transport',
        'hostel',
        'inventory',
        'front-office',
        'communication',
        'lesson-plan',
        'human-resource',
        'homework',
        'alumni',
        'activity-log',
        'audit-trail',
    ];

    private const FILTER_KEYS = ['class', 'session', 'month', 'search', 'date_from', 'date_to', 'semester'];

    public function index(Request $request): InertiaResponse
    {
        $user = Auth::user();
        $organization = $this->resolveOrganizationForUser($user);

        abort_unless($organization, 403);

        $academicYear = $organization->selectedAcademicYear();

        $savedReports = SavedReport::query()
            ->where('organization_id', $organization->id)
            ->orderByDesc('updated_at')
            ->get()
            ->map(fn (SavedReport $report) => [
                'id' => $report->id,
                'name' => $report->name,
                'module' => $report->module,
                'filters' => $report->filters,
                'is_active' => $report->is_active,
                'createdAt' => $report->created_at?->format('d M Y'),
            ]);

        return Inertia::render('dashboard/ReportBuilder', [
            'user' => $user,
            'modules' => collect(self::MODULES)->map(fn (string $id) => [
                'value' => $id,
                'label' => $this->moduleLabel($id),
            ]),
            'classOptions' => $this->getClassOptions($organization),
            'sessionOptions' => $this->sessionOptions($organization),
            'semesterOptions' => $academicYear
                ? Semester::query()
                    ->where('organization_id', $organization->id)
                    ->where('academic_year_id', $academicYear->id)
                    ->orderBy('sem_no')
                    ->get(['id', 'name'])
                    ->map(fn (Semester $semester) => [
                        'value' => (string) $semester->id,
                        'label' => $semester->name,
                    ])
                    ->values()
                : collect(),
            'monthOptions' => $academicYear ? $this->monthOptions($academicYear) : collect(),
            'selectedSession' => (string) ($academicYear?->id ?? ''),
            'savedReports' => $savedReports,
        ]);
    }

    public function store(Request $request)
    {
        $user = Auth::user();
        $organization = $this->resolveOrganizationForUser($user);

        abort_unless($organization, 403);

        $data = $request->validate([
            'name' => ['required', 'string', 'max:160'],
            'module' => ['required', 'string', 'in:' . implode(',', self::MODULES)],
            'filters' => ['sometimes', 'array'],
        ], [
            'module.in' => 'Select a valid report module.',
        ]);

        $filters = collect($data['filters'] ?? [])
            ->only(self::FILTER_KEYS)
            ->reject(fn ($value) => $value === '' || $value === null)
            ->map(fn ($value) => is_string($value) ? trim($value) : $value)
            ->all();

        SavedReport::create([
            'organization_id' => $organization->id,
            'name' => $data['name'],
            'module' => $data['module'],
            'filters' => $filters,
            'created_by' => $user->id,
        ]);

        return redirect('/reports/builder')->with('success', 'Saved report created.');
    }

    public function toggle(SavedReport $savedReport)
    {
        $user = Auth::user();
        $organization = $this->resolveOrganizationForUser($user);

        abort_unless($organization && $savedReport->organization_id === $organization->id, 403);

        $savedReport->update(['is_active' => !$savedReport->is_active]);

        return redirect('/reports/builder')->with('success', 'Saved report updated.');
    }

    public function destroy(SavedReport $savedReport, Request $request)
    {
        $user = Auth::user();
        $organization = $this->resolveOrganizationForUser($user);

        abort_unless($organization && $savedReport->organization_id === $organization->id, 403);

        $savedReport->delete();

        return $request->wantsJson()
            ? response()->json(['ok' => true])
            : redirect('/reports/builder')->with('success', 'Saved report deleted.');
    }

    public function filters(SavedReport $savedReport, Request $request)
    {
        $user = Auth::user();
        $organization = $this->resolveOrganizationForUser($user);

        abort_unless($organization && $savedReport->organization_id === $organization->id, 403);

        return response()->json([
            'module' => $savedReport->module,
            'filters' => $savedReport->filters,
        ]);
    }

    private function moduleLabel(string $id): string
    {
        $labels = [
            'students' => 'Students',
            'attendance' => 'Attendance',
            'fees' => 'Fees',
            'exams' => 'Exams',
            'library' => 'Library',
            'transport' => 'Transport',
            'hostel' => 'Hostel',
            'inventory' => 'Inventory',
            'front-office' => 'Front Office',
            'communication' => 'Communication',
            'lesson-plan' => 'Lesson Plan',
            'human-resource' => 'Human Resource',
            'homework' => 'Homework',
            'alumni' => 'Alumni',
            'activity-log' => 'Activity Log',
            'audit-trail' => 'Audit Trail',
        ];

        return $labels[$id] ?? ucfirst($id);
    }

    private function getClassOptions(Organization $organization): Collection
    {
        return SchoolClass::query()
            ->forCurrentSession($organization->id)
            ->where('status', 'active')
            ->orderByRaw('CAST(name AS UNSIGNED), name')
            ->orderBy('section')
            ->get(['id', 'name', 'section'])
            ->map(fn (SchoolClass $class) => [
                'value' => (string) $class->id,
                'label' => $class->name . ($class->section ? ' - ' . $class->section : ''),
            ])
            ->values();
    }

    private function sessionOptions(Organization $organization): Collection
    {
        return AcademicYear::query()
            ->where('organization_id', $organization->id)
            ->orderByDesc('is_current')
            ->orderByDesc('start_date')
            ->get(['id', 'name', 'is_current'])
            ->map(fn (AcademicYear $session) => [
                'value' => (string) $session->id,
                'label' => $session->name,
                'isCurrent' => $session->is_current,
            ])
            ->values();
    }

    private function monthOptions(AcademicYear $selectedAcademicYear): Collection
    {
        $months = collect();
        $cursor = $selectedAcademicYear->start_date->copy()->startOfMonth();
        $end = $selectedAcademicYear->end_date->copy()->startOfMonth();

        while ($cursor->lte($end)) {
            $months->push($cursor->copy());
            $cursor->addMonth();
        }

        return $months->map(fn (Carbon $month) => [
            'value' => $month->format('Y-m'),
            'label' => $month->format('M Y'),
        ])->values();
    }

    private function resolveOrganizationForUser(?User $user): ?Organization
    {
        if (!$user) {
            return null;
        }

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