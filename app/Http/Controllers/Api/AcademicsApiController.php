<?php

namespace App\Http\Controllers\Api;

use App\Http\Controllers\Controller;
use App\Models\AcademicYear;
use App\Models\AlumniRecord;
use App\Models\Homework;
use App\Models\HomeworkSubmission;
use App\Models\LessonPlan;
use App\Models\Organization;
use App\Models\SchoolClass;
use App\Models\Student;
use App\Models\StudentAcademicHistory;
use App\Models\Subject;
use App\Models\Timetable;
use App\Models\User;
use App\Services\StudentAcademicHistoryService;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\Auth;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Facades\Storage;
use Illuminate\Validation\Rule;
use Illuminate\Validation\ValidationException;

class AcademicsApiController extends Controller
{
    public function __construct(private readonly StudentAcademicHistoryService $studentAcademicHistoryService)
    {
    }

    public function indexClasses(Request $request): JsonResponse
    {
        $user = Auth::user();
        $organization = $this->resolveOrganizationForUser($user);

        if (!$organization) {
            return response()->json(['success' => false, 'message' => 'No organization linked'], 403);
        }

        $classes = SchoolClass::query()
            ->where('organization_id', $organization->id)
            ->with('teacher:id,name')
            ->orderByRaw('CAST(name AS UNSIGNED), name')
            ->orderBy('section')
            ->get()
            ->map(fn (SchoolClass $schoolClass) => [
                'id' => $schoolClass->id,
                'name' => $schoolClass->name,
                'section' => $schoolClass->section,
                'teacher_id' => $schoolClass->class_teacher_id,
                'teacher_name' => $schoolClass->teacher?->name,
                'room_number' => $schoolClass->room_number,
                'capacity' => $schoolClass->capacity,
                'status' => $schoolClass->status,
            ])
            ->all();

        $sections = $this->getSectionRecords($organization);
        $teachers = $this->getTeacherRecords($organization->id);

        return response()->json([
            'success' => true,
            'data' => $classes,
            'sections' => $sections,
            'teachers' => $teachers,
        ]);
    }

    public function storeClass(Request $request): JsonResponse
    {
        $user = Auth::user();
        $organization = $this->resolveOrganizationForUser($user);
        abort_unless($organization, 403);

        $academicYearId = $this->getActiveAcademicYearId($organization->id);
        if (!$academicYearId) {
            return response()->json(['success' => false, 'message' => 'Create and activate an academic session first.'], 400);
        }

        $validated = $request->validate([
            'name' => ['required', 'string', 'max:50'],
            'section' => ['required', 'string', 'max:50'],
            'teacher_id' => ['nullable', Rule::exists('users', 'id')->where(fn ($q) => $q->where('organization_id', $organization->id))],
            'room_number' => ['nullable', 'string', 'max:50'],
            'capacity' => ['nullable', 'integer', 'min:1', 'max:500'],
        ]);

        $class = SchoolClass::query()->create([
            'organization_id' => $organization->id,
            'academic_year_id' => $academicYearId,
            'name' => $validated['name'],
            'section' => $validated['section'],
            'class_teacher_id' => $validated['teacher_id'] ?: null,
            'room_number' => $validated['room_number'] ?? null,
            'capacity' => $validated['capacity'] ?? 30,
            'status' => 'active',
        ]);

        $this->syncSectionSettings($organization, $validated['section']);

        return response()->json(['success' => true, 'message' => 'Class created successfully.', 'data' => [
            'id' => $class->id,
            'name' => $class->name,
            'section' => $class->section,
            'teacher_id' => $class->class_teacher_id,
            'room_number' => $class->room_number,
            'capacity' => $class->capacity,
            'status' => $class->status,
        ]], 201);
    }

    public function updateClass(Request $request, SchoolClass $schoolClass): JsonResponse
    {
        $user = Auth::user();
        $organization = $this->resolveOrganizationForUser($user);
        abort_unless($organization && $schoolClass->organization_id === $organization->id, 403);

        $validated = $request->validate([
            'name' => ['required', 'string', 'max:50'],
            'section' => ['required', 'string', 'max:50'],
            'teacher_id' => ['nullable', Rule::exists('users', 'id')->where(fn ($q) => $q->where('organization_id', $organization->id))],
            'room_number' => ['nullable', 'string', 'max:50'],
            'capacity' => ['nullable', 'integer', 'min:1', 'max:500'],
        ]);

        $schoolClass->update([
            'name' => $validated['name'],
            'section' => $validated['section'],
            'class_teacher_id' => $validated['teacher_id'] ?: null,
            'room_number' => $validated['room_number'] ?? null,
            'capacity' => $validated['capacity'] ?? 30,
        ]);

        $this->syncSectionSettings($organization, $validated['section']);

        return response()->json(['success' => true, 'message' => 'Class updated successfully.', 'data' => [
            'id' => $schoolClass->id,
            'name' => $schoolClass->name,
            'section' => $schoolClass->section,
            'teacher_id' => $schoolClass->class_teacher_id,
            'room_number' => $schoolClass->room_number,
            'capacity' => $schoolClass->capacity,
            'status' => $schoolClass->status,
        ]]);
    }

    public function destroyClass(SchoolClass $schoolClass): JsonResponse
    {
        $user = Auth::user();
        $organization = $this->resolveOrganizationForUser($user);
        abort_unless($organization && $schoolClass->organization_id === $organization->id, 403);

        $schoolClass->delete();
        $this->syncSectionSettings($organization);

        return response()->json(['success' => true, 'message' => 'Class deleted successfully.']);
    }

    public function storeSection(Request $request): JsonResponse
    {
        $user = Auth::user();
        $organization = $this->resolveOrganizationForUser($user);
        abort_unless($organization, 403);

        $validated = $request->validate([
            'name' => ['required', 'string', 'max:50'],
        ]);

        $this->syncSectionSettings($organization, $validated['name']);

        return response()->json(['success' => true, 'message' => 'Section created successfully.', 'data' => ['name' => $validated['name']]], 201);
    }

