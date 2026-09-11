<?php

namespace App\Http\Controllers;

use App\Models\DigitalEvaluation;
use App\Models\Organization;
use App\Models\SchoolClass;
use App\Models\Subject;
use App\Models\User;
use Illuminate\Http\RedirectResponse;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\Auth;
use Illuminate\Validation\Rule;
use Throwable;

class DigitalEvaluationController extends Controller
{
    public function index(Request $request)
    {
        $user = Auth::user();
        $organization = $this->resolveOrganizationForUser($user);

        abort_unless($organization, 403);
        abort_unless(in_array($user->role, ['admin', 'super_admin', 'teacher'], true), 403);

        $search = trim((string) $request->query('search', ''));
        $status = trim((string) $request->query('status', ''));

        $evaluations = DigitalEvaluation::query()
            ->where('organization_id', $organization->id)
            ->with(['class:id,name', 'subject:id,name'])
            ->when($search !== '', fn ($q) => $q->where('title', 'like', "%{$search}%"))
            ->when($status !== '', fn ($q) => $q->where('status', $status))
            ->orderByDesc('created_at')
            ->limit(500)
            ->get();

        $pending = DigitalEvaluation::query()->where('organization_id', $organization->id)->where('status', 'pending')->count();
        $inProgress = DigitalEvaluation::query()->where('organization_id', $organization->id)->where('status', 'in_progress')->count();
        $completed = DigitalEvaluation::query()->where('organization_id', $organization->id)->where('status', 'completed')->count();

        return inertia('dashboard/DigitalEvaluation', [
            'user' => $user,
            'classes' => SchoolClass::query()->where('organization_id', $organization->id)->orderBy('name')->get(['id', 'name'])->map(fn (SchoolClass $class) => ['id' => $class->id, 'name' => $class->name])->values()->all(),
            'subjects' => Subject::query()->where('organization_id', $organization->id)->orderBy('name')->get(['id', 'name'])->map(fn (Subject $subject) => ['id' => $subject->id, 'name' => $subject->name])->values()->all(),
            'evaluations' => $evaluations->map(fn (DigitalEvaluation $evaluation) => $this->payload($evaluation))->values()->all(),
            'filters' => ['search' => $search, 'status' => $status],
            'stats' => ['pending' => $pending, 'inProgress' => $inProgress, 'completed' => $completed],
        ]);
    }

    public function store(Request $request): RedirectResponse
    {
        $user = $request->user();
        $organization = $this->resolveOrganizationForUser($user);

        abort_unless($organization, 403);

        $validated = $this->validatedPayload($request);

        $evaluation = DigitalEvaluation::create([
            'organization_id' => $organization->id,
            'title' => $validated['title'],
            'class_id' => $validated['class_id'] ?? null,
            'subject_id' => $validated['subject_id'] ?? null,
            'total_marks' => $validated['total_marks'] ?? 0,
            'total_scripts' => $validated['total_scripts'] ?? 0,
            'evaluated_scripts' => 0,
            'status' => $validated['status'] ?? 'pending',
            'due_date' => $validated['due_date'] ?? null,
            'evaluator_name' => $validated['evaluator_name'] ?? null,
            'notes' => $validated['notes'] ?? null,
        ]);

        return back()->with('success', 'Evaluation "'.$evaluation->title.'" created.');
    }

    public function update(Request $request, DigitalEvaluation $digitalEvaluation): RedirectResponse
    {
        $user = $request->user();
        $organization = $this->resolveOrganizationForUser($user);

        abort_unless($organization && $digitalEvaluation->organization_id === $organization->id, 403);

        $validated = $this->validatedPayload($request);

        $digitalEvaluation->update([
            'title' => $validated['title'],
            'class_id' => $validated['class_id'] ?? null,
            'subject_id' => $validated['subject_id'] ?? null,
            'total_marks' => $validated['total_marks'] ?? 0,
            'total_scripts' => $validated['total_scripts'] ?? 0,
            'status' => $validated['status'] ?? $digitalEvaluation->status,
            'due_date' => $validated['due_date'] ?? null,
            'evaluator_name' => $validated['evaluator_name'] ?? null,
            'notes' => $validated['notes'] ?? null,
        ]);

        return back()->with('success', 'Evaluation "'.$digitalEvaluation->title.'" updated.');
    }

    public function progress(Request $request, DigitalEvaluation $digitalEvaluation): RedirectResponse
    {
        $user = $request->user();
        $organization = $this->resolveOrganizationForUser($user);

        abort_unless($organization && $digitalEvaluation->organization_id === $organization->id, 403);

        $validated = $request->validate([
            'evaluated_scripts' => ['required', 'integer', 'min:0'],
            'status' => ['required', Rule::in(['pending', 'in_progress', 'completed'])],
        ]);

        $evaluated = min((int) $validated['evaluated_scripts'], $digitalEvaluation->total_scripts);
        $status = $validated['status'];

        if ($status === 'completed' && $evaluated < $digitalEvaluation->total_scripts) {
            $evaluated = $digitalEvaluation->total_scripts;
        }

        $digitalEvaluation->update([
            'evaluated_scripts' => $evaluated,
            'status' => $status,
        ]);

        return back()->with('success', 'Evaluation progress updated.');
    }

    public function destroy(Request $request, DigitalEvaluation $digitalEvaluation): RedirectResponse
    {
        $user = $request->user();
        $organization = $this->resolveOrganizationForUser($user);

        abort_unless($organization && $digitalEvaluation->organization_id === $organization->id, 403);

        $title = $digitalEvaluation->title;
        $digitalEvaluation->delete();

        return back()->with('success', 'Evaluation "'.$title.'" deleted.');
    }

    private function validatedPayload(Request $request): array
    {
        return $request->validate([
            'title' => ['required', 'string', 'max:180'],
            'class_id' => ['nullable', 'integer', 'exists:classes,id'],
            'subject_id' => ['nullable', 'integer', 'exists:subjects,id'],
            'total_marks' => ['nullable', 'numeric', 'min:0'],
            'total_scripts' => ['nullable', 'integer', 'min:0'],
            'status' => ['required', Rule::in(['pending', 'in_progress', 'completed'])],
            'due_date' => ['nullable', 'date'],
            'evaluator_name' => ['nullable', 'string', 'max:120'],
            'notes' => ['nullable', 'string'],
        ]);
    }

    private function payload(DigitalEvaluation $evaluation): array
    {
        return [
            'id' => $evaluation->id,
            'title' => $evaluation->title,
            'class' => $evaluation->class?->name,
            'subject' => $evaluation->subject?->name,
            'total_marks' => number_format((float) $evaluation->total_marks, 2),
            'total_scripts' => $evaluation->total_scripts,
            'evaluated_scripts' => $evaluation->evaluated_scripts,
            'status' => $evaluation->status,
            'due_date' => optional($evaluation->due_date)->toDateString(),
            'evaluator_name' => $evaluation->evaluator_name,
            'notes' => $evaluation->notes,
        ];
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