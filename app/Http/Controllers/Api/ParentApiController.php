<?php

namespace App\Http\Controllers\Api;

use App\Http\Controllers\Controller;
use App\Models\Attendance;
use App\Models\FeePayment;
use App\Models\Homework;
use App\Models\Student;
use App\Models\StudentFee;
use App\Models\SupportTicket;
use Illuminate\Database\Eloquent\Builder;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\DB;

class ParentApiController extends Controller
{
    public function kids(Request $request): JsonResponse
    {
        $parent = $request->user();

        if ($parent->role !== 'parent') {
            return response()->json(['message' => 'Parent account required.'], 403);
        }

        return response()->json(['students' => $this->kidsFor($parent)]);
    }

    public function fees(Request $request, string $studentId): JsonResponse
    {
        $student = $this->studentFor($request, $studentId);

        if (!$student) {
            return response()->json(['message' => 'Student not found.'], 404);
        }

        $fees = StudentFee::query()
            ->where('student_id', $student->id)
            ->get()
            ->map(fn (StudentFee $fee) => [
                'id' => (string) $fee->id,
                'title' => 'School Fee',
                'amount' => (float) $fee->amount,
                'discount' => (float) $fee->discount,
                'net_amount' => (float) $fee->net_amount,
                'paid' => (float) $fee->paid_amount,
                'balance' => (float) $fee->balance,
                'status' => $fee->status,
                'due_date' => $fee->due_date->format('Y-m-d'),
            ])
            ->all();

        return response()->json(['fees' => $fees]);
    }

    public function attendance(Request $request, string $studentId): JsonResponse
    {
        $student = $this->studentFor($request, $studentId);

        if (!$student) {
            return response()->json(['message' => 'Student not found.'], 404);
        }

        $from = $request->query('from');
        $to = $request->query('to');

        $attendance = Attendance::query()
            ->where('student_id', $student->id)
            ->when($from, fn (Builder $q) => $q->whereDate('date', '>=', $from))
            ->when($to, fn (Builder $q) => $q->whereDate('date', '<=', $to))
            ->orderByDesc('date')
            ->limit(90)
            ->get()
            ->map(fn (Attendance $record) => [
                'date' => $record->date->format('Y-m-d'),
                'status' => $record->status,
                'check_in_time' => $record->check_in_time,
                'check_out_time' => $record->check_out_time,
            ])
            ->all();

        return response()->json([
            'attendance' => $attendance,
            'summary' => [
                'present' => Attendance::query()->where('student_id', $student->id)->where('status', 'present')->count(),
                'absent' => Attendance::query()->where('student_id', $student->id)->where('status', 'absent')->count(),
                'late' => Attendance::query()->where('student_id', $student->id)->where('status', 'late')->count(),
            ],
        ]);
    }

    public function homework(Request $request, string $studentId): JsonResponse
    {
        $student = $this->studentFor($request, $studentId);

        if (!$student) {
            return response()->json(['message' => 'Student not found.'], 404);
        }

        $homework = Homework::query()
            ->where('class_id', $student->academicHistories()->where('is_current', true)->value('class_id') ?? 0)
            ->orderByDesc('created_at')
            ->limit(30)
            ->get()
            ->map(fn (Homework $item) => [
                'id' => (string) $item->id,
                'title' => $item->title,
                'description' => $item->description,
                'subject' => $item->subject?->name,
                'due_date' => $item->due_date?->format('Y-m-d'),
                'created_at' => $item->created_at?->toIso8601String(),
            ])
            ->all();

        return response()->json(['homework' => $homework]);
    }

    public function tickets(Request $request): JsonResponse
    {
        $parent = $request->user();

        if ($parent->role !== 'parent') {
            return response()->json(['message' => 'Parent account required.'], 403);
        }

        $kids = collect($this->kidsFor($parent))->pluck('id');

        // The `created_by` / `student_id` alternatives must be grouped under a single
        // organization filter; without it the OR would also return tickets this
        // parent raised in a different organization.
        $tickets = SupportTicket::query()
            ->where('organization_id', $parent->organization_id)
            ->where(function (Builder $query) use ($parent, $kids) {
                $query->where('created_by', $parent->id);

                if ($kids->isNotEmpty()) {
                    $query->orWhereIn('student_id', $kids);
                }
            })
            ->latest()
            ->get()
            ->map(fn (SupportTicket $ticket) => [
                'id' => (string) $ticket->id,
                'subject' => $ticket->subject,
                'department' => $ticket->department,
                'priority' => $ticket->priority,
                'status' => $ticket->status,
                'created_at' => $ticket->created_at?->toIso8601String(),
            ])
            ->all();

        return response()->json(['tickets' => $tickets]);
    }

