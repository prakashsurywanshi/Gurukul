<?php

namespace App\Http\Controllers;

use App\Models\AcademicYear;
use App\Models\Organization;
use App\Models\User;
use Illuminate\Support\Facades\Auth;

class BranchAdminController extends Controller
{
    public function index()
    {
        $user = Auth::user();

        if ($user->role !== 'super_admin') {
            abort(403, 'Branch Admin is available to head-office super administrators only.');
        }

        $organizations = Organization::query()
            ->withCount(['students', 'users'])
            ->orderBy('name')
            ->get()
            ->map(function (Organization $organization) {
                $lastSession = AcademicYear::query()
                    ->where('organization_id', $organization->id)
                    ->latest()
                    ->value('name');

                return [
                    'id' => $organization->id,
                    'name' => $organization->name,
                    'email' => $organization->email,
                    'phone' => $organization->phone,
                    'students_count' => $organization->students_count,
                    'users_count' => $organization->users_count,
                    'current_session' => $lastSession ?? 'Not set',
                    'subscription_status' => $organization->subscriptionIsExpired() ? 'expired' : 'active',
                ];
            });

        return inertia('dashboard/BranchAdmin', [
            'user' => $user,
            'branches' => $organizations,
        ]);
    }
}