<?php

namespace App\Http\Controllers;

use App\Models\Attendance;
use App\Models\AcademicYear;
use App\Models\Exam;
use App\Models\ExamSchedule;
use App\Models\Homework;
use App\Models\HomeworkSubmission;
use App\Models\IssuedCertificate;
use App\Models\LibraryBook;
use App\Models\LibraryCirculation;
use App\Models\LibraryMember;
use App\Models\Message;
use App\Models\MessageRecipient;
use App\Models\OnlineExam;
use App\Models\Organization;
use App\Models\SchoolClass;
use App\Models\SchoolEvent;
use App\Models\Student;
use App\Models\StudentAcademicHistory;
use App\Models\StudentFee;
use App\Models\SuperAdminSetting;
use App\Models\User;
use App\Services\KnowledgeBaseService;
use App\Services\StaffPermissionService;
use App\Services\StudentAcademicHistoryService;
use Illuminate\Http\RedirectResponse;
use Illuminate\Http\Request;
use Illuminate\Support\Carbon;
use Illuminate\Support\Facades\Auth;
use Illuminate\Support\Facades\Config;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Facades\Mail;
use Illuminate\Support\Facades\Schema;
use Illuminate\Support\Str;
use Illuminate\Validation\Rule;
use Inertia\Inertia;
use Inertia\Response;
use Throwable;

class DashboardController extends Controller
{
    private const TRANSPORT_FEE_PREFIX = 'Transport Fee - ';

    public function __construct(
        private readonly StaffPermissionService $staffPermissionService,
        private readonly StudentAcademicHistoryService $studentAcademicHistoryService,
        private readonly KnowledgeBaseService $knowledgeBaseService
    ) {
    }

    public function index(Request $request): Response
    {
        $user = Auth::user();

        if ($user->role === 'super_admin') {
            return Inertia::render('Dashboard', [
                'user' => $user,
                'organizations' => $this->getOrganizationsPayload(),
                'smtpSettings' => $this->getSmtpSettingsPayload(),
                'superAdminView' => 'dashboard',
            ]);
        }

        $organization = $this->staffPermissionService->resolveOrganizationForUser($user);
        abort_unless($organization, 403);

        $activeAcademicYear = $this->studentAcademicHistoryService->getActiveAcademicYear($organization->id);
        $isStudentView = $user->role === 'student';
        $studentChildren = $isStudentView
            ? $this->resolveChildrenForUser($user, $organization)
            : [];
        $student = $isStudentView
            ? $this->selectChildStudent($studentChildren, $request->integer('student'))
            : null;
        $studentEnrollment = $student
            ? $this->studentAcademicHistoryService->getSessionEnrollmentForStudent($student)
            : null;

        return Inertia::render('dashboard/DashboardHome', [
            'user' => $user,
            'organization' => [
                'id' => $organization->id,
                'name' => $organization->name,
                'logo' => $organization->logo,
            ],
            'activeSession' => $activeAcademicYear?->name ?? $organization->selectedSessionName(),
            'dashboardType' => $isStudentView ? 'student' : 'admin',
            'stats' => $isStudentView
                ? $this->buildStudentDashboardStats($organization, $student, $studentEnrollment, $user)
                : $this->buildAdminDashboardStats($organization, $user, $activeAcademicYear),
            'studentRecord' => $student ? $this->serializeStudent($student, $studentEnrollment) : null,
            'studentChildren' => $studentChildren,
            'selectedStudentId' => $student ? (string) $student->id : null,
            'notices' => $this->getDashboardNotices($organization, $user),
            'upcomingEvents' => $this->getUpcomingEvents($organization),
        ]);
    }

    public function smtpSettings(): Response
    {
        $user = Auth::user();
        abort_unless($user->role === 'super_admin', 403);

        return Inertia::render('Dashboard', [
            'user' => $user,
            'organizations' => [],
            'smtpSettings' => $this->getSmtpSettingsPayload(),
            'superAdminView' => 'smtp-settings',
        ]);
    }

    public function organizations(): Response
    {
        $user = Auth::user();
        abort_unless($user->role === 'super_admin', 403);

        return Inertia::render('Dashboard', [
            'user' => $user,
            'organizations' => $this->getOrganizationsPayload(),
            'smtpSettings' => null,
            'knowledgeBaseContent' => null,
            'superAdminView' => 'organizations',
        ]);
    }

    public function knowledgeBaseCms(): Response
    {
        $user = Auth::user();
        abort_unless($user->role === 'super_admin', 403);

        return Inertia::render('Dashboard', [
            'user' => $user,
            'organizations' => [],
            'smtpSettings' => null,
            'knowledgeBaseContent' => $this->getKnowledgeBaseContentPayload(),
            'superAdminView' => 'knowledge-base-cms',
        ]);
    }

    public function profile(): Response
    {
        $user = Auth::user();
        abort_unless($user->role === 'super_admin', 403);

        return Inertia::render('Dashboard', [
            'user' => $user,
            'organizations' => [],
            'smtpSettings' => null,
            'knowledgeBaseContent' => null,
            'superAdminView' => 'profile',
        ]);
    }

    public function editProfile(): Response
    {
        $user = Auth::user();
        abort_unless($user->role === 'super_admin', 403);

        return Inertia::render('Dashboard', [
            'user' => $user,
            'organizations' => [],
            'smtpSettings' => null,
            'knowledgeBaseContent' => null,
            'superAdminView' => 'profile-edit',
        ]);
    }

