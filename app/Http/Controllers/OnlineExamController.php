<?php

namespace App\Http\Controllers;

use App\Models\OnlineExam;
use App\Models\OnlineExamAttempt;
use App\Models\Organization;
use App\Models\SchoolClass;
use App\Models\Student;
use App\Models\User;
use Illuminate\Http\RedirectResponse;
use Illuminate\Http\Request;
use Illuminate\Support\Carbon;
use Illuminate\Support\Collection;
use Illuminate\Support\Facades\Auth;
use Illuminate\Support\Facades\Schema;
use Illuminate\Validation\ValidationException;

class OnlineExamController extends Controller
{
    private ?bool $attemptQuestionSnapshotColumnExists = null;

    public function index()
    {
        $user = Auth::user();
        $organization = $this->resolveOrganizationForUser($user);
        $student = $user->role === 'student' ? $this->resolveStudentForUser($user, $organization) : null;

        if ($user->role === 'student') {
            $onlineExams = $organization
                ? $this->getStudentExamQuery($organization->id, $student)
                    ->get()
                    ->filter(fn (OnlineExam $exam) => $student ? $this->matchesStudentAssignment($exam, $student) : false)
                : collect();

            $attempts = $organization
                ? $this->getAttemptQuery($organization->id, $user, $student)->get()
                : collect();

            return inertia('dashboard/StudentOnlineExams', [
                'user' => $user,
                'onlineExams' => $onlineExams->map(fn (OnlineExam $exam) => $this->serializeExam($exam))->values()->all(),
                'attempts' => $attempts->map(fn (OnlineExamAttempt $attempt) => $this->serializeAttempt($attempt))->values()->all(),
                'studentRecord' => $student ? $this->serializeStudent($student) : null,
            ]);
        }

        $onlineExams = $organization
            ? OnlineExam::query()
                ->where('organization_id', $organization->id)
                ->withCount('attempts')
                ->latest()
                ->get()
            : collect();

        return inertia('dashboard/OnlineExamManagement', [
            'user' => $user,
            'onlineExams' => $onlineExams->map(fn (OnlineExam $exam) => $this->serializeExam($exam))->values()->all(),
            'classOptions' => $organization ? $this->getClassOptions($organization->id) : [],
            'sectionOptions' => $organization ? $this->getSectionOptions($organization) : [],
            'classSectionOptions' => $organization ? $this->getClassSectionOptions($organization->id) : [],
        ]);
    }

