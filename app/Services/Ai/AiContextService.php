<?php

namespace App\Services\Ai;

use App\Models\Attendance;
use App\Models\Homework;
use App\Models\OnlineClass;
use App\Models\Organization;
use App\Models\Student;
use App\Models\StudentFee;
use App\Models\SupportTicket;
use App\Models\TeacherEvaluation;

class AiContextService
{
    public function snapshot(Organization $organization): string
    {
        $today = now()->toDateString();

        $snapshot = [
            'organization' => $organization->name,
            'total_students' => Student::where('organization_id', $organization->id)->count(),
            'today' => $today,
            'attendance_today' => [
                'present' => Attendance::where('organization_id', $organization->id)->where('date', $today)->where('status', 'present')->count(),
                'absent' => Attendance::where('organization_id', $organization->id)->where('date', $today)->where('status', 'absent')->count(),
                'late' => Attendance::where('organization_id', $organization->id)->where('date', $today)->where('status', 'late')->count(),
            ],
            'fee_defaulters' => StudentFee::where('organization_id', $organization->id)
                ->where('balance', '>', 0)
                ->whereIn('status', ['pending', 'partial', 'overdue'])
                ->count(),
            'upcoming_online_classes' => OnlineClass::where('organization_id', $organization->id)
                ->where('starts_at', '>=', now())
                ->orderBy('starts_at')
                ->limit(5)
                ->get(['title', 'starts_at'])
                ->map(fn (OnlineClass $class) => [
                    'title' => $class->title,
                    'starts_at' => $class->starts_at?->toIso8601String(),
                ])
                ->all(),
            'open_helpdesk_tickets' => SupportTicket::where('organization_id', $organization->id)
                ->where('status', '!=', 'resolved')
                ->count(),
            'pending_teacher_evaluations' => TeacherEvaluation::where('organization_id', $organization->id)
                ->where('status', 'draft')
                ->count(),
            'homework_due_today' => Homework::where('organization_id', $organization->id)
                ->whereDate('due_date', $today)
                ->count(),
        ];

        return json_encode($snapshot, JSON_UNESCAPED_SLASHES | JSON_UNESCAPED_UNICODE);
    }

    public function systemPrompt(Organization $organization): string
    {
        return 'You are the AI assistant for the school management system. '
            . 'Answer concisely in the language the user asks in. '
            . 'Base your answer ONLY on this live school snapshot if the question needs live data, otherwise answer generally. '
            . 'If the answer is not available, say so honestly. Live snapshot (JSON):' . PHP_EOL . $this->snapshot($organization);
    }
}