<?php

namespace App\Http\Controllers;

use App\Jobs\DispatchQwaBroadcastJob;
use App\Models\Broadcast;
use App\Models\BroadcastRecipient;
use App\Models\Organization;
use App\Models\SchoolClass;
use App\Models\Student;
use App\Models\StudentFee;
use App\Models\User;
use App\Services\QwaAutoAlertService;
use App\Services\StaffPermissionService;
use App\Support\ContactPhoneResolver;
use Illuminate\Http\RedirectResponse;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\Auth;
use Illuminate\Validation\Rule;
use Throwable;

class BroadcastController extends Controller
{
    private const GROUPS = [
        'all_parents',
        'all_staff',
        'due_fees',
        'no_dues',
        'class_parents',
        'class_students',
        'specific_students',
        'specific_staff',
    ];

    private const STAFF_ROLES = ['admin', 'teacher', 'receptionist', 'accountant', 'librarian'];

    private const CHANNELS = ['email', 'sms', 'whatsapp', 'qwa_whatsapp', 'push'];

    private const PLACEHOLDERS = [
        // Core audience
        'recipient_name',
        'student_name',
        'parent_name',
        'admission_no',
        'class',
        'section',
        'school_name',
        'date',
        // Guardian / contacts
        'guardian_phone',
        'father_name',
        'father_phone',
        'mother_name',
        'mother_phone',
        'guardian_email',
        // Student identity
        'roll_no',
        'first_name',
        'last_name',
        'gender',
        'dob',
        'blood_group',
        'house',
        'current_address',
        // Class / teacher
        'class_teacher_name',
        'academic_year',
        // Fees
        'student_overall_balance_due',
        'due_date',
        // School / date
        'school_phone',
        'school_address',
        'current_date',
    ];

    public function __construct(
        private readonly StaffPermissionService $staffPermissionService,
        private readonly QwaAutoAlertService $qwaAutoAlertService,
    ) {
    }

    public function index(Request $request)
    {
        $user = Auth::user();
        $organization = $this->resolveOrganizationForUser($user);

        abort_unless($organization, 403);

        $broadcasts = Broadcast::query()
            ->where('organization_id', $organization->id)
            ->with('creator:id,name')
            ->withCount('recipients')
            ->orderByDesc('created_at')
            ->limit(200)
            ->get()
            ->map(fn (Broadcast $broadcast) => $this->broadcastPayload($broadcast))
            ->all();

        $sessionName = $organization->selectedAcademicYear()?->name;

        return inertia('dashboard/BroadcastHistory', [
            'user' => $user,
            'broadcasts' => $broadcasts,
            'sessionName' => $sessionName,
        ]);
    }

    public function create()
    {
        $user = Auth::user();
        $organization = $this->resolveOrganizationForUser($user);

        abort_unless($organization, 403);

        $classOptions = SchoolClass::query()
            ->where('organization_id', $organization->id)
            ->orderBy('name')
            ->get(['id', 'name', 'section'])
            ->map(fn (SchoolClass $class) => [
                'value' => (string) $class->id,
                'label' => trim($class->name.' '.($class->section ?? '')),
            ])
            ->values()
            ->all();

        $studentOptions = Student::query()
            ->forCurrentSession($organization->id)
            ->where('status', 'active')
            ->with('schoolClass:id,name,section')
            ->limit(500)
            ->get()
            ->map(fn (Student $student) => [
                'value' => (string) $student->id,
                'label' => trim($student->first_name.' '.$student->last_name)
                    .' · '.($student->admission_no ?? '')
                    .' · '.trim(optional($student->schoolClass)->name.' '.optional($student->schoolClass)->section),
            ])
            ->values()
            ->all();

        $staffOptions = User::query()
            ->where('organization_id', $organization->id)
            ->whereIn('role', self::STAFF_ROLES)
            ->where('status', 'active')
            ->orderBy('name')
            ->get(['id', 'name', 'email'])
            ->map(fn (User $staff) => [
                'value' => (string) $staff->id,
                'label' => trim($staff->name.' '.($staff->email ?? '')),
            ])
            ->values()
            ->all();

        return inertia('dashboard/BroadcastCompose', [
            'user' => $user,
            'classOptions' => $classOptions,
            'studentOptions' => $studentOptions,
            'staffOptions' => $staffOptions,
            'placeholders' => self::PLACEHOLDERS,
            'channels' => self::CHANNELS,
        ]);
    }

