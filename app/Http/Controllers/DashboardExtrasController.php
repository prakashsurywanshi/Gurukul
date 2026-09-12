<?php

namespace App\Http\Controllers;

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
        return Inertia::render('dashboard/Creatives', [
            'user' => $request->user(),
        ]);
    }

    public function agentLogs(Request $request): Response
    {
        return Inertia::render('dashboard/AgentLogs', [
            'user' => $request->user(),
        ]);
    }
}