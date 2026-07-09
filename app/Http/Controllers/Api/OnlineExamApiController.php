<?php

namespace App\Http\Controllers\Api;

use App\Http\Controllers\Controller;
use App\Models\OnlineExam;
use App\Models\OnlineExamAttempt;
use App\Models\Organization;
use App\Models\SchoolClass;
use App\Models\Student;
use App\Models\User;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;
use Illuminate\Support\Carbon;
use Illuminate\Support\Collection;
use Illuminate\Support\Facades\Auth;
use Illuminate\Support\Facades\Schema;
use Illuminate\Support\Facades\Validator;
use Illuminate\Validation\ValidationException;

class OnlineExamApiController extends Controller
{
    private ?bool $attemptQuestionSnapshotColumnExists = null;

    public function index(): JsonResponse
    {
        $user = Auth::user();
        $organization = $this->resolveOrganizationForUser($user);
        abort_unless($organization, 403);

        if ($user->role === 'student') {
            $student = $this->resolveStudentForUser($user, $organization);
            $onlineExams = $this->getStudentExamQuery($organization->id, $student)
                ->get()
                ->filter(fn (OnlineExam $exam) => $student ? $this->matchesStudentAssignment($exam, $student) : false);

            $attempts = $this->getAttemptQuery($organization->id, $user, $student)->get();

            return response()->json([
                'success' => true,
                'online_exams' => $onlineExams->map(fn (OnlineExam $exam) => $this->serializeExam($exam))->values()->all(),
                'attempts' => $attempts->map(fn (OnlineExamAttempt $attempt) => $this->serializeAttempt($attempt))->values()->all(),
                'student' => $student ? $this->serializeStudent($student) : null,
            ]);
        }

        $onlineExams = OnlineExam::where('organization_id', $organization->id)
            ->withCount('attempts')
            ->latest()
            ->get();

        return response()->json([
            'success' => true,
            'data' => $onlineExams->map(fn (OnlineExam $exam) => $this->serializeExam($exam))->values()->all(),
            'class_options' => $this->getClassOptions($organization->id),
            'section_options' => $this->getSectionOptions($organization),
            'class_section_options' => $this->getClassSectionOptions($organization->id),
        ]);
    }

    public function store(Request $request): JsonResponse
    {
        $user = Auth::user();
        $organization = $this->resolveOrganizationForUser($user);
        abort_unless($organization && $this->canManageOnlineExams($user), 403);

        $validated = $this->validateExamPayload($request);

        $exam = OnlineExam::create([
            'organization_id' => $organization->id,
            'created_by' => $user->id,
            'title' => $validated['title'],
            'subject' => $validated['subject'],
            'class_name' => $validated['class_name'],
            'section' => $validated['section'],
            'target_class_sections' => $validated['target_class_sections'],
            'duration' => $validated['duration'],
            'start_time' => $validated['start_time'],
            'end_time' => $validated['end_time'],
            'negative_marking_enabled' => $validated['negative_marking_enabled'],
            'negative_marks' => $validated['negative_marks'],
            'shuffle_questions' => $validated['shuffle_questions'],
            'status' => $validated['status'],
            'questions' => $validated['questions'],
        ]);

        return response()->json([
            'success' => true,
            'message' => 'Online exam created successfully.',
            'data' => $this->serializeExam($exam),
        ], 201);
    }

    public function update(Request $request, OnlineExam $onlineExam): JsonResponse
    {
        $user = Auth::user();
        $organization = $this->resolveOrganizationForUser($user);
        abort_unless($organization && $this->canManageOnlineExams($user) && $onlineExam->organization_id === $organization->id, 403);

        $validated = $this->validateExamPayload($request);

        $onlineExam->update([
            'title' => $validated['title'],
            'subject' => $validated['subject'],
            'class_name' => $validated['class_name'],
            'section' => $validated['section'],
            'target_class_sections' => $validated['target_class_sections'],
            'duration' => $validated['duration'],
            'start_time' => $validated['start_time'],
            'end_time' => $validated['end_time'],
            'negative_marking_enabled' => $validated['negative_marking_enabled'],
            'negative_marks' => $validated['negative_marks'],
            'shuffle_questions' => $validated['shuffle_questions'],
            'status' => $validated['status'],
            'questions' => $validated['questions'],
        ]);

        return response()->json([
            'success' => true,
            'message' => 'Online exam updated successfully.',
            'data' => $this->serializeExam($onlineExam),
        ]);
    }

