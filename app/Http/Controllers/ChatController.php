<?php

namespace App\Http\Controllers;

use App\Events\ChatMessageSent;
use App\Models\Message;
use App\Models\MessageRecipient;
use App\Models\Organization;
use App\Models\Student;
use App\Models\User;
use App\Services\FirebaseCloudMessagingService;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\RedirectResponse;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\Auth;
use Throwable;

class ChatController extends Controller
{
    private const STAFF_ROLES = ['admin', 'teacher', 'accountant', 'receptionist', 'librarian'];

    public function index(Request $request)
    {
        $user = Auth::user();
        $organization = $this->resolveOrganizationForUser($user);

        abort_unless($organization, 403);

        $withId = $request->query('with');

        $contacts = $this->contacts($organization, $user);
        $selectedContact = $withId ? ($contacts[$withId] ?? null) : null;

        $messages = $withId ? $this->threadMessages($organization, $user, (int) $withId) : [];

        if ($withId) {
            $this->markRead($organization, $user, (int) $withId);
        }

        return inertia('dashboard/Chat', [
            'user' => $user,
            'organization' => ['id' => $organization->id, 'name' => $organization->name],
            'contacts' => array_values($contacts),
            'messages' => $messages,
            'selectedContactId' => $withId ? (string) $withId : null,
        ]);
    }

    public function data(Request $request): JsonResponse
    {
        $user = Auth::user();
        $organization = $this->resolveOrganizationForUser($user);

        abort_unless($organization, 403);

        $withId = (int) $request->query('with', 0);

        return response()->json([
            'messages' => $withId ? $this->threadMessages($organization, $user, $withId) : [],
            'contacts' => array_values($this->contacts($organization, $user)),
        ]);
    }

    public function send(Request $request): JsonResponse
    {
        $user = Auth::user();
        $organization = $this->resolveOrganizationForUser($user);

        abort_unless($organization, 403);

        $validated = $request->validate([
            'with' => ['required', 'integer'],
            'message' => ['required', 'string', 'max:2000'],
        ]);

        $otherId = (int) $validated['with'];
        $other = User::query()->find($otherId);

        abort_unless($other && $other->organization_id === $organization->id, 422);

        $message = Message::query()->create([
            'organization_id' => $organization->id,
            'sender_id' => $user->id,
            'subject' => 'Chat',
            'message' => $validated['message'],
            'priority' => 'low',
            'is_announcement' => false,
        ]);

        MessageRecipient::query()->create([
            'message_id' => $message->id,
            'recipient_id' => $otherId,
        ]);

        try {
            ChatMessageSent::dispatch($message, $otherId, $user->id);
        } catch (Throwable $e) {
            report($e);
        }

        try {
            app(FirebaseCloudMessagingService::class)->sendToUsers(
                [$otherId],
                $user->name . ' sent you a message',
                \Illuminate\Support\Str::limit($validated['message'], 120),
                ['type' => 'chat', 'with' => (string) $user->id],
            );
        } catch (Throwable $e) {
            report($e);
        }

        return response()->json([
            'ok' => true,
            'messages' => $this->threadMessages($organization, $user, $otherId),
        ]);
    }

    public function unread(): JsonResponse
    {
        $user = Auth::user();
        $organization = $this->resolveOrganizationForUser($user);

        abort_unless($organization, 403);

        $total = MessageRecipient::query()
            ->where('recipient_id', $user->id)
            ->where('is_read', false)
            ->whereIn('message_id', Message::query()
                ->where('organization_id', $organization->id)
                ->where('subject', 'Chat')
                ->select('id'))
            ->count();

        return response()->json(['total' => $total]);
    }

    public function read(Request $request): JsonResponse
    {
        $user = Auth::user();
        $organization = $this->resolveOrganizationForUser($user);

        abort_unless($organization, 403);

        $withId = (int) $request->query('with', 0);

        if ($withId) {
            $this->markRead($organization, $user, $withId);
        }

        return response()->json(['ok' => true]);
    }