    public function createTicket(Request $request): JsonResponse
    {
        $parent = $request->user();

        if ($parent->role !== 'parent') {
            return response()->json(['message' => 'Parent account required.'], 403);
        }

        $validated = $request->validate([
            'subject' => ['required', 'string', 'max:255'],
            'message' => ['required', 'string', 'max:2000'],
            'department' => ['nullable', 'in:academics,fees,transport,hostel,library,other'],
            'priority' => ['nullable', 'in:low,medium,high'],
            'student_id' => ['required', 'integer'],
        ]);

        // Compare as strings: `kidsFor` serialises ids as strings while the validated
        // input is an integer.
        $kids = collect($this->kidsFor($parent))->pluck('id')->map(fn ($id) => (string) $id);
        if (!$kids->contains((string) $validated['student_id'])) {
            return response()->json(['message' => 'Student not linked to this parent account.'], 422);
        }

        $student = Student::query()
            ->where('organization_id', $parent->organization_id)
            ->findOrFail($validated['student_id']);

        $ticket = SupportTicket::query()->create([
            'organization_id' => $student->organization_id,
            'student_id' => $student->id,
            'created_by' => $parent->id,
            'subject' => $validated['subject'],
            'department' => $validated['department'] ?? 'other',
            'priority' => $validated['priority'] ?? 'medium',
            'status' => 'open',
        ]);

        \App\Models\SupportTicketReply::query()->create([
            'organization_id' => $student->organization_id,
            'ticket_id' => $ticket->id,
            'user_id' => $parent->id,
            'message' => $validated['message'],
        ]);

        return response()->json(['message' => 'Ticket created.', 'ticket' => ['id' => (string) $ticket->id, 'status' => $ticket->status]], 201);
    }

    public function payments(Request $request, string $studentId): JsonResponse
    {
        $student = $this->studentFor($request, $studentId);

        if (!$student) {
            return response()->json(['message' => 'Student not found.'], 404);
        }

        $payments = FeePayment::query()
            ->where('student_id', $student->id)
            ->where('status', 'success')
            ->latest()
            ->limit(50)
            ->get()
            ->map(fn (FeePayment $payment) => [
                'id' => (string) $payment->id,
                'receipt_number' => $payment->receipt_number,
                'amount' => (float) $payment->amount,
                'method' => $payment->payment_method,
                'date' => $payment->payment_date?->format('Y-m-d'),
                'created_at' => $payment->created_at?->toIso8601String(),
            ])
            ->all();

        return response()->json(['payments' => $payments]);
    }

    /**
     * Children linked to this parent account.
     *
     * Matching is by parent email, parent phone, or an explicit `user_id` link,
     * because schools link parents inconsistently. All three can match students
     * in *other* organizations: parent email/phone values are not unique across
     * tenants, so an unscoped lookup would return students belonging to a
     * different school entirely. The organization filter is therefore applied
     * to the whole query, including the `user_id` branch, rather than inside the
     * closure where it would only constrain the first branch.
     */
    private function kidsFor($parent): array
    {
        $email = strtolower((string) $parent->email);
        $phone = $parent->phone ? $this->normalizePhone($parent->phone) : null;
        $organizationId = $parent->organization_id;

        if (! $organizationId) {
            return [];
        }

        $linkedStudentIds = $parent->id
            ? Student::query()
                ->where('organization_id', $organizationId)
                ->where('user_id', $parent->id)
                ->pluck('id')
            : collect();

        $students = Student::query()
            ->where('organization_id', $organizationId)
            ->where(function (Builder $query) use ($email, $phone, $linkedStudentIds) {
                $query->where(DB::raw('LOWER(father_email)'), $email)
                    ->orWhere(DB::raw('LOWER(mother_email)'), $email)
                    ->orWhere(DB::raw('LOWER(guardian_email)'), $email);

                foreach (['father_phone', 'mother_phone', 'guardian_phone'] as $column) {
                    if ($phone) {
                        $query->orWhere(DB::raw("REPLACE(REPLACE(REPLACE(REPLACE({$column}, ' ', ''), '-', ''), '(', ''), ')', '')"), $phone);
                    }
                }

                if ($linkedStudentIds->isNotEmpty()) {
                    $query->orWhereIn('id', $linkedStudentIds);
                }
            })
            ->orderBy('admission_no')
            ->get();

        return $students->map(fn (Student $student) => [
            'id' => (string) $student->id,
            'admission_no' => $student->admission_no,
            'first_name' => $student->first_name,
            'last_name' => $student->last_name,
            'class' => $student->schoolClass?->name,
            'section' => $student->schoolClass?->section,
            'organization_id' => (string) $student->organization_id,
        ])->all();
    }

    private function normalizePhone(string $phone): string
    {
        return (string) preg_replace('/\D/', '', $phone);
    }

    private function studentFor(Request $request, string $studentId): ?Student
    {
        $parent = $request->user();

        if ($parent->role !== 'parent') {
            return null;
        }

        $kids = collect($this->kidsFor($parent));

        // `kidsFor` is already organization-scoped, so matching the id here
        // rejects a student from another tenant as well as an unlinked one.
        // Still re-scope the lookup as a second line of defence, since this
        // method's return value is used to build queries for fees, attendance
        // and payments.
        return $kids->firstWhere('id', $studentId)
            ? Student::query()
                ->where('organization_id', $parent->organization_id)
                ->find($studentId)
            : null;
    }
}