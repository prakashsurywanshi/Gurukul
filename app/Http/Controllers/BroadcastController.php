<?php

namespace App\Http\Controllers;

use App\Models\Broadcast;
use App\Models\BroadcastRecipient;
use App\Models\Organization;
use App\Models\SchoolClass;
use App\Models\Student;
use App\Models\StudentFee;
use App\Models\User;
use App\Services\StaffPermissionService;
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
        'specific_students',
    ];

    private const CHANNELS = ['email', 'sms', 'whatsapp', 'push'];

    private const PLACEHOLDERS = [
        'recipient_name',
        'student_name',
        'parent_name',
        'admission_no',
        'class',
        'section',
        'school_name',
        'date',
    ];

    public function __construct(private readonly StaffPermissionService $staffPermissionService)
    {
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

        return inertia('dashboard/BroadcastCompose', [
            'user' => $user,
            'classOptions' => $classOptions,
            'studentOptions' => $studentOptions,
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
            'channels' => ['required', 'array', 'min:1', 'max:4'],
            'channels.*' => [Rule::in(self::CHANNELS)],
            'recipient_group' => ['required', Rule::in(self::GROUPS)],
            'class_ids' => ['nullable', 'array'],
            'class_ids.*' => ['integer'],
            'student_ids' => ['nullable', 'array'],
            'student_ids.*' => ['integer'],
        ]);

        $recipientGroup = $validated['recipient_group'];

        if (in_array($recipientGroup, ['class_parents', 'specific_students'], true)) {
            $key = $recipientGroup === 'class_parents' ? 'class_ids' : 'student_ids';
            if (empty($validated[$key])) {
                return back()->withErrors([
                    $key => 'Select at least one '.($recipientGroup === 'class_parents' ? 'class' : 'student').'.',
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
            'channels' => $validated['channels'],
            'recipient_group' => $recipientGroup,
            'class_ids' => $validated['class_ids'] ?? null,
            'student_ids' => $studentIds ?: null,
            'recipient_count' => count($recipients),
            'sent_count' => count($recipients),
            'delivered_count' => 0,
            'opened_count' => 0,
            'status' => 'sent',
            'sent_at' => now(),
            'created_by' => $user->id,
        ]);

        $now = now();
        foreach ($validated['channels'] as $channel) {
            foreach ($recipients as $recipient) {
                BroadcastRecipient::query()->create([
                    'broadcast_id' => $broadcast->id,
                    'organization_id' => $organization->id,
                    'student_id' => $recipient['student_id'] ?? null,
                    'user_id' => $recipient['user_id'] ?? null,
                    'name' => $recipient['name'],
                    'contact' => $recipient['contact'],
                    'channel' => $channel,
                    'status' => 'sent',
                    'sent_at' => $now,
                ]);
            }
        }

        return redirect()
            ->route('communication.broadcast')
            ->with('success', sprintf('Broadcast queued for %d recipient(s) across %d channel(s).', count($recipients), count($validated['channels'])));
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

        if ($group === 'all_staff') {
            $staff = User::query()
                ->where('organization_id', $organization->id)
                ->whereIn('role', ['admin', 'teacher', 'receptionist', 'accountant', 'librarian'])
                ->where('status', 'active')
                ->whereNotNull('email')
                ->get(['id', 'name', 'email']);

            return [
                $staff->map(fn (User $staffMember) => [
                    'user_id' => $staffMember->id,
                    'student_id' => null,
                    'name' => $staffMember->name,
                    'contact' => $staffMember->email,
                ])->all(),
                [],
            ];
        }

        $recipients = $students
            ->map(fn (Student $student) => [
                'student_id' => $student->id,
                'user_id' => null,
                'name' => $student->guardian_name ?: trim($student->first_name.' '.$student->last_name),
                'contact' => $student->guardian_email ?: ($student->father_email ?: ($student->mother_email ?: '')),
            ])
            ->filter(fn (array $recipient) => filled($recipient['contact']))
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

            case 'specific_students':
                $studentIds = array_values(array_filter((array) ($validated['student_ids'] ?? [])));
                $students = $studentQuery->whereIn('id', $studentIds)->get();

                return [$students, $studentIds];

            case 'all_staff':
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