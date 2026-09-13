<?php

namespace App\Http\Controllers;

use App\Models\CertificateTemplate;
use App\Models\Exam;
use App\Models\ExamResult;
use App\Models\ExamSchedule;
use App\Models\IssuedCertificate;
use App\Models\Organization;
use App\Models\Student;
use App\Models\User;
use Illuminate\Http\RedirectResponse;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\Auth;
use Illuminate\Validation\Rule;
use Inertia\Inertia;

class CertificateController extends Controller
{
    private const TEMPLATE_PRESETS = ['red', 'blue', 'yellow', 'green', 'orange', 'all'];

    public function index()
    {
        $user = Auth::user();
        $organization = $this->resolveOrganizationForUser($user);

        return Inertia::render('dashboard/CertificateManagement', [
            'user' => $user,
            'schoolName' => $organization?->name ?? 'Gurukul School',
            'certificates' => $organization ? $this->getCertificateTemplates($organization) : [],
            'students' => $organization ? $this->getStudents($organization) : [],
            'issuedCertificates' => $organization ? $this->getIssuedCertificates($organization) : [],
        ]);
    }

    public function studentCertificates()
    {
        $user = Auth::user();
        $organization = $this->resolveOrganizationForUser($user);
        $student = $this->resolveStudentForUser($user, $organization);

        abort_unless($user->role === 'student', 403);

        return Inertia::render('dashboard/StudentCertificates', [
            'user' => $user,
            'schoolName' => $organization?->name ?? 'Gurukul School',
            'studentRecord' => $student ? $this->serializeStudent($student) : null,
            'issuedCertificates' => $student ? $this->getStudentIssuedCertificates($organization, $student) : [],
        ]);
    }

    public function store(Request $request): RedirectResponse
    {
        $user = Auth::user();
        $organization = $this->resolveOrganizationForUser($user);

        if (! $organization) {
            return back()->with('error', 'No organization is linked to this account.');
        }

        $validated = $this->validateTemplate($request);

        CertificateTemplate::query()->create([
            'organization_id' => $organization->id,
            'title' => $validated['title'],
            'type' => $validated['type'],
            'description' => $validated['description'] ?: null,
            'template_design' => $validated['template_data']['preset'],
            'design_settings' => $validated['template_data'],
            'status' => 'active',
        ]);

        return redirect()->route('certificates')->with('success', 'Certificate template created successfully.');
    }

    public function update(Request $request, CertificateTemplate $certificateTemplate): RedirectResponse
    {
        $user = Auth::user();
        $organization = $this->resolveOrganizationForUser($user);

        abort_unless($organization && $certificateTemplate->organization_id === $organization->id, 403);

        $validated = $this->validateTemplate($request);

        $certificateTemplate->update([
            'title' => $validated['title'],
            'type' => $validated['type'],
            'description' => $validated['description'] ?: null,
            'template_design' => $validated['template_data']['preset'],
            'design_settings' => $validated['template_data'],
        ]);

        return redirect()->route('certificates')->with('success', 'Certificate template updated successfully.');
    }

    public function destroy(CertificateTemplate $certificateTemplate): RedirectResponse
    {
        $user = Auth::user();
        $organization = $this->resolveOrganizationForUser($user);

        abort_unless($organization && $certificateTemplate->organization_id === $organization->id, 403);

        $certificateTemplate->delete();

        return redirect()->route('certificates')->with('success', 'Certificate template deleted successfully.');
    }

    public function destroyIssued(IssuedCertificate $issuedCertificate): RedirectResponse
    {
        $user = Auth::user();
        $organization = $this->resolveOrganizationForUser($user);

        abort_unless($organization && $issuedCertificate->organization_id === $organization->id, 403);

        $issuedCertificate->delete();

        return redirect()->route('certificates')->with('success', 'Issued certificate deleted successfully.');
    }