    public function updateSection(Request $request, string $section): JsonResponse
    {
        $user = Auth::user();
        $organization = $this->resolveOrganizationForUser($user);
        abort_unless($organization, 403);

        $validated = $request->validate([
            'name' => ['required', 'string', 'max:50'],
        ]);

        SchoolClass::query()
            ->where('organization_id', $organization->id)
            ->where('section', $section)
            ->update(['section' => $validated['name']]);

        $existingSections = collect($organization->settings['sections'] ?? [])
            ->map(fn ($item) => $item === $section ? $validated['name'] : $item)
            ->push($validated['name'])
            ->filter()
            ->unique()
            ->sort()
            ->values()
            ->all();

        $organization->update([
            'settings' => [
                ...($organization->settings ?? []),
                'sections' => $existingSections,
            ],
        ]);

        return response()->json(['success' => true, 'message' => 'Section updated successfully.']);
    }

    public function destroySection(string $section): JsonResponse
    {
        $user = Auth::user();
        $organization = $this->resolveOrganizationForUser($user);
        abort_unless($organization, 403);

        $linkedClasses = SchoolClass::query()
            ->where('organization_id', $organization->id)
            ->where('section', $section)
            ->count();

        if ($linkedClasses > 0) {
            return response()->json(['success' => false, 'message' => "Section {$section} is linked to existing classes."], 400);
        }

        $existingSections = collect($organization->settings['sections'] ?? [])
            ->reject(fn ($item) => $item === $section)
            ->values()
            ->all();

        $organization->update([
            'settings' => [
                ...($organization->settings ?? []),
                'sections' => $existingSections,
            ],
        ]);

        return response()->json(['success' => true, 'message' => 'Section deleted successfully.']);
    }

    public function indexSubjects(Request $request): JsonResponse
    {
        $user = Auth::user();
        $organization = $this->resolveOrganizationForUser($user);

        if (!$organization) {
            return response()->json(['success' => false, 'message' => 'No organization linked'], 403);
        }

        $subjects = Subject::query()
            ->where('organization_id', $organization->id)
            ->orderBy('name')
            ->orderBy('code')
            ->get()
            ->map(fn (Subject $subject) => [
                'id' => $subject->id,
                'name' => $subject->name,
                'code' => $subject->code,
                'type' => $subject->type,
                'description' => $subject->description,
                'created_at' => optional($subject->created_at)?->toDateTimeString(),
            ])
            ->all();

        return response()->json(['success' => true, 'data' => $subjects]);
    }

    public function storeSubject(Request $request): JsonResponse
    {
        $user = Auth::user();
        $organization = $this->resolveOrganizationForUser($user);
        abort_unless($organization, 403);

        $validated = $request->validate([
            'name' => ['required', 'string', 'max:100'],
            'code' => ['nullable', 'string', 'max:50'],
            'type' => ['required', Rule::in(['theory', 'practical', 'both'])],
            'description' => ['nullable', 'string', 'max:1000'],
        ]);

        $subject = Subject::query()->create([
            'organization_id' => $organization->id,
            'name' => $validated['name'],
            'code' => $validated['code'] ?: null,
            'type' => $validated['type'],
            'description' => $validated['description'] ?: null,
        ]);

        return response()->json([
            'success' => true,
            'message' => 'Subject created successfully.',
            'data' => [
                'id' => $subject->id,
                'name' => $subject->name,
                'code' => $subject->code,
                'type' => $subject->type,
                'description' => $subject->description,
            ],
        ], 201);
    }

    public function updateSubject(Request $request, Subject $subject): JsonResponse
    {
        $user = Auth::user();
        $organization = $this->resolveOrganizationForUser($user);
        abort_unless($organization && $subject->organization_id === $organization->id, 403);

        $validated = $request->validate([
            'name' => ['required', 'string', 'max:100'],
            'code' => ['nullable', 'string', 'max:50'],
            'type' => ['required', Rule::in(['theory', 'practical', 'both'])],
            'description' => ['nullable', 'string', 'max:1000'],
        ]);

        $subject->update([
            'name' => $validated['name'],
            'code' => $validated['code'] ?: null,
            'type' => $validated['type'],
            'description' => $validated['description'] ?: null,
        ]);

        return response()->json([
            'success' => true,
            'message' => 'Subject updated successfully.',
            'data' => [
                'id' => $subject->id,
                'name' => $subject->name,
                'code' => $subject->code,
                'type' => $subject->type,
                'description' => $subject->description,
            ],
        ]);
    }

    public function destroySubject(Subject $subject): JsonResponse
    {
        $user = Auth::user();
        $organization = $this->resolveOrganizationForUser($user);
        abort_unless($organization && $subject->organization_id === $organization->id, 403);

        $subject->delete();

        return response()->json(['success' => true, 'message' => 'Subject deleted successfully.']);
    }

    public function indexTimetable(Request $request): JsonResponse
    {
        $user = Auth::user();
        $organization = $this->resolveOrganizationForUser($user);

        if (!$organization) {
            return response()->json(['success' => false, 'message' => 'No organization linked'], 403);
        }

        $classId = $request->query('class_id');
        $teacherId = $user->role === 'teacher' ? (string) $user->id : $request->query('teacher_id');

        $query = Timetable::query()
            ->where('organization_id', $organization->id)
            ->with([
                'schoolClass:id,name,section,room_number',
                'subject:id,name,code',
                'teacher:id,name',
            ])
            ->orderBy('day')
            ->orderBy('period_order')
            ->orderBy('start_time')
            ->orderBy('id');

        if ($classId) {
            $query->where('class_id', $classId);
        }
        if ($teacherId) {
            $query->where('teacher_id', $teacherId);
        }

        $entries = $query->get()
            ->map(fn (Timetable $entry) => [
                'id' => (string) $entry->id,
                'classId' => (string) $entry->class_id,
                'className' => $entry->schoolClass?->name,
                'section' => $entry->schoolClass?->section,
                'day' => ucfirst($entry->day),
                'periodId' => (string) ($entry->period_code ?: ''),
                'periodOrder' => $entry->period_order,
                'subject' => $entry->subject?->name ?? 'Subject',
                'subjectId' => $entry->subject_id ? (string) $entry->subject_id : '',
                'teacherId' => $entry->teacher_id ? (string) $entry->teacher_id : '',
                'teacherName' => $entry->teacher?->name ?? 'Teacher not assigned',
                'room' => $entry->room_number ?? ($entry->schoolClass?->room_number ?? 'TBD'),
                'startTime' => substr((string) $entry->start_time, 0, 5),
                'endTime' => substr((string) $entry->end_time, 0, 5),
            ])
            ->values()
            ->all();

        $classes = $this->getClassRecords($organization->id);
        $teachers = $this->getTeacherRecords($organization->id);
        $subjects = $this->getSubjectRecords($organization->id);

        return response()->json([
            'success' => true,
            'data' => $entries,
            'classes' => $classes,
            'teachers' => $teachers,
            'subjects' => $subjects,
        ]);
    }

