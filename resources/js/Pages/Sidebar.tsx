import React, { useEffect, useRef, useState } from 'react';
import { useLanguage } from '../i18n/LanguageProvider';
import { Button } from './ui/button';
import {
    Home,
    Users,
    IndianRupee,
    CalendarCheck,
    FileText,
    Book,
    MessageSquare,
    School,
    Archive,
    GraduationCap,
    UserCog,
    Award,
    BarChart3,
    Settings,
    Globe,
    ChevronDown,
    ChevronRight,
    BadgePercent,
    BookOpen,
    BookOpenCheck,
    ArrowUpCircle,
    ArrowDownCircle,
    Landmark,
    Layers,
    Briefcase,
    UserRound,
    Upload,
    Target,
    Phone,
    Send,
    Inbox,
    TriangleAlert,
    BedDouble,
    Trash2,
    Clock3,
    Clock,
    ShieldCheck,
    BusFront,
    ClipboardPenLine,
    Boxes,
    Download,
    CalendarX,
    ClipboardList,
    UserPlus,
    ShoppingCart,
    Wand2,
    Database,
    Bot,
    Languages,
    CreditCard,
    KeyRound,
    Fingerprint,
    CalendarDays,
    CalendarRange,
    ShieldAlert,
    HeartPulse,
    Handshake,
    QrCode,
    FileSpreadsheet,
    FolderOpen,
    FolderTree,
    FileClock,
    HelpCircle,
    LibraryBig,
    LifeBuoy,
    MessageCircle,
    Video,
} from 'lucide-react';
import { organizationService } from '../utils/mockDataService';
import { router, usePage } from '@inertiajs/react';

interface SidebarProps {
    user: any;
    activeTab: string;
    onTabChange?: (tab: string) => void;
    onLogout?: () => void;
    onNavigate?: () => void;
}

