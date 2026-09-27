<?php

namespace App\Http\Controllers;

use App\Jobs\ImportStudentsJob;
use App\Mail\StudentWelcomeCredentialsMail;
use App\Models\AcademicYear;
use App\Models\AlumniRecord;
use App\Models\Attendance;
use App\Models\CustomFieldDefinition;
use App\Models\CustomFieldValue;
use App\Models\ExamResult;
use App\Models\HealthRecord;
use App\Models\Incident;
use App\Models\IssuedCertificate;
use App\Models\Organization;
use App\Models\SchoolClass;
use App\Models\Student;
use App\Models\StudentAcademicHistory;
use App\Models\StudentExit;
use App\Models\StudentFee;
use App\Models\StudentImport;
use App\Models\User;
use App\Services\CustomFieldValueService;
use App\Services\QwaAutoAlertService;
use App\Services\SmtpSettingsService;
use App\Services\StudentAcademicHistoryService;
use Illuminate\Database\QueryException;
use Illuminate\Http\RedirectResponse;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\Auth;
use Illuminate\Support\Facades\Mail;
use Illuminate\Support\Facades\Schema;
use Illuminate\Support\Facades\Storage;
use Illuminate\Support\Str;
use Illuminate\Validation\Rule;
use Illuminate\Validation\ValidationException;
use Inertia\Inertia;
use Inertia\Response;
use Throwable;

class StudentsController extends Controller
{
    private ?array $studentTableColumns = null;

    public function __construct(
        private readonly CustomFieldValueService $customFieldValueService,
        private readonly StudentAcademicHistoryService $studentAcademicHistoryService,
        private readonly SmtpSettingsService $smtpSettingsService
    ) {}

    public function index(Request $request)
    {
        $user = Auth::user();
        $organization = $this->resolveOrganizationForUser($user);
        $classRecords = $this->getClassRecords($organization);
        $studentRecords = $organization ? $this->getStudentRecords($organization) : collect();
        $studentImports = $organization ? $this->getStudentImports($organization) : collect();

        return Inertia::render('dashboard/StudentManagement', [
            'user' => $user,
            'classRecords' => $classRecords,
            'studentRecords' => $studentRecords,
            'studentImports' => $studentImports,
            'initialSearch' => (string) $request->string('q')->toString(),
        ]);
    }

    public function create()
    {
        $user = Auth::user();
        $organization = $this->resolveOrganizationForUser($user);

        return Inertia::render('dashboard/students/CreateStudent', [
            'user' => $user,
            'classRecords' => $this->getClassRecords($organization),
            'admissionCustomFields' => $this->getAdmissionCustomFields($organization),
        ]);
    }

    public function store(Request $request): RedirectResponse
    {
        $user = Auth::user();
        $organization = $this->resolveOrganizationForUser($user);

        if (! $organization) {
            return back()->with('error', 'No organization is linked to this account.');
        }

        $validated = $this->validateStudentPayload($request->all(), $organization);
        $customFieldValues = $this->validateAdmissionCustomFieldValues($organization, $request->input('custom_fields', []));
        $credentialsEmailWarning = null;

        try {
            $student = Student::query()->create($this->buildStudentAttributes($validated, $organization));
            $this->syncAdmissionCustomFieldValues($student, $organization, $customFieldValues);
            $credentialsEmailWarning = $this->syncStudentUser($student, $organization);
            $this->studentAcademicHistoryService->syncCurrentRecord($student->fresh('schoolClass'), 'admission', 'Created from student management.');
        } catch (QueryException $exception) {
            if ($this->isDuplicateAdmissionNumberException($exception)) {
                return back()->with('error', 'Student could not be created because the generated admission number already exists. Please try again.');
            }

            throw $exception;
        }

        $successMessage = 'Student added successfully.';

        app(QwaAutoAlertService::class)->dispatch(
            $organization,
            'admission_confirmed',
            [
                'student' => $student->fresh('schoolClass'),
            ]
        );

        if ($credentialsEmailWarning) {
            $successMessage .= ' '.$credentialsEmailWarning;
        }

        return redirect()->route('students')->with('success', $successMessage);
    }

    public function import(Request $request): RedirectResponse
    {
        $user = Auth::user();
        $organization = $this->resolveOrganizationForUser($user);

        if (! $organization) {
            return back()->with('error', 'No organization is linked to this account.');
        }

        $validated = $request->validate([
            'students' => ['required', 'array', 'min:1'],
        ]);

        $submittedCount = count($validated['students']);
        $studentImport = StudentImport::query()->create([
            'organization_id' => $organization->id,
            'requested_by_user_id' => $user->id,
            'status' => 'queued',
            'queue' => 'imports',
            'submitted_count' => $submittedCount,
        ]);

        try {
            $sourcePath = 'student-imports/import-'.$studentImport->id.'.json';
            $encodedRows = json_encode(array_values($validated['students']), JSON_THROW_ON_ERROR);

            if (! Storage::disk('local')->put($sourcePath, $encodedRows)) {
                throw new \RuntimeException('Student import file could not be written.');
            }

            $studentImport->update(['source_path' => $sourcePath]);
        } catch (Throwable $exception) {
            $studentImport->update([
                'status' => 'failed',
                'error_message' => $exception->getMessage() ?: 'Student import file could not be prepared.',
                'finished_at' => now(),
            ]);

            report($exception);

            return back()->with('error', 'Student import could not be queued. Please try again.');
        }

        ImportStudentsJob::dispatch($studentImport->id);

        $message = $submittedCount.' student'.($submittedCount === 1 ? '' : 's').' queued for import. Track status in Recent Imports.';

        return redirect()->route('students')->with('success', $message);
    }

    public function destroyImport(StudentImport $studentImport): RedirectResponse
    {
        $user = Auth::user();
        $organization = $this->resolveOrganizationForUser($user);

        abort_unless($organization && $studentImport->organization_id === $organization->id, 403);

        if (in_array($studentImport->status, ['queued', 'processing'], true)) {
            return back()->with('error', 'Active imports cannot be deleted while they are still running.');
        }

        if ($studentImport->source_path) {
            Storage::disk('local')->delete($studentImport->source_path);
        }

        $studentImport->delete();

        return back()->with('success', 'Import history entry deleted.');
    }

