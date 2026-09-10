<?php

namespace App\Http\Controllers;

use App\Models\Attendance;
use App\Models\Organization;
use App\Models\SchoolClass;
use App\Models\Student;
use App\Models\User;
use Illuminate\Http\Request;
use Inertia\Inertia;
use Inertia\Response;

class RegulatorReportsController extends Controller
{
    public function index(Request $request): Response
    {
        $user = $request->user();
        $organization = $this->resolveOrganizationForUser($user);
        abort_unless($organization, 403);
        $this->abortUnlessAdmin($user);

        $students = Student::query()->where('organization_id', $organization->id)->get(['id', 'class_id', 'gender']);
        $staff = User::query()->where('organization_id', $organization->id)->whereNotNull('role')->get(['id', 'role', 'gender']);
        $classes = SchoolClass::query()->where('organization_id', $organization->id)->get(['id', 'name', 'section']);
        $attendanceCount = Attendance::query()->where('organization_id', $organization->id)->count();
        $presentToday = Attendance::query()
            ->where('organization_id', $organization->id)
            ->whereDate('date', now()->toDateString())
            ->whereIn('status', ['present', 'late'])
            ->count();
        $markedToday = Attendance::query()
            ->where('organization_id', $organization->id)
            ->whereDate('date', now()->toDateString())
            ->count();

        $genderLabels = [
            'male' => 'Male',
            'female' => 'Female',
            'other' => 'Other',
        ];

        $school = $organization;

        return Inertia::render('dashboard/RegulatorReports', [
            'school' => [
                'name' => $school->name,
                'email' => $school->email,
                'phone' => $school->phone,
                'address' => trim(implode(', ', array_filter([$school->address, $school->city, $school->state, $school->pincode]))),
                'website' => $school->website,
                'type' => $school->type,
            ],
            'disclosure' => [
                'studentCount' => $students->count(),
                'staffCount' => $staff->count(),
                'classCount' => $classes->count(),
                'studentGender' => collect($genderLabels)->map(fn (string $label, string $key) => [
                    'label' => $label,
                    'count' => $students->where('gender', $key)->count(),
                ])->values(),
                'classDistribution' => $classes->map(function (SchoolClass $schoolClass) use ($students) {
                    return [
                        'name' => $schoolClass->name.($schoolClass->section ? ' - '.$schoolClass->section : ''),
                        'count' => $students->where('class_id', $schoolClass->id)->count(),
                    ];
                })->values(),
            ],
            'government' => [
                'totalStudents' => $students->count(),
                'totalStaff' => $staff->count(),
                'markedToday' => $markedToday,
                'presentToday' => $presentToday,
                'attendanceRate' => $markedToday > 0 ? round(($presentToday / $markedToday) * 100) : 0,
                'staffByRole' => $staff->groupBy('role')->map(fn ($entries, string $role) => [
                    'role' => $role,
                    'count' => $entries->count(),
                ])->values(),
            ],
        ]);
    }

    private function abortUnlessAdmin(User $user): void
    {
        abort_unless(in_array($user->role, ['admin', 'super_admin'], true), 403);
    }

    private function resolveOrganizationForUser(User $user): ?Organization
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
}