<?php

namespace App\Http\Controllers;

use App\Models\CertificateTemplate;
use App\Models\Organization;
use App\Models\SchoolClass;
use App\Models\Student;
use App\Models\User;
use App\Models\IssuedCertificate;
use App\Services\PdfService;
use Illuminate\Http\RedirectResponse;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\Auth;
use Illuminate\Validation\Rule;
use Inertia\Inertia;
use Inertia\Response;

class GenerateDocumentController extends Controller
{
    private const PRESETS = ['red', 'blue', 'yellow', 'green', 'orange', 'all'];

    public function index(): Response
    {
        $user = Auth::user();
        $organization = $this->resolveOrganizationForUser($user);

        return Inertia::render('dashboard/GenerateDocument', [
            'user' => $user,
            'schoolName' => $organization?->name ?? 'Gurukul School',
            'classes' => $organization ? $this->getClassOptions($organization) : [],
            'students' => $organization ? $this->getStudentOptions($organization) : [],
            'templates' => $organization ? $this->getTemplateOptions($organization) : [],
        ]);
    }

    public function preview(Request $request): Response
    {
        $user = Auth::user();
        $project = $this->resolveSheetProject($request, $user);

        $organization = $project['organization'];

        return Inertia::render('dashboard/GenerateDocumentPreview', [
            'user' => $user,
            'schoolName' => $organization->name,
            'className' => $project['className'],
            'cards' => $project['cards'],
            'sheet' => $project['sheet'],
        ]);
    }

    public function pdf(Request $request)
    {
        $user = Auth::user();
        $project = $this->resolveSheetProject($request, $user);

        $organization = $project['organization'];

        $html = view('documents.grid-sheet', [
            'schoolName' => $organization->name,
            'className' => $project['className'],
            'cards' => $project['cards'],
            'sheet' => $project['sheet'],
        ])->render();

        $base = str_replace(' ', '-', trim($organization->name));
        $filename = $base . '-documents-' . now()->format('Y-m-d') . '.pdf';

        return app(PdfService::class)->download(
            $html,
            $filename,
            [
                'paper' => $project['sheet']['paper'],
                'orientation' => $project['sheet']['orientation'],
            ]
        );
    }

    private function resolveSheetProject(Request $request, User $user): array
    {
        $organization = $this->resolveOrganizationForUser($user);

        abort_unless($organization, 403);

        $validated = $request->validate([
            'class' => ['required', 'integer'],
            'students' => ['nullable', 'string', 'max:4000'],
            'template' => ['nullable', 'integer'],
            'layout' => ['required', Rule::in(['certificate', 'id_grid'])],
            'card' => ['required', 'string', 'max:20'],
            'w' => ['nullable', 'numeric', 'min:10', 'max:600'],
            'h' => ['nullable', 'numeric', 'min:10', 'max:600'],
            'paper' => ['required', Rule::in(['a4', 'a3', 'letter', 'legal'])],
            'orientation' => ['required', Rule::in(['portrait', 'landscape'])],
            'margin' => ['required', 'numeric', 'min:0', 'max:50'],
            'gap' => ['required', 'numeric', 'min:0', 'max:50'],
            'cut_marks' => ['nullable', 'boolean'],
            'align_center' => ['nullable', 'boolean'],
            'duplex_type' => ['nullable', Rule::in(['front_only', 'long_edge', 'side_by_side'])],
        ]);

        $class = SchoolClass::query()
            ->where('organization_id', $organization->id)
            ->find($validated['class']);

        abort_unless($class, 404);

        $studentIds = $this->parseStudentIds($validated['students'] ?? '');
        $students = $this->resolveStudents($organization, $class, $studentIds);

        $template = null;
        if (! empty($validated['template'])) {
            $template = CertificateTemplate::query()
                ->where('organization_id', $organization->id)
                ->find($validated['template']);
        }

        $design = $this->normalizeDesign($template, $organization->name, $validated['layout']);
        $issueDate = now()->format('j F Y');
        $issuedBy = $user->name;
        $achievement = $template?->description ?: 'Issued by the school.';

        $cards = $students->map(function (Student $student) use ($design, $issueDate, $issuedBy, $achievement, $organization) {
            $context = [
                'student_name' => trim($student->first_name . ' ' . $student->last_name),
                'admission_no' => $student->admission_no ?? '',
                'class' => $student->schoolClass?->name ?? '',
                'section' => $student->schoolClass?->section ?? '',
                'issue_date' => $issueDate,
                'issued_by' => $issuedBy,
                'achievement' => $achievement,
                'school_name' => $organization->name,
            ];

            return $this->buildCard($student, $design, $context);
        })->values()->all();

        return [
            'organization' => $organization,
            'className' => trim($class->name . ($class->section ? ' - ' . $class->section : '')),
            'cards' => $cards,
            'sheet' => [
                'layout' => $validated['layout'],
                'card' => $validated['card'],
                'cardW' => $validated['card'] === 'custom' ? (float) $validated['w'] : $this->cardSize($validated['card'])[0],
                'cardH' => $validated['card'] === 'custom' ? (float) $validated['h'] : $this->cardSize($validated['card'])[1],
                'paper' => $validated['paper'],
                'orientation' => $validated['orientation'],
                'margin' => (float) $validated['margin'],
                'gap' => (float) $validated['gap'],
                'cutMarks' => $request->boolean('cut_marks'),
                'alignCenter' => $request->boolean('align_center'),
                'duplexType' => $validated['duplex_type'] ?? 'front_only',
            ],
        ];
    }

