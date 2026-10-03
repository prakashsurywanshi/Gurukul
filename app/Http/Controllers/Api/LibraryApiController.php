<?php

namespace App\Http\Controllers\Api;

use App\Http\Controllers\Controller;
use App\Models\LibraryAcquisitionRequest;
use App\Models\LibraryBook;
use App\Models\LibraryCirculation;
use App\Models\LibraryMember;
use App\Models\Organization;
use App\Models\Student;
use App\Models\User;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\Auth;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Facades\Schema;
use Illuminate\Validation\ValidationException;

class LibraryApiController extends Controller
{
    public function getOverview()
    {
        $organization = $this->requireOrganization();
        $organizationId = $organization->id;

        $totalTitles = LibraryBook::where('organization_id', $organizationId)->count();
        $totalCopies = LibraryBook::where('organization_id', $organizationId)->sum('total_copies');
        $availableCopies = LibraryBook::where('organization_id', $organizationId)->sum('available_copies');
        $activeIssues = LibraryCirculation::where('organization_id', $organizationId)->whereIn('status', ['Issued', 'Overdue'])->count();
        $overdueIssues = LibraryCirculation::where('organization_id', $organizationId)->where('status', 'Overdue')->count();
        $lowStockTitles = LibraryBook::where('organization_id', $organizationId)
            ->where('available_copies', '<=', 2)
            ->count();
        $registeredMembers = LibraryMember::where('organization_id', $organizationId)->count();
        $pendingRequests = LibraryAcquisitionRequest::where('organization_id', $organizationId)->where('status', 'Pending')->count();

        $outstandingFines = LibraryMember::where('organization_id', $organizationId)->sum('fine_due');

        // `library_books` has no issued_count column; issue frequency lives in
        // library_circulations, so rank by a correlated count instead.
        $popularBooks = LibraryBook::where('organization_id', $organizationId)
            ->withCount([
                'circulations as issued_count' => fn ($q) => $q->whereNotNull('issue_date'),
            ])
            ->orderByDesc('issued_count')
            ->limit(5)
            ->get()
            ->map(fn ($book) => $this->formatBook($book));

        $recentCirculation = LibraryCirculation::where('organization_id', $organizationId)
            ->with(['book', 'member'])
            ->latest('id')
            ->limit(10)
            ->get()
            ->map(fn ($entry) => $this->formatCirculation($entry));

        return response()->json([
            'success' => true,
            'data' => [
                'total_titles' => (int) $totalTitles,
                'total_copies' => (int) $totalCopies,
                'available_copies' => (int) $availableCopies,
                'active_issues' => (int) $activeIssues,
                'overdue_issues' => (int) $overdueIssues,
                'low_stock_titles' => (int) $lowStockTitles,
                'registered_members' => (int) $registeredMembers,
                'pending_requests' => (int) $pendingRequests,
                'outstanding_fines' => (float) $outstandingFines,
                'popular_books' => $popularBooks,
                'recent_circulation' => $recentCirculation,
            ],
        ]);
    }

    public function getBooks()
    {
        $organization = $this->requireOrganization();
        $books = LibraryBook::where('organization_id', $organization->id)
            ->orderByDesc('id')
            ->get()
            ->map(fn ($book) => $this->formatBook($book));

        return response()->json(['success' => true, 'data' => $books]);
    }

    public function storeBook(Request $request)
    {
        $organization = $this->requireOrganization();
        $data = $request->validate([
            'title' => ['required', 'string', 'max:255'],
            'author' => ['required', 'string', 'max:255'],
            'category' => ['required', 'string', 'max:255'],
            'isbn' => ['nullable', 'string', 'max:255'],
            'rack' => ['nullable', 'string', 'max:100'],
            'language' => ['nullable', 'string', 'max:100'],
            'publisher' => ['nullable', 'string', 'max:255'],
            'total_copies' => ['required', 'integer', 'min:1'],
            'price' => ['nullable', 'numeric', 'min:0'],
        ]);

        $totalCopies = (int) $data['total_copies'];

        $book = LibraryBook::create([
            'organization_id' => $organization->id,
            'title' => $data['title'],
            'author' => $data['author'],
            'category' => $data['category'],
            'isbn' => $data['isbn'] ?? null,
            'rack' => $data['rack'] ?? null,
            'rack_number' => $data['rack'] ?? null,
            'language' => $data['language'] ?? 'English',
            'publisher' => $data['publisher'] ?? null,
            'total_copies' => $totalCopies,
            'available_copies' => $totalCopies,
            'issued_count' => 0,
            'price' => $data['price'] ?? 0,
            'status' => $this->bookStatus($totalCopies, $totalCopies),
        ]);

        return response()->json(['success' => true, 'message' => 'Book added successfully', 'data' => $this->formatBook($book)], 201);
    }