    private function contacts(Organization $organization, User $user): array
    {
        $isStaff = in_array($user->role, self::STAFF_ROLES, true);

        $otherIds = Message::query()
            ->where('organization_id', $organization->id)
            ->where('subject', 'Chat')
            ->where(function ($q) use ($user, $isStaff) {
                if ($isStaff) {
                    $q->where('sender_id', $user->id)
                        ->orWhereHas('recipients', fn ($x) => $x->where('recipient_id', $user->id));
                } else {
                    $q->where(fn ($qq) => $qq->where('sender_id', $user->id)->orWhereHas('recipients', fn ($x) => $x->where('recipient_id', $user->id)));
                }
            })
            ->select('id', 'sender_id', 'message', 'created_at')
            ->orderByDesc('created_at')
            ->limit(200)
            ->get()
            ->unique('sender_id')
            ->pluck('sender_id')
            ->map(fn ($id) => (int) $id)
            ->all();

        $otherById = [];

        foreach (array_unique(array_merge($otherIds, [$user->id])) as $id) {
            if ((int) $id === (int) $user->id) {
                continue;
            }
            $otherById[(int) $id] = $id;
        }

        if ($isStaff) {
            // Staff see parents/students as contacts.
            $students = Student::query()
                ->where('organization_id', $organization->id)
                ->whereNotNull('user_id')
                ->with('user:id,name')
                ->orderBy('admission_no')
                ->limit(100)
                ->get();
            foreach ($students as $student) {
                $otherById[(int) $student->user_id] = (int) $student->user_id;
            }
        } else {
            // Students see staff as contacts.
            $staff = User::query()
                ->where('organization_id', $organization->id)
                ->whereIn('role', self::STAFF_ROLES)
                ->get(['id', 'name']);
            foreach ($staff as $member) {
                $otherById[(int) $member->id] = (int) $member->id;
            }
        }

        $contacts = [];
        $ids = array_values($otherById);

        foreach ($ids as $id) {
            if ((int) $id === (int) $user->id) {
                continue;
            }

            $other = User::query()->find((int) $id);
            if (!$other) {
                continue;
            }

            $last = Message::query()
                ->where('organization_id', $organization->id)
                ->where('subject', 'Chat')
                ->where(function ($q) use ($user, $id) {
                    $q->where(fn ($qq) => $qq->where('sender_id', $user->id)->whereHas('recipients', fn ($x) => $x->where('recipient_id', $id)))
                        ->orWhere(fn ($qq) => $qq->where('sender_id', $id)->whereHas('recipients', fn ($x) => $x->where('recipient_id', $user->id)));
                })
                ->orderByDesc('created_at')
                ->first();

            $unread = $last
                ? MessageRecipient::query()
                    ->where('recipient_id', $user->id)
                    ->where('is_read', false)
                    ->whereIn('message_id', Message::query()
                        ->where('organization_id', $organization->id)
                        ->where('subject', 'Chat')
                        ->where('sender_id', $id)
                        ->whereHas('recipients', fn ($x) => $x->where('recipient_id', $user->id))
                        ->select('id'))
                    ->count()
                : 0;

            $contacts[(string) $id] = [
                'id' => (string) $id,
                'name' => $other->name,
                'role' => $other->role,
                'last_message' => $last ? \Illuminate\Support\Str::limit($last->message, 60) : '',
                'last_time' => $last?->created_at?->toIso8601String(),
                'unread' => $unread,
            ];
        }

        // Sort: unread first, then by last message recency.
        uasort($contacts, function ($a, $b) {
            if ($b['unread'] !== $a['unread']) {
                return $b['unread'] <=> $a['unread'];
            }

            return ($b['last_time'] ?? '') <=> ($a['last_time'] ?? '');
        });

        return $contacts;
    }

    private function threadMessages(Organization $organization, User $user, int $otherId): array
    {
        $ids = Message::query()
            ->where('organization_id', $organization->id)
            ->where('subject', 'Chat')
            ->where(function ($q) use ($user, $otherId) {
                $q->where(fn ($qq) => $qq->where('sender_id', $user->id)->whereHas('recipients', fn ($x) => $x->where('recipient_id', $otherId)))
                    ->orWhere(fn ($qq) => $qq->where('sender_id', $otherId)->whereHas('recipients', fn ($x) => $x->where('recipient_id', $user->id)));
            })
            ->pluck('id');

        return Message::query()
            ->whereIn('id', $ids)
            ->with('sender:id,name,role')
            ->orderBy('created_at')
            ->limit(100)
            ->get()
            ->map(fn (Message $message) => [
                'id' => (string) $message->id,
                'message' => $message->message,
                'sender' => $message->sender?->name ?? '—',
                'sender_id' => (string) $message->sender_id,
                'is_mine' => (int) $message->sender_id === (int) $user->id,
                'created_at' => $message->created_at?->toIso8601String(),
            ])
            ->all();
    }

    private function markRead(Organization $organization, User $user, int $otherId): void
    {
        $incoming = Message::query()
            ->where('organization_id', $organization->id)
            ->where('subject', 'Chat')
            ->where('sender_id', $otherId)
            ->select('id');

        MessageRecipient::query()
            ->where('recipient_id', $user->id)
            ->whereIn('message_id', $incoming)
            ->where('is_read', false)
            ->update(['is_read' => true, 'read_at' => now()]);
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