// Mock Data Service - Simulates API calls with local state management
import {
    mockUsers,
    mockStudents,
    mockFees,
    mockFeePayments,
    mockAttendance,
    mockExams,
    mockExamResults,
    mockBooks,
    mockBookIssues,
    mockMessages,
    mockClasses,
    mockOrganizations,
    mockAlumniRecords,
    User,
    Student,
    AlumniRecord,
    Fee,
    FeePayment,
    Attendance,
    Exam,
    ExamResult,
    Book,
    BookIssue,
    Message,
    Class,
    Organization,
} from './mockData';

// In-memory data stores
let users = [...mockUsers];
let students = [...mockStudents];
let fees = [...mockFees];
let feePayments = [...mockFeePayments];
let attendance = [...mockAttendance];
let exams = [...mockExams];
let examResults = [...mockExamResults];
let books = [...mockBooks];
let bookIssues = [...mockBookIssues];
let messages = [...mockMessages];
let classes = [...mockClasses];
let organizations = [...mockOrganizations];
let alumniRecords = [...mockAlumniRecords];

const normalizeBoolean = (value: unknown): boolean => {
    if (typeof value === 'string') {
        return value.toLowerCase() === 'true';
    }

    return value === true;
};

const normalizeStudentPayload = <T extends Record<string, any>>(data: T): T => {
    const normalizedData = { ...data };

    if ('transport_required' in data) {
        normalizedData.transport_required = normalizeBoolean(data.transport_required);
    }

    if ('hostel_required' in data) {
        normalizedData.hostel_required = normalizeBoolean(data.hostel_required);
    }

    if ('transport_pickup_point' in data) {
        normalizedData.transport_pickup_point = data.transport_pickup_point || '';
    }

    if ('transport_vehicle' in data) {
        normalizedData.transport_vehicle = data.transport_vehicle || '';
    }

    if ('transport_route_details' in data) {
        normalizedData.transport_route_details = data.transport_route_details || '';
    }

    return normalizedData;
};

// Helper to generate IDs
const generateId = (prefix: string) => {
    return `${prefix}${Date.now()}${Math.random().toString(36).substr(2, 9)}`;
};

// Helper to get user's organization
const getUserOrganization = (token?: string | null): string | null => {
    if (!token) {
        return null;
    }

    const userId = token.replace('mock_token_', '');
    const user = users.find((u) => u.id === userId);
    return user?.organization_id || null;
};

// Helper to check if user is super admin
const isSuperAdmin = (token?: string | null): boolean => {
    if (!token) {
        return false;
    }

    const userId = token.replace('mock_token_', '');
    const user = users.find((u) => u.id === userId);
    return user?.role === 'super_admin';
};

// Authentication Service
export const authService = {
    login: (email: string, password: string) => {
        const user = users.find((u) => u.email === email && u.password === password);
        if (user) {
            const { password: _, ...userWithoutPassword } = user;
            return {
                success: true,
                user: userWithoutPassword,
                access_token: 'mock_token_' + user.id,
            };
        }
        return { success: false, error: 'Invalid credentials' };
    },

    signup: (email: string, password: string, name: string, role: string) => {
        const existingUser = users.find((u) => u.email === email);
        if (existingUser) {
            return { success: false, error: 'User already exists' };
        }

        const newUser: User = {
            id: generateId('u'),
            email,
            password,
            name,
            role: role as any,
        };
        users.push(newUser);
        return { success: true };
    },

    getCurrentUser: (token?: string | null) => {
        if (!token) {
            return null;
        }

        const userId = token.replace('mock_token_', '');
        const user = users.find((u) => u.id === userId);
        if (user) {
            const { password: _, ...userWithoutPassword } = user;
            return { user: userWithoutPassword };
        }
        return null;
    },
};

