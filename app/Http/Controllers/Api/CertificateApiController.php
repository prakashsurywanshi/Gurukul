<?php

namespace App\Http\Controllers\Api;

use App\Http\Controllers\Controller;
use App\Models\CertificateTemplate;
use App\Models\IssuedCertificate;
use App\Models\Student;
use App\Models\Organization;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\Auth;
use Illuminate\Support\Facades\Storage;
use Illuminate\Support\Str;

class CertificateApiController extends Controller
{
    public function getOverview()
    {
        $user = Auth::user();
        $organizationId = $user->organization_id;

        $templateCount = CertificateTemplate::where('organization_id', $organizationId)->count();
        $issuedCount = IssuedCertificate::where('organization_id', $organizationId)->count();
        $activeTemplates = CertificateTemplate::where('organization_id', $organizationId)->where('status', 'active')->count();
        $pendingIssuances = IssuedCertificate::where('organization_id', $organizationId)->whereNull('issue_date')->count();

        return response()->json([
            'success' => true,
            'data' => [
                'template_count' => $templateCount,
                'issued_count' => $issuedCount,
                'active_templates' => $activeTemplates,
                'pending_issuances' => $pendingIssuances,
            ],
        ]);
    }

    public function indexTemplates()
    {
        $user = Auth::user();
        $organizationId = $user->organization_id;

        $templates = CertificateTemplate::where('organization_id', $organizationId)
            ->withCount('issuedCertificates')
            ->orderBy('created_at', 'desc')
            ->get();

        return response()->json([
            'success' => true,
            'data' => $templates,
        ]);
    }

    public function showTemplate(CertificateTemplate $template)
    {
        $user = Auth::user();
        if ($template->organization_id !== $user->organization_id) {
            return response()->json(['success' => false, 'message' => 'Unauthorized'], 403);
        }

        return response()->json([
            'success' => true,
            'data' => $template->load('issuedCertificates'),
        ]);
    }

    public function storeTemplate(Request $request)
    {
        $user = Auth::user();

        $validated = $request->validate([
            'title' => 'required|string|max:255',
            'type' => 'required|string|max:100',
            'description' => 'nullable|string',
            'template_design' => 'nullable|array',
            'design_settings' => 'nullable|array',
            'status' => 'nullable|string|in:active,inactive,draft',
        ]);

        $template = CertificateTemplate::create([
            'organization_id' => $user->organization_id,
            'title' => $validated['title'],
            'type' => $validated['type'],
            'description' => $validated['description'] ?? '',
            'template_design' => $validated['template_design'] ?? [],
            'design_settings' => $validated['design_settings'] ?? [],
            'status' => $validated['status'] ?? 'active',
        ]);

        return response()->json([
            'success' => true,
            'message' => 'Certificate template created successfully',
            'data' => $template,
        ], 201);
    }

    public function updateTemplate(Request $request, CertificateTemplate $template)
    {
        $user = Auth::user();
        if ($template->organization_id !== $user->organization_id) {
            return response()->json(['success' => false, 'message' => 'Unauthorized'], 403);
        }

        $validated = $request->validate([
            'title' => 'sometimes|required|string|max:255',
            'type' => 'sometimes|required|string|max:100',
            'description' => 'nullable|string',
            'template_design' => 'nullable|array',
            'design_settings' => 'nullable|array',
            'status' => 'sometimes|required|string|in:active,inactive,draft',
        ]);

        $template->update($validated);

        return response()->json([
            'success' => true,
            'message' => 'Certificate template updated successfully',
            'data' => $template,
        ]);
    }

    public function destroyTemplate(CertificateTemplate $template)
    {
        $user = Auth::user();
        if ($template->organization_id !== $user->organization_id) {
            return response()->json(['success' => false, 'message' => 'Unauthorized'], 403);
        }

        $template->delete();

        return response()->json([
            'success' => true,
            'message' => 'Certificate template deleted successfully',
        ]);
    }

    public function indexIssuedCertificates(Request $request)
    {
        $user = Auth::user();
        $organizationId = $user->organization_id;

        $query = IssuedCertificate::where('organization_id', $organizationId)
            ->with(['template', 'student']);

        if ($request->has('class') && $request->class !== 'all') {
            $query->where('class', $request->class);
        }
        if ($request->has('section') && $request->section !== 'all') {
            $query->where('section', $request->section);
        }
        if ($request->has('search') && $request->search) {
            $search = $request->search;
            $query->where(function ($q) use ($search) {
                $q->where('student_name', 'like', "%{$search}%")
                  ->orWhere('certificate_number', 'like', "%{$search}%");
            });
        }

        $issuedCertificates = $query->orderBy('created_at', 'desc')->get();

        return response()->json([
            'success' => true,
            'data' => $issuedCertificates,
        ]);
    }

    public function showIssuedCertificate(IssuedCertificate $issuedCertificate)
    {
        $user = Auth::user();
        if ($issuedCertificate->organization_id !== $user->organization_id) {
            return response()->json(['success' => false, 'message' => 'Unauthorized'], 403);
        }

        return response()->json([
            'success' => true,
            'data' => $issuedCertificate->load(['template', 'student']),
        ]);
    }

