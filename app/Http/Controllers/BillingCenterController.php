<?php

namespace App\Http\Controllers;

use App\Models\Organization;
use App\Models\SubscriptionPayment;
use App\Models\User;
use Illuminate\Http\RedirectResponse;
use Illuminate\Http\Request;
use Illuminate\Support\Carbon;
use Illuminate\Validation\Rule;
use Inertia\Inertia;
use Inertia\Response;

class BillingCenterController extends Controller
{
    public function index(Request $request): Response
    {
        $user = $request->user();
        abort_unless($user instanceof User && $user->role === 'super_admin', 403);

        $organizations = Organization::query()
            ->orderBy('name')
            ->get();

        $payments = SubscriptionPayment::query()
            ->with('organization:id,name')
            ->orderByDesc('payment_date')
            ->limit(50)
            ->get();

        $expiringSoon = $organizations
            ->filter(fn (Organization $org) => $org->hasActiveAccess() && $org->expiresWithinDays(30))
            ->values();

        $toggledStatus = $request->query('organization_id')
            ? (int) $request->query('organization_id')
            : null;

        return Inertia::render('dashboard/BillingCenter', [
            'user' => $user,
            'kpis' => $this->buildKpis($organizations, $payments),
            'organizations' => $organizations->map(fn (Organization $organization) => [
                'id' => $organization->id,
                'name' => $organization->name,
                'slug' => $organization->slug,
                'email' => $organization->email,
                'type' => $organization->type,
                'plan' => $organization->subscription_plan,
                'status' => $organization->status,
                'subscription_start_date' => optional($organization->subscription_start_date)->format('Y-m-d'),
                'subscription_end_date' => optional($organization->subscription_end_date)->format('Y-m-d'),
                'daysRemaining' => $organization->subscription_end_date ? $organization->daysUntilExpiry() : null,
                'isExpired' => $organization->subscriptionIsExpired(),
                'activeAccess' => $organization->hasActiveAccess(),
                'students_count' => (int) $organization->students()->count(),
                'staff_count' => (int) $organization->users()
                    ->whereIn('role', ['admin', 'teacher', 'accountant', 'receptionist', 'librarian', 'driver', 'warden'])
                    ->count(),
                'lastPayment' => $this->lastPaymentShape($organization),
            ])->all(),
            'payments' => $payments->map(fn (SubscriptionPayment $payment) => [
                'id' => $payment->id,
                'organization_id' => $payment->organization_id,
                'organization_name' => $payment->organization?->name ?? '-',
                'amount' => (float) $payment->amount,
                'plan_name' => $payment->plan_name,
                'transaction_id' => $payment->transaction_id,
                'payment_method' => $payment->payment_method,
                'status' => $payment->status,
                'payment_date' => optional($payment->payment_date)->format('Y-m-d'),
                'notes' => $payment->notes,
            ])->all(),
            'expiringSoon' => $expiringSoon->map(fn (Organization $organization) => [
                'id' => $organization->id,
                'name' => $organization->name,
                'end_date' => optional($organization->subscription_end_date)->format('Y-m-d'),
                'daysRemaining' => $organization->daysUntilExpiry(),
            ])->all(),
            'toggledOrganizationId' => $toggledStatus,
        ]);
    }

