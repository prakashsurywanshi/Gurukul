<?php

namespace App\Http\Controllers;

use App\Models\AcademicYear;
use App\Models\BiometricLog;
use App\Models\ClassworkEntry;
use App\Models\ExpenseEntry;
use App\Models\FeePayment;
use App\Models\FestivalGreeting;
use App\Models\IncomeEntry;
use App\Models\Inspection;
use App\Models\Organization;
use App\Models\SchoolClass;
use App\Models\Student;
use App\Models\StudentAcademicHistory;
use App\Models\StudentFee;
use App\Models\Subject;
use App\Models\SupportTicket;
use App\Models\SupportTicketReply;
use App\Models\User;
use Illuminate\Http\RedirectResponse;
use Illuminate\Http\Request;
use Illuminate\Validation\Rule;
use Inertia\Inertia;
use Inertia\Response;

class DashboardExtrasController extends Controller
{
    public function contactSupport(Request $request): Response
    {
        $user = $request->user();
        $organization = $this->resolveOrganizationForUser($user);

        $query = SupportTicket::query()
            ->where('organization_id', $organization?->id)
            ->with(['creator:id,name', 'student:id,first_name,last_name,admission_no', 'replies' => fn ($q) => $q->with('user:id,name')->orderBy('created_at')]);

        if (! in_array($user->role, ['super_admin', 'admin'], true)) {
            $query->where('created_by', $user->id);
        }

        return Inertia::render('dashboard/ContactSupport', [
            'user' => $user,
            'organization' => $organization ? $this->serializeOrganization($organization) : null,
            'tickets' => $query->orderByDesc('created_at')->limit(100)->get()
                ->map(fn (SupportTicket $ticket) => $this->serializeSupportTicket($ticket))
                ->all(),
        ]);
    }

    public function storeSupportTicket(Request $request): RedirectResponse
    {
        $organization = $this->resolveOrganizationForUser($request->user());
        abort_unless($organization, 403);

        $validated = $request->validate([
            'subject' => ['required', 'string', 'max:255'],
            'department' => ['required', 'string', Rule::in(['academics', 'fees', 'transport', 'hostel', 'library', 'other'])],
            'priority' => ['required', 'string', Rule::in(['low', 'medium', 'high'])],
            'message' => ['required', 'string', 'max:2000'],
            'student_id' => ['nullable', 'integer', 'exists:students,id'],
        ]);

        $ticket = SupportTicket::query()->create([
            'organization_id' => $organization->id,
            'student_id' => $validated['student_id'] ?? null,
            'subject' => $validated['subject'],
            'department' => $validated['department'],
            'priority' => $validated['priority'],
            'status' => 'open',
            'created_by' => $request->user()->id,
        ]);

        SupportTicketReply::query()->create([
            'organization_id' => $organization->id,
            'ticket_id' => $ticket->id,
            'user_id' => $request->user()->id,
            'message' => $validated['message'],
        ]);

        return back()->with('success', 'Support ticket submitted.');
    }

    public function replySupportTicket(Request $request, SupportTicket $ticket): RedirectResponse
    {
        $organization = $this->resolveOrganizationForUser($request->user());
        abort_unless($organization && $ticket->organization_id === $organization->id, 403);

        $validated = $request->validate([
            'message' => ['required', 'string', 'max:2000'],
        ]);

        SupportTicketReply::query()->create([
            'organization_id' => $organization->id,
            'ticket_id' => $ticket->id,
            'user_id' => $request->user()->id,
            'message' => $validated['message'],
        ]);

        if (! in_array($ticket->status, ['resolved', 'closed'], true)) {
            $ticket->update([
                'status' => 'in_progress',
                'assigned_to' => in_array($request->user()->role, ['super_admin', 'admin'], true) ? $request->user()->id : $ticket->assigned_to,
            ]);
        }

        return back()->with('success', 'Reply added.');
    }