    public function store(Request $request): RedirectResponse
    {
        $user = Auth::user();
        $organization = $this->resolveOrganizationForUser($user);

        abort_unless($organization, 403);

        $validated = $request->validate([
            'subject' => ['required', 'string', 'max:255'],
            'message' => ['required', 'string', 'max:5000'],
            'channels' => ['required', 'array', 'min:1', 'max:'.count(self::CHANNELS)],
            'channels.*' => [Rule::in(self::CHANNELS)],
            'recipient_group' => ['required', Rule::in(self::GROUPS)],
            'class_ids' => ['nullable', 'array'],
            'class_ids.*' => ['integer'],
            'student_ids' => ['nullable', 'array'],
            'student_ids.*' => ['integer'],
            'staff_ids' => ['nullable', 'array'],
            'staff_ids.*' => ['integer'],
        ]);

        $recipientGroup = $validated['recipient_group'];

        $selectionRequirement = match ($recipientGroup) {
            'class_parents', 'class_students' => ['class_ids', 'class'],
            'specific_students' => ['student_ids', 'student'],
            'specific_staff' => ['staff_ids', 'staff member'],
            default => null,
        };

        if ($selectionRequirement !== null) {
            [$key, $noun] = $selectionRequirement;
            if (empty($validated[$key])) {
                return back()->withErrors([
                    $key => 'Select at least one '.$noun.'.',
                ]);
            }
        }

        $channels = $validated['channels'];

        if (in_array('qwa_whatsapp', $channels, true)) {
            $qwa = $this->qwaAutoAlertService->qwaConnection($organization);

            if (! ($qwa['configured'] ?? false)) {
                return back()->withErrors([
                    'qwa_delivery' => 'QWA is not configured. Set up the QWA gateway in Communication Settings first.',
                ]);
            }

            if (! ($qwa['connected'] ?? false)) {
                return back()->withErrors([
                    'qwa_delivery' => 'QWA is not connected. Start the QWA session and scan the QR code before sending.',
                ]);
            }
        }

        [$recipients, $studentIds] = $this->resolveRecipients($organization, $recipientGroup, $validated);

        if (empty($recipients)) {
            return back()->withErrors([
                'recipient_group' => 'No recipients found for the selected group.',
            ]);
        }

        $academicYear = $organization->selectedAcademicYear();

        $broadcast = Broadcast::query()->create([
            'organization_id' => $organization->id,
            'academic_year_id' => $academicYear?->id,
            'subject' => $validated['subject'],
            'message' => $validated['message'],
            'channels' => $channels,
            'recipient_group' => $recipientGroup,
            'class_ids' => $validated['class_ids'] ?? null,
            'student_ids' => $studentIds ?: null,
            'staff_ids' => ($validated['staff_ids'] ?? null) ?: null,
            'recipient_count' => count($recipients),
            'sent_count' => 0,
            'delivered_count' => 0,
            'opened_count' => 0,
            'status' => in_array('qwa_whatsapp', $channels, true) ? 'sending' : 'sent',
            'sent_at' => now(),
            'created_by' => $user->id,
        ]);

        $now = now();
        foreach ($channels as $channel) {
            foreach ($recipients as $recipient) {
                $isQwa = $channel === 'qwa_whatsapp';
                $contact = $isQwa ? ($recipient['phone'] ?? '') : ($recipient['email'] ?? '');

                if (! filled($contact)) {
                    continue;
                }

                BroadcastRecipient::query()->create([
                    'broadcast_id' => $broadcast->id,
                    'organization_id' => $organization->id,
                    'student_id' => $recipient['student_id'] ?? null,
                    'user_id' => $recipient['user_id'] ?? null,
                    'name' => $recipient['name'],
                    'contact' => $contact,
                    'channel' => $channel,
                    'status' => $isQwa ? 'pending' : 'sent',
                    'sent_at' => $isQwa ? null : $now,
                ]);
            }
        }

        $broadcast->forceFill(['sent_count' => $this->distinctSentCount($broadcast->id)])->save();

        $qwaRecipients = $broadcast->recipients()
            ->where('channel', 'qwa_whatsapp')
            ->orderBy('id')
            ->get(['id']);

        if ($qwaRecipients->isNotEmpty()) {
            $delayMin = max(1, (int) config('services.whatsapp_bridge.send_delay_min_seconds', 3));
            $delayMax = max($delayMin, (int) config('services.whatsapp_bridge.send_delay_max_seconds', 6));
            $delayCursor = 0;

            $qwaRecipients->each(function (BroadcastRecipient $recipient, int $index) use (&$delayCursor, $delayMin, $delayMax, $broadcast) {
                $delayCursor += $index === 0 ? 0 : random_int($delayMin, $delayMax);

                DispatchQwaBroadcastJob::dispatch($broadcast->id, $recipient->id)
                    ->onQueue('whatsapp')
                    ->delay(now()->addSeconds($delayCursor));
            });
        }

        $queuedDescription = $qwaRecipients->isNotEmpty()
            ? sprintf('Broadcast queued for %d recipient(s) across %d channel(s); QWA WhatsApp delivery scheduled.', count($recipients), count($channels))
            : sprintf('Broadcast queued for %d recipient(s) across %d channel(s).', count($recipients), count($channels));

        return redirect()
            ->route('communication.broadcast')
            ->with('success', $queuedDescription);
    }

    public function destroy(Broadcast $broadcast): RedirectResponse
    {
        $user = Auth::user();
        $organization = $this->resolveOrganizationForUser($user);

        abort_unless($organization, 403);
        abort_unless((int) $broadcast->organization_id === (int) $organization->id, 404);

        $broadcast->recipients()->delete();
        $broadcast->delete();

        return redirect()
            ->route('communication.broadcast')
            ->with('success', 'Broadcast deleted.');
    }

