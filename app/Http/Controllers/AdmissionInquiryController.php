<?php

namespace App\Http\Controllers;

use App\Mail\StudentWelcomeCredentialsMail;
use App\Models\AdmissionInquiry;
use App\Models\AcademicYear;
use App\Models\CustomFieldDefinition;
use App\Models\CustomFieldValue;
use App\Models\Organization;
use App\Models\SchoolClass;
use App\Models\Student;
use App\Models\SuperAdminSetting;
use App\Models\User;
use App\Services\CustomFieldValueService;
use App\Services\SmtpSettingsService;
use App\Services\StudentAcademicHistoryService;
use App\Notifications\VerifyAdmissionInquiryCodeNotification;
use Illuminate\Database\QueryException;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\RedirectResponse;
use Illuminate\Http\Request;
use Illuminate\Support\Collection;
use Illuminate\Support\Facades\Auth;
use Illuminate\Support\Facades\Cache;
use Illuminate\Support\Facades\Config;
use Illuminate\Support\Facades\Mail;
use Illuminate\Support\Facades\Notification;
use Illuminate\Support\Facades\Schema;
use Illuminate\Support\Str;
use Illuminate\Contracts\Cache\Repository as CacheRepository;
use Illuminate\Validation\Rule;
use Illuminate\Validation\ValidationException;
use Inertia\Inertia;
use Inertia\Response;
use Throwable;

class AdmissionInquiryController extends Controller
{
    public function __construct(
        private readonly CustomFieldValueService $customFieldValueService,
        private readonly StudentAcademicHistoryService $studentAcademicHistoryService,
        private readonly SmtpSettingsService $smtpSettingsService
    )
    {
    }

    public function index(): Response
    {
        try {
            $inquiries = AdmissionInquiry::query()
                ->latest()
                ->get()
                ->map(fn (AdmissionInquiry $inquiry) => [
                    'id' => $inquiry->id,
                    'full_name' => $inquiry->full_name,
                    'email' => $inquiry->email,
                    'phone' => $inquiry->phone,
                    'program_interest' => $inquiry->program_interest,
                    'previous_institution' => $inquiry->previous_institution,
                    'message' => $inquiry->message,
                    'custom_data' => $inquiry->custom_data,
                    'status' => $inquiry->status ?? 'pending',
                    'enrolled_student_id' => $inquiry->enrolled_student_id,
                    'enrolled_at' => optional($inquiry->enrolled_at)->format('Y-m-d H:i:s'),
                    'created_at' => optional($inquiry->created_at)->format('Y-m-d H:i:s'),
                ]);
            $tableReady = true;
        } catch (QueryException $exception) {
            $schemaNotReady = str_contains($exception->getMessage(), 'admission_inquiries');

            if (! $schemaNotReady) {
                throw $exception;
            }

            $inquiries = collect();
            $tableReady = false;
        }

        return Inertia::render('dashboard/students/OnlineAdmission', [
            'user' => Auth::user(),
            'inquiries' => $inquiries,
            'classRecords' => $this->getClassRecords($this->resolveOrganizationForUser(Auth::user())),
            'tableReady' => $tableReady,
        ]);
    }