    public function show(Request $request, string $studentId)
    {
        $user = Auth::user();
        $organization = $this->resolveOrganizationForUser($user);
        $student = Student::with('schoolClass')->findOrFail($studentId);

        abort_unless($organization, 403);
        $this->ensureStudentBelongsToOrganization($student, $organization->id);

        $hubTabs = ['overview', 'fees', 'attendance', 'exams', 'certificates', 'behavior', 'health', 'exit'];
        $tab = $request->query('tab');
        $tab = is_string($tab) && in_array($tab, $hubTabs, true) ? $tab : 'overview';

        return Inertia::render('dashboard/students/StudentDetails', [
            'user' => $user,
            'studentId' => (string) $student->id,
            'student' => $this->serializeStudent($student, null, true),
            'siblings' => $this->buildSiblings($organization, $student),
            'studentRecords' => $this->buildStudentDetailsRecords($organization, $student),
            'hub' => $this->buildStudentHub($organization, $student),
            'tab' => $tab,
            'academicHistory' => $this->studentAcademicHistoryService
                ->getStudentHistory($student)
                ->map(fn ($history) => [
                    'id' => (string) $history->id,
                    'session' => $history->session ?: $history->academicYear?->name,
                    'class' => $history->schoolClass?->name,
                    'section' => $history->schoolClass?->section,
                    'roll_number' => $history->roll_number,
                    'status' => $history->status,
                    'entry_type' => $history->entry_type,
                    'effective_date' => optional($history->effective_date)->format('Y-m-d'),
                    'is_current' => (bool) $history->is_current,
                    'notes' => $history->notes,
                ])
                ->values(),
        ]);
    }

    private function buildSiblings(Organization $organization, Student $student): array
    {
        $student->loadMissing('schoolClass');

        if (! $student->user_id
            && ! $student->father_email
            && ! $student->mother_email
            && ! $student->guardian_email
            && ! $student->father_phone
            && ! $student->mother_phone
            && ! $student->guardian_phone) {
            return [];
        }

        $identifiers = collect([
            'user_id' => $student->user_id,
            'father_email' => $student->father_email,
            'mother_email' => $student->mother_email,
            'guardian_email' => $student->guardian_email,
            'father_phone' => $student->father_phone,
            'mother_phone' => $student->mother_phone,
            'guardian_phone' => $student->guardian_phone,
        ])->filter(fn ($value) => $value !== null && trim((string) $value) !== '');

        $siblings = Student::query()
            ->with('schoolClass:id,name,section')
            ->where('organization_id', $organization->id)
            ->where('students.id', '!=', $student->id)
            ->where(function ($query) use ($identifiers) {
                if ($identifiers->has('user_id')) {
                    $query->orWhere('user_id', $identifiers['user_id']);
                }

                if ($identifiers->has('father_email')) {
                    $query->orWhere('father_email', $identifiers['father_email']);
                }

                if ($identifiers->has('mother_email')) {
                    $query->orWhere('mother_email', $identifiers['mother_email']);
                }

                if ($identifiers->has('guardian_email')) {
                    $query->orWhere('guardian_email', $identifiers['guardian_email']);
                }

                foreach (['father_phone', 'mother_phone', 'guardian_phone'] as $column) {
                    if ($identifiers->has($column) && strlen((string) $identifiers[$column]) >= 8) {
                        $query->orWhere($column, $identifiers[$column]);
                    }
                }
            })
            ->where('students.status', 'active')
            ->orderBy('students.admission_no')
            ->get()
            ->map(fn (Student $sibling) => [
                'id' => (string) $sibling->id,
                'admission_no' => $sibling->admission_no,
                'name' => trim(($sibling->first_name ?? '').' '.($sibling->last_name ?? '')),
                'class' => $sibling->schoolClass?->name,
                'section' => $sibling->schoolClass?->section,
                'roll_number' => $sibling->roll_number,
                'gender' => $sibling->gender,
            ])
            ->values()
            ->all();

        return $siblings;
    }

