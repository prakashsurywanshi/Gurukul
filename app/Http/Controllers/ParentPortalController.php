<?php

namespace App\Http\Controllers;

use App\Models\Assessment;
use App\Models\Attendance;
use App\Models\ExamResult;
use App\Models\FeePayment;
use App\Models\HealthRecord;
use App\Models\Homework;
use App\Models\LibraryBook;
use App\Models\Message;
use App\Models\MessageRecipient;
use App\Models\OnlineClass;
use App\Models\Organization;
use App\Models\PtmAppointment;
use App\Models\PtmSession;
use App\Models\SchoolEvent;
use App\Models\Student;
use App\Models\SyllabusUnit;
use App\Models\Timetable;
use App\Models\TransportRoute;
use App\Models\User;
use Illuminate\Http\Request;
use Illuminate\Support\Carbon;
use Illuminate\Support\Facades\Auth;
use Inertia\Response;

class ParentPortalController extends Controller
{
    public function index(Request $request): Response
    {
        $user = Auth::user();
        abort_unless($user->role === 'student' || $user->role === 'parent', 403);

        $organization = $this->resolveOrganizationForUser($user);
        abort_unless($organization, 403);

        $children = $this->resolveChildrenForUser($user, $organization);
        $student = $this->selectChildStudent($children, $request->integer('student'));

        $activeSession = $organization->selectedSessionName();

        return inertia('dashboard/ParentPortal', [
            'user' => $user,
            'organization' => [
                'id' => $organization->id,
                'name' => $organization->name,
                'logo' => $organization->logo,
            ],
            'activeSession' => $activeSession,
            'children' => $children,
            'selectedStudentId' => $student ? (string) $student->id : null,
            'tabs' => $student ? $this->buildTabs($organization->id, $student, $user) : $this->emptyTabs(),
        ]);
    }

    private function buildTabs(int $organizationId, Student $student, User $user): array
    {
        $classId = $student->schoolClass?->id;

        return [
            'calendar' => $this->calendar($organizationId),
            'timetable' => $classId ? $this->timetable($classId) : [],
            'attendance' => $this->attendance((int) $student->id),
            'exams' => $this->exams((int) $student->id),
            'ptm' => $this->ptm($organizationId, (int) $student->id),
            'osm' => $classId ? $this->osm($organizationId, (int) $classId) : [],
            'classwork' => $classId ? $this->classwork($organizationId, (int) $classId, (int) $student->id) : [],
            'transactions' => $this->transactions((int) $student->id),
            'messages' => $this->messages($organizationId, (int) $user->id),
            'transport' => $this->transport($organizationId, $student),
            'library' => $this->library($organizationId),
            'visits' => $this->visits($organizationId),
            'studyCenter' => $classId ? $this->studyCenter($organizationId, (int) $classId) : [],
            'health' => $this->healthRecords((int) $student->id),
            'liveClasses' => class_exists(OnlineClass::class) ? $this->liveClasses($organizationId, $classId) : [],
        ];
    }

    private function emptyTabs(): array
    {
        return array_fill_keys([
            'calendar', 'timetable', 'attendance', 'exams', 'ptm', 'osm',
            'classwork', 'transactions', 'messages', 'transport', 'library', 'visits', 'studyCenter',
            'health', 'liveClasses',
        ], []);
    }

    private function fmt(mixed $value, string $format): ?string
    {
        if ($value === null || $value === '') {
            return null;
        }

        return $value instanceof \DateTimeInterface
            ? $value->format($format)
            : Carbon::parse($value)->format($format);
    }

    private function calendar(int $organizationId): array
    {
        return SchoolEvent::query()
            ->where('organization_id', $organizationId)
            ->orderByDesc('start_date')
            ->limit(20)
            ->get()
            ->map(fn (SchoolEvent $event) => [
                'title' => $event->title,
                'type' => $event->type,
                'is_holiday' => (bool) $event->is_holiday,
                'start_date' => $this->fmt($event->start_date, 'Y-m-d'),
                'end_date' => $this->fmt($event->end_date, 'Y-m-d'),
                'start_time' => $this->fmt($event->start_time, 'H:i'),
                'location' => $event->location,
                'color' => $event->color,
            ])->values()->all();
    }