    public function bulkIssue(Request $request): RedirectResponse
    {
        $user = Auth::user();
        $organization = $this->resolveOrganizationForUser($user);

        if (! $organization) {
            return back()->with('error', 'No organization is linked to this account.');
        }

        $validated = $request->validate([
            'certificate_template_id' => ['required', 'integer'],
            'student_ids' => ['required', 'array', 'min:1'],
            'student_ids.*' => ['required', 'integer'],
            'reason' => ['nullable', 'string', 'max:2000'],
            'reason_mr' => ['nullable', 'string', 'max:2000'],
            'date' => ['required', 'date'],
            'issued_by' => ['nullable', 'string', 'max:255'],
            'language' => ['nullable', 'string', 'max:10', Rule::in(['en', 'mr', 'hi'])],
        ]);

        $template = CertificateTemplate::query()
            ->where('organization_id', $organization->id)
            ->find($validated['certificate_template_id']);

        if (! $template) {
            return redirect()->route('certificates')->with('error', 'Selected certificate template was not found.');
        }

        $students = Student::query()
            ->forCurrentSession($organization->id)
            ->whereIn('id', $validated['student_ids'])
            ->with('schoolClass:id,name,section')
            ->get();

        if ($students->count() !== count($validated['student_ids'])) {
            return redirect()->route('certificates')->with('error', 'Some selected students could not be found.');
        }

        foreach ($students as $student) {
            IssuedCertificate::query()->create([
                'organization_id' => $organization->id,
                'certificate_template_id' => $template->id,
                'student_id' => $student->id,
                'certificate_number' => $this->generateCertificateNumber($organization),
                'student_name' => trim($student->first_name . ' ' . $student->last_name),
                'student_name_mr' => $this->regionalStudentName($student, 'mr'),
                'student_name_hi' => $this->regionalStudentName($student, 'hi'),
                'class' => $student->schoolClass?->name ?? '',
                'class_mr' => $student->schoolClass?->name ?? '',
                'class_hi' => $student->schoolClass?->name ?? '',
                'section' => $student->schoolClass?->section ?? '',
                'section_mr' => $student->schoolClass?->section ?? '',
                'section_hi' => $student->schoolClass?->section ?? '',
                'reason' => $validated['reason'] ?: $template->description ?: 'Certificate issued',
                'reason_mr' => ($validated['reason_mr'] ?? null) ?: null,
                'reason_hi' => ($validated['reason_hi'] ?? null) ?: null,
                'issue_date' => $validated['date'],
                'issued_by' => ($validated['issued_by'] ?? null) ?: $user->name,
                'issued_by_designation' => 'Principal',
                'created_by' => $user->id,
            ]);
        }

        $count = $students->count();

        return redirect()
            ->route('certificates')
            ->with('success', $count . ' certificate' . ($count === 1 ? '' : 's') . ' issued successfully.');
    }

    public function marksheet()
    {
        $user = Auth::user();
        $organization = $this->resolveOrganizationForUser($user);

        return inertia('dashboard/MarksheetManagement', [
            'user' => $user,
            'organization' => $organization ? [
                'id' => $organization->id,
                'name' => $organization->name,
                'logo' => $organization->logo,
            ] : null,
            'students' => $organization ? $this->getStudents($organization) : [],
            'examGroups' => $organization ? $this->getExamGroups($organization) : [],
        ]);
    }

    public function studentIdCard()
    {
        $user = Auth::user();
        $organization = $this->resolveOrganizationForUser($user);

        return inertia('dashboard/StudentIdCardManagement', [
            'user' => $user,
            'students' => $organization ? $this->getStudentIdCardStudents($organization) : [],
        ]);
    }

    private function validateTemplate(Request $request): array
    {
        return $request->validate([
            'title' => ['required', 'string', 'max:255'],
            'type' => ['required', Rule::in(['merit', 'achievement', 'participation', 'appreciation', 'completion'])],
            'description' => ['nullable', 'string', 'max:2000'],
            'template_data' => ['required', 'array'],
            'template_data.preset' => ['required', Rule::in(self::TEMPLATE_PRESETS)],
            'template_data.elements' => ['required', 'array', 'min:1'],
            'template_data.watermark' => ['required', 'array'],
        ]);
    }

