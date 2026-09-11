<?php

namespace App\Http\Controllers;

use App\Models\Organization;
use App\Models\OsmEvaluation;
use App\Models\OsmSession;
use App\Models\OsmSheet;
use App\Models\SchoolClass;
use App\Models\Student;
use App\Models\User;
use Illuminate\Http\RedirectResponse;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\Auth;
use Illuminate\Validation\Rule;
use Inertia\Inertia;
use Inertia\Response;

class OsmController extends Controller
{
    private const STATUSES = ['draft', 'uploading', 'ready', 'evaluating', 'moderation', 'completed', 'archived'];

    public function index(Request $request): Response
    {
        $user = Auth::user();
        $organization = $this->resolveOrganizationForUser($user);
        abort_unless($organization, 403);
        abort_unless(in_array($user->role, ['admin', 'super_admin', 'teacher'], true), 403);

        $tab = in_array($request->query('tab'), ['dashboard', 'sessions', 'evaluate', 'reports', 'guide', 'moderation'], true)
            ? $request->query('tab')
            : 'dashboard';

        $statusFilter = in_array($request->query('status'), self::STATUSES, true) ? $request->query('status') : null;
        $classFilter = $request->integer('class');

        $sessions = OsmSession::query()
            ->where('organization_id', $organization->id)
            ->when($statusFilter, fn ($query) => $query->where('status', $statusFilter))
            ->with('sheets.class:id,name,section')
            ->withCount('sheets')
            ->withCount('evaluations')
            ->orderByDesc('id')
            ->get();

        if ($classFilter) {
            $sessions = $sessions->filter(fn (OsmSession $session) => $session->sheets->contains('class_id', $classFilter));
        }

        $classOptions = SchoolClass::query()
            ->where('organization_id', $organization->id)
            ->orderBy('name')
            ->orderBy('section')
            ->get(['id', 'name', 'section'])
            ->map(fn (SchoolClass $class) => [
                'id' => $class->id,
                'label' => $class->section ? "{$class->name} / {$class->section}" : $class->name,
            ])
            ->values();

        $allSheets = OsmSheet::query()
            ->where('organization_id', $organization->id)
            ->with('class:id,name,section')
            ->with('session:id,name,status,term')
            ->get();

        $pendingModeration = OsmEvaluation::query()
            ->where('organization_id', $organization->id)
            ->where('status', 'pending')
            ->with('student:id,first_name,last_name,admission_no')
            ->with('sheet:id,subject,class_id')
            ->with('session:id,name,term')
            ->with('evaluator:id,name')
            ->latest()
            ->take(200)
            ->get();

        $sessionPayload = $sessions->map(function (OsmSession $session) {
            $sheets = $session->sheets;
            $sheetsTotal = $sheets->sum('sheets_count') + 0;
            $evaluated = $sheets->sum('evaluated_count') + 0;
            $firstSheet = $sheets->first();
            $classLabel = $firstSheet?->class
                ? ($firstSheet->class->section ? "{$firstSheet->class->name} / {$firstSheet->class->section}" : $firstSheet->class->name)
                : null;

            return [
                'id' => $session->id,
                'name' => $session->name,
                'term' => $session->term,
                'status' => $session->status,
                'notes' => $session->notes,
                'classLabel' => $classLabel,
                'subject' => $firstSheet?->subject,
                'sheetsCount' => $session->sheets_count,
                'sheetsTotal' => $sheetsTotal,
                'evaluated' => $evaluated,
                'evaluationCount' => $session->evaluations_count,
                'createdAt' => $session->created_at?->toDateString(),
                'sheets' => $session->sheets->map(fn (OsmSheet $sheet) => [
                    'id' => $sheet->id,
                    'classId' => $sheet->class_id,
                    'classLabel' => $sheet->class
                        ? ($sheet->class->section ? "{$sheet->class->name} / {$sheet->class->section}" : $sheet->class->name)
                        : null,
                    'subject' => $sheet->subject,
                    'sheetsCount' => $sheet->sheets_count,
                    'evaluatedCount' => $sheet->evaluated_count,
                ])->values()->all(),
            ];
        })->values()->all();

        $evaluations = OsmEvaluation::query()
            ->where('organization_id', $organization->id)
            ->with('student:id,first_name,last_name,admission_no')
            ->with('sheet:id,subject,class_id')
            ->with('session:id,name,term')
            ->with('evaluator:id,name')
            ->with('moderator:id,name')
            ->latest()
            ->take(200)
            ->get()
            ->map(fn (OsmEvaluation $evaluation) => [
                'id' => $evaluation->id,
                'session' => $evaluation->session?->name,
                'term' => $evaluation->session?->term,
                'sheetId' => $evaluation->sheet_id,
                'subject' => $evaluation->sheet?->subject,
                'student' => $evaluation->student?->first_name.' '.$evaluation->student?->last_name,
                'admissionNo' => $evaluation->student?->admission_no,
                'score' => $evaluation->score,
                'gradeLevel' => $evaluation->grade_level,
                'feedback' => $evaluation->feedback,
                'status' => $evaluation->status,
                'evaluatedBy' => $evaluation->evaluator?->name,
                'evaluatedAt' => $evaluation->evaluated_at?->toDateTimeString(),
                'moderatedBy' => $evaluation->moderator?->name,
                'moderatedAt' => $evaluation->moderated_at?->toDateTimeString(),
            ])
            ->values()
            ->all();

        $students = Student::query()
            ->where('organization_id', $organization->id)
            ->get(['id', 'first_name', 'last_name', 'admission_no', 'class_id'])
            ->map(fn (Student $student) => [
                'id' => $student->id,
                'name' => $student->first_name.' '.$student->last_name,
                'admission_no' => $student->admission_no,
                'class_id' => $student->class_id,
            ])
            ->values();

        $statusCounts = [];
        $totalScore = 0.0;
        $scored = 0;
        foreach ($evaluations as $evaluation) {
            $statusCounts[$evaluation['status']] = ($statusCounts[$evaluation['status']] ?? 0) + 1;
            if ($evaluation['score'] !== null) {
                $totalScore += (float) $evaluation['score'];
                $scored++;
            }
        }

        return Inertia::render('dashboard/Osm', [
            'user' => $user,
            'tab' => $tab,
            'sessions' => $sessionPayload,
            'evaluations' => $evaluations,
            'pendingModeration' => $pendingModeration->map(fn (OsmEvaluation $evaluation) => [
                'id' => $evaluation->id,
                'session' => $evaluation->session?->name,
                'term' => $evaluation->session?->term,
                'subject' => $evaluation->sheet?->subject,
                'student' => $evaluation->student?->first_name.' '.$evaluation->student?->last_name,
                'admissionNo' => $evaluation->student?->admission_no,
                'score' => $evaluation->score,
                'gradeLevel' => $evaluation->grade_level,
                'feedback' => $evaluation->feedback,
                'evaluatedBy' => $evaluation->evaluator?->name,
                'evaluatedAt' => $evaluation->evaluated_at?->toDateTimeString(),
            ])->values()->all(),
            'classOptions' => $classOptions->all(),
            'students' => $students->all(),
            'statusOptions' => self::STATUSES,
            'summary' => [
                'sessions' => $sessions->count(),
                'sheets' => $allSheets->count(),
                'evaluations' => count($evaluations),
                'pendingModeration' => $pendingModeration->count(),
                'averageScore' => $scored > 0 ? round($totalScore / $scored, 2) : 0,
                'statusCounts' => $statusCounts,
                'sheetsTotal' => (int) $allSheets->sum('sheets_count'),
                'evaluatedTotal' => (int) $allSheets->sum('evaluated_count'),
                'studentsAssessed' => collect($evaluations)->pluck('student')->unique()->count(),
            ],
        ]);
    }