    public function storeTimetableEntry(Request $request): JsonResponse
    {
        $user = Auth::user();
        $this->abortUnlessCanManageTimetables($user);
        $organization = $this->resolveOrganizationForUser($user);
        abort_unless($organization, 403);

        $validated = $this->validateTimetablePayload($request, $organization, null);

        $entry = Timetable::query()->create([
            ...$validated,
            'organization_id' => $organization->id,
        ]);

        return response()->json(['success' => true, 'message' => 'Timetable entry created.', 'data' => [
            'id' => (string) $entry->id,
            'classId' => (string) $entry->class_id,
            'day' => ucfirst($entry->day),
            'periodId' => $entry->period_code,
            'subjectId' => (string) $entry->subject_id,
            'teacherId' => (string) $entry->teacher_id,
            'room' => $entry->room_number,
            'startTime' => $entry->start_time,
            'endTime' => $entry->end_time,
        ]], 201);
    }

    public function updateTimetableEntry(Request $request, Timetable $timetable): JsonResponse
    {
        $user = Auth::user();
        $this->abortUnlessCanManageTimetables($user);
        $organization = $this->resolveOrganizationForUser($user);
        abort_unless($organization && $timetable->organization_id === $organization->id, 403);

        $validated = $this->validateTimetablePayload($request, $organization, $timetable);
        $timetable->update($validated);

        return response()->json(['success' => true, 'message' => 'Timetable entry updated.', 'data' => [
            'id' => (string) $timetable->id,
            'classId' => (string) $timetable->class_id,
            'day' => ucfirst($timetable->day),
            'periodId' => $timetable->period_code,
            'subjectId' => (string) $timetable->subject_id,
            'teacherId' => (string) $timetable->teacher_id,
            'room' => $timetable->room_number,
            'startTime' => $timetable->start_time,
            'endTime' => $timetable->end_time,
        ]]);
    }

    public function destroyTimetableEntry(Timetable $timetable): JsonResponse
    {
        $user = Auth::user();
        $this->abortUnlessCanManageTimetables($user);
        $organization = $this->resolveOrganizationForUser($user);
        abort_unless($organization && $timetable->organization_id === $organization->id, 403);

        $timetable->delete();

        return response()->json(['success' => true, 'message' => 'Timetable entry deleted.']);
    }

    public function indexLessonPlans(Request $request): JsonResponse
    {
        $user = Auth::user();
        $organization = $this->resolveOrganizationForUser($user);

        if (!$organization) {
            return response()->json(['success' => false, 'message' => 'No organization linked'], 403);
        }

        $classId = $request->query('class_id');
        $teacherId = $user->role === 'teacher' ? (string) $user->id : $request->query('teacher_id');
        $status = $request->query('status');

        $query = LessonPlan::query()
            ->where('organization_id', $organization->id)
            ->with([
                'timetable:id,class_id,subject_id,teacher_id,day,period_code,start_time,end_time,room_number',
                'subject:id,name',
                'teacher:id,name',
            ])
            ->orderBy('lesson_date')
            ->orderBy('id');

        if ($classId) {
            $query->where('class_id', $classId);
        }
        if ($teacherId) {
            $query->where('teacher_id', $teacherId);
        }
        if ($status) {
            $query->where('status', $status);
        }

        $plans = $query->get()
            ->map(fn (LessonPlan $plan) => [
                'id' => (string) $plan->id,
                'timetableEntryId' => $plan->timetable_id ? (string) $plan->timetable_id : '',
                'classId' => (string) $plan->class_id,
                'day' => ucfirst((string) ($plan->timetable?->day ?? '')),
                'periodId' => (string) ($plan->timetable?->period_code ?? ''),
                'subject' => (string) ($plan->subject?->name ?? 'Subject'),
                'teacherName' => (string) ($plan->teacher?->name ?? 'Teacher'),
                'room' => (string) ($plan->timetable?->room_number ?? 'TBD'),
                'startTime' => substr((string) ($plan->timetable?->start_time ?? ''), 0, 5),
                'endTime' => substr((string) ($plan->timetable?->end_time ?? ''), 0, 5),
                'lessonDate' => optional($plan->lesson_date)->format('Y-m-d') ?? '',
                'lessonTitle' => $plan->lesson_title,
                'topic' => $plan->topic,
                'status' => $plan->status,
                'remarks' => $plan->remarks,
            ])
            ->values()
            ->all();

        $classes = $this->getClassRecords($organization->id);
        $teachers = $this->getTeacherRecords($organization->id);
        $timetableEntries = $this->getTimetableEntries($organization->id);

        return response()->json([
            'success' => true,
            'data' => $plans,
            'classes' => $classes,
            'teachers' => $teachers,
            'timetable_entries' => $timetableEntries,
        ]);
    }