    public function archive(Request $request): RedirectResponse
    {
        $user = Auth::user();
        $organization = $this->resolveOrganizationForUser($user);

        if (! $organization) {
            return back()->with('error', 'No organization is linked to this account.');
        }

        $validated = $request->validate([
            'class' => ['required', 'integer'],
            'students' => ['nullable', 'string', 'max:4000'],
            'template' => ['required', 'integer'],
            'date' => ['required', 'date'],
        ]);

        $template = CertificateTemplate::query()
            ->where('organization_id', $organization->id)
            ->find($validated['template']);

        if (! $template) {
            return back()->with('error', 'Selected certificate template was not found.');
        }

        $class = SchoolClass::query()
            ->where('organization_id', $organization->id)
            ->find($validated['class']);

        if (! $class) {
            return back()->with('error', 'Selected class was not found.');
        }

        $studentIds = $this->parseStudentIds($validated['students'] ?? '');
        $students = $this->resolveStudents($organization, $class, $studentIds);

        foreach ($students as $student) {
            IssuedCertificate::query()->create([
                'organization_id' => $organization->id,
                'certificate_template_id' => $template->id,
                'student_id' => $student->id,
                'certificate_number' => $this->generateCertificateNumber($organization),
                'student_name' => trim($student->first_name . ' ' . $student->last_name),
                'student_name_mr' => $this->regionalStudentName($student, 'mr'),
                'student_name_hi' => $this->regionalStudentName($student, 'hi'),
                'class' => $class->name,
                'class_mr' => $class->name,
                'class_hi' => $class->name,
                'section' => $class->section,
                'section_mr' => $class->section,
                'section_hi' => $class->section,
                'reason' => $template->description ?: 'Generated document',
                'reason_mr' => null,
                'reason_hi' => null,
                'issue_date' => $validated['date'],
                'issued_by' => $user->name,
                'issued_by_designation' => 'Principal',
                'created_by' => $user->id,
            ]);
        }

        $count = $students->count();

        return back()->with('success', $count . ' document' . ($count === 1 ? '' : 's') . ' archived successfully.');
    }

    private function buildCard(Student $student, array $design, array $context): array
    {
        $elements = array_map(function (array $element) use ($context) {
            $element['content'] = $this->substitute($element['content'] ?? '', $context);

            return $element;
        }, $design['elements']);

        $watermark = $design['watermark'];
        $watermark['text'] = $this->substitute($watermark['text'] ?? '', $context);

        return [
            'student' => [
                'id' => (string) $student->id,
                'admission_no' => $student->admission_no,
                'first_name' => $student->first_name,
                'last_name' => $student->last_name,
                'first_name_mr' => $student->first_name_mr,
                'last_name_mr' => $student->last_name_mr,
                'class' => $student->schoolClass?->name,
                'section' => $student->schoolClass?->section,
                'roll_number' => $student->roll_number,
                'email' => $student->email,
                'phone' => $student->phone,
            ],
            'design' => [
                'preset' => $design['preset'],
                'watermark' => $watermark,
                'elements' => $elements,
            ],
        ];
    }

    private function substitute(string $content, array $context): string
    {
        $replacements = [
            '{{student_name}}' => $context['student_name'] ?? '',
            '{{admission_no}}' => $context['admission_no'] ?? '',
            '{{class}}' => $context['class'] ?? '',
            '{{section}}' => $context['section'] ?? '',
            '{{school_name}}' => $context['school_name'] ?? '',
            '{{issue_date}}' => $context['issue_date'] ?? '',
            '{{issued_by}}' => $context['issued_by'] ?? '',
            '{{achievement}}' => $context['achievement'] ?? '',
        ];

        return strtr($content, $replacements);
    }