    public function enroll(Request $request, AdmissionInquiry $admissionInquiry): RedirectResponse
    {
        $user = Auth::user();
        $organization = $this->resolveOrganizationForUser($user);

        if (! $organization) {
            return back()->with('error', 'No organization is linked to this account.');
        }

        if (($admissionInquiry->status ?? 'pending') === 'enrolled') {
            return back()->with('error', 'This admission request has already been enrolled.');
        }

        $validated = $request->validate([
            'class_id' => [
                'required',
                'integer',
                Rule::exists('classes', 'id')->where(fn ($query) => $query->where('organization_id', $organization->id)),
            ],
            'date_of_birth' => ['required', 'date'],
            'gender' => ['required', Rule::in(['male', 'female', 'other'])],
            'admission_date' => ['required', 'date'],
            'roll_number' => ['nullable', 'string', 'max:50'],
        ]);

        $schoolClass = SchoolClass::query()
            ->where('organization_id', $organization->id)
            ->find($validated['class_id']);

        if (! $schoolClass) {
            return back()->with('error', 'The selected class could not be found for this organization.');
        }

        [$firstName, $lastName] = $this->splitFullName($admissionInquiry->full_name);

        try {
            $student = Student::query()->create([
                'organization_id' => $organization->id,
                'class_id' => $schoolClass->id,
                'admission_no' => $this->generateAdmissionNumber(),
                'roll_number' => $validated['roll_number'] ?? null,
                'first_name' => $firstName,
                'last_name' => $lastName,
                'date_of_birth' => $validated['date_of_birth'],
                'gender' => $validated['gender'],
                'email' => $admissionInquiry->email,
                'phone' => $admissionInquiry->phone,
                'admission_date' => $validated['admission_date'],
                'previous_school' => $admissionInquiry->previous_institution,
                'status' => 'active',
                'notes' => 'Enrolled from online admission request #'.$admissionInquiry->id,
            ]);
            $this->syncStudentUser($student, $organization);
            $this->studentAcademicHistoryService->syncCurrentRecord(
                $student->fresh('schoolClass'),
                'admission',
                'Enrolled from online admission request #'.$admissionInquiry->id
            );
        } catch (QueryException $exception) {
            if ($this->isDuplicateAdmissionNumberException($exception)) {
                return back()->with('error', 'Enrollment could not be completed because the generated admission number already exists. Please try again.');
            }

            throw $exception;
        }

$admissionInquiry->update([
                'status' => 'enrolled',
                'enrolled_student_id' => $student->id,
                'enrolled_at' => now(),
            ]);

            if ($admissionInquiry->custom_data) {
                $this->syncInquiryCustomDataToStudent($student, $organization, $admissionInquiry->custom_data);
            }

        return redirect()
            ->route('online-admission')
            ->with('success', $admissionInquiry->full_name.' has been enrolled successfully.');
    }

    public function update(Request $request, AdmissionInquiry $admissionInquiry): RedirectResponse
    {
        $validated = $this->validateAdmissionInquiryPayload($request);

        $admissionInquiry->update($validated);

        return redirect()
            ->route('online-admission')
            ->with('success', $admissionInquiry->full_name.' has been updated successfully.');
    }

    public function destroy(AdmissionInquiry $admissionInquiry): RedirectResponse
    {
        $fullName = $admissionInquiry->full_name;

        $admissionInquiry->delete();

        return redirect()
            ->route('online-admission')
            ->with('success', $fullName.' has been deleted successfully.');
    }

    public function sendVerificationCode(Request $request): JsonResponse
    {
        $validated = $request->validate([
            'full_name' => ['nullable', 'string', 'max:255'],
            'email' => ['required', 'email', 'max:255'],
        ]);

        $email = Str::lower(trim($validated['email']));
        $fullName = trim((string) ($validated['full_name'] ?? 'Student'));
        $fullName = $fullName !== '' ? $fullName : 'Student';
        $code = (string) random_int(100000, 999999);

        $this->admissionCache()->put($this->verificationCodeCacheKey($email), [
            'email' => $email,
            'full_name' => $fullName,
            'code' => password_hash($code, PASSWORD_DEFAULT),
        ], now()->addMinutes(15));

        $this->clearVerifiedEmailTokenForEmail($email);
        $this->smtpSettingsService->applyActiveSettings();

        try {
            Notification::route('mail', $email)
                ->notify(new VerifyAdmissionInquiryCodeNotification($fullName, $code));
        } catch (Throwable $exception) {
            report($exception);

            return response()->json([
                'message' => 'We could not send the verification email right now. Please check the SMTP settings and try again.',
            ], 422);
        }

        return response()->json([
            'message' => 'Verification code sent. Please check your email and enter the 6-digit code below.',
        ]);
    }