    public function destroy(OnlineExam $onlineExam): JsonResponse
    {
        $user = Auth::user();
        $organization = $this->resolveOrganizationForUser($user);
        abort_unless($organization && $this->canManageOnlineExams($user) && $onlineExam->organization_id === $organization->id, 403);

        $onlineExam->delete();

        return response()->json(['success' => true, 'message' => 'Online exam deleted successfully.']);
    }

    public function submit(Request $request, OnlineExam $onlineExam): JsonResponse
    {
        $user = Auth::user();
        $organization = $this->resolveOrganizationForUser($user);
        $student = $this->resolveStudentForUser($user, $organization);

        abort_unless($organization && $user->role === 'student' && $student && $onlineExam->organization_id === $organization->id, 403);

        if ($onlineExam->status !== 'published') {
            return response()->json(['success' => false, 'message' => 'This online exam is not published yet.'], 403);
        }

        if (!$this->matchesStudentAssignment($onlineExam, $student)) {
            return response()->json(['success' => false, 'message' => 'This online exam is not assigned to your class section.'], 403);
        }

        $now = now();
        if ($onlineExam->start_time && $now->lt($onlineExam->start_time)) {
            return response()->json(['success' => false, 'message' => 'This online exam has not started yet.'], 403);
        }

        if ($onlineExam->end_time && $now->gt($onlineExam->end_time)) {
            return response()->json(['success' => false, 'message' => 'This online exam is already closed.'], 403);
        }

        $existingAttempt = OnlineExamAttempt::where('online_exam_id', $onlineExam->id)
            ->where(fn ($q) => $q->where('student_id', $student->id)->when($user->id, fn ($q2) => $q2->orWhere('user_id', $user->id)))
            ->first();

        if ($existingAttempt) {
            return response()->json([
                'success' => false,
                'message' => 'You have already attended this online exam.',
                'recent_attempt_id' => (string) $existingAttempt->id,
            ], 409);
        }

        $validator = Validator::make($request->all(), [
            'answers' => ['nullable', 'array'],
            'answers.*' => ['nullable', 'string'],
            'question_order' => ['nullable', 'array'],
            'question_order.*' => ['string'],
            'started_at' => ['nullable', 'date'],
            'auto_submitted' => ['nullable', 'boolean'],
        ]);

        if ($validator->fails()) {
            return response()->json(['success' => false, 'message' => 'Validation failed', 'errors' => $validator->errors()], 422);
        }

        $validated = $validator->validated();
        $answers = collect($validated['answers'] ?? [])->mapWithKeys(fn ($answer, $questionId) => [(string) $questionId => trim((string) $answer)])->all();
        $questionOrder = $this->normalizeSubmittedQuestionOrder(collect($onlineExam->questions ?? []), $validated['question_order'] ?? []);
        $metrics = $this->calculateAttemptMetrics($onlineExam, $answers, $questionOrder);
        $questionSnapshot = $this->buildAttemptQuestionSnapshot($onlineExam, $questionOrder);
        $startedAt = !empty($validated['started_at']) ? Carbon::parse($validated['started_at']) : now();
        $status = !empty($validated['auto_submitted']) ? 'auto_submitted' : 'submitted';

        $attempt = new OnlineExamAttempt([
            'online_exam_id' => $onlineExam->id,
            'organization_id' => $organization->id,
            'user_id' => $user->id,
            'student_id' => $student->id,
        ]);

        $attempt->fill([
            'exam_title' => $onlineExam->title,
            'subject' => $onlineExam->subject,
            'class_name' => $onlineExam->class_name,
            'section' => $onlineExam->section,
            'started_at' => $startedAt,
            'submitted_at' => now(),
            'status' => $status,
            'answers' => $answers,
            'question_order' => $questionOrder,
            'total_questions' => $metrics['totalQuestions'],
            'attempted_questions' => $metrics['attemptedQuestions'],
            'correct_answers' => $metrics['correctAnswers'],
            'wrong_answers' => $metrics['wrongAnswers'],
            'unanswered_questions' => $metrics['unansweredQuestions'],
            'total_marks' => $metrics['totalMarks'],
            'obtained_marks' => $metrics['obtainedMarks'],
            'negative_marks_applied' => $metrics['negativeMarksApplied'],
            'percentage' => $metrics['percentage'],
        ]);

        if ($this->attemptQuestionSnapshotColumnExists()) {
            $attempt->question_snapshot = $questionSnapshot;
        }

        $attempt->save();

        return response()->json([
            'success' => true,
            'message' => 'Online exam submitted successfully.',
            'data' => $this->serializeAttempt($attempt),
        ], 201);
    }