    public function updateSupportTicket(Request $request, SupportTicket $ticket): RedirectResponse
    {
        $organization = $this->resolveOrganizationForUser($request->user());
        abort_unless($organization && $ticket->organization_id === $organization->id, 403);

        $validated = $request->validate([
            'status' => ['required', 'string', Rule::in(['open', 'in_progress', 'resolved', 'closed'])],
        ]);

        $ticket->update(array_merge($validated, [
            'resolved_at' => in_array($validated['status'], ['resolved', 'closed'], true) ? now() : null,
        ]));

        return back()->with('success', 'Ticket updated.');
    }

    private function serializeSupportTicket(SupportTicket $ticket): array
    {
        return [
            'id' => (string) $ticket->id,
            'subject' => $ticket->subject,
            'department' => $ticket->department,
            'priority' => $ticket->priority,
            'status' => $ticket->status,
            'created_by' => $ticket->creator?->name ?? 'Unknown',
            'created_at' => $ticket->created_at?->toDateTimeString(),
            'resolved_at' => optional($ticket->resolved_at)->toDateTimeString(),
            'student' => $ticket->student
                ? ['id' => (string) $ticket->student->id, 'name' => "{$ticket->student->first_name} {$ticket->student->last_name}"]
                : null,
            'replies' => $ticket->replies->map(fn (SupportTicketReply $reply) => [
                'id' => (string) $reply->id,
                'message' => $reply->message,
                'user' => $reply->user?->name ?? 'Unknown',
                'created_at' => $reply->created_at?->toDateTimeString(),
            ])->values(),
        ];
    }

    public function allTransactions(Request $request): Response
    {
        $user = $request->user();
        $organization = $this->resolveOrganizationForUser($user);

        $type = $request->query('type') ?: 'all';
        $from = $request->query('from');
        $to = $request->query('to');
        $q = trim((string) $request->query('q'));

        $rows = [];
        if ($organization) {
            $rows = $this->buildTransactionRows($organization, $type, $from, $to, $q);
        }

        $income = collect($rows)->where('type', 'income')->sum('amount');
        $expense = collect($rows)->where('type', 'expense')->sum('amount');
        $fees = collect($rows)->where('type', 'fee')->sum('amount');

        return Inertia::render('dashboard/AllTransactions', [
            'user' => $user,
            'organization' => $organization ? $this->serializeOrganization($organization) : null,
            'transactions' => $rows,
            'summary' => [
                'income' => $income,
                'expenses' => abs($expense),
                'fees' => $fees,
                'net' => $income + $fees + $expense,
            ],
        ]);
    }