// Student Service
export const studentService = {
    getAll: (token: string, search?: string, classFilter?: string) => {
        const orgId = getUserOrganization(token);
        let filtered = orgId ? students.filter((s) => s.organization_id === orgId) : [...students];

        if (search) {
            const searchLower = search.toLowerCase();
            filtered = filtered.filter(
                (s) =>
                    s.first_name.toLowerCase().includes(searchLower) ||
                    s.last_name.toLowerCase().includes(searchLower) ||
                    s.email.toLowerCase().includes(searchLower) ||
                    s.roll_number.includes(search),
            );
        }

        if (classFilter) {
            filtered = filtered.filter((s) => s.class === classFilter);
        }

        return { students: filtered };
    },

    getById: (id: string, token: string) => {
        const orgId = getUserOrganization(token);
        const student = students.find((s) => s.id === id && (!orgId || s.organization_id === orgId));
        return student ? { student } : null;
    },

    create: (data: Omit<Student, 'id' | 'status'>, token: string) => {
        const orgId = getUserOrganization(token);
        if (!orgId) {
            return { success: false, error: 'Organization not found' };
        }

        const normalizedData = normalizeStudentPayload(data);

        const newStudent: Student = {
            ...normalizedData,
            id: generateId('s'),
            organization_id: orgId,
            status: 'active',
        };
        students.push(newStudent);
        return { success: true, student: newStudent };
    },

    update: (id: string, data: Partial<Student>) => {
        const index = students.findIndex((s) => s.id === id);
        if (index !== -1) {
            students[index] = {
                ...students[index],
                ...normalizeStudentPayload(data),
            };
            return { success: true, student: students[index] };
        }
        return { success: false, error: 'Student not found' };
    },

    delete: (id: string) => {
        const index = students.findIndex((s) => s.id === id);
        if (index !== -1) {
            students.splice(index, 1);
            return { success: true };
        }
        return { success: false, error: 'Student not found' };
    },
};

export const alumniService = {
    getAll: (token: string, search?: string, sessionFilter?: string, classFilter?: string, sectionFilter?: string) => {
        const orgId = getUserOrganization(token);
        let filtered = orgId ? alumniRecords.filter((record) => record.organization_id === orgId) : [...alumniRecords];

        if (sessionFilter) {
            filtered = filtered.filter((record) => record.session === sessionFilter);
        }

        if (classFilter) {
            filtered = filtered.filter((record) => record.class === classFilter);
        }

        if (sectionFilter) {
            filtered = filtered.filter((record) => record.section === sectionFilter);
        }

        if (search) {
            const searchLower = search.toLowerCase();
            filtered = filtered.filter(
                (record) =>
                    `${record.first_name} ${record.last_name}`.toLowerCase().includes(searchLower) ||
                    record.admission_no.toLowerCase().includes(searchLower) ||
                    record.organization_name.toLowerCase().includes(searchLower),
            );
        }

        return { alumniRecords: filtered };
    },

    copyStudentsToAlumni: (studentIds: string[], session: string) => {
        const uniqueStudentIds = Array.from(new Set(studentIds));
        const copiedRecords: AlumniRecord[] = [];

        uniqueStudentIds.forEach((studentId) => {
            const student = students.find((currentStudent) => currentStudent.id === studentId);

            if (!student) {
                return;
            }
            const existingRecord = alumniRecords.find(
                (record) => record.student_id === student.id && record.session === session,
            );

            if (existingRecord) {
                return;
            }

            const sessionParts = session.split('-');
            const passingYear = sessionParts[1] || sessionParts[0] || new Date().getFullYear().toString();
            const newRecord: AlumniRecord = {
                id: generateId('alumni'),
                student_id: student.id,
                organization_id: student.organization_id,
                admission_no: student.admission_no,
                first_name: student.first_name,
                last_name: student.last_name,
                email: student.email,
                phone: student.phone,
                class: student.class,
                section: student.section,
                session,
                passing_year: passingYear,
                alumni_status: 'left_school',
                current_city: student.city || 'Not Updated',
                organization_name: 'Left School',
            };

            alumniRecords.push(newRecord);
            copiedRecords.push(newRecord);
        });

        return {
            success: true,
            copiedCount: copiedRecords.length,
            alumniRecords: copiedRecords,
        };
    },
};