    private function timetable(int $classId): array
    {
        return Timetable::query()
            ->where('class_id', $classId)
            ->with('subject:id,name')
            ->with('teacher:id,name')
            ->orderBy('day')
            ->orderBy('period_order')
            ->orderBy('start_time')
            ->orderBy('id')
            ->get()
            ->map(fn (Timetable $entry) => [
                'day' => $entry->day,
                'subject' => $entry->subject?->name ?? '-',
                'teacher' => $entry->teacher?->name ?? '-',
                'period_order' => $entry->period_order,
                'start_time' => $this->fmt($entry->start_time, 'H:i'),
                'end_time' => $this->fmt($entry->end_time, 'H:i'),
                'room_number' => $entry->room_number,
                'period_type' => $entry->period_type,
            ])->values()->all();
    }

    private function attendance(int $studentId): array
    {
        $records = Attendance::query()
            ->where('student_id', $studentId)
            ->orderByDesc('date')
            ->limit(60)
            ->get(['date', 'status', 'remarks']);

        $summary = $records->countBy(fn (Attendance $record) => $record->status);

        return [
            'summary' => [
                'attendedDays' => $summary->get('present', 0) + $summary->get('late', 0) + $summary->get('half_day', 0),
                'absent' => $summary->get('absent', 0),
                'leave' => $summary->get('leave', 0),
            ],
            'records' => $records->map(fn (Attendance $record) => [
                'date' => $record->date?->format('Y-m-d'),
                'status' => $record->status,
                'remarks' => $record->remarks,
            ])->values()->all(),
        ];
    }

    private function exams(int $studentId): array
    {
        return ExamResult::query()
            ->where('student_id', $studentId)
            ->with('examSchedule.exam:id,name,start_date,end_date')
            ->with('examSchedule.subject:id,name')
            ->orderByDesc('id')
            ->limit(30)
            ->get()
            ->map(fn (ExamResult $result) => [
                'exam' => $result->examSchedule?->exam?->name ?? '-',
                'subject' => $result->examSchedule?->subject?->name ?? '-',
                'exam_date' => $result->examSchedule?->exam_date?->format('Y-m-d'),
                'total_marks' => $result->total_marks,
                'obtained_marks' => $result->obtained_marks,
                'grade' => $result->grade,
                'is_absent' => (bool) $result->is_absent,
                'remarks' => $result->remarks,
            ])->values()->all();
    }

    private function ptm(int $organizationId, int $studentId): array
    {
        return PtmSession::query()
            ->where('organization_id', $organizationId)
            ->orderByDesc('date')
            ->limit(15)
            ->get()
            ->map(function (PtmSession $session) use ($studentId) {
                $appointment = PtmAppointment::query()
                    ->where('ptm_session_id', $session->id)
                    ->where('student_id', $studentId)
                    ->first();

                return [
                    'title' => $session->title,
                    'date' => $this->fmt($session->date, 'Y-m-d'),
                    'start_time' => $this->fmt($session->start_time, 'H:i'),
                    'end_time' => $this->fmt($session->end_time, 'H:i'),
                    'location' => $session->location,
                    'status' => $session->status,
                    'appointment' => $appointment ? [
                        'slot_time' => $this->fmt($appointment->slot_time, 'H:i'),
                        'status' => $appointment->status,
                    ] : null,
                ];
            })->values()->all();
    }

    private function osm(int $organizationId, int $classId): array
    {
        return Assessment::query()
            ->where('organization_id', $organizationId)
            ->where('class_id', $classId)
            ->orderByDesc('start_date')
            ->limit(15)
            ->get()
            ->map(fn (Assessment $assessment) => [
                'name' => $assessment->name,
                'term' => $assessment->term,
                'assessment_type' => $assessment->assessment_type,
                'total_marks' => $assessment->total_marks,
                'weightage' => $assessment->weightage,
                'start_date' => $assessment->start_date?->format('Y-m-d'),
                'end_date' => $assessment->end_date?->format('Y-m-d'),
            ])->values()->all();
    }

