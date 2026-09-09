<?php

namespace App\Http\Controllers;

use App\Models\Homework;
use App\Models\HomeworkSubmission;
use App\Models\Organization;
use App\Models\SchoolClass;
use App\Models\Student;
use App\Models\Subject;
use App\Models\User;
use Illuminate\Http\RedirectResponse;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\Auth;
use Illuminate\Support\Facades\Storage;
use Illuminate\Validation\Rule;
use Symfony\Component\HttpFoundation\BinaryFileResponse;

class HomeworkController extends Controller
{
    public function index()
    {
        $user = Auth::user();
        $organization = $this->resolveOrganizationForUser($user);
        abort_unless($organization, 403);

        $studentRecord = $user->role === 'student' ? $this->resolveStudentRecord($user, $organization) : null;

        return inertia('dashboard/HomeworkPage', [
            'user' => $user,
            'classRecords' => $this->classRecords($organization->id),
            'subjectRecords' => $this->subjectRecords($organization->id),
            'studentRecord' => $studentRecord,
            'homeworkRecords' => $this->homeworkRecords($organization, $user, $studentRecord),
            'submissionRecords' => $this->submissionRecords($organization, $user, $studentRecord),
            'uploadLimits' => $this->uploadLimits(),
        ]);
    }

    public function store(Request $request): RedirectResponse
    {
        $user = Auth::user();
        $organization = $this->resolveOrganizationForUser($user);
        abort_unless($organization, 403);

        $validated = $request->validate([
            'classId' => ['required', Rule::exists('classes', 'id')->where(fn ($query) => $query->where('organization_id', $organization->id))],
            'subjectId' => ['required', Rule::exists('subjects', 'id')->where(fn ($query) => $query->where('organization_id', $organization->id))],
            'homeworkDate' => ['required', 'date'],
            'submissionDate' => ['required', 'date', 'after_or_equal:homeworkDate'],
            'maxMarks' => ['nullable', 'numeric', 'min:0', 'max:1000'],
            'description' => ['required', 'string', 'max:5000'],
            'attachment' => ['nullable', 'file', 'max:20480'],
        ], [
            'attachment.max' => 'The homework attachment must not be greater than 20 MB.',
        ]);

        $schoolClass = SchoolClass::query()
            ->where('organization_id', $organization->id)
            ->findOrFail((int) $validated['classId']);

        $subject = Subject::query()
            ->where('organization_id', $organization->id)
            ->findOrFail((int) $validated['subjectId']);

        $attachments = [];
        $file = $request->file('attachment');
        if ($file) {
            $path = $file->store('homework/' . $organization->id . '/attachments', 'local');
            $attachments[] = $this->attachmentPayload($path, $file->getClientOriginalName(), $file->getClientMimeType(), (int) $file->getSize());
        }

        Homework::query()->create([
            'organization_id' => $organization->id,
            'class_id' => $schoolClass->id,
            'subject_id' => $subject->id,
            'teacher_id' => $user->id,
            'title' => sprintf('%s Homework - %s', $subject->localized('name'), $validated['homeworkDate']),
            'description' => $validated['description'],
            'assign_date' => $validated['homeworkDate'],
            'due_date' => $validated['submissionDate'],
            'attachments' => $attachments,
            'max_marks' => $validated['maxMarks'] ?? null,
        ]);

        return redirect()->route('homework')->with('success', 'Homework created successfully.');
    }

    public function submit(Request $request, Homework $homework): RedirectResponse
    {
        $user = Auth::user();
        $organization = $this->resolveOrganizationForUser($user);
        abort_unless($organization && $homework->organization_id === $organization->id, 403);

        $student = $this->resolveStudentModel($user, $organization);
        abort_unless($student, 403);

        $validated = $request->validate([
            'submissionText' => ['nullable', 'string', 'max:5000'],
            'attachment' => ['nullable', 'file', 'max:20480'],
        ], [
            'attachment.max' => 'The submission attachment must not be greater than 20 MB.',
        ]);

        $file = $request->file('attachment');
        if (! $file && ! filled($validated['submissionText'] ?? null)) {
            return back()->withErrors([
                'submission' => 'Please add submission text or attach a file.',
            ]);
        }

        $attachments = [];
        if ($file) {
            $path = $file->store('homework/' . $organization->id . '/submissions', 'local');
            $attachments[] = $this->attachmentPayload($path, $file->getClientOriginalName(), $file->getClientMimeType(), (int) $file->getSize());
        }

        $status = now()->toDateString() > optional($homework->due_date)->format('Y-m-d') ? 'late' : 'submitted';

        HomeworkSubmission::query()->updateOrCreate(
            [
                'homework_id' => $homework->id,
                'student_id' => $student->id,
            ],
            [
                'submission_text' => $validated['submissionText'] ?? null,
                'attachments' => $attachments,
                'submitted_at' => now(),
                'status' => $status,
            ]
        );

        return redirect()->route('homework')->with('success', 'Homework submitted successfully.');
    }