    public function storeLessonPlan(Request $request): JsonResponse
    {
        $user = Auth::user();
        $organization = $this->resolveOrganizationForUser($user);
        abort_unless($organization, 403);

        $validated = $request->validate([
            'timetable_entry_id' => [
                'required',
                Rule::exists('timetables', 'id')->where(fn ($q) => $q->where('organization_id', $organization->id)),
            ],
            'lesson_date' => ['required', 'date'],
            'lesson_title' => ['required', 'string', 'max:255'],
            'topic' => ['required', 'string', 'max:2000'],
            'status' => ['required', Rule::in(['planned', 'in_progress', 'completed', 'carried_forward'])],
            'remarks' => ['nullable', 'string', 'max:2000'],
        ]);

        $timetable = Timetable::query()
            ->where('organization_id', $organization->id)
            ->findOrFail((int) $validated['timetable_entry_id']);
        $this->abortUnlessCanManageLessonPlanForTimetable($user, $timetable);

        $plan = LessonPlan::query()->create([
            'organization_id' => $organization->id,
            'timetable_id' => $timetable->id,
            'class_id' => $timetable->class_id,
            'subject_id' => $timetable->subject_id,
            'teacher_id' => $timetable->teacher_id,
            'lesson_date' => $validated['lesson_date'],
            'lesson_title' => $validated['lesson_title'],
            'topic' => $validated['topic'],
            'status' => $validated['status'],
            'remarks' => $validated['remarks'] ?? null,
            'created_by' => $user->id,
            'updated_by' => $user->id,
        ]);

        return response()->json(['success' => true, 'message' => 'Lesson plan created.', 'data' => [
            'id' => (string) $plan->id,
            'timetableEntryId' => (string) $plan->timetable_id,
            'lessonDate' => $plan->lesson_date->format('Y-m-d'),
            'lessonTitle' => $plan->lesson_title,
            'topic' => $plan->topic,
            'status' => $plan->status,
        ]], 201);
    }

    public function updateLessonPlan(Request $request, LessonPlan $lessonPlan): JsonResponse
    {
        $user = Auth::user();
        $organization = $this->resolveOrganizationForUser($user);
        abort_unless($organization && $lessonPlan->organization_id === $organization->id, 403);
        $this->abortUnlessCanManageLessonPlanRecord($user, $lessonPlan);

        $validated = $request->validate([
            'timetable_entry_id' => [
                'required',
                Rule::exists('timetables', 'id')->where(fn ($q) => $q->where('organization_id', $organization->id)),
            ],
            'lesson_date' => ['required', 'date'],
            'lesson_title' => ['required', 'string', 'max:255'],
            'topic' => ['required', 'string', 'max:2000'],
            'status' => ['required', Rule::in(['planned', 'in_progress', 'completed', 'carried_forward'])],
            'remarks' => ['nullable', 'string', 'max:2000'],
        ]);

        $timetable = Timetable::query()
            ->where('organization_id', $organization->id)
            ->findOrFail((int) $validated['timetable_entry_id']);
        $this->abortUnlessCanManageLessonPlanForTimetable($user, $timetable);

        $lessonPlan->update([
            'timetable_id' => $timetable->id,
            'class_id' => $timetable->class_id,
            'subject_id' => $timetable->subject_id,
            'teacher_id' => $timetable->teacher_id,
            'lesson_date' => $validated['lesson_date'],
            'lesson_title' => $validated['lesson_title'],
            'topic' => $validated['topic'],
            'status' => $validated['status'],
            'remarks' => $validated['remarks'] ?? null,
            'updated_by' => $user->id,
        ]);

        return response()->json(['success' => true, 'message' => 'Lesson plan updated.', 'data' => [
            'id' => (string) $lessonPlan->id,
            'timetableEntryId' => (string) $lessonPlan->timetable_id,
            'lessonDate' => $lessonPlan->lesson_date->format('Y-m-d'),
            'lessonTitle' => $lessonPlan->lesson_title,
            'topic' => $lessonPlan->topic,
            'status' => $lessonPlan->status,
        ]]);
    }

    public function destroyLessonPlan(LessonPlan $lessonPlan): JsonResponse
    {
        $user = Auth::user();
        $organization = $this->resolveOrganizationForUser($user);
        abort_unless($organization && $lessonPlan->organization_id === $organization->id, 403);
        $this->abortUnlessCanManageLessonPlanRecord($user, $lessonPlan);

        $lessonPlan->delete();

        return response()->json(['success' => true, 'message' => 'Lesson plan deleted.']);
    }

    public function indexHomework(Request $request): JsonResponse
    {
        $user = Auth::user();
        $organization = $this->resolveOrganizationForUser($user);
        abort_unless($organization, 403);

        $studentRecord = $user->role === 'student' ? $this->resolveStudentRecord($user, $organization) : null;

        $query = Homework::query()
            ->where('organization_id', $organization->id)
            ->with(['schoolClass:id,name,section', 'subject:id,name', 'teacher:id,name', 'submissions.student.schoolClass:id,name,section'])
            ->latest('assign_date')
            ->latest('id');

        if ($studentRecord) {
            $query->where('class_id', $studentRecord['classId']);
        }

        $homeworkRecords = $query->get()->map(function (Homework $homework) use ($studentRecord) {
            $studentSubmission = null;
            if ($studentRecord) {
                $studentSubmission = $homework->submissions->firstWhere('student_id', (int) $studentRecord['id']);
            }

            return [
                'id' => (string) $homework->id,
                'classId' => (string) $homework->class_id,
                'className' => (string) ($homework->schoolClass?->name ?? ''),
                'section' => (string) ($homework->schoolClass?->section ?? ''),
                'subjectName' => (string) ($homework->subject?->name ?? ''),
                'teacherName' => (string) ($homework->teacher?->name ?? ''),
                'assignDate' => optional($homework->assign_date)->format('Y-m-d') ?? '',
                'dueDate' => optional($homework->due_date)->format('Y-m-d') ?? '',
                'maxMarks' => $homework->max_marks !== null ? (string) $homework->max_marks : '',
                'description' => $homework->description,
                'hasAttachment' => count($homework->attachments ?? []) > 0,
                'attachmentName' => $homework->attachments[0]['name'] ?? '',
                'submissionStatus' => $studentSubmission?->status ?? 'pending',
                'marksObtained' => $studentSubmission?->marks_obtained !== null ? (string) $studentSubmission->marks_obtained : '',
                'teacherRemarks' => $studentSubmission?->teacher_remarks ?? '',
                'submissionText' => $studentSubmission?->submission_text ?? '',
                'submittedAt' => optional($studentSubmission?->submitted_at)->format('Y-m-d H:i') ?? '',
                'submissionId' => $studentSubmission ? (string) $studentSubmission->id : '',
            ];
        })->all();

        $classRecords = SchoolClass::query()
            ->where('organization_id', $organization->id)
            ->orderByRaw('CAST(name AS UNSIGNED), name')
            ->orderBy('section')
            ->get()
            ->map(fn (SchoolClass $class) => [
                'id' => (string) $class->id,
                'name' => (string) $class->name,
                'section' => (string) $class->section,
            ])
            ->all();

        $subjectRecords = Subject::query()
            ->where('organization_id', $organization->id)
            ->orderBy('name')
            ->get()
            ->map(fn (Subject $subject) => [
                'id' => (string) $subject->id,
                'name' => (string) $subject->name,
            ])
            ->all();

        return response()->json([
            'success' => true,
            'data' => $homeworkRecords,
            'classes' => $classRecords,
            'subjects' => $subjectRecords,
            'student_record' => $studentRecord,
        ]);
    }

