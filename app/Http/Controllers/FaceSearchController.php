<?php

namespace App\Http\Controllers;

use App\Models\Organization;
use App\Models\User;
use App\Services\Ai\AiProviderClient;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\Auth;
use RuntimeException;
use Throwable;

class FaceSearchController extends Controller
{
    public function index(Request $request)
    {
        $user = Auth::user();
        $organization = $this->resolveOrganizationForUser($user);

        abort_unless($organization, 403);

        $config = $this->aiConfig($organization);

        return inertia('dashboard/FaceSearch', [
            'user' => $user,
            'configured' => $config['configured'],
            'mode' => $config['resolved']['mode'],
            'spike' => true,
            'faceResult' => $request->session()->get('faceResult'),
        ]);
    }

    public function search(Request $request)
    {
        $user = Auth::user();
        $organization = $this->resolveOrganizationForUser($user);

        abort_unless($organization, 403);

        $request->validate([
            'photo' => ['required', 'image', 'mimes:jpeg,jpg,png,webp', 'max:4096'],
        ]);

        $config = $this->aiConfig($organization);

        if ($config['resolved']['mode'] === 'local') {
            return back()->with('error', 'Face Search is a spike and requires an OpenAI-compatible AI provider with vision. Configure AI settings first, or enable the fallback manual search below.');
        }

        try {
            $file = $request->file('photo');
            $contents = $file->get();
            $mime = $file->getMimeType() ?: 'image/jpeg';
            $dataUrl = 'data:' . $mime . ';base64,' . base64_encode($contents);

            $system = 'You are a facial-recognition spike assistant for a school ERP. '
                . 'Analyze the supplied photo and report:
                1) Is the image a clear, front-facing photo of a single person? yes/no.
                2) Physical characteristics that could be compared in a future embedding pipeline (age group, hair, visible distinguishing traits).
                3) Any safety or quality concerns (blur, multiple subjects, occlusions).
                Respond with concise bullet points.';

            $userPrompt = 'Analyze this photo for facial-recognition suitability.';

            $client = new AiProviderClient($config['resolved']);
            $analysis = $client->completeVision($system, $userPrompt, $dataUrl);

            return back()->with('faceResult', [
                'file' => $file->getClientOriginalName(),
                'size' => $file->getSize(),
                'analysis' => $analysis,
            ]);
        } catch (Throwable $e) {
            \Log::warning('Face Search spike failed', ['error' => $e->getMessage()]);

            return back()->with('error', $this->friendlyError($e));
        }
    }

    private function aiConfig(Organization $organization): array
    {
        $settings = is_array($organization->settings) ? $organization->settings : [];
        $saved = $settings['ai'] ?? [];

        $mode = $saved['mode'] ?? env('AI_MODE', 'openai');
        $baseUrl = ($saved['base_url'] ?? '') ?: env('AI_BASE_URL', 'https://api.openai.com/v1');
        $model = ($saved['model'] ?? '') ?: env('AI_MODEL', 'gpt-4o-mini');
        $apiKey = !empty($saved['api_key'] ?? '') ? $saved['api_key'] : (env('AI_API_KEY') ?: '');
        $temperature = 0.2;

        return [
            'configured' => $mode === 'local' || !empty($apiKey),
            'resolved' => [
                'mode' => $mode,
                'base_url' => $baseUrl,
                'model' => $model,
                'api_key' => $apiKey,
                'temperature' => $temperature,
                'timeout' => 60,
            ],
        ];
    }

    private function friendlyError(Throwable $e): string
    {
        $message = strtolower($e->getMessage());

        if (str_contains($message, 'not configured')) {
            return 'AI provider is not configured. An administrator must configure the AI settings first.';
        }

        if (str_contains($message, 'vision')) {
            return 'The configured AI provider does not support vision requests. Use a vision-capable model (e.g. gpt-4o-mini).';
        }

        return 'The vision pipeline could not reach the provider right now. Please try again later.';
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