    public function evaluate(Request $request, HomeworkSubmission $homeworkSubmission): RedirectResponse
    {
        $user = Auth::user();
        $organization = $this->resolveOrganizationForUser($user);
        abort_unless($organization && $homeworkSubmission->homework?->organization_id === $organization->id, 403);

        $validated = $request->validate([
            'marksObtained' => ['nullable', 'numeric', 'min:0', 'max:1000'],
            'teacherRemarks' => ['nullable', 'string', 'max:5000'],
        ]);

        $homeworkSubmission->update([
            'marks_obtained' => $validated['marksObtained'] ?? null,
            'teacher_remarks' => $validated['teacherRemarks'] ?? null,
            'status' => 'evaluated',
            'evaluated_by' => $user->id,
        ]);

        return redirect()->route('homework')->with('success', 'Homework evaluated successfully.');
    }

    public function destroy(Homework $homework): RedirectResponse
    {
        $user = Auth::user();
        $organization = $this->resolveOrganizationForUser($user);
        abort_unless($organization && $homework->organization_id === $organization->id, 403);
        abort_unless(in_array($user->role, ['admin', 'super_admin'], true), 403);

        $homework->load('submissions');

        foreach ($homework->attachments ?? [] as $attachment) {
            if (is_array($attachment) && isset($attachment['path'])) {
                Storage::disk('local')->delete($attachment['path']);
            }
        }

        foreach ($homework->submissions as $submission) {
            foreach ($submission->attachments ?? [] as $attachment) {
                if (is_array($attachment) && isset($attachment['path'])) {
                    Storage::disk('local')->delete($attachment['path']);
                }
            }

            $submission->delete();
        }

        $homework->delete();

        return redirect()->route('homework')->with('success', 'Homework deleted successfully.');
    }

    public function downloadAttachment(Request $request, Homework $homework, int $index = 0): BinaryFileResponse
    {
        $user = Auth::user();
        $organization = $this->resolveOrganizationForUser($user);
        abort_unless($organization && $homework->organization_id === $organization->id, 403);

        $attachment = $homework->attachments[$index] ?? null;
        abort_unless(is_array($attachment) && isset($attachment['path']), 404);
        abort_unless(Storage::disk('local')->exists($attachment['path']), 404);

        return response()->download(Storage::disk('local')->path($attachment['path']), $attachment['name'] ?? basename($attachment['path']));
    }

    public function downloadSubmissionAttachment(Request $request, HomeworkSubmission $homeworkSubmission, int $index = 0): BinaryFileResponse
    {
        $user = Auth::user();
        $organization = $this->resolveOrganizationForUser($user);
        abort_unless($organization && $homeworkSubmission->homework?->organization_id === $organization->id, 403);

        $attachment = $homeworkSubmission->attachments[$index] ?? null;
        abort_unless(is_array($attachment) && isset($attachment['path']), 404);
        abort_unless(Storage::disk('local')->exists($attachment['path']), 404);

        return response()->download(Storage::disk('local')->path($attachment['path']), $attachment['name'] ?? basename($attachment['path']));
    }

    public function previewAttachment(Request $request, Homework $homework, int $index = 0): BinaryFileResponse
    {
        $user = Auth::user();
        $organization = $this->resolveOrganizationForUser($user);
        abort_unless($organization && $homework->organization_id === $organization->id, 403);

        $attachment = $homework->attachments[$index] ?? null;
        abort_unless(is_array($attachment) && isset($attachment['path']), 404);
        abort_unless(Storage::disk('local')->exists($attachment['path']), 404);

        return response()->file(
            Storage::disk('local')->path($attachment['path']),
            ['Content-Type' => $attachment['mime_type'] ?? Storage::disk('local')->mimeType($attachment['path']) ?? 'application/octet-stream']
        );
    }

    public function previewSubmissionAttachment(Request $request, HomeworkSubmission $homeworkSubmission, int $index = 0): BinaryFileResponse
    {
        $user = Auth::user();
        $organization = $this->resolveOrganizationForUser($user);
        abort_unless($organization && $homeworkSubmission->homework?->organization_id === $organization->id, 403);

        $attachment = $homeworkSubmission->attachments[$index] ?? null;
        abort_unless(is_array($attachment) && isset($attachment['path']), 404);
        abort_unless(Storage::disk('local')->exists($attachment['path']), 404);

        return response()->file(
            Storage::disk('local')->path($attachment['path']),
            ['Content-Type' => $attachment['mime_type'] ?? Storage::disk('local')->mimeType($attachment['path']) ?? 'application/octet-stream']
        );
    }