    private function buildTransactionRows(Organization $organization, string $type, ?string $from, ?string $to, string $q): array
    {
        $fromDate = $from ?: null;
        $toDate = $to ?: null;

        $income = IncomeEntry::query()
            ->where('organization_id', $organization->id)
            ->when($fromDate, fn ($query) => $query->whereDate('date', '>=', $fromDate))
            ->when($toDate, fn ($query) => $query->whereDate('date', '<=', $toDate))
            ->when(in_array($type, ['all', 'income'], true), fn ($query) => $query)
            ->when($type === 'expense', fn ($query) => $query->whereRaw('1 = 0'))
            ->when($type === 'fee', fn ($query) => $query->whereRaw('1 = 0'))
            ->get()
            ->map(fn (IncomeEntry $entry) => [
                'id' => 'inc-'.$entry->id,
                'type' => 'income',
                'date' => $entry->date?->format('Y-m-d'),
                'title' => $entry->title,
                'category' => $entry->category ?? '-',
                'amount' => (float) $entry->amount,
                'method' => $entry->payment_mode ?? '-',
                'reference' => $entry->reference_no ?? '-',
                'student' => null,
            ]);

        $expenses = ExpenseEntry::query()
            ->where('organization_id', $organization->id)
            ->when($fromDate, fn ($query) => $query->whereDate('date', '>=', $fromDate))
            ->when($toDate, fn ($query) => $query->whereDate('date', '<=', $toDate))
            ->when($type === 'income', fn ($query) => $query->whereRaw('1 = 0'))
            ->when($type === 'fee', fn ($query) => $query->whereRaw('1 = 0'))
            ->get()
            ->map(fn (ExpenseEntry $entry) => [
                'id' => 'exp-'.$entry->id,
                'type' => 'expense',
                'date' => $entry->date?->format('Y-m-d'),
                'title' => $entry->title,
                'category' => $entry->category ?? '-',
                'amount' => -1 * (float) $entry->amount,
                'method' => $entry->payment_mode ?? '-',
                'reference' => $entry->voucher_no ?? '-',
                'student' => null,
            ]);

        $feeRows = collect();
        if ($type === 'all' || $type === 'fee') {
            $feeRows = FeePayment::query()
                ->where('organization_id', $organization->id)
                ->where('status', '!=', 'refunded')
                ->when($fromDate, fn ($query) => $query->whereDate('payment_date', '>=', $fromDate))
                ->when($toDate, fn ($query) => $query->whereDate('payment_date', '<=', $toDate))
                ->with('student:id,first_name,last_name,admission_no')
                ->get()
                ->map(fn (FeePayment $payment) => [
                    'id' => 'fee-'.$payment->id,
                    'type' => 'fee',
                    'date' => $payment->payment_date?->format('Y-m-d'),
                    'title' => 'Fee Payment',
                    'category' => $payment->payment_method ?? 'Fee',
                    'amount' => (float) $payment->amount,
                    'method' => $payment->payment_method ?? '-',
                    'reference' => $payment->transaction_id ?? '-',
                    'student' => $payment->student
                        ? "{$payment->student->first_name} {$payment->student->last_name}"
                        : null,
                ]);
        }

        $rows = $income
            ->concat($expenses)
            ->concat($feeRows)
            ->filter(fn (array $row) => ! $q || str_contains(strtolower(implode(' ', [$row['title'], $row['category'], $row['reference'], (string) $row['student']])), strtolower($q)))
            ->sortByDesc('date')
            ->values();

        return $rows->take(300)->all();
    }

    public function dataValidator(Request $request): Response
    {
        $user = $request->user();
        $organization = $this->resolveOrganizationForUser($user);
        $checks = $organization ? $this->buildValidationChecks($organization) : [];

        return Inertia::render('dashboard/DataValidator', [
            'user' => $user,
            'organization' => $organization ? $this->serializeOrganization($organization) : null,
            'checks' => $checks,
        ]);
    }

    private function buildValidationChecks(Organization $organization): array
    {
        $activeYearId = AcademicYear::query()
            ->where('organization_id', $organization->id)
            ->where('is_current', true)
            ->value('id');

        $students = Student::query()
            ->where('organization_id', $organization->id)
            ->where('status', 'active')
            ->get(['id', 'first_name', 'last_name', 'admission_no', 'class_id', 'phone', 'email']);

        $missingContact = $students->filter(fn ($student) => blank($student->phone) && blank($student->email));
        $unassigned = $students->filter(fn ($student) => blank($student->class_id));

        $noEnrollment = $activeYearId
            ? $students->whereNotIn('id', StudentAcademicHistory::query()
                ->where('organization_id', $organization->id)
                ->where('academic_year_id', $activeYearId)
                ->pluck('student_id')
                ->all())
            : collect();

        $staffNoEmail = User::query()
            ->where('organization_id', $organization->id)
            ->whereIn('role', ['admin', 'teacher', 'accountant', 'receptionist', 'librarian'])
            ->where('status', 'active')
            ->where(fn ($query) => $query->whereNull('email')->orWhere('email', ''))
            ->get(['id', 'name', 'role']);

        $paidWithBalance = StudentFee::query()
            ->where('organization_id', $organization->id)
            ->where('status', 'paid')
            ->where('balance', '>', 0)
            ->with('student:id,first_name,last_name,admission_no')
            ->limit(5)
            ->get();

        return [
            $this->checkRow('missing_contact', 'Students missing contact details', 'warning', $missingContact->map(fn ($s) => $this->studentItem($s))->take(5)->values(), $missingContact->count()),
            $this->checkRow('no_enrollment', 'Students without active enrollment', 'warning', $noEnrollment->map(fn ($s) => $this->studentItem($s))->take(5)->values(), $noEnrollment->count()),
            $this->checkRow('unassigned', 'Students without a class assigned', 'warning', $unassigned->map(fn ($s) => $this->studentItem($s))->take(5)->values(), $unassigned->count()),
            $this->checkRow('staff_no_email', 'Staff without email', 'warning', $staffNoEmail->map(fn ($u) => ['id' => $u->id, 'label' => "{$u->name} ({$u->role})"])->take(5)->values(), $staffNoEmail->count()),
            $this->checkRow('paid_with_balance', 'Paid fees with outstanding balance', 'error', $paidWithBalance->map(fn (StudentFee $fee) => [
                'id' => (string) $fee->id,
                'label' => ($fee->student ? trim("{$fee->student->first_name} {$fee->student->last_name}") : 'Student').' ('.number_format($fee->balance).' outstanding)',
            ])->values(), StudentFee::query()->where('organization_id', $organization->id)->where('status', 'paid')->where('balance', '>', 0)->count()),
        ];
    }