    private function buildStudentHub(Organization $organization, Student $student): array
    {
        $studentId = $student->id;
        $academicYearId = $student->schoolClass?->academic_year_id;

        $feesQuery = StudentFee::query()
            ->where('organization_id', $organization->id)
            ->where('student_id', $studentId)
            ->when($academicYearId, fn ($q) => $q->where('academic_year_id', $academicYearId));

        $feeBills = (clone $feesQuery)->get();
        $feeSummary = [
            'academic_year_id' => $academicYearId,
            'bill_count' => $feeBills->count(),
            'outstanding_bills' => $feeBills->whereIn('status', ['pending', 'partial', 'overdue'])->count(),
            'total_paid' => round((float) $feeBills->sum('paid_amount'), 2),
            'total_pending' => round((float) $feeBills->sum('balance'), 2),
        ];

        $attendance = Attendance::query()
            ->where('organization_id', $organization->id)
            ->where('student_id', $studentId)
            ->get(['status']);

        $attendanceSummary = [
            'present' => $attendance->where('status', 'present')->count(),
            'absent' => $attendance->where('status', 'absent')->count(),
            'late' => $attendance->where('status', 'late')->count(),
            'half_day' => $attendance->where('status', 'half_day')->count(),
            'leave' => $attendance->where('status', 'leave')->count(),
            'total' => $attendance->count(),
        ];

        $latestResult = ExamResult::query()
            ->with(['examSchedule.exam:id,name'])
            ->where('organization_id', $organization->id)
            ->where('student_id', $studentId)
            ->orderByDesc('id')
            ->first();

        $examSummary = [
            'exam_count' => ExamResult::query()
                ->where('organization_id', $organization->id)
                ->where('student_id', $studentId)
                ->distinct('exam_schedule_id')
                ->count('exam_schedule_id'),
            'exam_id' => $latestResult?->examSchedule?->exam_id,
            'exam_name' => $latestResult?->examSchedule?->exam?->name,
            'obtained' => $latestResult ? round((float) $latestResult->obtained_marks, 2) : null,
            'max' => $latestResult ? round((float) $latestResult->total_marks, 2) : null,
            'grade' => $latestResult?->grade,
        ];

        $certificateCount = IssuedCertificate::query()
            ->where('organization_id', $organization->id)
            ->where('student_id', $studentId)
            ->count();

        $latestCertificates = IssuedCertificate::query()
            ->where('organization_id', $organization->id)
            ->where('student_id', $studentId)
            ->orderByDesc('issue_date')
            ->limit(3)
            ->get();

        $certificateSummary = [
            'count' => $certificateCount,
            'latest' => $latestCertificates->map(fn ($cert) => [
                'id' => (string) $cert->id,
                'certificate_number' => $cert->certificate_number,
                'class' => $cert->class,
                'section' => $cert->section,
                'reason' => $cert->reason,
                'issue_date' => optional($cert->issue_date)->format('Y-m-d'),
            ])->values()->all(),
        ];

        $behaviorCount = Incident::query()
            ->where('organization_id', $organization->id)
            ->where('student_id', $studentId)
            ->where('type', 'behavior');

        $behaviorStatusCounts = (clone $behaviorCount)
            ->selectRaw("status, COUNT(*) as total")
            ->groupBy('status')
            ->pluck('total', 'status');

        $behaviorRecords = (clone $behaviorCount)
            ->orderByDesc('incident_date')
            ->limit(5)
            ->get();

        $behaviorSummary = [
            'total' => (int) (clone $behaviorCount)->count(),
            'open' => (int) ($behaviorStatusCounts['open'] ?? 0),
            'resolved' => (int) ($behaviorStatusCounts['resolved'] ?? 0),
            'latest' => $behaviorRecords->first() ? [
                'id' => (string) $behaviorRecords->first()->id,
                'title' => $behaviorRecords->first()->title,
                'incident_date' => optional($behaviorRecords->first()->incident_date)->format('Y-m-d'),
                'status' => $behaviorRecords->first()->status,
            ] : null,
        ];

        $latestHealth = HealthRecord::query()
            ->where('organization_id', $organization->id)
            ->where('student_id', $studentId)
            ->orderByDesc('record_date')
            ->first();

        $healthSummary = [
            'count' => HealthRecord::query()->where('organization_id', $organization->id)->where('student_id', $studentId)->count(),
            'latest' => $latestHealth ? [
                'id' => (string) $latestHealth->id,
                'record_date' => optional($latestHealth->record_date)->format('Y-m-d'),
                'blood_group' => $latestHealth->blood_group,
                'height_cm' => $latestHealth->height_cm,
                'weight_kg' => $latestHealth->weight_kg,
                'blood_pressure' => $latestHealth->blood_pressure,
                'medical_conditions' => $latestHealth->medical_conditions,
                'allergies' => $latestHealth->allergies,
            ] : null,
        ];

        $latestExit = StudentExit::query()
            ->where('organization_id', $organization->id)
            ->where('student_id', $studentId)
            ->orderByDesc('id')
            ->first();

        $exitSummary = $latestExit ? [
            'id' => (string) $latestExit->id,
            'type' => $latestExit->type,
            'status' => $latestExit->status,
            'reason' => $latestExit->reason,
            'exit_date' => optional($latestExit->exit_date)->format('Y-m-d'),
            'tc_number' => $latestExit->tc_number,
            'tc_issued_date' => optional($latestExit->tc_issued_date)->format('Y-m-d'),
            'note' => $latestExit->note,
        ] : null;

        return [
            'fees' => $feeSummary,
            'attendance' => $attendanceSummary,
            'exam' => $examSummary,
            'certificates' => $certificateSummary,
            'behavior' => $behaviorSummary,
            'health' => $healthSummary,
            'exit' => $exitSummary,
            'enrollment_status' => $student->enrollment_status ?? 'active',
        ];
    }

    public function edit(Student $student)
    {
        $user = Auth::user();
        $organization = $this->resolveOrganizationForUser($user);

        abort_unless($organization, 403);
        $this->ensureStudentBelongsToOrganization($student, $organization->id);

        $student->load('schoolClass');

        return Inertia::render('dashboard/students/EditStudent', [
            'user' => $user,
            'studentId' => (string) $student->id,
            'student' => $this->serializeStudent($student),
            'classRecords' => $this->getClassRecords($organization),
            'admissionCustomFields' => $this->getAdmissionCustomFields($organization),
            'admissionCustomFieldValues' => $this->getStudentCustomFieldValues($student),
        ]);
    }

    public function update(Request $request, Student $student): RedirectResponse
    {
        $user = Auth::user();
        $organization = $this->resolveOrganizationForUser($user);

        abort_unless($organization, 403);
        $this->ensureStudentBelongsToOrganization($student, $organization->id);

        $validated = $this->validateStudentPayload($request->all(), $organization, $student);
        $customFieldValues = $this->validateAdmissionCustomFieldValues($organization, $request->input('custom_fields', []));

        $student->update($this->buildStudentAttributes($validated, $organization, $student));
        $freshStudent = $student->fresh('schoolClass');
        $this->syncAdmissionCustomFieldValues($freshStudent, $organization, $customFieldValues);
        $this->syncStudentUser($freshStudent, $organization);
        $this->studentAcademicHistoryService->syncCurrentRecord($freshStudent, 'updated', 'Student academic assignment updated from edit form.');

        return redirect()
            ->route('students.show', $student)
            ->with('success', 'Student updated successfully.');
    }

    public function destroy(Student $student): RedirectResponse
    {
        $user = Auth::user();
        $organization = $this->resolveOrganizationForUser($user);

        abort_unless($organization, 403);
        $this->ensureStudentBelongsToOrganization($student, $organization->id);

        $student->delete();
        $this->deleteStudentUser($student);

        return redirect()->route('students')->with('success', 'Student moved to the recycle bin. Restore from Students Recycle Bin if deleted by mistake.');
    }

