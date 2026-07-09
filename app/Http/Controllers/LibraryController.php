<?php

namespace App\Http\Controllers;

use App\Models\LibraryAcquisitionRequest;
use App\Models\LibraryBook;
use App\Models\LibraryCirculation;
use App\Models\LibraryMember;
use App\Models\Organization;
use App\Models\Student;
use App\Models\User;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\Auth;
use Illuminate\Support\Facades\Schema;
use Illuminate\Validation\ValidationException;

class LibraryController extends Controller
{
    public function index()
    {
        $user = Auth::user();
        $organization = $this->resolveOrganizationForUser($user);

        abort_unless($organization, 403);

        return inertia('dashboard/LibraryManagement', [
            'user' => $user,
            ...$this->libraryPayload($organization),
        ]);
    }

    public function storeBook(Request $request)
    {
        $organization = $this->requireOrganization($request);
        $data = $request->validate([
            'title' => ['required', 'string', 'max:255'],
            'author' => ['required', 'string', 'max:255'],
            'category' => ['required', 'string', 'max:255'],
            'isbn' => ['required', 'string', 'max:255'],
            'rack' => ['required', 'string', 'max:100'],
            'language' => ['required', 'string', 'max:100'],
            'publisher' => ['required', 'string', 'max:255'],
            'totalCopies' => ['required', 'integer', 'min:1'],
            'price' => ['required', 'numeric', 'min:0'],
        ]);

        $totalCopies = (int) $data['totalCopies'];

        LibraryBook::create($this->makeBookAttributes($organization->id, [
            'organization_id' => $organization->id,
            'title' => $data['title'],
            'author' => $data['author'],
            'category' => $data['category'],
            'isbn' => $data['isbn'],
            'rack' => $data['rack'],
            'language' => $data['language'],
            'publisher' => $data['publisher'],
            'total_copies' => $totalCopies,
            'available_copies' => $totalCopies,
            'issued_count' => 0,
            'price' => $data['price'],
        ]));

        return back()->with('success', 'New title added to the catalog.');
    }

    public function importBooks(Request $request)
    {
        $organization = $this->requireOrganization($request);
        $data = $request->validate([
            'books' => ['required', 'array', 'min:1'],
            'books.*.title' => ['required', 'string', 'max:255'],
            'books.*.author' => ['required', 'string', 'max:255'],
            'books.*.category' => ['required', 'string', 'max:255'],
            'books.*.isbn' => ['required', 'string', 'max:255'],
            'books.*.rack' => ['required', 'string', 'max:100'],
            'books.*.language' => ['required', 'string', 'max:100'],
            'books.*.publisher' => ['required', 'string', 'max:255'],
            'books.*.totalCopies' => ['required', 'integer', 'min:1'],
            'books.*.price' => ['nullable', 'numeric', 'min:0'],
        ]);

        foreach ($data['books'] as $book) {
            $totalCopies = (int) $book['totalCopies'];

            LibraryBook::create($this->makeBookAttributes($organization->id, [
                'organization_id' => $organization->id,
                'title' => $book['title'],
                'author' => $book['author'],
                'category' => $book['category'],
                'isbn' => $book['isbn'],
                'rack' => $book['rack'],
                'language' => $book['language'],
                'publisher' => $book['publisher'],
                'total_copies' => $totalCopies,
                'available_copies' => $totalCopies,
                'issued_count' => 0,
                'price' => $book['price'] ?? 0,
            ]));
        }

        return back()->with('success', count($data['books']) . ' books imported successfully.');
    }

    public function updateBook(Request $request, LibraryBook $book)
    {
        $organization = $this->requireOrganization($request);
        abort_unless($book->organization_id === $organization->id, 403);

        $data = $request->validate([
            'title' => ['required', 'string', 'max:255'],
            'author' => ['required', 'string', 'max:255'],
            'category' => ['required', 'string', 'max:255'],
            'isbn' => ['required', 'string', 'max:255'],
            'rack' => ['required', 'string', 'max:100'],
            'language' => ['required', 'string', 'max:100'],
            'publisher' => ['required', 'string', 'max:255'],
            'totalCopies' => ['required', 'integer', 'min:1'],
            'price' => ['required', 'numeric', 'min:0'],
        ]);

        $currentIssuedCopies = max((int) $book->total_copies - (int) $book->available_copies, 0);
        $newTotalCopies = (int) $data['totalCopies'];

        if ($newTotalCopies < $currentIssuedCopies) {
            throw ValidationException::withMessages([
                'totalCopies' => "Total copies cannot be less than {$currentIssuedCopies} because some copies are currently issued.",
            ]);
        }

        $book->update($this->makeBookAttributes($organization->id, [
            'book_number' => $book->book_number,
            'title' => $data['title'],
            'author' => $data['author'],
            'category' => $data['category'],
            'isbn' => $data['isbn'],
            'rack' => $data['rack'],
            'language' => $data['language'],
            'publisher' => $data['publisher'],
            'total_copies' => $newTotalCopies,
            'available_copies' => $newTotalCopies - $currentIssuedCopies,
            'issued_count' => (int) ($book->issued_count ?? 0),
            'price' => $data['price'],
        ]));

        return back()->with('success', 'Catalog title updated successfully.');
    }