    public function result(string $attemptId): JsonResponse
    {
        $user = Auth::user();
        $organization = $this->resolveOrganizationForUser($user);
        abort_unless($organization, 403);

        $attempt = OnlineExamAttempt::where('organization_id', $organization->id)
            ->with(['onlineExam', 'student'])
            ->findOrFail($attemptId);

        if ($user->role === 'student' && (int) $attempt->user_id !== (int) $user->id && (int) $attempt->student?->user_id !== (int) $user->id) {
            abort(403);
        }

        return response()->json([
            'success' => true,
            'data' => $this->serializeAttempt($attempt),
            'exam' => $attempt->onlineExam ? $this->serializeExam($attempt->onlineExam) : null,
        ]);
    }

    private function canManageOnlineExams(User $user): bool
    {
        return in_array($user->role, ['super_admin', 'admin', 'teacher'], true);
    }

    private function resolveOrganizationForUser(User $user): ?Organization
    {
        if ($user->organization_id) return Organization::find($user->organization_id);

        if ($user->role === 'student') {
            $studentOrgId = Student::where(fn ($q) => $q->where('user_id', $user->id)->orWhere('email', $user->email))->value('organization_id');
            if ($studentOrgId) {
                $user->forceFill(['organization_id' => $studentOrgId])->save();
                $user->organization_id = $studentOrgId;
                return Organization::find($studentOrgId);
            }
        }

        if ($user->role !== 'admin') return null;

        $organization = Organization::where('email', $user->email)->first();
        if (!$organization && Organization::count() === 1) $organization = Organization::first();

        if ($organization) {
            $user->forceFill(['organization_id' => $organization->id])->save();
            $user->organization_id = $organization->id;
        }

        return $organization;
    }

    private function resolveStudentForUser(User $user, ?Organization $organization): ?Student
    {
        $studentQuery = Student::where(fn ($q) => $q->where('user_id', $user->id)->orWhere('email', $user->email));
        if ($organization) $studentQuery->where('organization_id', $organization->id);

        $student = $studentQuery->with('schoolClass')->first();
        if ($student && !$user->organization_id) {
            $user->forceFill(['organization_id' => $student->organization_id])->save();
            $user->organization_id = $student->organization_id;
        }
        return $student;
    }

    private function getStudentExamQuery(int $organizationId, ?Student $student)
    {
        $query = OnlineExam::where('organization_id', $organizationId)->where('status', 'published')->latest();
        if (!$student?->schoolClass) $query->whereRaw('1 = 0');
        return $query;
    }

    private function getAttemptQuery(int $organizationId, User $user, ?Student $student)
    {
        return OnlineExamAttempt::where('organization_id', $organizationId)
            ->with('onlineExam')
            ->when($student, fn ($q) => $q->where(fn ($q2) => $q2->where('student_id', $student->id)->when($user->id, fn ($q3) => $q3->orWhere('user_id', $user->id))), fn ($q) => $q->where('user_id', $user->id))
            ->latest('submitted_at');
    }

    private function getClassOptions(int $organizationId): array
    {
        return SchoolClass::where('organization_id', $organizationId)
            ->select('name')->distinct()->orderByRaw('CAST(name AS UNSIGNED), name')
            ->pluck('name')->filter()->values()->all();
    }

    private function getSectionOptions(Organization $organization): array
    {
        $sectionsFromSettings = collect($organization->settings['sections'] ?? []);
        $sectionsFromClasses = SchoolClass::where('organization_id', $organization->id)->pluck('section');
        return $sectionsFromSettings->merge($sectionsFromClasses)->filter()->map(fn ($s) => (string) $s)->unique()->sort()->values()->all();
    }

    private function getClassSectionOptions(int $organizationId): array
    {
        return SchoolClass::where('organization_id', $organizationId)
            ->orderByRaw('CAST(name AS UNSIGNED), name')->orderBy('section')
            ->get(['name', 'section'])
            ->map(fn (SchoolClass $c) => [
                'class_name' => (string) $c->name,
                'section' => (string) $c->section,
                'label' => sprintf('Class %s / Section %s', $c->name, $c->section),
                'value' => sprintf('%s::%s', $c->name, $c->section),
            ])->unique(fn ($a) => $a['value'])->values()->all();
    }