export default function Sidebar({ user, activeTab, onNavigate }: SidebarProps) {
    const [organization, setOrganization] = useState<any>(null);
    const { schoolName, schoolLogo, staffPermissions } = usePage<{
        schoolName?: string | null;
        schoolLogo?: string | null;
        staffPermissions?: Record<string, Record<string, boolean>>;
    }>().props;
    const { t } = useLanguage();
    const sidebarScrollRef = useRef<HTMLDivElement | null>(null);
    const activeItemRef = useRef<HTMLButtonElement | null>(null);
    const shouldScrollToActiveRef = useRef(true);
    const studentTabs = [
        'search_students',
        'online-admission',
        'bulk-delete-students',
        'alumni-records',
        'student-exits',
    ];
    const academicTabs = [
        'classes',
        'class-time-table',
        'teacher-time-table',
        'lesson-plan',
        'homework',
        'subjects',
        'promote-students',
    ];

    const frontOfficeTabs = [
        'admission-enquiry',
        'leads',
        'visitor-register',
        'phone-call-log',
        'postal-dispatch',
        'postal-delivery',
        'complains',
    ];

    const examTabs = [
        'examination',
        'hall-ticket',
        'print-marksheet',
        'report-card',
        'datesheets',
        'exam-types',
        'manage-grades',
        'enter-marks',
        'exam-schedule-setup',
        'chapters-topics',
        'assign-class-teacher',
        'assign-electives',
        'time-slots',
    ];
    const certificateTabs = ['certificate', 'marksheet', 'student-id-card', 'student-certificates'];
    const communicationTabs = [
        'communication',
        'send-whatsapp',
        'send-qwa-whatsapp',
        'notice-board',
        'voice-calls',
        'send-emails',
        'send-sms',
        'download-center',
        'document-vault',
    ];

    const hrTabs = ['staff', 'import-center', 'staff-daily-attendance', 'payroll-management', 'leave-management'];
    const hostelTabs = ['hostel-management', 'hostel-fee-collection', 'my-hostel'];
    const transportTabs = ['transport-management', 'transport-fee-collection'];
    const settingTabs = [
        'settings',
        'language-settings',
        'communication-settings',
        'online-payment-settings',
        'roles-permissions',
        'sessions',
    ];
    const websiteCmsTabs = ['website-cms', 'pages-builder'];
    const reportTabs = [
        'reports',
        'reports-overview',
        'reports-students',
        'reports-attendance',
        'reports-fees',
        'reports-exams',
        'reports-library',
        'reports-transport',
        'reports-hostel',
        'reports-inventory',
        'reports-front-office',
        'reports-communication',
        'reports-lesson-plan',
        'reports-human-resource',
        'reports-homework',
        'reports-alumni',
        'reports-activity-log',
        'reports-audit-trail',
    ];

    const [studentsOpen, setStudentsOpen] = useState(studentTabs.includes(activeTab));
    const [academicsOpen, setAcademicsOpen] = useState(academicTabs.includes(activeTab));
    const [frontOfficeOpen, setFrontOfficeOpen] = useState(frontOfficeTabs.includes(activeTab));
    const [examsOpen, setExamsOpen] = useState(examTabs.includes(activeTab));
    const [certificatesOpen, setCertificatesOpen] = useState(certificateTabs.includes(activeTab));
    const [communicationOpen, setCommunicationOpen] = useState(communicationTabs.includes(activeTab));
    const [hrOpen, setHrOpen] = useState(hrTabs.includes(activeTab));
    const [hostelOpen, setHostelOpen] = useState(hostelTabs.includes(activeTab));
    const [transportOpen, setTransportOpen] = useState(transportTabs.includes(activeTab));
    const [settingsOpen, setSettingsOpen] = useState(settingTabs.includes(activeTab));
    const [websiteCmsOpen, setWebsiteCmsOpen] = useState(websiteCmsTabs.includes(activeTab));
    const [reportsOpen, setReportsOpen] = useState(reportTabs.includes(activeTab));

    useEffect(() => {
        if (user.role !== 'super_admin' && user.organization_id) {
            const result = organizationService.getById(user.organization_id);
            if (result) {
                setOrganization(result.organization);
            }
        }
    }, [user.organization_id, user.role]);

    useEffect(() => {
        shouldScrollToActiveRef.current = true;

        if (studentTabs.includes(activeTab)) {
            setStudentsOpen(true);
        }
        if (academicTabs.includes(activeTab)) {
            setAcademicsOpen(true);
        }
        if (frontOfficeTabs.includes(activeTab)) {
            setFrontOfficeOpen(true);
        }
        if (examTabs.includes(activeTab)) {
            setExamsOpen(true);
        }
        if (certificateTabs.includes(activeTab)) {
            setCertificatesOpen(true);
        }
        if (communicationTabs.includes(activeTab)) {
            setCommunicationOpen(true);
        }
        if (hrTabs.includes(activeTab)) {
            setHrOpen(true);
        }
        if (hostelTabs.includes(activeTab)) {
            setHostelOpen(true);
        }
        if (transportTabs.includes(activeTab)) {
            setTransportOpen(true);
        }
        if (settingTabs.includes(activeTab)) {
            setSettingsOpen(true);
        }
        if (websiteCmsTabs.includes(activeTab)) {
            setWebsiteCmsOpen(true);
        }
        if (reportTabs.includes(activeTab)) {
            setReportsOpen(true);
        }
    }, [activeTab]);

    useEffect(() => {
        if (!shouldScrollToActiveRef.current || !sidebarScrollRef.current || !activeItemRef.current) {
            return;
        }

        const scrollContainer = sidebarScrollRef.current;
        const activeElement = activeItemRef.current;
        const containerRect = scrollContainer.getBoundingClientRect();
        const activeRect = activeElement.getBoundingClientRect();

        if (activeRect.top < containerRect.top || activeRect.bottom > containerRect.bottom) {
            activeElement.scrollIntoView({
                block: 'nearest',
                behavior: 'smooth',
            });
        }

        shouldScrollToActiveRef.current = false;
    }, [
        activeTab,
        studentsOpen,
        academicsOpen,
        frontOfficeOpen,
        examsOpen,
        certificatesOpen,
        communicationOpen,
        hrOpen,
        hostelOpen,
        transportOpen,
        settingsOpen,
        websiteCmsOpen,
    ]);

    const hasPermission = (feature: string) => {
        if (user.role === 'super_admin') {
            return true;
        }

        if (!['admin', 'teacher', 'receptionist', 'accountant', 'librarian'].includes(user.role)) {
            return true;
        }

        return Boolean(staffPermissions?.[feature]?.view);
    };

    const canAccessItem = (roles: string[], feature: string) => {
        if (user.role === 'super_admin') {
            return roles.includes('super_admin');
        }

        if (['admin', 'teacher', 'receptionist', 'accountant', 'librarian'].includes(user.role)) {
            const isPortalOnlyItem = roles.every((role) => ['student', 'parent'].includes(role));

            if (isPortalOnlyItem) {
                return false;
            }

            return hasPermission(feature);
        }

        return roles.includes(user.role);
    };

    const getMenuItems = () => {
        const role = user.role;

        const allMenuItems = [
            {
                id: 'dashboard',
                label: 'Dashboard',
                icon: Home,
                roles: [
                    'super_admin',
                    'admin',
                    'receptionist',
                    'teacher',
                    'accountant',
                    'librarian',
                    'student',
                    'parent',
                ],

                feature: 'Dashboard Home',
            },
            {
                id: 'front-office-menu',
                label: 'Front Office',
                icon: Briefcase,
                roles: ['admin', 'receptionist'],
                feature: 'Admission Enquiry',
            },
            {
                id: 'students-menu',
                label: 'Students',
                icon: Users,
                roles: ['super_admin', 'admin', 'receptionist', 'teacher'],
                feature: 'Search Students',
            },
            {
                id: 'academics-menu',
                label: 'Academics',
                icon: School,
                roles: ['super_admin', 'admin', 'teacher', 'student'],
                feature: 'Class / Section',
            },
            {
                id: 'study-materials',
                label: 'Study Materials',
                icon: FolderOpen,
                roles: ['super_admin', 'admin', 'teacher', 'student'],
                feature: 'Study Materials',
            },
            {
                id: 'question-bank',
                label: 'Question Bank',
                icon: HelpCircle,
                roles: ['super_admin', 'admin', 'teacher'],
                feature: 'Question Bank',
            },
            {
                id: 'online-classes',
                label: 'Online Classes',
                icon: Video,
                roles: ['super_admin', 'admin', 'teacher', 'student'],
                feature: 'Live Online Classes',
            },
            {
                id: 'syllabus',
                label: 'Syllabus Coverage',
                icon: BookOpenCheck,
                roles: ['super_admin', 'admin', 'teacher'],
                feature: 'Syllabus Coverage',
            },
            {
                id: 'attendance',
                label: 'Attendance',
                icon: CalendarCheck,
                roles: ['super_admin', 'admin', 'teacher'],
                feature: 'Attendance Management',
            },
            {
                id: 'attendance-qr',
                label: 'QR Attendance',
                icon: QrCode,
                roles: ['super_admin', 'admin', 'teacher'],
                feature: 'QR Code Attendance',
            },
            {
                id: 'fees',
                label: 'Fees',
                icon: IndianRupee,
                roles: ['super_admin', 'admin', 'accountant', 'receptionist', 'student'],
                feature: 'Fees Management',
            },
            {
                id: 'fee-challans',
                label: 'Fee Challans',
                icon: FileText,
                roles: ['super_admin', 'admin', 'accountant'],
                feature: 'Fees Management',
            },
            {
                id: 'due-slips',
                label: 'Due Slips',
                icon: FileText,
                roles: ['super_admin', 'admin', 'accountant'],
                feature: 'Fees Management',
            },
            {
                id: 'fee-audit',
                label: 'Fee Audit',
                icon: FileClock,
                roles: ['super_admin', 'admin', 'accountant'],
                feature: 'Fees Management',
            },
            {
                id: 'fee-groups',
                label: 'Fee Groups',
                icon: Layers,
                roles: ['super_admin', 'admin', 'accountant'],
                feature: 'Fees Management',
            },
            {
                id: 'fees-discounts',
                label: 'Fee Discounts',
                icon: BadgePercent,
                roles: ['super_admin', 'admin', 'accountant'],
                feature: 'Fees Management',
            },
            {
                id: 'scholarships',
                label: 'Scholarships',
                icon: BadgePercent,
                roles: ['super_admin', 'admin', 'accountant'],
                feature: 'Scholarship & Discounts',
            },
            {
                id: 'tally',
                label: 'Tally Export',
                icon: FileSpreadsheet,
                roles: ['super_admin', 'admin', 'accountant'],
                feature: 'Tally Export',
            },
            {
                id: 'income-management',
                label: 'Income',
                icon: ArrowUpCircle,
                roles: ['super_admin', 'admin', 'accountant'],
                feature: 'Income Management',
            },
            {
                id: 'expense-management',
                label: 'Expenses',
                icon: ArrowDownCircle,
                roles: ['super_admin', 'admin', 'accountant'],
                feature: 'Expense Management',
            },
            {
                id: 'bank-accounts',
                label: 'Bank Accounts',
                icon: Landmark,
                roles: ['super_admin', 'admin', 'accountant'],
                feature: 'Bank Accounts',
            },
            {
                id: 'hr-menu',
                label: 'Human Resource',
                icon: UserCog,
                roles: ['admin'],
                feature: 'User Management',
            },
            {
                id: 'exams-menu',
                label: 'Exams',
                icon: FileText,
                roles: ['super_admin', 'admin', 'teacher'],
                feature: 'Exam Management',
            },
            {
                id: 'online-exams',
                label: 'Online Exams',
                icon: Clock3,
                roles: ['super_admin', 'admin', 'teacher', 'student'],
                feature: 'Online Exams',
            },
            {
                id: 'offline-exams',
                label: 'Offline Exams',
                icon: FileText,
                roles: ['student'],
                feature: 'Exam Management',
            },
            {
                id: 'feedback',
                label: 'Feedback',
                icon: ClipboardPenLine,
                roles: ['admin', 'student'],
                feature: 'Feedback Management',
            },
            {
                id: 'my-hostel',
                label: 'Hostel',
                icon: BedDouble,
                href: '/my-hostel',
                roles: ['student'],
                feature: 'Dashboard Home',
            },
            {
                id: 'complains',
                label: 'Complaints',
                icon: TriangleAlert,
                roles: ['student'],
                feature: 'Complains',
            },
            {
                id: 'communication',
                label: 'Communication',
                icon: MessageSquare,
                roles: ['super_admin', 'admin', 'teacher', 'parent', 'receptionist', 'student'],
                feature: 'Messages',
            },
            {
                id: 'hostel-menu',
                label: 'Hostel',
                icon: BedDouble,
                roles: ['admin'],
                feature: 'Hostel Management',
            },
            {
                id: 'transport-management',
                label: 'Transport',
                icon: BusFront,
                roles: ['admin', 'receptionist', 'driver'],
                feature: 'Transport Management',
            },
            {
                id: 'events-calendar',
                label: 'Events Calendar',
                icon: CalendarDays,
                href: '/events',
                roles: ['super_admin', 'admin', 'teacher', 'receptionist'],
                feature: 'Events Calendar',
            },
            {
                id: 'discipline',
                label: 'Discipline',
                icon: ShieldAlert,
                roles: ['super_admin', 'admin', 'teacher'],
                feature: 'Discipline',
            },
            {
                id: 'student-health',
                label: 'Student Health',
                icon: HeartPulse,
                roles: ['super_admin', 'admin', 'teacher'],
                feature: 'Student Health',
            },
            {
                id: 'ptm',
                label: 'Parent-Teacher Meeting',
                icon: Handshake,
                roles: ['super_admin', 'admin', 'teacher'],
                feature: 'PTM',
            },
            {
                id: 'certificates',
                label: 'Certificates',
                icon: Award,
                roles: ['super_admin', 'admin', 'teacher', 'student'],
                feature: 'Certificate Management',
            },
            {
                id: 'library',
                label: 'Library',
                icon: Book,
                roles: ['super_admin', 'admin', 'librarian', 'teacher'],
                feature: 'Library Management',
            },
            {
                id: 'e-library',
                label: 'E-Library',
                icon: LibraryBig,
                roles: ['super_admin', 'admin', 'librarian', 'teacher', 'student'],
                feature: 'E-Library',
            },
            {
                id: 'inventory',
                label: 'Inventory',
                icon: Boxes,
                roles: ['super_admin', 'admin', 'accountant', 'librarian', 'receptionist'],
                feature: 'Inventory Management',
            },
            {
                id: 'purchase-orders',
                label: 'Vendors & Orders',
                icon: ShoppingCart,
                href: '/purchase-orders',
                roles: ['super_admin', 'admin', 'accountant'],
                feature: 'Vendors & Purchase Orders',
            },
            {
                id: 'reports',
                label: 'Reports Center',
                icon: BarChart3,
                roles: ['super_admin', 'admin'],
                feature: 'Reports & Analytics',
            },
            {
                id: 'knowledge-base',
                label: 'Knowledge Base',
                icon: BookOpen,
                roles: ['admin', 'teacher', 'receptionist', 'accountant', 'librarian'],
                feature: 'Knowledge Base',
            },
            {
                id: 'website-cms',
                label: 'Website CMS',
                icon: Globe,
                roles: ['admin'],
                feature: 'Website CMS',
            },
            {
                id: 'settings',
                label: 'Settings',
                icon: Settings,
                roles: ['admin'],
                feature: 'General Setting',
            },
            {
                id: 'my-leaves',
                label: 'My Leaves',
                icon: CalendarX,
                href: '/my-leaves',
                roles: ['receptionist', 'teacher', 'accountant', 'librarian'],
                feature: 'My Leaves',
            },
            {
                id: 'profile',
                label: 'Profile',
                icon: UserRound,
                href: '/profile',
                roles: [
                    'super_admin',
                    'admin',
                    'receptionist',
                    'teacher',
                    'accountant',
                    'librarian',
                    'student',
                    'parent',
                ],

                feature: 'Profile',
            },
        ];

        return allMenuItems.filter((item) => {
            if (item.id === 'students-menu') {
                return hasStudentMenu;
            }

            if (item.id === 'academics-menu') {
                return hasAcademicMenu;
            }

            if (item.id === 'front-office-menu') {
                return hasFrontOfficeMenu;
            }

            if (item.id === 'exams-menu') {
                return hasExamMenu;
            }

            if (item.id === 'certificates') {
                return hasCertificateMenu;
            }

            if (item.id === 'communication') {
                return hasCommunicationMenu;
            }

            if (item.id === 'hr-menu') {
                return hasHRMenu;
            }

            if (item.id === 'hostel-menu') {
                return hasHostelMenu;
            }

            if (item.id === 'transport-management') {
                return hasTransportMenu;
            }

            if (item.id === 'settings') {
                return hasSettingsMenu;
            }

            if (item.id === 'website-cms') {
                return hasWebsiteCmsMenu;
            }

            if (item.id === 'reports') {
                return hasReportMenu;
            }

            return canAccessItem(item.roles, item.feature);
        });
    };
    const studentMenuItems = [
        {
            id: 'search_students',
            label: 'Search Students',
            icon: Users,
            href: '/search_students',
            roles: ['super_admin', 'admin', 'receptionist', 'teacher'],
            feature: 'Search Students',
        },
        {
            id: 'online-admission',
            label: 'Online Admission',
            icon: FileText,
            href: '/online-admission',
            roles: ['super_admin', 'admin', 'receptionist', 'teacher'],
            feature: 'Online Admission',
        },
        {
            id: 'bulk-delete-students',
            label: 'Bulk Delete',
            icon: Trash2,
            href: '/bulk-delete-students',
            roles: ['super_admin', 'admin', 'receptionist', 'teacher'],
            feature: 'Bulk Delete Students',
        },
        {
            id: 'alumni-records',
            label: 'Alumni Records',
            icon: GraduationCap,
            href: '/alumni-records',
            roles: ['super_admin', 'admin', 'receptionist', 'teacher'],
            feature: 'Alumni Records',
        },
        {
            id: 'student-exits',
            label: 'TC & Exit',
            icon: ClipboardList,
            href: '/student-exits',
            roles: ['super_admin', 'admin'],
            feature: 'TC & Exit',
        },
    ].filter((item) => canAccessItem(item.roles, item.feature));
    const hasStudentMenu = studentMenuItems.length > 0;
    const academicMenuItems = [
        {
            id: 'classes',
            label: 'Class / Section',
            icon: School,
            roles: ['super_admin', 'admin', 'teacher'],
            feature: 'Class / Section',
        },
        {
            id: 'class-time-table',
            label: 'Class Time Table',
            icon: Clock3,
            roles: ['super_admin', 'admin', 'teacher', 'student'],
            feature: 'Class Time Table',
        },
        {
            id: 'auto-timetable',
            label: 'Auto Timetable',
            icon: Wand2,
            href: '/auto-timetable',
            roles: ['super_admin', 'admin'],
            feature: 'Auto Timetable',
        },
        {
            id: 'teacher-time-table',
            label: 'Teachers Time Table',
            icon: Clock3,
            roles: ['super_admin', 'admin', 'teacher'],
            feature: 'Teachers Time Table',
        },
        {
            id: 'lesson-plan',
            label: 'Lesson Plan',
            icon: BookOpen,
            roles: ['super_admin', 'admin', 'teacher', 'student'],
            feature: 'Lesson Plan',
        },
        {
            id: 'homework',
            label: 'Homework',
            icon: ClipboardPenLine,
            roles: ['super_admin', 'admin', 'teacher', 'student'],
            feature: 'Homework',
            href: '/homework',
        },
        {
            id: 'subjects',
            label: 'Subjects',
            icon: BookOpen,
            roles: ['admin', 'teacher'],
            feature: 'Subjects',
        },
        {
            id: 'promote-students',
            label: 'Promote Students',
            icon: ArrowUpCircle,
            roles: ['admin'],
            feature: 'Promote Students',
        },
    ].filter((item) => canAccessItem(item.roles, item.feature));
    const hasAcademicMenu = academicMenuItems.length > 0;
    const frontOfficeMenuItems = [
        {
            id: 'admission-enquiry',
            label: 'Admission Enquiry',
            icon: UserRound,
            roles: ['admin', 'receptionist'],
            feature: 'Admission Enquiry',
        },
        {
            id: 'leads',
            label: 'Leads',
            icon: Target,
            roles: ['admin', 'receptionist'],
            feature: 'Admission Leads',
        },
        {
            id: 'visitor-register',
            label: 'Visitor Register',
            icon: Briefcase,
            roles: ['admin', 'receptionist'],
            feature: 'Visitor Register',
        },
        {
            id: 'phone-call-log',
            label: 'Phone Call Log',
            icon: Phone,
            roles: ['admin', 'receptionist'],
            feature: 'Phone Call Log',
        },
        {
            id: 'postal-dispatch',
            label: 'Postal Dispatch',
            icon: Send,
            roles: ['admin', 'receptionist'],
            feature: 'Postal Dispatch',
        },
        {
            id: 'postal-delivery',
            label: 'Postal Delivery',
            icon: Inbox,
            roles: ['admin', 'receptionist'],
            feature: 'Postal Delivery',
        },
        {
            id: 'complains',
            label: 'Complains',
            icon: TriangleAlert,
            roles: ['admin', 'teacher', 'receptionist', 'accountant', 'librarian'],
            feature: 'Complains',
        },
    ].filter((item) => canAccessItem(item.roles, item.feature));
    const hasFrontOfficeMenu = frontOfficeMenuItems.length > 0;
    const examMenuItems = [
        {
            id: 'examination',
            label: 'Examination',
            icon: FileText,
            href: '/exams',
            roles: ['super_admin', 'admin', 'teacher'],
            feature: 'Exam Management',
        },
        {
            id: 'datesheets',
            label: 'Datesheet',
            icon: CalendarRange,
            href: '/datesheets',
            roles: ['super_admin', 'admin', 'teacher'],
            feature: 'Exam Management',
        },
        {
            id: 'exam-types',
            label: 'Exam Types',
            icon: ShieldCheck,
            href: '/exam-types',
            roles: ['super_admin', 'admin', 'teacher'],
            feature: 'Exam Management',
        },
        {
            id: 'manage-grades',
            label: 'Manage Grades',
            icon: BookMarked,
            href: '/grades',
            roles: ['super_admin', 'admin', 'teacher'],
            feature: 'Exam Management',
        },
        {
            id: 'enter-marks',
            label: 'Enter Marks',
            icon: ClipboardList,
            href: '/exams/marks/entry',
            roles: ['super_admin', 'admin', 'teacher'],
            feature: 'Exam Management',
        },
        {
            id: 'exam-schedule-setup',
            label: 'Schedule Setup',
            icon: CalendarRange,
            href: '/exam-schedule',
            roles: ['super_admin', 'admin', 'teacher'],
            feature: 'Exam Management',
        },
        {
            id: 'chapters-topics',
            label: 'Chapters & Topics',
            icon: FolderTree,
            href: '/chapters-topics',
            roles: ['super_admin', 'admin', 'teacher'],
            feature: 'Exam Management',
        },
        {
            id: 'assign-class-teacher',
            label: 'Assign Class Teacher',
            icon: UserCog,
            href: '/assign-class-teacher',
            roles: ['super_admin', 'admin', 'teacher'],
            feature: 'Exam Management',
        },
        {
            id: 'assign-electives',
            label: 'Assign Electives',
            icon: BookOpen,
            href: '/assign-electives',
            roles: ['super_admin', 'admin', 'teacher'],
            feature: 'Exam Management',
        },
        {
            id: 'time-slots',
            label: 'Manage Periods',
            icon: Clock,
            href: '/time-slots',
            roles: ['super_admin', 'admin', 'teacher'],
            feature: 'Exam Management',
        },
        {
            id: 'hall-ticket',
            label: 'Hall Ticket',
            icon: BookOpen,
            href: '/exams/hall-ticket',
            roles: ['super_admin', 'admin', 'teacher'],
            feature: 'Hall Ticket',
        },
        {
            id: 'print-marksheet',
            label: 'Print Marksheet',
            icon: Award,
            href: '/exams/print-marksheet',
            roles: ['super_admin', 'admin', 'teacher'],
            feature: 'Print Marksheet',
        },
        {
            id: 'report-card',
            label: 'Report Card',
            icon: FileText,
            href: '/exams/report-card',
            roles: ['super_admin', 'admin', 'teacher'],
            feature: 'Report Card',
        },
    ].filter((item) => canAccessItem(item.roles, item.feature));
    const hasExamMenu = examMenuItems.length > 0;
    const certificateMenuItems = [
        {
            id: 'certificate',
            label: 'Certificate',
            icon: Award,
            href: '/certificates',
            roles: ['super_admin', 'admin', 'teacher'],
            feature: 'Certificate Management',
        },
        {
            id: 'student-certificates',
            label: 'My Certificates',
            icon: Award,
            href: '/my-certificates',
            roles: ['student'],
            feature: 'Certificate Management',
        },
        {
            id: 'marksheet',
            label: 'Marksheet',
            icon: FileText,
            href: '/certificates/marksheet',
            roles: ['super_admin', 'admin', 'teacher'],
            feature: 'Marksheet Management',
        },
        {
            id: 'student-id-card',
            label: 'Student ID Card',
            icon: UserRound,
            href: '/certificates/student-id-card',
            roles: ['super_admin', 'admin', 'teacher'],
            feature: 'Student ID Card Management',
        },
    ].filter((item) => canAccessItem(item.roles, item.feature));
    const hasCertificateMenu = certificateMenuItems.length > 0;
    const communicationMenuItems = [
        {
            id: 'communication',
            label: 'Messages',
            icon: MessageSquare,
            href: '/communication',
            roles: ['super_admin', 'admin', 'teacher', 'parent', 'receptionist'],
            feature: 'Messages',
        },
        {
            id: 'send-whatsapp',
            label: 'Send Whatsapp',
            icon: MessageSquare,
            href: '/communication/send-whatsapp',
            roles: ['super_admin', 'admin', 'teacher', 'parent', 'receptionist'],
            feature: 'Send Whatsapp',
        },
        {
            id: 'send-qwa-whatsapp',
            label: 'Send QWA Whatsapp',
            icon: MessageSquare,
            href: '/communication/send-qwa-whatsapp',
            roles: ['super_admin', 'admin', 'teacher', 'parent', 'receptionist'],
            feature: 'Send QWA Whatsapp',
        },
        {
            id: 'notice-board',
            label: 'Notice Board',
            icon: Award,
            href: '/communication/notice-board',
            roles: ['super_admin', 'admin', 'teacher', 'parent', 'receptionist', 'student'],
            feature: 'Notice Board',
        },
        {
            id: 'helpdesk',
            label: 'Helpdesk',
            icon: LifeBuoy,
            roles: ['super_admin', 'admin', 'teacher', 'receptionist', 'accountant', 'student'],
            feature: 'Parent Helpdesk',
        },
        {
            id: 'voice-calls',
            label: 'Voice Calls',
            icon: Phone,
            href: '/communication/voice-calls',
            roles: ['super_admin', 'admin', 'teacher', 'parent', 'receptionist'],
            feature: 'Voice Calls',
        },
        {
            id: 'send-emails',
            label: 'Send Emails',
            icon: Send,
            href: '/communication/send-emails',
            roles: ['super_admin', 'admin', 'teacher', 'parent', 'receptionist'],
            feature: 'Send Emails',
        },
        {
            id: 'send-sms',
            label: 'Send SMS',
            icon: MessageSquare,
            href: '/communication/send-sms',
            roles: ['super_admin', 'admin', 'teacher', 'parent', 'receptionist', 'accountant'],
            feature: 'Send SMS',
        },
        {
            id: 'download-center',
            label: 'Download Center',
            icon: Download,
            href: '/communication/download-center',
            roles: ['super_admin', 'admin', 'teacher', 'parent', 'receptionist', 'student', 'accountant', 'librarian'],
            feature: 'Download Center',
        },
        {
            id: 'document-vault',
            label: 'Document Vault',
            icon: Archive,
            href: '/document-vault',
            roles: ['super_admin', 'admin', 'teacher', 'receptionist', 'accountant', 'librarian', 'student'],
            feature: 'Download Center',
        },
        {
            id: 'chat',
            label: 'Live Chat',
            icon: MessageCircle,
            href: '/chat',
            roles: ['super_admin', 'admin', 'teacher', 'receptionist', 'accountant', 'librarian', 'student'],
            feature: 'Live Chat',
        },
    ].filter((item) => canAccessItem(item.roles, item.feature));
    const hasCommunicationMenu = communicationMenuItems.length > 0;
    const staffMenuItems = [
        {
            id: 'staff',
            label: 'Staff Management',
            icon: UserCog,
            href: '/staff',
            roles: ['admin'],
            feature: 'User Management',
        },
        {
            id: 'import-center',
            label: 'Import Center',
            icon: Upload,
            href: '/import-center',
            roles: ['admin', 'super_admin'],
            feature: 'User Management',
        },
        {
            id: 'staff-daily-attendance',
            label: 'Staff Attendance',
            icon: CalendarCheck,
            href: '/staff/daily-attendance',
            roles: ['admin'],
            feature: 'Staff Attendance',
        },
        {
            id: 'payroll-management',
            label: 'Payroll Management',
            icon: IndianRupee,
            href: '/staff/payroll-management',
            roles: ['admin'],
            feature: 'Payroll Management',
        },
        {
            id: 'leave-management',
            label: 'Leave Management',
            icon: CalendarX,
            href: '/staff/leave-management',
            roles: ['admin'],
            feature: 'Leave Management',
        },
        {
            id: 'teacher-evaluations',
            label: 'Teacher Evaluations',
            icon: ClipboardList,
            href: '/teacher-evaluations',
            roles: ['admin'],
            feature: 'Teacher Evaluations',
        },
        {
            id: 'staff-id-cards',
            label: 'Staff ID Cards',
            icon: CreditCard,
            href: '/staff/id-cards',
            roles: ['admin'],
            feature: 'Staff ID Cards',
        },
        {
            id: 'recruitment',
            label: 'Recruitment & Hiring',
            icon: UserPlus,
            href: '/recruitment',
            roles: ['admin'],
            feature: 'Recruitment & Hiring',
        },
    ].filter((item) => canAccessItem(item.roles, item.feature));
    const hasHRMenu = staffMenuItems.length > 0;
    const hostelMenuItems = [
        {
            id: 'hostel-management',
            label: 'Manage Hostel',
            icon: BedDouble,
            href: '/hostel-management',
            roles: ['admin'],
            feature: 'Hostel Management',
        },
        {
            id: 'hostel-fee-collection',
            label: 'Fee Collection',
            icon: IndianRupee,
            href: '/hostel-fee-collection',
            roles: ['admin'],
            feature: 'Hostel Fee Collection',
        },
    ].filter((item) => canAccessItem(item.roles, item.feature));
    const hasHostelMenu = hostelMenuItems.length > 0;
    const transportMenuItems = [
        {
            id: 'transport-management',
            label: 'Transport Management',
            icon: BusFront,
            href: '/transport-management',
            roles: ['admin', 'receptionist', 'driver'],
            feature: 'Transport Management',
        },
        {
            id: 'transport-fee-collection',
            label: 'Fee Collection',
            icon: IndianRupee,
            href: '/transport-fee-collection',
            roles: ['admin', 'receptionist'],
            feature: 'Transport Fee Collection',
        },
    ].filter((item) => canAccessItem(item.roles, item.feature));
    const hasTransportMenu = transportMenuItems.length > 0;
    const settingsMenuItems = [
        {
            id: 'settings',
            label: 'General Setting',
            icon: Settings,
            href: '/settings',
            roles: ['admin'],
            feature: 'General Setting',
        },
        {
            id: 'language-settings',
            label: 'Language Setting',
            icon: Languages,
            href: '/settings/language',
            roles: ['admin'],
            feature: 'General Setting',
        },
        {
            id: 'communication-settings',
            label: 'Communication Setting',
            icon: MessageSquare,
            href: '/settings/communication',
            roles: ['admin'],
            feature: 'Communication Setting',
        },
        {
            id: 'online-payment-settings',
            label: 'Online Payments',
            icon: CreditCard,
            href: '/settings/online-payments',
            roles: ['admin'],
            feature: 'Online Payment Setting',
        },
        {
            id: 'sso-settings',
            label: 'SSO Settings',
            icon: KeyRound,
            href: '/settings/sso',
            roles: ['super_admin', 'admin'],
            feature: 'SSO Settings',
        },
        {
            id: 'biometric-settings',
            label: 'Biometric Settings',
            icon: Fingerprint,
            href: '/settings/biometric',
            roles: ['super_admin', 'admin'],
            feature: 'Biometric Settings',
        },
        {
            id: 'roles-permissions',
            label: 'Roles & Permissions',
            icon: ShieldCheck,
            href: '/settings/roles-permissions',
            roles: ['admin'],
            feature: 'Roles & Permissions',
        },
        {
            id: 'sessions',
            label: 'Sessions',
            icon: CalendarCheck,
            href: '/sessions',
            roles: ['admin'],
            feature: 'Sessions',
        },
        {
            id: 'automated-backups',
            label: 'Database Backups',
            icon: Database,
            href: '/backups',
            roles: ['super_admin', 'admin'],
            feature: 'General Setting',
        },
        {
            id: 'ai-assistant',
            label: 'AI Assistant',
            icon: Bot,
            href: '/ai-assistant',
            roles: ['super_admin', 'admin'],
            feature: 'AI Assistant',
        },
    ].filter((item) => canAccessItem(item.roles, item.feature));
    const hasSettingsMenu = settingsMenuItems.length > 0;
    const websiteCmsMenuItems = [
        {
            id: 'website-cms',
            label: 'CMS Editor',
            icon: Globe,
            href: '/website-cms',
            roles: ['admin'],
            feature: 'Website CMS',
        },
        {
            id: 'pages-builder',
            label: 'Pages',
            icon: FileText,
            href: '/pages-builder',
            roles: ['admin'],
            feature: 'Website Pages',
        },
    ].filter((item) => canAccessItem(item.roles, item.feature));
    const hasWebsiteCmsMenu = websiteCmsMenuItems.length > 0;
    const reportMenuItems = [
        {
            id: 'reports-overview',
            label: 'Overview Dashboard',
            icon: BarChart3,
            href: '/reports',
            roles: ['super_admin', 'admin'],
            feature: 'Reports & Analytics',
        },
        {
            id: 'reports-students',
            label: 'Students',
            icon: Users,
            href: '/reports?module=students',
            roles: ['super_admin', 'admin'],
            feature: 'Reports & Analytics',
        },
        {
            id: 'reports-attendance',
            label: 'Attendance',
            icon: CalendarCheck,
            href: '/reports?module=attendance',
            roles: ['super_admin', 'admin'],
            feature: 'Reports & Analytics',
        },
        {
            id: 'reports-fees',
            label: 'Fees',
            icon: IndianRupee,
            href: '/reports?module=fees',
            roles: ['super_admin', 'admin'],
            feature: 'Reports & Analytics',
        },
        {
            id: 'reports-exams',
            label: 'Exams',
            icon: FileText,
            href: '/reports?module=exams',
            roles: ['super_admin', 'admin'],
            feature: 'Reports & Analytics',
        },
        {
            id: 'reports-library',
            label: 'Library',
            icon: Book,
            href: '/reports?module=library',
            roles: ['super_admin', 'admin'],
            feature: 'Reports & Analytics',
        },
        {
            id: 'reports-transport',
            label: 'Transport',
            icon: BusFront,
            href: '/reports?module=transport',
            roles: ['super_admin', 'admin'],
            feature: 'Reports & Analytics',
        },
        {
            id: 'reports-hostel',
            label: 'Hostel',
            icon: BedDouble,
            href: '/reports?module=hostel',
            roles: ['super_admin', 'admin'],
            feature: 'Reports & Analytics',
        },
        {
            id: 'reports-inventory',
            label: 'Inventory',
            icon: Boxes,
            href: '/reports?module=inventory',
            roles: ['super_admin', 'admin'],
            feature: 'Reports & Analytics',
        },
        {
            id: 'reports-front-office',
            label: 'Front Office',
            icon: Briefcase,
            href: '/reports?module=front-office',
            roles: ['super_admin', 'admin'],
            feature: 'Reports & Analytics',
        },
        {
            id: 'reports-communication',
            label: 'Communication',
            icon: MessageSquare,
            href: '/reports?module=communication',
            roles: ['super_admin', 'admin'],
            feature: 'Reports & Analytics',
        },
        {
            id: 'reports-lesson-plan',
            label: 'Lesson Plan',
            icon: BookOpen,
            href: '/reports?module=lesson-plan',
            roles: ['super_admin', 'admin'],
            feature: 'Reports & Analytics',
        },
        {
            id: 'reports-human-resource',
            label: 'Human Resource',
            icon: UserCog,
            href: '/reports?module=human-resource',
            roles: ['super_admin', 'admin'],
            feature: 'Reports & Analytics',
        },
        {
            id: 'reports-homework',
            label: 'Homework',
            icon: ClipboardPenLine,
            href: '/reports?module=homework',
            roles: ['super_admin', 'admin'],
            feature: 'Reports & Analytics',
        },
        {
            id: 'reports-alumni',
            label: 'Alumni',
            icon: GraduationCap,
            href: '/reports?module=alumni',
            roles: ['super_admin', 'admin'],
            feature: 'Reports & Analytics',
        },
        {
            id: 'reports-activity-log',
            label: 'Activity Log',
            icon: ClipboardList,
            href: '/reports?module=activity-log',
            roles: ['super_admin', 'admin'],
            feature: 'Reports & Analytics',
        },
        {
            id: 'reports-audit-trail',
            label: 'Audit Trail',
            icon: ShieldCheck,
            href: '/reports?module=audit-trail',
            roles: ['super_admin', 'admin'],
            feature: 'Reports & Analytics',
        },
    ].filter((item) => canAccessItem(item.roles, item.feature));
    const hasReportMenu = reportMenuItems.length > 0;
    const menuItems = getMenuItems();

    return (
        <div className="h-full w-64 flex-col border-r border-[rgba(59,130,246,0.18)] bg-[radial-gradient(circle_at_top,#15283d_0%,#0b1623_58%,#09131f_100%)] text-[var(--sidebar-foreground)] shadow-[18px_0_40px_rgba(8,19,31,0.22)] flex">
            <div className="border-b border-[rgba(59,130,246,0.16)] p-6">
                <div className="flex items-center gap-3">
                    <div
                        className={`flex h-10 w-10 items-center justify-center overflow-hidden rounded-xl shadow-[0_16px_30px_rgba(59,130,246,0.28)] ${schoolLogo ? 'bg-white' : 'bg-[linear-gradient(135deg,#93c5fd,#3b82f6)]'}`}
                    >
                        {schoolLogo ? (
                            <img
                                src={schoolLogo}
                                alt={`${schoolName || 'School'} logo`}
                                className="max-h-full max-w-full object-contain p-1"
                            />
                        ) : (
                            <GraduationCap className="h-6 w-6 text-[#08131f]" />
                        )}
                    </div>
                    <div>
                        <h1 className="text-xl font-bold tracking-[0.02em] text-[var(--sidebar-foreground)]">
                            {schoolName || 'Gurukul'}
                        </h1>
                        <p className="text-xs uppercase tracking-[0.28em] text-[rgba(226,232,240,0.62)]">
                            {t('ERP System')}
                        </p>
                    </div>
                </div>
            </div>

            <div ref={sidebarScrollRef} className="flex-1 overflow-y-scroll">
                <div className="p-4 space-y-1">
                    {menuItems.map((item) => {
                        const Icon = item.icon;
                        const isActive = activeTab === item.id;

                        return (
                            <React.Fragment key={item.id}>
                                {item.id === 'certificates' && hasCertificateMenu ? (
                                    <div className="pt-1">
                                        <button
                                            type="button"
                                            className={`flex w-full items-center justify-between rounded-lg px-3 py-2 text-sm font-medium transition ${
                                                certificateTabs.includes(activeTab)
                                                    ? 'bg-[linear-gradient(135deg,rgba(59,130,246,0.24),rgba(59,130,246,0.14))] text-[#dbeafe] shadow-[inset_0_1px_0_rgba(255,255,255,0.05)]'
                                                    : 'text-[rgba(226,232,240,0.76)] hover:bg-[rgba(255,255,255,0.05)] hover:text-white'
                                            }`}
                                            onClick={() => setCertificatesOpen((current) => !current)}
                                        >
                                            <span className="flex items-center gap-3">
                                                <Award className="h-4 w-4" />
                                                {t('Certificates')}
                                            </span>
                                            {certificatesOpen ? (
                                                <ChevronDown className="h-4 w-4" />
                                            ) : (
                                                <ChevronRight className="h-4 w-4" />
                                            )}
                                        </button>

                                        {certificatesOpen && (
                                            <div className="mt-1 ml-4 space-y-1 border-l border-[rgba(59,130,246,0.14)] pl-3">
                                                {certificateMenuItems.map((certificateItem) => {
                                                    const CertificateIcon = certificateItem.icon;
                                                    const isCertificateActive = activeTab === certificateItem.id;

                                                    return (
                                                        <Button
                                                            key={certificateItem.id}
                                                            ref={isCertificateActive ? activeItemRef : undefined}
                                                            variant={isCertificateActive ? 'default' : 'ghost'}
                                                            className={`w-full justify-start ${
                                                                isCertificateActive
                                                                    ? 'border border-[rgba(59,130,246,0.42)] bg-[linear-gradient(135deg,#93c5fd,#3b82f6)] text-[#08131f] shadow-[0_14px_28px_rgba(59,130,246,0.22)] hover:bg-[linear-gradient(135deg,#93c5fd,#2563eb)]'
                                                                    : 'text-[rgba(226,232,240,0.76)] hover:bg-[rgba(255,255,255,0.05)] hover:text-white'
                                                            }`}
                                                            onClick={() => {
                                                                router.visit(certificateItem.href);
                                                                onNavigate?.();
                                                            }}
                                                        >
                                                            <CertificateIcon className="w-4 h-4 mr-3" />
                                                            {t(certificateItem.label)}
                                                        </Button>
                                                    );
                                                })}
                                            </div>
                                        )}
                                    </div>
                                ) : item.id === 'communication' && hasCommunicationMenu ? (
                                    <div className="pt-1">
                                        <button
                                            type="button"
                                            className={`flex w-full items-center justify-between rounded-lg px-3 py-2 text-sm font-medium transition ${
                                                communicationTabs.includes(activeTab)
                                                    ? 'bg-[linear-gradient(135deg,rgba(59,130,246,0.24),rgba(59,130,246,0.14))] text-[#dbeafe] shadow-[inset_0_1px_0_rgba(255,255,255,0.05)]'
                                                    : 'text-[rgba(226,232,240,0.76)] hover:bg-[rgba(255,255,255,0.05)] hover:text-white'
                                            }`}
                                            onClick={() => setCommunicationOpen((current) => !current)}
                                        >
                                            <span className="flex items-center gap-3">
                                                <MessageSquare className="h-4 w-4" />
                                                {t('Communication')}
                                            </span>
                                            {communicationOpen ? (
                                                <ChevronDown className="h-4 w-4" />
                                            ) : (
                                                <ChevronRight className="h-4 w-4" />
                                            )}
                                        </button>

                                        {communicationOpen && (
                                            <div className="mt-1 ml-4 space-y-1 border-l border-[rgba(59,130,246,0.14)] pl-3">
                                                {communicationMenuItems.map((communicationItem) => {
                                                    const CommunicationIcon = communicationItem.icon;
                                                    const isCommunicationActive = activeTab === communicationItem.id;

                                                    return (
                                                        <Button
                                                            key={communicationItem.id}
                                                            ref={isCommunicationActive ? activeItemRef : undefined}
                                                            variant={isCommunicationActive ? 'default' : 'ghost'}
                                                            className={`w-full justify-start ${
                                                                isCommunicationActive
                                                                    ? 'border border-[rgba(59,130,246,0.42)] bg-[linear-gradient(135deg,#93c5fd,#3b82f6)] text-[#08131f] shadow-[0_14px_28px_rgba(59,130,246,0.22)] hover:bg-[linear-gradient(135deg,#93c5fd,#2563eb)]'
                                                                    : 'text-[rgba(226,232,240,0.76)] hover:bg-[rgba(255,255,255,0.05)] hover:text-white'
                                                            }`}
                                                            onClick={() => {
                                                                router.visit(communicationItem.href);
                                                                onNavigate?.();
                                                            }}
                                                        >
                                                            <CommunicationIcon className="w-4 h-4 mr-3" />
                                                            {t(communicationItem.label)}
                                                        </Button>
                                                    );
                                                })}
                                            </div>
                                        )}
                                    </div>
                                ) : item.id === 'hr-menu' && hasHRMenu ? (
                                    <div className="pt-1">
                                        <button
                                            type="button"
                                            className={`flex w-full items-center justify-between rounded-lg px-3 py-2 text-sm font-medium transition ${
                                                hrTabs.includes(activeTab)
                                                    ? 'bg-[linear-gradient(135deg,rgba(59,130,246,0.24),rgba(59,130,246,0.14))] text-[#dbeafe] shadow-[inset_0_1px_0_rgba(255,255,255,0.05)]'
                                                    : 'text-[rgba(226,232,240,0.76)] hover:bg-[rgba(255,255,255,0.05)] hover:text-white'
                                            }`}
                                            onClick={() => setHrOpen((current) => !current)}
                                        >
                                            <span className="flex items-center gap-3">
                                                <UserCog className="h-4 w-4" />
                                                {t('Human Resource')}
                                            </span>
                                            {hrOpen ? (
                                                <ChevronDown className="h-4 w-4" />
                                            ) : (
                                                <ChevronRight className="h-4 w-4" />
                                            )}
                                        </button>

                                        {hrOpen && (
                                            <div className="mt-1 ml-4 space-y-1 border-l border-[rgba(59,130,246,0.14)] pl-3">
                                                {staffMenuItems.map((staffItem) => {
                                                    const StaffItemIcon = staffItem.icon;
                                                    const isStaffItemActive = activeTab === staffItem.id;

                                                    return (
                                                        <Button
                                                            key={staffItem.id}
                                                            ref={isStaffItemActive ? activeItemRef : undefined}
                                                            variant={isStaffItemActive ? 'default' : 'ghost'}
                                                            className={`w-full justify-start ${
                                                                isStaffItemActive
                                                                    ? 'border border-[rgba(59,130,246,0.42)] bg-[linear-gradient(135deg,#93c5fd,#3b82f6)] text-[#08131f] shadow-[0_14px_28px_rgba(59,130,246,0.22)] hover:bg-[linear-gradient(135deg,#93c5fd,#2563eb)]'
                                                                    : 'text-[rgba(226,232,240,0.76)] hover:bg-[rgba(255,255,255,0.05)] hover:text-white'
                                                            }`}
                                                            onClick={() => {
                                                                router.visit(staffItem.href);
                                                                onNavigate?.();
                                                            }}
                                                        >
                                                            <StaffItemIcon className="w-4 h-4 mr-3" />
                                                            {t(staffItem.label)}
                                                        </Button>
                                                    );
                                                })}
                                            </div>
                                        )}
                                    </div>
                                ) : item.id === 'hostel-menu' && hasHostelMenu ? (
                                    <div className="pt-1">
                                        <button
                                            type="button"
                                            className={`flex w-full items-center justify-between rounded-lg px-3 py-2 text-sm font-medium transition ${
                                                hostelTabs.includes(activeTab)
                                                    ? 'bg-[linear-gradient(135deg,rgba(59,130,246,0.24),rgba(59,130,246,0.14))] text-[#dbeafe] shadow-[inset_0_1px_0_rgba(255,255,255,0.05)]'
                                                    : 'text-[rgba(226,232,240,0.76)] hover:bg-[rgba(255,255,255,0.05)] hover:text-white'
                                            }`}
                                            onClick={() => setHostelOpen((current) => !current)}
                                        >
                                            <span className="flex items-center gap-3">
                                                <BedDouble className="h-4 w-4" />
                                                {t('Hostel')}
                                            </span>
                                            {hostelOpen ? (
                                                <ChevronDown className="h-4 w-4" />
                                            ) : (
                                                <ChevronRight className="h-4 w-4" />
                                            )}
                                        </button>

                                        {hostelOpen && (
                                            <div className="mt-1 ml-4 space-y-1 border-l border-[rgba(59,130,246,0.14)] pl-3">
                                                {hostelMenuItems.map((hostelItem) => {
                                                    const HostelItemIcon = hostelItem.icon;
                                                    const isHostelItemActive = activeTab === hostelItem.id;

                                                    return (
                                                        <Button
                                                            key={hostelItem.id}
                                                            ref={isHostelItemActive ? activeItemRef : undefined}
                                                            variant={isHostelItemActive ? 'default' : 'ghost'}
                                                            className={`w-full justify-start ${
                                                                isHostelItemActive
                                                                    ? 'border border-[rgba(59,130,246,0.42)] bg-[linear-gradient(135deg,#93c5fd,#3b82f6)] text-[#08131f] shadow-[0_14px_28px_rgba(59,130,246,0.22)] hover:bg-[linear-gradient(135deg,#93c5fd,#2563eb)]'
                                                                    : 'text-[rgba(226,232,240,0.76)] hover:bg-[rgba(255,255,255,0.05)] hover:text-white'
                                                            }`}
                                                            onClick={() => {
                                                                router.visit(hostelItem.href);
                                                                onNavigate?.();
                                                            }}
                                                        >
                                                            <HostelItemIcon className="w-4 h-4 mr-3" />
                                                            {t(hostelItem.label)}
                                                        </Button>
                                                    );
                                                })}
                                            </div>
                                        )}
                                    </div>
                                ) : item.id === 'transport-management' && hasTransportMenu ? (
                                    <div className="pt-1">
                                        <button
                                            type="button"
                                            className={`flex w-full items-center justify-between rounded-lg px-3 py-2 text-sm font-medium transition ${
                                                transportTabs.includes(activeTab)
                                                    ? 'bg-[linear-gradient(135deg,rgba(59,130,246,0.24),rgba(59,130,246,0.14))] text-[#dbeafe] shadow-[inset_0_1px_0_rgba(255,255,255,0.05)]'
                                                    : 'text-[rgba(226,232,240,0.76)] hover:bg-[rgba(255,255,255,0.05)] hover:text-white'
                                            }`}
                                            onClick={() => setTransportOpen((current) => !current)}
                                        >
                                            <span className="flex items-center gap-3">
                                                <BusFront className="h-4 w-4" />
                                                {t('Transport')}
                                            </span>
                                            {transportOpen ? (
                                                <ChevronDown className="h-4 w-4" />
                                            ) : (
                                                <ChevronRight className="h-4 w-4" />
                                            )}
                                        </button>

                                        {transportOpen && (
                                            <div className="mt-1 ml-4 space-y-1 border-l border-[rgba(59,130,246,0.14)] pl-3">
                                                {transportMenuItems.map((transportItem) => {
                                                    const TransportItemIcon = transportItem.icon;
                                                    const isTransportItemActive = activeTab === transportItem.id;

                                                    return (
                                                        <Button
                                                            key={transportItem.id}
                                                            ref={isTransportItemActive ? activeItemRef : undefined}
                                                            variant={isTransportItemActive ? 'default' : 'ghost'}
                                                            className={`w-full justify-start ${
                                                                isTransportItemActive
                                                                    ? 'border border-[rgba(59,130,246,0.42)] bg-[linear-gradient(135deg,#93c5fd,#3b82f6)] text-[#08131f] shadow-[0_14px_28px_rgba(59,130,246,0.22)] hover:bg-[linear-gradient(135deg,#93c5fd,#2563eb)]'
                                                                    : 'text-[rgba(226,232,240,0.76)] hover:bg-[rgba(255,255,255,0.05)] hover:text-white'
                                                            }`}
                                                            onClick={() => {
                                                                router.visit(transportItem.href);
                                                                onNavigate?.();
                                                            }}
                                                        >
                                                            <TransportItemIcon className="w-4 h-4 mr-3" />
                                                            {t(transportItem.label)}
                                                        </Button>
                                                    );
                                                })}
                                            </div>
                                        )}
                                    </div>
                                ) : item.id === 'website-cms' && hasWebsiteCmsMenu ? (
                                    <div className="pt-1">
                                        <button
                                            type="button"
                                            className={`flex w-full items-center justify-between rounded-lg px-3 py-2 text-sm font-medium transition ${
                                                websiteCmsTabs.includes(activeTab)
                                                    ? 'bg-[linear-gradient(135deg,rgba(59,130,246,0.24),rgba(59,130,246,0.14))] text-[#dbeafe] shadow-[inset_0_1px_0_rgba(255,255,255,0.05)]'
                                                    : 'text-[rgba(226,232,240,0.76)] hover:bg-[rgba(255,255,255,0.05)] hover:text-white'
                                            }`}
                                            onClick={() => setWebsiteCmsOpen((current) => !current)}
                                        >
                                            <span className="flex items-center gap-3">
                                                <Globe className="h-4 w-4" />
                                                {t('Website CMS')}
                                            </span>
                                            {websiteCmsOpen ? (
                                                <ChevronDown className="h-4 w-4" />
                                            ) : (
                                                <ChevronRight className="h-4 w-4" />
                                            )}
                                        </button>

                                        {websiteCmsOpen && (
                                            <div className="mt-1 ml-4 space-y-1 border-l border-[rgba(59,130,246,0.14)] pl-3">
                                                {websiteCmsMenuItems.map((cmsItem) => {
                                                    const CmsItemIcon = cmsItem.icon;
                                                    const isCmsItemActive = activeTab === cmsItem.id;

                                                    return (
                                                        <Button
                                                            key={cmsItem.id}
                                                            ref={isCmsItemActive ? activeItemRef : undefined}
                                                            variant={isCmsItemActive ? 'default' : 'ghost'}
                                                            className={`w-full justify-start ${
                                                                isCmsItemActive
                                                                    ? 'border border-[rgba(59,130,246,0.42)] bg-[linear-gradient(135deg,#93c5fd,#3b82f6)] text-[#08131f] shadow-[0_14px_28px_rgba(59,130,246,0.22)] hover:bg-[linear-gradient(135deg,#93c5fd,#2563eb)]'
                                                                    : 'text-[rgba(226,232,240,0.76)] hover:bg-[rgba(255,255,255,0.05)] hover:text-white'
                                                            }`}
                                                            onClick={() => {
                                                                router.visit(cmsItem.href);
                                                                onNavigate?.();
                                                            }}
                                                        >
                                                            <CmsItemIcon className="w-4 h-4 mr-3" />
                                                            {t(cmsItem.label)}
                                                        </Button>
                                                    );
                                                })}
                                            </div>
                                        )}
                                    </div>
                                ) : item.id === 'settings' && hasSettingsMenu ? (
                                    <div className="pt-1">
                                        <button
                                            type="button"
                                            className={`flex w-full items-center justify-between rounded-lg px-3 py-2 text-sm font-medium transition ${
                                                settingTabs.includes(activeTab)
                                                    ? 'bg-[linear-gradient(135deg,rgba(59,130,246,0.24),rgba(59,130,246,0.14))] text-[#dbeafe] shadow-[inset_0_1px_0_rgba(255,255,255,0.05)]'
                                                    : 'text-[rgba(226,232,240,0.76)] hover:bg-[rgba(255,255,255,0.05)] hover:text-white'
                                            }`}
                                            onClick={() => setSettingsOpen((current) => !current)}
                                        >
                                            <span className="flex items-center gap-3">
                                                <Settings className="h-4 w-4" />
                                                {t('Settings')}
                                            </span>
                                            {settingsOpen ? (
                                                <ChevronDown className="h-4 w-4" />
                                            ) : (
                                                <ChevronRight className="h-4 w-4" />
                                            )}
                                        </button>

                                        {settingsOpen && (
                                            <div className="mt-1 ml-4 space-y-1 border-l border-[rgba(59,130,246,0.14)] pl-3">
                                                {settingsMenuItems.map((settingsItem) => {
                                                    const SettingsItemIcon = settingsItem.icon;
                                                    const isSettingsItemActive = activeTab === settingsItem.id;

                                                    return (
                                                        <Button
                                                            key={settingsItem.id}
                                                            ref={isSettingsItemActive ? activeItemRef : undefined}
                                                            variant={isSettingsItemActive ? 'default' : 'ghost'}
                                                            className={`w-full justify-start ${
                                                                isSettingsItemActive
                                                                    ? 'border border-[rgba(59,130,246,0.42)] bg-[linear-gradient(135deg,#93c5fd,#3b82f6)] text-[#08131f] shadow-[0_14px_28px_rgba(59,130,246,0.22)] hover:bg-[linear-gradient(135deg,#93c5fd,#2563eb)]'
                                                                    : 'text-[rgba(226,232,240,0.76)] hover:bg-[rgba(255,255,255,0.05)] hover:text-white'
                                                            }`}
                                                            onClick={() => {
                                                                router.visit(settingsItem.href);
                                                                onNavigate?.();
                                                            }}
                                                        >
                                                            <SettingsItemIcon className="w-4 h-4 mr-3" />
                                                            {t(settingsItem.label)}
                                                        </Button>
                                                    );
                                                })}
                                            </div>
                                        )}
                                    </div>
                                ) : item.id === 'front-office-menu' && hasFrontOfficeMenu ? (
                                    <div className="pt-1">
                                        <button
                                            type="button"
                                            className={`flex w-full items-center justify-between rounded-lg px-3 py-2 text-sm font-medium transition ${
                                                frontOfficeTabs.includes(activeTab)
                                                    ? 'bg-[linear-gradient(135deg,rgba(59,130,246,0.24),rgba(59,130,246,0.14))] text-[#dbeafe] shadow-[inset_0_1px_0_rgba(255,255,255,0.05)]'
                                                    : 'text-[rgba(226,232,240,0.76)] hover:bg-[rgba(255,255,255,0.05)] hover:text-white'
                                            }`}
                                            onClick={() => setFrontOfficeOpen((current) => !current)}
                                        >
                                            <span className="flex items-center gap-3">
                                                <Briefcase className="h-4 w-4" />
                                                {t('Front Office')}
                                            </span>
                                            {frontOfficeOpen ? (
                                                <ChevronDown className="h-4 w-4" />
                                            ) : (
                                                <ChevronRight className="h-4 w-4" />
                                            )}
                                        </button>

                                        {frontOfficeOpen && (
                                            <div className="mt-1 ml-4 space-y-1 border-l border-[rgba(59,130,246,0.14)] pl-3">
                                                {frontOfficeMenuItems.map((frontOfficeItem) => {
                                                    const FrontOfficeIcon = frontOfficeItem.icon;
                                                    const isFrontOfficeActive = activeTab === frontOfficeItem.id;

                                                    return (
                                                        <Button
                                                            key={frontOfficeItem.id}
                                                            ref={isFrontOfficeActive ? activeItemRef : undefined}
                                                            variant={isFrontOfficeActive ? 'default' : 'ghost'}
                                                            className={`w-full justify-start ${
                                                                isFrontOfficeActive
                                                                    ? 'border border-[rgba(59,130,246,0.42)] bg-[linear-gradient(135deg,#93c5fd,#3b82f6)] text-[#08131f] shadow-[0_14px_28px_rgba(59,130,246,0.22)] hover:bg-[linear-gradient(135deg,#93c5fd,#2563eb)]'
                                                                    : 'text-[rgba(226,232,240,0.76)] hover:bg-[rgba(255,255,255,0.05)] hover:text-white'
                                                            }`}
                                                            onClick={() => {
                                                                router.visit(`/${frontOfficeItem.id}`);
                                                                onNavigate?.();
                                                            }}
                                                        >
                                                            <FrontOfficeIcon className="w-4 h-4 mr-3" />
                                                            {t(frontOfficeItem.label)}
                                                        </Button>
                                                    );
                                                })}
                                            </div>
                                        )}
                                    </div>
                                ) : item.id === 'students-menu' && hasStudentMenu ? (
                                    <div className="pt-1">
                                        <button
                                            type="button"
                                            className={`flex w-full items-center justify-between rounded-lg px-3 py-2 text-sm font-medium transition ${
                                                studentTabs.includes(activeTab)
                                                    ? 'bg-[linear-gradient(135deg,rgba(59,130,246,0.24),rgba(59,130,246,0.14))] text-[#dbeafe] shadow-[inset_0_1px_0_rgba(255,255,255,0.05)]'
                                                    : 'text-[rgba(226,232,240,0.76)] hover:bg-[rgba(255,255,255,0.05)] hover:text-white'
                                            }`}
                                            onClick={() => setStudentsOpen((current) => !current)}
                                        >
                                            <span className="flex items-center gap-3">
                                                <Users className="h-4 w-4" />
                                                {t('Students')}
                                            </span>
                                            {studentsOpen ? (
                                                <ChevronDown className="h-4 w-4" />
                                            ) : (
                                                <ChevronRight className="h-4 w-4" />
                                            )}
                                        </button>

                                        {studentsOpen && (
                                            <div className="mt-1 ml-4 space-y-1 border-l border-[rgba(59,130,246,0.14)] pl-3">
                                                {studentMenuItems.map((studentItem) => {
                                                    const StudentIcon = studentItem.icon;
                                                    const isStudentActive = activeTab === studentItem.id;

                                                    return (
                                                        <Button
                                                            key={studentItem.id}
                                                            ref={isStudentActive ? activeItemRef : undefined}
                                                            variant={isStudentActive ? 'default' : 'ghost'}
                                                            className={`w-full justify-start ${
                                                                isStudentActive
                                                                    ? 'border border-[rgba(59,130,246,0.42)] bg-[linear-gradient(135deg,#93c5fd,#3b82f6)] text-[#08131f] shadow-[0_14px_28px_rgba(59,130,246,0.22)] hover:bg-[linear-gradient(135deg,#93c5fd,#2563eb)]'
                                                                    : 'text-[rgba(226,232,240,0.76)] hover:bg-[rgba(255,255,255,0.05)] hover:text-white'
                                                            }`}
                                                            onClick={() => {
                                                                router.visit(studentItem.href);
                                                                onNavigate?.();
                                                            }}
                                                        >
                                                            <StudentIcon className="w-4 h-4 mr-3" />
                                                            {t(studentItem.label)}
                                                        </Button>
                                                    );
                                                })}
                                            </div>
                                        )}
                                    </div>
                                ) : item.id === 'exams-menu' && hasExamMenu ? (
                                    <div className="pt-1">
                                        <button
                                            type="button"
                                            className={`flex w-full items-center justify-between rounded-lg px-3 py-2 text-sm font-medium transition ${
                                                examTabs.includes(activeTab)
                                                    ? 'bg-[linear-gradient(135deg,rgba(59,130,246,0.24),rgba(59,130,246,0.14))] text-[#dbeafe] shadow-[inset_0_1px_0_rgba(255,255,255,0.05)]'
                                                    : 'text-[rgba(226,232,240,0.76)] hover:bg-[rgba(255,255,255,0.05)] hover:text-white'
                                            }`}
                                            onClick={() => setExamsOpen((current) => !current)}
                                        >
                                            <span className="flex items-center gap-3">
                                                <FileText className="h-4 w-4" />
                                                {t('Exams')}
                                            </span>
                                            {examsOpen ? (
                                                <ChevronDown className="h-4 w-4" />
                                            ) : (
                                                <ChevronRight className="h-4 w-4" />
                                            )}
                                        </button>

                                        {examsOpen && (
                                            <div className="mt-1 ml-4 space-y-1 border-l border-[rgba(59,130,246,0.14)] pl-3">
                                                {examMenuItems.map((examItem) => {
                                                    const ExamIcon = examItem.icon;
                                                    const isExamActive = activeTab === examItem.id;

                                                    return (
                                                        <Button
                                                            key={examItem.id}
                                                            ref={isExamActive ? activeItemRef : undefined}
                                                            variant={isExamActive ? 'default' : 'ghost'}
                                                            className={`w-full justify-start ${
                                                                isExamActive
                                                                    ? 'border border-[rgba(59,130,246,0.42)] bg-[linear-gradient(135deg,#93c5fd,#3b82f6)] text-[#08131f] shadow-[0_14px_28px_rgba(59,130,246,0.22)] hover:bg-[linear-gradient(135deg,#93c5fd,#2563eb)]'
                                                                    : 'text-[rgba(226,232,240,0.76)] hover:bg-[rgba(255,255,255,0.05)] hover:text-white'
                                                            }`}
                                                            onClick={() => {
                                                                router.visit(examItem.href);
                                                                onNavigate?.();
                                                            }}
                                                        >
                                                            <ExamIcon className="w-4 h-4 mr-3" />
                                                            {t(examItem.label)}
                                                        </Button>
                                                    );
                                                })}
                                            </div>
                                        )}
                                    </div>
                                ) : item.id === 'academics-menu' && hasAcademicMenu ? (
                                    <div className="pt-1">
                                        <button
                                            type="button"
                                            className={`flex w-full items-center justify-between rounded-lg px-3 py-2 text-sm font-medium transition ${
                                                academicTabs.includes(activeTab)
                                                    ? 'bg-[linear-gradient(135deg,rgba(59,130,246,0.24),rgba(59,130,246,0.14))] text-[#dbeafe] shadow-[inset_0_1px_0_rgba(255,255,255,0.05)]'
                                                    : 'text-[rgba(226,232,240,0.76)] hover:bg-[rgba(255,255,255,0.05)] hover:text-white'
                                            }`}
                                            onClick={() => setAcademicsOpen((current) => !current)}
                                        >
                                            <span className="flex items-center gap-3">
                                                <School className="h-4 w-4" />
                                                {t('Academics')}
                                            </span>
                                            {academicsOpen ? (
                                                <ChevronDown className="h-4 w-4" />
                                            ) : (
                                                <ChevronRight className="h-4 w-4" />
                                            )}
                                        </button>

                                        {academicsOpen && (
                                            <div className="mt-1 ml-4 space-y-1 border-l border-[rgba(59,130,246,0.14)] pl-3">
                                                {academicMenuItems.map((academicItem) => {
                                                    const AcademicIcon = academicItem.icon;
                                                    const isAcademicActive = activeTab === academicItem.id;

                                                    return (
                                                        <Button
                                                            key={academicItem.id}
                                                            ref={isAcademicActive ? activeItemRef : undefined}
                                                            variant={isAcademicActive ? 'default' : 'ghost'}
                                                            className={`w-full justify-start ${
                                                                isAcademicActive
                                                                    ? 'border border-[rgba(59,130,246,0.42)] bg-[linear-gradient(135deg,#93c5fd,#3b82f6)] text-[#08131f] shadow-[0_14px_28px_rgba(59,130,246,0.22)] hover:bg-[linear-gradient(135deg,#93c5fd,#2563eb)]'
                                                                    : 'text-[rgba(226,232,240,0.76)] hover:bg-[rgba(255,255,255,0.05)] hover:text-white'
                                                            }`}
                                                            onClick={() => {
                                                                router.visit(
                                                                    academicItem.href ?? `/${academicItem.id}`,
                                                                );
                                                                onNavigate?.();
                                                            }}
                                                        >
                                                            <AcademicIcon className="w-4 h-4 mr-3" />
                                                            {t(academicItem.label)}
                                                        </Button>
                                                    );
                                                })}
                                            </div>
                                        )}
                                    </div>
                                ) : item.id === 'reports' && hasReportMenu ? (
                                    <div className="pt-1">
                                        <button
                                            type="button"
                                            className={`flex w-full items-center justify-between rounded-lg px-3 py-2 text-sm font-medium transition ${
                                                reportTabs.includes(activeTab)
                                                    ? 'bg-[linear-gradient(135deg,rgba(59,130,246,0.24),rgba(59,130,246,0.14))] text-[#dbeafe] shadow-[inset_0_1px_0_rgba(255,255,255,0.05)]'
                                                    : 'text-[rgba(226,232,240,0.76)] hover:bg-[rgba(255,255,255,0.05)] hover:text-white'
                                            }`}
                                            onClick={() => setReportsOpen((current) => !current)}
                                        >
                                            <span className="flex items-center gap-3">
                                                <BarChart3 className="h-4 w-4" />
                                                {t('Reports Center')}
                                            </span>
                                            {reportsOpen ? (
                                                <ChevronDown className="h-4 w-4" />
                                            ) : (
                                                <ChevronRight className="h-4 w-4" />
                                            )}
                                        </button>

                                        {reportsOpen && (
                                            <div className="mt-1 ml-4 space-y-1 border-l border-[rgba(59,130,246,0.14)] pl-3">
                                                {reportMenuItems.map((reportItem) => {
                                                    const ReportIcon = reportItem.icon;
                                                    const isReportActive = activeTab === reportItem.id;

                                                    return (
                                                        <Button
                                                            key={reportItem.id}
                                                            ref={isReportActive ? activeItemRef : undefined}
                                                            variant={isReportActive ? 'default' : 'ghost'}
                                                            className={`w-full justify-start ${
                                                                isReportActive
                                                                    ? 'border border-[rgba(59,130,246,0.42)] bg-[linear-gradient(135deg,#93c5fd,#3b82f6)] text-[#08131f] shadow-[0_14px_28px_rgba(59,130,246,0.22)] hover:bg-[linear-gradient(135deg,#93c5fd,#2563eb)]'
                                                                    : 'text-[rgba(226,232,240,0.76)] hover:bg-[rgba(255,255,255,0.05)] hover:text-white'
                                                            }`}
                                                            onClick={() => {
                                                                router.visit(reportItem.href);
                                                                onNavigate?.();
                                                            }}
                                                        >
                                                            <ReportIcon className="w-4 h-4 mr-3" />
                                                            {t(reportItem.label)}
                                                        </Button>
                                                    );
                                                })}
                                            </div>
                                        )}
                                    </div>
                                ) : (
                                    <Button
                                        ref={isActive ? activeItemRef : undefined}
                                        variant={isActive ? 'default' : 'ghost'}
                                        className={`w-full justify-start ${
                                            isActive
                                                ? 'border border-[rgba(59,130,246,0.42)] bg-[linear-gradient(135deg,#93c5fd,#3b82f6)] text-[#08131f] shadow-[0_14px_28px_rgba(59,130,246,0.22)] hover:bg-[linear-gradient(135deg,#93c5fd,#2563eb)]'
                                                : 'text-[rgba(226,232,240,0.76)] hover:bg-[rgba(255,255,255,0.05)] hover:text-white'
                                        }`}
                                        onClick={() => {
                                            router.visit(item.href ?? `/${item.id}`);
                                            onNavigate?.();
                                        }}
                                    >
                                        <Icon className="w-4 h-4 mr-3" />
                                        {t(item.label)}
                                    </Button>
                                )}
                            </React.Fragment>
                        );
                    })}
                </div>
            </div>
        </div>
    );
}