    public function storeOrganization(Request $request): RedirectResponse
    {
        abort_unless(Auth::user()?->role === 'super_admin', 403);

        $validated = $request->validate([
            'name' => ['required', 'string', 'max:255'],
            'slug' => ['required', 'string', 'max:255', 'alpha_dash', Rule::unique('organizations', 'slug')],
            'address' => ['required', 'string'],
            'city' => ['required', 'string', 'max:255'],
            'state' => ['required', 'string', 'max:255'],
            'pincode' => ['required', 'string', 'max:20'],
            'phone' => ['required', 'string', 'max:30'],
            'email' => [
                'required',
                'email',
                'max:255',
                function (string $attribute, mixed $value, \Closure $fail): void {
                    $emailExists = Organization::withTrashed()
                        ->where('email', $value)
                        ->exists()
                        || User::query()->where('email', $value)->exists();

                    if ($emailExists) {
                        $fail('This email is already registered for an organization or user.');
                    }
                },
            ],
            'type' => ['sometimes', 'required', Rule::in(['school', 'college', 'coaching', 'university'])],
            'portal_routing' => ['sometimes', 'nullable', Rule::in(['session', 'path', 'subdomain'])],
            'subscription_plan' => ['required', Rule::in(['free', 'basic', 'premium', 'enterprise'])],
            'subscription_status' => ['required', Rule::in(['active', 'inactive', 'suspended'])],
            'subscription_end_date' => ['required', 'date'],
            'max_students' => ['required', 'integer', 'min:1'],
            'password' => ['required', 'string', 'min:8'],
        ]);

        DB::transaction(function () use ($validated) {
            $organization = Organization::query()->create([
                'name' => $validated['name'],
                'slug' => Str::slug($validated['slug']),
                'email' => $validated['email'],
                'phone' => $validated['phone'],
                'address' => $validated['address'],
                'city' => $validated['city'],
                'state' => $validated['state'],
                'pincode' => $validated['pincode'],
                'subscription_plan' => $validated['subscription_plan'],
                'subscription_start_date' => now()->toDateString(),
                'subscription_end_date' => $validated['subscription_end_date'],
                'country' => 'India',
                'type' => $validated['type'] ?? 'school',
                'status' => $validated['subscription_status'],
                'max_students' => $validated['max_students'],
                'max_staff' => 10,
                'settings' => [
                    'academic_year_start' => '2024-04-01',
                    'currency' => 'INR',
                    'timezone' => 'Asia/Kolkata',
                    'session' => '2025-2026',
                    'sessions' => ['2024-2025', '2025-2026'],
                    'portal_routing' => $validated['portal_routing'] ?? 'session',
                ],
            ]);

            User::query()->create([
                'organization_id' => $organization->id,
                'name' => $validated['name'] . ' Admin',
                'email' => $validated['email'],
                'password' => $validated['password'],
                'phone' => $validated['phone'],
                'address' => $validated['address'],
                'role' => 'admin',
                'status' => $validated['subscription_status'] === 'active' ? 'active' : 'inactive',
            ]);
        });

        return redirect()->route('dashboard')->with('success', 'Organization created successfully.');
    }

    public function updateOrganization(Request $request, Organization $organization): RedirectResponse
    {
        abort_unless(Auth::user()?->role === 'super_admin', 403);

        $validated = $request->validate([
            'name' => ['required', 'string', 'max:255'],
            'slug' => ['required', 'string', 'max:255', 'alpha_dash', Rule::unique('organizations', 'slug')->ignore($organization->id)],
            'address' => ['required', 'string'],
            'city' => ['required', 'string', 'max:255'],
            'state' => ['required', 'string', 'max:255'],
            'pincode' => ['required', 'string', 'max:20'],
            'phone' => ['required', 'string', 'max:30'],
            'email' => ['required', 'email', 'max:255', Rule::unique('organizations', 'email')->ignore($organization->id)],
            'type' => ['sometimes', 'required', Rule::in(['school', 'college', 'coaching', 'university'])],
            'portal_routing' => ['sometimes', 'nullable', Rule::in(['session', 'path', 'subdomain'])],
            'subscription_plan' => ['required', Rule::in(['free', 'basic', 'premium', 'enterprise'])],
            'subscription_status' => ['required', Rule::in(['active', 'inactive', 'suspended'])],
            'subscription_end_date' => ['required', 'date'],
            'max_students' => ['required', 'integer', 'min:1'],
        ]);

        $portalRouting = $validated['portal_routing'] ?? null;

        if ($portalRouting) {
            unset($validated['portal_routing']);
        }

        $organization->update([
            ...$validated,
            'slug' => Str::slug($validated['slug']),
            'status' => $validated['subscription_status'],
            'subscription_start_date' => $organization->subscription_start_date ?? now()->toDateString(),
            'settings' => array_merge(
                $organization->settings ?? [],
                $portalRouting ? ['portal_routing' => $portalRouting] : [],
            ),
        ]);

        return redirect()->route('dashboard')->with('success', 'Organization updated successfully.');
    }

    public function destroyOrganization(Organization $organization): RedirectResponse
    {
        abort_unless(Auth::user()?->role === 'super_admin', 403);

        $organization->delete();

        return redirect()->route('dashboard')->with('success', 'Organization deleted successfully.');
    }