    private function validateExamPayload(Request $request): array
    {
        $validated = $request->validate([
            'title' => ['required', 'string', 'max:255'],
            'subject' => ['nullable', 'string', 'max:100'],
            'class_name' => ['nullable', 'string', 'max:50'],
            'section' => ['nullable', 'string', 'max:50'],
            'target_class_sections' => ['required', 'array', 'min:1'],
            'target_class_sections.*.class_name' => ['required', 'string', 'max:50'],
            'target_class_sections.*.section' => ['required', 'string', 'max:50'],
            'duration' => ['required', 'integer', 'min:1', 'max:600'],
            'start_time' => ['required', 'date'],
            'end_time' => ['required', 'date', 'after:start_time'],
            'negative_marking_enabled' => ['required', 'boolean'],
            'negative_marks' => ['nullable', 'numeric', 'min:0', 'max:100'],
            'shuffle_questions' => ['required', 'boolean'],
            'status' => ['required', 'in:draft,published'],
            'questions' => ['required', 'array', 'min:1'],
            'questions.*.id' => ['nullable', 'string', 'max:100'],
            'questions.*.type' => ['required', 'in:mcq,true_false'],
            'questions.*.question' => ['required', 'string'],
            'questions.*.options' => ['required', 'array', 'min:2', 'max:4'],
            'questions.*.options.*' => ['nullable', 'string'],
            'questions.*.correct_answer' => ['required', 'string'],
            'questions.*.marks' => ['required', 'numeric', 'min:0.25', 'max:100'],
        ]);

        $questions = collect($validated['questions'])->map(function (array $question, int $index) {
            $type = $question['type'];
            $options = $type === 'true_false' ? ['True', 'False'] : collect($question['options'])->map(fn ($o) => trim((string) $o))->take(4)->values()->all();
            $correctAnswer = trim((string) $question['correct_answer']);

            if ($type === 'mcq' && count(array_filter($options, fn ($o) => $o !== '')) < 4) {
                throw ValidationException::withMessages(["questions.$index.options" => 'MCQ questions must include four options.']);
            }
            if (!in_array($correctAnswer, $options, true)) {
                throw ValidationException::withMessages(["questions.$index.correct_answer" => 'Correct answer must match one of the available options.']);
            }

            return [
                'id' => trim((string) ($question['id'] ?? '')) ?: sprintf('online_question_%s_%s', time(), $index),
                'type' => $type,
                'question' => trim((string) $question['question']),
                'options' => $options,
                'correct_answer' => $correctAnswer,
                'marks' => (string) $question['marks'],
            ];
        })->values()->all();

        $assignments = collect($validated['target_class_sections'])->map(fn (array $a) => ['class_name' => trim($a['class_name']), 'section' => trim($a['section'])])->unique(fn ($a) => $a['class_name'] . '::' . $a['section'])->values()->all();
        $primaryAssignment = $assignments[0];

        return [
            'title' => trim($validated['title']),
            'subject' => trim((string) ($validated['subject'] ?? '')),
            'class_name' => $primaryAssignment['class_name'],
            'section' => $primaryAssignment['section'],
            'target_class_sections' => $assignments,
            'duration' => (int) $validated['duration'],
            'start_time' => Carbon::parse($validated['start_time']),
            'end_time' => Carbon::parse($validated['end_time']),
            'negative_marking_enabled' => (bool) $validated['negative_marking_enabled'],
            'negative_marks' => (float) ($validated['negative_marks'] ?? 0),
            'shuffle_questions' => (bool) $validated['shuffle_questions'],
            'status' => $validated['status'],
            'questions' => $questions,
        ];
    }

    private function normalizeSubmittedQuestionOrder(Collection $questions, array $submittedOrder): array
    {
        $validIds = $questions->pluck('id')->filter()->map(fn ($id) => (string) $id)->values();
        $submitted = collect($submittedOrder)->map(fn ($id) => (string) $id)->filter(fn ($id) => $validIds->contains($id))->unique()->values();
        return ($submitted->isNotEmpty() ? $submitted : $validIds)->all();
    }

