<?php

namespace App\Http\Controllers;

use App\Models\AcademicYear;
use App\Models\Batch;
use App\Models\Course;
use App\Models\Organization;
use App\Models\User;
use App\Services\StaffPermissionService;
use Illuminate\Http\RedirectResponse;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\Auth;
use Illuminate\Validation\Rule;
use Inertia\Inertia;
use Inertia\Response;

class CourseController extends Controller
{
    public function __construct(private readonly StaffPermissionService $staffPermissionService)
    {
    }

    public function index(Request $request): Response
    {
        $user = Auth::user();
        $organization = $this->resolveOrganizationForUser($user);

        abort_unless($organization, 403);
        $this->abortUnlessCollegeMode($organization);

        $selectedSession = $organization->selectedAcademicYear();

        $courses = Course::query()
            ->where('organization_id', $organization->id)
            ->withCount(['batches'])
            ->with('batches:id,course_id,name,academic_year_id,start_date,status')
            ->orderBy('name')
            ->get()
            ->map(fn (Course $course) => [
                'id' => $course->id,
                'name' => $course->name,
                'code' => $course->code,
                'department' => $course->department,
                'duration_years' => $course->duration_years,
                'total_semesters' => $course->total_semesters,
                'description' => $course->description,
                'status' => $course->status,
                'batches_count' => $course->batches_count,
                'batches' => $course->batches
                    ->sortByDesc('id')
                    ->values()
                    ->map(fn (Batch $batch) => $this->batchPayload($batch)),
            ]);

        $academicYears = AcademicYear::query()
            ->where('organization_id', $organization->id)
            ->orderByDesc('start_date')
            ->get(['id', 'name']);

        return Inertia::render('dashboard/college/CourseManagement', [
            'user' => $user,
            'courses' => $courses,
            'academicYears' => $academicYears,
            'selectedSessionId' => $selectedSession?->id,
        ]);
    }

    public function store(Request $request): RedirectResponse
    {
        $user = Auth::user();
        $organization = $this->resolveOrganizationForUser($user);

        abort_unless($organization, 403);
        $this->abortUnlessCollegeMode($organization);

        $validated = $request->validate([
            'name' => ['required', 'string', 'max:120'],
            'code' => ['nullable', 'string', 'max:40', Rule::unique('courses', 'code')->where('organization_id', $organization->id)],
            'department' => ['nullable', 'string', 'max:120'],
            'duration_years' => ['nullable', 'integer', 'min:1', 'max:8'],
            'total_semesters' => ['nullable', 'integer', 'min:1', 'max:12'],
            'description' => ['nullable', 'string', 'max:1000'],
        ]);

        Course::create([
            'organization_id' => $organization->id,
            'name' => $validated['name'],
            'code' => $validated['code'] ?? null,
            'department' => $validated['department'] ?? null,
            'duration_years' => $validated['duration_years'] ?? null,
            'total_semesters' => $validated['total_semesters'] ?? null,
            'description' => $validated['description'] ?? null,
        ]);

        return redirect()->route('college.courses.index')->with('success', 'Course created.');
    }

    public function update(Request $request, Course $course): RedirectResponse
    {
        $user = Auth::user();
        $organization = $this->resolveOrganizationForUser($user);

        abort_unless($organization && $course->organization_id === $organization->id, 403);
        $this->abortUnlessCollegeMode($organization);

        $validated = $request->validate([
            'name' => ['required', 'string', 'max:120'],
            'code' => ['nullable', 'string', 'max:40', Rule::unique('courses', 'code')->where('organization_id', $organization->id)->ignore($course->id)],
            'department' => ['nullable', 'string', 'max:120'],
            'duration_years' => ['nullable', 'integer', 'min:1', 'max:8'],
            'total_semesters' => ['nullable', 'integer', 'min:1', 'max:12'],
            'description' => ['nullable', 'string', 'max:1000'],
            'status' => ['sometimes', Rule::in(['active', 'inactive'])],
        ]);

        $course->update([
            'name' => $validated['name'],
            'code' => $validated['code'] ?? null,
            'department' => $validated['department'] ?? null,
            'duration_years' => $validated['duration_years'] ?? null,
            'total_semesters' => $validated['total_semesters'] ?? null,
            'description' => $validated['description'] ?? null,
            'status' => $validated['status'] ?? $course->status,
        ]);

        return redirect()->route('college.courses.index')->with('success', 'Course updated.');
    }