// Fee Service
export const feeService = {
    getStudentFees: (studentId: string) => {
        const studentFees = fees.filter((f) => f.student_id === studentId);
        const payments = feePayments.filter((p) => p.student_id === studentId);

        const totalPending = studentFees.reduce((sum, f) => sum + f.due_amount, 0);
        const totalPaid = studentFees.reduce((sum, f) => sum + f.paid_amount, 0);

        return {
            fees: studentFees,
            payments,
            summary: {
                total_pending: totalPending,
                total_paid: totalPaid,
            },
        };
    },

    assignFee: (data: { student_id: string; fee_type: string; amount: number; discount: number; due_date: string }) => {
        const totalAmount = data.amount - data.discount;
        const newFee: Fee = {
            id: generateId('f'),
            student_id: data.student_id,
            fee_type: data.fee_type,
            amount: data.amount,
            discount: data.discount,
            total_amount: totalAmount,
            paid_amount: 0,
            due_amount: totalAmount,
            status: 'pending',
            due_date: data.due_date,
            created_at: new Date().toISOString(),
        };
        fees.push(newFee);
        return { success: true, fee: newFee };
    },

    collectPayment: (data: {
        fee_id: string;
        amount: number;
        payment_method: string;
        transaction_id: string;
        collected_by: string;
    }) => {
        const feeIndex = fees.findIndex((f) => f.id === data.fee_id);
        if (feeIndex === -1) {
            return { success: false, error: 'Fee not found' };
        }

        const fee = fees[feeIndex];

        if (!Number.isFinite(data.amount) || data.amount <= 0) {
            return { success: false, error: 'Invalid payment amount' };
        }

        if (data.amount > fee.due_amount) {
            return {
                success: false,
                error: 'Payment amount exceeds pending balance',
            };
        }

        const newPayment: FeePayment = {
            id: generateId('p'),
            fee_id: data.fee_id,
            student_id: fee.student_id,
            amount: data.amount,
            payment_method: data.payment_method,
            transaction_id: data.transaction_id,
            payment_date: new Date().toISOString().split('T')[0],
            collected_by: data.collected_by,
            status: 'active',
        };
        feePayments.push(newPayment);

        // Update fee status
        fee.paid_amount += data.amount;
        fee.due_amount -= data.amount;
        if (fee.due_amount <= 0) {
            fee.status = 'paid';
        } else {
            fee.status = 'partial';
        }

        return { success: true, payment: newPayment };
    },

    revertPayment: (data: { payment_id: string; reverted_by: string; reason: string }) => {
        const paymentIndex = feePayments.findIndex((payment) => payment.id === data.payment_id);
        if (paymentIndex === -1) {
            return { success: false, error: 'Payment not found' };
        }

        const payment = feePayments[paymentIndex];

        if (payment.status === 'reverted') {
            return {
                success: false,
                error: 'Payment has already been reverted',
            };
        }

        const feeIndex = fees.findIndex((fee) => fee.id === payment.fee_id);
        if (feeIndex === -1) {
            return { success: false, error: 'Associated fee not found' };
        }

        const fee = fees[feeIndex];

        fee.paid_amount = Math.max(0, fee.paid_amount - payment.amount);
        fee.due_amount = Math.min(fee.total_amount, fee.due_amount + payment.amount);

        if (fee.paid_amount <= 0) {
            fee.status = 'pending';
        } else if (fee.due_amount <= 0) {
            fee.status = 'paid';
        } else {
            fee.status = 'partial';
        }

        feePayments[paymentIndex] = {
            ...payment,
            status: 'reverted',
            reverted_at: new Date().toISOString().split('T')[0],
            reverted_by: data.reverted_by,
            revert_reason: data.reason,
        };

        return { success: true, payment: feePayments[paymentIndex], fee };
    },

    getAll: () => {
        return { fees };
    },
};