    public function verifyCode(Request $request): JsonResponse
    {
        $validated = $request->validate([
            'email' => ['required', 'email', 'max:255'],
            'code' => ['required', 'digits:6'],
        ]);

        $email = Str::lower(trim($validated['email']));
        $pendingVerification = $this->admissionCache()->get($this->verificationCodeCacheKey($email));

        if (! $pendingVerification) {
            return response()->json([
                'message' => 'No active verification code was found for this email. Please request a new code.',
            ], 422);
        }

        if (! password_verify($validated['code'], $pendingVerification['code'])) {
            return response()->json([
                'message' => 'The verification code is invalid. Please try again.',
            ], 422);
        }

        $verificationToken = Str::uuid()->toString();

        $this->admissionCache()->put($this->verifiedEmailCacheKey($verificationToken), $email, now()->addMinutes(30));
        $this->admissionCache()->put($this->verifiedEmailLookupCacheKey($email), $verificationToken, now()->addMinutes(30));
        $this->admissionCache()->forget($this->verificationCodeCacheKey($email));

        return response()->json([
            'message' => 'Email verified successfully. You can now submit the admission form.',
            'verification_token' => $verificationToken,
        ]);
    }

    public function store(Request $request): RedirectResponse
    {
        $validated = $request->validate([
            'full_name' => ['required', 'string', 'max:255'],
            'email' => ['required', 'email', 'max:255'],
            'phone' => ['required', 'string', 'max:20'],
            'program_interest' => ['required', 'string', 'max:120'],
            'previous_institution' => ['nullable', 'string', 'max:255'],
            'message' => ['nullable', 'string', 'max:1000'],
            'email_verification_token' => ['required', 'string'],
        ]);

        $verifiedEmail = $this->admissionCache()->get($this->verifiedEmailCacheKey($validated['email_verification_token']));

        if (! $verifiedEmail || ! hash_equals(Str::lower($validated['email']), (string) $verifiedEmail)) {
            return back()
                ->withErrors(['email' => 'Please verify your email address before submitting the admission form.'])
                ->withInput();
        }

        $customData = $this->validatePublicCustomFields($request);

        $admissionInquiryData = [
            ...$validated,
            'student_stage' => 'Not provided',
            'email_verified_at' => now(),
            'status' => 'pending',
        ];
        unset($admissionInquiryData['email_verification_token']);

        if ($customData !== []) {
            $admissionInquiryData['custom_data'] = $customData;
        }

        try {
            AdmissionInquiry::create($admissionInquiryData);
        } catch (QueryException $exception) {
            if (! str_contains($exception->getMessage(), 'admission_inquiries')) {
                throw $exception;
            }

            return redirect('/#admissions')
                ->with('error', 'The admission form could not be submitted because the admissions table is not ready yet.');
        }

        $this->clearVerifiedEmailTokenForEmail($validated['email']);

        return redirect('/#admissions')
            ->with('success', 'Your email was verified and your online admission request has been submitted successfully.');
    }

    public function verify(Request $request, string $token): RedirectResponse
    {
        $pendingInquiry = $this->admissionCache()->get($this->legacyCacheKey($token));

        if (! $pendingInquiry) {
            return redirect('/#admissions')
                ->with('error', 'This admission verification link is invalid or has expired.');
        }

        $expectedHash = sha1($pendingInquiry['email']);

        if (! hash_equals($expectedHash, (string) $request->query('hash'))) {
            return redirect('/#admissions')
                ->with('error', 'This admission verification link is invalid.');
        }

        try {
            AdmissionInquiry::create([
                ...$pendingInquiry,
                'email_verified_at' => now(),
            ]);
            $this->admissionCache()->forget($this->legacyCacheKey($token));
        } catch (QueryException $exception) {
            if (! str_contains($exception->getMessage(), 'admission_inquiries')) {
                throw $exception;
            }

            return redirect('/#admissions')
                ->with('error', 'The admission form could not be submitted because the admissions table is not ready yet.');
        }

        return redirect('/#admissions')
            ->with('success', 'Your email has been verified and your online admission request has been submitted successfully.');
    }

    private function verificationCodeCacheKey(string $email): string
    {
        return 'admission_inquiry_email_code_'.sha1(Str::lower($email));
    }

    private function verifiedEmailCacheKey(string $token): string
    {
        return 'admission_inquiry_email_verified_'.$token;
    }

    private function verifiedEmailLookupCacheKey(string $email): string
    {
        return 'admission_inquiry_email_verified_lookup_'.sha1(Str::lower($email));
    }

    private function clearVerifiedEmailTokenForEmail(string $email): void
    {
        $lookupKey = $this->verifiedEmailLookupCacheKey($email);
        $verificationToken = $this->admissionCache()->get($lookupKey);

        if ($verificationToken) {
            $this->admissionCache()->forget($this->verifiedEmailCacheKey($verificationToken));
        }

        $this->admissionCache()->forget($lookupKey);
    }

