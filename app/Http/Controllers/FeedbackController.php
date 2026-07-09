<?php

namespace App\Http\Controllers;

use App\Models\FeedbackCampaign;
use App\Models\FeedbackResponse;
use App\Models\Organization;
use App\Models\Student;
use App\Models\User;
use Illuminate\Http\RedirectResponse;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\Auth;
use Illuminate\Support\Facades\DB;
use Illuminate\Validation\Rule;
use Inertia\Inertia;
use Inertia\Response;

class FeedbackController extends Controller
{
    public function index(): Response
    {
        $user = Auth::user();
        $organization = $this->resolveOrganizationForUser($user);

        abort_unless($organization && in_array($user->role, ['admin', 'student'], true), 403);

        if ($user->role === 'student') {
            $student = $this->resolveStudentForUser($user, $organization);

            return Inertia::render('dashboard/StudentFeedback', [
                'user' => $user,
                'schoolName' => $organization->name,
                'studentRecord' => $student ? $this->serializeStudent($student) : null,
                'teachers' => $this->getTeachers($organization),
                'campaigns' => $student ? $this->getStudentCampaigns($organization, $student) : [],
            ]);
        }

        return Inertia::render('dashboard/FeedbackManagement', [
            'user' => $user,
            'schoolName' => $organization->name,
            'teacherCount' => $this->teacherQuery($organization)->count(),
            'studentCount' => $this->studentQuery($organization)->count(),
            'teachers' => $this->getTeachers($organization),
            'campaigns' => $this->getAdminCampaigns($organization),
        ]);
    }

    public function store(Request $request): RedirectResponse
    {
        $user = Auth::user();
        $organization = $this->resolveOrganizationForUser($user);

        abort_unless($organization && $user->role === 'admin', 403);

        $validated = $request->validate([
            'title' => ['required', 'string', 'max:255'],
            'description' => ['nullable', 'string', 'max:3000'],
            'due_date' => ['nullable', 'date'],
            'status' => ['required', Rule::in(['active', 'closed'])],
        ]);

        FeedbackCampaign::query()->create([
            'organization_id' => $organization->id,
            'title' => $validated['title'],
            'description' => $validated['description'] ?: null,
            'due_date' => $validated['due_date'] ?: null,
            'status' => $validated['status'],
            'created_by' => $user->id,
        ]);

        return redirect()->route('feedback')->with('success', 'Feedback campaign created successfully.');
    }

    public function update(Request $request, FeedbackCampaign $feedbackCampaign): RedirectResponse
    {
        $user = Auth::user();
        $organization = $this->resolveOrganizationForUser($user);

        abort_unless(
            $organization &&
            $user->role === 'admin' &&
            $feedbackCampaign->organization_id === $organization->id,
            403
        );

        $validated = $request->validate([
            'title' => ['required', 'string', 'max:255'],
            'description' => ['nullable', 'string', 'max:3000'],
            'due_date' => ['nullable', 'date'],
            'status' => ['required', Rule::in(['active', 'closed'])],
        ]);

        $feedbackCampaign->update([
            'title' => $validated['title'],
            'description' => $validated['description'] ?: null,
            'due_date' => $validated['due_date'] ?: null,
            'status' => $validated['status'],
        ]);

        return redirect()->route('feedback')->with('success', 'Feedback campaign updated successfully.');
    }

    public function destroy(FeedbackCampaign $feedbackCampaign): RedirectResponse
    {
        $user = Auth::user();
        $organization = $this->resolveOrganizationForUser($user);

        abort_unless(
            $organization &&
            $user->role === 'admin' &&
            $feedbackCampaign->organization_id === $organization->id,
            403
        );

        $feedbackCampaign->delete();

        return redirect()->route('feedback')->with('success', 'Feedback campaign deleted successfully.');
    }