// Attendance Service
export const attendanceService = {
    getByDate: (date: string, classFilter?: string, section?: string) => {
        let filtered = attendance.filter((a) => a.date === date);

        if (classFilter) {
            filtered = filtered.filter((a) => a.class === classFilter);
        }

        if (section) {
            filtered = filtered.filter((a) => a.section === section);
        }

        return { attendance: filtered };
    },

    mark: (data: {
        student_id: string;
        class: string;
        section: string;
        date: string;
        status: 'present' | 'absent' | 'late' | 'half_day';
        marked_by: string;
        remarks?: string;
    }) => {
        // Check if attendance already exists
        const existingIndex = attendance.findIndex((a) => a.student_id === data.student_id && a.date === data.date);

        if (existingIndex !== -1) {
            // Update existing attendance
            attendance[existingIndex] = {
                ...attendance[existingIndex],
                status: data.status,
                remarks: data.remarks,
            };
            return { success: true, attendance: attendance[existingIndex] };
        } else {
            // Create new attendance record
            const newAttendance: Attendance = {
                id: generateId('a'),
                ...data,
            };
            attendance.push(newAttendance);
            return { success: true, attendance: newAttendance };
        }
    },

    getStudentAttendance: (studentId: string, startDate?: string, endDate?: string) => {
        let filtered = attendance.filter((a) => a.student_id === studentId);

        if (startDate) {
            filtered = filtered.filter((a) => a.date >= startDate);
        }

        if (endDate) {
            filtered = filtered.filter((a) => a.date <= endDate);
        }

        const total = filtered.length;
        const present = filtered.filter((a) => a.status === 'present' || a.status === 'late').length;
        const percentage = total > 0 ? (present / total) * 100 : 0;

        return {
            attendance: filtered,
            summary: {
                total,
                present,
                absent: filtered.filter((a) => a.status === 'absent').length,
                late: filtered.filter((a) => a.status === 'late').length,
                percentage: percentage.toFixed(2),
            },
        };
    },
};

// Exam Service
export const examService = {
    getAll: (classFilter?: string, section?: string) => {
        let filtered = [...exams];

        if (classFilter) {
            filtered = filtered.filter((e) => e.class === classFilter);
        }

        if (section) {
            filtered = filtered.filter((e) => e.section === section);
        }

        return { exams: filtered };
    },

    getById: (id: string) => {
        const exam = exams.find((e) => e.id === id);
        if (!exam) return null;

        const results = examResults.filter((r) => r.exam_id === id);
        return { exam, results };
    },

    create: (data: Omit<Exam, 'id'>) => {
        const newExam: Exam = {
            ...data,
            id: generateId('e'),
        };
        exams.push(newExam);
        return { success: true, exam: newExam };
    },

    update: (id: string, data: Partial<Exam>) => {
        const index = exams.findIndex((e) => e.id === id);
        if (index !== -1) {
            exams[index] = { ...exams[index], ...data };
            return { success: true, exam: exams[index] };
        }
        return { success: false, error: 'Exam not found' };
    },

    delete: (id: string) => {
        const index = exams.findIndex((e) => e.id === id);
        if (index !== -1) {
            exams.splice(index, 1);
            // Also delete related results
            examResults = examResults.filter((r) => r.exam_id !== id);
            return { success: true };
        }
        return { success: false, error: 'Exam not found' };
    },

    enterMarks: (data: {
        exam_id: string;
        student_id: string;
        marks_obtained: number;
        grade: string;
        remarks?: string;
    }) => {
        const existingIndex = examResults.findIndex(
            (r) => r.exam_id === data.exam_id && r.student_id === data.student_id,
        );

        if (existingIndex !== -1) {
            examResults[existingIndex] = {
                ...examResults[existingIndex],
                marks_obtained: data.marks_obtained,
                grade: data.grade,
                remarks: data.remarks,
            };
            return { success: true, result: examResults[existingIndex] };
        } else {
            const newResult: ExamResult = {
                id: generateId('r'),
                ...data,
            };
            examResults.push(newResult);
            return { success: true, result: newResult };
        }
    },

    getStudentResults: (studentId: string) => {
        const results = examResults.filter((r) => r.student_id === studentId);
        const resultsWithExams = results.map((r) => {
            const exam = exams.find((e) => e.id === r.exam_id);
            return { ...r, exam };
        });
        return { results: resultsWithExams };
    },
};