    private function getCertificateTemplates(Organization $organization): array
    {
        return CertificateTemplate::query()
            ->where('organization_id', $organization->id)
            ->withCount('issuedCertificates')
            ->latest()
            ->get()
            ->map(fn (CertificateTemplate $template) => [
                'id' => (string) $template->id,
                'title' => $template->localized('title'),
                'type' => $template->type,
                'description' => $template->localized('description'),
                'createdAt' => optional($template->created_at)->format('Y-m-d'),
                'issuedTo' => $template->issued_certificates_count,
                'templateData' => $this->normalizeTemplateData($template->design_settings, $organization->name),
            ])
            ->all();
    }

    private function getStudents(Organization $organization): array
    {
        return Student::query()
            ->forCurrentSession($organization->id)
            ->with('schoolClass:id,name,section')
            ->orderBy('first_name')
            ->orderBy('last_name')
            ->get()
            ->map(fn (Student $student) => [
                'id' => (string) $student->id,
                'admission_no' => $student->admission_no,
                'first_name' => $student->first_name,
                'first_name_mr' => $student->first_name_mr,
                'last_name' => $student->last_name,
                'last_name_mr' => $student->last_name_mr,
                'class' => $student->schoolClass?->name,
                'section' => $student->schoolClass?->section,
                'roll_number' => $student->roll_number,
            ])
            ->all();
    }

    private function getExamGroups(Organization $organization): array
    {
        return Exam::query()
            ->where('organization_id', $organization->id)
            ->with([
                'schedules.subject:id,name,name_mr,name_hi',
                'schedules.results.student:id,first_name,last_name,class_id,roll_number',
                'schedules.schoolClass:id,name,section',
            ])
            ->orderByDesc('created_at')
            ->get()
            ->map(function (Exam $exam) {
                $examMetadata = $this->decodeExamMetadata($exam);

                return [
                    'groupId' => (string) $exam->id,
                    'name' => $exam->localized('name'),
                    'publishStatus' => $exam->publish_status ?? 'draft',
                    'className' => $examMetadata['className'],
                    'section' => $examMetadata['section'],
                    'studentIds' => [],
                    'createdAt' => optional($exam->created_at)->toDateTimeString(),
                    'exams' => $exam->schedules->map(function (ExamSchedule $schedule) {
                        return [
                            'id' => (string) $schedule->id,
                            'subject_id' => $schedule->subject_id,
                            'subject' => $schedule->subject?->localized('name') ?? 'Subject',
                            'class' => $schedule->schoolClass?->name,
                            'section' => $schedule->schoolClass?->section,
                            'exam_date' => optional($schedule->exam_date)->format('Y-m-d'),
                            'start_time' => optional($schedule->start_time)->format('H:i'),
                            'end_time' => optional($schedule->end_time)->format('H:i'),
                            'room_number' => $schedule->room_number,
                            'total_marks' => $schedule->max_marks,
                            'passing_marks' => $schedule->passing_marks,
                            'results' => $schedule->results->map(fn (ExamResult $result) => [
                                'student_id' => (string) $result->student_id,
                                'marks_obtained' => (float) $result->obtained_marks,
                                'grade' => $result->grade,
                            ])->values()->all(),
                        ];
                    })->values()->all(),
                ];
            })
            ->all();
    }

    private function decodeExamMetadata(Exam $exam): array
    {
        $description = $exam->description;

        if (! is_string($description) || trim($description) === '') {
            return [
                'className' => null,
                'section' => null,
            ];
        }

        $decoded = json_decode($description, true);

        if (! is_array($decoded)) {
            return [
                'className' => null,
                'section' => null,
            ];
        }

        return [
            'className' => isset($decoded['class_name']) && is_string($decoded['class_name']) ? $decoded['class_name'] : null,
            'section' => isset($decoded['section']) && is_string($decoded['section']) ? $decoded['section'] : null,
        ];
    }