    public function destroyBook(Request $request, LibraryBook $book)
    {
        $organization = $this->requireOrganization($request);
        abort_unless($book->organization_id === $organization->id, 403);

        $hasActiveCirculation = LibraryCirculation::query()
            ->where('organization_id', $organization->id)
            ->where('library_book_id', $book->id)
            ->whereIn('status', ['Issued', 'Overdue'])
            ->exists();

        if ($hasActiveCirculation) {
            throw ValidationException::withMessages([
                'book' => 'This title cannot be deleted while copies are issued or overdue.',
            ]);
        }

        $book->delete();

        return back()->with('success', 'Catalog title deleted successfully.');
    }

    public function generateCard(Request $request, string $memberKey)
    {
        $organization = $this->requireOrganization($request);
        [$memberType, $sourceId] = $this->parseMemberKey($memberKey);
        $member = $this->findOrCreateLibraryMember($organization->id, $memberType, $sourceId);

        if (!$member->library_card_number) {
            $member->update([
                'library_card_number' => $this->generateLibraryCardNumber($memberType, $sourceId),
            ]);
        }

        return back()->with('success', 'Library card generated successfully.');
    }

    public function issueBook(Request $request)
    {
        $organization = $this->requireOrganization($request);
        $data = $request->validate([
            'bookId' => ['required', 'exists:library_books,id'],
            'memberId' => ['required', 'string'],
            'issueDate' => ['required', 'date'],
            'dueDate' => ['required', 'date', 'after_or_equal:issueDate'],
        ]);

        $book = LibraryBook::query()
            ->where('organization_id', $organization->id)
            ->findOrFail($data['bookId']);

        if ($book->available_copies < 1) {
            throw ValidationException::withMessages([
                'bookId' => 'This title is currently unavailable.',
            ]);
        }

        [$memberType, $sourceId] = $this->parseMemberKey($data['memberId']);
        $member = $this->findOrCreateLibraryMember($organization->id, $memberType, $sourceId);

        if ($memberType === 'Student' && !$member->library_card_number) {
            throw ValidationException::withMessages([
                'memberId' => 'Generate a library card number for this student before issuing books.',
            ]);
        }

        LibraryCirculation::create([
            'organization_id' => $organization->id,
            'library_book_id' => $book->id,
            'library_member_id' => $member->id,
            'issue_date' => $data['issueDate'],
            'due_date' => $data['dueDate'],
            'status' => now()->toDateString() > $data['dueDate'] ? 'Overdue' : 'Issued',
        ]);

        $book->update([
            'available_copies' => $book->available_copies - 1,
            ...($this->libraryBooksHaveIssuedCount()
                ? ['issued_count' => ((int) ($book->issued_count ?? 0)) + 1]
                : []),
        ]);

        return back()->with('success', 'Book issued successfully.');
    }

    public function returnBook(Request $request, LibraryCirculation $circulation)
    {
        $organization = $this->requireOrganization($request);
        abort_unless($circulation->organization_id === $organization->id, 403);

        if ($circulation->status === 'Returned') {
            return back()->with('success', 'Book already returned.');
        }

        $circulation->update([
            'status' => 'Returned',
            'return_date' => now()->toDateString(),
        ]);

        $book = $circulation->book;
        if ($book) {
            $nextAvailableCopies = $book->available_copies + 1;
            $book->update([
                'available_copies' => $nextAvailableCopies,
            ]);
        }

        return back()->with('success', 'Book marked as returned.');
    }

    public function storeRequest(Request $request)
    {
        $organization = $this->requireOrganization($request);
        $data = $request->validate([
            'title' => ['required', 'string', 'max:255'],
            'requestedBy' => ['required', 'string', 'max:255'],
            'category' => ['required', 'string', 'max:255'],
            'priority' => ['required', 'in:High,Medium,Low'],
            'copies' => ['required', 'integer', 'min:1'],
            'budget' => ['required', 'numeric', 'min:0'],
            'note' => ['nullable', 'string'],
        ]);

        LibraryAcquisitionRequest::create([
            'organization_id' => $organization->id,
            'title' => $data['title'],
            'requested_by' => $data['requestedBy'],
            'category' => $data['category'],
            'priority' => $data['priority'],
            'copies' => $data['copies'],
            'budget' => $data['budget'],
            'status' => 'Pending',
            'note' => $data['note'] ?? null,
        ]);

        return back()->with('success', 'Acquisition request submitted.');
    }