    public function recycleBin(Request $request): Response
    {
        $user = $request->user();
        $organization = $this->resolveOrganizationForUser($user);
        abort_unless($organization, 403);

        $students = Student::onlyTrashed()
            ->with('schoolClass')
            ->where('organization_id', $organization->id)
            ->orderByDesc('deleted_at')
            ->get()
            ->map(function (Student $student) {
                return [
                    ...$this->serializeStudent($student),
                    'deleted_at' => optional($student->deleted_at)->format('Y-m-d H:i'),
                ];
            })
            ->values();

        return Inertia::render('dashboard/students/RecycleBin', [
            'user' => $user,
            'students' => $students,
            'classRecords' => $this->getClassRecords($organization),
        ]);
    }

    public function restoreTrashed(Request $request, string $studentId): RedirectResponse
    {
        $user = $request->user();
        $organization = $this->resolveOrganizationForUser($user);
        abort_unless($organization, 403);

        $student = Student::onlyTrashed()->find($studentId);
        abort_unless($student, 404);
        abort_unless($student->organization_id === $organization->id, 404);

        $student->restore();
        $this->syncStudentUser($student, $organization, false);

        return back()->with('success', 'Student restored successfully.');
    }

    public function destroyTrashed(Request $request, string $studentId): RedirectResponse
    {
        $user = $request->user();
        $organization = $this->resolveOrganizationForUser($user);
        abort_unless($organization, 403);

        $student = Student::onlyTrashed()->find($studentId);
        abort_unless($student, 404);
        abort_unless($student->organization_id === $organization->id, 404);

        $student->forceDelete();
        $this->deleteStudentUser($student);

        return back()->with('success', 'Student permanently deleted.');
    }

    public function bulkDestroy(Request $request): RedirectResponse
    {
        $user = Auth::user();
        $organization = $this->resolveOrganizationForUser($user);

        if (! $organization) {
            return back()->with('error', 'No organization is linked to this account.');
        }

        $validated = $request->validate([
            'studentIds' => ['required', 'array', 'min:1'],
            'studentIds.*' => ['required', 'integer'],
        ]);

        $students = Student::query()
            ->where('organization_id', $organization->id)
            ->whereIn('id', $validated['studentIds'])
            ->get();

        if ($students->isEmpty()) {
            return back()->with('error', 'No matching active students were found to delete.');
        }

        foreach ($students as $student) {
            $student->delete();
            $this->deleteStudentUser($student);
        }

        return redirect()
            ->route('bulk-delete-students')
            ->with('success', $students->count().' student'.($students->count() === 1 ? '' : 's').' moved to the recycle bin.');
    }

    public function bulkDelete()
    {
        $user = Auth::user();
        $organization = $this->resolveOrganizationForUser($user);

        return Inertia::render('dashboard/students/BulkDeleteStudents', [
            'user' => $user,
            'classRecords' => $this->getClassRecords($organization),
            'studentRecords' => $organization ? $this->getStudentRecords($organization) : collect(),
            'deletedStudentRecords' => $organization ? $this->getDeletedStudentRecords($organization) : collect(),
        ]);
    }

    public function alumniRecords()
    {
        $user = Auth::user();
        $organization = $this->resolveOrganizationForUser($user);

        return Inertia::render('dashboard/students/AlumniRecords', [
            'user' => $user,
            'alumniRecords' => $organization ? $this->getAlumniRecords($organization) : collect(),
            'sessions' => $organization ? $this->getAcademicSessions($organization) : [],
        ]);
    }

    private function getClassRecords(?Organization $organization)
    {
        if (! $organization) {
            return collect();
        }

        return SchoolClass::query()
            ->forCurrentSession($organization->id)
            ->where('status', 'active')
            ->orderByRaw('CAST(name AS UNSIGNED), name')
            ->orderBy('section')
            ->get(['id', 'name', 'section']);
    }

    private function getStudentRecords(Organization $organization)
    {
        $activeAcademicYearId = AcademicYear::query()
            ->where('organization_id', $organization->id)
            ->where('is_current', true)
            ->value('id');

        return $this->studentAcademicHistoryService
            ->getSessionEnrollments($organization->id, $activeAcademicYearId)
            ->map(function (StudentAcademicHistory $history) {
                $student = $history->student;

                if (! $student) {
                    return null;
                }

                return $this->serializeStudent($student, $history, true);
            })
            ->filter()
            ->sortBy([
                ['first_name', 'asc'],
                ['last_name', 'asc'],
            ])
            ->values();
    }

    private function getStudentImports(Organization $organization)
    {
        return StudentImport::query()
            ->where('organization_id', $organization->id)
            ->latest()
            ->limit(8)
            ->get()
            ->map(fn (StudentImport $studentImport) => [
                'id' => (string) $studentImport->id,
                'status' => $studentImport->status,
                'queue' => $studentImport->queue,
                'submitted_count' => $studentImport->submitted_count,
                'created_count' => $studentImport->created_count,
                'skipped_count' => $studentImport->skipped_count,
                'error_message' => $studentImport->error_message,
                'errors' => $studentImport->errors ?? [],
                'created_at' => optional($studentImport->created_at)->toISOString(),
                'started_at' => optional($studentImport->started_at)->toISOString(),
                'finished_at' => optional($studentImport->finished_at)->toISOString(),
            ])
            ->values();
    }

    private function getDeletedStudentRecords(Organization $organization)
    {
        return Student::onlyTrashed()
            ->where('organization_id', $organization->id)
            ->with('schoolClass:id,name,section')
            ->orderByDesc('deleted_at')
            ->get()
            ->map(fn (Student $student) => $this->serializeStudent($student, null, true))
            ->values();
    }

    private function getAlumniRecords(Organization $organization)
    {
        return AlumniRecord::query()
            ->where('organization_id', $organization->id)
            ->orderByDesc('created_at')
            ->get()
            ->map(fn (AlumniRecord $record) => [
                'id' => (string) $record->id,
                'admission_no' => $record->admission_no,
                'first_name' => $record->first_name,
                'last_name' => $record->last_name,
                'session' => $record->session,
                'class' => $record->class,
                'section' => $record->section,
                'passing_year' => $record->passing_year,
                'alumni_status' => $record->alumni_status,
                'organization_name' => $record->organization_name,
                'current_city' => $record->current_city,
                'email' => $record->email,
                'phone' => $record->phone,
            ])
            ->values();
    }

