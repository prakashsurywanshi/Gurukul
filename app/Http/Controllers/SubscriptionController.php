<?php

namespace App\Http\Controllers;

use App\Models\Organization;
use App\Models\SubscriptionPayment;
use App\Models\User;
use Illuminate\Http\Request;
use Inertia\Inertia;
use Inertia\Response;

class SubscriptionController extends Controller
{
    public function index(Request $request): Response
    {
        $organization = $this->resolveOrganizationForUser($request->user());

        return Inertia::render('dashboard/Subscription', [
            'user' => $request->user(),
            'subscription' => [
                'plan' => $organization?->subscription_plan ?? 'free',
                'start_date' => $organization?->subscription_start_date?->format('Y-m-d'),
                'end_date' => $organization?->subscription_end_date?->format('Y-m-d'),
                'status' => $organization ? ($organization->subscriptionIsExpired() ? 'expired' : 'active') : 'unknown',
                'days_remaining' => $organization?->daysUntilExpiry(),
                'org_name' => $organization?->name ?? '',
            ],
        ]);
    }

    public function paymentHistory(Request $request): Response
    {
        $organization = $this->resolveOrganizationForUser($request->user());
        $history = $organization
            ? SubscriptionPayment::query()
                ->where('organization_id', $organization->id)
                ->orderByDesc('payment_date')
                ->get([
                    'id',
                    'amount',
                    'plan_name',
                    'transaction_id',
                    'payment_method',
                    'status',
                    'payment_date',
                    'notes',
                ])
            : collect();

        return Inertia::render('dashboard/SubscriptionHistory', [
            'user' => $request->user(),
            'history' => $history,
        ]);
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

        if (! $organization && Organization::query()->count() === 1) {
            $organization = Organization::query()->first();
        }

        return $organization;
    }
}