    private function libraryPayload(Organization $organization): array
    {
        $books = LibraryBook::query()
            ->where('organization_id', $organization->id)
            ->latest('id')
            ->get()
            ->map(fn (LibraryBook $book) => [
                'id' => (string) $book->id,
                'title' => $book->title,
                'author' => $book->author,
                'category' => $book->category,
                'isbn' => $book->isbn ?? '',
                'rack' => $book->rack ?? $book->rack_number ?? '',
                'language' => $book->language,
                'publisher' => $book->publisher ?? '',
                'totalCopies' => $book->total_copies,
                'availableCopies' => $book->available_copies,
                'issuedCount' => (int) ($book->issued_count ?? 0),
                'price' => (float) $book->price,
                'status' => $this->bookStatus((int) $book->total_copies, (int) $book->available_copies),
            ]);

        $libraryMembers = LibraryMember::query()
            ->where('organization_id', $organization->id)
            ->withCount([
                'circulations as active_loans_count' => fn ($query) => $query->whereIn('status', ['Issued', 'Overdue']),
                'circulations as overdue_books_count' => fn ($query) => $query->where('status', 'Overdue'),
            ])
            ->get()
            ->keyBy(fn (LibraryMember $member) => $member->member_type . '-' . ($member->student_id ?: $member->user_id));

        $members = collect()
            ->merge($this->studentMembers($organization->id, $libraryMembers))
            ->merge($this->teacherMembers($organization->id, $libraryMembers))
            ->sortBy('name', SORT_NATURAL | SORT_FLAG_CASE)
            ->values();

        $circulation = LibraryCirculation::query()
            ->where('organization_id', $organization->id)
            ->with(['book', 'member'])
            ->latest('id')
            ->get()
            ->map(fn (LibraryCirculation $entry) => [
                'id' => (string) $entry->id,
                'bookId' => (string) $entry->library_book_id,
                'memberId' => $entry->member
                    ? strtolower($entry->member->member_type) . '-' . ($entry->member->student_id ?: $entry->member->user_id)
                    : '',
                'issueDate' => optional($entry->issue_date)->format('Y-m-d'),
                'dueDate' => optional($entry->due_date)->format('Y-m-d'),
                'returnDate' => optional($entry->return_date)->format('Y-m-d'),
                'status' => $entry->status,
            ]);

        $requests = LibraryAcquisitionRequest::query()
            ->where('organization_id', $organization->id)
            ->latest('id')
            ->get()
            ->map(fn (LibraryAcquisitionRequest $request) => [
                'id' => (string) $request->id,
                'title' => $request->title,
                'requestedBy' => $request->requested_by,
                'category' => $request->category,
                'priority' => $request->priority,
                'copies' => $request->copies,
                'budget' => (float) $request->budget,
                'status' => $request->status,
            ]);

        return [
            'books' => $books,
            'members' => $members,
            'circulation' => $circulation,
            'requests' => $requests,
        ];
    }

    private function studentMembers(int $organizationId, $libraryMembers)
    {
        return Student::query()
            ->with('schoolClass')
            ->forCurrentSession($organizationId)
            ->where('status', 'active')
            ->orderBy('first_name')
            ->get()
            ->map(function (Student $student) use ($libraryMembers) {
                $key = 'Student-' . $student->id;
                $libraryMember = $libraryMembers->get($key);
                $className = $student->schoolClass?->name ?? '';
                $section = $student->schoolClass?->section ?? '';

                return [
                    'id' => 'student-' . $student->id,
                    'name' => trim($student->first_name . ' ' . ($student->last_name ?? '')),
                    'memberType' => 'Student',
                    'classOrDept' => trim('Class ' . $className . ($section ? ' - ' . $section : '')),
                    'admissionNo' => $student->admission_no,
                    'libraryCardNumber' => $libraryMember?->library_card_number,
                    'activeLoans' => (int) ($libraryMember?->active_loans_count ?? 0),
                    'overdueBooks' => (int) ($libraryMember?->overdue_books_count ?? 0),
                    'fineDue' => (float) ($libraryMember?->fine_due ?? 0),
                ];
            });
    }