    private function legacyCacheKey(string $token): string
    {
        return 'admission_inquiry_verification_'.$token;
    }

    private function admissionCache(): CacheRepository
    {
        return Cache::store('file');
    }

    private function getClassRecords(?Organization $organization): Collection
    {
        if (! $organization) {
            return collect();
        }

        return SchoolClass::query()
            ->forCurrentSession($organization->id)
            ->where('status', 'active')
            ->orderByRaw('CAST(name AS UNSIGNED), name')
            ->orderBy('section')
            ->get(['id', 'name', 'section']);
    }

    private function resolveOrganizationForUser(User $user): ?Organization
    {
        if ($user->organization_id) {
            return Organization::query()->find($user->organization_id);
        }

        if ($user->role !== 'admin') {
            return null;
        }

        $organization = Organization::query()
            ->where('email', $user->email)
            ->first();

        if (! $organization && Organization::query()->count() === 1) {
            $organization = Organization::query()->first();
        }

        if ($organization) {
            $user->forceFill(['organization_id' => $organization->id])->save();
            $user->organization_id = $organization->id;
        }

        return $organization;
    }

    private function splitFullName(string $fullName): array
    {
        $segments = preg_split('/\s+/', trim($fullName)) ?: [];
        $firstName = $segments[0] ?? 'Student';
        $lastName = trim(implode(' ', array_slice($segments, 1)));

        return [$firstName, $lastName !== '' ? $lastName : '-'];
    }

    private function generateAdmissionNumber(): string
    {
        $lastAdmissionNumber = Student::withTrashed()
            ->orderByDesc('id')
            ->value('admission_no');

        $lastSequence = (int) preg_replace('/\D/', '', (string) $lastAdmissionNumber);
        $nextSequence = max($lastSequence + 1, 1);

        do {
            $candidate = 'A'.str_pad((string) $nextSequence, 3, '0', STR_PAD_LEFT);
            $exists = Student::withTrashed()
                ->where('admission_no', $candidate)
                ->exists();
            $nextSequence++;
        } while ($exists);

        return $candidate;
    }

    private function isDuplicateAdmissionNumberException(QueryException $exception): bool
    {
        $message = $exception->getMessage();

        return str_contains($message, 'students_admission_no_unique')
            || str_contains($message, 'Duplicate entry');
    }

    private function syncStudentUser(Student $student, Organization $organization): void
    {
        $studentEmail = $this->resolveStudentAccountEmail(
            $student->email,
            $organization,
            $student->admission_no,
            $student->user_id
        );

        if ($student->email !== $studentEmail) {
            $student->forceFill(['email' => $studentEmail])->save();
        }

        $studentUser = $student->user_id ? User::query()->find($student->user_id) : null;

        if (! $studentUser && $studentEmail) {
            $studentUser = User::query()
                ->where('email', $studentEmail)
                ->where('organization_id', $organization->id)
                ->first();
        }

        $temporaryPassword = $this->generateStudentPassword();

        if ($studentUser) {
            $studentUser->update([
                'organization_id' => $organization->id,
                'name' => trim($student->first_name.' '.$student->last_name),
                'email' => $studentEmail,
                'password' => $temporaryPassword,
                'phone' => $student->phone,
                'address' => $student->current_address,
                'role' => 'student',
                'status' => $student->status === 'active' ? 'active' : 'inactive',
            ]);
        } else {
            $studentUser = User::query()->create([
                'organization_id' => $organization->id,
                'name' => trim($student->first_name.' '.$student->last_name),
                'email' => $studentEmail,
                'password' => $temporaryPassword,
                'phone' => $student->phone,
                'address' => $student->current_address,
                'role' => 'student',
                'status' => $student->status === 'active' ? 'active' : 'inactive',
            ]);
        }

        $this->sendStudentCredentialsEmail($studentUser, $temporaryPassword);

        if ($student->user_id !== $studentUser->id) {
            $student->forceFill(['user_id' => $studentUser->id])->save();
        }
    }

