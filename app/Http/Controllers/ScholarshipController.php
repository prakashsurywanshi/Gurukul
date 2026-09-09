<?php

namespace App\Http\Controllers;

use App\Models\AcademicYear;
use App\Models\Organization;
use App\Models\SchoolClass;
use App\Models\Student;
use App\Models\StudentFee;
use App\Models\StudentScholarship;
use App\Models\User;
use Illuminate\Http\RedirectResponse;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\Auth;
use Illuminate\Validation\Rule;
use Throwable;

class ScholarshipController extends Controller
{
    private const TYPES = ['percent', 'fixed'];
    private const CATEGORIES = ['merit', 'needs_based', 'sports', 'other'];

    public function index(Request $request)
    {
        $user = Auth::user();
        $organization = $this->resolveOrganizationForUser($user);

        abort_unless($organization, 403);

        $academicYear = $organization->selectedAcademicYear();
        $academicYearId = $academicYear?->id;

        $status = $request->query('status');
        $category = $request->query('category');

        $scholarships = StudentScholarship::query()
            ->where('organization_id', $organization->id)
            ->where(fn ($q) => $q->where('academic_year_id', $academicYearId)->orWhereNull('academic_year_id'))
            ->when($status, fn ($q) => $q->where('status', $status))
            ->when($category, fn ($q) => $q->where('category', $category))
            ->with(['student:id,user_id,admission_no', 'student.user:id,name', 'academicYear:id,name', 'approver:id,name'])
            ->orderByDesc('created_at')
            ->limit(300)
            ->get()
            ->map(function (StudentScholarship $scholarship) {
                $studentFees = StudentFee::query()
                    ->where('student_id', $scholarship->student_id)
                    ->where('academic_year_id', $scholarship->academic_year_id)
                    ->get();

                return [
                    'id' => (string) $scholarship->id,
                    'title' => $scholarship->title,
                    'student' => $scholarship->student?->user?->name ?? '—',
                    'admission_no' => $scholarship->student?->admission_no,
                    'class' => $this->studentClass($scholarship->student),
                    'year' => $scholarship->academicYear?->name ?? '—',
                    'type' => $scholarship->type,
                    'value' => (float) $scholarship->value,
                    'category' => $scholarship->category,
                    'notes' => $scholarship->notes,
                    'status' => $scholarship->status,
                    'approved_by' => $scholarship->approver?->name,
                    'total_amount' => round((float) $studentFees->sum('amount'), 2),
                    'discount_applied' => round((float) $studentFees->sum('discount'), 2),
                ];
            })
            ->all();

        $totalDiscount = (float) StudentScholarship::query()
            ->where('organization_id', $organization->id)
            ->where('academic_year_id', $academicYearId)
            ->where('status', 'active')
            ->with('student.user')
            ->get()
            ->reduce(function (float $carry, StudentScholarship $scholarship) {
                $discount = (float) StudentFee::query()
                    ->where('student_id', $scholarship->student_id)
                    ->where('academic_year_id', $scholarship->academic_year_id)
                    ->sum('discount');

                return $carry + $discount;
            }, 0.0);

        return inertia('dashboard/Scholarships', [
            'user' => $user,
            'organization' => [
                'id' => $organization->id,
                'name' => $organization->name,
            ],
            'scholarships' => $scholarships,
            'classes' => $this->classRecords($organization),
            'students' => $this->studentRecords($organization),
            'sessionName' => $academicYear?->name ?? '—',
            'totalDiscount' => round($totalDiscount, 2),
            'selectedStatus' => $status ? (string) $status : null,
            'selectedCategory' => $category ? (string) $category : null,
        ]);
    }

    public function store(Request $request): RedirectResponse
    {
        $user = Auth::user();
        $organization = $this->resolveOrganizationForUser($user);

        abort_unless($organization, 403);

        $validated = $request->validate($this->rules());

        $academicYear = $organization->selectedAcademicYear();

        $scholarship = StudentScholarship::query()->create([
            'organization_id' => $organization->id,
            'student_id' => $validated['student_id'],
            'academic_year_id' => $academicYear?->id,
            'title' => $validated['title'],
            'type' => $validated['type'],
            'value' => $validated['value'],
            'category' => $validated['category'],
            'notes' => $validated['notes'] ?? null,
            'status' => $validated['status'] ?? 'active',
            'approved_by' => $user->id,
        ]);

        if ($academicYear) {
            $this->applyDiscountToStudentFees($scholarship->student_id, $academicYear->id);
        }

        return redirect()->route('scholarships')->with('success', 'Scholarship assigned.');
    }

    public function update(Request $request, StudentScholarship $scholarship): RedirectResponse
    {
        $user = Auth::user();
        $organization = $this->resolveOrganizationForUser($user);

        abort_unless($organization && $scholarship->organization_id === $organization->id, 403);

        $validated = $request->validate($this->rules());

        $academicYear = $organization->selectedAcademicYear();

        $scholarship->update([
            'title' => $validated['title'],
            'type' => $validated['type'],
            'value' => $validated['value'],
            'category' => $validated['category'],
            'notes' => $validated['notes'] ?? null,
            'status' => $validated['status'] ?? 'active',
            'approved_by' => $user->id,
        ]);

        if ($academicYear) {
            $this->applyDiscountToStudentFees($scholarship->student_id, $academicYear->id);
        }

        return redirect()->route('scholarships')->with('success', 'Scholarship updated.');
    }