    private function studentItem(Student $student): array
    {
        return [
            'id' => (string) $student->id,
            'label' => trim("{$student->first_name} {$student->last_name}").($student->admission_no ? " ({$student->admission_no})" : ''),
        ];
    }

    private function checkRow(string $id, string $title, string $severity, $items, int $count): array
    {
        return [
            'id' => $id,
            'title' => $title,
            'severity' => $severity,
            'count' => $count,
            'items' => $items,
        ];
    }

    public function inspections(Request $request): Response
    {
        $organization = $this->resolveOrganizationForUser($request->user());

        return Inertia::render('dashboard/Inspections', [
            'user' => $request->user(),
            'organization' => $organization ? $this->serializeOrganization($organization) : null,
            'inspections' => $organization
                ? Inspection::query()
                    ->where('organization_id', $organization->id)
                    ->with('creator:id,name')
                    ->orderByDesc('scheduled_date')
                    ->orderByDesc('id')
                    ->get()
                    ->map(fn (Inspection $inspection) => $this->serializeInspection($inspection))
                    ->all()
                : [],
        ]);
    }

    public function storeInspection(Request $request): RedirectResponse
    {
        $organization = $this->resolveOrganizationForUser($request->user());
        abort_unless($organization, 403);

        $validated = $request->validate([
            'title' => ['required', 'string', 'max:255'],
            'inspector_name' => ['nullable', 'string', 'max:255'],
            'inspection_type' => ['required', 'string', Rule::in(Inspection::TYPES)],
            'scheduled_date' => ['nullable', 'date'],
            'status' => ['required', 'string', Rule::in(['planned', 'in_progress', 'completed', 'cancelled'])],
            'score' => ['nullable', 'integer', 'between:1,10'],
            'findings' => ['nullable', 'string'],
        ]);

        Inspection::query()->create(array_merge($validated, [
            'organization_id' => $organization->id,
            'created_by' => $request->user()->id,
            'completed_at' => ($validated['status'] ?? null) === 'completed' ? now() : null,
        ]));

        return back()->with('success', 'Inspection scheduled.');
    }

    public function updateInspection(Request $request, Inspection $inspection): RedirectResponse
    {
        $organization = $this->resolveOrganizationForUser($request->user());
        abort_unless($organization && $inspection->organization_id === $organization->id, 403);

        $validated = $request->validate([
            'title' => ['required', 'string', 'max:255'],
            'inspector_name' => ['nullable', 'string', 'max:255'],
            'inspection_type' => ['required', 'string', Rule::in(Inspection::TYPES)],
            'scheduled_date' => ['nullable', 'date'],
            'status' => ['required', 'string', Rule::in(['planned', 'in_progress', 'completed', 'cancelled'])],
            'score' => ['nullable', 'integer', 'between:1,10'],
            'findings' => ['nullable', 'string'],
        ]);

        $inspection->update(array_merge($validated, [
            'completed_at' => ($validated['status'] ?? null) === 'completed'
                ? ($inspection->completed_at ?? now())
                : null,
        ]));

        return back()->with('success', 'Inspection updated.');
    }