    private function classwork(int $organizationId, int $classId, int $studentId): array
    {
        $submissionStatuses = Homework::query()
            ->where('organization_id', $organizationId)
            ->where('class_id', $classId)
            ->get()
            ->mapWithKeys(function (Homework $homework) use ($studentId) {
                $submission = $homework->submissions
                    ->first(fn ($submission) => (int) $submission->student_id === $studentId);

                return [
                    $homework->id => $submission ? $submission->status : 'pending',
                ];
            });

        return Homework::query()
            ->where('organization_id', $organizationId)
            ->where('class_id', $classId)
            ->with('subject:id,name')
            ->with('teacher:id,name')
            ->latest('assign_date')
            ->limit(15)
            ->get()
            ->map(fn (Homework $homework) => [
                'title' => $homework->title,
                'subject' => $homework->subject?->name ?? '-',
                'teacher' => $homework->teacher?->name ?? '-',
                'assign_date' => $homework->assign_date?->format('Y-m-d'),
                'due_date' => $homework->due_date?->format('Y-m-d'),
                'description' => $homework->description,
                'status' => $submissionStatuses->get($homework->id, 'pending'),
            ])->values()->all();
    }

    private function transactions(int $studentId): array
    {
        return FeePayment::query()
            ->where('student_id', $studentId)
            ->orderByDesc('payment_date')
            ->limit(20)
            ->get()
            ->map(fn (FeePayment $payment) => [
                'receipt_number' => $payment->receipt_number,
                'amount' => $payment->amount,
                'payment_method' => $payment->payment_method,
                'payment_date' => $payment->payment_date?->format('Y-m-d'),
                'status' => $payment->status,
                'transaction_id' => $payment->transaction_id,
            ])->values()->all();
    }

    private function messages(int $organizationId, int $userId): array
    {
        $recipientMessageIds = MessageRecipient::query()
            ->where('recipient_id', $userId)
            ->pluck('message_id');

        return Message::query()
            ->where('organization_id', $organizationId)
            ->where(fn ($query) => $query
                ->whereIn('id', $recipientMessageIds)
                ->orWhere('is_announcement', true))
            ->with('sender:id,name')
            ->latest()
            ->limit(15)
            ->get()
            ->map(fn (Message $message) => [
                'subject' => $message->subject,
                'message' => $message->message,
                'priority' => $message->priority,
                'is_announcement' => (bool) $message->is_announcement,
                'sender' => $message->sender?->name ?? 'School',
                'created_at' => $message->created_at?->format('Y-m-d H:i'),
            ])->values()->all();
    }

    private function transport(int $organizationId, Student $student): array
    {
        $routes = TransportRoute::query()
            ->where('organization_id', $organizationId)
            ->orderBy('route_name')
            ->limit(15)
            ->get(['route_name', 'route_number', 'description', 'status'])
            ->map(fn (TransportRoute $route) => [
                'name' => $route->route_name,
                'route_number' => $route->route_number,
                'description' => $route->description,
                'status' => $route->status,
            ])->values()->all();

        return [
            'required' => (bool) $student->transport_required,
            'route' => $student->transport_route,
            'vehicle' => $student->transport_vehicle,
            'pickup_point' => $student->transport_pickup_point,
            'routes' => $routes,
        ];
    }

    private function library(int $organizationId): array
    {
        return LibraryBook::query()
            ->where('organization_id', $organizationId)
            ->where('status', 'active')
            ->orderBy('title')
            ->limit(20)
            ->get()
            ->map(fn (LibraryBook $book) => [
                'title' => $book->title,
                'author' => $book->author,
                'category' => $book->category,
                'language' => $book->language,
                'available_copies' => $book->available_copies,
                'rack_number' => $book->rack_number,
            ])->values()->all();
    }