    public function submit(Request $request, FeedbackCampaign $feedbackCampaign): RedirectResponse
    {
        $user = Auth::user();
        $organization = $this->resolveOrganizationForUser($user);
        $student = $this->resolveStudentForUser($user, $organization);

        abort_unless(
            $organization &&
            $student &&
            $user->role === 'student' &&
            $feedbackCampaign->organization_id === $organization->id,
            403
        );

        if ($feedbackCampaign->status !== 'active') {
            return redirect()->route('feedback')->with('error', 'This feedback campaign is closed.');
        }

        if ($feedbackCampaign->due_date && now()->toDateString() > $feedbackCampaign->due_date->format('Y-m-d')) {
            return redirect()->route('feedback')->with('error', 'The feedback due date has passed.');
        }

        $teacherIds = $this->teacherQuery($organization)->pluck('id')->map(fn ($id) => (int) $id)->values()->all();

        if (count($teacherIds) === 0) {
            return redirect()->route('feedback')->with('error', 'No active teachers are available for feedback.');
        }

        $validated = $request->validate([
            'feedbacks' => ['required', 'array', 'min:1'],
            'feedbacks.*.teacher_id' => [
                'required',
                'integer',
                Rule::exists('users', 'id')->where(fn ($query) => $query
                    ->where('organization_id', $organization->id)
                    ->where('role', 'teacher')),
            ],
            'feedbacks.*.rating' => ['required', 'integer', 'min:1', 'max:5'],
            'feedbacks.*.comment' => ['required', 'string', 'max:2000'],
        ]);

        $submittedTeacherIds = collect($validated['feedbacks'])
            ->pluck('teacher_id')
            ->map(fn ($id) => (int) $id)
            ->all();

        sort($teacherIds);
        $uniqueSubmittedTeacherIds = array_values(array_unique($submittedTeacherIds));
        sort($uniqueSubmittedTeacherIds);

        if ($teacherIds !== $uniqueSubmittedTeacherIds) {
            return redirect()->route('feedback')->with('error', 'Please submit feedback for every teacher exactly once.');
        }

        $alreadySubmitted = FeedbackResponse::query()
            ->where('feedback_campaign_id', $feedbackCampaign->id)
            ->where('student_id', $student->id)
            ->exists();

        if ($alreadySubmitted) {
            return redirect()->route('feedback')->with('error', 'You have already submitted this feedback.');
        }

        DB::transaction(function () use ($validated, $organization, $feedbackCampaign, $student, $user) {
            foreach ($validated['feedbacks'] as $feedback) {
                FeedbackResponse::query()->create([
                    'organization_id' => $organization->id,
                    'feedback_campaign_id' => $feedbackCampaign->id,
                    'student_id' => $student->id,
                    'teacher_id' => $feedback['teacher_id'],
                    'rating' => $feedback['rating'],
                    'comment' => trim($feedback['comment']),
                    'submitted_by' => $user->id,
                ]);
            }
        });

        return redirect()->route('feedback')->with('success', 'Feedback submitted successfully.');
    }

    private function getAdminCampaigns(Organization $organization): array
    {
        $teacherCount = $this->teacherQuery($organization)->count();
        $studentCount = $this->studentQuery($organization)->count();

        return FeedbackCampaign::query()
            ->where('organization_id', $organization->id)
            ->with([
                'creator:id,name',
                'responses.student:id,first_name,last_name',
                'responses.teacher:id,name',
            ])
            ->latest()
            ->get()
            ->map(function (FeedbackCampaign $campaign) use ($teacherCount, $studentCount) {
                $submittedStudents = $campaign->responses
                    ->pluck('student_id')
                    ->unique()
                    ->count();

                $teacherSummaries = $campaign->responses
                    ->groupBy('teacher_id')
                    ->map(function ($responses) {
                        $teacher = $responses->first()?->teacher;

                        return [
                            'teacherId' => $teacher?->id ? (string) $teacher->id : null,
                            'teacherName' => $teacher?->name ?? 'Teacher',
                            'averageRating' => round($responses->avg('rating'), 1),
                            'responseCount' => $responses->count(),
                        ];
                    })
                    ->sortBy('teacherName')
                    ->values()
                    ->all();

                return [
                    'id' => (string) $campaign->id,
                    'title' => $campaign->title,
                    'description' => $campaign->description,
                    'dueDate' => optional($campaign->due_date)->format('Y-m-d'),
                    'status' => $campaign->status,
                    'createdAt' => optional($campaign->created_at)->format('Y-m-d H:i:s'),
                    'createdBy' => $campaign->creator?->name ?? 'Admin',
                    'expectedResponses' => $teacherCount * $studentCount,
                    'receivedResponses' => $campaign->responses->count(),
                    'submittedStudents' => $submittedStudents,
                    'totalStudents' => $studentCount,
                    'teacherSummaries' => $teacherSummaries,
                ];
            })
            ->all();
    }