    public function updateBook(Request $request, LibraryBook $book)
    {
        $organization = $this->requireOrganization();
        if ($book->organization_id !== $organization->id) {
            return response()->json(['success' => false, 'message' => 'Unauthorized'], 403);
        }

        $data = $request->validate([
            'title' => ['sometimes', 'required', 'string', 'max:255'],
            'author' => ['sometimes', 'required', 'string', 'max:255'],
            'category' => ['sometimes', 'required', 'string', 'max:255'],
            'isbn' => ['nullable', 'string', 'max:255'],
            'rack' => ['nullable', 'string', 'max:100'],
            'language' => ['nullable', 'string', 'max:100'],
            'publisher' => ['nullable', 'string', 'max:255'],
            'total_copies' => ['sometimes', 'required', 'integer', 'min:1'],
            'price' => ['nullable', 'numeric', 'min:0'],
        ]);

        $updates = $data;
        if (isset($data['total_copies'])) {
            $newTotal = (int) $data['total_copies'];
            $diff = $newTotal - $book->total_copies;
            $updates['available_copies'] = max(0, $book->available_copies + $diff);
            $updates['total_copies'] = $newTotal;
            $updates['status'] = $this->bookStatus($newTotal, $updates['available_copies']);
        }

        $book->update($updates);

        return response()->json(['success' => true, 'message' => 'Book updated', 'data' => $this->formatBook($book)]);
    }

    public function destroyBook(LibraryBook $book)
    {
        $organization = $this->requireOrganization();
        if ($book->organization_id !== $organization->id) {
            return response()->json(['success' => false, 'message' => 'Unauthorized'], 403);
        }

        $book->delete();

        return response()->json(['success' => true, 'message' => 'Book deleted']);
    }

    public function importBooks(Request $request)
    {
        $organization = $this->requireOrganization();
        $data = $request->validate([
            'books' => ['required', 'array', 'min:1'],
            'books.*.title' => ['required', 'string', 'max:255'],
            'books.*.author' => ['required', 'string', 'max:255'],
            'books.*.category' => ['required', 'string', 'max:255'],
            'books.*.isbn' => ['nullable', 'string', 'max:255'],
            'books.*.rack' => ['nullable', 'string', 'max:100'],
            'books.*.language' => ['nullable', 'string', 'max:100'],
            'books.*.publisher' => ['nullable', 'string', 'max:255'],
            'books.*.total_copies' => ['required', 'integer', 'min:1'],
            'books.*.price' => ['nullable', 'numeric', 'min:0'],
        ]);

        $imported = [];
        foreach ($data['books'] as $bookData) {
            $totalCopies = (int) $bookData['total_copies'];
            $book = LibraryBook::create([
                'organization_id' => $organization->id,
                'title' => $bookData['title'],
                'author' => $bookData['author'],
                'category' => $bookData['category'],
                'isbn' => $bookData['isbn'] ?? null,
                'rack' => $bookData['rack'] ?? null,
                'rack_number' => $bookData['rack'] ?? null,
                'language' => $bookData['language'] ?? 'English',
                'publisher' => $bookData['publisher'] ?? null,
                'total_copies' => $totalCopies,
                'available_copies' => $totalCopies,
                'issued_count' => 0,
                'price' => $bookData['price'] ?? 0,
                'status' => $this->bookStatus($totalCopies, $totalCopies),
            ]);
            $imported[] = $this->formatBook($book);
        }

        return response()->json(['success' => true, 'message' => count($imported) . ' books imported', 'data' => $imported], 201);
    }

    public function getMembers()
    {
        $organization = $this->requireOrganization();
        $organizationId = $organization->id;

        $libraryMembers = LibraryMember::where('organization_id', $organizationId)
            ->withCount([
                'circulations as active_loans_count' => fn ($q) => $q->whereIn('status', ['Issued', 'Overdue']),
                'circulations as overdue_books_count' => fn ($q) => $q->where('status', 'Overdue'),
            ])
            ->get()
            ->keyBy(fn ($m) => $m->member_type . '-' . ($m->student_id ?: $m->user_id));

        $members = collect()
            ->merge($this->studentMembers($organizationId, $libraryMembers))
            ->merge($this->teacherMembers($organizationId, $libraryMembers))
            ->sortBy('name', SORT_NATURAL | SORT_FLAG_CASE)
            ->values();

        return response()->json(['success' => true, 'data' => $members]);
    }