    public function impersonateOrganizationAdmin(Request $request, Organization $organization): RedirectResponse
    {
        $currentUser = Auth::user();
        abort_unless($currentUser && $currentUser->role === 'super_admin', 403);

        $adminUser = User::query()
            ->where('organization_id', $organization->id)
            ->where('role', 'admin')
            ->orderBy('id')
            ->first();

        if (! $adminUser) {
            return back()->with('error', 'No school admin user is available for this organization.');
        }

        $request->session()->put([
            'impersonator_id' => $currentUser->id,
            'impersonator_role' => $currentUser->role,
            'impersonated_user_id' => $adminUser->id,
        ]);

        Auth::login($adminUser);
        $request->session()->regenerate();

        return redirect($this->staffPermissionService->landingPathFor($adminUser))
            ->with('success', sprintf('You are now viewing %s as the school admin.', $organization->name));
    }

    public function leaveImpersonation(Request $request): RedirectResponse
    {
        $impersonatorId = $request->session()->get('impersonator_id');
        $impersonatorRole = $request->session()->get('impersonator_role');

        abort_unless($impersonatorId && $impersonatorRole === 'super_admin', 403);

        $originalUser = User::query()->find($impersonatorId);

        if (! $originalUser || $originalUser->role !== 'super_admin') {
            Auth::logout();
            $request->session()->invalidate();
            $request->session()->regenerateToken();

            return redirect()->route('login')->with('error', 'Your original superadmin session could not be restored.');
        }

        Auth::login($originalUser);
        $request->session()->forget([
            'impersonator_id',
            'impersonator_role',
            'impersonated_user_id',
        ]);
        $request->session()->regenerate();

        return redirect()->route('dashboard')->with('success', 'Returned to the superadmin account.');
    }

    public function updateSmtpSettings(Request $request): RedirectResponse
    {
        $user = Auth::user();
        abort_unless($user->role === 'super_admin', 403);

        if (! Schema::hasTable('super_admin_settings')) {
            return redirect()
                ->route('superadmin.smtp-settings')
                ->with('error', 'Run migrations first to create the super admin settings table.');
        }

        $validated = $request->validate([
            'mailer' => ['required', Rule::in(['smtp', 'sendmail', 'mailgun'])],
            'smtp_host' => ['nullable', 'string', 'max:255'],
            'smtp_port' => ['nullable', 'integer', 'min:1', 'max:65535'],
            'smtp_username' => ['nullable', 'string', 'max:255'],
            'smtp_password' => ['nullable', 'string'],
            'smtp_encryption' => ['nullable', Rule::in(['tls', 'ssl', 'none'])],
            'from_name' => ['nullable', 'string', 'max:255'],
            'from_email' => ['nullable', 'email', 'max:255'],
            'reply_to_email' => ['nullable', 'email', 'max:255'],
            'is_active' => ['boolean'],
        ]);

        $settings = SuperAdminSetting::query()->firstOrNew(['id' => 1]);
        $settings->fill([
            ...$validated,
            'smtp_encryption' => $validated['smtp_encryption'] === 'none' ? null : ($validated['smtp_encryption'] ?? null),
        ]);
        $settings->save();

        $this->applySmtpSettings($settings);

        return redirect()->route('superadmin.smtp-settings')->with('success', 'SMTP settings updated successfully.');
    }

    public function sendTestSmtpMail(Request $request): RedirectResponse
    {
        $user = Auth::user();
        abort_unless($user->role === 'super_admin', 403);

        if (! Schema::hasTable('super_admin_settings')) {
            return redirect()
                ->route('superadmin.smtp-settings')
                ->with('error', 'Run migrations first to create the super admin settings table.');
        }

        $validated = $request->validate([
            'test_email' => ['required', 'email', 'max:255'],
        ]);

        $settings = SuperAdminSetting::query()->first();

        if (! $settings) {
            return redirect()
                ->route('superadmin.smtp-settings')
                ->with('error', 'Save SMTP settings before sending a test email.');
        }

        if (! $settings->is_active) {
            return redirect()
                ->route('superadmin.smtp-settings')
                ->with('error', 'Activate SMTP settings before sending a test email.');
        }

        $this->applySmtpSettings($settings);

        try {
            Mail::raw(
                "This is a test email from Gurukul ERP.\n\nIf you received this message, the superadmin SMTP settings are working correctly.",
                function ($message) use ($validated, $settings) {
                    $message
                        ->to($validated['test_email'])
                        ->subject('Gurukul ERP SMTP Test Email');

                    if ($settings->from_email) {
                        $message->from($settings->from_email, $settings->from_name ?: 'Gurukul ERP');
                    }

                    if ($settings->reply_to_email) {
                        $message->replyTo($settings->reply_to_email, $settings->from_name ?: 'Gurukul ERP');
                    }
                }
            );
        } catch (Throwable $exception) {
            return redirect()
                ->route('superadmin.smtp-settings')
                ->with('error', 'Test email failed: ' . $exception->getMessage());
        }

        return redirect()
            ->route('superadmin.smtp-settings')
            ->with('success', 'Test email sent successfully to ' . $validated['test_email'] . '.');
    }