    private function calculateAttemptMetrics(OnlineExam $exam, array $answers, array $questionOrder): array
    {
        $questionsById = collect($exam->questions ?? [])->mapWithKeys(fn ($q) => [(string) ($q['id'] ?? '') => $q]);
        $orderedQuestions = collect($questionOrder)->map(fn ($qid) => $questionsById->get((string) $qid))->filter()->values();
        if ($orderedQuestions->isEmpty()) $orderedQuestions = $questionsById->values();

        $negativeMark = $exam->negative_marking_enabled ? (float) $exam->negative_marks : 0.0;
        $obtainedMarks = 0.0;
        $correctAnswers = 0;
        $wrongAnswers = 0;
        $unansweredQuestions = 0;
        $negativeMarksApplied = 0.0;

        foreach ($orderedQuestions as $question) {
            $questionId = (string) ($question['id'] ?? '');
            $selectedAnswer = trim((string) ($answers[$questionId] ?? ''));
            $questionMarks = (float) ($question['marks'] ?? 0);

            if ($selectedAnswer === '') {
                $unansweredQuestions++;
                continue;
            }
            if ($selectedAnswer === (string) ($question['correct_answer'] ?? '')) {
                $correctAnswers++;
                $obtainedMarks += $questionMarks;
                continue;
            }
            $wrongAnswers++;
            if ($negativeMark > 0) {
                $obtainedMarks -= $negativeMark;
                $negativeMarksApplied += $negativeMark;
            }
        }

        $totalMarks = (float) $orderedQuestions->sum(fn ($q) => (float) ($q['marks'] ?? 0));
        $attemptedQuestions = $orderedQuestions->count() - $unansweredQuestions;
        $percentage = $totalMarks > 0 ? round(($obtainedMarks / $totalMarks) * 100, 2) : 0.0;

        return [
            'totalQuestions' => $orderedQuestions->count(),
            'attemptedQuestions' => $attemptedQuestions,
            'correctAnswers' => $correctAnswers,
            'wrongAnswers' => $wrongAnswers,
            'unansweredQuestions' => $unansweredQuestions,
            'totalMarks' => round($totalMarks, 2),
            'obtainedMarks' => round($obtainedMarks, 2),
            'negativeMarksApplied' => round($negativeMarksApplied, 2),
            'percentage' => $percentage,
        ];
    }

    private function buildAttemptQuestionSnapshot(OnlineExam $exam, array $questionOrder): array
    {
        $questionsById = collect($exam->questions ?? [])->mapWithKeys(fn ($q) => [(string) ($q['id'] ?? '') => $q]);
        $orderedQuestions = collect($questionOrder)->map(fn ($qid) => $questionsById->get((string) $qid))->filter()->values();
        if ($orderedQuestions->isEmpty()) $orderedQuestions = $questionsById->values();

        return $orderedQuestions->map(fn ($q) => [
            'id' => (string) ($q['id'] ?? ''),
            'type' => (string) ($q['type'] ?? 'mcq'),
            'question' => (string) ($q['question'] ?? ''),
            'options' => collect($q['options'] ?? [])->map(fn ($o) => (string) $o)->values()->all(),
            'correct_answer' => (string) ($q['correct_answer'] ?? ''),
            'marks' => (string) ($q['marks'] ?? '1'),
        ])->values()->all();
    }

    private function attemptQuestionSnapshotColumnExists(): bool
    {
        if ($this->attemptQuestionSnapshotColumnExists === null) {
            $this->attemptQuestionSnapshotColumnExists = Schema::hasColumn('online_exam_attempts', 'question_snapshot');
        }
        return $this->attemptQuestionSnapshotColumnExists;
    }

    private function serializeExam(OnlineExam $exam): array
    {
        $targetClassSections = collect($exam->target_class_sections ?? [])
            ->map(fn ($a) => ['class_name' => (string) ($a['class_name'] ?? ''), 'section' => (string) ($a['section'] ?? '')])
            ->filter(fn ($a) => $a['class_name'] !== '' && $a['section'] !== '')->values();

        if ($targetClassSections->isEmpty() && $exam->class_name && $exam->section) {
            $targetClassSections = collect([['class_name' => (string) $exam->class_name, 'section' => (string) $exam->section]]);
        }

        $questions = collect($exam->questions ?? [])->map(fn ($q) => [
            'id' => (string) ($q['id'] ?? ''),
            'type' => (string) ($q['type'] ?? 'mcq'),
            'question' => (string) ($q['question'] ?? ''),
            'options' => collect($q['options'] ?? [])->map(fn ($o) => (string) $o)->values()->all(),
            'correct_answer' => (string) ($q['correct_answer'] ?? ''),
            'marks' => (string) ($q['marks'] ?? '1'),
        ])->values()->all();

        return [
            'id' => (string) $exam->id,
            'title' => $exam->title,
            'subject' => $exam->subject ?? '',
            'class_name' => $exam->class_name ?? '',
            'section' => $exam->section ?? '',
            'target_class_sections' => $targetClassSections->all(),
            'duration' => (string) $exam->duration,
            'start_time' => $exam->start_time?->format('Y-m-d\TH:i') ?? '',
            'end_time' => $exam->end_time?->format('Y-m-d\TH:i') ?? '',
            'negative_marking_enabled' => (bool) $exam->negative_marking_enabled,
            'negative_marks' => (string) ((float) $exam->negative_marks),
            'shuffle_questions' => (bool) $exam->shuffle_questions,
            'status' => $exam->status,
            'questions' => $questions,
            'created_at' => $exam->created_at?->toIso8601String() ?? '',
            'attempts_count' => (int) ($exam->attempts_count ?? 0),
        ];
    }