    public function store(Request $request): RedirectResponse
    {
        $user = Auth::user();
        $organization = $this->resolveOrganizationForUser($user);

        abort_unless($organization && $this->canManageOnlineExams($user), 403);

        $validated = $this->validateExamPayload($request);

        OnlineExam::query()->create([
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

        return redirect()->route('online-exams')->with('success', 'Online exam created successfully.');
    }

    public function update(Request $request, OnlineExam $onlineExam): RedirectResponse
    {
        $user = Auth::user();
        $organization = $this->resolveOrganizationForUser($user);

        abort_unless(
            $organization &&
            $this->canManageOnlineExams($user) &&
            $onlineExam->organization_id === $organization->id,
            403
        );

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

        return redirect()->route('online-exams')->with('success', 'Online exam updated successfully.');
    }

    public function destroy(OnlineExam $onlineExam): RedirectResponse
    {
        $user = Auth::user();
        $organization = $this->resolveOrganizationForUser($user);

        abort_unless(
            $organization &&
            $this->canManageOnlineExams($user) &&
            $onlineExam->organization_id === $organization->id,
            403
        );

        $onlineExam->delete();

        return redirect()->route('online-exams')->with('success', 'Online exam deleted successfully.');
    }

    public function submit(Request $request, OnlineExam $onlineExam): RedirectResponse
    {
        $user = Auth::user();
        $organization = $this->resolveOrganizationForUser($user);
        $student = $this->resolveStudentForUser($user, $organization);

        abort_unless(
            $organization &&
            $user->role === 'student' &&
            $student &&
            $onlineExam->organization_id === $organization->id,
            403
        );

        if ($onlineExam->status !== 'published') {
            return redirect()->route('online-exams')->with('error', 'This online exam is not published yet.');
        }

        if (!$this->matchesStudentAssignment($onlineExam, $student)) {
            return redirect()->route('online-exams')->with('error', 'This online exam is not assigned to your class section.');
        }

        $now = now();
        if ($onlineExam->start_time && $now->lt($onlineExam->start_time)) {
            return redirect()->route('online-exams')->with('error', 'This online exam has not started yet.');
        }

        if ($onlineExam->end_time && $now->gt($onlineExam->end_time)) {
            return redirect()->route('online-exams')->with('error', 'This online exam is already closed.');
        }

        $existingAttempt = OnlineExamAttempt::query()
            ->where('online_exam_id', $onlineExam->id)
            ->where(function ($query) use ($student, $user) {
                $query->where('student_id', $student->id);

                if ($user->id) {
                    $query->orWhere('user_id', $user->id);
                }
            })
            ->first();

        if ($existingAttempt) {
            return redirect()
                ->route('online-exams')
                ->with([
                    'success' => 'You have already attended this online exam. Your result is available below.',
                    'recentAttemptId' => (string) $existingAttempt->id,
                ]);
        }

        $validated = $request->validate([
            'answers' => ['nullable', 'array'],
            'answers.*' => ['nullable', 'string'],
            'questionOrder' => ['nullable', 'array'],
            'questionOrder.*' => ['string'],
            'startedAt' => ['nullable', 'date'],
            'autoSubmitted' => ['nullable', 'boolean'],
        ]);

        $answers = collect($validated['answers'] ?? [])
            ->mapWithKeys(fn ($answer, $questionId) => [(string) $questionId => trim((string) $answer)])
            ->all();

        $questionOrder = $this->normalizeSubmittedQuestionOrder(
            collect($onlineExam->questions ?? []),
            $validated['questionOrder'] ?? []
        );

        $metrics = $this->calculateAttemptMetrics($onlineExam, $answers, $questionOrder);
        $questionSnapshot = $this->buildAttemptQuestionSnapshot($onlineExam, $questionOrder);
        $startedAt = !empty($validated['startedAt']) ? Carbon::parse($validated['startedAt']) : now();
        $status = !empty($validated['autoSubmitted']) ? 'auto_submitted' : 'submitted';

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

        return redirect()
            ->route('online-exams')
            ->with([
                'success' => 'Online exam submitted successfully. Your result is available below.',
                'recentAttemptId' => (string) $attempt->id,
            ]);
    }

    public function result(string $attemptId)
    {
        $user = Auth::user();
        $organization = $this->resolveOrganizationForUser($user);
        abort_unless($organization, 403);

        $attempt = OnlineExamAttempt::query()
            ->where('organization_id', $organization->id)
            ->with(['onlineExam', 'student'])
            ->findOrFail($attemptId);

        if (
            $user->role === 'student' &&
            (int) $attempt->user_id !== (int) $user->id &&
            (int) $attempt->student?->user_id !== (int) $user->id
        ) {
            abort(403);
        }

        return inertia('dashboard/StudentOnlineExamResult', [
            'user' => $user,
            'attempt' => $this->serializeAttempt($attempt),
            'exam' => $attempt->onlineExam ? $this->serializeExam($attempt->onlineExam) : null,
        ]);
    }

    private function canManageOnlineExams(User $user): bool
    {
        return in_array($user->role, ['super_admin', 'admin', 'teacher'], true);
    }

    private function resolveOrganizationForUser(User $user): ?Organization
    {
        if ($user->organization_id) {
            return Organization::query()->find($user->organization_id);
        }

        if ($user->role === 'student') {
            $studentOrganizationId = Student::query()
                ->where(function ($query) use ($user) {
                    $query
                        ->where('user_id', $user->id)
                        ->orWhere('email', $user->email);
                })
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

    private function resolveStudentForUser(User $user, ?Organization $organization): ?Student
    {
        $studentQuery = Student::query()
            ->where(function ($query) use ($user) {
                $query
                    ->where('user_id', $user->id)
                    ->orWhere('email', $user->email);
            });

        if ($organization) {
            $studentQuery->where('organization_id', $organization->id);
        }

        $student = $studentQuery->with('schoolClass')->first();

        if ($student && !$user->organization_id) {
            $user->forceFill(['organization_id' => $student->organization_id])->save();
            $user->organization_id = $student->organization_id;
        }

        return $student;
    }

    private function getStudentExamQuery(int $organizationId, ?Student $student)
    {
        $query = OnlineExam::query()
            ->where('organization_id', $organizationId)
            ->where('status', 'published')
            ->latest();

        if (!$student?->schoolClass) {
            $query->whereRaw('1 = 0');
        }

        return $query;
    }

    private function getAttemptQuery(int $organizationId, User $user, ?Student $student)
    {
        return OnlineExamAttempt::query()
            ->where('organization_id', $organizationId)
            ->with('onlineExam')
            ->when(
                $student,
                fn ($query) => $query->where(function ($attemptQuery) use ($student, $user) {
                    $attemptQuery->where('student_id', $student->id);

                    if ($user->id) {
                        $attemptQuery->orWhere('user_id', $user->id);
                    }
                }),
                fn ($query) => $query->where('user_id', $user->id)
            )
            ->latest('submitted_at');
    }

    private function getClassOptions(int $organizationId): array
    {
        return SchoolClass::query()
            ->forCurrentSession($organizationId)
            ->select('name')
            ->distinct()
            ->orderByRaw('CAST(name AS UNSIGNED), name')
            ->pluck('name')
            ->filter()
            ->values()
            ->all();
    }

    private function getSectionOptions(Organization $organization): array
    {
        $sectionsFromSettings = collect($organization->settings['sections'] ?? []);
        $sectionsFromClasses = SchoolClass::query()
            ->forCurrentSession($organization->id)
            ->pluck('section');

        return $sectionsFromSettings
            ->merge($sectionsFromClasses)
            ->filter()
            ->map(fn ($section) => (string) $section)
            ->unique()
            ->sort()
            ->values()
            ->all();
    }

    private function getClassSectionOptions(int $organizationId): array
    {
        return SchoolClass::query()
            ->forCurrentSession($organizationId)
            ->orderByRaw('CAST(name AS UNSIGNED), name')
            ->orderBy('section')
            ->get(['name', 'section'])
            ->map(fn (SchoolClass $schoolClass) => [
                'className' => (string) $schoolClass->name,
                'section' => (string) $schoolClass->section,
                'label' => sprintf('%s / Section %s', $schoolClass->name, $schoolClass->section),
                'value' => sprintf('%s::%s', $schoolClass->name, $schoolClass->section),
            ])
            ->unique(fn (array $assignment) => $assignment['value'])
            ->values()
            ->all();
    }

    private function validateExamPayload(Request $request): array
    {
        $validated = $request->validate([
            'title' => ['required', 'string', 'max:255'],
            'subject' => ['nullable', 'string', 'max:100'],
            'className' => ['nullable', 'string', 'max:50'],
            'section' => ['nullable', 'string', 'max:50'],
            'targetClassSections' => ['required', 'array', 'min:1'],
            'targetClassSections.*.className' => ['required', 'string', 'max:50'],
            'targetClassSections.*.section' => ['required', 'string', 'max:50'],
            'duration' => ['required', 'integer', 'min:1', 'max:600'],
            'startTime' => ['required', 'date'],
            'endTime' => ['required', 'date', 'after:startTime'],
            'negativeMarkingEnabled' => ['required', 'boolean'],
            'negativeMarks' => ['nullable', 'numeric', 'min:0', 'max:100'],
            'shuffleQuestions' => ['required', 'boolean'],
            'status' => ['required', 'in:draft,published'],
            'questions' => ['required', 'array', 'min:1'],
            'questions.*.id' => ['nullable', 'string', 'max:100'],
            'questions.*.type' => ['required', 'in:mcq,true_false'],
            'questions.*.question' => ['required', 'string'],
            'questions.*.options' => ['required', 'array', 'min:2', 'max:4'],
            'questions.*.options.*' => ['nullable', 'string'],
            'questions.*.correctAnswer' => ['required', 'string'],
            'questions.*.marks' => ['required', 'numeric', 'min:0.25', 'max:100'],
        ]);

        $questions = collect($validated['questions'])
            ->map(function (array $question, int $index) {
                $type = $question['type'];
                $options = $type === 'true_false'
                    ? ['True', 'False']
                    : collect($question['options'])
                        ->map(fn ($option) => trim((string) $option))
                        ->take(4)
                        ->values()
                        ->all();

                $correctAnswer = trim((string) $question['correctAnswer']);

                if ($type === 'mcq' && count(array_filter($options, fn ($option) => $option !== '')) < 4) {
                    throw ValidationException::withMessages([
                        "questions.$index.options" => 'MCQ questions must include four options.',
                    ]);
                }

                if (!in_array($correctAnswer, $options, true)) {
                    throw ValidationException::withMessages([
                        "questions.$index.correctAnswer" => 'Correct answer must match one of the available options.',
                    ]);
                }

                return [
                    'id' => trim((string) ($question['id'] ?? '')) ?: sprintf('online_question_%s_%s', time(), $index),
                    'type' => $type,
                    'question' => trim((string) $question['question']),
                    'options' => $options,
                    'correctAnswer' => $correctAnswer,
                    'marks' => (string) $question['marks'],
                ];
            })
            ->values()
            ->all();

        $assignments = collect($validated['targetClassSections'])
            ->map(fn (array $assignment) => [
                'className' => trim($assignment['className']),
                'section' => trim($assignment['section']),
            ])
            ->unique(fn (array $assignment) => $assignment['className'] . '::' . $assignment['section'])
            ->values()
            ->all();

        $primaryAssignment = $assignments[0];

        return [
            'title' => trim($validated['title']),
            'subject' => trim((string) ($validated['subject'] ?? '')),
            'class_name' => $primaryAssignment['className'],
            'section' => $primaryAssignment['section'],
            'target_class_sections' => $assignments,
            'duration' => (int) $validated['duration'],
            'start_time' => Carbon::parse($validated['startTime']),
            'end_time' => Carbon::parse($validated['endTime']),
            'negative_marking_enabled' => (bool) $validated['negativeMarkingEnabled'],
            'negative_marks' => (float) ($validated['negativeMarks'] ?? 0),
            'shuffle_questions' => (bool) $validated['shuffleQuestions'],
            'status' => $validated['status'],
            'questions' => $questions,
        ];
    }

    private function normalizeSubmittedQuestionOrder(Collection $questions, array $submittedOrder): array
    {
        $validIds = $questions
            ->pluck('id')
            ->filter()
            ->map(fn ($id) => (string) $id)
            ->values();

        $submitted = collect($submittedOrder)
            ->map(fn ($id) => (string) $id)
            ->filter(fn ($id) => $validIds->contains($id))
            ->unique()
            ->values();

        return ($submitted->isNotEmpty() ? $submitted : $validIds)->all();
    }

    private function calculateAttemptMetrics(OnlineExam $exam, array $answers, array $questionOrder): array
    {
        $questionsById = collect($exam->questions ?? [])
            ->mapWithKeys(fn ($question) => [(string) ($question['id'] ?? '') => $question]);

        $orderedQuestions = collect($questionOrder)
            ->map(fn ($questionId) => $questionsById->get((string) $questionId))
            ->filter()
            ->values();

        if ($orderedQuestions->isEmpty()) {
            $orderedQuestions = $questionsById->values();
        }

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

            if ($selectedAnswer === (string) ($question['correctAnswer'] ?? '')) {
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

        $totalMarks = (float) $orderedQuestions->sum(fn ($question) => (float) ($question['marks'] ?? 0));
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
        $questionsById = collect($exam->questions ?? [])
            ->mapWithKeys(fn ($question) => [(string) ($question['id'] ?? '') => $question]);

        $orderedQuestions = collect($questionOrder)
            ->map(fn ($questionId) => $questionsById->get((string) $questionId))
            ->filter()
            ->values();

        if ($orderedQuestions->isEmpty()) {
            $orderedQuestions = $questionsById->values();
        }

        return $orderedQuestions
            ->map(fn ($question) => [
                'id' => (string) ($question['id'] ?? ''),
                'type' => (string) ($question['type'] ?? 'mcq'),
                'question' => (string) ($question['question'] ?? ''),
                'options' => collect($question['options'] ?? [])->map(fn ($option) => (string) $option)->values()->all(),
                'correctAnswer' => (string) ($question['correctAnswer'] ?? ''),
                'marks' => (string) ($question['marks'] ?? '1'),
            ])
            ->values()
            ->all();
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
            ->map(fn ($assignment) => [
                'className' => (string) ($assignment['className'] ?? ''),
                'section' => (string) ($assignment['section'] ?? ''),
            ])
            ->filter(fn (array $assignment) => $assignment['className'] !== '' && $assignment['section'] !== '')
            ->values();

        if ($targetClassSections->isEmpty() && $exam->class_name && $exam->section) {
            $targetClassSections = collect([[
                'className' => (string) $exam->class_name,
                'section' => (string) $exam->section,
            ]]);
        }

        $questions = collect($exam->questions ?? [])
            ->map(fn ($question) => [
                'id' => (string) ($question['id'] ?? ''),
                'type' => (string) ($question['type'] ?? 'mcq'),
                'question' => (string) ($question['question'] ?? ''),
                'options' => collect($question['options'] ?? [])->map(fn ($option) => (string) $option)->values()->all(),
                'correctAnswer' => (string) ($question['correctAnswer'] ?? ''),
                'marks' => (string) ($question['marks'] ?? '1'),
            ])
            ->values()
            ->all();

        return [
            'id' => (string) $exam->id,
            'title' => $exam->localized('title'),
            'subject' => $exam->localized('subject') ?? '',
            'className' => $exam->class_name ?? '',
            'section' => $exam->section ?? '',
            'targetClassSections' => $targetClassSections->all(),
            'duration' => (string) $exam->duration,
            'startTime' => $exam->start_time?->format('Y-m-d\TH:i') ?? '',
            'endTime' => $exam->end_time?->format('Y-m-d\TH:i') ?? '',
            'negativeMarkingEnabled' => (bool) $exam->negative_marking_enabled,
            'negativeMarks' => (string) ((float) $exam->negative_marks),
            'shuffleQuestions' => (bool) $exam->shuffle_questions,
            'status' => $exam->status,
            'questions' => $questions,
            'createdAt' => $exam->created_at?->toIso8601String() ?? '',
            'attemptsCount' => (int) ($exam->attempts_count ?? 0),
        ];
    }

    private function serializeAttempt(OnlineExamAttempt $attempt): array
    {
        return [
            'id' => (string) $attempt->id,
            'userId' => $attempt->user_id ? (string) $attempt->user_id : '',
            'studentId' => $attempt->student_id ? (string) $attempt->student_id : null,
            'examId' => (string) $attempt->online_exam_id,
            'examTitle' => $attempt->onlineExam?->localized('title') ?? $attempt->exam_title,
            'subject' => $attempt->onlineExam?->localized('subject') ?? $attempt->subject ?? '',
            'className' => $attempt->class_name ?? '',
            'section' => $attempt->section ?? '',
            'startedAt' => $attempt->started_at?->toIso8601String() ?? '',
            'submittedAt' => $attempt->submitted_at?->toIso8601String() ?? '',
            'status' => $attempt->status,
            'answers' => collect($attempt->answers ?? [])->mapWithKeys(fn ($answer, $questionId) => [(string) $questionId => (string) $answer])->all(),
            'questionOrder' => collect($attempt->question_order ?? [])->map(fn ($questionId) => (string) $questionId)->values()->all(),
            'questionSnapshot' => collect($attempt->question_snapshot ?? [])
                ->map(fn ($question) => [
                    'id' => (string) ($question['id'] ?? ''),
                    'type' => (string) ($question['type'] ?? 'mcq'),
                    'question' => (string) ($question['question'] ?? ''),
                    'options' => collect($question['options'] ?? [])->map(fn ($option) => (string) $option)->values()->all(),
                    'correctAnswer' => (string) ($question['correctAnswer'] ?? ''),
                    'marks' => (string) ($question['marks'] ?? '1'),
                ])
                ->values()
                ->all(),
            'totalQuestions' => (int) $attempt->total_questions,
            'attemptedQuestions' => (int) $attempt->attempted_questions,
            'correctAnswers' => (int) $attempt->correct_answers,
            'wrongAnswers' => (int) $attempt->wrong_answers,
            'unansweredQuestions' => (int) $attempt->unanswered_questions,
            'totalMarks' => (float) $attempt->total_marks,
            'obtainedMarks' => (float) $attempt->obtained_marks,
            'negativeMarksApplied' => (float) $attempt->negative_marks_applied,
            'percentage' => (float) $attempt->percentage,
        ];
    }

    private function serializeStudent(Student $student): array
    {
        return [
            'id' => (string) $student->id,
            'name' => trim($student->first_name . ' ' . $student->last_name),
            'email' => $student->email,
            'className' => $student->schoolClass?->name ?? '',
            'section' => $student->schoolClass?->section ?? '',
        ];
    }

    private function matchesStudentAssignment(OnlineExam $exam, Student $student): bool
    {
        $studentClass = $this->normalizeClassName((string) ($student->schoolClass?->name ?? ''));
        $studentSection = $this->normalizeSectionName((string) ($student->schoolClass?->section ?? ''));

        if ($studentClass === '' || $studentSection === '') {
            return false;
        }

        $assignments = collect($exam->target_class_sections ?? [])
            ->map(fn ($assignment) => [
                'className' => $this->normalizeClassName((string) ($assignment['className'] ?? '')),
                'section' => $this->normalizeSectionName((string) ($assignment['section'] ?? '')),
            ])
            ->filter(fn (array $assignment) => $assignment['className'] !== '' && $assignment['section'] !== '');

        if ($assignments->isEmpty() && $exam->class_name && $exam->section) {
            $assignments = collect([[
                'className' => $this->normalizeClassName((string) $exam->class_name),
                'section' => $this->normalizeSectionName((string) $exam->section),
            ]]);
        }

        return $assignments->contains(
            fn (array $assignment) =>
                $assignment['className'] === $studentClass && $assignment['section'] === $studentSection
        );
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