    private function getStudentCampaigns(Organization $organization, Student $student): array
    {
        return FeedbackCampaign::query()
            ->where('organization_id', $organization->id)
            ->with([
                'responses' => fn ($query) => $query
                    ->where('student_id', $student->id)
                    ->with('teacher:id,name'),
            ])
            ->latest()
            ->get()
            ->map(fn (FeedbackCampaign $campaign) => [
                'id' => (string) $campaign->id,
                'title' => $campaign->title,
                'description' => $campaign->description,
                'dueDate' => optional($campaign->due_date)->format('Y-m-d'),
                'status' => $campaign->status,
                'isSubmitted' => $campaign->responses->isNotEmpty(),
                'submittedAt' => optional($campaign->responses->sortByDesc('created_at')->first()?->created_at)->format('Y-m-d H:i:s'),
                'responses' => $campaign->responses
                    ->map(fn (FeedbackResponse $response) => [
                        'teacherId' => (string) $response->teacher_id,
                        'teacherName' => $response->teacher?->name ?? 'Teacher',
                        'rating' => $response->rating,
                        'comment' => $response->comment,
                    ])
                    ->values()
                    ->all(),
            ])
            ->all();
    }

    private function getTeachers(Organization $organization): array
    {
        return $this->teacherQuery($organization)
            ->orderBy('name')
            ->get()
            ->map(fn (User $teacher) => [
                'id' => (string) $teacher->id,
                'name' => $teacher->name,
                'email' => $teacher->email,
            ])
            ->all();
    }

    private function teacherQuery(Organization $organization)
    {
        return User::query()
            ->where('organization_id', $organization->id)
            ->where('role', 'teacher')
            ->where('status', '!=', 'inactive');
    }

    private function studentQuery(Organization $organization)
    {
        return Student::query()
            ->forCurrentSession($organization->id);
    }

    private function serializeStudent(Student $student): array
    {
        return [
            'id' => (string) $student->id,
            'admission_no' => $student->admission_no,
            'first_name' => $student->first_name,
            'last_name' => $student->last_name,
            'class' => $student->schoolClass?->name,
            'section' => $student->schoolClass?->section,
        ];
    }

    private function resolveOrganizationForUser(User $user): ?Organization
    {
        if ($user->organization_id) {
            return Organization::query()->find($user->organization_id);
        }

        if ($user->role === 'student') {
            $studentOrganizationId = Student::query()
                ->where(function ($query) use ($user) {
                    $query
                        ->where('user_id', $user->id)
                        ->orWhere('email', $user->email);
                })
                ->value('organization_id');

            if ($studentOrganizationId) {
                $user->forceFill(['organization_id' => $studentOrganizationId])->save();
                $user->organization_id = $studentOrganizationId;

                return Organization::query()->find($studentOrganizationId);
            }
        }

        if ($user->role !== 'admin') {
            return null;
        }

        $organization = Organization::query()->where('email', $user->email)->first();

        if (! $organization && Organization::query()->count() === 1) {
            $organization = Organization::query()->first();
        }

        if ($organization) {
            $user->forceFill(['organization_id' => $organization->id])->save();
            $user->organization_id = $organization->id;
        }

        return $organization;
    }

    private function resolveStudentForUser(User $user, ?Organization $organization): ?Student
    {
        if (! $organization) {
            return null;
        }

        return Student::query()
            ->where('organization_id', $organization->id)
            ->where(function ($query) use ($user) {
                $query
                    ->where('user_id', $user->id)
                    ->orWhere('email', $user->email);
            })
            ->with('schoolClass:id,name,section')
            ->first();
    }
}