    private function homeworkRecords(Organization $organization, User $user, ?array $studentRecord): array
    {
        $query = Homework::query()
            ->where('organization_id', $organization->id)
            ->with(['schoolClass:id,name,section', 'subject:id,name,name_mr,name_hi', 'teacher:id,name', 'submissions.student.schoolClass:id,name,section'])
            ->latest('assign_date')
            ->latest('id');

        if ($studentRecord) {
            $query->where('class_id', $studentRecord['classId']);
        }

        return $query->get()->map(function (Homework $homework) use ($studentRecord) {
            $studentSubmission = null;

            if ($studentRecord) {
                $studentSubmission = $homework->submissions->firstWhere('student_id', (int) $studentRecord['id']);
            }

            return [
                'id' => (string) $homework->id,
                'classId' => (string) $homework->class_id,
                'className' => (string) ($homework->schoolClass?->name ?? ''),
                'section' => (string) ($homework->schoolClass?->section ?? ''),
                'subjectName' => (string) ($homework->subject?->localized('name') ?? ''),
                'teacherName' => (string) ($homework->teacher?->name ?? ''),
                'homeworkDate' => optional($homework->assign_date)->format('Y-m-d') ?? '',
                'submissionDate' => optional($homework->due_date)->format('Y-m-d') ?? '',
                'maxMarks' => $homework->max_marks !== null ? (string) $homework->max_marks : '',
                'description' => $homework->description,
                'attachmentName' => $homework->attachments[0]['name'] ?? '',
                'attachmentUrl' => count($homework->attachments ?? []) > 0 ? route('homework.attachment.download', [$homework, 0]) : '',
                'attachmentPreviewUrl' => count($homework->attachments ?? []) > 0 ? route('homework.attachment.preview', [$homework, 0]) : '',
                'attachmentMimeType' => $homework->attachments[0]['mime_type'] ?? '',
                'submissionStatus' => $studentSubmission?->status ?? 'pending',
                'marksObtained' => $studentSubmission?->marks_obtained !== null ? (string) $studentSubmission->marks_obtained : '',
                'teacherRemarks' => $studentSubmission?->teacher_remarks ?? '',
                'submissionText' => $studentSubmission?->submission_text ?? '',
                'submissionAttachmentName' => $studentSubmission->attachments[0]['name'] ?? '',
                'submissionAttachmentUrl' => $studentSubmission && count($studentSubmission->attachments ?? []) > 0
                    ? route('homework.submission.attachment.download', [$studentSubmission, 0])
                    : '',
                'submissionAttachmentPreviewUrl' => $studentSubmission && count($studentSubmission->attachments ?? []) > 0
                    ? route('homework.submission.attachment.preview', [$studentSubmission, 0])
                    : '',
                'submissionAttachmentMimeType' => $studentSubmission->attachments[0]['mime_type'] ?? '',
                'submittedAt' => optional($studentSubmission?->submitted_at)->format('Y-m-d H:i') ?? '',
                'submissionId' => $studentSubmission ? (string) $studentSubmission->id : '',
            ];
        })->all();
    }

    private function submissionRecords(Organization $organization, User $user, ?array $studentRecord): array
    {
        if ($studentRecord) {
            return [];
        }

        return HomeworkSubmission::query()
            ->whereHas('homework', fn ($query) => $query->where('organization_id', $organization->id))
            ->with([
                'homework.schoolClass:id,name,section',
                'homework.subject:id,name,name_mr,name_hi',
                'student.schoolClass:id,name,section',
            ])
            ->latest('submitted_at')
            ->latest('id')
            ->get()
            ->map(function (HomeworkSubmission $submission) {
                return [
                    'id' => (string) $submission->id,
                    'homeworkId' => (string) $submission->homework_id,
                    'studentName' => trim(($submission->student?->first_name ?? '') . ' ' . ($submission->student?->last_name ?? '')),
                    'className' => (string) ($submission->homework?->schoolClass?->name ?? ''),
                    'section' => (string) ($submission->homework?->schoolClass?->section ?? ''),
                    'subjectName' => (string) ($submission->homework?->subject?->localized('name') ?? ''),
                    'homeworkDate' => optional($submission->homework?->assign_date)->format('Y-m-d') ?? '',
                    'submissionDate' => optional($submission->homework?->due_date)->format('Y-m-d') ?? '',
                    'submittedAt' => optional($submission->submitted_at)->format('Y-m-d H:i') ?? '',
                    'status' => $submission->status,
                    'marksObtained' => $submission->marks_obtained !== null ? (string) $submission->marks_obtained : '',
                    'maxMarks' => $submission->homework?->max_marks !== null ? (string) $submission->homework->max_marks : '',
                    'submissionText' => $submission->submission_text ?? '',
                    'teacherRemarks' => $submission->teacher_remarks ?? '',
                    'attachmentName' => $submission->attachments[0]['name'] ?? '',
                    'attachmentUrl' => count($submission->attachments ?? []) > 0
                        ? route('homework.submission.attachment.download', [$submission, 0])
                        : '',
                    'attachmentPreviewUrl' => count($submission->attachments ?? []) > 0
                        ? route('homework.submission.attachment.preview', [$submission, 0])
                        : '',
                    'attachmentMimeType' => $submission->attachments[0]['mime_type'] ?? '',
                ];
            })
            ->all();
    }

