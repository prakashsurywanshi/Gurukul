<?php

namespace App\Http\Controllers;

use App\Models\Organization;
use App\Models\Question;
use App\Models\SchoolClass;
use App\Models\Subject;
use App\Models\User;
use Illuminate\Http\RedirectResponse;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\Auth;
use Illuminate\Validation\Rule;
use Throwable;

class QuestionBankController extends Controller
{
    private const TYPES = ['mcq', 'subjective', 'descriptive'];
    private const DIFFICULTIES = ['easy', 'medium', 'hard'];

    public function index(Request $request)
    {
        $user = Auth::user();
        $organization = $this->resolveOrganizationForUser($user);

        abort_unless($organization, 403);

        $classId = $request->query('class_id');
        $subjectId = $request->query('subject_id');
        $type = $request->query('type');

        $questions = Question::query()
            ->where('organization_id', $organization->id)
            ->when($classId, fn ($query) => $query->where('class_id', $classId))
            ->when($subjectId, fn ($query) => $query->where('subject_id', $subjectId))
            ->when($type, fn ($query) => $query->where('type', $type))
            ->with(['schoolClass:id,name,section', 'subject:id,name', 'creator:id,name'])
            ->orderByDesc('created_at')
            ->limit(200)
            ->get()
            ->map(fn (Question $question) => [
                'id' => (string) $question->id,
                'question' => $question->question,
                'type' => $question->type,
                'options' => $question->options,
                'correct_answer' => $question->correct_answer,
                'marks' => (int) $question->marks,
                'difficulty' => $question->difficulty,
                'class_id' => $question->class_id ? (string) $question->class_id : null,
                'subject_id' => $question->subject_id ? (string) $question->subject_id : null,
                'class' => $question->schoolClass ? trim(($question->schoolClass->name ?? '').' '.($question->schoolClass->section ?? '')) : null,
                'subject' => $question->subject?->name,
                'is_active' => (bool) $question->is_active,
                'created_by' => $question->creator?->name,
            ])
            ->all();

        return inertia('dashboard/QuestionBank', [
            'user' => $user,
            'organization' => [
                'id' => $organization->id,
                'name' => $organization->name,
            ],
            'questions' => $questions,
            'classes' => $this->classRecords($organization),
            'subjects' => $this->subjectRecords($organization),
            'selectedClassId' => $classId ? (string) $classId : null,
            'selectedSubjectId' => $subjectId ? (string) $subjectId : null,
            'selectedType' => $type ? (string) $type : null,
        ]);
    }

    public function store(Request $request): RedirectResponse
    {
        $user = Auth::user();
        $organization = $this->resolveOrganizationForUser($user);

        abort_unless($organization, 403);

        $validated = $request->validate($this->rules());

        Question::query()->create([
            'organization_id' => $organization->id,
            'class_id' => $validated['class_id'] ?? null,
            'subject_id' => $validated['subject_id'] ?? null,
            'type' => $validated['type'],
            'question' => $validated['question'],
            'options' => $validated['options'] ?? null,
            'correct_answer' => $validated['correct_answer'] ?? null,
            'marks' => $validated['marks'],
            'difficulty' => $validated['difficulty'],
            'is_active' => (bool) ($validated['is_active'] ?? true),
            'created_by' => $user->id,
        ]);

        return redirect()->route('question-bank')->with('success', 'Question added successfully.');
    }

    public function update(Request $request, Question $question): RedirectResponse
    {
        $user = Auth::user();
        $organization = $this->resolveOrganizationForUser($user);

        abort_unless($organization && $question->organization_id === $organization->id, 403);

        $validated = $request->validate($this->rules());

        $question->update([
            'class_id' => $validated['class_id'] ?? null,
            'subject_id' => $validated['subject_id'] ?? null,
            'type' => $validated['type'],
            'question' => $validated['question'],
            'options' => $validated['options'] ?? null,
            'correct_answer' => $validated['correct_answer'] ?? null,
            'marks' => $validated['marks'],
            'difficulty' => $validated['difficulty'],
            'is_active' => (bool) ($validated['is_active'] ?? true),
        ]);

        return redirect()->route('question-bank')->with('success', 'Question updated successfully.');
    }

    public function destroy(Question $question): RedirectResponse
    {
        $user = Auth::user();
        $organization = $this->resolveOrganizationForUser($user);

        abort_unless($organization && $question->organization_id === $organization->id, 403);

        $question->delete();

        return redirect()->route('question-bank')->with('success', 'Question deleted successfully.');
    }

    private function rules(): array
    {
        return [
            'class_id' => ['nullable', 'integer', 'exists:classes,id'],
            'subject_id' => ['nullable', 'integer', 'exists:subjects,id'],
            'type' => ['required', Rule::in(self::TYPES)],
            'question' => ['required', 'string', 'max:5000'],
            'options' => ['nullable', 'array', 'max:10'],
            'options.*' => ['nullable', 'string', 'max:500'],
            'correct_answer' => ['nullable', 'string', 'max:1000'],
            'marks' => ['required', 'integer', 'min:1', 'max:100'],
            'difficulty' => ['required', Rule::in(self::DIFFICULTIES)],
            'is_active' => ['nullable', 'boolean'],
        ];
    }

    private function classRecords(Organization $organization): array
    {
        return SchoolClass::query()
            ->forCurrentSession($organization->id)
            ->where('status', 'active')
            ->orderByRaw('CAST(name AS UNSIGNED), name')
            ->orderBy('section')
            ->get(['id', 'name', 'section'])
            ->map(fn (SchoolClass $schoolClass) => [
                'id' => (string) $schoolClass->id,
                'label' => trim(($schoolClass->name ?? '').' '.($schoolClass->section ?? '')),
            ])
            ->values()
            ->all();
    }

    private function subjectRecords(Organization $organization): array
    {
        return Subject::query()
            ->where('organization_id', $organization->id)
            ->orderBy('name')
            ->get(['id', 'name'])
            ->map(fn (Subject $subject) => [
                'id' => (string) $subject->id,
                'label' => $subject->name,
            ])
            ->values()
            ->all();
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