    public function storeSession(Request $request): RedirectResponse
    {
        $user = $request->user();
        $organization = $this->resolveOrganizationForUser($user);
        abort_unless($organization, 403);

        $validated = $request->validate([
            'name' => ['required', 'string', 'max:255'],
            'term' => ['nullable', 'string', 'max:60'],
            'status' => ['nullable', Rule::in(self::STATUSES)],
            'notes' => ['nullable', 'string', 'max:2000'],
        ]);

        $session = OsmSession::query()->create([
            'organization_id' => $organization->id,
            'name' => $validated['name'],
            'term' => $validated['term'] ?? 'Term1',
            'status' => $validated['status'] ?? 'draft',
            'notes' => $validated['notes'] ?? null,
            'created_by' => $user->id,
        ]);

        return redirect()->route('osm', ['tab' => 'sessions'])->with('success', "Session \"{$session->name}\" created.");
    }

    public function updateSession(Request $request, OsmSession $session): RedirectResponse
    {
        $user = $request->user();
        $organization = $this->resolveOrganizationForUser($user);
        abort_unless($organization, 403);
        abort_unless($session->organization_id === $organization->id, 404);

        $validated = $request->validate([
            'name' => ['nullable', 'string', 'max:255'],
            'term' => ['nullable', 'string', 'max:60'],
            'status' => ['nullable', Rule::in(self::STATUSES)],
            'notes' => ['nullable', 'string', 'max:2000'],
        ]);

        $session->update(array_filter($validated, fn ($value) => $value !== null));

        return back()->with('success', 'Session updated.');
    }