    public function generateCard(Request $request, string $memberKey)
    {
        $organization = $this->requireOrganization();
        [$memberType, $sourceId] = $this->parseMemberKey($memberKey);
        $member = $this->findOrCreateLibraryMember($organization->id, $memberType, $sourceId);

        if (!$member->library_card_number) {
            $member->update([
                'library_card_number' => $this->generateLibraryCardNumber($memberType, $sourceId),
            ]);
        }

        return response()->json(['success' => true, 'message' => 'Library card generated', 'data' => [
            'library_card_number' => $member->library_card_number,
        ]]);
    }

    public function getCirculation()
    {
        $organization = $this->requireOrganization();
        $entries = LibraryCirculation::where('organization_id', $organization->id)
            ->with(['book', 'member.student', 'member.user'])
            ->latest('id')
            ->get()
            ->map(fn ($entry) => $this->formatCirculation($entry));

        return response()->json(['success' => true, 'data' => $entries]);
    }

    public function issueBook(Request $request)
    {
        $organization = $this->requireOrganization();
        $data = $request->validate([
            'library_book_id' => ['required', 'exists:library_books,id'],
            'member_key' => ['required', 'string'],
            'issue_date' => ['nullable', 'date'],
            'due_date' => ['nullable', 'date'],
        ]);

        $book = LibraryBook::where('organization_id', $organization->id)
            ->findOrFail($data['library_book_id']);

        if ($book->available_copies < 1) {
            return response()->json(['success' => false, 'message' => 'This title is currently unavailable'], 400);
        }

        [$memberType, $sourceId] = $this->parseMemberKey($data['member_key']);
        $member = $this->findOrCreateLibraryMember($organization->id, $memberType, $sourceId);

        if ($memberType === 'Student' && !$member->library_card_number) {
            return response()->json(['success' => false, 'message' => 'Generate a library card for this student first'], 400);
        }

        $issueDate = $data['issue_date'] ?? now()->toDateString();
        $dueDate = $data['due_date'] ?? now()->addDays(14)->toDateString();
        $status = now()->toDateString() > $dueDate ? 'Overdue' : 'Issued';

        $circulation = LibraryCirculation::create([
            'organization_id' => $organization->id,
            'library_book_id' => $book->id,
            'library_member_id' => $member->id,
            'issue_date' => $issueDate,
            'due_date' => $dueDate,
            'status' => $status,
        ]);

        $book->update([
            'available_copies' => $book->available_copies - 1,
            'issued_count' => ((int) ($book->issued_count ?? 0)) + 1,
        ]);

        return response()->json(['success' => true, 'message' => 'Book issued successfully', 'data' => $this->formatCirculation($circulation)], 201);
    }

    public function returnBook(LibraryCirculation $circulation)
    {
        $organization = $this->requireOrganization();
        if ($circulation->organization_id !== $organization->id) {
            return response()->json(['success' => false, 'message' => 'Unauthorized'], 403);
        }

        if ($circulation->status === 'Returned') {
            return response()->json(['success' => false, 'message' => 'Book already returned'], 400);
        }

        $fine = 0;
        $dueDate = $circulation->due_date;
        if ($dueDate && now()->toDateString() > $dueDate->toDateString()) {
            $daysOverdue = now()->diffInDays($dueDate);
            $fine = $daysOverdue * 5;
        }

        DB::transaction(function () use ($circulation, $fine) {
            $circulation->update([
                'status' => 'Returned',
                'return_date' => now()->toDateString(),
            ]);

            $book = $circulation->book;
            if ($book) {
                $book->update([
                    'available_copies' => $book->available_copies + 1,
                ]);
            }

            if ($fine > 0 && $circulation->member) {
                $circulation->member->increment('fine_due', $fine);
            }
        });

        return response()->json(['success' => true, 'message' => 'Book returned successfully', 'fine' => $fine]);
    }