    private function classRecords(int $organizationId): array
    {
        return SchoolClass::query()
            ->forCurrentSession($organizationId)
            ->orderByRaw('CAST(name AS UNSIGNED), name')
            ->orderBy('section')
            ->get()
            ->map(fn (SchoolClass $class) => [
                'id' => (string) $class->id,
                'name' => (string) $class->name,
                'section' => (string) $class->section,
            ])
            ->all();
    }

    private function subjectRecords(int $organizationId): array
    {
        return Subject::query()
            ->where('organization_id', $organizationId)
            ->orderBy('name')
            ->get()
            ->map(fn (Subject $subject) => [
                'id' => (string) $subject->id,
                'name' => (string) $subject->localized('name'),
            ])
            ->all();
    }

    private function resolveStudentModel(User $user, Organization $organization): ?Student
    {
        return Student::query()
            ->where('organization_id', $organization->id)
            ->where(function ($query) use ($user) {
                $query->where('user_id', $user->id)->orWhere('email', $user->email);
            })
            ->first();
    }

    private function resolveStudentRecord(User $user, Organization $organization): ?array
    {
        $student = Student::query()
            ->with('schoolClass:id,name,section')
            ->where('organization_id', $organization->id)
            ->where(function ($query) use ($user) {
                $query->where('user_id', $user->id)->orWhere('email', $user->email);
            })
            ->first();

        if (! $student) {
            return null;
        }

        return [
            'id' => (string) $student->id,
            'classId' => (string) $student->class_id,
            'className' => (string) ($student->schoolClass?->name ?? ''),
            'section' => (string) ($student->schoolClass?->section ?? ''),
            'studentName' => trim($student->first_name . ' ' . $student->last_name),
        ];
    }

    private function resolveOrganizationForUser(?User $user): ?Organization
    {
        if (! $user) {
            return null;
        }

        if ($user->organization_id) {
            return Organization::query()->find($user->organization_id);
        }

        if ($user->role === 'student') {
            $studentOrganizationId = Student::query()
                ->where(function ($query) use ($user) {
                    $query->where('user_id', $user->id)->orWhere('email', $user->email);
                })
                ->value('organization_id');

            if ($studentOrganizationId) {
                $user->forceFill(['organization_id' => $studentOrganizationId])->save();
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
        }

        return $organization;
    }

    private function attachmentPayload(string $path, string $name, ?string $mimeType, int $size): array
    {
        return [
            'path' => $path,
            'name' => $name,
            'mimeType' => $mimeType,
            'size' => $size,
        ];
    }

    private function uploadLimits(): array
    {
        $uploadMaxBytes = $this->parseIniSize((string) ini_get('upload_max_filesize'));
        $postMaxBytes = $this->parseIniSize((string) ini_get('post_max_size'));
        $maxBytes = min($uploadMaxBytes, $postMaxBytes);

        return [
            'maxBytes' => $maxBytes,
            'maxLabel' => $this->formatBytes($maxBytes),
        ];
    }

    private function parseIniSize(string $value): int
    {
        $normalized = trim($value);
        $unit = strtolower(substr($normalized, -1));
        $number = (float) $normalized;

        return match ($unit) {
            'g' => (int) round($number * 1024 * 1024 * 1024),
            'm' => (int) round($number * 1024 * 1024),
            'k' => (int) round($number * 1024),
            default => (int) round($number),
        };
    }

    private function formatBytes(int $bytes): string
    {
        if ($bytes >= 1024 * 1024) {
            return number_format($bytes / (1024 * 1024), 1) . ' MB';
        }
        if ($bytes >= 1024) {
            return number_format($bytes / 1024) . ' KB';
        }
        return $bytes . ' bytes';
    }
}