    public function issueCertificate(Request $request)
    {
        $user = Auth::user();

        $validated = $request->validate([
            'certificate_template_id' => 'required|exists:certificate_templates,id',
            'student_id' => 'nullable|exists:students,id',
            'student_name' => 'required|string|max:255',
            'class' => 'nullable|string|max:50',
            'section' => 'nullable|string|max:50',
            'reason' => 'nullable|string',
            'issue_date' => 'nullable|date',
            'issued_by' => 'nullable|string|max:255',
            'issued_by_designation' => 'nullable|string|max:255',
        ]);

        $template = CertificateTemplate::where('id', $validated['certificate_template_id'])
            ->where('organization_id', $user->organization_id)
            ->first();

        if (!$template) {
            return response()->json(['success' => false, 'message' => 'Template not found'], 404);
        }

        $certificateNumber = 'CERT-' . date('Y') . '-' . Str::upper(Str::random(6));

        $issuedCertificate = IssuedCertificate::create([
            'organization_id' => $user->organization_id,
            'certificate_template_id' => $validated['certificate_template_id'],
            'student_id' => $validated['student_id'] ?? null,
            'certificate_number' => $certificateNumber,
            'student_name' => $validated['student_name'],
            'class' => $validated['class'] ?? '',
            'section' => $validated['section'] ?? '',
            'reason' => $validated['reason'] ?? '',
            'issue_date' => $validated['issue_date'] ?? now(),
            'issued_by' => $validated['issued_by'] ?? $user->name,
            'issued_by_designation' => $validated['issued_by_designation'] ?? '',
            'created_by' => $user->id,
        ]);

        return response()->json([
            'success' => true,
            'message' => 'Certificate issued successfully',
            'data' => $issuedCertificate,
        ], 201);
    }

    public function issueBulkCertificates(Request $request)
    {
        $user = Auth::user();

        $validated = $request->validate([
            'certificate_template_id' => 'required|exists:certificate_templates,id',
            'student_ids' => 'required|array',
            'student_ids.*' => 'exists:students,id',
            'reason' => 'nullable|string',
            'issue_date' => 'nullable|date',
            'issued_by' => 'nullable|string|max:255',
            'issued_by_designation' => 'nullable|string|max:255',
        ]);

        $template = CertificateTemplate::where('id', $validated['certificate_template_id'])
            ->where('organization_id', $user->organization_id)
            ->first();

        if (!$template) {
            return response()->json(['success' => false, 'message' => 'Template not found'], 404);
        }

        $students = Student::whereIn('id', $validated['student_ids'])->get();
        $issuedCertificates = [];

        foreach ($students as $student) {
            $certificateNumber = 'CERT-' . date('Y') . '-' . Str::upper(Str::random(6));

            $issuedCertificate = IssuedCertificate::create([
                'organization_id' => $user->organization_id,
                'certificate_template_id' => $validated['certificate_template_id'],
                'student_id' => $student->id,
                'certificate_number' => $certificateNumber,
                'student_name' => $student->first_name . ' ' . $student->last_name,
                'class' => $student->class ?? '',
                'section' => $student->section ?? '',
                'reason' => $validated['reason'] ?? '',
                'issue_date' => $validated['issue_date'] ?? now(),
                'issued_by' => $validated['issued_by'] ?? $user->name,
                'issued_by_designation' => $validated['issued_by_designation'] ?? '',
                'created_by' => $user->id,
            ]);

            $issuedCertificates[] = $issuedCertificate;
        }

        return response()->json([
            'success' => true,
            'message' => 'Certificates issued to ' . count($issuedCertificates) . ' students',
            'data' => $issuedCertificates,
        ], 201);
    }

    public function updateIssuedCertificate(Request $request, IssuedCertificate $issuedCertificate)
    {
        $user = Auth::user();
        if ($issuedCertificate->organization_id !== $user->organization_id) {
            return response()->json(['success' => false, 'message' => 'Unauthorized'], 403);
        }

        $validated = $request->validate([
            'student_name' => 'sometimes|required|string|max:255',
            'class' => 'nullable|string|max:50',
            'section' => 'nullable|string|max:50',
            'reason' => 'nullable|string',
            'issue_date' => 'nullable|date',
            'issued_by' => 'nullable|string|max:255',
            'issued_by_designation' => 'nullable|string|max:255',
            'file_path' => 'nullable|string',
        ]);

        $issuedCertificate->update($validated);

        return response()->json([
            'success' => true,
            'message' => 'Issued certificate updated successfully',
            'data' => $issuedCertificate,
        ]);
    }

    public function destroyIssuedCertificate(IssuedCertificate $issuedCertificate)
    {
        $user = Auth::user();
        if ($issuedCertificate->organization_id !== $user->organization_id) {
            return response()->json(['success' => false, 'message' => 'Unauthorized'], 403);
        }

        if ($issuedCertificate->file_path && Storage::exists($issuedCertificate->file_path)) {
            Storage::delete($issuedCertificate->file_path);
        }

        $issuedCertificate->delete();

        return response()->json([
            'success' => true,
            'message' => 'Issued certificate deleted successfully',
        ]);
    }

    public function getStudentCertificates()
    {
        $user = Auth::user();

        $studentId = null;
        if ($user->role === 'student') {
            $student = Student::where('user_id', $user->id)->first();
            if ($student) {
                $studentId = $student->id;
            }
        }

        if (!$studentId) {
            return response()->json(['success' => false, 'message' => 'Student record not found'], 404);
        }

        $certificates = IssuedCertificate::where('student_id', $studentId)
            ->where('organization_id', $user->organization_id)
            ->with('template')
            ->orderBy('issue_date', 'desc')
            ->get();

        return response()->json([
            'success' => true,
            'data' => $certificates,
        ]);
    }
}
