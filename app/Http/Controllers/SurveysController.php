<?php

namespace App\Http\Controllers;

use App\Models\Organization;
use App\Models\Survey;
use App\Models\SurveyAnswer;
use App\Models\SurveyQuestion;
use App\Models\SurveyResponse;
use App\Models\User;
use Illuminate\Http\RedirectResponse;
use Illuminate\Http\Request;
use Illuminate\Validation\Rule;
use Inertia\Inertia;
use Inertia\Response;

class SurveysController extends Controller
{
    public function index(Request $request): Response
    {
        $user = $request->user();
        $organization = $this->resolveOrganizationForUser($user);
        abort_unless($organization, 403);
        $this->abortUnlessAdmin($user);

        $surveys = Survey::query()
            ->where('organization_id', $organization->id)
            ->with(['questions', 'responses'])
            ->orderByDesc('id')
            ->get()
            ->map(function (Survey $survey) {
                $ratings = $survey->responses->flatMap(fn (SurveyResponse $response) => $response->answers->pluck('rating'))->filter(fn ($value) => $value !== null);

                return [
                    'id' => $survey->id,
                    'title' => $survey->title,
                    'description' => $survey->description,
                    'audience' => $survey->audience,
                    'status' => $survey->status,
                    'startsOn' => $survey->starts_on?->toDateString(),
                    'endsOn' => $survey->ends_on?->toDateString(),
                    'questions' => $survey->questions->map(fn (SurveyQuestion $question) => [
                        'id' => $question->id,
                        'question' => $question->question,
                        'type' => $question->type,
                        'options' => $question->options ?? [],
                        'sortOrder' => $question->sort_order,
                    ])->values(),
                    'responsesCount' => $survey->responses->count(),
                    'avgRating' => $ratings->count() > 0 ? round($ratings->avg(), 1) : null,
                ];
            });

        $visible = $surveys->filter(fn ($survey) => $survey['status'] === 'active')->values();

        return Inertia::render('dashboard/Surveys', [
            'user' => $user,
            'surveys' => $surveys,
            'myResponses' => $user ? $this->myResponseIds($organization, $user) : [],
            'summary' => [
                'activeSurveys' => $surveys->filter(fn ($survey) => $survey['status'] === 'active')->count(),
                'totalResponses' => SurveyResponse::query()->where('organization_id', $organization->id)->count(),
                'mySurveys' => $visible->count(),
            ],
            'canManage' => in_array($user->role, ['admin', 'super_admin'], true),
        ]);
    }

    public function mine(Request $request): Response
    {
        $user = $request->user();
        $organization = $this->resolveOrganizationForUser($user);
        abort_unless($organization, 403);

        $surveys = Survey::query()
            ->where('organization_id', $organization->id)
            ->where('status', 'active')
            ->with(['questions', 'responses'])
            ->orderByDesc('id')
            ->get()
            ->map(fn (Survey $survey) => $this->surveyPayload($survey));

        return Inertia::render('dashboard/Surveys', [
            'user' => $user,
            'surveys' => $surveys->values(),
            'myResponses' => $this->myResponseIds($organization, $user),
            'summary' => [
                'activeSurveys' => $surveys->count(),
                'totalResponses' => SurveyResponse::query()->where('organization_id', $organization->id)->count(),
                'mySurveys' => $surveys->values()->count(),
            ],
            'canManage' => false,
            'mineMode' => true,
        ]);
    }

    private function surveyPayload(Survey $survey): array
    {
        $ratings = $survey->responses->flatMap(fn (SurveyResponse $response) => $response->answers->pluck('rating'))
            ->filter(fn ($value) => $value !== null);

        return [
            'id' => $survey->id,
            'title' => $survey->title,
            'description' => $survey->description,
            'audience' => $survey->audience,
            'status' => $survey->status,
            'startsOn' => $survey->starts_on?->toDateString(),
            'endsOn' => $survey->ends_on?->toDateString(),
            'questions' => $survey->questions->map(fn (SurveyQuestion $question) => [
                'id' => $question->id,
                'question' => $question->question,
                'type' => $question->type,
                'options' => $question->options ?? [],
                'sortOrder' => $question->sort_order,
            ])->values(),
            'responsesCount' => $survey->responses->count(),
            'avgRating' => $ratings->count() > 0 ? round($ratings->avg(), 1) : null,
        ];
    }

    public function guide(Request $request): Response
    {
        $organization = $this->resolveOrganizationForUser($request->user());
        abort_unless($organization, 403);

        return Inertia::render('dashboard/SurveyGuide', ['user' => $request->user()]);
    }

