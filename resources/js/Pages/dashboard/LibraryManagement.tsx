import { useLanguage } from '../../i18n/LanguageProvider';
import { useEffect, useMemo, useRef, useState } from 'react';
import {
    AlertTriangle,
    BadgeIndianRupee,
    BookCopy,
    BookOpen,
    BookmarkPlus,
    CalendarClock,
    CheckCircle2,
    Clock3,
    CopyPlus,
    CreditCard,
    Download,
    Pencil,
    LayoutGrid,
    LibraryBig,
    Search,
    ShieldAlert,
    Sparkles,
    Trash2,
    Upload,
    Users,
} from 'lucide-react';
import DashboardLayout from '../DashboardLayout';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '../ui/card';
import { Button } from '../ui/button';
import { Input } from '../ui/input';
import { Label } from '../ui/label';
import { Badge } from '../ui/badge';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '../ui/tabs';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '../ui/table';
import {
    Dialog,
    DialogContent,
    DialogDescription,
    DialogFooter,
    DialogHeader,
    DialogTitle,
    DialogTrigger,
} from '../ui/dialog';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '../ui/select';
import { Textarea } from '../ui/textarea';
import { router } from '@inertiajs/react';
import { toast } from 'sonner';

interface LibraryManagementProps {
    user: {
        name?: string;
        email?: string;
        role?: string;
    };
    books?: Book[];
    members?: Member[];
    circulation?: Circulation[];
    requests?: AcquisitionRequest[];
}

type BookStatus = 'Available' | 'Low Stock' | 'Issued Out';
type MemberType = 'Student' | 'Teacher';
type CirculationStatus = 'Issued' | 'Overdue' | 'Returned';
type RequestPriority = 'High' | 'Medium' | 'Low';

type Book = {
    id: string;
    title: string;
    author: string;
    category: string;
    isbn: string;
    rack: string;
    language: string;
    publisher: string;
    totalCopies: number;
    availableCopies: number;
    issuedCount: number;
    price: number;
    status: BookStatus;
};

type Member = {
    id: string;
    name: string;
    memberType: MemberType;
    classOrDept: string;
    admissionNo: string;
    libraryCardNumber?: string | null;
    activeLoans: number;
    overdueBooks: number;
    fineDue: number;
};

type Circulation = {
    id: string;
    bookId: string;
    memberId: string;
    issueDate: string;
    dueDate: string;
    returnDate?: string;
    status: CirculationStatus;
};

type AcquisitionRequest = {
    id: string;
    title: string;
    requestedBy: string;
    category: string;
    priority: RequestPriority;
    copies: number;
    budget: number;
    status: 'Pending' | 'Approved' | 'Ordered';
};

const initialBooks: Book[] = [
    {
        id: 'BK-101',
        title: 'Foundations of Physics',
        author: 'H. C. Verma',
        category: 'Science',
        isbn: '978-81-7709-187-1',
        rack: 'SCI-A1',
        language: 'English',
        publisher: 'Bharati Bhawan',
        totalCopies: 18,
        availableCopies: 4,
        issuedCount: 14,
        price: 560,
        status: 'Low Stock',
    },
    {
        id: 'BK-102',
        title: 'Wings of Fire',
        author: 'A. P. J. Abdul Kalam',
        category: 'Biography',
        isbn: '978-81-7317-371-1',
        rack: 'BIO-B2',
        language: 'English',
        publisher: 'Universities Press',
        totalCopies: 12,
        availableCopies: 7,
        issuedCount: 5,
        price: 299,
        status: 'Available',
    },
    {
        id: 'BK-103',
        title: 'Advanced Mathematics Handbook',
        author: 'Arihant Experts',
        category: 'Reference',
        isbn: '978-93-5276-520-7',
        rack: 'REF-C4',
        language: 'English',
        publisher: 'Arihant',
        totalCopies: 10,
        availableCopies: 0,
        issuedCount: 10,
        price: 740,
        status: 'Issued Out',
    },
    {
        id: 'BK-104',
        title: 'The Discovery of India',
        author: 'Jawaharlal Nehru',
        category: 'History',
        isbn: '978-01-4303-103-1',
        rack: 'HIS-D1',
        language: 'English',
        publisher: 'Penguin',
        totalCopies: 9,
        availableCopies: 6,
        issuedCount: 3,
        price: 499,
        status: 'Available',
    },
    {
        id: 'BK-105',
        title: 'Computer Networking Basics',
        author: 'Behrouz Forouzan',
        category: 'Technology',
        isbn: '978-00-7325-032-8',
        rack: 'TECH-E3',
        language: 'English',
        publisher: 'McGraw Hill',
        totalCopies: 15,
        availableCopies: 2,
        issuedCount: 13,
        price: 880,
        status: 'Low Stock',
    },
];

const initialMembers: Member[] = [
    {
        id: 'MB-201',
        name: 'Ananya Sharma',
        memberType: 'Student',
        classOrDept: 'Class 10 - A',
        admissionNo: 'STU-1045',
        libraryCardNumber: 'LIB-STU-1045',
        activeLoans: 2,
        overdueBooks: 1,
        fineDue: 120,
    },
    {
        id: 'MB-202',
        name: 'Rohan Patil',
        memberType: 'Student',
        classOrDept: 'Class 9 - C',
        admissionNo: 'STU-0977',
        libraryCardNumber: null,
        activeLoans: 1,
        overdueBooks: 0,
        fineDue: 0,
    },
    {
        id: 'MB-203',
        name: 'Meera Joshi',
        memberType: 'Teacher',
        classOrDept: 'Science Department',
        admissionNo: 'EMP-014',
        libraryCardNumber: 'LIB-EMP-014',
        activeLoans: 3,
        overdueBooks: 0,
        fineDue: 0,
    },
    {
        id: 'MB-204',
        name: 'Vivaan Singh',
        memberType: 'Student',
        classOrDept: 'Class 11 - B',
        admissionNo: 'STU-1188',
        libraryCardNumber: 'LIB-STU-1188',
        activeLoans: 2,
        overdueBooks: 2,
        fineDue: 260,
    },
];

const initialCirculation: Circulation[] = [
    {
        id: 'IS-301',
        bookId: 'BK-101',
        memberId: 'MB-201',
        issueDate: '2026-03-12',
        dueDate: '2026-03-26',
        status: 'Overdue',
    },
    {
        id: 'IS-302',
        bookId: 'BK-105',
        memberId: 'MB-203',
        issueDate: '2026-03-18',
        dueDate: '2026-04-01',
        status: 'Issued',
    },
    {
        id: 'IS-303',
        bookId: 'BK-102',
        memberId: 'MB-202',
        issueDate: '2026-03-08',
        dueDate: '2026-03-20',
        returnDate: '2026-03-19',
        status: 'Returned',
    },
    {
        id: 'IS-304',
        bookId: 'BK-103',
        memberId: 'MB-204',
        issueDate: '2026-03-10',
        dueDate: '2026-03-22',
        status: 'Overdue',
    },
];

const initialRequests: AcquisitionRequest[] = [
    {
        id: 'AR-401',
        title: 'NCERT Exemplar Mathematics XII',
        requestedBy: 'Mathematics Department',
        category: 'Reference',
        priority: 'High',
        copies: 8,
        budget: 6400,
        status: 'Approved',
    },
    {
        id: 'AR-402',
        title: 'Atomic Habits',
        requestedBy: 'Student Council',
        category: 'Self Development',
        priority: 'Medium',
        copies: 5,
        budget: 2250,
        status: 'Pending',
    },
    {
        id: 'AR-403',
        title: 'Python Crash Course',
        requestedBy: 'Computer Lab',
        category: 'Technology',
        priority: 'High',
        copies: 6,
        budget: 5400,
        status: 'Ordered',
    },
];

const emptyBookForm = {
    title: '',
    author: '',
    category: '',
    isbn: '',
    rack: '',
    language: 'English',
    publisher: '',
    totalCopies: '1',
    price: '',
};

const createEmptyIssueForm = () => {
    const issueDate = new Date().toISOString().slice(0, 10);
    const dueDate = new Date(Date.now() + 14 * 24 * 60 * 60 * 1000).toISOString().slice(0, 10);

    return {
        bookId: '',
        memberId: '',
        issueDate,
        dueDate,
    };
};

const emptyRequestForm = {
    title: '',
    requestedBy: '',
    category: '',
    priority: 'Medium' as RequestPriority,
    copies: '1',
    budget: '',
    note: '',
};

const sampleCsvHeaders = [
    'title',
    'author',
    'category',
    'isbn',
    'rack',
    'language',
    'publisher',
    'totalCopies',
    'price',
];

function getStatusBadgeClass(status: string) {
    if (status === 'Available' || status === 'Returned' || status === 'Approved') {
        return 'bg-emerald-100 text-emerald-700 border-emerald-200';
    }

    if (status === 'Low Stock' || status === 'Issued' || status === 'Ordered' || status === 'Medium') {
        return 'bg-blue-100 text-blue-700 border-blue-200';
    }

    if (status === 'Overdue' || status === 'Issued Out' || status === 'Pending' || status === 'High') {
        return 'bg-rose-100 text-rose-700 border-rose-200';
    }

    return 'bg-slate-100 text-slate-700 border-slate-200';
}