    public function storeHomework(Request $request): JsonResponse
    {
        $user = Auth::user();
        $organization = $this->resolveOrganizationForUser($user);
        abort_unless($organization, 403);

        $validated = $request->validate([
            'class_id' => ['required', Rule::exists('classes', 'id')->where(fn ($q) => $q->where('organization_id', $organization->id))],
            'subject_id' => ['required', Rule::exists('subjects', 'id')->where(fn ($q) => $q->where('organization_id', $organization->id))],
            'assign_date' => ['required', 'date'],
            'due_date' => ['required', 'date', 'after_or_equal:assign_date'],
            'max_marks' => ['nullable', 'numeric', 'min:0', 'max:1000'],
            'description' => ['required', 'string', 'max:5000'],
        ]);

        $schoolClass = SchoolClass::query()
            ->where('organization_id', $organization->id)
            ->findOrFail((int) $validated['class_id']);

        $subject = Subject::query()
            ->where('organization_id', $organization->id)
            ->findOrFail((int) $validated['subject_id']);

        $homework = Homework::query()->create([
            'organization_id' => $organization->id,
            'class_id' => $schoolClass->id,
            'subject_id' => $subject->id,
            'teacher_id' => $user->id,
            'title' => sprintf('%s Homework - %s', $subject->name, $validated['assign_date']),
            'description' => $validated['description'],
            'assign_date' => $validated['assign_date'],
            'due_date' => $validated['due_date'],
            'attachments' => [],
            'max_marks' => $validated['max_marks'] ?? null,
        ]);

        return response()->json([
            'success' => true,
            'message' => 'Homework created successfully.',
            'data' => [
                'id' => (string) $homework->id,
                'classId' => (string) $homework->class_id,
                'className' => $schoolClass->name,
                'subjectName' => $subject->name,
                'assignDate' => $homework->assign_date->format('Y-m-d'),
                'dueDate' => $homework->due_date->format('Y-m-d'),
                'maxMarks' => $homework->max_marks,
                'description' => $homework->description,
            ],
        ], 201);
    }

    public function submitHomework(Request $request, Homework $homework): JsonResponse
    {
        $user = Auth::user();
        $organization = $this->resolveOrganizationForUser($user);
        abort_unless($organization && $homework->organization_id === $organization->id, 403);

        $student = $this->resolveStudentModel($user, $organization);
        abort_unless($student, 403);

        $validated = $request->validate([
            'submission_text' => ['nullable', 'string', 'max:5000'],
        ]);

        if (!filled($validated['submission_text'] ?? null)) {
            return response()->json(['success' => false, 'message' => 'Please add submission text.'], 400);
        }

        $status = now()->toDateString() > optional($homework->due_date)->format('Y-m-d') ? 'late' : 'submitted';

        $submission = HomeworkSubmission::query()->updateOrCreate(
            [
                'homework_id' => $homework->id,
                'student_id' => $student->id,
            ],
            [
                'submission_text' => $validated['submission_text'],
                'attachments' => [],
                'submitted_at' => now(),
                'status' => $status,
            ]
        );

        return response()->json(['success' => true, 'message' => 'Homework submitted.', 'data' => [
            'id' => (string) $submission->id,
            'status' => $submission->status,
            'submittedAt' => optional($submission->submitted_at)->format('Y-m-d H:i'),
        ]]);
    }

    public function evaluateHomework(Request $request, HomeworkSubmission $homeworkSubmission): JsonResponse
    {
        $user = Auth::user();
        $organization = $this->resolveOrganizationForUser($user);
        abort_unless($organization && $homeworkSubmission->homework?->organization_id === $organization->id, 403);

        $validated = $request->validate([
            'marks_obtained' => ['nullable', 'numeric', 'min:0', 'max:1000'],
            'teacher_remarks' => ['nullable', 'string', 'max:5000'],
        ]);

        $homeworkSubmission->update([
            'marks_obtained' => $validated['marks_obtained'] ?? null,
            'teacher_remarks' => $validated['teacher_remarks'] ?? null,
            'status' => 'evaluated',
            'evaluated_by' => $user->id,
        ]);

        return response()->json(['success' => true, 'message' => 'Homework evaluated.']);
    }

    public function getSubmissionsForHomework(Homework $homework): JsonResponse
    {
        $user = Auth::user();
        $organization = $this->resolveOrganizationForUser($user);
        abort_unless($organization && $homework->organization_id === $organization->id, 403);

        $submissions = HomeworkSubmission::query()
            ->where('homework_id', $homework->id)
            ->with(['student.schoolClass:id,name,section'])
            ->latest('submitted_at')
            ->get()
            ->map(fn (HomeworkSubmission $s) => [
                'id' => (string) $s->id,
                'studentName' => trim(($s->student?->first_name ?? '') . ' ' . ($s->student?->last_name ?? '')),
                'className' => (string) ($s->student?->schoolClass?->name ?? ''),
                'section' => (string) ($s->student?->schoolClass?->section ?? ''),
                'submittedAt' => optional($s->submitted_at)->format('Y-m-d H:i') ?? '',
                'status' => $s->status,
                'submissionText' => $s->submission_text ?? '',
                'marksObtained' => $s->marks_obtained !== null ? (string) $s->marks_obtained : '',
                'teacherRemarks' => $s->teacher_remarks ?? '',
            ])
            ->all();

        return response()->json(['success' => true, 'data' => $submissions]);
    }

