<?php

namespace App\Http\Controllers;

use App\Models\Organization;
use App\Models\Student;
use App\Models\Todo;
use App\Models\User;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\RedirectResponse;
use Illuminate\Http\Request;
use Illuminate\Support\Carbon;
use Illuminate\Support\Facades\Auth;
use Inertia\Inertia;
use Inertia\Response;

class TodoController extends Controller
{
    public function index(): Response
    {
        $user = Auth::user();
        $organization = $this->resolveOrganizationForUser($user);

        $todos = Todo::query()
            ->where('user_id', $user->id)
            ->when($organization, fn ($query) => $query->where('organization_id', $organization->id))
            ->orderBy('due_date')
            ->latest('created_at')
            ->get()
            ->map(fn (Todo $todo) => $this->serializeTodo($todo))
            ->values()
            ->all();

        return Inertia::render('dashboard/TodoPage', [
            'user' => $user,
            'todos' => $todos,
        ]);
    }

    public function summary(): JsonResponse
    {
        $user = Auth::user();
        $organization = $this->resolveOrganizationForUser($user);

        $query = fn () => Todo::query()
            ->where('user_id', $user->id)
            ->when($organization, fn ($query) => $query->where('organization_id', $organization->id));

        $today = Carbon::today();

        $total = $query()->count();
        $active = $query()->where('completed', false)->count();
        $completed = $query()->where('completed', true)->count();
        $dueToday = $query()->where('completed', false)->whereDate('due_date', $today)->count();
        $overdue = $query()->where('completed', false)->whereDate('due_date', '<', $today)->count();
        $highPriority = $query()->where('completed', false)->where('priority', 'High')->count();

        $upcoming = $query()
            ->where('completed', false)
            ->orderBy('due_date')
            ->orderBy('id')
            ->limit(5)
            ->get()
            ->map(fn (Todo $todo) => [
                'id' => (string) $todo->id,
                'title' => $todo->title,
                'dueDate' => $todo->due_date?->format('Y-m-d') ?? '',
                'priority' => $todo->priority,
            ])
            ->values()
            ->all();

        return response()->json([
            'total' => $total,
            'active' => $active,
            'completed' => $completed,
            'dueToday' => $dueToday,
            'overdue' => $overdue,
            'highPriority' => $highPriority,
            'upcoming' => $upcoming,
        ]);
    }

    public function store(Request $request): RedirectResponse
    {
        $user = Auth::user();
        $organization = $this->resolveOrganizationForUser($user);
        $validated = $this->validateTodoPayload($request);

        Todo::query()->create([
            ...$validated,
            'user_id' => $user->id,
            'organization_id' => $organization?->id,
            'completed' => false,
            'completed_at' => null,
        ]);

        return redirect()
            ->route('todo')
            ->with('success', 'TO DO created successfully.');
    }

    public function update(Request $request, Todo $todo): RedirectResponse
    {
        $this->ensureTodoBelongsToCurrentUser($todo, Auth::user());
        $validated = $this->validateTodoPayload($request);

        $todo->update($validated);

        return redirect()
            ->route('todo')
            ->with('success', 'TO DO updated successfully.');
    }

    public function toggle(Todo $todo): RedirectResponse
    {
        $this->ensureTodoBelongsToCurrentUser($todo, Auth::user());

        $completed = ! $todo->completed;

        $todo->update([
            'completed' => $completed,
            'completed_at' => $completed ? now() : null,
        ]);

        return redirect()
            ->route('todo')
            ->with('success', $completed ? 'TO DO marked as completed.' : 'TO DO marked as active.');
    }

    public function destroy(Todo $todo): RedirectResponse
    {
        $this->ensureTodoBelongsToCurrentUser($todo, Auth::user());

        $todo->delete();

        return redirect()
            ->route('todo')
            ->with('success', 'TO DO deleted successfully.');
    }

    private function validateTodoPayload(Request $request): array
    {
        $validated = $request->validate([
            'title' => ['required', 'string', 'max:255'],
            'dueDate' => ['required', 'date'],
            'priority' => ['required', 'in:Low,Medium,High'],
            'note' => ['nullable', 'string'],
        ]);

        return [
            'title' => trim($validated['title']),
            'due_date' => Carbon::parse($validated['dueDate'])->toDateString(),
            'priority' => $validated['priority'],
            'note' => trim((string) ($validated['note'] ?? '')),
        ];
    }

    private function serializeTodo(Todo $todo): array
    {
        return [
            'id' => (string) $todo->id,
            'title' => $todo->title,
            'dueDate' => $todo->due_date?->format('Y-m-d') ?? '',
            'priority' => $todo->priority,
            'note' => $todo->note ?? '',
            'completed' => (bool) $todo->completed,
            'completedAt' => $todo->completed_at?->toIso8601String() ?? '',
            'createdAt' => $todo->created_at?->toIso8601String() ?? '',
        ];
    }

    private function ensureTodoBelongsToCurrentUser(Todo $todo, User $user): void
    {
        abort_unless((int) $todo->user_id === (int) $user->id, 403);

        $organization = $this->resolveOrganizationForUser($user);

        if ($organization) {
            abort_unless((int) $todo->organization_id === (int) $organization->id, 403);
        }
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
