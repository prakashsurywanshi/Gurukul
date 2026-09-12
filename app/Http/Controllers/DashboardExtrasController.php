<?php

namespace App\Http\Controllers;

use App\Models\BiometricLog;
use App\Models\FestivalGreeting;
use App\Models\Organization;
use Illuminate\Http\Request;
use Inertia\Inertia;
use Inertia\Response;

class DashboardExtrasController extends Controller
{
    public function contactSupport(Request $request): Response
    {
        return Inertia::render('dashboard/ContactSupport', [
            'user' => $request->user(),
        ]);
    }

    public function allTransactions(Request $request): Response
    {
        return Inertia::render('dashboard/AllTransactions', [
            'user' => $request->user(),
        ]);
    }

    public function dataValidator(Request $request): Response
    {
        return Inertia::render('dashboard/DataValidator', [
            'user' => $request->user(),
        ]);
    }

    public function inspections(Request $request): Response
    {
        return Inertia::render('dashboard/Inspections', [
            'user' => $request->user(),
        ]);
    }

    public function classworkLogbook(Request $request): Response
    {
        return Inertia::render('dashboard/ClassworkLogbook', [
            'user' => $request->user(),
        ]);
    }

    public function creatives(Request $request): Response
    {
        $organization = $this->resolveOrganizationForUser($request->user());

        return Inertia::render('dashboard/Creatives', [
            'user' => $request->user(),
            'festivals' => $organization
                ? FestivalGreeting::query()
                    ->where('organization_id', $organization->id)
                    ->orderByDesc('festival_date')
                    ->get()
                    ->map(fn (FestivalGreeting $greeting) => [
                        'id' => $greeting->id,
                        'title' => $greeting->title,
                        'message' => $greeting->message,
                        'festivalDate' => $greeting->festival_date?->toDateString(),
                        'status' => $greeting->status,
                        'sentCount' => $greeting->sent_count,
                    ])
                : [],
        ]);
    }

    public function agentLogs(Request $request): Response
    {
        $organization = $this->resolveOrganizationForUser($request->user());

        $logs = $organization
            ? BiometricLog::query()
                ->where('organization_id', $organization->id)
                ->with('device:id,name,location')
                ->latest('event_time')
                ->latest('id')
                ->take(200)
                ->get()
                ->map(fn (BiometricLog $log) => [
                    'id' => $log->id,
                    'logType' => $log->log_type,
                    'deviceName' => $log->device?->name ?? '—',
                    'deviceLocation' => $log->device?->location,
                    'personType' => $log->person_type,
                    'personName' => $log->person_name,
                    'uid' => $log->uid,
                    'direction' => $log->direction,
                    'matched' => $log->matched,
                    'action' => $log->action,
                    'details' => $log->details,
                    'eventTime' => $log->event_time?->toDateTimeString(),
                ])
                ->values()
            : collect();

        return Inertia::render('dashboard/AgentLogs', [
            'user' => $request->user(),
            'logs' => $logs,
            'total' => $logs->count(),
            'agentCount' => $logs->filter(fn ($log) => $log['logType'] === 'agent')->count(),
            'attendanceCount' => $logs->filter(fn ($log) => $log['logType'] === 'attendance')->count(),
            'faceCount' => $logs->filter(fn ($log) => $log['logType'] === 'face')->count(),
        ]);
    }

    private function resolveOrganizationForUser($user): ?Organization
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