    public function updateKnowledgeBaseCms(Request $request): RedirectResponse
    {
        $user = Auth::user();
        abort_unless($user->role === 'super_admin', 403);

        if (
            ! Schema::hasTable('knowledge_base_page_settings')
            || ! Schema::hasTable('knowledge_base_modules')
            || ! Schema::hasTable('knowledge_base_faqs')
        ) {
            return redirect()
                ->route('superadmin.knowledge-base-cms')
                ->with('error', 'Run the latest migrations to enable Knowledge Base CMS.');
        }

        $validated = $request->validate([
            'title' => ['required', 'string', 'max:255'],
            'subtitle' => ['required', 'string', 'max:1000'],
            'search_placeholder' => ['required', 'string', 'max:255'],
            'documentation_title' => ['required', 'string', 'max:255'],
            'documentation_subtitle' => ['required', 'string', 'max:1000'],
            'faq_title' => ['required', 'string', 'max:255'],
            'faq_subtitle' => ['required', 'string', 'max:1000'],
            'modules' => ['required', 'array', 'min:1'],
            'modules.*.id' => ['nullable', 'string', 'max:255'],
            'modules.*.title' => ['required', 'string', 'max:255'],
            'modules.*.summary' => ['nullable', 'string', 'max:2000'],
            'modules.*.content' => ['required', 'string', 'max:50000'],
            'faqs' => ['required', 'array', 'min:1'],
            'faqs.*.id' => ['nullable', 'string', 'max:255'],
            'faqs.*.question' => ['required', 'string', 'max:255'],
            'faqs.*.answer' => ['required', 'string', 'max:20000'],
        ]);

        $this->knowledgeBaseService->save($validated);

        return redirect()
            ->route('superadmin.knowledge-base-cms')
            ->with('success', 'Knowledge base content updated successfully.');
    }

    private function getOrganizationsPayload()
    {
        return Organization::query()
            ->withCount(['users', 'students'])
            ->orderBy('name')
            ->get()
            ->map(function (Organization $organization) {
                $adminUser = User::query()
                    ->where('organization_id', $organization->id)
                    ->where('role', 'admin')
                    ->orderBy('id')
                    ->first();

                return [
                    'id' => $organization->id,
                    'name' => $organization->name,
                    'slug' => $organization->slug,
                    'email' => $organization->email,
                    'phone' => $organization->phone,
                    'address' => $organization->address,
                    'city' => $organization->city,
                    'state' => $organization->state,
                    'country' => $organization->country,
                    'pincode' => $organization->pincode,
                    'website' => $organization->website,
                    'logo' => $organization->logo,
                    'type' => $organization->type,
                    'subscription_plan' => $organization->subscription_plan,
                    'subscription_status' => $organization->status,
                    'subscription_start_date' => optional($organization->subscription_start_date)->toDateString(),
                    'subscription_end_date' => optional($organization->subscription_end_date)->toDateString(),
                    'max_students' => $organization->max_students,
                    'created_at' => optional($organization->created_at)->toDateString(),
                    'settings' => $organization->settings,
                    'admin_user' => $adminUser ? [
                        'id' => $adminUser->id,
                        'name' => $adminUser->name,
                        'email' => $adminUser->email,
                        'status' => $adminUser->status,
                    ] : null,
                    'stats' => [
                        'total_users' => $organization->users_count,
                        'total_students' => $organization->students_count,
                    ],
                ];
            })
            ->values();
    }