// Library Service
export const libraryService = {
    getAllBooks: (search?: string, category?: string) => {
        let filtered = [...books];

        if (search) {
            const searchLower = search.toLowerCase();
            filtered = filtered.filter(
                (b) =>
                    b.title.toLowerCase().includes(searchLower) ||
                    b.author.toLowerCase().includes(searchLower) ||
                    b.isbn.includes(search),
            );
        }

        if (category) {
            filtered = filtered.filter((b) => b.category === category);
        }

        return { books: filtered };
    },

    getBookById: (id: string) => {
        const book = books.find((b) => b.id === id);
        return book ? { book } : null;
    },

    addBook: (data: Omit<Book, 'id' | 'available_quantity' | 'status'>) => {
        const newBook: Book = {
            ...data,
            id: generateId('b'),
            available_quantity: data.quantity,
            status: 'available',
        };
        books.push(newBook);
        return { success: true, book: newBook };
    },

    updateBook: (id: string, data: Partial<Book>) => {
        const index = books.findIndex((b) => b.id === id);
        if (index !== -1) {
            books[index] = { ...books[index], ...data };
            return { success: true, book: books[index] };
        }
        return { success: false, error: 'Book not found' };
    },

    deleteBook: (id: string) => {
        const index = books.findIndex((b) => b.id === id);
        if (index !== -1) {
            books.splice(index, 1);
            return { success: true };
        }
        return { success: false, error: 'Book not found' };
    },

    issueBook: (data: { book_id: string; student_id: string; due_date: string }) => {
        const bookIndex = books.findIndex((b) => b.id === data.book_id);
        if (bookIndex === -1) {
            return { success: false, error: 'Book not found' };
        }

        const book = books[bookIndex];
        if (book.available_quantity <= 0) {
            return { success: false, error: 'Book not available' };
        }

        const newIssue: BookIssue = {
            id: generateId('i'),
            book_id: data.book_id,
            student_id: data.student_id,
            issue_date: new Date().toISOString().split('T')[0],
            due_date: data.due_date,
            status: 'issued',
        };
        bookIssues.push(newIssue);

        // Update book availability
        book.available_quantity--;
        if (book.available_quantity === 0) {
            book.status = 'out_of_stock';
        }

        return { success: true, issue: newIssue };
    },

    returnBook: (issueId: string, fine?: number) => {
        const index = bookIssues.findIndex((i) => i.id === issueId);
        if (index === -1) {
            return { success: false, error: 'Issue record not found' };
        }

        const issue = bookIssues[index];
        issue.return_date = new Date().toISOString().split('T')[0];
        issue.status = 'returned';
        if (fine) {
            issue.fine = fine;
        }

        // Update book availability
        const book = books.find((b) => b.id === issue.book_id);
        if (book) {
            book.available_quantity++;
            book.status = 'available';
        }

        return { success: true, issue };
    },

    getIssues: (studentId?: string, status?: string) => {
        let filtered = [...bookIssues];

        if (studentId) {
            filtered = filtered.filter((i) => i.student_id === studentId);
        }

        if (status) {
            filtered = filtered.filter((i) => i.status === status);
        }

        // Attach book and student info
        const issuesWithDetails = filtered.map((i) => {
            const book = books.find((b) => b.id === i.book_id);
            const student = students.find((s) => s.id === i.student_id);
            return {
                ...i,
                book_title: book?.title,
                student_name: student ? `${student.first_name} ${student.last_name}` : 'Unknown',
            };
        });

        return { issues: issuesWithDetails };
    },
};

