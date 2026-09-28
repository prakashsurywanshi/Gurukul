<?php

namespace App\Services;

use App\Models\Organization;
use App\Models\Student;
use App\Models\TransportAssignment;
use App\Models\TransportRoute;
use App\Models\TransportVehicle;
use App\Models\User;
use Illuminate\Support\Facades\DB;
use Illuminate\Validation\ValidationException;

class TransportAssignmentService
{
    public function __construct(
        private readonly TransportPolicyResolver $policies,
        private readonly TransportFeeService $fees,
    ) {
    }

    /**
     * @throws ValidationException when the student already has a bus this year
     */
    public function create(User $actor, Organization $organization, int $academicYearId, array $data): TransportAssignment
    {
        $student = $this->resolveStudent($organization, $data['studentId']);
        $route = $this->resolveRoute($organization, $academicYearId, $data['routeId']);
        $vehicle = $this->resolveVehicle($organization, $academicYearId, $data['vehicleId']);

        $decision = $this->policies->canManageRoster($actor, $vehicle, 'add');
        $this->enforceRosterDecision($decision, $actor, $vehicle, $student);

        if (TransportAssignment::query()
            ->where('student_id', $student->id)
            ->where('academic_year_id', $academicYearId)
            ->exists()) {
            throw ValidationException::withMessages([
                'studentId' => $actor->role === 'driver'
                    ? 'This student already has a bus this session. Ask the transport manager to move them.'
                    : 'Student already has a transport assignment.',
            ]);
        }

        $policy = $this->policies->effectivePolicy($vehicle);
        $status = $data['status'] ?? 'active';

        // A driver never self-approves: their assignment waits for the manager
        // whenever the bus policy requires roster approval.
        if ($actor->role === 'driver' && $policy['requires_roster_approval'] && $status === 'active') {
            $status = 'pending';
        }

        return DB::transaction(function () use ($actor, $student, $route, $vehicle, $data, $academicYearId, $status, $policy) {
            $assignment = TransportAssignment::query()->create([
                'academic_year_id' => $academicYearId,
                'student_id' => $student->id,
                'route_id' => $route->id,
                'vehicle_id' => $vehicle->id,
                'pickup_point' => $data['pickupStop'],
                'drop_point' => $data['dropStop'] ?? $data['pickupStop'],
                'pickup_time' => $data['pickupTime'] ?? null,
                'drop_time' => $data['dropTime'] ?? null,
                'monthly_fee' => $data['monthlyFee'] ?? 0,
                'status' => $status,
                'created_by_user_id' => $actor->id,
            ]);

            $this->syncStudentTransportDetails($student, $assignment->fresh(['vehicle', 'route']));
            $this->fees->syncAssignmentFees(
                $assignment->fresh(['student.schoolClass', 'route', 'vehicle']),
                $academicYearId,
                $actor->role === 'driver' ? ! $policy['requires_fee_approval'] : true,
            );

            return $assignment->fresh(['student', 'route', 'vehicle']);
        });
    }

    public function update(User $actor, Organization $organization, int $academicYearId, TransportAssignment $assignment, array $data): TransportAssignment
    {
        $student = $this->resolveStudent($organization, $data['studentId']);
        $route = $this->resolveRoute($organization, $academicYearId, $data['routeId']);
        $vehicle = $this->resolveVehicle($organization, $academicYearId, $data['vehicleId']);

        $decision = $this->policies->canManageRoster($actor, $vehicle, 'edit');
        $this->enforceRosterDecision($decision, $actor, $vehicle, $student);

        // A driver may only fix details on their own bus; moving a student to
        // another bus stays a transport office job.
        if ($actor->role === 'driver' && (int) $assignment->vehicle_id !== (int) $vehicle->id) {
            throw ValidationException::withMessages([
                'vehicleId' => 'You cannot move a student to another bus. Ask the transport manager.',
            ]);
        }

        if (TransportAssignment::query()
            ->where('student_id', $student->id)
            ->where('academic_year_id', $academicYearId)
            ->where('id', '!=', $assignment->id)
            ->exists()) {
            throw ValidationException::withMessages([
                'studentId' => $actor->role === 'driver'
                    ? 'This student already has a bus this session. Ask the transport manager to move them.'
                    : 'Student already has a transport assignment.',
            ]);
        }

        $previousStudent = $assignment->student;
        $policy = $this->policies->effectivePolicy($vehicle);
        $status = $data['status'] ?? $assignment->status;

        if ($actor->role === 'driver' && $policy['requires_roster_approval'] && $status === 'active') {
            $status = 'pending';
        }

        return DB::transaction(function () use ($assignment, $student, $route, $vehicle, $data, $academicYearId, $previousStudent, $status, $policy, $actor) {
            $assignment->update([
                'academic_year_id' => $academicYearId,
                'student_id' => $student->id,
                'route_id' => $route->id,
                'vehicle_id' => $vehicle->id,
                'pickup_point' => $data['pickupStop'],
                'drop_point' => $data['dropStop'] ?? $data['pickupStop'],
                'pickup_time' => $data['pickupTime'] ?? null,
                'drop_time' => $data['dropTime'] ?? null,
                'monthly_fee' => $data['monthlyFee'] ?? 0,
                'status' => $status,
            ]);

            $updated = $assignment->fresh(['student.schoolClass', 'route', 'vehicle']);

            if ($previousStudent && $previousStudent->id !== $student->id) {
                \App\Models\StudentFee::query()
                    ->where('transport_assignment_id', $assignment->id)
                    ->update(['student_id' => $student->id]);

                $this->syncStudentTransportDetails($previousStudent, null);
            }

            $this->syncStudentTransportDetails($student, $updated);

            $this->fees->syncAssignmentFees(
                $updated,
                $academicYearId,
                $actor->role === 'driver' ? ! $policy['requires_fee_approval'] : true,
            );

            return $updated;
        });
    }