    public function storeSurvey(Request $request): RedirectResponse
    {
        $organization = $this->resolveOrganizationForUser($request->user());
        abort_unless($organization, 403);
        $this->abortUnlessAdmin($request->user());

        $validated = $request->validate([
            'title' => ['required', 'string', 'max:255'],
            'description' => ['nullable', 'string', 'max:2000'],
            'audience' => ['required', Rule::in(['staff', 'parent', 'student', 'all'])],
            'status' => ['required', Rule::in(['active', 'closed'])],
            'starts_on' => ['nullable', 'date'],
            'ends_on' => ['nullable', 'date'],
            'questions' => ['required', 'array', 'min:1'],
            'questions.*.question' => ['required', 'string', 'max:255'],
            'questions.*.type' => ['required', Rule::in(['rating', 'choice', 'yesno', 'text'])],
            'questions.*.options' => ['nullable', 'array'],
        ]);

        $survey = Survey::query()->create([
            'organization_id' => $organization->id,
            'title' => $validated['title'],
            'description' => $validated['description'] ?? null,
            'audience' => $validated['audience'],
            'status' => $validated['status'],
            'starts_on' => $validated['starts_on'] ?? null,
            'ends_on' => $validated['ends_on'] ?? null,
        ]);

        foreach ($validated['questions'] as $index => $question) {
            SurveyQuestion::query()->create([
                'survey_id' => $survey->id,
                'question' => $question['question'],
                'type' => $question['type'],
                'options' => $question['type'] === 'choice' ? ($question['options'] ?? []) : null,
                'sort_order' => $index,
            ]);
        }

        return back()->with('success', 'Survey created.');
    }

    public function updateSurvey(Request $request, Survey $survey): RedirectResponse
    {
        $organization = $this->resolveOrganizationForUser($request->user());
        abort_unless($organization, 403);
        $this->abortUnlessAdmin($request->user());
        abort_unless($survey->organization_id === $organization->id, 404);

        $validated = $request->validate([
            'status' => ['required', Rule::in(['active', 'closed'])],
        ]);

        $survey->update(['status' => $validated['status']]);

        return back()->with('success', 'Survey updated.');
    }

    public function destroySurvey(Request $request, Survey $survey): RedirectResponse
    {
        $organization = $this->resolveOrganizationForUser($request->user());
        abort_unless($organization, 403);
        $this->abortUnlessAdmin($request->user());
        abort_unless($survey->organization_id === $organization->id, 404);

        $survey->delete();

        return back()->with('success', 'Survey deleted.');
    }

    public function storeResponse(Request $request): RedirectResponse
    {
        $user = $request->user();
        $organization = $this->resolveOrganizationForUser($user);
        abort_unless($organization, 403);

        $validated = $request->validate([
            'survey_id' => ['required', 'integer', Rule::exists('surveys', 'id')->where('organization_id', $organization->id)],
            'answers' => ['required', 'array'],
            'answers.*.question_id' => ['required', 'integer'],
            'answers.*.rating' => ['nullable', 'integer', 'min:1', 'max:5'],
            'answers.*.answer_text' => ['nullable', 'string'],
            'answers.*.choices' => ['nullable', 'array'],
        ]);

        $survey = Survey::query()->findOrFail($validated['survey_id']);

        if ($survey->status !== 'active') {
            abort(422, 'This survey is closed.');
        }

        $already = SurveyResponse::query()
            ->where('survey_id', $survey->id)
            ->where('respondent_user_id', $user ? $user->id : null)
            ->exists();

        if ($already) {
            abort(422, 'You have already submitted this survey.');
        }

        $response = SurveyResponse::query()->create([
            'organization_id' => $organization->id,
            'survey_id' => $survey->id,
            'respondent_user_id' => $user ? $user->id : null,
            'respondent_name' => $user?->name,
            'submitted_at' => now(),
        ]);

        foreach ($validated['answers'] as $entry) {
            SurveyAnswer::query()->create([
                'survey_response_id' => $response->id,
                'survey_question_id' => $entry['question_id'],
                'rating' => $entry['rating'] ?? null,
                'answer_text' => $entry['answer_text'] ?? null,
                'choices' => $entry['choices'] ?? null,
            ]);
        }

        return back()->with('success', 'Survey submitted. Thank you!');
    }

    private function myResponseIds(Organization $organization, User $user): array
    {
        return SurveyResponse::query()
            ->where('organization_id', $organization->id)
            ->where('respondent_user_id', $user->id)
            ->pluck('survey_id')
            ->all();
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