    private function distinctSentCount(int $broadcastId): int
    {
        return BroadcastRecipient::query()
            ->where('broadcast_id', $broadcastId)
            ->whereIn('status', ['sent', 'delivered', 'opened'])
            ->get(['student_id', 'user_id'])
            ->map(fn (BroadcastRecipient $recipient) => $recipient->student_id ? 's'.$recipient->student_id : 'u'.$recipient->user_id)
            ->unique()
            ->count();
    }

    private function broadcastPayload(Broadcast $broadcast): array
    {
        return [
            'id' => (string) $broadcast->id,
            'subject' => $broadcast->subject,
            'message' => $broadcast->message,
            'channels' => $broadcast->channels ?? [],
            'recipient_group' => $broadcast->recipient_group,
            'recipient_count' => $broadcast->recipient_count,
            'sent_count' => $broadcast->sent_count,
            'delivered_count' => $broadcast->delivered_count,
            'opened_count' => $broadcast->opened_count,
            'status' => $broadcast->status,
            'sent_at' => $broadcast->sent_at?->toIso8601String(),
            'created_at' => $broadcast->created_at?->toIso8601String(),
            'created_by' => $broadcast->creator?->name,
        ];
    }

    private function resolveRecipients(Organization $organization, string $group, array $validated): array
    {
        [$students, $studentIds] = $this->resolveStudents($organization, $group, $validated);

        if ($group === 'all_staff' || $group === 'specific_staff') {
            $staffQuery = User::query()
                ->where('organization_id', $organization->id)
                ->whereIn('role', self::STAFF_ROLES)
                ->where('status', 'active')
                ->whereNotNull('email');

            if ($group === 'specific_staff') {
                $staffIds = array_values(array_filter((array) ($validated['staff_ids'] ?? [])));
                $staffQuery->whereIn('id', $staffIds);
            }

            $staff = $staffQuery
                ->orderBy('name')
                ->get(['id', 'name', 'email', 'phone']);

            return [
                $staff->map(fn (User $staffMember) => [
                    'user_id' => $staffMember->id,
                    'student_id' => null,
                    'name' => $staffMember->name,
                    'email' => $staffMember->email,
                    'phone' => ContactPhoneResolver::userPhone($staffMember),
                ])->all(),
                [],
            ];
        }

        $isStudentAudience = $group === 'class_students';

        $recipients = $students
            ->map(function (Student $student) use ($isStudentAudience) {
                $studentName = trim($student->first_name.' '.$student->last_name);

                return [
                    'student_id' => $student->id,
                    'user_id' => null,
                    'name' => $isStudentAudience
                        ? ($studentName ?: ($student->guardian_name ?: ''))
                        : ($student->guardian_name ?: $studentName),
                    'email' => $isStudentAudience
                        ? ($student->email ?: ($student->guardian_email ?: ($student->father_email ?: ($student->mother_email ?: ''))))
                        : ($student->guardian_email ?: ($student->father_email ?: ($student->mother_email ?: ''))),
                    'phone' => ContactPhoneResolver::studentPrimary($student),
                ];
            })
            ->filter(fn (array $recipient) => filled($recipient['email']) || filled($recipient['phone']))
            ->values()
            ->all();

        return [$recipients, $studentIds];
    }

    private function resolveStudents(Organization $organization, string $group, array $validated): array
    {
        $studentQuery = Student::query()
            ->forCurrentSession($organization->id)
            ->where('status', 'active');

        switch ($group) {
            case 'due_fees':
                $studentIds = StudentFee::query()
                    ->where('organization_id', $organization->id)
                    ->where('balance', '>', 0)
                    ->distinct()
                    ->pluck('student_id')
                    ->all();
                $students = $studentQuery->whereIn('id', $studentIds)->get();

                return [$students, $studentIds];

            case 'no_dues':
                $dueStudentIds = StudentFee::query()
                    ->where('organization_id', $organization->id)
                    ->where('balance', '>', 0)
                    ->distinct()
                    ->pluck('student_id')
                    ->all();
                $students = $studentQuery->whereNotIn('id', $dueStudentIds)->get();

                return [$students, []];

            case 'class_parents':
                $classIds = array_values(array_filter((array) ($validated['class_ids'] ?? [])));
                $students = $studentQuery->whereIn('class_id', $classIds)->get();

                return [$students, []];

            case 'class_students':
                $classIds = array_values(array_filter((array) ($validated['class_ids'] ?? [])));
                $students = $studentQuery->whereIn('class_id', $classIds)->get();

                return [$students, []];

            case 'specific_students':
                $studentIds = array_values(array_filter((array) ($validated['student_ids'] ?? [])));
                $students = $studentQuery->whereIn('id', $studentIds)->get();

                return [$students, $studentIds];

            case 'all_staff':
            case 'specific_staff':
                return [collect(), []];

            default:
                return [$studentQuery->get(), []];
        }
    }

    private function resolveOrganizationForUser(?User $user): ?Organization
    {
        return $this->staffPermissionService->resolveOrganizationForUser($user);
    }
}