    public function destroyInspection(Request $request, Inspection $inspection): RedirectResponse
    {
        $organization = $this->resolveOrganizationForUser($request->user());
        abort_unless($organization && $inspection->organization_id === $organization->id, 403);

        $inspection->delete();

        return back()->with('success', 'Inspection deleted.');
    }

    private function serializeInspection(Inspection $inspection): array
    {
        return [
            'id' => (string) $inspection->id,
            'title' => $inspection->title,
            'inspector_name' => $inspection->inspector_name,
            'inspection_type' => $inspection->inspection_type,
            'scheduled_date' => optional($inspection->scheduled_date)->format('Y-m-d'),
            'status' => $inspection->status,
            'score' => $inspection->score,
            'findings' => $inspection->findings,
            'completed_at' => optional($inspection->completed_at)->format('Y-m-d H:i:s'),
            'created_by' => $inspection->creator?->name,
            'created_at' => $inspection->created_at?->toDateTimeString(),
        ];
    }

    public function classworkLogbook(Request $request): Response
    {
        $user = $request->user();
        $organization = $this->resolveOrganizationForUser($user);
        $classFilter = $request->integer('class') ?: null;
        $dateFilter = $request->query('date');
        $typeFilter = $request->query('type');

        $entries = [];
        if ($organization) {
            $query = ClassworkEntry::query()
                ->where('organization_id', $organization->id)
                ->with(['creator:id,name', 'schoolClass:id,name,section', 'subject:id,name,name_hi,name_mr'])
                ->when($classFilter, fn ($q) => $q->where('class_id', $classFilter))
                ->when($dateFilter, fn ($q) => $q->whereDate('entry_date', $dateFilter))
                ->when($typeFilter && in_array($typeFilter, ClassworkEntry::TYPES, true), fn ($q) => $q->where('entry_type', $typeFilter))
                ->orderByDesc('entry_date')
                ->orderByDesc('id');

            $entries = $query->limit(200)->get()
                ->map(fn (ClassworkEntry $entry) => [
                    'id' => (string) $entry->id,
                    'entry_type' => $entry->entry_type,
                    'title' => $entry->title,
                    'description' => $entry->description,
                    'entry_date' => $entry->entry_date?->format('Y-m-d'),
                    'class' => $entry->schoolClass ? "{$entry->schoolClass->name}-{$entry->schoolClass->section}" : '-',
                    'class_id' => $entry->class_id,
                    'subject' => $entry->subject?->localized('name') ?: null,
                    'subject_id' => $entry->subject_id,
                    'created_by' => $entry->creator?->name,
                ])
                ->all();
        }

        return Inertia::render('dashboard/ClassworkLogbook', [
            'user' => $user,
            'organization' => $organization ? $this->serializeOrganization($organization) : null,
            'classRecords' => $organization ? $this->classRecords($organization) : [],
            'subjects' => $organization ? $this->subjectsForClasses($organization) : [],
            'entries' => $entries,
            'filters' => [
                'class' => $classFilter,
                'date' => $dateFilter,
                'type' => $typeFilter,
            ],
        ]);
    }

    public function storeClasswork(Request $request): RedirectResponse
    {
        $user = $request->user();
        $organization = $this->resolveOrganizationForUser($user);
        abort_unless($organization, 403);

        $validated = $request->validate([
            'entry_type' => ['required', 'string', Rule::in(ClassworkEntry::TYPES)],
            'title' => ['required', 'string', 'max:255'],
            'description' => ['nullable', 'string', 'max:5000'],
            'class_id' => ['required', 'integer', 'exists:classes,id'],
            'subject_id' => ['nullable', 'integer', 'exists:subjects,id'],
            'entry_date' => ['required', 'date'],
        ]);

        ClassworkEntry::query()->create(array_merge($validated, [
            'organization_id' => $organization->id,
            'created_by' => $user->id,
        ]));

        return back()->with('success', 'Entry added.');
    }

