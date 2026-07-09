<?php

namespace App\Http\Controllers\Api;

use App\Http\Controllers\Controller;
use App\Models\Todo;
use App\Models\Organization;
use App\Models\User;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\Auth;
use Illuminate\Validation\Rule;

class TodoApiController extends Controller
{
    public function index(): JsonResponse
    {
        $user = Auth::user();
        $organization = $this->resolveOrganizationForUser($user);
        abort_unless($organization, 403);

        $todos = Todo::query()
            ->where('organization_id', $organization->id)
            ->where('user_id', $user->id)
            ->orderByDesc('completed')
            ->orderByDesc('created_at')
            ->get();

        return response()->json([
            'success' => true,
            'data' => $todos->map(fn ($t) => $this->serializeTodo($t))->values()->all(),
        ]);
    }

    public function store(Request $request): JsonResponse
    {
        $user = Auth::user();
        $organization = $this->resolveOrganizationForUser($user);
        abort_unless($organization, 403);

        $validated = $request->validate([
            'title' => ['required', 'string', 'max:255'],
            'note' => ['nullable', 'string'],
            'due_date' => ['nullable', 'date'],
            'priority' => ['nullable', Rule::in(['low', 'medium', 'high'])],
        ]);

        $todo = Todo::create([
            'organization_id' => $organization->id,
            'user_id' => $user->id,
            'title' => $validated['title'],
            'note' => $validated['note'] ?? null,
            'due_date' => $validated['due_date'] ?? now()->addDays(7),
            'priority' => $validated['priority'] ?? 'medium',
            'completed' => false,
        ]);

        return response()->json([
            'success' => true,
            'message' => 'Todo created',
            'data' => $this->serializeTodo($todo),
        ], 201);
    }

    public function update(Request $request, Todo $todo): JsonResponse
    {
        $user = Auth::user();
        abort_unless($todo->user_id === $user->id, 403);

        $validated = $request->validate([
            'title' => ['sometimes', 'required', 'string', 'max:255'],
            'note' => ['nullable', 'string'],
            'due_date' => ['nullable', 'date'],
            'priority' => ['nullable', Rule::in(['low', 'medium', 'high'])],
        ]);

        $todo->update([
            'title' => $validated['title'] ?? $todo->title,
            'note' => $validated['note'] ?? $todo->note,
            'due_date' => $validated['due_date'] ?? $todo->due_date,
            'priority' => $validated['priority'] ?? $todo->priority,
        ]);

        return response()->json([
            'success' => true,
            'message' => 'Todo updated',
            'data' => $this->serializeTodo($todo),
        ]);
    }

    public function toggleComplete(Todo $todo): JsonResponse
    {
        $user = Auth::user();
        abort_unless($todo->user_id === $user->id, 403);

        $isNowCompleted = ! $todo->completed;
        $todo->update([
            'completed' => $isNowCompleted,
            'completed_at' => $isNowCompleted ? now() : null,
        ]);

        return response()->json([
            'success' => true,
            'message' => $todo->completed ? 'Todo completed' : 'Todo reopened',
            'data' => $this->serializeTodo($todo),
        ]);
    }

    public function destroy(Todo $todo): JsonResponse
    {
        $user = Auth::user();
        abort_unless($todo->user_id === $user->id, 403);

        $todo->delete();

        return response()->json([
            'success' => true,
            'message' => 'Todo deleted',
        ]);
    }

    private function serializeTodo(Todo $todo): array
    {
        return [
            'id' => $todo->id,
            'title' => $todo->title,
            'note' => $todo->note,
            'due_date' => $todo->due_date?->format('Y-m-d'),
            'priority' => $todo->priority,
            'completed' => $todo->completed,
            'completed_at' => $todo->completed_at?->format('Y-m-d H:i:s'),
            'created_at' => $todo->created_at->format('Y-m-d H:i:s'),
        ];
    }

    private function resolveOrganizationForUser(User $user): ?Organization
    {
        if ($user->organization_id) {
            return Organization::find($user->organization_id);
        }
        return Organization::count() === 1 ? Organization::first() : null;
    }
}