    private function buildAdminDashboardStats(Organization $organization, User $user, ?AcademicYear $activeAcademicYear): array
    {
        $today = now()->toDateString();
        $activeAcademicYearId = $activeAcademicYear?->id;

        $studentEnrollments = $this->studentAcademicHistoryService
            ->getSessionEnrollments($organization->id, $activeAcademicYearId);
        $currentSessionStudentIds = $studentEnrollments
            ->pluck('student_id')
            ->map(fn ($studentId) => (int) $studentId)
            ->all();

        $students = $studentEnrollments
            ->map(function (StudentAcademicHistory $history) {
                $student = $history->student;

                if (! $student) {
                    return null;
                }

                return [
                    'student' => $student,
                    'history' => $history,
                ];
            })
            ->filter()
            ->values();

        $studentFees = StudentFee::query()
            ->where('organization_id', $organization->id)
            ->when($activeAcademicYearId, fn ($query) => $query->where('academic_year_id', $activeAcademicYearId))
            ->where(function ($query) {
                $query
                    ->whereNotNull('transport_assignment_id')
                    ->orWhereDoesntHave('feeStructure', fn ($feeStructureQuery) => $feeStructureQuery->where('fee_type', 'like', self::TRANSPORT_FEE_PREFIX . '%'));
            })
            ->get();

        $libraryBooks = LibraryBook::query()
            ->where('organization_id', $organization->id)
            ->get();

        $todayAttendance = Attendance::query()
            ->where('organization_id', $organization->id)
            ->whereDate('date', $today)
            ->when(
                $activeAcademicYearId,
                fn ($query) => $query->whereHas(
                    'schoolClass',
                    fn ($classQuery) => $classQuery->where('academic_year_id', $activeAcademicYearId)
                ),
                fn ($query) => $query->whereRaw('1 = 0')
            )
            ->get();

        $presentToday = $todayAttendance->whereIn('status', ['present', 'late'])->count();
        $recentAdmissions = $students
            ->sortByDesc(fn (array $entry) => optional($entry['student']->admission_date)->timestamp ?? 0)
            ->take(4)
            ->values();

        $studentsById = $students->keyBy(fn (array $entry) => $entry['student']->id);
        $followUps = $studentFees
            ->filter(fn (StudentFee $fee) => (float) $fee->balance > 0)
            ->sortBy([
                fn (StudentFee $fee) => optional($fee->due_date)->timestamp ?? PHP_INT_MAX,
                fn (StudentFee $fee) => -1 * (float) $fee->balance,
            ])
            ->take(5)
            ->values();

        $libraryAlerts = LibraryCirculation::query()
            ->where('organization_id', $organization->id)
            ->whereIn('status', ['issued', 'overdue'])
            ->when(
                ! empty($currentSessionStudentIds),
                fn ($query) => $query->whereHas(
                    'member',
                    fn ($memberQuery) => $memberQuery->whereIn('student_id', $currentSessionStudentIds)
                ),
                fn ($query) => $query->whereRaw('1 = 0')
            )
            ->with(['book:id,title', 'member.student:id,first_name,last_name'])
            ->orderByRaw("case when status = 'overdue' then 0 else 1 end")
            ->orderBy('due_date')
            ->limit(4)
            ->get();

        $upcomingExams = ExamSchedule::query()
            ->whereHas('exam', fn ($query) => $query
                ->where('organization_id', $organization->id)
                ->when($activeAcademicYearId, fn ($examQuery) => $examQuery->where('academic_year_id', $activeAcademicYearId)))
            ->whereDate('exam_date', '>=', $today)
            ->with(['exam:id,name,name_mr,name_hi,organization_id', 'subject:id,name,name_mr,name_hi', 'schoolClass:id,name,section'])
            ->orderBy('exam_date')
            ->orderBy('start_time')
            ->limit(4)
            ->get();

        $classes = SchoolClass::query()
            ->where('organization_id', $organization->id)
            ->when($activeAcademicYearId, fn ($query) => $query->where('academic_year_id', $activeAcademicYearId))
            ->get();
        $enrollmentByClass = $students->groupBy(fn (array $entry) => $entry['history']->class_id);

        $averageOccupancy = $classes->count() > 0
            ? round($classes->avg(function (SchoolClass $class) use ($enrollmentByClass) {
                $capacity = (int) ($class->capacity ?? 0);
                $enrolled = $enrollmentByClass->get($class->id)?->count() ?? 0;

                if ($capacity <= 0) {
                    return 0;
                }

                return ($enrolled / $capacity) * 100;
            }), 2)
            : 0;

        $feeTotal = (float) $studentFees->sum('net_amount');
        $feeCollected = (float) $studentFees->sum('paid_amount');
        $feePending = (float) $studentFees->sum('balance');

        return [
            'students' => [
                'total' => $students->count(),
                'active' => $students->filter(fn (array $entry) => ($entry['history']->status ?: $entry['student']->status) === 'active')->count(),
                'recentAdmissions' => $recentAdmissions->map(fn (array $entry) => [
                    'id' => (string) $entry['student']->id,
                    'name' => trim($entry['student']->first_name . ' ' . $entry['student']->last_name),
                    'className' => $entry['history']->schoolClass?->name ?? '-',
                    'section' => $entry['history']->schoolClass?->section ?? '-',
                    'admissionDate' => optional($entry['student']->admission_date)->format('Y-m-d') ?? 'N/A',
                ])->all(),
            ],
            'fees' => [
                'total' => $feeTotal,
                'collected' => $feeCollected,
                'pending' => $feePending,
                'collectionRate' => $feeTotal > 0 ? round(($feeCollected / $feeTotal) * 100, 2) : 0,
                'pendingCount' => $studentFees->filter(fn (StudentFee $fee) => (float) $fee->balance > 0)->count(),
                'followUps' => $followUps->map(function (StudentFee $fee) use ($studentsById) {
                    $entry = $studentsById->get($fee->student_id);

                    return [
                        'id' => (string) $fee->id,
                        'studentName' => $entry ? trim($entry['student']->first_name . ' ' . $entry['student']->last_name) : 'Unknown Student',
                        'className' => $entry ? ($entry['history']->schoolClass?->name ?? '-') : '-',
                        'section' => $entry ? ($entry['history']->schoolClass?->section ?? '-') : '-',
                        'dueAmount' => (float) $fee->balance,
                        'dueDate' => optional($fee->due_date)->format('Y-m-d') ?? 'N/A',
                        'status' => $fee->status ?? 'pending',
                    ];
                })->all(),
            ],
            'library' => [
                'total_books' => $libraryBooks->count(),
                'issued' => LibraryCirculation::query()
                    ->where('organization_id', $organization->id)
                    ->whereIn('status', ['issued', 'overdue'])
                    ->when(
                        ! empty($currentSessionStudentIds),
                        fn ($query) => $query->whereHas(
                            'member',
                            fn ($memberQuery) => $memberQuery->whereIn('student_id', $currentSessionStudentIds)
                        ),
                        fn ($query) => $query->whereRaw('1 = 0')
                    )
                    ->count(),
                'overdue' => LibraryCirculation::query()
                    ->where('organization_id', $organization->id)
                    ->where('status', 'overdue')
                    ->when(
                        ! empty($currentSessionStudentIds),
                        fn ($query) => $query->whereHas(
                            'member',
                            fn ($memberQuery) => $memberQuery->whereIn('student_id', $currentSessionStudentIds)
                        ),
                        fn ($query) => $query->whereRaw('1 = 0')
                    )
                    ->count(),
                'available' => (int) $libraryBooks->sum('available_copies'),
                'alerts' => $libraryAlerts->map(fn (LibraryCirculation $circulation) => [
                    'id' => (string) $circulation->id,
                    'studentName' => trim(($circulation->member?->student?->first_name ?? 'Unknown') . ' ' . ($circulation->member?->student?->last_name ?? 'Student')),
                    'bookTitle' => $circulation->book?->title ?? 'Unknown Book',
                    'dueDate' => optional($circulation->due_date)->format('Y-m-d') ?? 'N/A',
                    'status' => $circulation->status,
                ])->all(),
            ],
            'attendance' => [
                'today' => $presentToday,
                'total_today' => $todayAttendance->count(),
                'percentage' => $todayAttendance->count() > 0
                    ? number_format(($presentToday / $todayAttendance->count()) * 100, 2, '.', '')
                    : '0.00',
                'absent_today' => $todayAttendance->where('status', 'absent')->count(),
            ],
            'classes' => [
                'total' => $classes->count(),
                'averageOccupancy' => $averageOccupancy,
            ],
            'exams' => [
                'total' => Exam::query()
                    ->where('organization_id', $organization->id)
                    ->when($activeAcademicYearId, fn ($query) => $query->where('academic_year_id', $activeAcademicYearId))
                    ->count(),
                'upcoming' => $upcomingExams->map(fn (ExamSchedule $schedule) => [
                    'id' => (string) $schedule->id,
                    'name' => $schedule->exam?->name ?? 'Exam',
                    'subject' => $schedule->subject?->localized('name') ?? 'Subject',
                    'className' => $schedule->schoolClass?->name ?? '-',
                    'section' => $schedule->schoolClass?->section ?? '-',
                    'examDate' => optional($schedule->exam_date)->format('Y-m-d') ?? 'N/A',
                    'startTime' => $schedule->start_time ? Carbon::parse($schedule->start_time)->format('h:i A') : 'TBA',
                ])->all(),
            ],
            'staff' => [
                'active' => User::query()
                    ->where('organization_id', $organization->id)
                    ->whereNotIn('role', ['student', 'parent'])
                    ->where('status', 'active')
                    ->count(),
                'inactive' => User::query()
                    ->where('organization_id', $organization->id)
                    ->whereNotIn('role', ['student', 'parent'])
                    ->where('status', 'inactive')
                    ->count(),
            ],
            'communication' => [
                'unread' => MessageRecipient::query()
                    ->where('recipient_id', $user->id)
                    ->where('is_read', false)
                    ->count(),
            ],
        ];
    }

