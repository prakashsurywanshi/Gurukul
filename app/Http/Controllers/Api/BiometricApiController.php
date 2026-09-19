<?php

namespace App\Http\Controllers\Api;

use App\Http\Controllers\Controller;
use App\Models\Attendance;
use App\Models\BiometricDevice;
use App\Models\BiometricLog;
use App\Models\Organization;
use App\Models\Student;
use Carbon\Carbon;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;

class BiometricApiController extends Controller
{
    public function status(Request $request): JsonResponse
    {
        return response()->json([
            'service' => 'biometric-sync',
            'configured' => $this->anyKeyConfigured(),
            'time' => now()->toIso8601String(),
        ]);
    }

    public function attendance(Request $request): JsonResponse
    {
        if (!$this->anyKeyConfigured()) {
            return response()->json(['message' => 'Biometric sync is not configured.'], 503);
        }

        $resolved = $this->resolveKey($request);

        if (!$resolved['authenticated']) {
            return response()->json(['message' => 'Invalid biometric sync key.'], 401);
        }

        $validated = $request->validate([
            'admission_no' => ['required', 'string', 'max:100'],
            'datetime' => ['required', 'date'],
            'device_id' => ['nullable', 'string', 'max:100'],
            'direction' => ['nullable', 'in:in,out'],
            'score' => ['nullable', 'numeric', 'min:0', 'max:100'],
            'event_id' => ['nullable', 'string', 'max:200'],
        ]);

        $student = Student::query()
            ->when($resolved['organization_id'], fn ($query, $orgId) => $query->where('organization_id', $orgId))
            ->where('admission_no', $validated['admission_no'])
            ->first();

        if (!$student) {
            return response()->json(['message' => 'No student found for admission number ' . $validated['admission_no'] . '.'], 404);
        }

        $eventId = $validated['event_id'] ?? null;

        if ($eventId && Attendance::query()->where('remarks', 'biometric:' . $eventId)->exists()) {
            return response()->json(['message' => 'Duplicate event ignored.', 'ignored' => true]);
        }

        $date = Carbon::parse($validated['datetime'])->toDateString();
        $time = Carbon::parse($validated['datetime'])->format('H:i:s');
        $direction = $validated['direction'] ?? 'in';

        $classId = $this->currentClassId($student);

        if (!$classId) {
            return response()->json(['message' => 'No current class for this student. Set the academic session first.'], 422);
        }

        $records = Attendance::query()
            ->where('student_id', $student->id)
            ->where('date', $date)
            ->get();

        if ($records->isEmpty()) {
            Attendance::query()->create([
                'organization_id' => $student->organization_id,
                'student_id' => $student->id,
                'class_id' => $classId,
                'date' => $date,
                'status' => 'present',
                'check_in_time' => $direction === 'in' ? $time : null,
                'check_out_time' => $direction === 'out' ? $time : null,
                'remarks' => 'biometric:' . ($eventId ?? bin2hex(random_bytes(8))),
                'marked_by' => $this->systemUserId(),
            ]);
        } else {
            $record = $records->first();

            if ($direction === 'in' && !$record->check_in_time) {
                $record->check_in_time = $time;
            }

            if ($direction === 'out') {
                $record->check_out_time = $time;
            }

            if (!$record->check_in_time && $direction === 'out') {
                $record->check_in_time = $time;
            }

            $record->status = 'present';
            $record->remarks = 'biometric-sync';
            $record->save();
        }

        return response()->json([
            'message' => 'Attendance synced.',
            'student_id' => (string) $student->id,
            'admission_no' => $student->admission_no,
            'date' => $date,
            'time' => $time,
            'direction' => $direction,
        ]);
    }

    public function logs(Request $request): JsonResponse
    {
        if (!$this->anyKeyConfigured()) {
            return response()->json(['message' => 'Biometric sync is not configured.'], 503);
        }

        $resolved = $this->resolveKey($request);

        if (!$resolved['authenticated']) {
            return response()->json(['message' => 'Invalid biometric sync key.'], 401);
        }

        $validated = $request->validate([
            'logs' => ['required', 'array', 'min:1', 'max:500'],
            'logs.*.device_serial' => ['nullable', 'string', 'max:100'],
            'logs.*.uid' => ['nullable', 'string', 'max:200'],
            'logs.*.event_time' => ['nullable', 'date'],
            'logs.*.direction' => ['nullable', 'in:in,out'],
            'logs.*.matched' => ['sometimes', 'boolean'],
            'logs.*.action' => ['nullable', 'string', 'max:255'],
            'logs.*.person_name' => ['nullable', 'string', 'max:255'],
        ]);

        $devices = BiometricDevice::query()
            ->when($resolved['organization_id'], fn ($query, $orgId) => $query->where('organization_id', $orgId))
            ->whereIn('serial_number', collect($validated['logs'])->pluck('device_serial')->filter()->unique()->values())
            ->get()
            ->keyBy('serial_number');

        $created = 0;

        foreach ($validated['logs'] as $entry) {
            $deviceId = !empty($entry['device_serial']) ? $devices->get($entry['device_serial'])?->id : null;

            BiometricLog::query()->create([
                'organization_id' => $resolved['organization_id'],
                'biometric_device_id' => $deviceId,
                'log_type' => 'agent',
                'person_type' => !empty($entry['person_name']) ? 'unknown' : null,
                'person_name' => $entry['person_name'] ?? null,
                'uid' => $entry['uid'] ?? null,
                'direction' => $entry['direction'] ?? null,
                'matched' => $entry['matched'] ?? false,
                'action' => $entry['action'] ?? 'agent:punch',
                'details' => json_encode([
                    'device_serial' => $entry['device_serial'] ?? null,
                    'source' => 'windows-agent',
                ], JSON_UNESCAPED_SLASHES),
                'event_time' => isset($entry['event_time'])
                    ? Carbon::parse($entry['event_time'])
                    : now(),
            ]);

            $created++;
        }

        return response()->json([
            'message' => $created . ' biometric log(s) recorded.',
            'recorded' => $created,
        ], 201);
    }

    private function anyKeyConfigured(): bool
    {
        if ((bool) env('BIOMETRIC_SYNC_KEY', false)) {
            return true;
        }

        return Organization::query()
            ->where('settings->biometric->sync_key', '!=', '')
            ->exists();
    }

    private function resolveKey(Request $request): array
    {
        $requestKey = (string) $request->header('X-Biometric-Key', '');

        if (blank($requestKey)) {
            return ['authenticated' => false, 'organization_id' => null];
        }

        $envKey = env('BIOMETRIC_SYNC_KEY', '');
        if (filled($envKey) && hash_equals($envKey, $requestKey)) {
            return ['authenticated' => true, 'organization_id' => null];
        }

        $organization = Organization::query()
            ->where('settings->biometric->sync_key', $requestKey)
            ->first();

        if ($organization) {
            return ['authenticated' => true, 'organization_id' => $organization->id];
        }

        return ['authenticated' => false, 'organization_id' => null];
    }

    private function currentClassId(Student $student): ?int
    {
        return $student->academicHistories()
            ->where('is_current', true)
            ->whereNotNull('class_id')
            ->value('class_id');
    }

    private function systemUserId(): int
    {
        $admin = \App\Models\User::query()
            ->where('role', 'super_admin')
            ->orWhere('role', 'admin')
            ->orderBy('id')
            ->value('id');

        return (int) ($admin ?? 1);
    }
}