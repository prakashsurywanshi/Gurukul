<?php

namespace App\Http\Controllers;

use App\Models\Attendance;
use App\Models\Organization;
use App\Models\SchoolClass;
use App\Models\Student;
use App\Models\User;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\Response;
use Inertia\Inertia;
use Inertia\Response as InertiaResponse;

class RegulatorReportsController extends Controller
{
    public function index(Request $request): InertiaResponse
    {
        $user = $request->user();
        $organization = $this->resolveOrganizationForUser($user);
        abort_unless($organization, 403);
        $this->abortUnlessAdmin($user);

        $data = $this->reportData($organization);

        return Inertia::render('dashboard/RegulatorReports', [
            'school' => $data['school'],
            'disclosure' => $data['disclosure'],
            'government' => $data['government'],
        ]);
    }

    public function exportCsv(Request $request)
    {
        $user = $request->user();
        $organization = $this->resolveOrganizationForUser($user);
        abort_unless($organization, 403);
        $this->abortUnlessAdmin($user);

        $data = $this->reportData($organization);

        $filename = 'regulator-reports-'.now()->format('Y-m-d').'.csv';

        $handle = fopen('php://temp', 'w+');

        fputcsv($handle, ['Regulator / Government Report']);
        fputcsv($handle, ['School', $data['school']['name']]);
        fputcsv($handle, ['Email', $data['school']['email'] ?? '']);
        fputcsv($handle, ['Phone', $data['school']['phone'] ?? '']);
        fputcsv($handle, ['Address', $data['school']['address']]);
        fputcsv($handle, ['Website', $data['school']['website'] ?? '']);
        fputcsv($handle, ['Type', $data['school']['type'] ?? '']);
        fputcsv($handle, ['Exported on', now()->format('Y-m-d H:i')]);
        fputcsv($handle, []);

        fputcsv($handle, ['Summary']);
        fputcsv($handle, ['Metric', 'Value']);
        fputcsv($handle, ['Students', $data['government']['totalStudents']]);
        fputcsv($handle, ['Staff', $data['government']['totalStaff']]);
        fputcsv($handle, ['Classes', $data['disclosure']['classCount']]);
        fputcsv($handle, ['Marked Today', $data['government']['markedToday']]);
        fputcsv($handle, ['Present Today', $data['government']['presentToday']]);
        fputcsv($handle, ['Attendance Rate (%)', $data['government']['attendanceRate']]);
        fputcsv($handle, []);

        fputcsv($handle, ['Student Gender Split']);
        fputcsv($handle, ['Gender', 'Count']);
        foreach ($data['disclosure']['studentGender'] as $split) {
            fputcsv($handle, [$split['label'], $split['count']]);
        }
        fputcsv($handle, []);

        fputcsv($handle, ['Class Distribution']);
        fputcsv($handle, ['Class', 'Students']);
        foreach ($data['disclosure']['classDistribution'] as $entry) {
            fputcsv($handle, [$entry['name'], $entry['count']]);
        }
        fputcsv($handle, []);

        fputcsv($handle, ['Staff by Role']);
        fputcsv($handle, ['Role', 'Count']);
        foreach ($data['government']['staffByRole'] as $group) {
            fputcsv($handle, [$group['role'], $group['count']]);
        }

        rewind($handle);
        $content = stream_get_contents($handle);
        fclose($handle);

        return Response::make($content, 200, [
            'Content-Type' => 'text/csv; charset=UTF-8',
            'Content-Disposition' => 'attachment; filename="'.$filename.'"',
        ]);
    }

    private function reportData(Organization $organization): array
    {
        $students = Student::query()->where('organization_id', $organization->id)->get(['id', 'class_id', 'gender']);
        $staff = User::query()->where('organization_id', $organization->id)->whereNotNull('role')->get(['id', 'role', 'gender']);
        $classes = SchoolClass::query()->where('organization_id', $organization->id)->get(['id', 'name', 'section']);
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

        return [
            'school' => [
                'name' => $organization->name,
                'email' => $organization->email,
                'phone' => $organization->phone,
                'address' => trim(implode(', ', array_filter([$organization->address, $organization->city, $organization->state, $organization->pincode]))),
                'website' => $organization->website,
                'type' => $organization->type,
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
        ];
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