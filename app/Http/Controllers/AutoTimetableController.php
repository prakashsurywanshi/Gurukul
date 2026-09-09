<?php

namespace App\Http\Controllers;

use App\Models\Organization;
use App\Models\SchoolClass;
use App\Models\Subject;
use App\Models\Timetable;
use App\Models\User;
use Illuminate\Http\RedirectResponse;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\DB;
use Throwable;

class AutoTimetableController extends Controller
{
    private const WEEKDAYS = ['monday', 'tuesday', 'wednesday', 'thursday', 'friday', 'saturday'];

    public function index()
    {
        $user = auth()->user();
        $organization = $this->resolveOrganizationForUser($user);

        abort_unless($organization, 403);

        return inertia('dashboard/AutoTimetable', [
            'user' => $user,
            'classes' => $this->classes($organization),
            'teachers' => $this->teachers($organization),
        ]);
    }

    public function generate(Request $request)
    {
        $user = auth()->user();
        $organization = $this->resolveOrganizationForUser($user);

        abort_unless($organization, 403);

        $validated = $request->validate([
            'class_id' => ['required', 'integer'],
            'periods_per_day' => ['required', 'integer', 'min:4', 'max:10'],
            'period_minutes' => ['required', 'integer', 'min:25', 'max:90'],
            'start_time' => ['required', 'date_format:H:i'],
            'days' => ['required', 'array', 'min:1', 'max:7'],
            'days.*' => ['required', 'in:monday,tuesday,wednesday,thursday,friday,saturday,sunday'],
            'break_period' => ['nullable', 'integer', 'min:0'],
        ]);

        $schoolClass = SchoolClass::query()
            ->forCurrentSession($organization->id)
            ->findOrFail($validated['class_id']);

        $proposal = $this->buildProposal($organization, $schoolClass, $validated);

        return response()->json(['proposal' => $proposal]);
    }

    public function apply(Request $request): RedirectResponse
    {
        $user = auth()->user();
        $organization = $this->resolveOrganizationForUser($user);

        abort_unless($organization, 403);

        $validated = $request->validate([
            'class_id' => ['required', 'integer'],
            'entries' => ['required', 'array', 'min:1'],
            'entries.*.day' => ['required', 'in:monday,tuesday,wednesday,thursday,friday,saturday,sunday'],
            'entries.*.period_order' => ['required', 'integer'],
            'entries.*.subject_id' => ['nullable', 'integer'],
            'entries.*.teacher_id' => ['nullable', 'integer'],
            'entries.*.start_time' => ['required', 'date_format:H:i'],
            'entries.*.end_time' => ['required', 'date_format:H:i'],
            'entries.*.period_type' => ['required', 'in:lecture,lab,activity,break'],
            'entries.*.room_number' => ['nullable', 'string', 'max:50'],
        ]);

        $schoolClass = SchoolClass::query()
            ->forCurrentSession($organization->id)
            ->findOrFail($validated['class_id']);

        DB::transaction(function () use ($organization, $schoolClass, $validated) {
            Timetable::query()
                ->where('organization_id', $organization->id)
                ->where('class_id', $schoolClass->id)
                ->delete();

            $fallbackTeacherId = $schoolClass->class_teacher_id ?: $this->organizationsFirstTeacher($organization, $schoolClass->id);

            foreach ($validated['entries'] as $entry) {
                Timetable::query()->create([
                    'organization_id' => $organization->id,
                    'class_id' => $schoolClass->id,
                    'subject_id' => $entry['subject_id'] ?? null,
                    'teacher_id' => $entry['teacher_id'] ?? $fallbackTeacherId,
                    'day' => $entry['day'],
                    'start_time' => $entry['start_time'],
                    'end_time' => $entry['end_time'],
                    'room_number' => $entry['room_number'] ?? $schoolClass->room_number ?? null,
                    'period_type' => $entry['period_type'],
                    'period_order' => $entry['period_order'],
                ]);
            }
        });

        return back()->with('success', 'Timetable generated and applied successfully.');
    }

    private function buildProposal(Organization $organization, SchoolClass $schoolClass, array $validated): array
    {
        $days = $validated['days'];
        $periodsPerDay = (int) $validated['periods_per_day'];
        $periodMinutes = (int) $validated['period_minutes'];
        $startTime = $validated['start_time'];
        $breakPeriod = (int) ($validated['break_period'] ?? intdiv($periodsPerDay, 2));

        [$subjects, $teacherLocked] = $this->classSubjects($schoolClass->id);

        if (empty($subjects)) {
            return [];
        }

        $busy = $this->teacherBusySlots($organization, $periodsPerDay, $periodMinutes, $startTime);

        $proposal = [];
        $cursor = 0;
        $totalSubjects = count($subjects);

        foreach ($days as $dayIndex => $day) {
            $dayRows = [];
            $current = strtotime($startTime);

            for ($period = 0; $period < $periodsPerDay; $period++) {
                $startLabel = date('H:i', $current);
                $endLabel = date('H:i', $current + $periodMinutes * 60);
                $current = $current + $periodMinutes * 60;

                if ($period === $breakPeriod) {
                    $dayRows[] = $this->emptyRow($day, $period, $startLabel, $endLabel, 'break');
                    continue;
                }

                $placed = false;
                for ($attempt = 0; $attempt < $totalSubjects; $attempt++) {
                    $subject = $subjects[$cursor % $totalSubjects];
                    $cursor++;

                    $teacherId = $subject['teacher_id'];
                    $slotKey = $day . '|' . $period;

                    if (!isset($teacherLocked[$subject['subject_id']])) {
                        // Subject has no teacher yet — skip teacher-conflict check.
                        $dayRows[] = [
                            'day' => $day,
                            'period_order' => $period,
                            'subject_id' => $subject['subject_id'],
                            'subject' => $subject['name'],
                            'teacher_id' => $teacherId,
                            'teacher' => $subject['teacher_name'],
                            'start_time' => $startLabel,
                            'end_time' => $endLabel,
                            'period_type' => $subject['type'] === 'practical' ? 'lab' : 'lecture',
                            'room_number' => $schoolClass->room_number ?? '',
                        ];
                        $placed = true;
                        break;
                    }

                    if (empty($busy[$slotKey]) || !in_array($teacherId, $busy[$slotKey], true)) {
                        $busy[$slotKey][] = $teacherId;
                        $dayRows[] = [
                            'day' => $day,
                            'period_order' => $period,
                            'subject_id' => $subject['subject_id'],
                            'subject' => $subject['name'],
                            'teacher_id' => $teacherId,
                            'teacher' => $subject['teacher_name'],
                            'start_time' => $startLabel,
                            'end_time' => $endLabel,
                            'period_type' => $subject['type'] === 'practical' ? 'lab' : 'lecture',
                            'room_number' => $schoolClass->room_number ?? '',
                        ];
                        $placed = true;
                        break;
                    }
                }

                if (!$placed) {
                    $dayRows[] = $this->emptyRow($day, $period, $startLabel, $endLabel, 'activity', '', '');
                }
            }

            $proposal[] = [
                'day' => $day,
                'rows' => $dayRows,
            ];
        }

        return $proposal;
    }