function escapeCsvValue(value: string | number) {
    const stringValue = String(value ?? '');
    if (/[",\n]/.test(stringValue)) {
        return `"${stringValue.replace(/"/g, '""')}"`;
    }

    return stringValue;
}

function parseCsvLine(line: string) {
    const values: string[] = [];
    let current = '';
    let insideQuotes = false;

    for (let index = 0; index < line.length; index += 1) {
        const char = line[index];
        const nextChar = line[index + 1];

        if (char === '"' && insideQuotes && nextChar === '"') {
            current += '"';
            index += 1;
            continue;
        }

        if (char === '"') {
            insideQuotes = !insideQuotes;
            continue;
        }

        if (char === ',' && !insideQuotes) {
            values.push(current.trim());
            current = '';
            continue;
        }

        current += char;
    }

    values.push(current.trim());
    return values;
}

function parseMemberClassSection(member: Member) {
    if (member.memberType !== 'Student') {
        return { className: '', section: '' };
    }

    const match = member.classOrDept.match(/^Class\s+(.+?)\s*-\s*(.+)$/i);

    if (!match) {
        return { className: member.classOrDept.trim(), section: '' };
    }

    return {
        className: match[1].trim(),
        section: match[2].trim(),
    };
}

const getFirstErrorMessage = (errors: Record<string, string | string[] | undefined>) => {
    for (const value of Object.values(errors)) {
        if (Array.isArray(value) && value[0]) {
            return value[0];
        }

        if (typeof value === 'string' && value.trim()) {
            return value;
        }
    }

    return null;
};

export default function LibraryManagement({
    user,
    books: propBooks = [],
    members: propMembers = [],
    circulation: propCirculation = [],
    requests: propRequests = [],
}: LibraryManagementProps) {
    const { t } = useLanguage();
    const [books, setBooks] = useState<Book[]>(propBooks);
    const [members, setMembers] = useState<Member[]>(propMembers);
    const [circulation, setCirculation] = useState<Circulation[]>(propCirculation);
    const [requests, setRequests] = useState<AcquisitionRequest[]>(propRequests);
    const [catalogSearch, setCatalogSearch] = useState('');
    const [memberSearch, setMemberSearch] = useState('');
    const [memberFilterClass, setMemberFilterClass] = useState('');
    const [memberFilterSection, setMemberFilterSection] = useState('');
    const [circulationSearch, setCirculationSearch] = useState('');
    const [issueBookSearch, setIssueBookSearch] = useState('');
    const [issueMemberSearch, setIssueMemberSearch] = useState('');
    const [bookForm, setBookForm] = useState(emptyBookForm);
    const [issueForm, setIssueForm] = useState(createEmptyIssueForm);
    const [requestForm, setRequestForm] = useState(emptyRequestForm);
    const [showAddBookDialog, setShowAddBookDialog] = useState(false);
    const [showIssueDialog, setShowIssueDialog] = useState(false);
    const [showRequestDialog, setShowRequestDialog] = useState(false);
    const [editingBookId, setEditingBookId] = useState<string | null>(null);
    const importInputRef = useRef<HTMLInputElement | null>(null);

    const syncLibraryState = (page: any) => {
        if (Array.isArray(page?.props?.books)) {
            setBooks(page.props.books);
        }

        if (Array.isArray(page?.props?.members)) {
            setMembers(page.props.members);
        }

        if (Array.isArray(page?.props?.circulation)) {
            setCirculation(page.props.circulation);
        }

        if (Array.isArray(page?.props?.requests)) {
            setRequests(page.props.requests);
        }
    };

    useEffect(() => {
        setBooks(propBooks);
    }, [propBooks]);

    useEffect(() => {
        setMembers(propMembers);
    }, [propMembers]);

    useEffect(() => {
        setCirculation(propCirculation);
    }, [propCirculation]);

    useEffect(() => {
        setRequests(propRequests);
    }, [propRequests]);

    const canManageLibrary = ['super_admin', 'branch_admin', 'admin', 'librarian'].includes(user?.role || '');

    const catalog = useMemo(() => {
        const query = catalogSearch.trim().toLowerCase();

        if (!query) {
            return books;
        }

        return books.filter((book) =>
            [book.title, book.author, book.category, book.isbn, book.rack].some((value) =>
                value.toLowerCase().includes(query),
            ),
        );
    }, [books, catalogSearch]);

    const memberClasses = useMemo(
        () =>
            [...new Set(members.map((member) => parseMemberClassSection(member).className).filter(Boolean))].sort(
                (a, b) => a.localeCompare(b, undefined, { numeric: true }),
            ),
        [members],
    );

    const memberSections = useMemo(() => {
        const source = memberFilterClass
            ? members.filter((member) => parseMemberClassSection(member).className === memberFilterClass)
            : members;

        return [...new Set(source.map((member) => parseMemberClassSection(member).section).filter(Boolean))].sort();
    }, [memberFilterClass, members]);

    const filteredMembers = useMemo(() => {
        const query = memberSearch.trim().toLowerCase();
        return members.filter((member) => {
            const { className, section } = parseMemberClassSection(member);

            if (memberFilterClass && className !== memberFilterClass) {
                return false;
            }

            if (memberFilterSection && section !== memberFilterSection) {
                return false;
            }

            if (!query) {
                return true;
            }

            return [
                member.name,
                member.memberType,
                member.classOrDept,
                member.admissionNo,
                member.libraryCardNumber || '',
            ].some((value) => value.toLowerCase().includes(query));
        });
    }, [memberFilterClass, memberFilterSection, memberSearch, members]);

    const membersBySection = useMemo(() => {
        return filteredMembers.reduce<Record<string, Member[]>>((groups, member) => {
            const key = member.classOrDept;
            if (!groups[key]) {
                groups[key] = [];
            }

            groups[key].push(member);
            return groups;
        }, {});
    }, [filteredMembers]);

    const searchableBooks = useMemo(() => {
        const query = issueBookSearch.trim().toLowerCase();
        return books
            .filter((book) => book.availableCopies > 0)
            .filter((book) =>
                !query
                    ? true
                    : [book.title, book.author, book.isbn, book.category, book.rack].some((value) =>
                          value.toLowerCase().includes(query),
                      ),
            );
    }, [books, issueBookSearch]);

    const eligibleMembers = useMemo(
        () => members.filter((member) => member.memberType === 'Teacher' || Boolean(member.libraryCardNumber)),
        [members],
    );

    const searchableMembers = useMemo(() => {
        const query = issueMemberSearch.trim().toLowerCase();
        return eligibleMembers.filter((member) =>
            !query
                ? true
                : [member.name, member.admissionNo, member.classOrDept, member.libraryCardNumber || ''].some((value) =>
                      value.toLowerCase().includes(query),
                  ),
        );
    }, [eligibleMembers, issueMemberSearch]);

    const filteredCirculation = useMemo(() => {
        const query = circulationSearch.trim().toLowerCase();

        if (!query) {
            return circulation;
        }

        return circulation.filter((entry) => {
            const book = books.find((item) => item.id === entry.bookId);
            const member = members.find((item) => item.id === entry.memberId);

            return [
                book?.title || '',
                book?.author || '',
                member?.name || '',
                member?.admissionNo || '',
                member?.libraryCardNumber || '',
                entry.issueDate,
                entry.dueDate,
                entry.returnDate || '',
                entry.status,
            ]
                .join(' ')
                .toLowerCase()
                .includes(query);
        });
    }, [books, circulation, circulationSearch, members]);

    const totalTitles = books.length;
    const totalCopies = books.reduce((sum, book) => sum + book.totalCopies, 0);
    const availableCopies = books.reduce((sum, book) => sum + book.availableCopies, 0);
    const activeIssues = circulation.filter((entry) => entry.status === 'Issued' || entry.status === 'Overdue').length;
    const overdueIssues = circulation.filter((entry) => entry.status === 'Overdue').length;
    const outstandingFines = members.reduce((sum, member) => sum + member.fineDue, 0);
    const lowStockTitles = books.filter((book) => book.status === 'Low Stock' || book.availableCopies <= 2).length;
    const cardReadyStudents = members.filter(
        (member) => member.memberType === 'Student' && member.libraryCardNumber,
    ).length;
    const pendingCardStudents = members.filter(
        (member) => member.memberType === 'Student' && !member.libraryCardNumber,
    ).length;

    const popularBooks = [...books].sort((first, second) => second.issuedCount - first.issuedCount).slice(0, 3);

    const todayFocus = [
        `${overdueIssues} overdue loans need follow-up`,
        `${lowStockTitles} titles need replenishment review`,
        `${requests.filter((request) => request.status === 'Pending').length} acquisition requests are still pending`,
    ];

    const getBook = (bookId: string) => books.find((book) => book.id === bookId);
    const getMember = (memberId: string) => members.find((member) => member.id === memberId);

    const downloadCsv = (filename: string, rows: Array<Array<string | number>>) => {
        const csvContent = rows.map((row) => row.map((value) => escapeCsvValue(String(value))).join(',')).join('\n');
        const blob = new Blob([csvContent], {
            type: 'text/csv;charset=utf-8;',
        });
        const url = URL.createObjectURL(blob);
        const link = document.createElement('a');
        link.href = url;
        link.setAttribute('download', filename);
        document.body.appendChild(link);
        link.click();
        document.body.removeChild(link);
        URL.revokeObjectURL(url);
    };

    const handleExportBooks = () => {
        const rows = [
            sampleCsvHeaders,
            ...books.map((book) => [
                book.title,
                book.author,
                book.category,
                book.isbn,
                book.rack,
                book.language,
                book.publisher,
                book.totalCopies,
                book.price,
            ]),
        ];

        downloadCsv('library-books-export.csv', rows);
        toast.success('Book catalog exported as CSV');
    };

    const handleDownloadSampleCsv = () => {
        downloadCsv('library-books-sample.csv', [
            sampleCsvHeaders,
            [
                'Sample Physics Guide',
                'N. Kumar',
                'Science',
                '978-00-1111-222-3',
                'SCI-A3',
                'English',
                'Sample House',
                12,
                450,
            ],

            [
                'Hindi Literature Reader',
                'Rekha Verma',
                'Literature',
                '978-00-4444-555-6',
                'LIT-B1',
                'Hindi',
                'Pathshala Books',
                6,
                320,
            ],
        ]);
        toast.success('Sample CSV downloaded');
    };

    const handleGenerateLibraryCard = (memberId: string) => {
        const member = getMember(memberId);

        if (!member || member.libraryCardNumber) {
            return;
        }

        router.post(
            `/library/members/${memberId}/card`,
            {},
            {
                preserveScroll: true,
                onSuccess: (page) => {
                    syncLibraryState(page);
                    toast.success(`Library card created for ${member.name}`);
                },
                onError: (errors) => {
                    toast.error(getFirstErrorMessage(errors) || 'Unable to generate library card.');
                },
            },
        );
    };

    const handleAddBook = (event: React.FormEvent<HTMLFormElement>) => {
        event.preventDefault();

        const payload = {
            title: bookForm.title,
            author: bookForm.author,
            category: bookForm.category,
            isbn: bookForm.isbn,
            rack: bookForm.rack,
            language: bookForm.language,
            publisher: bookForm.publisher,
            totalCopies: Number(bookForm.totalCopies),
            price: Number(bookForm.price),
        };

        const onSuccess = (page: any) => {
            syncLibraryState(page);
            setBookForm(emptyBookForm);
            setEditingBookId(null);
            setShowAddBookDialog(false);
            toast.success(editingBookId ? 'Catalog title updated' : 'New title added to the catalog');
        };

        const onError = (errors: Record<string, string | string[] | undefined>) => {
            toast.error(getFirstErrorMessage(errors) || `Unable to ${editingBookId ? 'update' : 'add'} book.`);
        };

        if (editingBookId) {
            router.patch(`/library/books/${editingBookId}`, payload, {
                preserveScroll: true,
                onSuccess,
                onError,
            });
            return;
        }

        router.post('/library/books', payload, {
            preserveScroll: true,
            onSuccess,
            onError,
        });
    };

    const handleEditBook = (book: Book) => {
        setEditingBookId(book.id);
        setBookForm({
            title: book.title,
            author: book.author,
            category: book.category,
            isbn: book.isbn,
            rack: book.rack,
            language: book.language,
            publisher: book.publisher,
            totalCopies: String(book.totalCopies),
            price: String(book.price),
        });
        setShowAddBookDialog(true);
    };

    const handleDeleteBook = (book: Book) => {
        if (!window.confirm(`Delete "${book.title}" from the catalog?`)) {
            return;
        }

        router.delete(`/library/books/${book.id}`, {
            preserveScroll: true,
            onSuccess: (page) => {
                syncLibraryState(page);
                toast.success('Catalog title deleted');
            },
            onError: (errors) => {
                toast.error(getFirstErrorMessage(errors) || 'Unable to delete book.');
            },
        });
    };

    const handleIssueBook = (event: React.FormEvent<HTMLFormElement>) => {
        event.preventDefault();

        const selectedBook = getBook(issueForm.bookId);
        const selectedMember = getMember(issueForm.memberId);

        if (!selectedBook || !selectedMember) {
            toast.error('Select a valid book and member');
            return;
        }

        if (selectedBook.availableCopies < 1) {
            toast.error('This title is currently unavailable');
            return;
        }

        if (selectedMember.memberType === 'Student' && !selectedMember.libraryCardNumber) {
            toast.error('Generate a library card number for this student before issuing books');
            return;
        }

        router.post('/library/circulation', issueForm, {
            preserveScroll: true,
            onSuccess: (page) => {
                syncLibraryState(page);
                setIssueForm(createEmptyIssueForm());
                setIssueBookSearch('');
                setIssueMemberSearch('');
                setShowIssueDialog(false);
                toast.success(`Issued "${selectedBook.title}" to ${selectedMember.name}`);
            },
            onError: (errors) => {
                toast.error(getFirstErrorMessage(errors) || 'Unable to issue book.');
            },
        });
    };

    const handleReturnBook = (entryId: string) => {
        const selectedEntry = circulation.find((entry) => entry.id === entryId);

        if (!selectedEntry) {
            return;
        }

        router.post(
            `/library/circulation/${entryId}/return`,
            {},
            {
                preserveScroll: true,
                onSuccess: (page) => {
                    syncLibraryState(page);
                    toast.success('Book marked as returned');
                },
                onError: (errors) => {
                    toast.error(getFirstErrorMessage(errors) || 'Unable to mark book as returned.');
                },
            },
        );
    };

    const handleAddRequest = (event: React.FormEvent<HTMLFormElement>) => {
        event.preventDefault();

        router.post(
            '/library/requests',
            {
                title: requestForm.title,
                requestedBy: requestForm.requestedBy,
                category: requestForm.category,
                priority: requestForm.priority,
                copies: Number(requestForm.copies),
                budget: Number(requestForm.budget),
                note: requestForm.note,
            },
            {
                preserveScroll: true,
                onSuccess: (page) => {
                    syncLibraryState(page);
                    setRequestForm(emptyRequestForm);
                    setShowRequestDialog(false);
                    toast.success('Acquisition request submitted');
                },
                onError: (errors) => {
                    toast.error(getFirstErrorMessage(errors) || 'Unable to submit acquisition request.');
                },
            },
        );
    };

    const handleImportBooks = (event: React.ChangeEvent<HTMLInputElement>) => {
        const file = event.target.files?.[0];

        if (!file) {
            return;
        }

        const reader = new FileReader();
        reader.onload = () => {
            const content = String(reader.result || '').trim();

            if (!content) {
                toast.error('The selected CSV file is empty');
                return;
            }

            const lines = content.split(/\r?\n/).filter(Boolean);
            const [headerLine, ...dataLines] = lines;
            const headers = parseCsvLine(headerLine).map((header) => header.trim());
            const normalizedHeaders = sampleCsvHeaders.join('|');

            if (headers.join('|') !== normalizedHeaders) {
                toast.error('CSV headers do not match the sample format');
                return;
            }

            const importedBooks = dataLines
                .map((line, index) => {
                    const [title, author, category, isbn, rack, language, publisher, totalCopies, price] =
                        parseCsvLine(line);
                    const totalCopiesValue = Number(totalCopies);
                    const priceValue = Number(price);

                    if (
                        !title ||
                        !author ||
                        !category ||
                        !isbn ||
                        !rack ||
                        !language ||
                        !publisher ||
                        Number.isNaN(totalCopiesValue)
                    ) {
                        return null;
                    }

                    return {
                        id: `BK-IMP-${Date.now().toString().slice(-4)}-${index}`,
                        title,
                        author,
                        category,
                        isbn,
                        rack,
                        language,
                        publisher,
                        totalCopies: totalCopiesValue,
                        availableCopies: totalCopiesValue,
                        issuedCount: 0,
                        price: Number.isNaN(priceValue) ? 0 : priceValue,
                        status: totalCopiesValue <= 2 ? 'Low Stock' : 'Available',
                    } as Book;
                })
                .filter((book): book is Book => Boolean(book));

            if (!importedBooks.length) {
                toast.error('No valid book rows were found in the CSV');
                return;
            }

            router.post(
                '/library/books/import',
                {
                    books: importedBooks.map((book) => ({
                        title: book.title,
                        author: book.author,
                        category: book.category,
                        isbn: book.isbn,
                        rack: book.rack,
                        language: book.language,
                        publisher: book.publisher,
                        totalCopies: book.totalCopies,
                        price: book.price,
                    })),
                },
                {
                    preserveScroll: true,
                    onSuccess: (page) => {
                        syncLibraryState(page);
                        toast.success(`${importedBooks.length} books imported successfully`);
                    },
                    onError: (errors) => {
                        toast.error(getFirstErrorMessage(errors) || 'Unable to import books.');
                    },
                },
            );
        };

        reader.readAsText(file);
        event.target.value = '';
    };

    return (
        <DashboardLayout user={user} activeTab="library">
            <div className="min-h-full bg-slate-50">
                <div className="border-b border-slate-200 bg-white">
                    <div className="mx-auto max-w-7xl px-6 py-8">
                        <div className="grid gap-6 lg:grid-cols-[1.8fr_1fr]">
                            <div className="rounded-3xl bg-gradient-to-br from-sky-950 via-blue-900 to-cyan-700 p-8 text-white shadow-xl">
                                <div className="mb-6 flex flex-wrap items-center gap-3">
                                    <Badge className="border border-white/20 bg-white/10 text-white hover:bg-white/10">
                                        {t('Library Command Center')}
                                    </Badge>
                                    <Badge className="border border-emerald-200/30 bg-emerald-400/15 text-emerald-50 hover:bg-emerald-400/15">
                                        {t('Session: March 2026')}
                                    </Badge>
                                </div>
                                <div className="max-w-2xl space-y-3">
                                    <h1 className="text-3xl font-semibold tracking-tight md:text-4xl">
                                        {t('Complete library management frontend')}
                                    </h1>
                                    <p className="text-sm leading-6 text-sky-100 md:text-base">
                                        {t(
                                            'Monitor catalog health, track circulation, follow overdue books, and manage acquisition planning from one responsive dashboard.',
                                        )}
                                    </p>
                                </div>
                                <div className="mt-8 grid gap-4 sm:grid-cols-3">
                                    {todayFocus.map((item) => (
                                        <div
                                            key={item}
                                            className="rounded-2xl border border-white/15 bg-white/10 p-4 backdrop-blur"
                                        >
                                            <p className="text-xs uppercase tracking-[0.2em] text-sky-100">
                                                {t("Today's focus")}
                                            </p>
                                            <p className="mt-2 text-sm font-medium text-white">{item}</p>
                                        </div>
                                    ))}
                                </div>
                            </div>

                            <Card className="border-slate-200 shadow-sm">
                                <CardHeader>
                                    <CardTitle className="flex items-center gap-2 text-slate-900">
                                        <Sparkles className="h-5 w-5 text-blue-500" />
                                        {t('Librarian snapshot')}
                                    </CardTitle>
                                    <CardDescription>
                                        {t('Quick view of the most important actions for')}
                                        {user?.name || t('your team')}.
                                    </CardDescription>
                                </CardHeader>
                                <CardContent className="space-y-4">
                                    <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-1">
                                        <div className="rounded-2xl bg-slate-100 p-4">
                                            <p className="text-sm text-slate-500">{t('Outstanding fines')}</p>
                                            <p className="mt-2 text-2xl font-semibold text-slate-900">
                                                {t('Rs.')}
                                                {outstandingFines}
                                            </p>
                                        </div>
                                        <div className="rounded-2xl bg-rose-50 p-4">
                                            <p className="text-sm text-rose-600">{t('Overdue members')}</p>
                                            <p className="mt-2 text-2xl font-semibold text-rose-700">
                                                {members.filter((member) => member.overdueBooks > 0).length}
                                            </p>
                                        </div>
                                        <div className="rounded-2xl bg-emerald-50 p-4">
                                            <p className="text-sm text-emerald-700">{t('Available copies')}</p>
                                            <p className="mt-2 text-2xl font-semibold text-emerald-800">
                                                {availableCopies}
                                            </p>
                                        </div>
                                        <div className="rounded-2xl bg-blue-50 p-4">
                                            <p className="text-sm text-blue-700">{t('Students with cards')}</p>
                                            <p className="mt-2 text-2xl font-semibold text-blue-800">
                                                {cardReadyStudents}
                                            </p>
                                        </div>
                                    </div>
                                    <div className="rounded-2xl border border-dashed border-slate-200 p-4">
                                        <p className="text-xs font-medium uppercase tracking-[0.18em] text-slate-500">
                                            {t('Access level')}
                                        </p>
                                        <p className="mt-2 text-sm text-slate-700">
                                            {canManageLibrary
                                                ? t('You can add books, issue titles, and manage acquisition requests.')
                                                : t(
                                                      'You have view-only access to catalog, circulation, and library insights.',
                                                  )}
                                        </p>
                                    </div>
                                </CardContent>
                            </Card>
                        </div>
                    </div>
                </div>

                <div className="mx-auto max-w-7xl space-y-6 px-6 py-6">
                    <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
                        <Card className="border-slate-200 shadow-sm">
                            <CardContent className="flex items-center justify-between pt-6">
                                <div>
                                    <p className="whitespace-nowrap text-sm text-slate-500">{t('Catalog titles')}</p>
                                    <p className="mt-2 text-3xl font-semibold text-slate-900">{totalTitles}</p>
                                </div>
                                <div className="rounded-2xl bg-blue-50 p-3 text-blue-600">
                                    <LibraryBig className="h-6 w-6" />
                                </div>
                            </CardContent>
                        </Card>
                        <Card className="border-slate-200 shadow-sm">
                            <CardContent className="flex items-center justify-between pt-6">
                                <div>
                                    <p className="whitespace-nowrap text-sm text-slate-500">{t('Total copies')}</p>
                                    <p className="mt-2 text-3xl font-semibold text-slate-900">{totalCopies}</p>
                                </div>
                                <div className="rounded-2xl bg-cyan-50 p-3 text-cyan-700">
                                    <BookCopy className="h-6 w-6" />
                                </div>
                            </CardContent>
                        </Card>
                        <Card className="border-slate-200 shadow-sm">
                            <CardContent className="flex items-center justify-between pt-6">
                                <div>
                                    <p className="whitespace-nowrap text-sm text-slate-500">{t('Active issues')}</p>
                                    <p className="mt-2 text-3xl font-semibold text-slate-900">{activeIssues}</p>
                                </div>
                                <div className="rounded-2xl bg-blue-50 p-3 text-blue-700">
                                    <CalendarClock className="h-6 w-6" />
                                </div>
                            </CardContent>
                        </Card>
                        <Card className="border-slate-200 shadow-sm">
                            <CardContent className="flex items-center justify-between pt-6">
                                <div>
                                    <p className="whitespace-nowrap text-sm text-slate-500">
                                        {t('Registered members')}
                                    </p>
                                    <p className="mt-2 text-3xl font-semibold text-slate-900">{members.length}</p>
                                </div>
                                <div className="rounded-2xl bg-emerald-50 p-3 text-emerald-700">
                                    <Users className="h-6 w-6" />
                                </div>
                            </CardContent>
                        </Card>
                    </div>

                    <Tabs defaultValue="overview" className="space-y-6">
                        <TabsList className="h-auto w-full flex-wrap justify-start gap-2 rounded-2xl bg-white p-2 shadow-sm">
                            <TabsTrigger
                                value="overview"
                                className="data-[state=active]:border-blue-600 data-[state=active]:bg-blue-600 data-[state=active]:text-white"
                            >
                                {t('Overview')}
                            </TabsTrigger>
                            <TabsTrigger
                                value="catalog"
                                className="data-[state=active]:border-blue-600 data-[state=active]:bg-blue-600 data-[state=active]:text-white"
                            >
                                {t('Catalog')}
                            </TabsTrigger>
                            <TabsTrigger
                                value="circulation"
                                className="data-[state=active]:border-blue-600 data-[state=active]:bg-blue-600 data-[state=active]:text-white"
                            >
                                {t('Circulation')}
                            </TabsTrigger>
                            <TabsTrigger
                                value="members"
                                className="data-[state=active]:border-blue-600 data-[state=active]:bg-blue-600 data-[state=active]:text-white"
                            >
                                {t('Members')}
                            </TabsTrigger>
                            <TabsTrigger
                                value="acquisition"
                                className="data-[state=active]:border-blue-600 data-[state=active]:bg-blue-600 data-[state=active]:text-white"
                            >
                                {t('Acquisition')}
                            </TabsTrigger>
                        </TabsList>

                        <TabsContent value="overview" className="space-y-6">
                            <div className="grid gap-6 xl:grid-cols-[1.3fr_0.7fr]">
                                <Card className="border-slate-200 shadow-sm">
                                    <CardHeader>
                                        <CardTitle className="flex items-center gap-2">
                                            <LayoutGrid className="h-5 w-5 text-blue-600" />
                                            {t('Collection performance')}
                                        </CardTitle>
                                        <CardDescription>
                                            {t(
                                                'Borrowing intensity and shelf availability across the current catalog.',
                                            )}
                                        </CardDescription>
                                    </CardHeader>
                                    <CardContent>
                                        <div className="grid gap-4 md:grid-cols-2">
                                            {popularBooks.map((book) => (
                                                <div
                                                    key={book.id}
                                                    className="rounded-2xl border border-slate-200 bg-slate-50 p-4 md:col-span-1"
                                                >
                                                    <div className="flex items-start justify-between gap-3">
                                                        <div>
                                                            <p className="text-sm font-semibold text-slate-900">
                                                                {t(book.title)}
                                                            </p>
                                                            <p className="mt-1 text-sm text-slate-500">{book.author}</p>
                                                        </div>
                                                        <Badge className={getStatusBadgeClass(book.status)}>
                                                            {t(book.status)}
                                                        </Badge>
                                                    </div>
                                                    <div className="mt-4 space-y-2 text-sm text-slate-600">
                                                        <div className="flex items-center justify-between">
                                                            <span>{t('Times issued')}</span>
                                                            <span className="font-medium text-slate-900">
                                                                {book.issuedCount}
                                                            </span>
                                                        </div>
                                                        <div className="flex items-center justify-between">
                                                            <span>{t('Available copies')}</span>
                                                            <span className="font-medium text-slate-900">
                                                                {book.availableCopies}
                                                            </span>
                                                        </div>
                                                        <div className="flex items-center justify-between">
                                                            <span>{t('Rack')}</span>
                                                            <span className="font-medium text-slate-900">
                                                                {book.rack}
                                                            </span>
                                                        </div>
                                                    </div>
                                                </div>
                                            ))}
                                            <div className="rounded-2xl border border-dashed border-slate-200 p-5 md:col-span-2">
                                                <p className="text-sm font-medium text-slate-900">
                                                    {t('Frontend coverage included in this module')}
                                                </p>
                                                <div className="mt-3 grid gap-3 sm:grid-cols-2 xl:grid-cols-4">
                                                    {[
                                                        'Dashboard KPIs',
                                                        'Catalog search',
                                                        'Issue and return flow',
                                                        'Members and fine tracking',
                                                    ].map((item) => (
                                                        <div
                                                            key={item}
                                                            className="rounded-xl bg-slate-100 px-3 py-2 text-sm text-slate-700"
                                                        >
                                                            {item}
                                                        </div>
                                                    ))}
                                                </div>
                                            </div>
                                        </div>
                                    </CardContent>
                                </Card>

                                <Card className="border-slate-200 shadow-sm">
                                    <CardHeader>
                                        <CardTitle className="flex items-center gap-2">
                                            <ShieldAlert className="h-5 w-5 text-rose-600" />
                                            {t('Alerts')}
                                        </CardTitle>
                                        <CardDescription>
                                            {t('Items that need librarian intervention today.')}
                                        </CardDescription>
                                    </CardHeader>
                                    <CardContent className="space-y-3">
                                        {[
                                            {
                                                icon: AlertTriangle,
                                                label: `${overdueIssues} overdue circulation records`,
                                                tone: 'text-rose-600 bg-rose-50',
                                            },
                                            {
                                                icon: Clock3,
                                                label: `${lowStockTitles} low-stock titles`,
                                                tone: 'text-blue-700 bg-blue-50',
                                            },
                                            {
                                                icon: CreditCard,
                                                label: `${pendingCardStudents} students waiting for a library card`,
                                                tone: 'text-indigo-700 bg-indigo-50',
                                            },
                                            {
                                                icon: BadgeIndianRupee,
                                                label: `Rs. ${outstandingFines} pending fine collection`,
                                                tone: 'text-blue-700 bg-blue-50',
                                            },
                                        ].map((alert) => {
                                            const Icon = alert.icon;
                                            return (
                                                <div
                                                    key={alert.label}
                                                    className={`flex items-start gap-3 rounded-2xl p-4 ${alert.tone}`}
                                                >
                                                    <Icon className="mt-0.5 h-5 w-5" />
                                                    <p className="text-sm font-medium">{t(alert.label)}</p>
                                                </div>
                                            );
                                        })}
                                    </CardContent>
                                </Card>
                            </div>
                        </TabsContent>

                        <TabsContent value="catalog" className="space-y-6">
                            <Card className="border-slate-200 shadow-sm">
                                <CardHeader className="gap-4 md:flex md:flex-row md:items-center md:justify-between">
                                    <div>
                                        <CardTitle>{t('Catalog management')}</CardTitle>
                                        <CardDescription>
                                            {t('Search the collection, inspect copy counts, and add new titles.')}
                                        </CardDescription>
                                    </div>
                                    <div className="flex flex-col gap-3 sm:flex-row">
                                        <div className="relative min-w-[260px]">
                                            <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-400" />
                                            <Input
                                                value={catalogSearch}
                                                onChange={(event) => setCatalogSearch(event.target.value)}
                                                placeholder={t('Search by title, author, ISBN, rack')}
                                                className="pl-10"
                                            />
                                        </div>
                                        {canManageLibrary && (
                                            <>
                                                <input
                                                    ref={importInputRef}
                                                    type="file"
                                                    accept=".csv"
                                                    className="hidden"
                                                    onChange={handleImportBooks}
                                                />

                                                <Button variant="outline" className="gap-2" onClick={handleExportBooks}>
                                                    <Download className="h-4 w-4" />
                                                    {t('Export CSV')}
                                                </Button>
                                                <Button
                                                    variant="outline"
                                                    className="gap-2"
                                                    onClick={() => importInputRef.current?.click()}
                                                >
                                                    <Upload className="h-4 w-4" />
                                                    {t('Import CSV')}
                                                </Button>
                                                <Button
                                                    variant="outline"
                                                    className="gap-2"
                                                    onClick={handleDownloadSampleCsv}
                                                >
                                                    <BookOpen className="h-4 w-4" />
                                                    {t('Sample CSV')}
                                                </Button>
                                            </>
                                        )}
                                        {canManageLibrary && (
                                            <Dialog open={showAddBookDialog} onOpenChange={setShowAddBookDialog}>
                                                <DialogTrigger asChild>
                                                    <Button className="gap-2">
                                                        <CopyPlus className="h-4 w-4" />
                                                        {t('Add book')}
                                                    </Button>
                                                </DialogTrigger>
                                                <DialogContent className="sm:max-w-xl">
                                                    <DialogHeader>
                                                        <DialogTitle>
                                                            {editingBookId
                                                                ? t('Edit catalog title')
                                                                : t('Add a new catalog title')}
                                                        </DialogTitle>
                                                        <DialogDescription>
                                                            {editingBookId
                                                                ? t('Update the selected catalog record.')
                                                                : t(
                                                                      'Capture the core metadata needed by the library team.',
                                                                  )}
                                                        </DialogDescription>
                                                    </DialogHeader>
                                                    <form
                                                        onSubmit={handleAddBook}
                                                        className="mx-auto max-w-lg space-y-4"
                                                    >
                                                        <div className="grid gap-4 md:grid-cols-2">
                                                            <div className="space-y-2">
                                                                <Label htmlFor="book-title">{t('Title')}</Label>
                                                                <Input
                                                                    id="book-title"
                                                                    value={bookForm.title}
                                                                    onChange={(event) =>
                                                                        setBookForm((current) => ({
                                                                            ...current,
                                                                            title: event.target.value,
                                                                        }))
                                                                    }
                                                                    required
                                                                />
                                                            </div>
                                                            <div className="space-y-2">
                                                                <Label htmlFor="book-author">{t('Author')}</Label>
                                                                <Input
                                                                    id="book-author"
                                                                    value={bookForm.author}
                                                                    onChange={(event) =>
                                                                        setBookForm((current) => ({
                                                                            ...current,
                                                                            author: event.target.value,
                                                                        }))
                                                                    }
                                                                    required
                                                                />
                                                            </div>
                                                            <div className="space-y-2">
                                                                <Label htmlFor="book-category">{t('Category')}</Label>
                                                                <Input
                                                                    id="book-category"
                                                                    value={bookForm.category}
                                                                    onChange={(event) =>
                                                                        setBookForm((current) => ({
                                                                            ...current,
                                                                            category: event.target.value,
                                                                        }))
                                                                    }
                                                                    required
                                                                />
                                                            </div>
                                                            <div className="space-y-2">
                                                                <Label htmlFor="book-isbn">{t('ISBN')}</Label>
                                                                <Input
                                                                    id="book-isbn"
                                                                    value={bookForm.isbn}
                                                                    onChange={(event) =>
                                                                        setBookForm((current) => ({
                                                                            ...current,
                                                                            isbn: event.target.value,
                                                                        }))
                                                                    }
                                                                    required
                                                                />
                                                            </div>
                                                            <div className="space-y-2">
                                                                <Label htmlFor="book-rack">{t('Rack number')}</Label>
                                                                <Input
                                                                    id="book-rack"
                                                                    value={bookForm.rack}
                                                                    onChange={(event) =>
                                                                        setBookForm((current) => ({
                                                                            ...current,
                                                                            rack: event.target.value,
                                                                        }))
                                                                    }
                                                                    required
                                                                />
                                                            </div>
                                                            <div className="space-y-2">
                                                                <Label htmlFor="book-publisher">{t('Publisher')}</Label>
                                                                <Input
                                                                    id="book-publisher"
                                                                    value={bookForm.publisher}
                                                                    onChange={(event) =>
                                                                        setBookForm((current) => ({
                                                                            ...current,
                                                                            publisher: event.target.value,
                                                                        }))
                                                                    }
                                                                    required
                                                                />
                                                            </div>
                                                            <div className="space-y-2">
                                                                <Label>{t('Language')}</Label>
                                                                <Select
                                                                    value={bookForm.language}
                                                                    onValueChange={(value) =>
                                                                        setBookForm((current) => ({
                                                                            ...current,
                                                                            language: value,
                                                                        }))
                                                                    }
                                                                >
                                                                    <SelectTrigger>
                                                                        <SelectValue
                                                                            placeholder={t('Select language')}
                                                                        />
                                                                    </SelectTrigger>
                                                                    <SelectContent>
                                                                        <SelectItem value="English">
                                                                            {t('English')}
                                                                        </SelectItem>
                                                                        <SelectItem value="Hindi">
                                                                            {t('Hindi')}
                                                                        </SelectItem>
                                                                        <SelectItem value="Marathi">
                                                                            {t('Marathi')}
                                                                        </SelectItem>
                                                                    </SelectContent>
                                                                </Select>
                                                            </div>
                                                            <div className="space-y-2">
                                                                <Label htmlFor="book-total-copies">
                                                                    {t('Total copies')}
                                                                </Label>
                                                                <Input
                                                                    id="book-total-copies"
                                                                    type="number"
                                                                    min="1"
                                                                    value={bookForm.totalCopies}
                                                                    onChange={(event) =>
                                                                        setBookForm((current) => ({
                                                                            ...current,
                                                                            totalCopies: event.target.value,
                                                                        }))
                                                                    }
                                                                    required
                                                                />
                                                            </div>
                                                            <div className="space-y-2 md:col-span-2">
                                                                <Label htmlFor="book-price">{t('Unit price')}</Label>
                                                                <Input
                                                                    id="book-price"
                                                                    type="number"
                                                                    min="0"
                                                                    value={bookForm.price}
                                                                    onChange={(event) =>
                                                                        setBookForm((current) => ({
                                                                            ...current,
                                                                            price: event.target.value,
                                                                        }))
                                                                    }
                                                                    required
                                                                />
                                                            </div>
                                                        </div>
                                                        <DialogFooter>
                                                            <Button
                                                                type="button"
                                                                variant="outline"
                                                                onClick={() => {
                                                                    setShowAddBookDialog(false);
                                                                    setEditingBookId(null);
                                                                    setBookForm(emptyBookForm);
                                                                }}
                                                            >
                                                                {t('Cancel')}
                                                            </Button>
                                                            <Button type="submit">
                                                                {editingBookId ? t('Update title') : t('Save title')}
                                                            </Button>
                                                        </DialogFooter>
                                                    </form>
                                                </DialogContent>
                                            </Dialog>
                                        )}
                                    </div>
                                </CardHeader>
                                <CardContent>
                                    <div className="overflow-x-auto">
                                        <Table>
                                            <TableHeader>
                                                <TableRow>
                                                    <TableHead>{t('Book')}</TableHead>
                                                    <TableHead>{t('Category')}</TableHead>
                                                    <TableHead>{t('Rack')}</TableHead>
                                                    <TableHead>{t('Copies')}</TableHead>
                                                    <TableHead>{t('Issued')}</TableHead>
                                                    <TableHead>{t('Price')}</TableHead>
                                                    <TableHead>{t('Status')}</TableHead>
                                                    {canManageLibrary && (
                                                        <TableHead className="text-right">{t('Actions')}</TableHead>
                                                    )}
                                                </TableRow>
                                            </TableHeader>
                                            <TableBody>
                                                {catalog.map((book) => (
                                                    <TableRow key={book.id}>
                                                        <TableCell>
                                                            <div>
                                                                <p className="font-medium text-slate-900">
                                                                    {t(book.title)}
                                                                </p>
                                                                <p className="text-sm text-slate-500">
                                                                    {book.author} • {book.isbn}
                                                                </p>
                                                            </div>
                                                        </TableCell>
                                                        <TableCell>{t(book.category)}</TableCell>
                                                        <TableCell>{book.rack}</TableCell>
                                                        <TableCell>
                                                            <div className="text-sm text-slate-700">
                                                                <p>
                                                                    {book.availableCopies}
                                                                    {t('available')}
                                                                </p>
                                                                <p className="text-slate-500">
                                                                    {t('of')}
                                                                    {book.totalCopies}
                                                                </p>
                                                            </div>
                                                        </TableCell>
                                                        <TableCell>{book.issuedCount}</TableCell>
                                                        <TableCell>
                                                            {t('Rs.')}
                                                            {book.price}
                                                        </TableCell>
                                                        <TableCell>
                                                            <Badge className={getStatusBadgeClass(book.status)}>
                                                                {t(book.status)}
                                                            </Badge>
                                                        </TableCell>
                                                        {canManageLibrary && (
                                                            <TableCell className="text-right">
                                                                <div className="flex justify-end gap-2">
                                                                    <Button
                                                                        type="button"
                                                                        variant="outline"
                                                                        size="icon"
                                                                        onClick={() => handleEditBook(book)}
                                                                        title={t('Edit book')}
                                                                    >
                                                                        <Pencil className="h-4 w-4" />
                                                                    </Button>
                                                                    <Button
                                                                        type="button"
                                                                        variant="outline"
                                                                        size="icon"
                                                                        onClick={() => handleDeleteBook(book)}
                                                                        title={t('Delete book')}
                                                                        className="text-rose-600 hover:text-rose-700"
                                                                    >
                                                                        <Trash2 className="h-4 w-4" />
                                                                    </Button>
                                                                </div>
                                                            </TableCell>
                                                        )}
                                                    </TableRow>
                                                ))}
                                            </TableBody>
                                        </Table>
                                    </div>
                                </CardContent>
                            </Card>
                        </TabsContent>

                        <TabsContent value="circulation" className="space-y-6">
                            <Card className="border-slate-200 shadow-sm">
                                <CardHeader className="gap-4 md:flex md:flex-row md:items-center md:justify-between">
                                    <div>
                                        <CardTitle>{t('Issue and return desk')}</CardTitle>
                                        <CardDescription>
                                            {t('Track lending activity and immediately close returned transactions.')}
                                        </CardDescription>
                                    </div>
                                    <div className="flex flex-col gap-3 sm:flex-row">
                                        <div className="relative min-w-[260px]">
                                            <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-400" />
                                            <Input
                                                value={circulationSearch}
                                                onChange={(event) => setCirculationSearch(event.target.value)}
                                                placeholder={t('Search by book, member, card, or status')}
                                                className="pl-10"
                                            />
                                        </div>
                                        {canManageLibrary && (
                                            <Dialog open={showIssueDialog} onOpenChange={setShowIssueDialog}>
                                                <DialogTrigger asChild>
                                                    <Button className="gap-2">
                                                        <BookmarkPlus className="h-4 w-4" />
                                                        {t('Issue book')}
                                                    </Button>
                                                </DialogTrigger>
                                                <DialogContent className="sm:max-w-5xl">
                                                    <DialogHeader>
                                                        <DialogTitle>{t('Create circulation entry')}</DialogTitle>
                                                        <DialogDescription>
                                                            {t(
                                                                'Search the catalog first, then choose an eligible borrower. Students need a generated library card number before books can be issued.',
                                                            )}
                                                        </DialogDescription>
                                                    </DialogHeader>
                                                    <form onSubmit={handleIssueBook} className="space-y-5">
                                                        <div className="grid gap-5 lg:grid-cols-2">
                                                            <div className="space-y-3 rounded-2xl border border-slate-200 bg-slate-50/60 p-4">
                                                                <div className="flex items-center justify-between gap-3">
                                                                    <Label
                                                                        htmlFor="issue-book-search"
                                                                        className="text-sm font-medium text-slate-900"
                                                                    >
                                                                        {t('Search book')}
                                                                    </Label>
                                                                    {issueForm.bookId && (
                                                                        <span className="text-xs text-emerald-700">
                                                                            {t('1 book selected')}
                                                                        </span>
                                                                    )}
                                                                </div>
                                                                <div className="relative">
                                                                    <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-400" />
                                                                    <Input
                                                                        id="issue-book-search"
                                                                        value={issueBookSearch}
                                                                        onChange={(event) =>
                                                                            setIssueBookSearch(event.target.value)
                                                                        }
                                                                        placeholder={t('Title, author, ISBN, rack')}
                                                                        className="pl-10"
                                                                    />
                                                                </div>
                                                                <div className="max-h-[320px] space-y-2 overflow-y-auto rounded-xl border border-slate-200 bg-white p-2">
                                                                    {searchableBooks.length === 0 ? (
                                                                        <p className="px-2 py-6 text-sm text-slate-500">
                                                                            {t('No matching available books found.')}
                                                                        </p>
                                                                    ) : (
                                                                        searchableBooks.map((book) => (
                                                                            <button
                                                                                key={book.id}
                                                                                type="button"
                                                                                className={`w-full rounded-lg border p-3 text-left transition ${
                                                                                    issueForm.bookId === book.id
                                                                                        ? 'border-blue-500 bg-blue-50 shadow-sm'
                                                                                        : 'border-slate-200 hover:border-slate-300 hover:bg-slate-50'
                                                                                }`}
                                                                                onClick={() =>
                                                                                    setIssueForm((current) => ({
                                                                                        ...current,
                                                                                        bookId: book.id,
                                                                                    }))
                                                                                }
                                                                            >
                                                                                <p className="font-medium text-slate-900">
                                                                                    {t(book.title)}
                                                                                </p>
                                                                                <p className="mt-1 text-sm text-slate-500">
                                                                                    {book.author} •{' '}
                                                                                    {book.availableCopies}
                                                                                    {t('available •')}
                                                                                    {book.rack}
                                                                                </p>
                                                                            </button>
                                                                        ))
                                                                    )}
                                                                </div>
                                                            </div>
                                                            <div className="space-y-3 rounded-2xl border border-slate-200 bg-slate-50/60 p-4">
                                                                <div className="flex items-center justify-between gap-3">
                                                                    <Label
                                                                        htmlFor="issue-member-search"
                                                                        className="text-sm font-medium text-slate-900"
                                                                    >
                                                                        {t('Search eligible member')}
                                                                    </Label>
                                                                    {issueForm.memberId && (
                                                                        <span className="text-xs text-emerald-700">
                                                                            {t('1 member selected')}
                                                                        </span>
                                                                    )}
                                                                </div>
                                                                <div className="relative">
                                                                    <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-400" />
                                                                    <Input
                                                                        id="issue-member-search"
                                                                        value={issueMemberSearch}
                                                                        onChange={(event) =>
                                                                            setIssueMemberSearch(event.target.value)
                                                                        }
                                                                        placeholder={t(
                                                                            'Name, admission no, card number',
                                                                        )}
                                                                        className="pl-10"
                                                                    />
                                                                </div>
                                                                <div className="max-h-[320px] space-y-2 overflow-y-auto rounded-xl border border-slate-200 bg-white p-2">
                                                                    {searchableMembers.length === 0 ? (
                                                                        <p className="px-2 py-6 text-sm text-slate-500">
                                                                            {t(
                                                                                'No eligible members found. Generate a library card for students first.',
                                                                            )}
                                                                        </p>
                                                                    ) : (
                                                                        searchableMembers.map((member) => (
                                                                            <button
                                                                                key={member.id}
                                                                                type="button"
                                                                                className={`w-full rounded-lg border p-3 text-left transition ${
                                                                                    issueForm.memberId === member.id
                                                                                        ? 'border-blue-500 bg-blue-50 shadow-sm'
                                                                                        : 'border-slate-200 hover:border-slate-300 hover:bg-slate-50'
                                                                                }`}
                                                                                onClick={() =>
                                                                                    setIssueForm((current) => ({
                                                                                        ...current,
                                                                                        memberId: member.id,
                                                                                    }))
                                                                                }
                                                                            >
                                                                                <div className="flex items-center justify-between gap-3">
                                                                                    <p className="font-medium text-slate-900">
                                                                                        {member.name}
                                                                                    </p>
                                                                                    <Badge variant="outline">
                                                                                        {member.memberType}
                                                                                    </Badge>
                                                                                </div>
                                                                                <p className="mt-1 text-sm text-slate-500">
                                                                                    {member.admissionNo} •{' '}
                                                                                    {member.libraryCardNumber ||
                                                                                        t('Card not required')}
                                                                                </p>
                                                                            </button>
                                                                        ))
                                                                    )}
                                                                </div>
                                                            </div>
                                                        </div>
                                                        <div className="grid gap-4 rounded-2xl border border-slate-200 bg-white p-4 md:grid-cols-2">
                                                            <div className="space-y-2">
                                                                <Label htmlFor="issue-date">{t('Issue date')}</Label>
                                                                <Input
                                                                    id="issue-date"
                                                                    type="date"
                                                                    value={issueForm.issueDate}
                                                                    onChange={(event) =>
                                                                        setIssueForm((current) => ({
                                                                            ...current,
                                                                            issueDate: event.target.value,
                                                                        }))
                                                                    }
                                                                />
                                                            </div>
                                                            <div className="space-y-2">
                                                                <Label htmlFor="due-date">{t('Due date')}</Label>
                                                                <Input
                                                                    id="due-date"
                                                                    type="date"
                                                                    value={issueForm.dueDate}
                                                                    onChange={(event) =>
                                                                        setIssueForm((current) => ({
                                                                            ...current,
                                                                            dueDate: event.target.value,
                                                                        }))
                                                                    }
                                                                />
                                                            </div>
                                                        </div>
                                                        <DialogFooter>
                                                            <Button
                                                                type="button"
                                                                variant="outline"
                                                                onClick={() => setShowIssueDialog(false)}
                                                            >
                                                                {t('Cancel')}
                                                            </Button>
                                                            <Button type="submit">{t('Issue now')}</Button>
                                                        </DialogFooter>
                                                    </form>
                                                </DialogContent>
                                            </Dialog>
                                        )}
                                    </div>
                                </CardHeader>
                                <CardContent>
                                    <div className="overflow-x-auto">
                                        <Table>
                                            <TableHeader>
                                                <TableRow>
                                                    <TableHead>{t('Book')}</TableHead>
                                                    <TableHead>{t('Member')}</TableHead>
                                                    <TableHead>{t('Card No.')}</TableHead>
                                                    <TableHead>{t('Issue date')}</TableHead>
                                                    <TableHead>{t('Due date')}</TableHead>
                                                    <TableHead>{t('Status')}</TableHead>
                                                    <TableHead className="text-right">{t('Action')}</TableHead>
                                                </TableRow>
                                            </TableHeader>
                                            <TableBody>
                                                {filteredCirculation.map((entry) => (
                                                    <TableRow key={entry.id}>
                                                        <TableCell>
                                                            <div>
                                                                <p className="font-medium text-slate-900">
                                                                    {getBook(entry.bookId)?.title || '-'}
                                                                </p>
                                                                <p className="text-sm text-slate-500">{entry.id}</p>
                                                            </div>
                                                        </TableCell>
                                                        <TableCell>
                                                            <div>
                                                                <p className="font-medium text-slate-900">
                                                                    {getMember(entry.memberId)?.name || '-'}
                                                                </p>
                                                                <p className="text-sm text-slate-500">
                                                                    {getMember(entry.memberId)?.admissionNo || '-'}
                                                                </p>
                                                            </div>
                                                        </TableCell>
                                                        <TableCell>
                                                            {getMember(entry.memberId)?.libraryCardNumber || '-'}
                                                        </TableCell>
                                                        <TableCell>{entry.issueDate}</TableCell>
                                                        <TableCell>{entry.dueDate}</TableCell>
                                                        <TableCell>
                                                            <Badge className={getStatusBadgeClass(entry.status)}>
                                                                {t(entry.status)}
                                                            </Badge>
                                                        </TableCell>
                                                        <TableCell className="text-right">
                                                            {entry.status === 'Issued' || entry.status === 'Overdue' ? (
                                                                <Button
                                                                    variant="outline"
                                                                    size="sm"
                                                                    onClick={() => handleReturnBook(entry.id)}
                                                                >
                                                                    {t('Mark returned')}
                                                                </Button>
                                                            ) : (
                                                                <span className="text-sm text-slate-500">
                                                                    {entry.returnDate || t('Closed')}
                                                                </span>
                                                            )}
                                                        </TableCell>
                                                    </TableRow>
                                                ))}
                                            </TableBody>
                                        </Table>
                                    </div>
                                    {filteredCirculation.length === 0 && (
                                        <div className="rounded-2xl border border-dashed border-slate-300 bg-slate-50 px-6 py-10 text-center text-sm text-slate-500">
                                            {t('No circulation entries found for the current search.')}
                                        </div>
                                    )}
                                </CardContent>
                            </Card>
                        </TabsContent>

                        <TabsContent value="members" className="space-y-6">
                            <Card className="border-slate-200 shadow-sm">
                                <CardHeader className="gap-4 md:flex md:flex-row md:items-center md:justify-between">
                                    <div>
                                        <CardTitle>{t('Member registry')}</CardTitle>
                                        <CardDescription>
                                            {t(
                                                'Review borrowers class-section wise, generate library card numbers for students, and track fines or overdue items.',
                                            )}
                                        </CardDescription>
                                    </div>
                                    <div className="flex flex-wrap items-end gap-3">
                                        <div className="min-w-[180px] space-y-2">
                                            <Label>{t('Class')}</Label>
                                            <Select
                                                value={memberFilterClass}
                                                onValueChange={(value) => {
                                                    setMemberFilterClass(value);
                                                    setMemberFilterSection('');
                                                }}
                                            >
                                                <SelectTrigger>
                                                    <SelectValue placeholder={t('All classes')} />
                                                </SelectTrigger>
                                                <SelectContent>
                                                    {memberClasses.map((className) => (
                                                        <SelectItem key={className} value={className}>
                                                            {className}
                                                        </SelectItem>
                                                    ))}
                                                </SelectContent>
                                            </Select>
                                        </div>
                                        <div className="min-w-[180px] space-y-2">
                                            <Label>{t('Section')}</Label>
                                            <Select value={memberFilterSection} onValueChange={setMemberFilterSection}>
                                                <SelectTrigger>
                                                    <SelectValue
                                                        placeholder={
                                                            memberFilterClass
                                                                ? t('All sections in class')
                                                                : t('All sections')
                                                        }
                                                    />
                                                </SelectTrigger>
                                                <SelectContent>
                                                    {memberSections.map((section) => (
                                                        <SelectItem key={section} value={section}>
                                                            {t('Section')}
                                                            {section}
                                                        </SelectItem>
                                                    ))}
                                                </SelectContent>
                                            </Select>
                                        </div>
                                        <div className="relative min-w-[260px]">
                                            <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-400" />
                                            <Input
                                                value={memberSearch}
                                                onChange={(event) => setMemberSearch(event.target.value)}
                                                placeholder={t('Search by member, class, or ID')}
                                                className="pl-10"
                                            />
                                        </div>
                                    </div>
                                </CardHeader>
                                <CardContent className="space-y-5">
                                    {Object.entries(membersBySection).map(([section, sectionMembers]) => (
                                        <div key={section} className="rounded-2xl border border-slate-200 bg-white">
                                            <div className="flex flex-wrap items-center justify-between gap-3 border-b border-slate-200 px-5 py-4">
                                                <div>
                                                    <h3 className="text-base font-semibold text-slate-900">
                                                        {section}
                                                    </h3>
                                                    <p className="text-sm text-slate-500">
                                                        {sectionMembers.length}
                                                        {t('member(s)')}
                                                    </p>
                                                </div>
                                                <Badge variant="outline">
                                                    {sectionMembers.every((member) => member.memberType === 'Teacher')
                                                        ? t('Department')
                                                        : t('Class / Section')}
                                                </Badge>
                                            </div>
                                            <div className="overflow-x-auto">
                                                <Table>
                                                    <TableHeader>
                                                        <TableRow>
                                                            <TableHead>{t('Member')}</TableHead>
                                                            <TableHead>{t('Type')}</TableHead>
                                                            <TableHead>{t('Library card')}</TableHead>
                                                            <TableHead>{t('Active loans')}</TableHead>
                                                            <TableHead>{t('Overdue')}</TableHead>
                                                            <TableHead>{t('Fine due')}</TableHead>
                                                            <TableHead className="text-right">{t('Action')}</TableHead>
                                                        </TableRow>
                                                    </TableHeader>
                                                    <TableBody>
                                                        {sectionMembers.map((member) => (
                                                            <TableRow key={member.id}>
                                                                <TableCell>
                                                                    <div>
                                                                        <p className="font-medium text-slate-900">
                                                                            {member.name}
                                                                        </p>
                                                                        <p className="text-sm text-slate-500">
                                                                            {member.admissionNo}
                                                                        </p>
                                                                    </div>
                                                                </TableCell>
                                                                <TableCell>
                                                                    <Badge variant="outline">{member.memberType}</Badge>
                                                                </TableCell>
                                                                <TableCell>
                                                                    {member.libraryCardNumber ? (
                                                                        <span className="font-medium text-slate-900">
                                                                            {member.libraryCardNumber}
                                                                        </span>
                                                                    ) : (
                                                                        <span className="text-sm text-blue-700">
                                                                            {t('Not generated')}
                                                                        </span>
                                                                    )}
                                                                </TableCell>
                                                                <TableCell>{member.activeLoans}</TableCell>
                                                                <TableCell>
                                                                    <span
                                                                        className={
                                                                            member.overdueBooks > 0
                                                                                ? t('font-medium text-rose-600')
                                                                                : 'text-slate-700'
                                                                        }
                                                                    >
                                                                        {member.overdueBooks}
                                                                    </span>
                                                                </TableCell>
                                                                <TableCell>
                                                                    <span
                                                                        className={
                                                                            member.fineDue > 0
                                                                                ? t('font-medium text-blue-700')
                                                                                : 'text-slate-700'
                                                                        }
                                                                    >
                                                                        {t('Rs.')}
                                                                        {member.fineDue}
                                                                    </span>
                                                                </TableCell>
                                                                <TableCell className="text-right">
                                                                    {member.memberType === 'Student' &&
                                                                    !member.libraryCardNumber ? (
                                                                        <Button
                                                                            variant="outline"
                                                                            size="sm"
                                                                            onClick={() =>
                                                                                handleGenerateLibraryCard(member.id)
                                                                            }
                                                                        >
                                                                            <CreditCard className="mr-2 h-4 w-4" />
                                                                            {t('Generate card')}
                                                                        </Button>
                                                                    ) : (
                                                                        <span className="text-sm text-slate-500">
                                                                            {member.memberType === 'Teacher'
                                                                                ? t('Teacher access')
                                                                                : t('Ready')}
                                                                        </span>
                                                                    )}
                                                                </TableCell>
                                                            </TableRow>
                                                        ))}
                                                    </TableBody>
                                                </Table>
                                            </div>
                                        </div>
                                    ))}
                                    {filteredMembers.length === 0 && (
                                        <div className="rounded-2xl border border-dashed border-slate-300 bg-slate-50 px-6 py-10 text-center text-sm text-slate-500">
                                            {t('No members found for the current search.')}
                                        </div>
                                    )}
                                </CardContent>
                            </Card>
                        </TabsContent>

                        <TabsContent value="acquisition" className="space-y-6">
                            <div className="grid gap-6 xl:grid-cols-[1.1fr_0.9fr]">
                                <Card className="border-slate-200 shadow-sm">
                                    <CardHeader className="gap-4 md:flex md:flex-row md:items-center md:justify-between">
                                        <div>
                                            <CardTitle>{t('Acquisition pipeline')}</CardTitle>
                                            <CardDescription>
                                                {t('Review new book requests and estimate upcoming procurement spend.')}
                                            </CardDescription>
                                        </div>
                                        {canManageLibrary && (
                                            <Dialog open={showRequestDialog} onOpenChange={setShowRequestDialog}>
                                                <DialogTrigger asChild>
                                                    <Button variant="outline" className="gap-2">
                                                        <BookOpen className="h-4 w-4" />
                                                        {t('New request')}
                                                    </Button>
                                                </DialogTrigger>
                                                <DialogContent className="sm:max-w-lg">
                                                    <DialogHeader>
                                                        <DialogTitle>{t('Create acquisition request')}</DialogTitle>
                                                        <DialogDescription>
                                                            {t('Submit a pending request for procurement review.')}
                                                        </DialogDescription>
                                                    </DialogHeader>
                                                    <form
                                                        onSubmit={handleAddRequest}
                                                        className="mx-auto max-w-md space-y-4"
                                                    >
                                                        <div className="space-y-2">
                                                            <Label htmlFor="request-title">
                                                                {t('Requested title')}
                                                            </Label>
                                                            <Input
                                                                id="request-title"
                                                                value={requestForm.title}
                                                                onChange={(event) =>
                                                                    setRequestForm((current) => ({
                                                                        ...current,
                                                                        title: event.target.value,
                                                                    }))
                                                                }
                                                                required
                                                            />
                                                        </div>
                                                        <div className="space-y-2">
                                                            <Label htmlFor="requested-by">{t('Requested by')}</Label>
                                                            <Input
                                                                id="requested-by"
                                                                value={requestForm.requestedBy}
                                                                onChange={(event) =>
                                                                    setRequestForm((current) => ({
                                                                        ...current,
                                                                        requestedBy: event.target.value,
                                                                    }))
                                                                }
                                                                required
                                                            />
                                                        </div>
                                                        <div className="grid gap-4 md:grid-cols-2">
                                                            <div className="space-y-2">
                                                                <Label htmlFor="request-category">
                                                                    {t('Category')}
                                                                </Label>
                                                                <Input
                                                                    id="request-category"
                                                                    value={requestForm.category}
                                                                    onChange={(event) =>
                                                                        setRequestForm((current) => ({
                                                                            ...current,
                                                                            category: event.target.value,
                                                                        }))
                                                                    }
                                                                    required
                                                                />
                                                            </div>
                                                            <div className="space-y-2">
                                                                <Label>{t('Priority')}</Label>
                                                                <Select
                                                                    value={requestForm.priority}
                                                                    onValueChange={(value: RequestPriority) =>
                                                                        setRequestForm((current) => ({
                                                                            ...current,
                                                                            priority: value,
                                                                        }))
                                                                    }
                                                                >
                                                                    <SelectTrigger>
                                                                        <SelectValue
                                                                            placeholder={t('Select priority')}
                                                                        />
                                                                    </SelectTrigger>
                                                                    <SelectContent>
                                                                        <SelectItem value="High">
                                                                            {t('High')}
                                                                        </SelectItem>
                                                                        <SelectItem value="Medium">
                                                                            {t('Medium')}
                                                                        </SelectItem>
                                                                        <SelectItem value="Low">{t('Low')}</SelectItem>
                                                                    </SelectContent>
                                                                </Select>
                                                            </div>
                                                            <div className="space-y-2">
                                                                <Label htmlFor="request-copies">
                                                                    {t('Copies requested')}
                                                                </Label>
                                                                <Input
                                                                    id="request-copies"
                                                                    type="number"
                                                                    min="1"
                                                                    value={requestForm.copies}
                                                                    onChange={(event) =>
                                                                        setRequestForm((current) => ({
                                                                            ...current,
                                                                            copies: event.target.value,
                                                                        }))
                                                                    }
                                                                    required
                                                                />
                                                            </div>
                                                            <div className="space-y-2">
                                                                <Label htmlFor="request-budget">
                                                                    {t('Estimated budget')}
                                                                </Label>
                                                                <Input
                                                                    id="request-budget"
                                                                    type="number"
                                                                    min="0"
                                                                    value={requestForm.budget}
                                                                    onChange={(event) =>
                                                                        setRequestForm((current) => ({
                                                                            ...current,
                                                                            budget: event.target.value,
                                                                        }))
                                                                    }
                                                                    required
                                                                />
                                                            </div>
                                                        </div>
                                                        <div className="space-y-2">
                                                            <Label htmlFor="request-note">
                                                                {t('Procurement note')}
                                                            </Label>
                                                            <Textarea
                                                                id="request-note"
                                                                value={requestForm.note}
                                                                onChange={(event) =>
                                                                    setRequestForm((current) => ({
                                                                        ...current,
                                                                        note: event.target.value,
                                                                    }))
                                                                }
                                                                placeholder={t(
                                                                    'Optional note for procurement or approvals',
                                                                )}
                                                            />
                                                        </div>
                                                        <DialogFooter>
                                                            <Button
                                                                type="button"
                                                                variant="outline"
                                                                onClick={() => setShowRequestDialog(false)}
                                                            >
                                                                {t('Cancel')}
                                                            </Button>
                                                            <Button type="submit">{t('Submit request')}</Button>
                                                        </DialogFooter>
                                                    </form>
                                                </DialogContent>
                                            </Dialog>
                                        )}
                                    </CardHeader>
                                    <CardContent>
                                        <div className="overflow-x-auto">
                                            <Table>
                                                <TableHeader>
                                                    <TableRow>
                                                        <TableHead>{t('Title')}</TableHead>
                                                        <TableHead>{t('Requested by')}</TableHead>
                                                        <TableHead>{t('Priority')}</TableHead>
                                                        <TableHead>{t('Copies')}</TableHead>
                                                        <TableHead>{t('Budget')}</TableHead>
                                                        <TableHead>{t('Status')}</TableHead>
                                                    </TableRow>
                                                </TableHeader>
                                                <TableBody>
                                                    {requests.map((request) => (
                                                        <TableRow key={request.id}>
                                                            <TableCell>
                                                                <div>
                                                                    <p className="font-medium text-slate-900">
                                                                        {t(request.title)}
                                                                    </p>
                                                                    <p className="text-sm text-slate-500">
                                                                        {t(request.category)}
                                                                    </p>
                                                                </div>
                                                            </TableCell>
                                                            <TableCell>{request.requestedBy}</TableCell>
                                                            <TableCell>
                                                                <Badge
                                                                    className={getStatusBadgeClass(request.priority)}
                                                                >
                                                                    {t(request.priority)}
                                                                </Badge>
                                                            </TableCell>
                                                            <TableCell>{request.copies}</TableCell>
                                                            <TableCell>
                                                                {t('Rs.')}
                                                                {request.budget}
                                                            </TableCell>
                                                            <TableCell>
                                                                <Badge className={getStatusBadgeClass(request.status)}>
                                                                    {t(request.status)}
                                                                </Badge>
                                                            </TableCell>
                                                        </TableRow>
                                                    ))}
                                                </TableBody>
                                            </Table>
                                        </div>
                                    </CardContent>
                                </Card>

                                <Card className="border-slate-200 shadow-sm">
                                    <CardHeader>
                                        <CardTitle className="flex items-center gap-2">
                                            <CheckCircle2 className="h-5 w-5 text-emerald-600" />
                                            {t('Procurement insights')}
                                        </CardTitle>
                                        <CardDescription>
                                            {t('Simple frontend summaries to guide planning conversations.')}
                                        </CardDescription>
                                    </CardHeader>
                                    <CardContent className="space-y-4">
                                        <div className="rounded-2xl bg-slate-100 p-4">
                                            <p className="text-sm text-slate-500">{t('Planned acquisition spend')}</p>
                                            <p className="mt-2 text-3xl font-semibold text-slate-900">
                                                {t('Rs.')}
                                                {requests.reduce((sum, request) => sum + request.budget, 0)}
                                            </p>
                                        </div>
                                        <div className="space-y-3">
                                            {[
                                                `${requests.filter((request) => request.priority === 'High').length} high-priority requests`,
                                                `${requests.filter((request) => request.status === 'Approved').length} approved for ordering`,
                                                `${books.filter((book) => book.category === 'Reference').length} reference titles already in catalog`,
                                            ].map((item) => (
                                                <div
                                                    key={item}
                                                    className="rounded-2xl border border-slate-200 p-4 text-sm text-slate-700"
                                                >
                                                    {item}
                                                </div>
                                            ))}
                                        </div>
                                    </CardContent>
                                </Card>
                            </div>
                        </TabsContent>
                    </Tabs>
                </div>
            </div>
        </DashboardLayout>
    );
}
