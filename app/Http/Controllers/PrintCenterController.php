<?php

namespace App\Http\Controllers;

use App\Models\Organization;
use App\Models\User;
use Illuminate\Http\Request;
use Inertia\Inertia;
use Inertia\Response;

class PrintCenterController extends Controller
{
    public function index(Request $request): Response
    {
        $user = $request->user();
        $organization = $this->resolveOrganizationForUser($user);
        abort_unless($organization, 403);

        $documents = [
            [
                'key' => 'report-card',
                'url' => route('exams.report-card'),
                'kind' => 'report',
            ],
            [
                'key' => 'student-id-card',
                'url' => route('certificates.student-id-card'),
                'kind' => 'idcard',
            ],
            [
                'key' => 'staff-id-card',
                'url' => route('staff-id-cards'),
                'kind' => 'idcard',
            ],
            [
                'key' => 'hpc',
                'url' => route('hpc.dashboard'),
                'kind' => 'report',
            ],
            [
                'key' => 'fee-challans',
                'url' => route('fees.challans'),
                'kind' => 'finance',
            ],
            [
                'key' => 'due-slips',
                'url' => route('fees.due-slips'),
                'kind' => 'finance',
            ],
            [
                'key' => 'payslips',
                'url' => route('staff.payroll-management'),
                'kind' => 'finance',
            ],
            [
                'key' => 'school-reports',
                'url' => route('reports'),
                'kind' => 'report',
            ],
        ];

        return Inertia::render('dashboard/PrintCenter', [
            'user' => $user,
            'organization' => ['name' => $organization->name],
            'documents' => $documents,
        ]);
    }

    private function resolveOrganizationForUser(User $user): ?Organization
    {
        return $user->organization_id
            ? Organization::query()->find($user->organization_id)
            : null;
    }
}