    public function promoteStudents(Request $request): JsonResponse
    {
        $user = Auth::user();
        $organization = $this->resolveOrganizationForUser($user);
        if (!$organization) {
            return response()->json(['success' => false, 'message' => 'No organization linked'], 403);
        }

        $validated = $request->validate([
            'from_class' => ['required', 'string', 'max:255'],
            'to_class' => ['required', 'string', 'max:255', 'different:from_class'],
            'target_session' => ['required', 'string', 'max:255'],
            'student_ids' => ['required', 'array', 'min:1'],
            'student_ids.*' => ['required', 'integer'],
        ]);

        $students = Student::query()
            ->where('organization_id', $organization->id)
            ->whereIn('id', $validated['student_ids'])
            ->with('schoolClass:id,name,section')
            ->get();

        $eligibleStudents = $students->filter(fn (Student $student) => $student->schoolClass?->name === $validated['from_class']);

        if ($eligibleStudents->isEmpty()) {
            return response()->json(['success' => false, 'message' => 'No matching students found.'], 400);
        }

        $targetAcademicYear = AcademicYear::query()
            ->where('organization_id', $organization->id)
            ->where('name', $validated['target_session'])
            ->first();

        if (!$targetAcademicYear) {
            return response()->json(['success' => false, 'message' => 'Target session not found.'], 400);
        }

        $targetClasses = SchoolClass::query()
            ->where('organization_id', $organization->id)
            ->where('academic_year_id', $targetAcademicYear->id)
            ->where('name', $validated['to_class'])
            ->where('status', 'active')
            ->get()
            ->keyBy('section');

        if ($targetClasses->isEmpty()) {
            return response()->json(['success' => false, 'message' => "Create target class {$validated['to_class']} before promoting students."], 400);
        }

        DB::transaction(function () use ($eligibleStudents, $targetClasses, $targetAcademicYear, $validated) {
            foreach ($eligibleStudents as $student) {
                $section = $student->schoolClass?->section;
                $targetClass = $section ? $targetClasses->get($section) : null;
                if (!$targetClass) continue;

                $student->update(['class_id' => $targetClass->id, 'status' => $student->status === 'inactive' ? 'inactive' : 'active']);

                $this->studentAcademicHistoryService->promoteStudent(
                    $student->fresh('schoolClass'),
                    $targetClass,
                    $targetAcademicYear,
                    sprintf('Promoted from Class %s to Class %s for session %s.', $validated['from_class'], $validated['to_class'], $validated['target_session'])
                );
            }
        });

        return response()->json([
            'success' => true,
            'message' => $eligibleStudents->count() . ' student(s) promoted successfully.',
        ]);
    }

    public function saveToAlumni(Request $request): JsonResponse
    {
        $user = Auth::user();
        $organization = $this->resolveOrganizationForUser($user);
        if (!$organization) {
            return response()->json(['success' => false, 'message' => 'No organization linked'], 403);
        }

        $validated = $request->validate([
            'from_class' => ['required', 'string', 'max:255'],
            'target_session' => ['required', 'string', 'max:255'],
            'student_ids' => ['required', 'array', 'min:1'],
            'student_ids.*' => ['required', 'integer'],
        ]);

        $students = Student::query()
            ->where('organization_id', $organization->id)
            ->whereIn('id', $validated['student_ids'])
            ->with('schoolClass:id,name,section')
            ->get();

        $eligibleStudents = $students->filter(fn (Student $student) => $student->schoolClass?->name === $validated['from_class']);

        if ($eligibleStudents->isEmpty()) {
            return response()->json(['success' => false, 'message' => 'No matching students found.'], 400);
        }

        $academicYearId = AcademicYear::query()
            ->where('organization_id', $organization->id)
            ->where('name', $validated['target_session'])
            ->value('id');

        foreach ($eligibleStudents as $student) {
            AlumniRecord::query()->updateOrCreate(
                ['organization_id' => $organization->id, 'student_id' => $student->id, 'session' => $validated['target_session']],
                [
                    'academic_year_id' => $academicYearId,
                    'admission_no' => $student->admission_no,
                    'first_name' => $student->first_name,
                    'last_name' => $student->last_name,
                    'email' => $student->email,
                    'phone' => $student->phone,
                    'class' => $student->schoolClass?->name,
                    'section' => $student->schoolClass?->section,
                    'passing_year' => $validated['target_session'],
                    'alumni_status' => 'left_school',
                    'current_city' => $student->city,
                    'organization_name' => 'Left School',
                ]
            );
        }

        return response()->json([
            'success' => true,
            'message' => $eligibleStudents->count() . ' student(s) saved to alumni.',
        ]);
    }

