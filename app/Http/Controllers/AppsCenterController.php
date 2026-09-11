<?php

namespace App\Http\Controllers;

use App\Models\Organization;
use App\Models\User;
use App\Services\Ai\AiProviderClient;
use Illuminate\Http\RedirectResponse;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\Auth;
use Throwable;

class AppsCenterController extends Controller
{
    public function index(Request $request)
    {
        $user = Auth::user();
        $organization = $this->resolveOrganizationForUser($user);

        abort_unless($organization, 403);

        $config = $this->aiConfig($organization);
        $result = $request->session()->get('appResult');

        return inertia('dashboard/AppsCenter', [
            'user' => $user,
            'apps' => $this->apps(),
            'aiConfigured' => $config['configured'],
            'result' => $result,
        ]);
    }

    public function questionPaper(Request $request): RedirectResponse
    {
        $user = $request->user();
        $organization = $this->resolveOrganizationForUser($user);

        abort_unless($organization, 403);

        $validated = $request->validate([
            'subject' => ['required', 'string', 'max:120'],
            'class' => ['required', 'string', 'max:120'],
            'total_marks' => ['nullable', 'integer', 'min:10', 'max:500'],
            'sections' => ['nullable', 'string', 'max:300'],
        ]);

        $config = $this->aiConfig($organization);

        try {
            $client = new AiProviderClient($config['resolved']);

            $system = 'You are an expert school exam question paper generator. '
                .'Return a complete question paper in plain text with sections, per-question marks, '
                .'total marks and a short marking scheme. Do not use markdown tables.';

            $userPrompt = sprintf(
                "Generate a %s question paper for subject %s for class %s with total %s marks. Sections: %s",
                $validated['class'],
                $validated['subject'],
                $validated['class'],
                $validated['total_marks'] ?? 100,
                $validated['sections'] ?: 'Section A objective, Section B short answer, Section C long answer'
            );

            $content = $client->complete($system, $userPrompt);

            $request->session()->flash('appResult', [
                'app' => 'question-paper',
                'content' => $content,
                'meta' => [
                    'subject' => $validated['subject'],
                    'class' => $validated['class'],
                    'marks' => $validated['total_marks'] ?? 100,
                ],
            ]);

            return back()->with('success', 'Question paper generated.');
        } catch (Throwable $e) {
            return back()->with('error', $this->friendlyError($e));
        }
    }

    private function apps(): array
    {
        return [
            [
                'id' => 'question-paper',
                'label' => 'Question Paper Generator',
                'description' => 'Generate a complete exam question paper with marking scheme using AI.',
                'icon' => 'FileText',
                'type' => 'action',
                'category' => 'AI Tools',
                'status' => 'live',
                'route' => '/apps/question-paper',
            ],
            [
                'id' => 'student-360',
                'label' => 'Student 360 View',
                'description' => 'One-click access to the full student profile and records.',
                'icon' => 'ScanEye',
                'type' => 'link',
                'category' => 'Students',
                'status' => 'live',
                'route' => '/search_students',
            ],
            [
                'id' => 'export-center',
                'label' => 'Data Export Center',
                'description' => 'Generate MIS reports and analytics exports.',
                'icon' => 'FileSpreadsheet',
                'type' => 'link',
                'category' => 'Reports',
                'status' => 'live',
                'route' => '/reports',
            ],
            [
                'id' => 'ai-assistant',
                'label' => 'AI Assistant',
                'description' => 'Ask the school copilot questions about your data.',
                'icon' => 'Bot',
                'type' => 'link',
                'category' => 'AI Tools',
                'status' => 'live',
                'route' => '/ai-assistant',
            ],
            [
                'id' => 'templates',
                'label' => 'Certificate Templates',
                'description' => 'Design certificate, marksheet and ID card templates.',
                'icon' => 'FileBadge',
                'type' => 'link',
                'category' => 'Productivity',
                'status' => 'live',
                'route' => '/certificates',
            ],
            [
                'id' => 'regulators',
                'label' => 'Regulator Reports',
                'description' => 'Prepare regulatory and compliance reports.',
                'icon' => 'FileClock',
                'type' => 'link',
                'category' => 'Reports',
                'status' => 'live',
                'route' => '/regulator-reports',
            ],
            [
                'id' => 'sms-broadcast',
                'label' => 'SMS & Email Broadcast',
                'description' => 'Send bulk notifications to parents and staff. Launching soon.',
                'icon' => 'FileText',
                'type' => 'link',
                'category' => 'Communication',
                'status' => 'coming_soon',
                'route' => '/communication',
            ],
            [
                'id' => 'e-library',
                'label' => 'Digital Library',
                'description' => 'Digital textbooks, question banks and reading lists. Launching soon.',
                'icon' => 'FileSpreadsheet',
                'type' => 'link',
                'category' => 'Academic',
                'status' => 'coming_soon',
                'route' => '/library-books',
            ],
            [
                'id' => 'smart-attendance',
                'label' => 'Smart Attendance',
                'description' => 'Biometric and face recognition powered attendance. Launching soon.',
                'icon' => 'ScanEye',
                'type' => 'link',
                'category' => 'Attendance',
                'status' => 'coming_soon',
                'route' => '/biometric-devices',
            ],
        ];
    }

    private function aiConfig(Organization $organization): array
    {
        $settings = is_array($organization->settings) ? $organization->settings : [];
        $saved = $settings['ai'] ?? [];

        $mode = $saved['mode'] ?? env('AI_MODE', 'openai');
        $baseUrl = ($saved['base_url'] ?? '') ?: env('AI_BASE_URL', 'https://api.openai.com/v1');
        $model = ($saved['model'] ?? '') ?: env('AI_MODEL', 'gpt-4o-mini');
        $apiKey = !empty($saved['api_key'] ?? '') ? $saved['api_key'] : (env('AI_API_KEY') ?: '');
        $temperature = (float) ($saved['temperature'] ?? 0.3);
        $timeout = (int) ($saved['timeout'] ?? 60);

        return [
            'configured' => $mode === 'local' || !empty($apiKey),
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

    private function friendlyError(Throwable $e): string
    {
        $message = $e->getMessage();

        if (str_contains($message, 'not configured')) {
            return 'AI provider is not configured. An administrator must configure the AI settings first.';
        }

        return 'The app could not reach the provider right now. Please try again later.';
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