    private function buildStudentDashboardStats(Organization $organization, ?Student $student, ?StudentAcademicHistory $studentEnrollment, User $user): array
    {
        if (! $student) {
            return [
                'overview' => [
                    'attendancePercentage' => '0.00',
                    'pendingFees' => 0,
                    'certificateCount' => 0,
                    'homeworkPending' => 0,
                    'upcomingExamCount' => 0,
                    'unreadMessages' => 0,
                ],
                'attendance' => [
                    'present' => 0,
                    'total' => 0,
                    'absent' => 0,
                    'late' => 0,
                    'percentage' => '0.00',
                ],
                'fees' => [
                    'pending' => 0,
                    'paid' => 0,
                    'pendingCount' => 0,
                ],
                'homework' => [
                    'pendingCount' => 0,
                    'items' => [],
                ],
                'exams' => [
                    'upcoming' => [],
                ],
                'library' => [
                    'issued' => 0,
                    'overdue' => 0,
                    'items' => [],
                ],
            ];
        }

        $attendanceRecords = Attendance::query()
            ->where('organization_id', $organization->id)
            ->where('student_id', $student->id)
            ->when($studentEnrollment?->class_id, fn ($query) => $query->where('class_id', $studentEnrollment->class_id))
            ->get();
        $attendancePresent = $attendanceRecords->whereIn('status', ['present', 'late'])->count();

        $activeAcademicYearId = $studentEnrollment?->academic_year_id ?: $this->studentAcademicHistoryService->getActiveAcademicYear($organization->id)?->id;

        $studentFees = StudentFee::query()
            ->where('organization_id', $organization->id)
            ->where('student_id', $student->id)
            ->when($activeAcademicYearId, fn ($query) => $query->where('academic_year_id', $activeAcademicYearId))
            ->where(function ($query) {
                $query
                    ->whereNotNull('transport_assignment_id')
                    ->orWhereDoesntHave('feeStructure', fn ($feeStructureQuery) => $feeStructureQuery->where('fee_type', 'like', self::TRANSPORT_FEE_PREFIX . '%'));
            })
            ->get();

        $homeworkItems = Homework::query()
            ->where('organization_id', $organization->id)
            ->when($studentEnrollment?->class_id, fn ($query) => $query->where('class_id', $studentEnrollment->class_id))
            ->with(['subject:id,name,name_mr,name_hi', 'teacher:id,name'])
            ->orderBy('due_date')
            ->limit(6)
            ->get();
        $submittedHomeworkIds = HomeworkSubmission::query()
            ->where('student_id', $student->id)
            ->pluck('homework_id')
            ->all();

        $upcomingExams = OnlineExam::query()
            ->where('organization_id', $organization->id)
            ->where('class_name', $studentEnrollment?->schoolClass?->name)
            ->where('section', $studentEnrollment?->schoolClass?->section)
            ->where('end_time', '>=', now())
            ->orderBy('start_time')
            ->limit(4)
            ->get();

        $libraryMember = LibraryMember::query()
            ->where('organization_id', $organization->id)
            ->where('student_id', $student->id)
            ->first();
        $libraryItems = $libraryMember
            ? LibraryCirculation::query()
                ->where('library_member_id', $libraryMember->id)
                ->whereIn('status', ['issued', 'overdue'])
                ->with('book:id,title')
                ->orderByRaw("case when status = 'overdue' then 0 else 1 end")
                ->orderBy('due_date')
                ->limit(4)
                ->get()
            : collect();

        $issuedCertificateCount = IssuedCertificate::query()
            ->where('organization_id', $organization->id)
            ->where('student_id', $student->id)
            ->count();
        $unreadMessages = MessageRecipient::query()
            ->where('recipient_id', $user->id)
            ->where('is_read', false)
            ->count();

        $pendingHomeworkCount = $homeworkItems
            ->filter(fn (Homework $homework) => ! in_array($homework->id, $submittedHomeworkIds, true))
            ->count();

        return [
            'overview' => [
                'attendancePercentage' => $attendanceRecords->count() > 0
                    ? number_format(($attendancePresent / $attendanceRecords->count()) * 100, 2, '.', '')
                    : '0.00',
                'pendingFees' => (float) $studentFees->sum('balance'),
                'certificateCount' => $issuedCertificateCount,
                'homeworkPending' => $pendingHomeworkCount,
                'upcomingExamCount' => $upcomingExams->count(),
                'unreadMessages' => $unreadMessages,
            ],
            'attendance' => [
                'present' => $attendancePresent,
                'total' => $attendanceRecords->count(),
                'absent' => $attendanceRecords->where('status', 'absent')->count(),
                'late' => $attendanceRecords->where('status', 'late')->count(),
                'percentage' => $attendanceRecords->count() > 0
                    ? number_format(($attendancePresent / $attendanceRecords->count()) * 100, 2, '.', '')
                    : '0.00',
            ],
            'fees' => [
                'pending' => (float) $studentFees->sum('balance'),
                'paid' => (float) $studentFees->sum('paid_amount'),
                'pendingCount' => $studentFees->filter(fn (StudentFee $fee) => (float) $fee->balance > 0)->count(),
            ],
            'homework' => [
                'pendingCount' => $pendingHomeworkCount,
                'items' => $homeworkItems->map(fn (Homework $homework) => [
                    'id' => (string) $homework->id,
                    'title' => $homework->title,
                    'subject' => $homework->subject?->localized('name') ?? 'Subject',
                    'teacher' => $homework->teacher?->name ?? 'Teacher',
                    'dueDate' => optional($homework->due_date)->format('Y-m-d') ?? 'N/A',
                    'status' => in_array($homework->id, $submittedHomeworkIds, true) ? 'submitted' : 'pending',
                ])->all(),
            ],
            'exams' => [
                'upcoming' => $upcomingExams->map(fn (OnlineExam $exam) => [
                    'id' => (string) $exam->id,
                    'title' => $exam->localized('title'),
                    'subject' => $exam->localized('subject') ?? '',
                    'startTime' => optional($exam->start_time)?->format('Y-m-d h:i A') ?? 'TBA',
                    'endTime' => optional($exam->end_time)?->format('Y-m-d h:i A') ?? 'TBA',
                    'duration' => $exam->duration,
                ])->all(),
            ],
            'library' => [
                'issued' => $libraryItems->count(),
                'overdue' => $libraryItems->where('status', 'overdue')->count(),
                'items' => $libraryItems->map(fn (LibraryCirculation $circulation) => [
                    'id' => (string) $circulation->id,
                    'title' => $circulation->book?->title ?? 'Library Book',
                    'dueDate' => optional($circulation->due_date)->format('Y-m-d') ?? 'N/A',
                    'status' => $circulation->status,
                ])->all(),
            ],
        ];
    }

