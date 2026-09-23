<?php

namespace App\Http\Controllers;

use App\Models\Exam;
use App\Models\Organization;
use App\Models\Student;
use App\Models\User;
use App\Services\TemplateRenderService;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\Auth;
use Illuminate\Validation\Rule;

/**
 * Server-rendered printable seam for "server" slots (hall-ticket, marksheet).
 *
 * When the org has a template assigned to the slot, this returns the ready to
 * print HTML document built from the assigned design. Otherwise "html" is null
 * and the caller falls back to its existing client-side layout.
 */
class TemplatePrintController extends Controller
{
    public function __construct(private readonly TemplateRenderService $renderer)
    {
    }

    public function print(Request $request): JsonResponse
    {
        $organization = $this->resolveOrganizationForUser(Auth::user());

        abort_unless($organization, 403);

        $validated = $request->validate([
            'slot' => ['required', 'string', Rule::in(['hall-ticket', 'marksheet', 'certificate', 'tc'])],
            'student_ids' => ['required', 'array', 'min:1', 'max:500'],
            'student_ids.*' => ['integer'],
        ]);

        $slot = $validated['slot'];

        $template = $this->renderer->resolveFor($organization, $slot);

        if (! $template || empty($template->content)) {
            return response()->json(['html' => null, 'count' => 0]);
        }

        $studentIds = array_map('intval', $validated['student_ids']);

        $students = Student::query()
            ->where('organization_id', $organization->id)
            ->whereIn('id', $studentIds)
            ->with('schoolClass:id,name,section')
            ->get();

        $exam = Exam::query()
            ->where('organization_id', $organization->id)
            ->find($request->integer('exam_id'));

        $user = Auth::user();

        $pages = $students->map(function (Student $student) use ($slot, $exam, $organization, $user) {
            return $this->renderPagesForStudent($student, $slot, $exam, $organization, $user);
        })->filter()->flatten()->all();

        if ($pages === []) {
            return response()->json(['html' => null, 'count' => 0]);
        }

        $bodies = collect($pages)->map(
            fn (string $page) => '<div style="page-break-after: always; break-after: page;">' . $page . '</div>'
        )->implode('');

        $html = view('documents.template-print-sheet', [
            'title' => $template->localized('title'),
            'pages' => $bodies,
        ])->render();

        return response()->json(['html' => $html, 'count' => $students->count()]);
    }

    /**
     * @return array<int, string>
     */
    private function renderPagesForStudent(Student $student, string $slot, ?Exam $exam, Organization $organization, User $user): array
    {
        $context = $this->buildContext($student, $slot, $exam, $organization, $user);
        $rendered = $this->renderer->render($organization, $slot, $context);

        if (! $rendered['html']) {
            return [];
        }

        $pages = [$rendered['html']];

        if ($rendered['back_html']) {
            $pages[] = $rendered['back_html'];
        }

        return $pages;
    }

    private function buildContext(Student $student, string $slot, ?Exam $exam, Organization $organization, User $user): array
    {
        $class = $student->schoolClass;

        return array_merge($this->renderer->schoolAndStudentContext($organization, $student), [
            'student_name' => trim($student->first_name . ' ' . $student->last_name),
            'admission_no' => $student->admission_no ?? '',
            'roll_no' => $student->roll_number ?? '',
            'class' => $class?->name ?? '',
            'section' => $class?->section ?? '',
            'class_section' => trim(($class?->name ?? '') . ($class?->section ? ' - ' . $class->section : '')),
            'dob' => $student->date_of_birth ? $student->date_of_birth->format('j M Y') : '',
            'blood_group' => $student->blood_group ?? '',
            'house' => $student->house ?? '',
            'father_name' => $student->father_name ?? '',
            'mother_name' => $student->mother_name ?? '',
            'guardian_phone' => $student->father_phone ?? $student->phone ?? '',
            'emergency_contact' => $student->phone ?? '',
            'current_address' => $student->current_address ?? '',
            'academic_session' => $this->academicSessionLabel($organization),
            'school_name' => $organization->name,
            'school_logo_url' => $organization->logo ? asset('storage/' . $organization->logo) : '',
            'student_photo_url' => $student->profile_photo ? asset('storage/' . $student->profile_photo) : '',
            'current_date' => now()->format('j F Y'),
            'issue_date' => now()->format('j F Y'),
            'issued_by' => $user->name,
            'exam_name' => $exam?->name ?? '',
            'exam_session' => $exam?->academicYear?->label ?? '',
            'exam_start_date' => $exam?->start_date ? $exam->start_date->format('j M Y') : '',
            'exam_end_date' => $exam?->end_date ? $exam->end_date->format('j M Y') : '',
        ]);
    }

    private function academicSessionLabel(Organization $organization): string
    {
        return $organization->selectedAcademicYear()?->name ?? '';
    }

    private function resolveOrganizationForUser(User $user): ?Organization
    {
        if ($user->organization_id) {
            return Organization::query()->find($user->organization_id);
        }

        if ($user->role === 'admin') {
            return Organization::query()->where('email', $user->email)->first()
                ?? (Organization::query()->count() === 1 ? Organization::query()->first() : null);
        }

        return null;
    }
}