    private function emptyRow(string $day, int $period, string $start, string $end, string $type, string $subject = 'Free', string $teacher = ''): array
    {
        return [
            'day' => $day,
            'period_order' => $period,
            'subject_id' => null,
            'subject' => $subject,
            'teacher_id' => null,
            'teacher' => $teacher,
            'start_time' => $start,
            'end_time' => $end,
            'period_type' => $type,
            'room_number' => '',
        ];
    }

    private function classSubjects(int $classId): array
    {
        $rows = DB::table('class_subject')
            ->where('class_id', $classId)
            ->join('subjects', 'subjects.id', '=', 'class_subject.subject_id')
            ->leftJoin('users', 'users.id', '=', 'class_subject.teacher_id')
            ->select('subjects.id as subject_id', 'subjects.name as subject_name', 'subjects.type', 'subjects.code', 'class_subject.teacher_id', 'users.name as teacher_name')
            ->orderBy('subjects.name')
            ->get();

        $subjects = [];
        $locked = [];
        foreach ($rows as $row) {
            $subjects[] = [
                'subject_id' => (string) $row->subject_id,
                'name' => $row->subject_name . ($row->code ? " ({$row->code})" : ''),
                'type' => $row->type ?? 'theory',
                'teacher_id' => $row->teacher_id ? (int) $row->teacher_id : null,
                'teacher_name' => $row->teacher_name ?? 'Unassigned',
            ];
            if ($row->teacher_id) {
                $locked[(string) $row->subject_id] = true;
            }
        }

        return [$subjects, $locked];
    }

    private function teacherBusySlots(Organization $organization, int $periodsPerDay, int $periodMinutes, string $startTime): array
    {
        $busy = [];

        Timetable::query()
            ->where('organization_id', $organization->id)
            ->with(['schoolClass:id,room_number'])
            ->get()
            ->each(function (Timetable $entry) use (&$busy, $periodsPerDay, $periodMinutes, $startTime) {
                $start = strtotime($startTime);
                foreach (self::WEEKDAYS as $idx => $day) {
                    if ($entry->day !== $day) {
                        continue;
                    }

                    for ($period = 0; $period < $periodsPerDay; $period++) {
                        $periodStart = date('H:i', $start);
                        $periodEnd = date('H:i', $start + $periodMinutes * 60);

                        if ($entry->start_time >= $periodStart && $entry->start_time < $periodEnd) {
                            $key = $day . '|' . $period;
                            if (!isset($busy[$key])) {
                                $busy[$key] = [];
                            }
                            $busy[$key][] = (int) $entry->teacher_id;
                        }
                        $start += $periodMinutes * 60;
                    }
                }
            });

        return $busy;
    }

    private function classes(Organization $organization): array
    {
        return SchoolClass::query()
            ->forCurrentSession($organization->id)
            ->orderByRaw('CAST(name AS UNSIGNED), name')
            ->orderBy('section')
            ->get()
            ->map(fn (SchoolClass $schoolClass) => [
                'id' => (string) $schoolClass->id,
                'label' => ($schoolClass->name . ($schoolClass->section ? ' - ' . $schoolClass->section : '')),
                'room_number' => $schoolClass->room_number,
            ])
            ->all();
    }

    private function teachers(Organization $organization): array
    {
        return User::query()
            ->where('organization_id', $organization->id)
            ->where('role', 'teacher')
            ->where('status', '!=', 'inactive')
            ->orderBy('name')
            ->get(['id', 'name'])
            ->map(fn (User $user) => ['id' => (string) $user->id, 'label' => $user->name])
            ->all();
    }

    private function organizationsFirstTeacher(Organization $organization, int $classId): int
    {
        $teacherId = DB::table('class_subject')
            ->where('class_id', $classId)
            ->whereNotNull('teacher_id')
            ->value('teacher_id');

        if ($teacherId) {
            return (int) $teacherId;
        }

        $userId = User::query()
            ->where('organization_id', $organization->id)
            ->where('role', 'teacher')
            ->value('id');

        return (int) ($userId ?? 1);
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