    private function getDashboardNotices(Organization $organization, User $user): array
    {
        $query = Message::query()
            ->where('organization_id', $organization->id)
            ->where('is_announcement', true)
            ->latest();

        if ($user->role === 'student') {
            $query->whereHas('recipients', fn ($recipientQuery) => $recipientQuery->where('recipient_id', $user->id));
        }

        $notices = $query
            ->limit(4)
            ->get()
            ->map(function (Message $message) {
                $noticeMeta = is_array($message->attachments['notice_board'] ?? null)
                    ? $message->attachments['notice_board']
                    : [];

                return [
                    'id' => (string) $message->id,
                    'title' => $message->subject,
                    'audience' => $noticeMeta['audience_label'] ?? 'School Community',
                    'publishedOn' => optional($message->created_at)->format('d M Y') ?? now()->format('d M Y'),
                    'pinned' => $message->priority === 'high',
                    'description' => Str::limit(strip_tags($message->message), 180),
                ];
            })
            ->all();

        if ($user->role === 'student') {
            return $notices;
        }

        if (count($notices) > 0) {
            return $notices;
        }

        return $this->defaultDashboardNotices($organization, $user);
    }

    private function getUpcomingEvents(Organization $organization): array
    {
        return SchoolEvent::query()
            ->where('organization_id', $organization->id)
            ->whereDate('end_date', '>=', now()->toDateString())
            ->orderBy('start_date')
            ->limit(5)
            ->get()
            ->map(fn (SchoolEvent $event) => [
                'id' => (string) $event->id,
                'title' => $event->localized('title'),
                'type' => $event->type,
                'startDate' => $event->start_date->format('Y-m-d'),
                'endDate' => optional($event->end_date)->format('Y-m-d'),
                'isHoliday' => (bool) $event->is_holiday,
            ])
            ->all();
    }

