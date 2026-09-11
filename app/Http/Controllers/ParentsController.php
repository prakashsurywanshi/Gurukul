<?php

namespace App\Http\Controllers;

use App\Models\Organization;
use App\Models\Student;
use App\Models\User;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\Auth;
use Illuminate\Support\Facades\DB;
use Inertia\Inertia;
use Inertia\Response as InertiaResponse;
use Throwable;

class ParentsController extends Controller
{
    public function index(Request $request): InertiaResponse
    {
        $user = Auth::user();
        $organization = $this->resolveOrganizationForUser($user);

        abort_unless($organization, 403);

        $search = trim((string) $request->query('search', ''));

        $studentQuery = Student::query()
            ->with('schoolClass:id,organization_id,name,section')
            ->where('organization_id', $organization->id)
            ->whereNull('deleted_at');

        if ($search !== '') {
            $term = '%'.$search.'%';
            $studentQuery->where(function ($query) use ($term) {
                $query
                    ->where(DB::raw("LOWER(CONCAT(first_name, ' ', COALESCE(middle_name, ''), ' ', last_name))"), 'like', strtolower($term))
                    ->orWhere('admission_no', 'like', $term)
                    ->orWhere('father_name', 'like', $term)
                    ->orWhere('mother_name', 'like', $term)
                    ->orWhere('guardian_name', 'like', $term)
                    ->orWhere('father_phone', 'like', $term)
                    ->orWhere('mother_phone', 'like', $term)
                    ->orWhere('guardian_phone', 'like', $term)
                    ->orWhere('father_email', 'like', $term)
                    ->orWhere('mother_email', 'like', $term)
                    ->orWhere('guardian_email', 'like', $term);
            });
        }

        $students = $studentQuery->orderBy('admission_no')->get();
        $parentsIndex = [];

        foreach ($students as $student) {
            $contacts = $this->studentContacts($student);

            if (empty($contacts)) {
                continue;
            }

            $child = [
                'id' => (string) $student->id,
                'admission_no' => $student->admission_no,
                'name' => trim(implode(' ', array_filter([$student->first_name, $student->middle_name, $student->last_name]))),
                'class' => $student->schoolClass?->name,
                'section' => $student->schoolClass?->section,
                'gender' => $student->gender,
            ];

            foreach ($contacts as $contact) {
                $key = $contact['key'];

                if (! isset($parentsIndex[$key])) {
                    $parentsIndex[$key] = [
                        'id' => $key,
                        'name' => $contact['name'],
                        'phone' => $contact['phone'],
                        'email' => $contact['email'],
                        'relation' => $contact['relation'],
                        'children' => [],
                    ];
                } elseif (mb_strlen($contact['name']) > mb_strlen($parentsIndex[$key]['name'])) {
                    $parentsIndex[$key]['name'] = $contact['name'];
                }

                $parentsIndex[$key]['children'][] = $child;
            }
        }

        $parents = collect($parentsIndex)
            ->values()
            ->sortBy('name', SORT_NATURAL | SORT_FLAG_CASE)
            ->map(function (array $parent) {
                $parent['children'] = collect($parent['children'])
                    ->unique('id')
                    ->sortBy(fn (array $child) => [$child['class'] ?? '', $child['section'] ?? '', $child['name']])
                    ->values()
                    ->all();
                $parent['childCount'] = count($parent['children']);

                return $parent;
            })
            ->values()
            ->all();

        $summary = [
            'parentCount' => count($parents),
            'studentCount' => $students->count(),
            'linkedStudentCount' => collect($parents)->reduce(fn (int $carry, array $parent) => $carry + $parent['childCount'], 0),
        ];

        return Inertia::render('dashboard/Parents', [
            'user' => $user,
            'parents' => $parents,
            'summary' => $summary,
            'filters' => ['search' => $search],
        ]);
    }

    /**
     * Extract distinct guardian contacts for a student, keyed by strong identity
     * (phone digits first, then e-mail, then name).
     *
     * @return array<int, array{key: string, name: string, phone: ?string, email: ?string, relation: string}>
     */
    private function studentContacts(Student $student): array
    {
        $contacts = [];

        $this->addContact($contacts, $student->guardian_name, $student->guardian_phone, $student->guardian_email, $student->guardian_relation ?: 'Guardian');
        $this->addContact($contacts, $student->father_name, $student->father_phone, $student->father_email, 'Father');
        $this->addContact($contacts, $student->mother_name, $student->mother_phone, $student->mother_email, 'Mother');

        return array_values($contacts);
    }

    private function addContact(array &$contacts, ?string $name, ?string $phone, ?string $email, string $relation): void
    {
        $cleanName = trim((string) $name);
        $cleanPhone = trim((string) $phone);
        $cleanEmail = strtolower(trim((string) $email));

        if ($cleanName === '' || ($cleanPhone === '' && $cleanEmail === '')) {
            return;
        }

        $key = $this->identityKey($cleanName, $cleanPhone, $cleanEmail);

        $contacts[$key] = [
            'key' => $key,
            'name' => $cleanName,
            'phone' => $cleanPhone !== '' ? $cleanPhone : null,
            'email' => $cleanEmail !== '' ? $cleanEmail : null,
            'relation' => $relation,
        ];
    }

    private function identityKey(string $name, string $phone, string $email): string
    {
        $digits = preg_replace('/\D/', '', $phone);

        if ($digits !== '') {
            return 'phone:'.$digits;
        }

        if ($email !== '') {
            return 'email:'.$email;
        }

        return 'name:'.strtolower($name);
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

        try {
            $organization = Organization::query()->firstOrFail();
            $user->organization_id = $organization->id;
            $user->save();

            return $organization;
        } catch (Throwable) {
            return null;
        }
    }
}