    public function getPromoteData(Request $request): JsonResponse
    {
        $user = Auth::user();
        $organization = $this->resolveOrganizationForUser($user);
        if (!$organization) {
            return response()->json(['success' => false, 'message' => 'No organization linked'], 403);
        }

        $classRecords = SchoolClass::query()
            ->where('organization_id', $organization->id)
            ->where('status', 'active')
            ->with('academicYear:id,name')
            ->orderByRaw('CAST(name AS UNSIGNED), name')
            ->orderBy('section')
            ->get(['id', 'name', 'section', 'academic_year_id'])
            ->map(fn (SchoolClass $sc) => [
                'id' => $sc->id,
                'name' => $sc->name,
                'section' => $sc->section,
                'session' => $sc->academicYear?->name,
                'academic_year_id' => $sc->academic_year_id,
            ]);

        $activeAcademicYearId = AcademicYear::query()
            ->where('organization_id', $organization->id)
            ->where('is_current', true)
            ->value('id');

        if ($activeAcademicYearId) {
            $studentRecords = StudentAcademicHistory::query()
                ->where('organization_id', $organization->id)
                ->where('academic_year_id', $activeAcademicYearId)
                ->with(['student:id,organization_id,admission_no,first_name,last_name,roll_number,status', 'schoolClass:id,name,section', 'academicYear:id,name'])
                ->orderBy('roll_number')
                ->orderByDesc('effective_date')
                ->orderByDesc('id')
                ->get()
                ->unique('student_id')
                ->map(function (StudentAcademicHistory $history) {
                    $student = $history->student;
                    if (!$student) return null;
                    return [
                        'id' => (string) $student->id,
                        'session' => $history->session ?: $history->academicYear?->name,
                        'admission_no' => $student->admission_no,
                        'first_name' => $student->first_name,
                        'last_name' => $student->last_name,
                        'class' => $history->schoolClass?->name,
                        'section' => $history->schoolClass?->section,
                        'roll_number' => $history->roll_number ?: $student->roll_number,
                        'status' => $history->status ?: $student->status,
                    ];
                })
                ->filter()
                ->sortBy([['first_name', 'asc'], ['last_name', 'asc']])
                ->values();
        } else {
            $studentRecords = Student::query()
                ->where('organization_id', $organization->id)
                ->with('schoolClass:id,name,section,academic_year_id', 'schoolClass.academicYear:id,name')
                ->orderBy('first_name')
                ->orderBy('last_name')
                ->get()
                ->map(function (Student $student) {
                    return [
                        'id' => (string) $student->id,
                        'session' => $student->schoolClass?->academicYear?->name,
                        'admission_no' => $student->admission_no,
                        'first_name' => $student->first_name,
                        'last_name' => $student->last_name,
                        'class' => $student->schoolClass?->name,
                        'section' => $student->schoolClass?->section,
                        'roll_number' => $student->roll_number,
                        'status' => $student->status,
                    ];
                })
                ->values();
        }

        $sessions = AcademicYear::query()
            ->where('organization_id', $organization->id)
            ->orderByDesc('is_current')
            ->orderByDesc('start_date')
            ->pluck('name')
            ->filter()
            ->values()
            ->all();

        if (empty($sessions)) {
            $sessions = collect($organization->settings['sessions'] ?? [])
                ->filter()
                ->values()
                ->all();
        }

        return response()->json([
            'success' => true,
            'classes' => $classRecords,
            'students' => $studentRecords,
            'sessions' => $sessions,
        ]);
    }

