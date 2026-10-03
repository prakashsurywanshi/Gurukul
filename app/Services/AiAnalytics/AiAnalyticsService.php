<?php

namespace App\Services\AiAnalytics;

use App\Models\AiScore;
use App\Models\Lead;
use App\Models\Organization;
use App\Models\Student;
use App\Models\StudentFee;
use App\Services\Ai\AiProviderClient;
use App\Services\SystemNotificationService;
use Carbon\Carbon;
use Throwable;

class AiAnalyticsService
{
    private const ALERT_CATEGORIES = ['fee_defaulter', 'student_risk'];

    private const ALERT_THRESHOLD = 70;

    public function __construct(
        private readonly ScoreEngine $scoreEngine,
        private readonly RouteOptimizerSuggestions $routeSuggestions,
        private readonly SystemNotificationService $notificationService
    ) {
    }

    /**
     * Recompute deterministic AI scores for a whole organization.
     *
     * @return array{leads: int, fees: int, students: int, routes: int, alerts: int, narrated: bool}
     */
    public function refreshOrganization(int $organizationId, array $options = []): array
    {
        $organization = Organization::query()->findOrFail($organizationId);

        $previouslyHigh = AiScore::query()
            ->where('organization_id', $organizationId)
            ->whereIn('category', self::ALERT_CATEGORIES)
            ->where('tier', ScoreEngine::TIER_HIGH)
            ->get()
            ->mapWithKeys(fn (AiScore $score) => [$score->category.':'.$score->entity_id => true])
            ->all();

        AiScore::query()->where('organization_id', $organizationId)->delete();

        $leads = $this->scoreLeads($organization);
        $fees = $this->scoreFees($organization);
        $students = $this->scoreStudents($organization);
        $routes = $this->scoreRoutes($organization);

        $newlyHigh = collect([...$leads, ...$fees, ...$students])
            ->filter(fn (array $row) => in_array($row['category'], self::ALERT_CATEGORIES, true) && $row['tier'] === ScoreEngine::TIER_HIGH && ! isset($previouslyHigh[$row['category'].':'.$row['entity_id']]))
            ->values();

        $alerts = 0;
        foreach ($newlyHigh as $row) {
            $this->notifyRiskAlert($organization, $row);
            $alerts++;
        }

        $narrated = false;
        if ($options['narrate'] ?? false) {
            $narrated = $this->narrateTopRisks($organization, $students);
        }

        return [
            'leads' => count($leads),
            'fees' => count($fees),
            'students' => count($students),
            'routes' => count($routes),
            'alerts' => $alerts,
            'narrated' => $narrated,
        ];
    }

    /**
     * @return array<int, array{category: string, entity_type: string, entity_id: int, score: int, tier: string, score_breakdown: array, context: array}>
     */
    private function scoreLeads(Organization $organization): array
    {
        $leads = Lead::query()
            ->where('organization_id', $organization->id)
            ->whereIn('status', ['new', 'contacted', 'interested'])
            ->get();

        $rows = [];
        foreach ($leads as $lead) {
            $result = $this->scoreEngine->scoreLead($lead);

            $rows[] = [
                'category' => 'lead',
                'entity_type' => Lead::class,
                'entity_id' => (int) $lead->id,
                'score' => $result['score'],
                'tier' => $result['tier'],
                'score_breakdown' => $result['breakdown'],
                'context' => [
                    'name' => $lead->student_name,
                    'source' => $lead->source,
                    'priority' => $lead->priority,
                    'status' => $lead->status,
                    'assigned_to' => $lead->assigned_to,
                    'follow_up_date' => $lead->follow_up_date?->toDateString(),
                    'created_at' => $lead->created_at?->toDateString(),
                ],
            ];
        }

        return $this->storeRows($organization, $rows);
    }

    /**
     * @return array<int, array{category: string, entity_type: string, entity_id: int, score: int, tier: string, score_breakdown: array, context: array}>
     */
    private function scoreFees(Organization $organization): array
    {
        $fees = StudentFee::query()
            ->where('organization_id', $organization->id)
            ->where('balance', '>', 0)
            ->with(['student' => fn ($query) => $query->select('id', 'first_name', 'last_name')])
            ->get();

        $rows = [];
        foreach ($fees as $fee) {
            $result = $this->scoreEngine->scoreFeeDefaulter($fee);

            $rows[] = [
                'category' => 'fee_defaulter',
                'entity_type' => StudentFee::class,
                'entity_id' => (int) $fee->id,
                'score' => $result['score'],
                'tier' => $result['tier'],
                'score_breakdown' => $result['breakdown'],
                'context' => [
                    'student_id' => $fee->student_id,
                    'student_name' => $fee->student ? trim(($fee->student->first_name ?? '').' '.($fee->student->last_name ?? '')) : null,
                    'balance' => (float) $fee->balance,
                    'due_date' => $fee->due_date?->toDateString(),
                    'fine' => (float) $fee->fine,
                    'fee_structure_id' => $fee->fee_structure_id,
                ],
            ];
        }

        return $this->storeRows($organization, $rows);
    }