    public function toggleStatus(StudentScholarship $scholarship): RedirectResponse
    {
        $user = Auth::user();
        $organization = $this->resolveOrganizationForUser($user);

        abort_unless($organization && $scholarship->organization_id === $organization->id, 403);

        $scholarship->update([
            'status' => $scholarship->status === 'active' ? 'inactive' : 'active',
            'approved_by' => $user->id,
        ]);

        if ($scholarship->academic_year_id) {
            $this->applyDiscountToStudentFees($scholarship->student_id, $scholarship->academic_year_id);
        }

        return redirect()->route('scholarships')->with('success', 'Scholarship status updated.');
    }

    public function destroy(StudentScholarship $scholarship): RedirectResponse
    {
        $user = Auth::user();
        $organization = $this->resolveOrganizationForUser($user);

        abort_unless($organization && $scholarship->organization_id === $organization->id, 403);

        $studentId = $scholarship->student_id;
        $academicYearId = $scholarship->academic_year_id;

        $scholarship->delete();

        if ($academicYearId) {
            $this->applyDiscountToStudentFees($studentId, $academicYearId);
        }

        return redirect()->route('scholarships')->with('success', 'Scholarship removed.');
    }

    private function applyDiscountToStudentFees(int $studentId, int $academicYearId): void
    {
        $scholarships = StudentScholarship::query()
            ->where('student_id', $studentId)
            ->where('academic_year_id', $academicYearId)
            ->where('status', 'active')
            ->get();

        $fees = StudentFee::query()
            ->where('student_id', $studentId)
            ->where('academic_year_id', $academicYearId)
            ->get();

        foreach ($fees as $fee) {
            $amount = (float) $fee->amount;

            $discount = 0.0;
            foreach ($scholarships as $scholarship) {
                if ($scholarship->type === 'percent') {
                    $discount += round($amount * ((float) $scholarship->value / 100), 2);
                } else {
                    $discount += (float) $scholarship->value;
                }
            }

            $discount = min($discount, $amount);
            $fine = (float) $fee->fine;
            $netAmount = round($amount - $discount + $fine, 2);
            $paidAmount = (float) $fee->paid_amount;
            $balance = round(max($netAmount - $paidAmount, 0), 2);

            $status = $fee->status === 'waived' ? 'waived' : ($netAmount <= 0 && $paidAmount <= 0 ? 'waived' : ($balance <= 0 ? 'paid' : ($paidAmount > 0 ? 'partial' : 'pending')));

            $fee->update([
                'discount' => round($discount, 2),
                'net_amount' => $netAmount,
                'balance' => $balance,
                'status' => $status,
            ]);
        }
    }

    private function rules(): array
    {
        return [
            'student_id' => ['required', 'integer', 'exists:students,id'],
            'title' => ['required', 'string', 'max:255'],
            'type' => ['required', Rule::in(self::TYPES)],
            'value' => ['required', 'numeric', 'min:0', 'max:100000'],
            'category' => ['required', Rule::in(self::CATEGORIES)],
            'notes' => ['nullable', 'string', 'max:5000'],
            'status' => ['nullable', Rule::in(['active', 'inactive'])],
        ];
    }

    private function studentClass(?Student $student): ?string
    {
        if (!$student || !$student->class_id) {
            return null;
        }

        return SchoolClass::query()->find($student->class_id)?->name;
    }

    private function classRecords(Organization $organization): array
    {
        return SchoolClass::forCurrentSession($organization->id)
            ->orderBy('name')
            ->get(['id', 'name'])
            ->map(fn (SchoolClass $schoolClass) => [
                'id' => (string) $schoolClass->id,
                'label' => $schoolClass->name,
            ])
            ->values()
            ->all();
    }

    private function studentRecords(Organization $organization): array
    {
        return Student::forCurrentSession($organization->id)
            ->with('user:id,name')
            ->orderBy('admission_no')
            ->limit(500)
            ->get()
            ->map(function (Student $student) {
                $label = trim(($student->user?->name ?? $student->first_name.' '.$student->last_name));
                if ($student->admission_no) {
                    $label .= " ({$student->admission_no})";
                }

                return [
                    'id' => (string) $student->id,
                    'label' => $label,
                ];
            })
            ->values()
            ->all();
    }

    private function resolveOrganizationForUser(User $user): ?Organization
    {
        if ($user->organization_id) {
            return Organization::query()->find($user->organization_id);
        }

        if ($user->role === 'super_admin') {
            return Organization::query()->first();
        }

        if ($user->role !== 'admin') {
            return null;
        }

        try {
            $organization = Organization::query()->firstOrFail();
            $user->organization_id = $organization->id;
            $user->save();

            return $organization;
        } catch (Throwable) {
            return null;
        }
    }
}