    private function resolveOrganizationForUser(User $user): ?Organization
    {
        if ($user->organization_id) {
            return Organization::query()->find($user->organization_id);
        }

        if ($user->role === 'student') {
            $studentOrganizationId = Student::query()
                ->where(fn ($q) => $q->where('user_id', $user->id)->orWhere('email', $user->email))
                ->value('organization_id');

            if ($studentOrganizationId) {
                $user->forceFill(['organization_id' => $studentOrganizationId])->save();
                $user->organization_id = $studentOrganizationId;
                return Organization::query()->find($studentOrganizationId);
            }
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

    private function getActiveAcademicYearId(int $organizationId): ?int
    {
        return AcademicYear::query()
            ->where('organization_id', $organizationId)
            ->where('is_current', true)
            ->value('id');
    }

    private function getClassRecords(int $organizationId): array
    {
        return SchoolClass::query()
            ->where('organization_id', $organizationId)
            ->with('teacher:id,name')
            ->orderByRaw('CAST(name AS UNSIGNED), name')
            ->orderBy('section')
            ->get()
            ->map(fn (SchoolClass $sc) => [
                'id' => $sc->id,
                'name' => $sc->name,
                'section' => $sc->section,
                'teacher_id' => $sc->class_teacher_id,
                'teacher_name' => $sc->teacher?->name,
                'room_number' => $sc->room_number,
                'capacity' => $sc->capacity,
                'status' => $sc->status,
            ])
            ->all();
    }

    private function getTeacherRecords(int $organizationId): array
    {
        return User::query()
            ->where('organization_id', $organizationId)
            ->where('role', 'teacher')
            ->where('status', '!=', 'inactive')
            ->orderBy('name')
            ->get()
            ->map(fn (User $teacher) => [
                'id' => (string) $teacher->id,
                'name' => $teacher->name,
                'email' => $teacher->email,
                'status' => $teacher->status ?? 'active',
            ])
            ->all();
    }

    private function getSubjectRecords(int $organizationId): array
    {
        return Subject::query()
            ->where('organization_id', $organizationId)
            ->orderBy('name')
            ->get()
            ->map(fn (Subject $subject) => [
                'id' => (string) $subject->id,
                'name' => $subject->name,
                'code' => $subject->code,
            ])
            ->all();
    }

    private function getTimetableEntries(int $organizationId): array
    {
        return Timetable::query()
            ->where('organization_id', $organizationId)
            ->with(['schoolClass:id,name,section,room_number', 'subject:id,name,code', 'teacher:id,name'])
            ->orderBy('day')
            ->orderBy('period_order')
            ->get()
            ->map(fn (Timetable $entry) => [
                'id' => (string) $entry->id,
                'classId' => (string) $entry->class_id,
                'day' => ucfirst($entry->day),
                'periodId' => (string) ($entry->period_code ?: ''),
                'subject' => $entry->subject?->name ?? 'Subject',
                'subjectId' => $entry->subject_id ? (string) $entry->subject_id : '',
                'teacherId' => $entry->teacher_id ? (string) $entry->teacher_id : '',
                'teacherName' => $entry->teacher?->name ?? 'Teacher not assigned',
                'room' => $entry->room_number ?? ($entry->schoolClass?->room_number ?? 'TBD'),
                'startTime' => substr((string) $entry->start_time, 0, 5),
                'endTime' => substr((string) $entry->end_time, 0, 5),
            ])
            ->values()
            ->all();
    }

    private function getSectionRecords(Organization $organization): array
    {
        $classSections = SchoolClass::query()
            ->where('organization_id', $organization->id)
            ->pluck('section')
            ->all();

        return collect([...($organization->settings['sections'] ?? []), ...$classSections])
            ->filter()
            ->unique()
            ->sort()
            ->values()
            ->all();
    }

    private function syncSectionSettings(Organization $organization, ?string $newSection = null): void
    {
        $classSections = SchoolClass::query()
            ->where('organization_id', $organization->id)
            ->pluck('section')
            ->all();

        $sections = collect([...($organization->settings['sections'] ?? []), ...$classSections, $newSection])
            ->filter()
            ->unique()
            ->sort()
            ->values()
            ->all();

        $organization->update([
            'settings' => [
                ...($organization->settings ?? []),
                'sections' => $sections,
            ],
        ]);
    }

    private function validateTimetablePayload(Request $request, Organization $organization, ?Timetable $currentEntry): array
    {
        $validated = $request->validate([
            'class_id' => [
                'required',
                Rule::exists('classes', 'id')->where(fn ($q) => $q->where('organization_id', $organization->id)),
            ],
            'day' => ['required', Rule::in(['Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday'])],
            'period_code' => ['required', 'string', 'max:20', 'regex:/^p[1-9]\d*$/i'],
            'subject_id' => [
                'required',
                Rule::exists('subjects', 'id')->where(fn ($q) => $q->where('organization_id', $organization->id)),
            ],
            'teacher_id' => [
                'required',
                Rule::exists('users', 'id')->where(fn ($q) => $q->where('organization_id', $organization->id)->where('role', 'teacher')),
            ],
            'room_number' => ['nullable', 'string', 'max:50'],
            'start_time' => ['required', 'date_format:H:i'],
            'end_time' => ['required', 'date_format:H:i', 'after:start_time'],
        ]);

        $validated['period_code'] = strtolower($validated['period_code']);

        $periodOrder = (int) preg_replace('/\D+/', '', $validated['period_code']);
        if ($periodOrder <= 0) {
            $periodOrder = 1;
        }

        $dayLower = strtolower($validated['day']);

        $duplicateClassEntry = Timetable::query()
            ->where('organization_id', $organization->id)
            ->where('class_id', $validated['class_id'])
            ->where('day', $dayLower)
            ->where('period_code', $validated['period_code'])
            ->with(['subject:id,name', 'teacher:id,name'])
            ->when($currentEntry, fn ($q) => $q->where('id', '!=', $currentEntry->id))
            ->first();

        if ($duplicateClassEntry) {
            throw ValidationException::withMessages([
                'period_code' => sprintf(
                    'This class already has %s with %s scheduled for %s - %s in %s on %s %s.',
                    $duplicateClassEntry->subject?->name ?? 'a subject',
                    $duplicateClassEntry->teacher?->name ?? 'an assigned teacher',
                    substr((string) $duplicateClassEntry->start_time, 0, 5),
                    substr((string) $duplicateClassEntry->end_time, 0, 5),
                    $duplicateClassEntry->room_number ?: 'the saved room',
                    ucfirst((string) $duplicateClassEntry->day),
                    strtoupper((string) $duplicateClassEntry->period_code),
                ),
            ]);
        }

        $overlappingClassEntry = Timetable::query()
            ->where('organization_id', $organization->id)
            ->where('class_id', $validated['class_id'])
            ->where('day', $dayLower)
            ->where('start_time', '<', $validated['end_time'])
            ->where('end_time', '>', $validated['start_time'])
            ->when($currentEntry, fn ($q) => $q->where('id', '!=', $currentEntry->id))
            ->exists();

        if ($overlappingClassEntry) {
            throw ValidationException::withMessages([
                'start_time' => 'This class already has another timetable entry that overlaps with the selected time.',
            ]);
        }

        return [
            'class_id' => (int) $validated['class_id'],
            'subject_id' => (int) $validated['subject_id'],
            'teacher_id' => (int) $validated['teacher_id'],
            'day' => $dayLower,
            'period_code' => $validated['period_code'],
            'period_order' => $periodOrder,
            'start_time' => $validated['start_time'],
            'end_time' => $validated['end_time'],
            'room_number' => $validated['room_number'] ?: null,
            'period_type' => 'lecture',
        ];
    }

    private function abortUnlessCanManageTimetables(User $user): void
    {
        abort_unless(in_array($user->role, ['admin', 'super_admin'], true), 403);
    }

    private function abortUnlessCanManageLessonPlanForTimetable(User $user, Timetable $timetable): void
    {
        if (in_array($user->role, ['admin', 'super_admin'], true)) {
            return;
        }

        abort_unless($user->role === 'teacher' && $timetable->teacher_id === $user->id, 403);
    }

    private function abortUnlessCanManageLessonPlanRecord(User $user, LessonPlan $lessonPlan): void
    {
        if (in_array($user->role, ['admin', 'super_admin'], true)) {
            return;
        }

        abort_unless($user->role === 'teacher' && $lessonPlan->teacher_id === $user->id, 403);
    }

    private function resolveStudentModel(User $user, Organization $organization): ?Student
    {
        return Student::query()
            ->where('organization_id', $organization->id)
            ->where(fn ($q) => $q->where('user_id', $user->id)->orWhere('email', $user->email))
            ->first();
    }

    private function resolveStudentRecord(User $user, Organization $organization): ?array
    {
        $student = Student::query()
            ->with('schoolClass:id,name,section')
            ->where('organization_id', $organization->id)
            ->where(fn ($q) => $q->where('user_id', $user->id)->orWhere('email', $user->email))
            ->first();

        if (!$student) return null;

        return [
            'id' => (string) $student->id,
            'classId' => (string) $student->class_id,
            'className' => (string) ($student->schoolClass?->name ?? ''),
            'section' => (string) ($student->schoolClass?->section ?? ''),
            'studentName' => trim($student->first_name . ' ' . $student->last_name),
        ];
    }
}