// Message Service
export const messageService = {
    getAll: (userId?: string, role?: string) => {
        let filtered = [...messages];

        if (userId) {
            filtered = filtered.filter((m) => m.sender_id === userId || m.recipient_id === userId);
        }

        if (role) {
            filtered = filtered.filter((m) => m.recipient_role === role || m.sender_role === role);
        }

        return {
            messages: filtered.sort((a, b) => new Date(b.sent_at).getTime() - new Date(a.sent_at).getTime()),
        };
    },

    send: (data: {
        sender_id: string;
        sender_name: string;
        sender_role: string;
        recipient_role?: string;
        recipient_id?: string;
        recipient_label?: string;
        subject: string;
        message: string;
    }) => {
        const newMessage: Message = {
            id: generateId('m'),
            ...data,
            sent_at: new Date().toISOString(),
            read: false,
        };
        messages.push(newMessage);
        return { success: true, message: newMessage };
    },

    markAsRead: (id: string) => {
        const index = messages.findIndex((m) => m.id === id);
        if (index !== -1) {
            messages[index].read = true;
            return { success: true };
        }
        return { success: false, error: 'Message not found' };
    },

    delete: (id: string) => {
        const index = messages.findIndex((m) => m.id === id);
        if (index !== -1) {
            messages.splice(index, 1);
            return { success: true };
        }
        return { success: false, error: 'Message not found' };
    },
};

// Class Service
export const classService = {
    getAll: () => {
        return { classes };
    },

    getById: (id: string) => {
        const classData = classes.find((c) => c.id === id);
        if (!classData) return null;

        const classStudents = students.filter((s) => s.class === classData.name && s.section === classData.section);

        return { class: classData, students: classStudents };
    },

    create: (data: Omit<Class, 'id' | 'enrolled_students'>) => {
        const newClass: Class = {
            ...data,
            id: generateId('c'),
            enrolled_students: 0,
        };
        classes.push(newClass);
        return { success: true, class: newClass };
    },

    update: (id: string, data: Partial<Class>) => {
        const index = classes.findIndex((c) => c.id === id);
        if (index !== -1) {
            classes[index] = { ...classes[index], ...data };
            return { success: true, class: classes[index] };
        }
        return { success: false, error: 'Class not found' };
    },

    delete: (id: string) => {
        const index = classes.findIndex((c) => c.id === id);
        if (index !== -1) {
            classes.splice(index, 1);
            return { success: true };
        }
        return { success: false, error: 'Class not found' };
    },
};

// Organization Service (for super admin)
export const organizationService = {
    getAll: () => {
        return { organizations };
    },

    getById: (id: string) => {
        const organization = organizations.find((o) => o.id === id);
        if (!organization) return null;

        // Get stats for this organization
        const orgStudents = students.filter((s) => s.organization_id === id);
        const orgUsers = users.filter((u) => u.organization_id === id);

        return {
            organization,
            stats: {
                total_students: orgStudents.length,
                total_users: orgUsers.length,
            },
        };
    },

    create: (data: Omit<Organization, 'id'>) => {
        const newOrg: Organization = {
            ...data,
            id: generateId('org'),
        };
        organizations.push(newOrg);
        return { success: true, organization: newOrg };
    },

    update: (id: string, data: Partial<Organization>) => {
        const index = organizations.findIndex((o) => o.id === id);
        if (index !== -1) {
            organizations[index] = { ...organizations[index], ...data };
            return { success: true, organization: organizations[index] };
        }
        return { success: false, error: 'Organization not found' };
    },

    delete: (id: string) => {
        const index = organizations.findIndex((o) => o.id === id);
        if (index !== -1) {
            organizations.splice(index, 1);
            // Note: In production, you'd want to handle cascading deletes or prevent deletion if org has data
            return { success: true };
        }
        return { success: false, error: 'Organization not found' };
    },
};

