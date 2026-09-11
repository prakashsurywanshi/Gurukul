<?php

namespace App\Http\Controllers;

use App\Models\Exam;
use App\Models\MarksheetUpload;
use App\Models\Organization;
use App\Models\SchoolClass;
use App\Models\Student;
use App\Models\User;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\RedirectResponse;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\Auth;
use Illuminate\Support\Facades\Storage;
use Inertia\Inertia;
use Inertia\Response;
use Throwable;

class MarksheetUploadController extends Controller
{
    public function index(Request $request): Response
    {
        $user = $request->user();
        $organization = $this->resolveOrganizationForUser($user);
        abort_unless($organization, 403);

        $search = trim((string) $request->query('search'));
        $status = trim((string) $request->query('status'));
        $examId = (int) $request->query('exam_id', 0);

        $query = MarksheetUpload::query()
            ->where('organization_id', $organization->id)
            ->with(['student:id,first_name,last_name,roll_number,class_id', 'exam:id,name,exam_type']);

        if ($search !== '') {
            $query->where(function ($q) use ($search) {
                $q->where('title', 'like', "%{$search}%")
                    ->orWhereHas('student', function ($studentQ) use ($search) {
                        $studentQ->where('first_name', 'like', "%{$search}%")
                            ->orWhere('last_name', 'like', "%{$search}%")
                            ->orWhere('admission_no', 'like', "%{$search}%");
                    });
            });
        }

        if ($status !== '') {
            $query->where('status', $status);
        }

        if ($examId > 0) {
            $query->where('exam_id', $examId);
        }

        $uploads = $query->orderByDesc('created_at')->get();

        return Inertia::render('dashboard/MarksheetUploads', [
            'user' => $user,
            'uploads' => $uploads->map(fn (MarksheetUpload $upload) => [
                'id' => $upload->id,
                'title' => $upload->title,
                'original_name' => $upload->original_name,
                'size_bytes' => $upload->size_bytes,
                'status' => $upload->status,
                'created_at' => $upload->created_at->toISOString(),
                'student' => $upload->student ? [
                    'id' => $upload->student->id,
                    'name' => ($upload->student->first_name ?? '').' '.($upload->student->last_name ?? ''),
                    'roll_number' => $upload->student->roll_number,
                ] : null,
                'exam' => $upload->exam ? ['id' => $upload->exam->id, 'name' => $upload->exam->name] : null,
            ]),
            'classes' => $this->classesFor($organization)->map->only(['id', 'name', 'section']),
            'students' => Student::query()
                ->where('organization_id', $organization->id)
                ->where('status', 'active')
                ->orderBy('first_name')
                ->get(['id', 'first_name', 'last_name', 'roll_number', 'class_id'])
                ->map(fn (Student $student) => [
                    'id' => $student->id,
                    'name' => $student->first_name.' '.$student->last_name,
                    'roll_number' => $student->roll_number,
                    'class_id' => $student->class_id,
                ]),
            'exams' => Exam::query()
                ->where('organization_id', $organization->id)
                ->orderByDesc('start_date')
                ->get(['id', 'name', 'exam_type']),
            'filters' => ['search' => $search, 'status' => $status, 'exam_id' => $examId],
        ]);
    }

    public function store(Request $request): JsonResponse|RedirectResponse
    {
        $user = $request->user();
        $organization = $this->resolveOrganizationForUser($user);
        abort_unless($organization, 403);

        $validated = $request->validate([
            'student_id' => ['required', 'integer', 'exists:students,id'],
            'exam_id' => ['required', 'integer', 'exists:exams,id'],
            'title' => ['required', 'string', 'max:255'],
            'marksheet_file' => ['required', 'file', 'mimes:pdf', 'max:10240'],
        ]);

        $student = Student::query()
            ->where('id', $validated['student_id'])
            ->where('organization_id', $organization->id)
            ->first();
        abort_unless($student, 404);

        $exam = Exam::query()
            ->where('id', $validated['exam_id'])
            ->where('organization_id', $organization->id)
            ->first();
        abort_unless($exam, 404);

        $file = $validated['marksheet_file'];

        try {
            $storagePath = $file->store('marksheets/org-'.$organization->id, 'local');

            $upload = MarksheetUpload::query()->create([
                'organization_id' => $organization->id,
                'student_id' => $student->id,
                'exam_id' => $exam->id,
                'title' => $validated['title'],
                'storage_path' => $storagePath,
                'original_name' => $file->getClientOriginalName(),
                'mime_type' => $file->getMimeType(),
                'size_bytes' => $file->getSize(),
                'status' => 'uploaded',
                'uploaded_by_user_id' => $user->id,
            ]);

            return $request->wantsJson()
                ? response()->json(['id' => $upload->id, 'status' => $upload->status], 201)
                : back()->with('success', 'Marksheet uploaded successfully.');
        } catch (Throwable $exception) {
            if (isset($storagePath)) {
                Storage::disk('local')->delete($storagePath);
            }

            report($exception);

            return $request->wantsJson()
                ? response()->json(['error' => 'The marksheet could not be uploaded. Please try again.'], 500)
                : back()->with('error', 'The marksheet could not be uploaded. Please try again.');
        }
    }

    public function verify(Request $request, int $upload): RedirectResponse
    {
        $organization = $this->resolveOrganizationForUser($request->user());
        abort_unless($organization, 403);

        $model = MarksheetUpload::query()
            ->where('id', $upload)
            ->where('organization_id', $organization->id)
            ->firstOrFail();

        $model->update(['status' => 'verified']);

        return back()->with('success', 'Marksheet marked as verified.');
    }

    public function download(Request $request, int $upload): \Symfony\Component\HttpFoundation\StreamedResponse|RedirectResponse
    {
        $user = $request->user();
        $organization = $this->resolveOrganizationForUser($user);
        abort_unless($organization, 403);

        $model = MarksheetUpload::query()
            ->where('id', $upload)
            ->where('organization_id', $organization->id)
            ->firstOrFail();

        abort_unless(Storage::disk('local')->exists($model->storage_path), 404);

        return Storage::disk('local')->download($model->storage_path, $model->original_name);
    }

    public function destroy(Request $request, int $upload): RedirectResponse
    {
        $organization = $this->resolveOrganizationForUser($request->user());
        abort_unless($organization, 403);

        $model = MarksheetUpload::query()
            ->where('id', $upload)
            ->where('organization_id', $organization->id)
            ->firstOrFail();

        Storage::disk('local')->delete($model->storage_path);
        $model->delete();

        return back()->with('success', 'Marksheet deleted.');
    }

    private function classesFor(Organization $organization): \Illuminate\Support\Collection
    {
        return SchoolClass::query()
            ->where('organization_id', $organization->id)
            ->where('status', 'active')
            ->orderBy('name')
            ->get(['id', 'name', 'section']);
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

        if (! $organization && Organization::query()->count() === 1) {
            $organization = Organization::query()->first();
        }

        if ($organization) {
            $user->forceFill(['organization_id' => $organization->id])->save();
            $user->organization_id = $organization->id;
        }

        return $organization;
    }
}