<?php

namespace App\Http\Controllers;

use App\Models\ChatMessage;
use App\Models\Organization;
use App\Models\User;
use Illuminate\Http\RedirectResponse;
use Illuminate\Http\Request;
use Illuminate\Validation\Rule;
use Inertia\Inertia;
use Inertia\Response;

class ChatModerationController extends Controller
{
    public function index(Request $request): Response
    {
        $organization = $this->resolveOrganizationForUser($request->user());
        abort_unless($organization, 403);
        $this->abortUnlessAdmin($request->user());

        $messages = ChatMessage::query()
            ->where('organization_id', $organization->id)
            ->with(['sender:id,name,role', 'moderator:id,name'])
            ->orderByDesc('id')
            ->take(200)
            ->get()
            ->map(fn (ChatMessage $message) => [
                'id' => $message->id,
                'senderName' => $message->sender?->name,
                'senderRole' => $message->sender?->role,
                'conversationKey' => $message->conversation_key,
                'body' => $message->body,
                'messageType' => $message->message_type,
                'isFlagged' => $message->is_flagged,
                'moderationStatus' => $message->moderation_status,
                'moderationAction' => $message->moderation_action,
                'moderationReason' => $message->moderation_reason,
                'moderatedBy' => $message->moderator?->name,
                'createdAt' => $message->created_at?->toDateTimeString(),
            ]);

        return Inertia::render('dashboard/ChatModeration', [
            'messages' => $messages,
            'summary' => [
                'flagged' => $messages->filter(fn ($message) => $message['isFlagged'])->count(),
                'hidden' => $messages->filter(fn ($message) => $message['moderationStatus'] === 'hidden')->count(),
                'reviewed' => $messages->filter(fn ($message) => $message['moderationAction'] !== null)->count(),
                'contentSafe' => $messages->filter(fn ($message) => $message['moderationStatus'] === 'visible' && !$message['isFlagged'])->count(),
            ],
        ]);
    }

    public function moderate(Request $request, ChatMessage $chatMessage): RedirectResponse
    {
        $user = $request->user();
        $organization = $this->resolveOrganizationForUser($user);
        abort_unless($organization, 403);
        $this->abortUnlessAdmin($user);
        abort_unless($chatMessage->organization_id === $organization->id, 404);

        $validated = $request->validate([
            'moderation_status' => ['required', Rule::in(['visible', 'hidden'])],
            'action' => ['nullable', Rule::in(['hide', 'approve', 'warn'])],
            'reason' => ['nullable', 'string', 'max:1000'],
        ]);

        $chatMessage->update([
            'moderation_status' => $validated['moderation_status'],
            'moderation_action' => $validated['action'] ?? null,
            'moderation_reason' => $validated['reason'] ?? null,
            'moderated_by' => $user->id,
            'moderated_at' => now(),
            'is_flagged' => $validated['moderation_status'] === 'hidden',
        ]);

        return back()->with('success', 'Message moderated.');
    }

    private function abortUnlessAdmin(User $user): void
    {
        abort_unless(in_array($user->role, ['admin', 'super_admin'], true), 403);
    }

    private function resolveOrganizationForUser(User $user): ?Organization
    {
        if ($user->organization_id) {
            return Organization::query()->find($user->organization_id);
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
}