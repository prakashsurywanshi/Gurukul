<?php

namespace App\Services\AiAnalytics;

use App\Models\Attendance;
use App\Models\ExamResult;
use App\Models\Lead;
use App\Models\Student;
use App\Models\StudentFee;
use Carbon\Carbon;

class ScoreEngine
{
    public const TIER_HIGH = 'high';

    public const TIER_MEDIUM = 'medium';

    public const TIER_LOW = 'low';

    /**
     * Deterministically score a lead for likelihood of conversion.
     *
     * @return array{score: int, tier: string, breakdown: array<string, int>}
     */
    public function scoreLead(Lead $lead): array
    {
        $sourceWeights = [
            'website' => 25,
            'referral' => 15,
            'social' => 10,
            'call' => 5,
            'walkin' => 5,
        ];

        $breakdown = [];
        $points = 0;

        $source = $sourceWeights[$lead->source] ?? 0;
        if ($source > 0) {
            $breakdown['source'] = $source;
        }

        $ageDays = (int) Carbon::parse($lead->created_at)->diffInDays(Carbon::now());
        if ($ageDays <= 3) {
            $breakdown['recent'] = 30;
        } elseif ($ageDays <= 7) {
            $breakdown['recent'] = 20;
        } elseif ($ageDays <= 14) {
            $breakdown['recent'] = 10;
        } elseif ($ageDays <= 30) {
            $breakdown['recent'] = 5;
        }

        $priorityWeights = ['high' => 20, 'medium' => 10, 'low' => 0];
        if (($priorityWeights[$lead->priority] ?? 0) > 0) {
            $breakdown['priority'] = $priorityWeights[$lead->priority];
        }

        $statusWeights = ['new' => 15, 'contacted' => 10, 'interested' => 10];
        if (isset($statusWeights[$lead->status])) {
            $breakdown['status'] = $statusWeights[$lead->status];
        }

        if (! empty($lead->assigned_to)) {
            $breakdown['assigned'] = 10;
        }

        if (! empty($lead->follow_up_date)) {
            $breakdown['scheduled_follow_up'] = 5;
        }

        $points = (int) ($source + array_sum($breakdown));

        return [
            'score' => min(100, max(0, $points)),
            'tier' => $this->tier($points),
            'breakdown' => $breakdown,
        ];
    }

    /**
     * Deterministically score an unpaid fee for recovery priority.
     *
     * @return array{score: int, tier: string, breakdown: array<string, int>}
     */
    public function scoreFeeDefaulter(StudentFee $fee): array
    {
        $breakdown = [];
        $points = 0;

        $balance = (float) $fee->balance;
        if ($balance <= 0) {
            return ['score' => 0, 'tier' => self::TIER_LOW, 'breakdown' => ['paid' => 0]];
        }

        $overdueDays = $fee->due_date ? (int) Carbon::parse($fee->due_date)->diffInDays(Carbon::now(), false) : 0;

        if ($overdueDays > 60) {
            $breakdown['overdue_days'] = 75;
        } elseif ($overdueDays > 30) {
            $breakdown['overdue_days'] = 60;
        } elseif ($overdueDays > 7) {
            $breakdown['overdue_days'] = 40;
        } elseif ($overdueDays > 0) {
            $breakdown['overdue_days'] = 20;
        } elseif ($overdueDays <= 0) {
            $breakdown['overdue_days'] = 10;
        }

        if ($balance >= 10000) {
            $breakdown['amount'] = 15;
        } elseif ($balance >= 5000) {
            $breakdown['amount'] = 10;
        } elseif ($balance >= 1000) {
            $breakdown['amount'] = 5;
        }

        if ((float) $fee->fine > 0) {
            $breakdown['repeat_past_due'] = 5;
        }

        $points = array_sum($breakdown);

        return [
            'score' => min(100, max(0, $points)),
            'tier' => $this->tier($points),
            'breakdown' => $breakdown,
        ];
    }

    /**
     * Deterministically score a student's at-risk likelihood.
     *
     * @return array{score: int, tier: string, breakdown: array<string, int>}
     */
    public function scoreStudentRisk(Student $student, int $organizationId): array
    {
        $breakdown = [];
        $points = 0;

        $attendance = Attendance::query()
            ->where('organization_id', $organizationId)
            ->where('student_id', $student->id)
            ->get();

        if ($attendance->isNotEmpty()) {
            $total = $attendance->count();
            $present = $attendance->filter(fn ($entry) => in_array($entry->status, ['present', 'late', 'half_day'], true))->count();
            $rate = $total > 0 ? ($present / $total) * 100 : 0;

            if ($rate < 60) {
                $breakdown['low_attendance'] = 45;
            } elseif ($rate < 75) {
                $breakdown['low_attendance'] = 35;
            } elseif ($rate < 90) {
                $breakdown['low_attendance'] = 20;
            }
        }

        $recentAbsences = Attendance::query()
            ->where('organization_id', $organizationId)
            ->where('student_id', $student->id)
            ->where('date', '>=', Carbon::now()->subDays(30))
            ->whereNotIn('status', ['present', 'late', 'half_day'])
            ->count();

        if ($recentAbsences >= 10) {
            $breakdown['recent_absences'] = 20;
        } elseif ($recentAbsences >= 5) {
            $breakdown['recent_absences'] = 10;
        }

        $fees = StudentFee::query()
            ->where('organization_id', $organizationId)
            ->where('student_id', $student->id)
            ->where('balance', '>', 0)
            ->get();

        if ($fees->isNotEmpty()) {
            $totalBalance = (float) $fees->sum('balance');
            $breakdown['unpaid_fees'] = $totalBalance > 0 ? 15 : 0;

            $overdue = $fees->filter(fn (StudentFee $fee) => $fee->due_date && $fee->due_date->lt(Carbon::now()->subDays(30)))->count();
            if ($overdue > 0) {
                $breakdown['long_overdue_fees'] = $overdue >= 2 ? 20 : 15;
            }
        }

        $results = ExamResult::query()
            ->where('organization_id', $organizationId)
            ->where('student_id', $student->id)
            ->where('is_absent', false)
            ->whereNotNull('obtained_marks')
            ->whereNotNull('total_marks')
            ->get();

        if ($results->isNotEmpty()) {
            $percent = $results->map(fn (ExamResult $result) => (float) $result->total_marks > 0
                ? ((float) $result->obtained_marks / (float) $result->total_marks) * 100
                : 0)->avg();

            if ($percent < 35) {
                $breakdown['low_marks'] = 20;
            } elseif ($percent < 45) {
                $breakdown['low_marks'] = 10;
            }
        }

        $points = array_sum(array_filter($breakdown, fn ($value) => $value > 0));

        return [
            'score' => min(100, max(0, $points)),
            'tier' => $this->tier($points),
            'breakdown' => $breakdown,
        ];
    }

    public function tier(int $score): string
    {
        if ($score >= 70) {
            return self::TIER_HIGH;
        }

        if ($score >= 40) {
            return self::TIER_MEDIUM;
        }

        return self::TIER_LOW;
    }
}