<?php

namespace App\Http\Controllers;

use App\Models\AiScore;
use App\Models\Organization;
use App\Models\SystemNotification;
use App\Models\User;
use App\Services\AiAnalytics\AiAnalyticsService;
use Illuminate\Http\RedirectResponse;
use Illuminate\Http\Request;

class AiAnalyticsController extends Controller
{
    public function __construct(private readonly AiAnalyticsService $analyticsService)
    {
    }

    public function index(Request $request)
    {
        $user = $request->user();
        $organization = $this->resolveOrganizationForUser($user);
        abort_unless($organization, 403);

        $scores = AiScore::query()
            ->where('organization_id', $organization->id)
            ->orderByDesc('score')
            ->get();

        $leadRows = $scores->where('category', 'lead')->values()->map(fn ($score) => $this->serialize($score));
        $feeRows = $scores->where('category', 'fee_defaulter')->values()->map(fn ($score) => $this->serialize($score));
        $studentRows = $scores->where('category', 'student_risk')->values()->map(fn ($score) => $this->serialize($score));
        $routeRows = $scores->where('category', 'route')->values()->map(fn ($score) => $this->serialize($score));

        $setting = is_array($organization->settings) ? ($organization->settings['ai'] ?? []) : [];
        $aiConfigured = ($setting['mode'] ?? config('ai.mode')) === 'local' || ! empty($setting['api_key']) || filled(config('ai.api_key'));

        $alerts = SystemNotification::query()
            ->where('organization_id', $organization->id)
            ->where('type', 'ai_risk_alert')
            ->orderByDesc('created_at')
            ->limit(10)
            ->get(['id', 'title', 'message', 'is_read', 'created_at'])
            ->map(fn ($notification) => [
                'id' => $notification->id,
                'title' => $notification->title,
                'message' => $notification->message,
                'is_read' => (bool) $notification->is_read,
                'created_at' => $notification->created_at?->toIso8601String(),
            ])
            ->values();

        return inertia('dashboard/AiAnalytics', [
            'user' => $user,
            'organization' => ['id' => $organization->id, 'name' => $organization->name],
            'computedAt' => $scores->max('computed_at')?->toIso8601String(),
            'overview' => [
                'leads' => $leadRows->count(),
                'fees' => $feeRows->count(),
                'students' => $studentRows->count(),
                'routes' => $routeRows->count(),
                'highRisk' => $scores->whereIn('category', ['fee_defaulter', 'student_risk'])->where('tier', 'high')->count(),
            ],
            'leads' => $leadRows->all(),
            'feeDefaulters' => $feeRows->all(),
            'riskStudents' => $studentRows->all(),
            'routes' => $routeRows->all(),
            'alerts' => $alerts->all(),
            'aiConfigured' => $aiConfigured,
            'canManage' => in_array($user->role, ['super_admin', 'admin'], true),
        ]);
    }

    public function refresh(Request $request): RedirectResponse
    {
        $user = $request->user();
        $organization = $this->resolveOrganizationForUser($user);
        abort_unless($organization, 403);

        $setting = is_array($organization->settings) ? ($organization->settings['ai'] ?? []) : [];
        $aiConfigured = ($setting['mode'] ?? config('ai.mode')) === 'local' || ! empty($setting['api_key']) || filled(config('ai.api_key'));

        $result = $this->analyticsService->refreshOrganization($organization->id, ['narrate' => $aiConfigured]);

        return back()->with(
            'success',
            "AI analytics refreshed: {$result['leads']} leads, {$result['fees']} fee records, {$result['students']} students, {$result['routes']} route suggestions. {$result['alerts']} alert(s) sent."
        );
    }

    private function serialize(AiScore $score): array
    {
        return [
            'id' => $score->id,
            'category' => $score->category,
            'entity_type' => $score->entity_type,
            'entity_id' => $score->entity_id,
            'score' => $score->score,
            'tier' => $score->tier,
            'breakdown' => $score->score_breakdown,
            'context' => $score->context,
            'narrative' => $score->narrative,
            'computed_at' => $score->computed_at?->toIso8601String(),
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
        } catch (\Throwable) {
            return null;
        }
    }
}