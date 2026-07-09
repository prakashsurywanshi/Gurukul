<?php

namespace App\Http\Controllers\Api;

use App\Http\Controllers\Controller;
use App\Models\FeedbackCampaign;
use App\Models\FeedbackResponse;
use App\Models\Organization;
use App\Models\Student;
use App\Models\User;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\Auth;
use Illuminate\Support\Facades\DB;
use Illuminate\Validation\Rule;

class FeedbackApiController extends Controller
{
    public function adminIndex(): JsonResponse
    {
        $user = Auth::user();
        $organization = $this->resolveOrganizationForUser($user);
        abort_unless($organization && in_array($user->role, ['super_admin', 'admin', 'teacher'], true), 403);

        $campaigns = $this->getAdminCampaigns($organization);
        $teacherCount = $this->teacherQuery($organization)->count();
        $studentCount = $this->studentQuery($organization)->count();
        $totalResponses = FeedbackResponse::where('organization_id', $organization->id)->count();

        return response()->json([
            'success' => true,
            'data' => $campaigns,
            'stats' => [
                'teacher_count' => $teacherCount,
                'student_count' => $studentCount,
                'total_responses' => $totalResponses,
                'active_campaigns' => count(array_filter($campaigns, fn ($c) => $c['status'] === 'active')),
            ],
        ]);
    }

    public function store(Request $request): JsonResponse
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

        $campaign = FeedbackCampaign::create([
            'organization_id' => $organization->id,
            'title' => $validated['title'],
            'description' => $validated['description'] ?: null,
            'due_date' => $validated['due_date'] ?: null,
            'status' => $validated['status'],
            'created_by' => $user->id,
        ]);