    private function defaultDashboardNotices(Organization $organization, User $user): array
    {
        $audience = $user->role === 'student' ? 'Students' : 'School Community';

        return [
            [
                'id' => 'default-notice-1',
                'title' => 'Welcome to ' . $organization->name,
                'audience' => $audience,
                'publishedOn' => now()->format('d M Y'),
                'pinned' => true,
                'description' => 'Your notice board is active. Published school announcements will appear here automatically once they are created.',
            ],
            [
                'id' => 'default-notice-2',
                'title' => 'Dashboard Notice Board Ready',
                'audience' => $audience,
                'publishedOn' => now()->subDay()->format('d M Y'),
                'pinned' => false,
                'description' => 'Admins can create announcements from Communication and students will see the latest updates here on their dashboard.',
            ],
        ];
    }

    private function resolveChildrenForUser(User $user, Organization $organization): array
    {
        return Student::query()
            ->where('organization_id', $organization->id)
            ->where(function ($query) use ($user) {
                $query
                    ->where('user_id', $user->id)
                    ->orWhere('email', $user->email)
                    ->orWhere('father_email', $user->email)
                    ->orWhere('mother_email', $user->email)
                    ->orWhere('guardian_email', $user->email);
            })
            ->with('schoolClass:id,name,section')
            ->orderBy('id')
            ->get()
            ->map(fn (Student $child) => [
                'id' => (string) $child->id,
                'name' => trim($child->first_name.' '.$child->last_name),
                'className' => $child->schoolClass?->name ?? '-',
                'section' => $child->schoolClass?->section ?? '-',
            ])
            ->values()
            ->all();
    }

    private function selectChildStudent(array $studentChildren, int $requestedId): ?Student
    {
        if (empty($studentChildren)) {
            return null;
        }

        foreach ($studentChildren as $child) {
            if ((int) $child['id'] === $requestedId) {
                $student = Student::query()->with('schoolClass:id,name,section')->find($requestedId);

                return $student ?: null;
            }
        }

        $student = Student::query()->with('schoolClass:id,name,section')->find((int) $studentChildren[0]['id']);

        return $student ?: null;
    }

    private function serializeStudent(Student $student, ?StudentAcademicHistory $studentEnrollment = null): array
    {
        return [
            'id' => (string) $student->id,
            'name' => trim($student->first_name . ' ' . $student->last_name),
            'admissionNo' => $student->admission_no,
            'rollNumber' => $studentEnrollment?->roll_number ?: $student->roll_number,
            'className' => $studentEnrollment?->schoolClass?->name ?? $student->schoolClass?->name ?? '-',
            'section' => $studentEnrollment?->schoolClass?->section ?? $student->schoolClass?->section ?? '-',
            'courseName' => $student->course?->name,
            'batchName' => $student->batch?->name,
        ];
    }

    private function getSmtpSettingsPayload(): array
    {
        if (! Schema::hasTable('super_admin_settings')) {
            return [
                'mailer' => 'smtp',
                'smtp_host' => '',
                'smtp_port' => '587',
                'smtp_username' => '',
                'smtp_password' => '',
                'smtp_encryption' => 'tls',
                'from_name' => 'Gurukul ERP',
                'from_email' => '',
                'reply_to_email' => '',
                'is_active' => true,
            ];
        }

        $settings = SuperAdminSetting::query()->first();

        if ($settings) {
            $this->applySmtpSettings($settings);
        }

        return [
            'mailer' => $settings?->mailer ?? 'smtp',
            'smtp_host' => $settings?->smtp_host ?? '',
            'smtp_port' => $settings?->smtp_port ? (string) $settings->smtp_port : '587',
            'smtp_username' => $settings?->smtp_username ?? '',
            'smtp_password' => $settings?->smtp_password ?? '',
            'smtp_encryption' => $settings?->smtp_encryption ?? 'tls',
            'from_name' => $settings?->from_name ?? 'Gurukul ERP',
            'from_email' => $settings?->from_email ?? '',
            'reply_to_email' => $settings?->reply_to_email ?? '',
            'is_active' => $settings?->is_active ?? true,
        ];
    }

    private function getKnowledgeBaseContentPayload(): array
    {
        return $this->knowledgeBaseService->content();
    }

    private function applySmtpSettings(SuperAdminSetting $settings): void
    {
        if (! $settings->is_active) {
            return;
        }

        Config::set('mail.default', $settings->mailer);
        Config::set('mail.mailers.smtp.transport', 'smtp');
        Config::set('mail.mailers.smtp.host', $settings->smtp_host);
        Config::set('mail.mailers.smtp.port', $settings->smtp_port);
        Config::set('mail.mailers.smtp.username', $settings->smtp_username);
        Config::set('mail.mailers.smtp.password', $settings->smtp_password);
        Config::set('mail.mailers.smtp.encryption', $settings->smtp_encryption);
        Config::set('mail.from.address', $settings->from_email);
        Config::set('mail.from.name', $settings->from_name);
    }
}