    private function serializeAttempt(OnlineExamAttempt $attempt): array
    {
        return [
            'id' => (string) $attempt->id,
            'user_id' => $attempt->user_id ? (string) $attempt->user_id : '',
            'student_id' => $attempt->student_id ? (string) $attempt->student_id : null,
            'exam_id' => (string) $attempt->online_exam_id,
            'exam_title' => $attempt->exam_title,
            'subject' => $attempt->subject ?? '',
            'class_name' => $attempt->class_name ?? '',
            'section' => $attempt->section ?? '',
            'started_at' => $attempt->started_at?->toIso8601String() ?? '',
            'submitted_at' => $attempt->submitted_at?->toIso8601String() ?? '',
            'status' => $attempt->status,
            'answers' => collect($attempt->answers ?? [])->mapWithKeys(fn ($a, $k) => [(string) $k => (string) $a])->all(),
            'question_order' => collect($attempt->question_order ?? [])->map(fn ($id) => (string) $id)->values()->all(),
            'question_snapshot' => collect($attempt->question_snapshot ?? [])->map(fn ($q) => [
                'id' => (string) ($q['id'] ?? ''),
                'type' => (string) ($q['type'] ?? 'mcq'),
                'question' => (string) ($q['question'] ?? ''),
                'options' => collect($q['options'] ?? [])->map(fn ($o) => (string) $o)->values()->all(),
                'correct_answer' => (string) ($q['correct_answer'] ?? ''),
                'marks' => (string) ($q['marks'] ?? '1'),
            ])->values()->all(),
            'total_questions' => (int) $attempt->total_questions,
            'attempted_questions' => (int) $attempt->attempted_questions,
            'correct_answers' => (int) $attempt->correct_answers,
            'wrong_answers' => (int) $attempt->wrong_answers,
            'unanswered_questions' => (int) $attempt->unanswered_questions,
            'total_marks' => (float) $attempt->total_marks,
            'obtained_marks' => (float) $attempt->obtained_marks,
            'negative_marks_applied' => (float) $attempt->negative_marks_applied,
            'percentage' => (float) $attempt->percentage,
        ];
    }

    private function serializeStudent(Student $student): array
    {
        return [
            'id' => (string) $student->id,
            'name' => trim($student->first_name . ' ' . $student->last_name),
            'email' => $student->email,
            'class_name' => $student->schoolClass?->name ?? '',
            'section' => $student->schoolClass?->section ?? '',
        ];
    }

    private function matchesStudentAssignment(OnlineExam $exam, Student $student): bool
    {
        $studentClass = $this->normalizeClassName((string) ($student->schoolClass?->name ?? ''));
        $studentSection = $this->normalizeSectionName((string) ($student->schoolClass?->section ?? ''));
        if ($studentClass === '' || $studentSection === '') return false;

        $assignments = collect($exam->target_class_sections ?? [])
            ->map(fn ($a) => ['class_name' => $this->normalizeClassName((string) ($a['class_name'] ?? '')), 'section' => $this->normalizeSectionName((string) ($a['section'] ?? ''))])
            ->filter(fn ($a) => $a['class_name'] !== '' && $a['section'] !== '');

        if ($assignments->isEmpty() && $exam->class_name && $exam->section) {
            $assignments = collect([['class_name' => $this->normalizeClassName((string) $exam->class_name), 'section' => $this->normalizeSectionName((string) $exam->section)]]);
        }

        return $assignments->contains(fn ($a) => $a['class_name'] === $studentClass && $a['section'] === $studentSection);
    }

    private function normalizeClassName(string $value): string
    {
        $normalized = strtolower(trim($value));
        $normalized = preg_replace('/^class\s*/', '', $normalized) ?? $normalized;
        return trim($normalized);
    }

    private function normalizeSectionName(string $value): string
    {
        return strtoupper(trim($value));
    }
}