    private function normalizeDesign(?CertificateTemplate $template, string $schoolName, string $layout): array
    {
        if ($template) {
            $raw = $template->design_settings;
            $preset = is_array($raw) && in_array($raw['preset'] ?? null, self::PRESETS, true)
                ? $raw['preset']
                : 'blue';

            if ($layout === 'id_grid') {
                return [
                    'preset' => $preset,
                    'watermark' => $this->defaultDesign($schoolName, $preset)['watermark'],
                    'elements' => $this->idCardElements($schoolName, $preset),
                ];
            }

            if (is_array($raw['elements'] ?? null) && $raw['elements'] !== []) {
                return [
                    'preset' => $preset,
                    'watermark' => array_merge(
                        $this->defaultDesign($schoolName, $preset)['watermark'],
                        is_array($raw['watermark'] ?? null) ? $raw['watermark'] : []
                    ),
                    'elements' => $raw['elements'],
                ];
            }
        }

        $preset = 'blue';
        $default = $this->defaultDesign($schoolName, $preset);

        if ($layout === 'id_grid') {
            return [
                'preset' => $preset,
                'watermark' => $default['watermark'],
                'elements' => $this->idCardElements($schoolName, $preset),
            ];
        }

        return $default;
    }

    private function defaultDesign(string $schoolName, string $preset): array
    {
        $theme = $this->presetTheme($preset);

        return [
            'preset' => $preset,
            'watermark' => [
                'enabled' => true,
                'text' => $schoolName,
                'opacity' => 0.08,
                'rotation' => -24,
                'fontSize' => 72,
                'color' => $theme['watermark_color'],
            ],
            'elements' => [
                $this->makeElement('school_name', '{{school_name}}', 120, 54, 34, 'Georgia, serif', 'bold', $theme['title_color']),
                $this->makeElement('certificate_title', 'Certificate of Recognition', 150, 142, 28, 'Georgia, serif', 'bold', $theme['title_color']),
                $this->makeElement('presented_text', 'This certificate is proudly presented to', 170, 220, 17, '"Trebuchet MS", sans-serif', 'normal', $theme['body_color']),
                $this->makeElement('student_name', '{{student_name}}', 130, 274, 36, 'Georgia, serif', 'bold', '#111827'),
                $this->makeElement('achievement', '{{achievement}}', 110, 352, 18, '"Trebuchet MS", sans-serif', 'normal', $theme['body_color']),
                $this->makeElement('footer_left', 'Principal', 88, 500, 16, '"Trebuchet MS", sans-serif', 'bold', '#111827'),
                $this->makeElement('issue_date', '{{issue_date}}', 548, 500, 16, '"Trebuchet MS", sans-serif', 'bold', '#111827'),
            ],
        ];
    }

    private function idCardElements(string $schoolName, string $preset): array
    {
        $theme = $this->presetTheme($preset);

        return [
            $this->makeElement('school_name', $schoolName, 100, 46, 20, 'Georgia, serif', 'bold', $theme['title_color']),
            $this->makeElement('card_title', 'Student Identity Card', 150, 96, 15, '"Trebuchet MS", sans-serif', 'bold', $theme['body_color']),
            $this->makeElement('student_name', '{{student_name}}', 130, 182, 24, 'Georgia, serif', 'bold', '#111827'),
            $this->makeElement('admission_no', 'ADM: {{admission_no}}', 100, 238, 14, '"Trebuchet MS", sans-serif', 'normal', $theme['body_color']),
            $this->makeElement('class_section', 'Class: {{class}} · Section: {{section}}', 100, 272, 14, '"Trebuchet MS", sans-serif', 'normal', $theme['body_color']),
            $this->makeElement('issue_date', 'Issued: {{issue_date}}', 100, 500, 13, '"Trebuchet MS", sans-serif', 'normal', $theme['body_color']),
        ];
    }

    private function makeElement(
        string $id,
        string $content,
        int $x,
        int $y,
        int $fontSize,
        string $fontFamily,
        string $fontWeight,
        string $color
    ): array {
        return [
            'id' => $id,
            'kind' => 'variable',
            'label' => $id,
            'content' => $content,
            'x' => $x,
            'y' => $y,
            'width' => 560,
            'fontSize' => $fontSize,
            'fontFamily' => $fontFamily,
            'fontWeight' => $fontWeight,
            'fontStyle' => 'normal',
            'textDecoration' => 'none',
            'color' => $color,
            'align' => 'center',
        ];
    }

