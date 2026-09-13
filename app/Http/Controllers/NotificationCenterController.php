<?php

namespace App\Http\Controllers;

use App\Models\Organization;
use App\Models\SystemNotification;
use Illuminate\Http\JsonResponse;
use Illuminate\Support\Facades\Auth;

class NotificationCenterController extends Controller
{
    public const TYPE_INFO = 'info';
    public const TYPE_LEAVE_REQUEST = 'leave_request';
    public const TYPE_ADMIT_CARD = 'admit_card';
    public const TYPE_ADMISSION_ENQUIRY = 'admission_enquiry';
    public const TYPE_LEAD = 'lead';
    public const TYPE_COMPLAINT = 'complaint';
    public const TYPE_ATTENDANCE_CORRECTION = 'attendance_correction';
    public const TYPE_FEE_CONCESSION = 'fee_concession';

    public function index()
    {
        $user = Auth::user();

        $notifications = SystemNotification::query()
            ->where('user_id', $user->id)
            ->orderByDesc('created_at')
            ->limit(200)
            ->get()
            ->map(fn (SystemNotification $notification) => $this->payload($notification))
            ->all();

        return inertia('dashboard/SystemNotifications', [
            'user' => $user,
            'notifications' => $notifications,
            'unreadCount' => SystemNotification::query()
                ->where('user_id', $user->id)
                ->where('is_read', false)
                ->count(),
            'organization' => $this->resolveOrganizationForUser($user)?->only(['id', 'name']),
        ]);
    }

    public function markAllRead(): JsonResponse
    {
        $user = Auth::user();

        SystemNotification::query()
            ->where('user_id', $user->id)
            ->where('is_read', false)
            ->update(['is_read' => true, 'read_at' => now()]);

        return response()->json(['ok' => true, 'unread' => 0]);
    }

    public function markRead(SystemNotification $notification): JsonResponse
    {
        $user = Auth::user();

        abort_unless((int) $notification->user_id === (int) $user->id, 404);

        $notification->update([
            'is_read' => true,
            'read_at' => $notification->read_at ?? now(),
        ]);

        $unread = SystemNotification::query()
            ->where('user_id', $user->id)
            ->where('is_read', false)
            ->count();

        return response()->json(['ok' => true, 'unread' => $unread]);
    }

    private function payload(SystemNotification $notification): array
    {
        $data = $notification->data ?? [];

        return [
            'id' => (string) $notification->id,
            'type' => $notification->type,
            'title' => $notification->title,
            'message' => $notification->message,
            'icon' => $data['icon'] ?? null,
            'action_label' => $data['action_label'] ?? null,
            'action_url' => $data['action_url'] ?? null,
            'link' => $notification->link,
            'event' => $data['event'] ?? null,
            'read' => (bool) $notification->is_read,
            'created_at' => $notification->created_at?->toIso8601String(),
        ];
    }

    private function resolveOrganizationForUser(?object $user): ?Organization
    {
        if (!$user || !method_exists($user, 'getAttribute')) {
            return null;
        }

        $organizationId = $user->getAttribute('organization_id');
        if (!$organizationId) {
            return null;
        }

        return Organization::query()->find($organizationId);
    }
}