    private function getAcademicSessions(Organization $organization): array
    {
        $sessions = AcademicYear::query()
            ->where('organization_id', $organization->id)
            ->orderByDesc('is_current')
            ->orderByDesc('start_date')
            ->pluck('name')
            ->filter()
            ->values()
            ->all();

        if (! empty($sessions)) {
            return $sessions;
        }

        return collect($organization->settings['sessions'] ?? [])
            ->filter()
            ->values()
            ->all();
    }

    private function buildStudentDetailsRecords(Organization $organization, Student $student)
    {
        $records = $this->getStudentRecords($organization);

        if ($student->trashed() && ! $records->contains(fn (array $record) => (string) $record['id'] === (string) $student->id)) {
            $records->push($this->serializeStudent($student, null, true));
        }

        return $records->values();
    }

    private function serializeStudent(Student $student, ?StudentAcademicHistory $history = null, bool $localized = false): array
    {
        $className = $history?->schoolClass?->name ?? $student->schoolClass?->name;
        $sectionName = $history?->schoolClass?->section ?? $student->schoolClass?->section;
        $sessionName = $history?->session
            ?: $history?->academicYear?->name
            ?: $student->schoolClass?->academicYear?->name;
        $sessionId = $history?->academic_year_id ?? $student->schoolClass?->academic_year_id;

        return [
            'id' => (string) $student->id,
            'class_id' => $history?->class_id ?? $student->class_id,
            'session_id' => $sessionId,
            'session' => $sessionName,
            'admission_no' => $student->admission_no,
            'register_no' => $student->register_no,
            'udise_student_id' => $student->udise_student_id,
            'saral_student_id' => $student->saral_student_id,
            'aadhar_number' => $student->aadhar_number,
            'first_name' => $student->first_name,
            'middle_name' => $student->middle_name,
            'last_name' => $student->last_name,
            'middle_name_mr' => $student->middle_name_mr,
            'first_name_mr' => $student->first_name_mr,
            'last_name_mr' => $student->last_name_mr,
            'email' => $student->email,
            'phone' => $student->phone,
            'date_of_birth' => optional($student->date_of_birth)->format('Y-m-d'),
            'gender' => $student->gender,
            'blood_group' => $student->blood_group,
            'class' => $className,
            'section' => $sectionName,
            'roll_number' => $student->roll_number,
            'admission_date' => optional($student->admission_date)->format('Y-m-d'),
            'father_name' => $student->father_name,
            'father_name_mr' => $student->father_name_mr,
            'father_phone' => $student->father_phone,
            'father_occupation' => $student->father_occupation,
            'father_occupation_mr' => $student->father_occupation_mr,
            'mother_name' => $student->mother_name,
            'mother_name_mr' => $student->mother_name_mr,
            'mother_phone' => $student->mother_phone,
            'mother_occupation' => $student->mother_occupation,
            'mother_occupation_mr' => $student->mother_occupation_mr,
            'address' => $student->current_address,
            'permanent_address' => $student->permanent_address,
            'current_address' => $student->current_address,
            'address_mr' => $student->address_mr,
            'city' => $student->city,
            'city_mr' => $student->city_mr,
            'state' => $student->state,
            'state_mr' => $student->state_mr,
            'pincode' => $student->pincode,
            'category' => $student->category,
            'religion' => $student->religion,
            'religion_mr' => $student->religion_mr,
            'caste' => $student->caste,
            'caste_mr' => $student->caste_mr,
            'previous_school' => $student->previous_school,
            'previous_school_mr' => $student->previous_school_mr,
            'notes_mr' => $student->notes_mr,
            'transport_required' => (bool) $student->transport_required,
            'transport_pickup_point' => $student->transport_pickup_point,
            'transport_pickup_point_mr' => $student->transport_pickup_point_mr,
            'transport_vehicle' => $student->transport_vehicle,
            'transport_route_details' => $student->transport_route_details ?: $student->transport_route,
            'transport_route_details_mr' => $student->transport_route_details_mr,
            'hostel_required' => (bool) $student->hostel_required,
            'status' => $student->status,
            'deleted_at' => optional($student->deleted_at)->format('Y-m-d H:i:s'),
        ];

        // For read-only payloads (lists / details) swap human-readable fields
        // to the organization's regional language when a value has been entered;
        // edit forms keep the raw English values so they are not polluted.
        if ($localized) {
            foreach ([
                'first_name', 'middle_name', 'last_name',
                'father_name', 'father_occupation', 'mother_name', 'mother_occupation',
                'city', 'state', 'religion', 'caste', 'previous_school',
                'transport_pickup_point',
            ] as $field) {
                $data[$field] = $student->localized($field) ?: $student->{$field};
            }

            // `address` and `transport_route_details` display through accessor
            // fallbacks in the base payload, so a blank regional/primary column
            // must not clobber that value.
            $data['address'] = $student->localized('address') ?: $student->current_address;
            $data['transport_route_details'] = $student->localized('transport_route_details')
                ?: ($student->transport_route_details ?: $student->transport_route);
        }

        return $data;
    }