    private function visits(int $organizationId): array
    {
        return SchoolEvent::query()
            ->where('organization_id', $organizationId)
            ->whereIn('type', ['meeting', 'sports', 'cultural', 'other'])
            ->whereDate('start_date', '>=', now()->subDay()->toDateString())
            ->orderBy('start_date')
            ->limit(15)
            ->get()
            ->map(fn (SchoolEvent $event) => [
                'title' => $event->title,
                'type' => $event->type,
                'description' => $event->description,
                'start_date' => $this->fmt($event->start_date, 'Y-m-d'),
                'end_date' => $this->fmt($event->end_date, 'Y-m-d'),
                'start_time' => $this->fmt($event->start_time, 'H:i'),
                'location' => $event->location,
            ])->values()->all();
    }

    private function studyCenter(int $organizationId, int $classId): array
    {
        return SyllabusUnit::query()
            ->where('organization_id', $organizationId)
            ->where('class_id', $classId)
            ->with('subject:id,name')
            ->orderBy('subject_id')
            ->limit(25)
            ->get()
            ->map(fn (SyllabusUnit $unit) => [
                'title' => $unit->title,
                'subject' => $unit->subject?->name ?? '-',
                'book' => $unit->book,
                'term' => $unit->term,
                'coverage_percent' => $unit->coverage_percent,
            ])->values()->all();
    }

    private function healthRecords(int $studentId): array
    {
        return HealthRecord::query()
            ->where('student_id', $studentId)
            ->orderByDesc('record_date')
            ->limit(20)
            ->get()
            ->map(fn (HealthRecord $record) => [
                'record_date' => $record->record_date?->format('Y-m-d'),
                'blood_group' => $record->blood_group,
                'height_cm' => $record->height_cm,
                'weight_kg' => $record->weight_kg,
                'blood_pressure' => $record->blood_pressure,
                'pulse' => $record->pulse,
                'allergies' => $record->localized('allergies'),
                'medical_conditions' => $record->localized('medical_conditions'),
                'medications' => $record->localized('medications'),
                'remarks' => $record->localized('remarks'),
            ])->values()->all();
    }

    private function liveClasses(int $organizationId, ?int $classId): array
    {
        return OnlineClass::query()
            ->where('organization_id', $organizationId)
            ->when($classId, fn ($query) => $query->where('class_id', $classId))
            ->with('subject:id,name')
            ->orderByDesc('starts_at')
            ->limit(15)
            ->get()
            ->map(fn (OnlineClass $class) => [
                'title' => $class->title,
                'subject' => $class->subject?->name ?? '-',
                'provider' => $class->provider,
                'starts_at' => $class->starts_at?->format('Y-m-d H:i'),
                'ends_at' => $class->ends_at?->format('Y-m-d H:i'),
                'status' => $class->status,
                'notes' => $class->notes,
            ])->values()->all();
    }

    private function resolveOrganizationForUser(User $user): mixed
    {
        if ($user->organization_id) {
            return Organization::query()->find($user->organization_id);
        }

        $studentOrganizationId = Student::query()
            ->where(function ($query) use ($user) {
                $query
                    ->where('user_id', $user->id)
                    ->orWhere('email', $user->email)
                    ->orWhere('father_email', $user->email)
                    ->orWhere('mother_email', $user->email)
                    ->orWhere('guardian_email', $user->email);
            })
            ->value('organization_id');

        if ($studentOrganizationId) {
            $user->forceFill(['organization_id' => $studentOrganizationId])->save();
            $user->organization_id = $studentOrganizationId;

            return Organization::query()->find($studentOrganizationId);
        }

        return null;
    }

    private function resolveChildrenForUser(User $user, mixed $organization): array
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

    private function selectChildStudent(array $children, int $requestedId): ?Student
    {
        if (empty($children)) {
            return null;
        }

        $candidateIds = array_column($children, 'id');

        if (in_array((string) $requestedId, $candidateIds, true)) {
            return Student::query()->with('schoolClass:id,name,section')->find($requestedId);
        }

        return Student::query()->with('schoolClass:id,name,section')->find((int) $children[0]['id']);
    }
}