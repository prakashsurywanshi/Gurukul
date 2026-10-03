<?php

namespace App\Http\Controllers\Api;

use App\Http\Controllers\Api\Concerns\ResolvesHrContext;
use App\Http\Controllers\Controller;
use App\Models\StaffAttendance;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\Auth;
use Illuminate\Validation\Rule;

class StaffAttendanceApiController extends Controller
{
    use ResolvesHrContext;

    public const STATUSES = ['present', 'late', 'half_day', 'absent'];

    public function index(Request $request)
    {
        $user = Auth::user();
        $organization = $this->resolveHrOrganization($user);

        if (! $organization) {
            return response()->json(['success' => false, 'message' => 'No organization linked to this account.'], 403);
        }

        $date = $request->query('date');
        $date = is_string($date) && strtotime($date) !== false
            ? date('Y-m-d', strtotime($date))
            : now()->toDateString();

        $attendance = StaffAttendance::query()
            ->where('organization_id', $organization->id)
            ->whereDate('date', $date)
            ->get()
            ->mapWithKeys(fn (StaffAttendance $record) => [
                (string) $record->user_id => $record->status,
            ]);

        return response()->json([
            'success' => true,
            'data' => [
                'date' => $date,
                'statuses' => self::STATUSES,
                'can_manage' => $this->canManageHr($user, $organization),
                'staff' => $this->hrStaffRecords($organization),
                'attendance' => $attendance,
            ],
        ]);
    }

    public function store(Request $request)
    {
        $user = Auth::user();
        $organization = $this->resolveHrOrganization($user);

        if (! $organization) {
            return response()->json(['success' => false, 'message' => 'No organization linked to this account.'], 403);
        }

        if (! $this->canManageHr($user, $organization)) {
            return response()->json(['success' => false, 'message' => 'Unauthorized'], 403);
        }

        $validated = $request->validate([
            'date' => ['required', 'date'],
            'entries' => ['required', 'array', 'min:1'],
            'entries.*.staff_id' => [
                'required',
                Rule::exists('users', 'id')->where(fn ($query) => $query->where('organization_id', $organization->id)),
            ],
            'entries.*.status' => ['required', Rule::in(self::STATUSES)],
        ]);

        $staffIds = collect($validated['entries'])->pluck('staff_id')->all();
        $this->ensureHrStaffBelongToOrganization($staffIds, $organization);

        foreach ($validated['entries'] as $entry) {
            StaffAttendance::query()->updateOrCreate(
                [
                    'organization_id' => $organization->id,
                    'user_id' => $entry['staff_id'],
                    'date' => $validated['date'],
                ],
                [
                    'status' => $entry['status'],
                    'marked_by' => $user->id,
                ]
            );
        }

        return response()->json([
            'success' => true,
            'message' => 'Staff attendance saved successfully.',
        ]);
    }
}