    private function getStudentIdCardStudents(Organization $organization): array
    {
        return Student::query()
            ->forCurrentSession($organization->id)
            ->with('schoolClass:id,name,section')
            ->orderBy('first_name')
            ->orderBy('last_name')
            ->get()
            ->map(function (Student $student) use ($organization) {
                if (! $student->qr_token) {
                    $student->qr_token = \App\Support\QrToken::generate('QR', $organization->id, (int) $student->id);
                    $student->save();
                }

                return [
                    'id' => (string) $student->id,
                    'organization_id' => $student->organization_id,
                    'admission_no' => $student->admission_no,
                    'roll_number' => $student->roll_number,
                    'first_name' => $student->first_name,
                    'first_name_mr' => $student->first_name_mr,
                    'last_name' => $student->last_name,
                    'last_name_mr' => $student->last_name_mr,
                    'class' => $student->schoolClass?->name,
                    'section' => $student->schoolClass?->section,
                    'email' => $student->email,
                    'phone' => $student->phone,
                    'gender' => $student->gender,
                    'blood_group' => $student->blood_group,
                    'father_name' => $student->father_name,
                    'father_name_mr' => $student->father_name_mr,
                    'mother_name' => $student->mother_name,
                    'mother_name_mr' => $student->mother_name_mr,
                    'address' => $student->current_address ?: $student->permanent_address,
                    'address_mr' => $student->address_mr,
                    'qr_token' => $student->qr_token,
                ];
            })
            ->all();
    }

    private function getIssuedCertificates(Organization $organization): array
    {
        return IssuedCertificate::query()
            ->where('organization_id', $organization->id)
            ->with([
                'template:id,title,type,description,design_settings',
                'student:id,admission_no',
            ])
            ->latest('issue_date')
            ->latest('id')
            ->get()
            ->map(fn (IssuedCertificate $issuedCertificate) => [
                'id' => (string) $issuedCertificate->id,
                'certificateNumber' => $issuedCertificate->certificate_number,
                'templateTitle' => $issuedCertificate->template?->title ?? 'Certificate',
                'templateType' => $issuedCertificate->template?->type ?? null,
                'studentId' => $issuedCertificate->student_id ? (string) $issuedCertificate->student_id : null,
                'studentName' => $issuedCertificate->student_name,
                'studentNameMr' => $issuedCertificate->student_name_mr,
                'admissionNo' => $issuedCertificate->student?->admission_no,
                'class' => $issuedCertificate->class,
                'classMr' => $issuedCertificate->class_mr,
                'section' => $issuedCertificate->section,
                'sectionMr' => $issuedCertificate->section_mr,
                'reason' => $issuedCertificate->reason,
                'reasonMr' => $issuedCertificate->reason_mr,
                'issueDate' => optional($issuedCertificate->issue_date)->format('Y-m-d'),
                'issuedBy' => $issuedCertificate->issued_by,
                'issuedByDesignation' => $issuedCertificate->issued_by_designation,
                'templateData' => $this->normalizeTemplateData($issuedCertificate->template?->design_settings, $organization->name),
            ])
            ->all();
    }

