<?php

namespace App\Http\Controllers;

use App\Models\Organization;
use App\Models\SchoolClass;
use App\Models\Student;
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
            'faceResults' => $request->session()->get('faceResults'),
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

    public function kioskIndex(Request $request)
    {
        $user = Auth::user();
        $organization = $this->resolveOrganizationForUser($user);

        abort_unless($organization, 403);

        $config = $this->aiConfig($organization);

        return inertia('dashboard/FaceSearchKiosk', [
            'user' => $user,
            'configured' => $config['configured'],
            'mode' => $config['resolved']['mode'],
            'faceResults' => $request->session()->get('faceResults'),
        ]);
    }

    public function kiosk(Request $request)
    {
        $user = Auth::user();
        $organization = $this->resolveOrganizationForUser($user);

        abort_unless($organization, 403);

        $request->validate([
            'photos' => ['required', 'array', 'min:1', 'max:5'],
            'photos.*' => ['image', 'mimes:jpeg,jpg,png,webp', 'max:4096'],
        ]);

        $config = $this->aiConfig($organization);

        if ($config['resolved']['mode'] === 'local') {
            return back()->with('error', 'Face Search requires an OpenAI-compatible AI provider with vision. Configure AI settings first.');
        }

        $results = [];

        try {
            foreach ($request->file('photos') as $file) {
                $contents = $file->get();
                $mime = $file->getMimeType() ?: 'image/jpeg';
                $dataUrl = 'data:' . $mime . ';base64,' . base64_encode($contents);

                $system = 'You are a facial-recognition kiosk assistant for a school ERP. '
                    . 'Analyze the supplied photo and respond with STRICT JSON only, no markdown, no prose. '
                    . 'JSON schema: {"quality":"good|average|poor","gender":"male|female|unknown","estimatedAge":<int or null>,"description":"<one short sentence>"}. '
                    . 'Quality reflects clarity and front-facing posture. If faces are unclear or not a single person, set quality to poor and gender/estimatedAge to unknown.';

                $userPrompt = 'Analyze this photo for student record matching. Estimated age should be an integer in years, or null when unknowable.';

                $client = new AiProviderClient($config['resolved']);
                $analysis = $client->completeVision($system, $userPrompt, $dataUrl);

                $attributes = $this->parseKioskAnalysis($analysis);

                $results[] = [
                    'file' => $file->getClientOriginalName(),
                    'size' => $file->getSize(),
                    'analysis' => $analysis,
                    'attributes' => $attributes,
                    'candidates' => $this->matchCandidates($organization, $attributes),
                ];
            }
        } catch (Throwable $e) {
            \Log::warning('Face Search kiosk failed', ['error' => $e->getMessage()]);

            return back()->with('error', $this->friendlyError($e));
        }

        return back()->with('faceResults', $results);
    }

    private function parseKioskAnalysis(string $analysis): array
    {
        $fallback = [
            'quality' => 'unknown',
            'gender' => 'unknown',
            'estimatedAge' => null,
            'description' => $analysis,
        ];

        if (! preg_match('/\{[\s\S]*\}/', $analysis, $match)) {
            return $fallback;
        }

        $decoded = json_decode(trim($match[0]), true);

        if (! is_array($decoded)) {
            return $fallback;
        }

        $quality = in_array($decoded['quality'] ?? null, ['good', 'average', 'poor'], true)
            ? $decoded['quality']
            : 'unknown';

        $gender = in_array($decoded['gender'] ?? null, ['male', 'female'], true)
            ? $decoded['gender']
            : 'unknown';

        $age = filter_var($decoded['estimatedAge'] ?? null, FILTER_VALIDATE_INT);

        return [
            'quality' => $quality,
            'gender' => $gender,
            'estimatedAge' => ($age !== false && $age > 0 && $age < 90) ? $age : null,
            'description' => is_string($decoded['description'] ?? null)
                ? $decoded['description']
                : $analysis,
        ];
    }

    private function matchCandidates(Organization $organization, array $attributes): array
    {
        if ($attributes['gender'] === 'unknown' && $attributes['estimatedAge'] === null) {
            return [];
        }

        $classes = SchoolClass::query()
            ->where('organization_id', $organization->id)
            ->get(['id', 'name', 'section'])
            ->mapWithKeys(fn (SchoolClass $schoolClass) => [
                $schoolClass->id => trim(($schoolClass->name ?? '').' '.($schoolClass->section ?? '')),
            ]);

        $students = Student::query()
            ->where('organization_id', $organization->id)
            ->where('status', 'active')
            ->get(['id', 'admission_no', 'first_name', 'last_name', 'gender', 'date_of_birth', 'class_id']);

        $detectedGender = $attributes['gender'];
        $detectedAge = $attributes['estimatedAge'];

        $candidates = collect();

        foreach ($students as $student) {
            $score = 0;

            if ($detectedGender !== 'unknown' && $student->gender === $detectedGender) {
                $score += 50;
            }

            if ($detectedAge !== null && $student->date_of_birth) {
                $age = $student->date_of_birth->age;
                $diff = abs($age - $detectedAge);

                if ($diff === 0) {
                    $score += 50;
                } elseif ($diff === 1) {
                    $score += 35;
                } elseif ($diff <= 2) {
                    $score += 20;
                }
            }

            if ($score === 0) {
                continue;
            }

            $candidates->push([
                'score' => $score,
                'student' => [
                    'id' => (string) $student->id,
                    'admission_no' => $student->admission_no,
                    'first_name' => $student->first_name,
                    'last_name' => $student->last_name,
                    'class' => $student->class_id ? ($classes[$student->class_id] ?? null) : null,
                ],
            ]);
        }

        return $candidates
            ->sortByDesc('score')
            ->take(3)
            ->values()
            ->map(fn (array $entry, int $rank) => ['rank' => $rank + 1] + $entry)
            ->all();
    }

    private function aiConfig(Organization $organization): array
    {
        $settings = is_array($organization->settings) ? $organization->settings : [];
        $saved = $settings['ai'] ?? [];

        $mode = $saved['mode'] ?? config('ai.mode');
        $baseUrl = ($saved['base_url'] ?? '') ?: (config('ai.base_url') ?: config('ai.default_base_url'));
        $model = ($saved['model'] ?? '') ?: (config('ai.model') ?: config('ai.default_model'));
        $apiKey = !empty($saved['api_key'] ?? '') ? $saved['api_key'] : (config('ai.api_key') ?: '');
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