        return response()->json([
            'success' => true,
            'message' => 'Feedback campaign created successfully.',
            'data' => $this->serializeCampaign($campaign, $organization),
        ], 201);
    }

    public function update(Request $request, FeedbackCampaign $feedbackCampaign): JsonResponse
    {
        $user = Auth::user();
        $organization = $this->resolveOrganizationForUser($user);
        abort_unless($organization && $user->role === 'admin' && $feedbackCampaign->organization_id === $organization->id, 403);

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

        return response()->json([
            'success' => true,
            'message' => 'Feedback campaign updated successfully.',
            'data' => $this->serializeCampaign($feedbackCampaign, $organization),
        ]);
    }

    public function destroy(FeedbackCampaign $feedbackCampaign): JsonResponse
    {
        $user = Auth::user();
        $organization = $this->resolveOrganizationForUser($user);
        abort_unless($organization && $user->role === 'admin' && $feedbackCampaign->organization_id === $organization->id, 403);

        $feedbackCampaign->delete();

        return response()->json(['success' => true, 'message' => 'Feedback campaign deleted successfully.']);
    }

    public function studentIndex(): JsonResponse
    {
        $user = Auth::user();
        $organization = $this->resolveOrganizationForUser($user);
        $student = $user->role === 'student' ? $this->resolveStudentForUser($user, $organization) : null;

        abort_unless($organization && $student && $user->role === 'student', 403);

        $campaigns = $this->getStudentCampaigns($organization, $student);
        $teachers = $this->getTeachers($organization);

        return response()->json([
            'success' => true,
            'data' => $campaigns,
            'teachers' => $teachers,
            'student' => $this->serializeStudent($student),
        ]);
    }

    public function submit(Request $request, FeedbackCampaign $feedbackCampaign): JsonResponse
    {
        $user = Auth::user();
        $organization = $this->resolveOrganizationForUser($user);
        $student = $this->resolveStudentForUser($user, $organization);

        abort_unless($organization && $student && $user->role === 'student' && $feedbackCampaign->organization_id === $organization->id, 403);

        if ($feedbackCampaign->status !== 'active') {
            return response()->json(['success' => false, 'message' => 'This feedback campaign is closed.'], 403);
        }

        if ($feedbackCampaign->due_date && now()->toDateString() > $feedbackCampaign->due_date->format('Y-m-d')) {
            return response()->json(['success' => false, 'message' => 'The feedback due date has passed.'], 403);
        }

        $teacherIds = $this->teacherQuery($organization)->pluck('id')->map(fn ($id) => (int) $id)->values()->all();

        if (count($teacherIds) === 0) {
            return response()->json(['success' => false, 'message' => 'No active teachers are available for feedback.'], 422);
        }

        $validated = $request->validate([
            'feedbacks' => ['required', 'array', 'min:1'],
            'feedbacks.*.teacher_id' => ['required', 'integer', Rule::exists('users', 'id')->where(fn ($q) => $q->where('organization_id', $organization->id)->where('role', 'teacher'))],
            'feedbacks.*.rating' => ['required', 'integer', 'min:1', 'max:5'],
            'feedbacks.*.comment' => ['required', 'string', 'max:2000'],
        ]);

        $submittedTeacherIds = collect($validated['feedbacks'])->pluck('teacher_id')->map(fn ($id) => (int) $id)->all();
        sort($teacherIds);
        $uniqueSubmittedTeacherIds = array_values(array_unique($submittedTeacherIds));
        sort($uniqueSubmittedTeacherIds);

        if ($teacherIds !== $uniqueSubmittedTeacherIds) {
            return response()->json(['success' => false, 'message' => 'Please submit feedback for every teacher exactly once.'], 422);
        }

        $alreadySubmitted = FeedbackResponse::where('feedback_campaign_id', $feedbackCampaign->id)
            ->where('student_id', $student->id)
            ->exists();

        if ($alreadySubmitted) {
            return response()->json(['success' => false, 'message' => 'You have already submitted this feedback.'], 409);
        }

        DB::transaction(function () use ($validated, $organization, $feedbackCampaign, $student, $user) {
            foreach ($validated['feedbacks'] as $feedback) {
                FeedbackResponse::create([
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

        return response()->json([
            'success' => true,
            'message' => 'Feedback submitted successfully.',
        ], 201);
    }

    public function campaignDetail(FeedbackCampaign $feedbackCampaign): JsonResponse
    {
        $user = Auth::user();
        $organization = $this->resolveOrganizationForUser($user);
        abort_unless($organization && $feedbackCampaign->organization_id === $organization->id, 403);

        return response()->json([
            'success' => true,
            'data' => $this->serializeCampaign($feedbackCampaign, $organization),
        ]);
    }

    private function getAdminCampaigns(Organization $organization): array
    {
        $teacherCount = $this->teacherQuery($organization)->count();
        $studentCount = $this->studentQuery($organization)->count();

        return FeedbackCampaign::where('organization_id', $organization->id)
            ->with(['creator:id,name', 'responses.student:id,first_name,last_name', 'responses.teacher:id,name'])
            ->latest()
            ->get()
            ->map(fn (FeedbackCampaign $c) => $this->serializeCampaign($c, $organization, $teacherCount, $studentCount))
            ->all();
    }

    private function serializeCampaign(FeedbackCampaign $campaign, Organization $organization, ?int $teacherCount = null, ?int $studentCount = null): array
    {
        if ($teacherCount === null) $teacherCount = $this->teacherQuery($organization)->count();
        if ($studentCount === null) $studentCount = $this->studentQuery($organization)->count();

        $submittedStudents = $campaign->responses->pluck('student_id')->unique()->count();

        $teacherSummaries = $campaign->responses
            ->groupBy('teacher_id')
            ->map(function ($responses) {
                $teacher = $responses->first()?->teacher;
                return [
                    'teacher_id' => $teacher?->id ? (string) $teacher->id : null,
                    'teacher_name' => $teacher?->name ?? 'Teacher',
                    'average_rating' => round($responses->avg('rating'), 1),
                    'response_count' => $responses->count(),
                ];
            })
            ->sortBy('teacher_name')
            ->values()
            ->all();

        return [
            'id' => (string) $campaign->id,
            'title' => $campaign->title,
            'description' => $campaign->description,
            'due_date' => $campaign->due_date?->format('Y-m-d'),
            'status' => $campaign->status,
            'created_at' => $campaign->created_at?->format('Y-m-d H:i:s'),
            'created_by' => $campaign->creator?->name ?? 'Admin',
            'expected_responses' => $teacherCount * $studentCount,
            'received_responses' => $campaign->responses->count(),
            'submitted_students' => $submittedStudents,
            'total_students' => $studentCount,
            'teacher_summaries' => $teacherSummaries,
        ];
    }

    private function getStudentCampaigns(Organization $organization, Student $student): array
    {
        return FeedbackCampaign::where('organization_id', $organization->id)
            ->with(['responses' => fn ($q) => $q->where('student_id', $student->id)->with('teacher:id,name')])
            ->latest()
            ->get()
            ->map(fn (FeedbackCampaign $campaign) => [
                'id' => (string) $campaign->id,
                'title' => $campaign->title,
                'description' => $campaign->description,
                'due_date' => $campaign->due_date?->format('Y-m-d'),
                'status' => $campaign->status,
                'is_submitted' => $campaign->responses->isNotEmpty(),
                'submitted_at' => $campaign->responses->sortByDesc('created_at')->first()?->created_at?->format('Y-m-d H:i:s'),
                'responses' => $campaign->responses->map(fn (FeedbackResponse $r) => [
                    'teacher_id' => (string) $r->teacher_id,
                    'teacher_name' => $r->teacher?->name ?? 'Teacher',
                    'rating' => $r->rating,
                    'comment' => $r->comment,
                ])->values()->all(),
            ])->all();
    }

    private function getTeachers(Organization $organization): array
    {
        return $this->teacherQuery($organization)
            ->orderBy('name')
            ->get()
            ->map(fn (User $t) => [
                'id' => (string) $t->id,
                'name' => $t->name,
                'email' => $t->email,
            ])->all();
    }

    private function teacherQuery(Organization $organization)
    {
        return User::where('organization_id', $organization->id)->where('role', 'teacher')->where('status', '!=', 'inactive');
    }

    private function studentQuery(Organization $organization)
    {
        return Student::where('organization_id', $organization->id);
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
        if ($user->organization_id) return Organization::find($user->organization_id);

        if ($user->role === 'student') {
            $studentOrgId = Student::where(fn ($q) => $q->where('user_id', $user->id)->orWhere('email', $user->email))->value('organization_id');
            if ($studentOrgId) {
                $user->forceFill(['organization_id' => $studentOrgId])->save();
                $user->organization_id = $studentOrgId;
                return Organization::find($studentOrgId);
            }
        }

        if ($user->role !== 'admin') return null;

        $organization = Organization::where('email', $user->email)->first();
        if (!$organization && Organization::count() === 1) $organization = Organization::first();

        if ($organization) {
            $user->forceFill(['organization_id' => $organization->id])->save();
            $user->organization_id = $organization->id;
        }

        return $organization;
    }

    private function resolveStudentForUser(User $user, ?Organization $organization): ?Student
    {
        if (!$organization) return null;
        $student = Student::where('organization_id', $organization->id)
            ->where(fn ($q) => $q->where('user_id', $user->id)->orWhere('email', $user->email))
            ->with('schoolClass')->first();

        if ($student && !$user->organization_id) {
            $user->forceFill(['organization_id' => $student->organization_id])->save();
            $user->organization_id = $student->organization_id;
        }
        return $student;
    }
}