    private function validateStudentPayload(array $payload, Organization $organization, ?Student $student = null, bool $allowCreateClass = false): array
    {
        $validated = validator($payload, [
            'first_name' => ['required', 'string', 'max:255'],
            'middle_name' => ['required', 'string', 'max:255'],
            'last_name' => ['required', 'string', 'max:255'],
            'middle_name_mr' => ['required', 'string', 'max:255'],
            'first_name_mr' => ['required', 'string', 'max:255'],
            'last_name_mr' => ['required', 'string', 'max:255'],
            'email' => [
                'nullable',
                'email',
                'max:255',
                Rule::unique('students', 'email')->ignore($student?->id),
                Rule::unique('users', 'email')->ignore($student?->user_id),
            ],
            'phone' => ['nullable', 'string', 'max:30'],
            'date_of_birth' => ['required', 'date'],
            'gender' => ['required', Rule::in(['male', 'female', 'other'])],
            'blood_group' => ['nullable', 'string', 'max:20'],
            'class' => ['required', 'string', 'max:255'],
            'section' => ['required', 'string', 'max:255'],
            'course_id' => ['nullable', 'integer', Rule::exists('courses', 'id')->where(fn ($query) => $query->where('organization_id', $organization->id))],
            'batch_id' => ['nullable', 'integer', Rule::exists('batches', 'id')->where(fn ($query) => $query->where('organization_id', $organization->id))],
            'roll_number' => ['nullable', 'string', 'max:50'],
            'aadhar_number' => ['nullable', 'string', 'max:20'],
            'register_no' => ['nullable', 'string', 'max:50'],
            'udise_student_id' => ['nullable', 'string', 'max:100'],
            'saral_student_id' => ['nullable', 'string', 'max:100'],
            'admission_date' => ['required', 'date'],
            'father_name' => ['nullable', 'string', 'max:255'],
            'father_phone' => ['nullable', 'string', 'max:30'],
            'father_occupation' => ['nullable', 'string', 'max:255'],
            'father_name_mr' => ['nullable', 'string', 'max:255'],
            'father_occupation_mr' => ['nullable', 'string', 'max:255'],
            'mother_name' => ['nullable', 'string', 'max:255'],
            'mother_phone' => ['nullable', 'string', 'max:30'],
            'mother_occupation' => ['nullable', 'string', 'max:255'],
            'mother_name_mr' => ['nullable', 'string', 'max:255'],
            'mother_occupation_mr' => ['nullable', 'string', 'max:255'],
            'address' => ['nullable', 'string'],
            'permanent_address' => ['nullable', 'string'],
            'current_address' => ['nullable', 'string'],
            'address_mr' => ['nullable', 'string'],
            'city' => ['nullable', 'string', 'max:255'],
            'city_mr' => ['nullable', 'string', 'max:255'],
            'state' => ['nullable', 'string', 'max:255'],
            'state_mr' => ['nullable', 'string', 'max:255'],
            'pincode' => ['nullable', 'string', 'max:20'],
            'category' => ['nullable', 'string', 'max:100'],
            'religion' => ['nullable', 'string', 'max:100'],
            'religion_mr' => ['nullable', 'string', 'max:100'],
            'caste' => ['nullable', 'string', 'max:100'],
            'caste_mr' => ['nullable', 'string', 'max:100'],
            'previous_school' => ['nullable', 'string', 'max:255'],
            'previous_school_mr' => ['nullable', 'string', 'max:255'],
            'transport_required' => ['nullable', 'boolean'],
            'transport_pickup_point' => ['nullable', 'string', 'max:255'],
            'transport_pickup_point_mr' => ['nullable', 'string', 'max:255'],
            'transport_vehicle' => ['nullable', 'string', 'max:255'],
            'transport_route_details' => ['nullable', 'string'],
            'transport_route_details_mr' => ['nullable', 'string'],
            'hostel_required' => ['nullable', 'boolean'],
            'notes' => ['nullable', 'string'],
            'notes_mr' => ['nullable', 'string'],
            'status' => ['nullable', Rule::in(['active', 'inactive', 'graduated', 'transferred', 'expelled'])],
            'preferred_language' => ['nullable', Rule::in(['en', 'mr', 'hi'])],
        ], [
            'email.unique' => 'This email is already registered.',
        ])->validate();

        $schoolClass = $this->resolveClassForOrganization(
            $organization,
            (string) $validated['class'],
            (string) $validated['section'],
            $allowCreateClass
        );

        if (! $schoolClass) {
            throw ValidationException::withMessages([
                'class' => ['The selected class and section do not exist for this organization.'],
            ]);
        }

        $validated['class_id'] = $schoolClass->id;
        $validated['transport_required'] = filter_var($validated['transport_required'] ?? false, FILTER_VALIDATE_BOOLEAN);
        $validated['hostel_required'] = filter_var($validated['hostel_required'] ?? false, FILTER_VALIDATE_BOOLEAN);

        return $validated;
    }

    private function getAdmissionCustomFields(Organization $organization): array
    {
        if ($organization === null) {
            return [];
        }

        return CustomFieldDefinition::query()
            ->where('organization_id', $organization->id)
            ->where('entity', 'student')
            ->where('is_active', true)
            ->where('show_in_admission', true)
            ->orderBy('sort_order')
            ->orderBy('id')
            ->get()
            ->map(fn (CustomFieldDefinition $field) => [
                'id' => $field->id,
                'label' => $field->label,
                'fieldKey' => $field->field_key,
                'fieldType' => $field->field_type,
                'options' => $field->options ?? [],
                'isRequired' => $field->is_required,
            ])
            ->values()
            ->all();
    }

    private function getStudentCustomFieldValues(Student $student): array
    {
        $definitions = CustomFieldDefinition::query()
            ->where('organization_id', $student->organization_id)
            ->where('entity', 'student')
            ->where('is_active', true)
            ->where('show_in_admission', true)
            ->get(['id', 'field_key', 'field_type']);

        if ($definitions->isEmpty()) {
            return [];
        }

        $valuesByField = CustomFieldValue::query()
            ->where('organization_id', $student->organization_id)
            ->where('entity', 'student')
            ->where('entity_id', $student->id)
            ->whereIn('field_id', $definitions->pluck('id')->all())
            ->pluck('value', 'field_id');

        $fieldsById = $definitions->keyBy('id');

        return $definitions
            ->mapWithKeys(function (CustomFieldDefinition $field) use ($valuesByField, $fieldsById) {
                $value = $valuesByField->get($field->id);

                if ($field->field_type === 'multi-select' && is_string($value)) {
                    $decoded = json_decode($value, true);

                    return [$field->field_key => is_array($decoded) ? $decoded : []];
                }

                return [$field->field_key => $value];
            })
            ->all();
    }

    private function validateAdmissionCustomFieldValues(Organization $organization, array $submitted): array
    {
        $fields = CustomFieldDefinition::query()
            ->where('organization_id', $organization->id)
            ->where('entity', 'student')
            ->where('is_active', true)
            ->where('show_in_admission', true)
            ->orderBy('sort_order')
            ->orderBy('id')
            ->get();

        $result = $this->customFieldValueService->validateForFields($fields, $submitted, 'custom_fields');

        if ($result['errors']) {
            throw ValidationException::withMessages($result['errors']);
        }

        $byId = $fields->keyBy('id');

        $normalized = [];
        foreach ($result['normalized'] as $fieldId => $value) {
            if (isset($byId[$fieldId])) {
                $normalized[$byId[$fieldId]->field_key] = $value;
            }
        }

        return $normalized;
    }