    public function destroyCirculation(LibraryCirculation $circulation)
    {
        $organization = $this->requireOrganization();
        if ($circulation->organization_id !== $organization->id) {
            return response()->json(['success' => false, 'message' => 'Unauthorized'], 403);
        }

        if ($circulation->status !== 'Returned') {
            $book = $circulation->book;
            if ($book) {
                $book->update([
                    'available_copies' => $book->available_copies + 1,
                ]);
            }
        }

        $circulation->delete();

        return response()->json(['success' => true, 'message' => 'Circulation record deleted']);
    }

    public function getRequests()
    {
        $organization = $this->requireOrganization();
        $requests = LibraryAcquisitionRequest::where('organization_id', $organization->id)
            ->latest('id')
            ->get()
            ->map(fn ($r) => $this->formatRequest($r));

        return response()->json(['success' => true, 'data' => $requests]);
    }

    public function storeRequest(Request $request)
    {
        $organization = $this->requireOrganization();
        $data = $request->validate([
            'title' => ['required', 'string', 'max:255'],
            'requested_by' => ['required', 'string', 'max:255'],
            'category' => ['required', 'string', 'max:255'],
            'priority' => ['required', 'in:High,Medium,Low'],
            'copies' => ['required', 'integer', 'min:1'],
            'budget' => ['required', 'numeric', 'min:0'],
            'note' => ['nullable', 'string'],
        ]);

        $req = LibraryAcquisitionRequest::create([
            'organization_id' => $organization->id,
            'title' => $data['title'],
            'requested_by' => $data['requested_by'],
            'category' => $data['category'],
            'priority' => $data['priority'],
            'copies' => $data['copies'],
            'budget' => $data['budget'],
            'status' => 'Pending',
            'note' => $data['note'] ?? null,
        ]);

        return response()->json(['success' => true, 'message' => 'Acquisition request submitted', 'data' => $this->formatRequest($req)], 201);
    }

    public function updateRequestStatus(Request $request, LibraryAcquisitionRequest $req)
    {
        $organization = $this->requireOrganization();
        if ($req->organization_id !== $organization->id) {
            return response()->json(['success' => false, 'message' => 'Unauthorized'], 403);
        }

        $data = $request->validate([
            'status' => ['required', 'in:Pending,Approved,Ordered,Cancelled'],
        ]);

        $req->update(['status' => $data['status']]);

        return response()->json(['success' => true, 'message' => 'Request status updated', 'data' => $this->formatRequest($req)]);
    }

    public function destroyRequest(LibraryAcquisitionRequest $req)
    {
        $organization = $this->requireOrganization();
        if ($req->organization_id !== $organization->id) {
            return response()->json(['success' => false, 'message' => 'Unauthorized'], 403);
        }

        $req->delete();

        return response()->json(['success' => true, 'message' => 'Request deleted']);
    }

    private function formatBook(LibraryBook $book): array
    {
        return [
            'id' => $book->id,
            'title' => $book->title,
            'author' => $book->author,
            'category' => $book->category,
            'isbn' => $book->isbn ?? '',
            'rack' => $book->rack ?? $book->rack_number ?? '',
            'language' => $book->language ?? 'English',
            'publisher' => $book->publisher ?? '',
            'total_copies' => $book->total_copies,
            'available_copies' => $book->available_copies,
            'issued_count' => (int) ($book->issued_count ?? 0),
            'price' => (float) $book->price,
            'status' => $this->bookStatus($book->total_copies, $book->available_copies),
        ];
    }

    private function formatCirculation(LibraryCirculation $entry): array
    {
        $member = $entry->member;
        $memberKey = '';
        $memberName = '';
        if ($member) {
            $memberKey = strtolower($member->member_type) . '-' . ($member->student_id ?: $member->user_id);
            if ($member->student) {
                $memberName = $member->student->first_name . ' ' . ($member->student->last_name ?? '');
            } elseif ($member->user) {
                $memberName = $member->user->name;
            }
        }

        return [
            'id' => $entry->id,
            'library_book_id' => $entry->library_book_id,
            'library_member_id' => $entry->library_member_id,
            'member_key' => $memberKey,
            'member_name' => $memberName,
            'book_title' => $entry->book?->title ?? '',
            'book_author' => $entry->book?->author ?? '',
            'issue_date' => $entry->issue_date?->format('Y-m-d') ?? '',
            'due_date' => $entry->due_date?->format('Y-m-d') ?? '',
            'return_date' => $entry->return_date?->format('Y-m-d') ?? '',
            'status' => $entry->status,
        ];
    }