    public function updateClasswork(Request $request, ClassworkEntry $classworkEntry): RedirectResponse
    {
        $organization = $this->resolveOrganizationForUser($request->user());
        abort_unless($organization && $classworkEntry->organization_id === $organization->id, 403);

        $validated = $request->validate([
            'entry_type' => ['required', 'string', Rule::in(ClassworkEntry::TYPES)],
            'title' => ['required', 'string', 'max:255'],
            'description' => ['nullable', 'string', 'max:5000'],
            'class_id' => ['required', 'integer', 'exists:classes,id'],
            'subject_id' => ['nullable', 'integer', 'exists:subjects,id'],
            'entry_date' => ['required', 'date'],
        ]);

        $classworkEntry->update($validated);

        return back()->with('success', 'Entry updated.');
    }

    public function destroyClasswork(Request $request, ClassworkEntry $classworkEntry): RedirectResponse
    {
        $organization = $this->resolveOrganizationForUser($request->user());
        abort_unless($organization && $classworkEntry->organization_id === $organization->id, 403);

        $classworkEntry->delete();

        return back()->with('success', 'Entry deleted.');
    }

    private function classRecords(Organization $organization): array
    {
        return SchoolClass::query()
            ->forCurrentSession($organization->id)
            ->where('status', 'active')
            ->orderByRaw('CAST(name AS UNSIGNED), name')
            ->orderBy('section')
            ->get(['id', 'name', 'section'])
            ->map(fn (SchoolClass $schoolClass) => [
                'id' => $schoolClass->id,
                'name' => $schoolClass->name,
                'section' => $schoolClass->section,
            ])
            ->all();
    }

    private function subjectsForClasses(Organization $organization): array
    {
        return Subject::query()
            ->where('organization_id', $organization->id)
            ->whereHas('classes')
            ->orderBy('name')
            ->get(['id', 'name', 'name_hi', 'name_mr'])
            ->map(fn (Subject $subject) => [
                'id' => (string) $subject->id,
                'name' => $subject->localized('name'),
            ])
            ->all();
    }

    public function creatives(Request $request): Response
    {
        $organization = $this->resolveOrganizationForUser($request->user());

        return Inertia::render('dashboard/Creatives', [
            'user' => $request->user(),
            'festivals' => $organization
                ? FestivalGreeting::query()
                    ->where('organization_id', $organization->id)
                    ->orderByDesc('festival_date')
                    ->get()
                    ->map(fn (FestivalGreeting $greeting) => [
                        'id' => $greeting->id,
                        'title' => $greeting->title,
                        'message' => $greeting->message,
                        'festivalDate' => $greeting->festival_date?->toDateString(),
                        'status' => $greeting->status,
                        'sentCount' => $greeting->sent_count,
                    ])
                : [],
        ]);
    }

    public function agentLogs(Request $request): Response
    {
        $organization = $this->resolveOrganizationForUser($request->user());

        $logs = $organization
            ? BiometricLog::query()
                ->where('organization_id', $organization->id)
                ->with('device:id,name,location')
                ->latest('event_time')
                ->latest('id')
                ->take(200)
                ->get()
                ->map(fn (BiometricLog $log) => [
                    'id' => $log->id,
                    'logType' => $log->log_type,
                    'deviceName' => $log->device?->name ?? '—',
                    'deviceLocation' => $log->device?->location,
                    'personType' => $log->person_type,
                    'personName' => $log->person_name,
                    'uid' => $log->uid,
                    'direction' => $log->direction,
                    'matched' => $log->matched,
                    'action' => $log->action,
                    'details' => $log->details,
                    'eventTime' => $log->event_time?->toDateTimeString(),
                ])
                ->values()
            : collect();

        return Inertia::render('dashboard/AgentLogs', [
            'user' => $request->user(),
            'logs' => $logs,
            'total' => $logs->count(),
            'agentCount' => $logs->filter(fn ($log) => $log['logType'] === 'agent')->count(),
            'attendanceCount' => $logs->filter(fn ($log) => $log['logType'] === 'attendance')->count(),
            'faceCount' => $logs->filter(fn ($log) => $log['logType'] === 'face')->count(),
        ]);
    }

    private function resolveOrganizationForUser($user): ?Organization
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

    private function serializeOrganization(Organization $organization): array
    {
        return [
            'id' => $organization->id,
            'name' => $organization->name,
        ];
    }
}