// User Management Service (for admin to manage staff)
export const userManagementService = {
    getAll: (token: string) => {
        const orgId = getUserOrganization(token);
        const superAdmin = isSuperAdmin(token);

        // Super admin can see all users, regular admin only sees their org users
        let filtered = superAdmin
            ? users.filter((u) => u.role !== 'super_admin') // Don't show super admins to super admin in user management
            : users.filter((u) => u.organization_id === orgId && u.role !== 'super_admin');

        return { users: filtered };
    },

    getById: (id: string, token: string) => {
        const orgId = getUserOrganization(token);
        const user = users.find((u) => u.id === id && (!orgId || u.organization_id === orgId));
        if (user) {
            const { password: _, ...userWithoutPassword } = user;
            return { user: userWithoutPassword };
        }
        return null;
    },

    create: (data: Omit<User, 'id'>, token: string) => {
        const orgId = getUserOrganization(token);
        if (!orgId) {
            return { success: false, error: 'Organization not found' };
        }

        // Check if email already exists
        const existingUser = users.find((u) => u.email === data.email);
        if (existingUser) {
            return { success: false, error: 'Email already exists' };
        }

        const newUser: User = {
            ...data,
            id: generateId('u'),
            organization_id: orgId,
            status: data.status || 'active',
        };

        users.push(newUser);
        const { password: _, ...userWithoutPassword } = newUser;
        return { success: true, user: userWithoutPassword };
    },

    update: (id: string, data: Partial<User>) => {
        const index = users.findIndex((u) => u.id === id);
        if (index !== -1) {
            // Don't update password through this method if it's empty
            const updateData = { ...data };
            if (updateData.password === '' || updateData.password === undefined) {
                delete updateData.password;
            }

            users[index] = { ...users[index], ...updateData };
            const { password: _, ...userWithoutPassword } = users[index];
            return { success: true, user: userWithoutPassword };
        }
        return { success: false, error: 'User not found' };
    },

    delete: (id: string) => {
        const index = users.findIndex((u) => u.id === id);
        if (index !== -1) {
            users.splice(index, 1);
            return { success: true };
        }
        return { success: false, error: 'User not found' };
    },

    resetPassword: (id: string) => {
        const user = users.find((u) => u.id === id);
        if (user) {
            // In a real app, this would send a password reset email
            // For now, we'll just simulate success
            return { success: true, message: 'Password reset email sent' };
        }
        return { success: false, error: 'User not found' };
    },
};