    private function getStudentIssuedCertificates(?Organization $organization, Student $student): array
    {
        if (! $organization) {
            return [];
        }

        return IssuedCertificate::query()
            ->where('organization_id', $organization->id)
            ->where('student_id', $student->id)
            ->with('template:id,title,type,description,design_settings')
            ->latest('issue_date')
            ->latest('id')
            ->get()
            ->map(fn (IssuedCertificate $issuedCertificate) => [
                'id' => (string) $issuedCertificate->id,
                'certificateNumber' => $issuedCertificate->certificate_number,
                'templateTitle' => $issuedCertificate->template?->title ?? 'Certificate',
                'templateType' => $issuedCertificate->template?->type ?? null,
                'description' => $issuedCertificate->template?->description,
                'studentName' => $issuedCertificate->student_name,
                'studentNameMr' => $issuedCertificate->student_name_mr,
                'admissionNo' => $student->admission_no,
                'class' => $issuedCertificate->class,
                'classMr' => $issuedCertificate->class_mr,
                'section' => $issuedCertificate->section,
                'sectionMr' => $issuedCertificate->section_mr,
                'reason' => $issuedCertificate->reason,
                'reasonMr' => $issuedCertificate->reason_mr,
                'issueDate' => optional($issuedCertificate->issue_date)->format('Y-m-d'),
                'issuedBy' => $issuedCertificate->issued_by,
                'issuedByDesignation' => $issuedCertificate->issued_by_designation,
                'templateData' => $this->normalizeTemplateData($issuedCertificate->template?->design_settings, $organization->name),
            ])
            ->all();
    }

    private function serializeStudent(Student $student): array
    {
        return [
            'id' => (string) $student->id,
            'admission_no' => $student->admission_no,
            'first_name' => $student->first_name,
            'last_name' => $student->last_name,
            'first_name_mr' => $student->first_name_mr,
            'last_name_mr' => $student->last_name_mr,
            'class' => $student->schoolClass?->name,
            'section' => $student->schoolClass?->section,
        ];
    }

    private function regionalStudentName(Student $student, string $language = 'mr'): ?string
    {
        $suffix = $language === 'hi' ? 'hi' : 'mr';
        $firstName = $student->{'first_name_'.$suffix} ?? '';
        $lastName = $student->{'last_name_'.$suffix} ?? '';
        $regionalName = trim($firstName . ' ' . $lastName);

        return $regionalName !== '' ? $regionalName : null;
    }

    private function normalizeTemplateData(?array $templateData, string $schoolName): array
    {
        $normalizedPreset = $this->normalizePreset($templateData['preset'] ?? null);
        $default = $this->defaultTemplateData($schoolName, $normalizedPreset);

        if (! is_array($templateData)) {
            return $default;
        }

        return [
            'preset' => $normalizedPreset,
            'elements' => is_array($templateData['elements'] ?? null) ? $templateData['elements'] : $default['elements'],
            'watermark' => is_array($templateData['watermark'] ?? null)
                ? array_merge($default['watermark'], $templateData['watermark'])
                : $default['watermark'],
        ];
    }