    public function destroy(Course $course, Request $request): RedirectResponse
    {
        $user = Auth::user();
        $organization = $this->resolveOrganizationForUser($user);

        abort_unless($organization && $course->organization_id === $organization->id, 403);
        $this->abortUnlessCollegeMode($organization);

        $course->delete();

        return $request->wantsJson()
            ? back()
            : redirect()->route('college.courses.index')->with('success', 'Course deleted.');
    }

    public function storeBatch(Request $request, Course $course): RedirectResponse
    {
        $user = Auth::user();
        $organization = $this->resolveOrganizationForUser($user);

        abort_unless($organization && $course->organization_id === $organization->id, 403);
        $this->abortUnlessCollegeMode($organization);

        $validated = $request->validate([
            'name' => ['required', 'string', 'max:120', Rule::unique('batches', 'name')->where('course_id', $course->id)],
            'academic_year_id' => ['nullable', 'integer', 'exists:academic_years,id'],
            'start_date' => ['nullable', 'date'],
        ]);

        Batch::create([
            'organization_id' => $organization->id,
            'course_id' => $course->id,
            'academic_year_id' => $validated['academic_year_id'] ?? null,
            'name' => $validated['name'],
            'start_date' => $validated['start_date'] ?? null,
        ]);

        return redirect()->route('college.courses.index')->with('success', 'Batch added to course.');
    }

    public function updateBatch(Request $request, Batch $batch): RedirectResponse
    {
        $user = Auth::user();
        $organization = $this->resolveOrganizationForUser($user);

        abort_unless($organization && $batch->organization_id === $organization->id, 403);
        $this->abortUnlessCollegeMode($organization);

        $validated = $request->validate([
            'name' => ['required', 'string', 'max:120', Rule::unique('batches', 'name')->where('course_id', $batch->course_id)->ignore($batch->id)],
            'academic_year_id' => ['nullable', 'integer', 'exists:academic_years,id'],
            'start_date' => ['nullable', 'date'],
            'status' => ['sometimes', Rule::in(['active', 'inactive'])],
        ]);

        $batch->update([
            'name' => $validated['name'],
            'academic_year_id' => $validated['academic_year_id'] ?? $batch->academic_year_id,
            'start_date' => array_key_exists('start_date', $validated) ? ($validated['start_date'] ?? null) : $batch->start_date,
            'status' => $validated['status'] ?? $batch->status,
        ]);

        return redirect()->route('college.courses.index')->with('success', 'Batch updated.');
    }

    public function destroyBatch(Batch $batch, Request $request): RedirectResponse
    {
        $user = Auth::user();
        $organization = $this->resolveOrganizationForUser($user);

        abort_unless($organization && $batch->organization_id === $organization->id, 403);
        $this->abortUnlessCollegeMode($organization);

        $batch->delete();

        return $request->wantsJson()
            ? back()
            : redirect()->route('college.courses.index')->with('success', 'Batch deleted.');
    }

    private function batchPayload(Batch $batch): array
    {
        return [
            'id' => $batch->id,
            'course_id' => $batch->course_id,
            'name' => $batch->name,
            'academic_year_id' => $batch->academic_year_id,
            'start_date' => optional($batch->start_date)->format('Y-m-d'),
            'status' => $batch->status,
        ];
    }

    private function resolveOrganizationForUser(?User $user): ?Organization
    {
        if (!$user) {
            return null;
        }

        return $this->staffPermissionService->resolveOrganizationForUser($user);
    }

    private function abortUnlessCollegeMode(Organization $organization): void
    {
        if (! in_array($organization->type, ['college', 'coaching', 'university'], true)) {
            abort(403, 'College mode is not enabled for this organization.');
        }
    }
}