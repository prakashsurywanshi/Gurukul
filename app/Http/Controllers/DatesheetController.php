<?php

namespace App\Http\Controllers;

use App\Models\AcademicYear;
use App\Models\Exam;
use App\Models\ExamSchedule;
use App\Models\Organization;
use App\Models\User;
use Carbon\Carbon;
use Illuminate\Http\RedirectResponse;
use Illuminate\Http\Request;
use Illuminate\Support\Collection;
use Illuminate\Support\Facades\Auth;
use Inertia\Inertia;
use Inertia\Response;

class DatesheetController extends Controller
{
    public function index(Request $request): Response
    {
        $user = Auth::user();
        $organization = $this->resolveOrganizationForUser($user);

        abort_unless($organization, 403);

        $selectedSessionId = $request->integer('session') ?: null;

        $exams = Exam::query()
            ->where('organization_id', $organization->id)
            ->with(['schedules.schoolClass:id,name,section', 'academicYear:id,name'])
            ->when(
                $selectedSessionId,
                fn ($query) => $query->where('academic_year_id', $selectedSessionId)
            )
            ->orderByDesc('start_date')
            ->get();

        return Inertia::render('dashboard/Datesheets', [
            'user' => $user,
            'exams' => $exams->map(fn (Exam $exam) => [
                'id' => $exam->id,
                'name' => $exam->name,
                'academicYear' => $exam->academicYear?->name,
                'publishStatus' => $exam->publish_status,
                'startDate' => $exam->start_date?->format('Y-m-d'),
                'endDate' => $exam->end_date?->format('Y-m-d'),
                'classesInScope' => $exam->schedules->pluck('class_id')->unique()->count(),
            ]),
            'academicYears' => AcademicYear::query()
                ->where('organization_id', $organization->id)
                ->orderByDesc('name')
                ->get(['id', 'name', 'is_current'])
                ->map(fn (AcademicYear $year) => [
                    'id' => $year->id,
                    'name' => $year->name,
                    'isCurrent' => (bool) $year->is_current,
                ])
                ->values(),
            'selectedSessionId' => $selectedSessionId,
        ]);
    }

    public function show(Request $request, Exam $exam): Response
    {
        $user = Auth::user();
        $organization = $this->resolveOrganizationForUser($user);

        abort_unless($organization, 403);

        abort_unless($exam->organization_id === $organization->id, 404);

        $exam->load(['schedules.schoolClass:id,name,section', 'schedules.subject:id,name']);

        $allSheet = $this->buildSheet($exam->schedules, allClasses: true);
        $classSheets = $exam->schedules
            ->sortBy([
                ['schoolClass.name', 'asc'],
                ['exam_date', 'asc'],
                ['start_time', 'asc'],
            ])
            ->groupBy('class_id')
            ->map(fn (Collection $schedules) => $this->buildSheet($schedules, allClasses: false))
            ->values();

        return Inertia::render('dashboard/DatesheetDetail', [
            'user' => $user,
            'exam' => [
                'id' => $exam->id,
                'name' => $exam->name,
                'publishStatus' => $exam->publish_status,
                'publishedNote' => $exam->datesheet_note,
                'startDate' => $exam->start_date?->format('d M, Y'),
                'endDate' => $exam->end_date?->format('d M, Y'),
                'classesInScope' => $exam->schedules->pluck('class_id')->unique()->count(),
                'papers' => $exam->schedules->count(),
            ],
            'allSheet' => $allSheet,
            'classSheets' => $classSheets,
            'published' => $exam->publish_status === 'published',
            'hasSchedule' => $exam->schedules->isNotEmpty(),
        ]);
    }

    public function publish(Request $request, Exam $exam): RedirectResponse
    {
        $user = Auth::user();
        $organization = $this->resolveOrganizationForUser($user);

        abort_unless($organization, 403);

        abort_unless($exam->organization_id === $organization->id, 404);

        $validated = $request->validate([
            'scope' => ['nullable', 'string', 'max:255'],
            'note' => ['nullable', 'string', 'max:5000'],
        ]);

        $exam->update([
            'publish_status' => 'published',
            'datesheet_note' => $validated['note'] ?? null,
        ]);

        $target = ($validated['scope'] ?? 'all') === 'all' ? 'all classes' : 'the selected class';

        return back()->with('success', "Datesheet published for $target.");
    }

    private function buildSheet(Collection $schedules, bool $allClasses): array
    {
        $rows = $schedules
            ->sortBy([
                ['exam_date', 'asc'],
                ['start_time', 'asc'],
            ])
            ->map(function (ExamSchedule $schedule) {
                $date = $schedule->exam_date;

                return [
                    'date' => $date?->format('d M, Y'),
                    'day' => $date?->format('D'),
                    'subject' => $schedule->subject?->name ?? 'Subject',
                    'startTime' => $this->formatTime($schedule->start_time),
                    'endTime' => $this->formatTime($schedule->end_time),
                    'room' => $schedule->room_number,
                    'className' => $schedule->schoolClass?->name,
                ];
            })
            ->values()
            ->all();

        $warnings = $schedules
            ->filter(fn (ExamSchedule $schedule) => blank($schedule->room_number))
            ->map(fn (ExamSchedule $schedule) => $schedule->subject?->name ?? 'Subject')
            ->unique()
            ->values()
            ->all();

        return [
            'title' => $allClasses ? 'All classes' : $this->className($schedules->first()?->schoolClass),
            'rows' => $rows,
            'warnings' => $warnings,
        ];
    }

    private function className($schoolClass): string
    {
        if (!$schoolClass) {
            return 'Class';
        }

        return $schoolClass->section
            ? $schoolClass->name . '-' . $schoolClass->section
            : $schoolClass->name;
    }

    private function formatTime(?string $time): ?string
    {
        if (blank($time)) {
            return null;
        }

        return Carbon::parse($time)->format('g:i A');
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