// Dashboard Stats Service
export const dashboardService = {
    getStats: (token?: string | null) => {
        const orgId = getUserOrganization(token);
        const scopedStudents = orgId ? students.filter((student) => student.organization_id === orgId) : [...students];
        const scopedUsers = orgId ? users.filter((user) => user.organization_id === orgId) : [...users];
        const scopedFees = fees.filter((fee) => scopedStudents.some((student) => student.id === fee.student_id));
        const scopedAttendance = attendance.filter((entry) =>
            scopedStudents.some((student) => student.id === entry.student_id),
        );
        const scopedExams = orgId ? exams.filter((exam) => exam.organization_id === orgId) : [...exams];
        const scopedClasses = orgId
            ? classes.filter((schoolClass) => scopedUsers.some((user) => user.id === schoolClass.teacher_id))
            : [...classes];
        const scopedBookIssues = bookIssues.filter((issue) =>
            scopedStudents.some((student) => student.id === issue.student_id),
        );

        const totalStudents = scopedStudents.length;
        const activeStudents = scopedStudents.filter((s) => s.status === 'active').length;
        const totalFees = scopedFees.reduce((sum, f) => sum + f.total_amount, 0);
        const collectedFees = scopedFees.reduce((sum, f) => sum + f.paid_amount, 0);
        const pendingFees = scopedFees.reduce((sum, f) => sum + f.due_amount, 0);
        const totalBooks = books.length;
        const issuedBooks = scopedBookIssues.filter((i) => i.status === 'issued').length;
        const overdueBooks = scopedBookIssues.filter((i) => i.status === 'overdue').length;
        const availableBooks = books.reduce((sum, book) => sum + book.available_quantity, 0);
        const collectionRate = totalFees > 0 ? (collectedFees / totalFees) * 100 : 0;

        // Calculate today's attendance
        const today = new Date().toISOString().split('T')[0];
        const todayAttendance = scopedAttendance.filter((a) => a.date === today);
        const presentToday = todayAttendance.filter((a) => a.status === 'present' || a.status === 'late').length;
        const attendancePercentage = todayAttendance.length > 0 ? (presentToday / todayAttendance.length) * 100 : 0;
        const absentToday = todayAttendance.filter((a) => a.status === 'absent').length;

        const recentAdmissions = [...scopedStudents]
            .sort((left, right) => new Date(right.admission_date).getTime() - new Date(left.admission_date).getTime())
            .slice(0, 4)
            .map((student) => ({
                id: student.id,
                name: `${student.first_name} ${student.last_name}`,
                className: student.class,
                section: student.section,
                admissionDate: student.admission_date,
            }));

        const pendingFeeFollowUps = scopedFees
            .filter((fee) => fee.due_amount > 0)
            .sort((left, right) => {
                const dateDiff = new Date(left.due_date).getTime() - new Date(right.due_date).getTime();
                return dateDiff !== 0 ? dateDiff : right.due_amount - left.due_amount;
            })
            .slice(0, 5)
            .map((fee) => {
                const student = scopedStudents.find((entry) => entry.id === fee.student_id);
                return {
                    id: fee.id,
                    studentName: student ? `${student.first_name} ${student.last_name}` : 'Unknown Student',
                    className: student?.class || '-',
                    section: student?.section || '-',
                    dueAmount: fee.due_amount,
                    dueDate: fee.due_date,
                    status: fee.status,
                };
            });

        const libraryAlerts = scopedBookIssues
            .filter((issue) => issue.status === 'overdue' || issue.status === 'issued')
            .sort((left, right) => new Date(left.due_date).getTime() - new Date(right.due_date).getTime())
            .slice(0, 4)
            .map((issue) => {
                const student = scopedStudents.find((entry) => entry.id === issue.student_id);
                const book = books.find((entry) => entry.id === issue.book_id);
                return {
                    id: issue.id,
                    studentName: student ? `${student.first_name} ${student.last_name}` : 'Unknown Student',
                    bookTitle: book?.title || 'Unknown Book',
                    dueDate: issue.due_date,
                    status: issue.status,
                };
            });

        const upcomingExams = [...scopedExams]
            .sort((left, right) => new Date(left.exam_date).getTime() - new Date(right.exam_date).getTime())
            .slice(0, 4)
            .map((exam) => ({
                id: exam.id,
                name: exam.name,
                subject: exam.subject,
                className: exam.class,
                section: exam.section,
                examDate: exam.exam_date,
                startTime: exam.start_time,
            }));

        const activeStaff = scopedUsers.filter((entry) => entry.role !== 'student' && entry.status === 'active').length;
        const inactiveStaff = scopedUsers.filter(
            (entry) => entry.role !== 'student' && entry.status === 'inactive',
        ).length;
        const averageClassOccupancy =
            scopedClasses.length > 0
                ? scopedClasses.reduce(
                      (sum, entry) => sum + (entry.capacity > 0 ? (entry.enrolled_students / entry.capacity) * 100 : 0),
                      0,
                  ) / scopedClasses.length
                : 0;
        const unreadMessages = messages.filter((message) => !message.read).length;

        return {
            students: {
                total: totalStudents,
                active: activeStudents,
                recentAdmissions,
            },
            fees: {
                total: totalFees,
                collected: collectedFees,
                pending: pendingFees,
                collectionRate: Number(collectionRate.toFixed(2)),
                pendingCount: scopedFees.filter((fee) => fee.due_amount > 0).length,
                followUps: pendingFeeFollowUps,
            },
            library: {
                total_books: totalBooks,
                issued: issuedBooks,
                overdue: overdueBooks,
                available: availableBooks,
                alerts: libraryAlerts,
            },
            attendance: {
                today: presentToday,
                total_today: todayAttendance.length,
                percentage: attendancePercentage.toFixed(2),
                absent_today: absentToday,
            },
            classes: {
                total: scopedClasses.length,
                averageOccupancy: Number(averageClassOccupancy.toFixed(2)),
            },
            exams: {
                total: scopedExams.length,
                upcoming: upcomingExams,
            },
            staff: {
                active: activeStaff,
                inactive: inactiveStaff,
            },
            communication: {
                unread: unreadMessages,
            },
        };
    },
};