    public function recordPayment(Request $request, Organization $organization): RedirectResponse
    {
        abort_unless($request->user()?->role === 'super_admin', 403);

        $validated = $request->validate([
            'amount' => ['required', 'numeric', 'min:0.01', 'max:999999999'],
            'plan_name' => ['required', 'string', 'max:100'],
            'transaction_id' => ['nullable', 'string', 'max:100'],
            'payment_method' => ['required', Rule::in(['upi', 'card', 'bank_transfer', 'cash', 'other'])],
            'payment_date' => ['required', 'date'],
            'renew_months' => ['nullable', 'integer', 'min:0', 'max:60'],
            'notes' => ['nullable', 'string', 'max:1000'],
        ]);

        SubscriptionPayment::query()->create([
            'organization_id' => $organization->id,
            'amount' => $validated['amount'],
            'plan_name' => $validated['plan_name'],
            'transaction_id' => $validated['transaction_id'] ?? null,
            'payment_method' => $validated['payment_method'],
            'status' => 'completed',
            'payment_date' => $validated['payment_date'],
            'notes' => $validated['notes'] ?? null,
        ]);

        $renewMonths = (int) ($validated['renew_months'] ?? 0);
        if ($renewMonths > 0) {
            $currentEnd = $organization->subscription_end_date;
            $base = $currentEnd && $currentEnd->greaterThan(Carbon::now()->startOfDay())
                ? $currentEnd->copy()
                : Carbon::now();

            $organization->update([
                'subscription_start_date' => $organization->subscription_start_date ?? $base->copy()->toDateString(),
                'subscription_end_date' => $base->copy()->addMonths($renewMonths)->toDateString(),
            ]);
        }

        return redirect()->route('billing-center')
            ->with('success', "Payment recorded for {$organization->name}.");
    }

    public function updateSubscription(Request $request, Organization $organization): RedirectResponse
    {
        abort_unless($request->user()?->role === 'super_admin', 403);

        $validated = $request->validate([
            'plan' => ['required', Rule::in(['free', 'basic', 'premium', 'enterprise'])],
            'status' => ['required', Rule::in(['active', 'inactive', 'suspended'])],
            'start_date' => ['required', 'date'],
            'end_date' => ['required', 'date'],
            'max_students' => ['required', 'integer', 'min:1'],
            'max_staff' => ['required', 'integer', 'min:1'],
        ]);

        $organization->update([
            'subscription_plan' => $validated['plan'],
            'status' => $validated['status'],
            'subscription_start_date' => $validated['start_date'],
            'subscription_end_date' => $validated['end_date'],
            'max_students' => $validated['max_students'],
            'max_staff' => $validated['max_staff'],
        ]);

        return redirect()->route('billing-center')->with('success', "Subscription updated for {$organization->name}.");
    }

    public function toggleStatus(Request $request, Organization $organization): RedirectResponse
    {
        abort_unless($request->user()?->role === 'super_admin', 403);

        $nextStatus = $organization->status === 'suspended' ? 'active' : 'suspended';
        $organization->update(['status' => $nextStatus]);

        return redirect()->route('billing-center', ['organization_id' => $organization->id])
            ->with('success', "{$organization->name} is now {$nextStatus}.");
    }

    private function buildKpis($organizations, $payments): array
    {
        $completed = $payments->where('status', 'completed');

        return [
            'totalOrgs' => $organizations->count(),
            'activeOrgs' => $organizations->filter(fn (Organization $org) => $org->hasActiveAccess())->count(),
            'expiringSoon' => $organizations->filter(fn (Organization $org) => $org->hasActiveAccess() && $org->expiresWithinDays(30))->count(),
            'expiredOrgs' => $organizations->filter(fn (Organization $org) => $org->subscriptionIsExpired())->count(),
            'totalCollected' => round((float) $completed->sum('amount'), 2),
            'paymentCount' => $completed->count(),
            'monthCollected' => round((float) $completed->filter(fn (SubscriptionPayment $payment) => $payment->payment_date?->isSameMonth(now()))->sum('amount'), 2),
        ];
    }

    private function lastPaymentShape(Organization $organization): ?array
    {
        $last = SubscriptionPayment::query()
            ->where('organization_id', $organization->id)
            ->where('status', 'completed')
            ->orderByDesc('payment_date')
            ->first(['amount', 'payment_date']);

        if (! $last) {
            return null;
        }

        return [
            'amount' => (float) $last->amount,
            'payment_date' => optional($last->payment_date)->format('Y-m-d'),
        ];
    }
}