    public function destroySession(Request $request, OsmSession $session): RedirectResponse
    {
        $user = $request->user();
        $organization = $this->resolveOrganizationForUser($user);
        abort_unless($organization, 403);
        abort_unless($session->organization_id === $organization->id, 404);

        $session->delete();

        return back()->with('success', 'Session deleted.');
    }

    public function storeSheet(Request $request): RedirectResponse
    {
        $user = $request->user();
        $organization = $this->resolveOrganizationForUser($user);
        abort_unless($organization, 403);

        $validated = $request->validate([
            'osm_session_id' => ['required', 'integer', 'exists:osm_sessions,id'],
            'class_id' => ['nullable', 'integer'],
            'subject' => ['nullable', 'string', 'max:255'],
            'sheets_count' => ['nullable', 'integer', 'min:0'],
        ]);

        $session = OsmSession::query()->where('organization_id', $organization->id)->findOrFail($validated['osm_session_id']);

        if (!empty($validated['class_id'])) {
            SchoolClass::query()->where('organization_id', $organization->id)->findOrFail($validated['class_id']);
        }

        $validated['organization_id'] = $organization->id;
        $validated['sheets_count'] = $validated['sheets_count'] ?? 0;

        OsmSheet::query()->create($validated);

        return back()->with('success', "Sheet added to \"{$session->name}\".");
    }

    public function storeEvaluation(Request $request): RedirectResponse
    {
        $user = $request->user();
        $organization = $this->resolveOrganizationForUser($user);
        abort_unless($organization, 403);

        $validated = $request->validate([
            'osm_sheet_id' => ['required', 'integer'],
            'rows' => ['required', 'array', 'min:1'],
            'rows.*.student_id' => ['required', 'integer'],
            'rows.*.score' => ['nullable', 'numeric', 'between:0,25'],
            'rows.*.grade_level' => ['nullable', 'string', 'max:60'],
            'rows.*.feedback' => ['nullable', 'string', 'max:2000'],
        ]);

        $sheet = OsmSheet::query()->where('organization_id', $organization->id)->findOrFail($validated['osm_sheet_id']);
        $session = $sheet->session;

        $created = 0;
        foreach ($validated['rows'] as $row) {
            Student::query()->where('organization_id', $organization->id)->findOrFail($row['student_id']);
            OsmEvaluation::query()->updateOrCreate(
                [
                    'organization_id' => $organization->id,
                    'osm_sheet_id' => $sheet->id,
                    'student_id' => $row['student_id'],
                ],
                [
                    'osm_session_id' => $session->id,
                    'score' => $row['score'] ?? null,
                    'grade_level' => $row['grade_level'] ?? null,
                    'feedback' => $row['feedback'] ?? null,
                    'status' => 'pending',
                    'evaluated_by' => $user->id,
                    'evaluated_at' => now(),
                ],
            );
            $created++;
        }

        $sheet->update([
            'evaluated_count' => $sheet->evaluations()->where('status', '!=', 'rejected')->count(),
        ]);

        if ($session->status === 'ready' || $session->status === 'draft' || $session->status === 'uploading') {
            $session->update(['status' => 'evaluating']);
        }

        return back()->with('success', "{$created} evaluation(s) recorded.");
    }

    public function moderate(Request $request, OsmEvaluation $evaluation): RedirectResponse
    {
        $user = $request->user();
        $organization = $this->resolveOrganizationForUser($user);
        abort_unless($organization, 403);
        abort_unless($evaluation->organization_id === $organization->id, 404);

        $validated = $request->validate([
            'status' => ['required', Rule::in(['ok', 'rejected'])],
        ]);

        $evaluation->update([
            'status' => $validated['status'],
            'moderated_by' => $user->id,
            'moderated_at' => now(),
        ]);

        $sheet = $evaluation->sheet;
        if ($sheet) {
            $sheet->update(['evaluated_count' => $sheet->evaluations()->where('status', '!=', 'rejected')->count()]);
        }

        return back()->with('success', 'Moderation status updated.');
    }

    private function resolveOrganizationForUser(User $user): ?Organization
    {
        if ($user->organization_id) {
            return Organization::query()->find($user->organization_id);
        }

        if ($user->role === 'super_admin') {
            return Organization::query()->first();
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