    private function syncAdmissionCustomFieldValues(Student $student, Organization $organization, array $values): void
    {
        if ($values === []) {
            return;
        }

        $definitions = CustomFieldDefinition::query()
            ->where('organization_id', $organization->id)
            ->where('entity', 'student')
            ->where('is_active', true)
            ->where('show_in_admission', true)
            ->get()
            ->keyBy('field_key');

        foreach ($values as $fieldKey => $value) {
            $field = $definitions->get($fieldKey);

            if (! $field) {
                continue;
            }

            CustomFieldValue::query()->updateOrCreate(
                [
                    'organization_id' => $organization->id,
                    'entity' => 'student',
                    'entity_id' => $student->id,
                    'field_id' => $field->id,
                ],
                ['value' => $value]
            );
        }
    }

    private function buildStudentAttributes(array $validated, Organization $organization, ?Student $student = null): array
    {
        $admissionNumber = $student?->admission_no ?: $this->generateAdmissionNumber($organization);
        $studentEmail = $this->resolveStudentAccountEmail(
            $validated['email'] ?? null,
            $organization,
            $admissionNumber,
            $student?->user_id
        );

        $attributes = [
            'organization_id' => $organization->id,
            'class_id' => $validated['class_id'],
            'course_id' => $validated['course_id'] ?? null,
            'batch_id' => $validated['batch_id'] ?? null,
            'admission_no' => $admissionNumber,
            'roll_number' => $validated['roll_number'] ?? null,
            'aadhar_number' => $validated['aadhar_number'] ?? null,
            'register_no' => $validated['register_no'] ?? null,
            'udise_student_id' => $validated['udise_student_id'] ?? null,
            'saral_student_id' => $validated['saral_student_id'] ?? null,
            'first_name' => $validated['first_name'],
            'middle_name' => $validated['middle_name'] ?? null,
            'last_name' => $validated['last_name'],
            'middle_name_mr' => $validated['middle_name_mr'] ?? null,
            'first_name_mr' => $validated['first_name_mr'] ?? null,
            'last_name_mr' => $validated['last_name_mr'] ?? null,
            'date_of_birth' => $validated['date_of_birth'],
            'gender' => $validated['gender'],
            'blood_group' => $validated['blood_group'] ?? null,
            'religion' => $validated['religion'] ?? null,
            'religion_mr' => $validated['religion_mr'] ?? null,
            'caste' => $validated['caste'] ?? null,
            'caste_mr' => $validated['caste_mr'] ?? null,
            'category' => $validated['category'] ?? null,
            'email' => $studentEmail,
            'phone' => $validated['phone'] ?? null,
            'current_address' => $validated['current_address'] ?? $validated['permanent_address'] ?? $validated['address'] ?? null,
            'permanent_address' => $validated['permanent_address'] ?? $validated['address'] ?? null,
            'address_mr' => $validated['address_mr'] ?? null,
            'city' => $validated['city'] ?? null,
            'city_mr' => $validated['city_mr'] ?? null,
            'state' => $validated['state'] ?? null,
            'state_mr' => $validated['state_mr'] ?? null,
            'pincode' => $validated['pincode'] ?? null,
            'father_name' => $validated['father_name'] ?? null,
            'father_name_mr' => $validated['father_name_mr'] ?? null,
            'father_phone' => $validated['father_phone'] ?? null,
            'father_occupation' => $validated['father_occupation'] ?? null,
            'father_occupation_mr' => $validated['father_occupation_mr'] ?? null,
            'mother_name' => $validated['mother_name'] ?? null,
            'mother_name_mr' => $validated['mother_name_mr'] ?? null,
            'mother_phone' => $validated['mother_phone'] ?? null,
            'mother_occupation' => $validated['mother_occupation'] ?? null,
            'mother_occupation_mr' => $validated['mother_occupation_mr'] ?? null,
            'admission_date' => $validated['admission_date'],
            'previous_school' => $validated['previous_school'] ?? null,
            'previous_school_mr' => $validated['previous_school_mr'] ?? null,
            'transport_required' => $validated['transport_required'],
            'transport_pickup_point' => $validated['transport_required'] ? ($validated['transport_pickup_point'] ?? null) : null,
            'transport_pickup_point_mr' => $validated['transport_required'] ? ($validated['transport_pickup_point_mr'] ?? null) : null,
            'transport_vehicle' => $validated['transport_required'] ? ($validated['transport_vehicle'] ?? null) : null,
            'transport_route' => $validated['transport_required'] ? ($validated['transport_route_details'] ?? null) : null,
            'transport_route_details' => $validated['transport_required'] ? ($validated['transport_route_details'] ?? null) : null,
            'transport_route_details_mr' => $validated['transport_required'] ? ($validated['transport_route_details_mr'] ?? null) : null,
            'hostel_required' => $validated['hostel_required'],
            'notes' => $validated['notes'] ?? null,
            'notes_mr' => $validated['notes_mr'] ?? null,
            'status' => $validated['status'] ?? ($student?->status ?? 'active'),
            'preferred_language' => $validated['preferred_language'] ?? ($student?->preferred_language ?? 'en'),
        ];

        return array_intersect_key($attributes, array_flip($this->getStudentTableColumns()));
    }