    private function resolveStudentAccountEmail(?string $requestedEmail, Organization $organization, string $admissionNumber, ?int $ignoreUserId = null): string
    {
        $baseEmail = $requestedEmail ?: Str::lower($admissionNumber.'@students.'.($organization->slug ?: 'gurukul').'.local');
        $email = Str::lower(trim($baseEmail));

        if (! $this->studentUserEmailExists($email, $ignoreUserId)) {
            return $email;
        }

        $localPart = Str::before($email, '@');
        $domainPart = Str::after($email, '@');
        $suffix = 1;

        do {
            $candidate = $localPart.$suffix.'@'.$domainPart;
            $suffix++;
        } while ($this->studentUserEmailExists($candidate, $ignoreUserId));

        return $candidate;
    }

    private function studentUserEmailExists(string $email, ?int $ignoreUserId = null): bool
    {
        return User::query()
            ->when($ignoreUserId, fn ($query) => $query->where('id', '!=', $ignoreUserId))
            ->where('email', $email)
            ->exists();
    }

    private function sendStudentCredentialsEmail(User $studentUser, string $temporaryPassword): void
    {
        if (! $studentUser->email || Str::endsWith($studentUser->email, '.local')) {
            return;
        }

        $settings = $this->smtpSettingsService->applyActiveSettings();

        if (! $settings) {
            return;
        }

        try {
            Mail::to($studentUser->email)->send(
                new StudentWelcomeCredentialsMail(
                    $studentUser,
                    $temporaryPassword,
                    $studentUser->organization_id
                        ? Organization::query()->find($studentUser->organization_id)?->name
                        : null,
                    $settings
                )
            );
        } catch (Throwable $exception) {
            report($exception);
        }
    }

    private function generateStudentPassword(): string
    {
        return Str::password(8, true, true, false, false);
    }

    private function validateAdmissionInquiryPayload(Request $request): array
    {
        return $request->validate([
            'full_name' => ['required', 'string', 'max:255'],
            'email' => ['required', 'email', 'max:255'],
            'phone' => ['required', 'string', 'max:20'],
            'program_interest' => ['required', 'string', 'max:120'],
            'previous_institution' => ['nullable', 'string', 'max:255'],
            'message' => ['nullable', 'string', 'max:1000'],
        ]);
    }

    private function validatePublicCustomFields(Request $request): array
    {
        $organization = $this->publicOrganization();

        if (! $organization) {
            return [];
        }

        $fields = CustomFieldDefinition::query()
            ->where('organization_id', $organization->id)
            ->where('entity', 'student')
            ->where('is_active', true)
            ->where('show_in_admission', true)
            ->orderBy('sort_order')
            ->orderBy('id')
            ->get();

        if ($fields->isEmpty()) {
            return [];
        }

        $submitted = $request->only(collect($fields)->pluck('field_key')->all())
            ?: ($request->input('custom_fields', []) ?? []);

        $submitted = is_array($submitted) ? $submitted : [];

        $result = $this->customFieldValueService->validateForFields($fields, $submitted, 'custom_fields');

        if ($result['errors']) {
            throw ValidationException::withMessages($result['errors']);
        }

        $byId = $fields->keyBy('id');
        $normalized = [];

        foreach ($result['normalized'] as $fieldId => $value) {
            if (isset($byId[$fieldId])) {
                $normalized[$byId[$fieldId]->field_key] = $value;
            }
        }

        return $normalized;
    }

    private function syncInquiryCustomDataToStudent(Student $student, Organization $organization, array $customData): void
    {
        $definitions = CustomFieldDefinition::query()
            ->where('organization_id', $organization->id)
            ->where('entity', 'student')
            ->where('is_active', true)
            ->where('show_in_admission', true)
            ->get()
            ->keyBy('field_key');

        foreach ($customData as $fieldKey => $value) {
            $field = $definitions->get($fieldKey);

            if (! $field) {
                continue;
            }

            CustomFieldValue::query()->updateOrCreate(
                [
                    'organization_id' => $organization->id,
                    'entity' => 'student',
                    'entity_id' => $student->id,
                    'field_id' => $field->id,
                ],
                ['value' => $value]
            );
        }
    }

    private function publicOrganization(): ?Organization
    {
        return Organization::query()->orderBy('id')->first();
    }
}