    private function defaultTemplateData(string $schoolName, string $preset = 'all'): array
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
                [
                    'id' => 'school_name',
                    'kind' => 'variable',
                    'label' => 'School Name',
                    'content' => '{{school_name}}',
                    'x' => 120,
                    'y' => 54,
                    'width' => 560,
                    'fontSize' => 34,
                    'fontFamily' => 'Georgia, serif',
                    'fontWeight' => 'bold',
                    'fontStyle' => 'normal',
                    'textDecoration' => 'none',
                    'color' => '#111827',
                    'align' => 'center',
                ],
                [
                    'id' => 'certificate_title',
                    'kind' => 'text',
                    'label' => 'Certificate Title',
                    'content' => 'Certificate of Achievement',
                    'x' => 150,
                    'y' => 142,
                    'width' => 500,
                    'fontSize' => 28,
                    'fontFamily' => 'Georgia, serif',
                    'fontWeight' => 'bold',
                    'fontStyle' => 'normal',
                    'textDecoration' => 'none',
                    'color' => $theme['title_color'],
                    'align' => 'center',
                ],
                [
                    'id' => 'presented_text',
                    'kind' => 'text',
                    'label' => 'Presented Text',
                    'content' => 'This certificate is proudly presented to',
                    'x' => 170,
                    'y' => 220,
                    'width' => 460,
                    'fontSize' => 17,
                    'fontFamily' => '"Trebuchet MS", sans-serif',
                    'fontWeight' => 'normal',
                    'fontStyle' => 'normal',
                    'textDecoration' => 'none',
                    'color' => $theme['body_color'],
                    'align' => 'center',
                ],
                [
                    'id' => 'student_name',
                    'kind' => 'variable',
                    'label' => 'Student Name',
                    'content' => '{{student_name}}',
                    'x' => 130,
                    'y' => 274,
                    'width' => 540,
                    'fontSize' => 36,
                    'fontFamily' => 'Georgia, serif',
                    'fontWeight' => 'bold',
                    'fontStyle' => 'normal',
                    'textDecoration' => 'underline',
                    'color' => '#111827',
                    'align' => 'center',
                ],
                [
                    'id' => 'achievement',
                    'kind' => 'variable',
                    'label' => 'Achievement',
                    'content' => '{{achievement}}',
                    'x' => 110,
                    'y' => 352,
                    'width' => 580,
                    'fontSize' => 18,
                    'fontFamily' => '"Trebuchet MS", sans-serif',
                    'fontWeight' => 'normal',
                    'fontStyle' => 'italic',
                    'textDecoration' => 'none',
                    'color' => $theme['body_color'],
                    'align' => 'center',
                ],
                [
                    'id' => 'footer_left',
                    'kind' => 'text',
                    'label' => 'Footer Left',
                    'content' => 'Principal',
                    'x' => 88,
                    'y' => 500,
                    'width' => 160,
                    'fontSize' => 16,
                    'fontFamily' => '"Trebuchet MS", sans-serif',
                    'fontWeight' => 'bold',
                    'fontStyle' => 'normal',
                    'textDecoration' => 'none',
                    'color' => '#111827',
                    'align' => 'center',
                ],
                [
                    'id' => 'issue_date',
                    'kind' => 'variable',
                    'label' => 'Issue Date',
                    'content' => '{{issue_date}}',
                    'x' => 548,
                    'y' => 500,
                    'width' => 160,
                    'fontSize' => 16,
                    'fontFamily' => '"Trebuchet MS", sans-serif',
                    'fontWeight' => 'bold',
                    'fontStyle' => 'normal',
                    'textDecoration' => 'none',
                    'color' => '#111827',
                    'align' => 'center',
                ],
            ],
        ];
    }

    private function normalizePreset(mixed $preset): string
    {
        $value = is_string($preset) ? strtolower($preset) : '';

        return match ($value) {
            'classic' => 'red',
            'modern' => 'blue',
            'formal' => 'green',
            default => in_array($value, self::TEMPLATE_PRESETS, true) ? $value : 'all',
        };
    }

    private function presetTheme(string $preset): array
    {
        return match ($preset) {
            'red' => [
                'title_color' => '#b91c1c',
                'body_color' => '#475569',
                'watermark_color' => '#7f1d1d',
            ],
            'blue' => [
                'title_color' => '#1d4ed8',
                'body_color' => '#334155',
                'watermark_color' => '#1e3a8a',
            ],
            'yellow' => [
                'title_color' => '#ca8a04',
                'body_color' => '#713f12',
                'watermark_color' => '#a16207',
            ],
            'green' => [
                'title_color' => '#047857',
                'body_color' => '#365314',
                'watermark_color' => '#065f46',
            ],
            'orange' => [
                'title_color' => '#ea580c',
                'body_color' => '#7c2d12',
                'watermark_color' => '#c2410c',
            ],
            default => [
                'title_color' => '#be185d',
                'body_color' => '#334155',
                'watermark_color' => '#7c3aed',
            ],
        };
    }

    private function generateCertificateNumber(Organization $organization): string
    {
        do {
            $number = sprintf(
                'CERT-%d-%s-%04d',
                $organization->id,
                now()->format('Ymd'),
                random_int(0, 9999)
            );
        } while (IssuedCertificate::query()->where('certificate_number', $number)->exists());

        return $number;
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