    public function delete(User $actor, TransportAssignment $assignment): void
    {
        $vehicle = $assignment->vehicle;
        $student = $assignment->student;

        $decision = $this->policies->canManageRosterForAssignment($actor, $assignment, 'delete');

        if (! $decision['allowed']) {
            if ($actor->role === 'driver') {
                throw ValidationException::withMessages([
                    'assignmentId' => $decision['message'],
                ]);
            }

            abort(403, $decision['message']);
        }

        DB::transaction(function () use ($assignment, $student) {
            $this->fees->clearAssignmentDues($assignment);
            $assignment->delete();

            if ($student) {
                $this->syncStudentTransportDetails($student, null);
            }
        });
    }

    /**
     * Manager approval for a driver-created pending assignment. Also releases
     * the monthly dues when the bus holds the fee amount back for approval.
     */
    public function approve(User $actor, TransportAssignment $assignment): TransportAssignment
    {
        if (! $this->policies->isAdmin($actor) && $actor->role !== 'transport_manager') {
            abort(403, 'Only the transport manager can approve transport assignments.');
        }

        $assignment->update([
            'status' => 'active',
            'reviewed_by_user_id' => $actor->id,
            'reviewed_at' => now(),
            'decision_note' => null,
        ]);

        $updated = $assignment->fresh(['student.schoolClass', 'route', 'vehicle']);

        if ($updated->student) {
            $this->syncStudentTransportDetails($updated->student, $updated);
        }

        $this->fees->syncAssignmentFees($updated, $assignment->academic_year_id, true);

        return $updated;
    }

    public function reject(User $actor, TransportAssignment $assignment, ?string $reason = null): TransportAssignment
    {
        if (! $this->policies->isAdmin($actor) && $actor->role !== 'transport_manager') {
            abort(403, 'Only the transport manager can reject transport assignments.');
        }

        $assignment->update([
            'status' => 'inactive',
            'reviewed_by_user_id' => $actor->id,
            'reviewed_at' => now(),
            'decision_note' => $reason ?: 'Rejected by transport manager.',
        ]);

        $student = $assignment->student;
        if ($student) {
            $this->syncStudentTransportDetails($student, null);
        }

        $this->fees->clearAssignmentDues($assignment->fresh(['student.schoolClass', 'route', 'vehicle']));

        return $assignment->fresh(['student', 'route', 'vehicle']);
    }

    public function syncStudentTransportDetails(Student $student, ?TransportAssignment $assignment): void
    {
        // Only a student who is actually on the bus is flagged as needing
        // transport; anything waiting for the manager does not count yet.
        if ($assignment && $assignment->status !== 'active') {
            $assignment = null;
        }

        $student->update([
            'transport_required' => (bool) $assignment,
            'transport_pickup_point' => $assignment?->pickup_point,
            'transport_vehicle' => $assignment?->vehicle?->vehicle_number ?? '',
            'transport_route' => $assignment?->route?->route_name ?? '',
            'transport_route_details' => $assignment && $assignment->route
                ? trim($assignment->route->route_name . ($assignment->pickup_point ? ' / ' . $assignment->pickup_point : ''))
                : '',
        ]);
    }

    private function enforceRosterDecision(array $decision, User $actor, ?TransportVehicle $vehicle, ?Student $student): void
    {
        if ($decision['allowed']) {
            return;
        }

        if ($actor->role === 'driver') {
            throw ValidationException::withMessages([
                'studentId' => $decision['message'],
            ]);
        }

        abort(403, $decision['message']);
    }

    private function resolveStudent(Organization $organization, mixed $studentId): Student
    {
        return Student::query()
            ->forCurrentSession($organization->id)
            ->findOrFail($studentId);
    }

    private function resolveRoute(Organization $organization, int $academicYearId, mixed $routeId): TransportRoute
    {
        return TransportRoute::query()
            ->where('organization_id', $organization->id)
            ->where('academic_year_id', $academicYearId)
            ->findOrFail($routeId);
    }

    private function resolveVehicle(Organization $organization, int $academicYearId, mixed $vehicleId): TransportVehicle
    {
        return TransportVehicle::query()
            ->where('organization_id', $organization->id)
            ->where('academic_year_id', $academicYearId)
            ->with('policy')
            ->findOrFail($vehicleId);
    }
}