    private function formatRequest(LibraryAcquisitionRequest $req): array
    {
        return [
            'id' => $req->id,
            'title' => $req->title,
            'requested_by' => $req->requested_by,
            'category' => $req->category,
            'priority' => $req->priority,
            'copies' => $req->copies,
            'budget' => (float) $req->budget,
            'status' => $req->status,
            'note' => $req->note,
        ];
    }

    private function bookStatus(int $totalCopies, int $availableCopies): string
    {
        if ($availableCopies <= 0) return 'Issued Out';
        if ($availableCopies <= 2) return 'Low Stock';
        return 'Available';
    }

    private function studentMembers(int $organizationId, $libraryMembers)
    {
        return Student::query()
            ->with('schoolClass')
            ->where('organization_id', $organizationId)
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
                    'member_key' => $key,
                    'name' => trim($student->first_name . ' ' . ($student->last_name ?? '')),
                    'member_type' => 'Student',
                    'class_or_dept' => trim('Class ' . $className . ($section ? ' - ' . $section : '')),
                    'admission_no' => $student->admission_no,
                    'library_card_number' => $libraryMember?->library_card_number,
                    'active_loans' => (int) ($libraryMember?->active_loans_count ?? 0),
                    'overdue_books' => (int) ($libraryMember?->overdue_books_count ?? 0),
                    'fine_due' => (float) ($libraryMember?->fine_due ?? 0),
                ];
            });
    }

    private function teacherMembers(int $organizationId, $libraryMembers)
    {
        return User::query()
            ->where('organization_id', $organizationId)
            ->where('role', 'teacher')
            ->where(fn ($q) => $q->whereNull('status')->orWhere('status', 'active'))
            ->orderBy('name')
            ->get()
            ->map(function (User $teacher) use ($libraryMembers) {
                $key = 'Teacher-' . $teacher->id;
                $libraryMember = $libraryMembers->get($key);

                return [
                    'id' => 'teacher-' . $teacher->id,
                    'member_key' => $key,
                    'name' => $teacher->name,
                    'member_type' => 'Teacher',
                    'class_or_dept' => 'Teaching Staff',
                    'admission_no' => 'EMP-' . str_pad((string) $teacher->id, 3, '0', STR_PAD_LEFT),
                    'library_card_number' => $libraryMember?->library_card_number,
                    'active_loans' => (int) ($libraryMember?->active_loans_count ?? 0),
                    'overdue_books' => (int) ($libraryMember?->overdue_books_count ?? 0),
                    'fine_due' => (float) ($libraryMember?->fine_due ?? 0),
                ];
            });
    }

    private function parseMemberKey(string $memberKey): array
    {
        if (!preg_match('/^(student|teacher)-(\d+)$/i', $memberKey, $matches)) {
            throw ValidationException::withMessages([
                'member_key' => 'Invalid library member selected.',
            ]);
        }

        return [ucfirst($matches[1]), (int) $matches[2]];
    }

    private function findOrCreateLibraryMember(int $organizationId, string $memberType, int $sourceId): LibraryMember
    {
        if ($memberType === 'Student') {
            Student::where('organization_id', $organizationId)->findOrFail($sourceId);

            return LibraryMember::firstOrCreate(
                ['organization_id' => $organizationId, 'student_id' => $sourceId],
                ['member_type' => 'Student'],
            );
        }

        User::where('organization_id', $organizationId)->where('role', 'teacher')->findOrFail($sourceId);

        return LibraryMember::firstOrCreate(
            ['organization_id' => $organizationId, 'user_id' => $sourceId],
            ['member_type' => 'Teacher'],
        );
    }

    private function generateLibraryCardNumber(string $memberType, int $sourceId): string
    {
        $prefix = $memberType === 'Student' ? 'STU' : 'EMP';

        do {
            $number = 'LIB-' . $prefix . '-' . str_pad((string) $sourceId, 4, '0', STR_PAD_LEFT);
        } while (LibraryMember::where('library_card_number', $number)->exists());

        return $number;
    }

    private function requireOrganization(): Organization
    {
        $user = Auth::user();
        if ($user->organization_id) {
            return Organization::findOrFail($user->organization_id);
        }

        if ($user->role === 'admin' && Organization::count() === 1) {
            $org = Organization::first();
            if ($org) {
                $user->forceFill(['organization_id' => $org->id])->save();
                return $org;
            }
        }

        abort(403, 'No organization associated with your account.');
    }
}