    /**
     * @return array<int, array{category: string, entity_type: string, entity_id: int, score: int, tier: string, score_breakdown: array, context: array}>
     */
    public function scoreStudents(Organization $organization): array
    {
        $students = Student::query()
            ->forCurrentSession($organization->id)
            ->select('id', 'first_name', 'last_name', 'class_id', 'gender', 'status')
            ->get();

        $rows = [];
        foreach ($students as $student) {
            $result = $this->scoreEngine->scoreStudentRisk($student, $organization->id);

            $rows[] = [
                'category' => 'student_risk',
                'entity_type' => Student::class,
                'entity_id' => (int) $student->id,
                'score' => $result['score'],
                'tier' => $result['tier'],
                'score_breakdown' => $result['breakdown'],
                'context' => [
                    'name' => trim(($student->first_name ?? '').' '.($student->last_name ?? '')),
                    'class_id' => $student->class_id,
                    'gender' => $student->gender,
                ],
            ];
        }

        return $this->storeRows($organization, $rows);
    }

    public function scoreRoutes(Organization $organization): array
    {
        $activeYearId = $organization->selectedAcademicYear()?->id;

        $suggestions = $this->routeSuggestions->suggest($organization->id, $activeYearId);

        $rows = [];
        $severityScores = ['high' => 90, 'medium' => 60, 'low' => 30];

        foreach (array_values($suggestions) as $index => $suggestion) {
            $score = $severityScores[$suggestion['severity']] ?? 30;

            $rows[] = [
                'category' => 'route',
                'entity_type' => 'route_suggestion',
                'entity_id' => $index + 1,
                'score' => $score,
                'tier' => $this->scoreEngine->tier($score),
                'score_breakdown' => [],
                'context' => [
                    'type' => $suggestion['type'],
                    'severity' => $suggestion['severity'],
                    'title' => $suggestion['title'],
                    'detail' => $suggestion['detail'],
                    'data' => $suggestion['context'] ?? [],
                ],
            ];
        }

        return $this->storeRows($organization, $rows);
    }

    /**
     * @param array<int, array<string, mixed>> $rows
     */
    private function storeRows(Organization $organization, array $rows): array
    {
        $now = Carbon::now();

        foreach ($rows as $row) {
            AiScore::query()->create([
                'organization_id' => $organization->id,
                'category' => $row['category'],
                'entity_type' => $row['entity_type'],
                'entity_id' => $row['entity_id'],
                'score' => $row['score'],
                'tier' => $row['tier'],
                'score_breakdown' => $row['score_breakdown'] ?? [],
                'context' => $row['context'] ?? [],
                'narrative' => $row['narrative'] ?? null,
                'computed_at' => $now,
            ]);
        }

        return $rows;
    }

    /**
     * @param array{category: string, entity_type: string, entity_id: int, score: int, tier: string, score_breakdown: array, context: array} $row
     */
    private function notifyRiskAlert(Organization $organization, array $row): void
    {
        $label = $row['category'] === 'fee_defaulter'
            ? 'Fee defaulter'
            : 'At-risk student';

        $name = $row['context']['student_name'] ?? $row['context']['name'] ?? '#'.$row['entity_id'];

        $this->notificationService->notifyAdmins(
            $organization,
            'ai_risk_alert',
            "AI alert: high {$label}",
            "{$name} crossed the risk threshold with a score of {$row['score']}.",
            [
                'score' => $row['score'],
                'category' => $row['category'],
                'entity_type' => $row['entity_type'],
                'entity_id' => $row['entity_id'],
            ]
        );
    }

    /**
     * @param array<int, array<string, mixed>> $students
     */
    private function narrateTopRisks(Organization $organization, array $students): bool
    {
        $top = collect($students)
            ->filter(fn (array $row) => $row['tier'] === ScoreEngine::TIER_HIGH)
            ->sortByDesc('score')
            ->take(3)
            ->values();

        if ($top->isEmpty()) {
            return false;
        }

        $config = $this->aiConfig($organization);
        if (! $config['configured']) {
            return false;
        }

        $lines = $top->map(fn (array $row) => "- {$row['context']['name']}: risk score {$row['score']} / 100 (".implode(', ', array_keys(array_filter($row['score_breakdown']))).')')->implode("\n");

        try {
            $client = new AiProviderClient($config['resolved']);
            $narrative = $client->complete(
                "You are a school administrator's analytics assistant. Write a concise 3-4 sentence risk summary for the students listed, suggesting practical interventions. Avoid medical or legal claims.",
                "Students at risk at {$organization->name}:\n{$lines}"
            );

            $entityIds = $top->pluck('entity_id')->all();
            AiScore::query()
                ->where('organization_id', $organization->id)
                ->where('category', 'student_risk')
                ->whereIn('entity_id', $entityIds)
                ->update(['narrative' => $narrative]);

            return true;
        } catch (Throwable) {
            return false;
        }
    }

    /**
     * @return array{configured: bool, resolved: array<string, mixed>}
     */
    private function aiConfig(Organization $organization): array
    {
        $settings = is_array($organization->settings) ? $organization->settings : [];
        $saved = $settings['ai'] ?? [];

        $mode = $saved['mode'] ?? config('ai.mode');
        $baseUrl = ($saved['base_url'] ?? '') ?: (config('ai.base_url') ?: config('ai.default_base_url'));
        $model = ($saved['model'] ?? '') ?: (config('ai.model') ?: config('ai.default_model'));
        $apiKey = ! empty($saved['api_key'] ?? '') ? $saved['api_key'] : (config('ai.api_key') ?: '');
        $temperature = (float) ($saved['temperature'] ?? 0.3);
        $timeout = (int) ($saved['timeout'] ?? 60);

        return [
            'configured' => $mode === 'local' || ! empty($apiKey),
            'resolved' => [
                'mode' => $mode,
                'base_url' => $baseUrl,
                'model' => $model,
                'api_key' => $apiKey,
                'temperature' => $temperature,
                'timeout' => $timeout,
            ],
        ];
    }
}