    private function presetTheme(string $preset): array
    {
        $themes = [
            'red' => ['title_color' => '#b91c1c', 'body_color' => '#7f1d1d', 'watermark_color' => '#dc2626'],
            'blue' => ['title_color' => '#1d4ed8', 'body_color' => '#1e3a8a', 'watermark_color' => '#2563eb'],
            'yellow' => ['title_color' => '#a16207', 'body_color' => '#713f12', 'watermark_color' => '#eab308'],
            'green' => ['title_color' => '#15803d', 'body_color' => '#14532d', 'watermark_color' => '#16a34a'],
            'orange' => ['title_color' => '#c2410c', 'body_color' => '#7c2d12', 'watermark_color' => '#f97316'],
        ];

        return $themes[$preset] ?? $themes['blue'];
    }

    private function cardSize(string $card): array
    {
        return match ($card) {
            'cr80_portrait' => [54.0, 85.6],
            'cr80_landscape' => [85.6, 54.0],
            'a7_badge' => [74.0, 105.0],
            'a6_portrait' => [105.0, 148.0],
            'a6_landscape' => [148.0, 105.0],
            default => [54.0, 85.6],
        };
    }

    private function parseStudentIds(string $raw): array
    {
        $ids = array_filter(array_map('intval', explode(',', $raw)));

        return $ids;
    }

    private function resolveStudents(Organization $organization, SchoolClass $class, array $studentIds)
    {
        $query = Student::query()
            ->forCurrentSession($organization->id)
            ->where('class_id', $class->id)
            ->with('schoolClass:id,name,section');

        if ($studentIds !== []) {
            $query->whereIn('id', $studentIds);
        }

        return $query
            ->orderByRaw('CAST(roll_number AS UNSIGNED)')
            ->orderBy('first_name')
            ->get();
    }

    private function getClassOptions(Organization $organization): array
    {
        return SchoolClass::query()
            ->forCurrentSession($organization->id)
            ->where('status', 'active')
            ->orderByRaw('CAST(name AS UNSIGNED), name')
            ->orderBy('section')
            ->get(['id', 'name', 'section'])
            ->map(fn (SchoolClass $class) => [
                'id' => $class->id,
                'name' => $class->name,
                'section' => $class->section,
            ])
            ->values()
            ->all();
    }

    private function getStudentOptions(Organization $organization): array
    {
        return Student::query()
            ->forCurrentSession($organization->id)
            ->with('schoolClass:id,name,section')
            ->orderBy('first_name')
            ->orderBy('last_name')
            ->limit(2000)
            ->get()
            ->map(fn (Student $student) => [
                'id' => (string) $student->id,
                'name' => trim($student->first_name . ' ' . $student->last_name),
                'class' => $student->schoolClass?->name,
                'section' => $student->schoolClass?->section,
                'roll_number' => $student->roll_number,
                'admission_no' => $student->admission_no,
            ])
            ->values()
            ->all();
    }

    private function getTemplateOptions(Organization $organization): array
    {
        return CertificateTemplate::query()
            ->where('organization_id', $organization->id)
            ->where('status', 'active')
            ->latest()
            ->get()
            ->map(fn (CertificateTemplate $template) => [
                'id' => (string) $template->id,
                'title' => $template->localized('title'),
                'type' => $template->type,
                'description' => $template->localized('description'),
                'templateData' => $this->normalizeDesign($template, $organization->name, 'certificate'),
            ])
            ->values()
            ->all();
    }

    private function regionalStudentName(Student $student, string $language = 'mr'): ?string
    {
        $suffix = $language === 'hi' ? 'hi' : 'mr';
        $firstName = $student->{'first_name_'.$suffix} ?? '';
        $lastName = $student->{'last_name_'.$suffix} ?? '';
        $regionalName = trim($firstName . ' ' . $lastName);

        return $regionalName !== '' ? $regionalName : null;
    }

    private function generateCertificateNumber(Organization $organization): string
    {
        $year = (int) now()->format('Y');
        $next = IssuedCertificate::query()
            ->where('organization_id', $organization->id)
            ->whereYear('created_at', $year)
            ->count() + 1;

        return $year . '-' . str_pad((string) $next, 5, '0', STR_PAD_LEFT) . '-' . $organization->id;
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

        return $organization;
    }
}