    private function syncStudentUser(Student $student, Organization $organization, bool $sendCredentialsEmail = true): ?string
    {
        $studentEmail = $this->resolveStudentAccountEmail(
            $student->email,
            $organization,
            $student->admission_no,
            $student->user_id
        );

        if ($student->email !== $studentEmail) {
            $student->forceFill(['email' => $studentEmail])->save();
        }

        $studentUser = $student->user_id ? User::query()->find($student->user_id) : null;

        if (! $studentUser && $studentEmail) {
            $studentUser = User::query()
                ->where('email', $studentEmail)
                ->where('organization_id', $organization->id)
                ->first();
        }

        if ($studentUser) {
            $studentUser->update([
                'organization_id' => $organization->id,
                'name' => trim($student->first_name.' '.$student->last_name),
                'email' => $studentEmail,
                'phone' => $student->phone,
                'address' => $student->current_address,
                'role' => 'student',
                'status' => $student->status === 'active' ? 'active' : 'inactive',
            ]);
        } else {
            $temporaryPassword = $this->generateStudentPassword();

            $studentUser = User::query()->create([
                'organization_id' => $organization->id,
                'name' => trim($student->first_name.' '.$student->last_name),
                'email' => $studentEmail,
                'password' => $temporaryPassword,
                'phone' => $student->phone,
                'address' => $student->current_address,
                'role' => 'student',
                'status' => $student->status === 'active' ? 'active' : 'inactive',
            ]);
        }

        if ($student->user_id !== $studentUser->id) {
            $student->forceFill(['user_id' => $studentUser->id])->save();
        }

        if (! isset($temporaryPassword) || ! $sendCredentialsEmail) {
            return null;
        }

        return $this->sendStudentCredentialsEmail($studentUser, $temporaryPassword);
    }

    private function resolveStudentAccountEmail(?string $requestedEmail, Organization $organization, string $admissionNumber, ?int $ignoreUserId = null): string
    {
        $baseEmail = $requestedEmail ?: Str::lower($admissionNumber.'@students.'.($organization->slug ?: 'gurukul').'.local');
        $email = Str::lower(trim($baseEmail));

        if (! $this->studentUserEmailExists($email, $ignoreUserId)) {
            return $email;
        }

        $localPart = Str::before($email, '@');
        $domainPart = Str::after($email, '@');
        $suffix = 1;

        do {
            $candidate = $localPart.$suffix.'@'.$domainPart;
            $suffix++;
        } while ($this->studentUserEmailExists($candidate, $ignoreUserId));

        return $candidate;
    }

    private function studentUserEmailExists(string $email, ?int $ignoreUserId = null): bool
    {
        return User::query()
            ->when($ignoreUserId, fn ($query) => $query->where('id', '!=', $ignoreUserId))
            ->where('email', $email)
            ->exists();
    }

    private function sendStudentCredentialsEmail(User $studentUser, string $temporaryPassword): ?string
    {
        if (! $studentUser->email || Str::endsWith($studentUser->email, '.local')) {
            return 'Welcome email was not sent because the student email address is missing or invalid.';
        }

        $settings = $this->smtpSettingsService->applyActiveSettings();

        if (! $settings) {
            return 'Welcome email was not sent because SMTP settings are not available.';
        }

        try {
            Mail::to($studentUser->email)->send(
                new StudentWelcomeCredentialsMail(
                    $studentUser,
                    $temporaryPassword,
                    $studentUser->organization_id
                        ? Organization::query()->find($studentUser->organization_id)?->name
                        : null,
                    $settings
                )
            );

            return null;
        } catch (Throwable $exception) {
            report($exception);

            $errorMessage = trim($exception->getMessage());

            if ($errorMessage === '') {
                return 'Welcome email was not sent. Please check SMTP settings and try again.';
            }

            return 'Welcome email was not sent: '.$errorMessage;
        }
    }

    private function generateStudentPassword(): string
    {
        return Str::password(8, true, true, false, false);
    }

    private function resolveClassForOrganization(Organization $organization, string $className, string $sectionName, bool $allowCreate = false): ?SchoolClass
    {
        $query = SchoolClass::query()
            ->where('organization_id', $organization->id)
            ->where('name', $className)
            ->where('section', $sectionName)
            ->where('status', 'active');

        $activeAcademicYearId = AcademicYear::query()
            ->where('organization_id', $organization->id)
            ->where('is_current', true)
            ->value('id');

        if ($activeAcademicYearId) {
            $query->where('academic_year_id', $activeAcademicYearId);
        }

        $schoolClass = $query->first();

        if ($schoolClass || ! $allowCreate) {
            return $schoolClass;
        }

        return SchoolClass::query()->create([
            'organization_id' => $organization->id,
            'academic_year_id' => $activeAcademicYearId,
            'name' => $className,
            'section' => $sectionName,
            'status' => 'active',
        ]);
    }

    private function generateAdmissionNumber(Organization $organization): string
    {
        $lastAdmissionNumber = Student::withTrashed()
            ->orderByDesc('id')
            ->value('admission_no');

        $lastSequence = (int) preg_replace('/\D/', '', (string) $lastAdmissionNumber);
        $nextSequence = max($lastSequence + 1, 1);

        do {
            $candidate = 'A'.str_pad((string) $nextSequence, 3, '0', STR_PAD_LEFT);
            $exists = Student::withTrashed()
                ->where('admission_no', $candidate)
                ->exists();
            $nextSequence++;
        } while ($exists);

        return $candidate;
    }

    private function isDuplicateAdmissionNumberException(QueryException $exception): bool
    {
        $message = $exception->getMessage();

        return str_contains($message, 'students_admission_no_unique')
            || str_contains($message, 'Duplicate entry');
    }

    private function ensureStudentBelongsToOrganization(Student $student, int $organizationId): void
    {
        abort_unless($student->organization_id === $organizationId, 403);
    }

    private function deleteStudentUser(Student $student): void
    {
        if (! $student->user_id) {
            return;
        }

        $sharedReference = Student::query()
            ->where('user_id', $student->user_id)
            ->where('id', '!=', $student->id)
            ->exists();

        if ($sharedReference) {
            return;
        }

        User::query()
            ->whereKey($student->user_id)
            ->where('role', 'student')
            ->forceDelete();
    }

    private function getStudentTableColumns(): array
    {
        if ($this->studentTableColumns !== null) {
            return $this->studentTableColumns;
        }

        $this->studentTableColumns = Schema::getColumnListing('students');

        return $this->studentTableColumns;
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

        if (! $organization && Organization::query()->count() === 1) {
            $organization = Organization::query()->first();
        }

        if ($organization) {
            $user->forceFill(['organization_id' => $organization->id])->save();
            $user->organization_id = $organization->id;
        }

        return $organization;
    }
}