    private function teacherMembers(int $organizationId, $libraryMembers)
    {
        return User::query()
            ->where('organization_id', $organizationId)
            ->where('role', 'teacher')
            ->where(fn ($query) => $query->whereNull('status')->orWhere('status', 'active'))
            ->orderBy('name')
            ->get()
            ->map(function (User $teacher) use ($libraryMembers) {
                $key = 'Teacher-' . $teacher->id;
                $libraryMember = $libraryMembers->get($key);

                return [
                    'id' => 'teacher-' . $teacher->id,
                    'name' => $teacher->name,
                    'memberType' => 'Teacher',
                    'classOrDept' => 'Teaching Staff',
                    'admissionNo' => 'EMP-' . str_pad((string) $teacher->id, 3, '0', STR_PAD_LEFT),
                    'libraryCardNumber' => $libraryMember?->library_card_number,
                    'activeLoans' => (int) ($libraryMember?->active_loans_count ?? 0),
                    'overdueBooks' => (int) ($libraryMember?->overdue_books_count ?? 0),
                    'fineDue' => (float) ($libraryMember?->fine_due ?? 0),
                ];
            });
    }

    private function parseMemberKey(string $memberKey): array
    {
        if (!preg_match('/^(student|teacher)-(\d+)$/', $memberKey, $matches)) {
            throw ValidationException::withMessages([
                'memberId' => 'Invalid library member selected.',
            ]);
        }

        return [ucfirst($matches[1]), (int) $matches[2]];
    }

    private function findOrCreateLibraryMember(int $organizationId, string $memberType, int $sourceId): LibraryMember
    {
        if ($memberType === 'Student') {
            $student = Student::query()
                ->where('organization_id', $organizationId)
                ->findOrFail($sourceId);

            return LibraryMember::query()->firstOrCreate(
                [
                    'organization_id' => $organizationId,
                    'student_id' => $student->id,
                ],
                [
                    'member_type' => 'Student',
                ]
            );
        }

        $user = User::query()
            ->where('organization_id', $organizationId)
            ->where('role', 'teacher')
            ->findOrFail($sourceId);

        return LibraryMember::query()->firstOrCreate(
            [
                'organization_id' => $organizationId,
                'user_id' => $user->id,
            ],
            [
                'member_type' => 'Teacher',
            ]
        );
    }

    private function generateLibraryCardNumber(string $memberType, int $sourceId): string
    {
        $prefix = $memberType === 'Student' ? 'STU' : 'EMP';

        do {
            $number = 'LIB-' . $prefix . '-' . str_pad((string) $sourceId, 4, '0', STR_PAD_LEFT);
        } while (LibraryMember::query()->where('library_card_number', $number)->exists());

        return $number;
    }

    private function bookStatus(int $totalCopies, int $availableCopies): string
    {
        if ($availableCopies <= 0) {
            return 'Issued Out';
        }

        if ($availableCopies <= 2) {
            return 'Low Stock';
        }

        return 'Available';
    }

    private function makeBookAttributes(int $organizationId, array $attributes): array
    {
        $payload = [
            'organization_id' => $organizationId,
            'title' => $attributes['title'],
            'author' => $attributes['author'],
            'category' => $attributes['category'],
            'isbn' => $attributes['isbn'] ?? null,
            'language' => $attributes['language'] ?? 'English',
            'publisher' => $attributes['publisher'] ?? null,
            'total_copies' => $attributes['total_copies'],
            'available_copies' => $attributes['available_copies'],
            'price' => $attributes['price'] ?? 0,
        ];

        if (Schema::hasColumn('library_books', 'rack')) {
            $payload['rack'] = $attributes['rack'] ?? '';
        }

        if (Schema::hasColumn('library_books', 'rack_number')) {
            $payload['rack_number'] = $attributes['rack'] ?? '';
        }

        if (Schema::hasColumn('library_books', 'book_number')) {
            $payload['book_number'] = $attributes['book_number'] ?? $this->generateBookNumber();
        }

        if ($this->libraryBooksHaveIssuedCount()) {
            $payload['issued_count'] = $attributes['issued_count'] ?? 0;
        }

        return $payload;
    }

    private function generateBookNumber(): string
    {
        do {
            $bookNumber = 'LB-' . now()->format('Ymd') . '-' . random_int(1000, 9999);
        } while (LibraryBook::query()->where('book_number', $bookNumber)->exists());

        return $bookNumber;
    }

    private function libraryBooksHaveIssuedCount(): bool
    {
        return Schema::hasColumn('library_books', 'issued_count');
    }

    private function requireOrganization(Request $request): Organization
    {
        $organization = $this->resolveOrganizationForUser($request->user());
        abort_unless($organization, 403);

        return $organization;
    }

    private function resolveOrganizationForUser(?User $user): ?Organization
    {
        if (!$user) {
            return null;
        }

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
