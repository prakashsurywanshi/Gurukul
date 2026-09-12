import { useLanguage } from '../../i18n/LanguageProvider';
import React, { useEffect, useMemo, useRef, useState } from 'react';
import { router, usePage } from '@inertiajs/react';
import type { RequestPayload } from '@inertiajs/core';
import { Card, CardContent, CardHeader, CardTitle } from '../ui/card';
import { Button } from '../ui/button';
import { Input } from '../ui/input';
import { Label } from '../ui/label';
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
import { Badge } from '../ui/badge';
import {
    AlignCenter,
    AlignLeft,
    AlignRight,
    Award,
    Bold,
    Download,
    Droplets,
    Edit,
    Eye,
    FileText,
    Italic,
    Move,
    Plus,
    Trash2,
    Type,
    Underline,
    Users,
    Undo2,
} from 'lucide-react';
import { toast } from 'sonner';
import { ScrollArea } from '../ui/scroll-area';
import { Checkbox } from '../ui/checkbox';
import DashboardLayout from '../DashboardLayout';
import { Textarea } from '../ui/textarea';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '../ui/tabs';
import { formatDate } from '../ui/utils';

interface CertificateManagementProps {
    user: any;
    schoolName: string;
    certificates: Certificate[];
    students: StudentRecord[];
    issuedCertificates: IssuedCertificateRecord[];
}

type TemplatePreset = 'red' | 'blue' | 'yellow' | 'green' | 'orange' | 'all';
type TextAlign = 'left' | 'center' | 'right';

interface TemplateElement {
    id: string;
    kind: 'text' | 'variable';
    label: string;
    content: string;
    x: number;
    y: number;
    width: number;
    fontSize: number;
    fontFamily: string;
    fontWeight: 'normal' | 'bold';
    fontStyle: 'normal' | 'italic';
    textDecoration: 'none' | 'underline';
    color: string;
    align: TextAlign;
}

interface WatermarkSettings {
    enabled: boolean;
    text: string;
    opacity: number;
    rotation: number;
    fontSize: number;
    color: string;
}

interface CertificateTemplateData {
    preset: TemplatePreset;
    elements: TemplateElement[];
    watermark: WatermarkSettings;
}

interface Certificate {
    id: string;
    title: string;
    type: string;
    description: string;
    createdAt: string;
    issuedTo: number;
    templateData: CertificateTemplateData;
}

interface StudentRecord {
    id: string;
    admission_no?: string | null;
    first_name: string;
    first_name_mr?: string | null;
    last_name: string;
    last_name_mr?: string | null;
    class?: string | null;
    section?: string | null;
}

interface IssuedCertificateRecord {
    id: string;
    certificateNumber: string;
    templateTitle: string;
    templateType?: string | null;
    studentId?: string | null;
    studentName: string;
    studentNameMr?: string | null;
    admissionNo?: string | null;
    class?: string | null;
    classMr?: string | null;
    section?: string | null;
    sectionMr?: string | null;
    reason?: string | null;
    reasonMr?: string | null;
    issueDate?: string | null;
    issuedBy?: string | null;
    issuedByDesignation?: string | null;
    templateData: CertificateTemplateData;
}

interface CanvasGuides {
    vertical: boolean;
    horizontal: boolean;
    peerLeft: number | null;
    peerCenter: number | null;
    peerRight: number | null;
    peerY: number | null;
}

const FONT_OPTIONS = [
    { label: 'Serif', value: 'Georgia, serif' },
    { label: 'Modern Sans', value: '"Trebuchet MS", sans-serif' },
    { label: 'Formal Sans', value: '"Gill Sans", sans-serif' },
    { label: 'Classic', value: '"Times New Roman", serif' },
];

const VARIABLE_OPTIONS = [
    { label: 'Student Name', value: '{{student_name}}' },
    { label: 'Admission Number', value: '{{admission_no}}' },
    { label: 'Class', value: '{{class}}' },
    { label: 'Section', value: '{{section}}' },
    { label: 'Achievement', value: '{{achievement}}' },
    { label: 'Issue Date', value: '{{issue_date}}' },
    { label: 'Issued By', value: '{{issued_by}}' },
    { label: 'School Name', value: '{{school_name}}' },
];

const PRESET_OPTIONS: Array<{ value: TemplatePreset; label: string }> = [
    { value: 'red', label: 'Red' },
    { value: 'blue', label: 'Blue' },
    { value: 'yellow', label: 'Yellow' },
    { value: 'green', label: 'Green' },
    { value: 'orange', label: 'Orange' },
    { value: 'all', label: 'All Colors' },
];

const getPresetTheme = (preset: TemplatePreset) => {
    switch (preset) {
        case 'blue':
            return {
                frameClass:
                    'border-[10px] border-double border-blue-700 bg-gradient-to-br from-white via-sky-50 to-blue-100 shadow-inner',
                titleColor: '#1d4ed8',
                bodyColor: '#334155',
                watermarkColor: '#1e3a8a',
                backgroundImage:
                    'linear-gradient(135deg, rgba(59,130,246,.08), transparent 45%), linear-gradient(315deg, rgba(37,99,235,.06), transparent 40%)',
                backgroundSize: '100% 100%',
            };
        case 'yellow':
            return {
                frameClass:
                    'border-[10px] border-double border-yellow-500 bg-gradient-to-br from-blue-50 via-yellow-50 to-white shadow-inner',
                titleColor: '#ca8a04',
                bodyColor: '#713f12',
                watermarkColor: '#a16207',
                backgroundImage:
                    'linear-gradient(135deg, rgba(234,179,8,.12), transparent 48%), radial-gradient(circle at top right, rgba(37,99,235,.08), transparent 35%)',
                backgroundSize: '100% 100%',
            };
        case 'green':
            return {
                frameClass: 'border-[14px] border-double border-emerald-800 bg-[#f8fafc] shadow-inner',
                titleColor: '#047857',
                bodyColor: '#365314',
                watermarkColor: '#065f46',
                backgroundImage:
                    'linear-gradient(90deg, rgba(5,150,105,.05), transparent 20%, rgba(132,204,22,.05) 80%)',
                backgroundSize: '100% 100%',
            };
        case 'orange':
            return {
                frameClass:
                    'border-[10px] border-double border-orange-600 bg-gradient-to-br from-orange-50 via-blue-50 to-white shadow-inner',
                titleColor: '#ea580c',
                bodyColor: '#1e3a5f',
                watermarkColor: '#1d4ed8',
                backgroundImage: 'radial-gradient(circle at 18px 18px, rgba(234,88,12,.10) 1px, transparent 0)',
                backgroundSize: '36px 36px',
            };
        case 'all':
            return {
                frameClass:
                    'border-[12px] border-double border-fuchsia-700 bg-gradient-to-br from-rose-50 via-blue-50 to-sky-50 shadow-inner',
                titleColor: '#be185d',
                bodyColor: '#334155',
                watermarkColor: '#7c3aed',
                backgroundImage:
                    'linear-gradient(120deg, rgba(239,68,68,.08), rgba(37,99,235,.08), rgba(234,179,8,.08), rgba(34,197,94,.08), rgba(59,130,246,.08))',
                backgroundSize: '100% 100%',
            };
        case 'red':
        default:
            return {
                frameClass: 'border-[10px] border-double border-red-700 bg-[#fff7f7] shadow-inner',
                titleColor: '#b91c1c',
                bodyColor: '#475569',
                watermarkColor: '#7f1d1d',
                backgroundImage: 'radial-gradient(circle at 18px 18px, rgba(185,28,28,.09) 1px, transparent 0)',
                backgroundSize: '36px 36px',
            };
    }
};

const createId = () => `${Date.now()}_${Math.random().toString(36).slice(2, 8)}`;

const createDefaultTemplateData = (schoolName: string, preset: TemplatePreset = 'all'): CertificateTemplateData => {
    const theme = getPresetTheme(preset);

    return {
        preset,
        watermark: {
            enabled: true,
            text: schoolName,
            opacity: 0.08,
            rotation: -24,
            fontSize: 72,
            color: theme.watermarkColor,
        },
        elements: [
            {
                id: createId(),
                kind: 'variable',
                label: 'School Name',
                content: '{{school_name}}',
                x: 120,
                y: 54,
                width: 560,
                fontSize: 34,
                fontFamily: 'Georgia, serif',
                fontWeight: 'bold',
                fontStyle: 'normal',
                textDecoration: 'none',
                color: '#111827',
                align: 'center',
            },
            {
                id: createId(),
                kind: 'text',
                label: 'Certificate Title',
                content: 'Certificate of Achievement',
                x: 150,
                y: 142,
                width: 500,
                fontSize: 28,
                fontFamily: 'Georgia, serif',
                fontWeight: 'bold',
                fontStyle: 'normal',
                textDecoration: 'none',
                color: theme.titleColor,
                align: 'center',
            },
            {
                id: createId(),
                kind: 'text',
                label: 'Presented Text',
                content: 'This certificate is proudly presented to',
                x: 170,
                y: 220,
                width: 460,
                fontSize: 17,
                fontFamily: '"Trebuchet MS", sans-serif',
                fontWeight: 'normal',
                fontStyle: 'normal',
                textDecoration: 'none',
                color: theme.bodyColor,
                align: 'center',
            },
            {
                id: createId(),
                kind: 'variable',
                label: 'Student Name',
                content: '{{student_name}}',
                x: 130,
                y: 274,
                width: 540,
                fontSize: 36,
                fontFamily: 'Georgia, serif',
                fontWeight: 'bold',
                fontStyle: 'normal',
                textDecoration: 'underline',
                color: '#111827',
                align: 'center',
            },
            {
                id: createId(),
                kind: 'variable',
                label: 'Achievement',
                content: '{{achievement}}',
                x: 110,
                y: 352,
                width: 580,
                fontSize: 18,
                fontFamily: '"Trebuchet MS", sans-serif',
                fontWeight: 'normal',
                fontStyle: 'italic',
                textDecoration: 'none',
                color: theme.bodyColor,
                align: 'center',
            },
            {
                id: createId(),
                kind: 'text',
                label: 'Footer Left',
                content: 'Principal',
                x: 88,
                y: 500,
                width: 160,
                fontSize: 16,
                fontFamily: '"Trebuchet MS", sans-serif',
                fontWeight: 'bold',
                fontStyle: 'normal',
                textDecoration: 'none',
                color: '#111827',
                align: 'center',
            },
            {
                id: createId(),
                kind: 'variable',
                label: 'Issue Date',
                content: '{{issue_date}}',
                x: 548,
                y: 500,
                width: 160,
                fontSize: 16,
                fontFamily: '"Trebuchet MS", sans-serif',
                fontWeight: 'bold',
                fontStyle: 'normal',
                textDecoration: 'none',
                color: '#111827',
                align: 'center',
            },
        ],
    };
};

const cloneTemplateData = (data: CertificateTemplateData): CertificateTemplateData => ({
    ...data,
    elements: data.elements.map((element) => ({ ...element })),
    watermark: { ...data.watermark },
});

const getPresetClasses = (preset: TemplatePreset) => {
    return getPresetTheme(preset).frameClass;
};

const getVariableValue = (content: string, values: Record<string, string>) => {
    const match = VARIABLE_OPTIONS.find((item) => item.value === content);
    if (!match) return content;
    return values[content] || content;
};

const formatIssueDate = (value: string) => {
    return formatDate(value, '');
};

const formatDisplayDate = (value?: string | null) => {
    return formatDate(value, 'N/A');
};

const escapeHtml = (value: string) =>
    value
        .replace(/&/g, '&amp;')
        .replace(/</g, '&lt;')
        .replace(/>/g, '&gt;')
        .replace(/"/g, '&quot;')
        .replace(/'/g, '&#39;');

const getStudentFullName = (student: StudentRecord) =>
    [student.first_name, student.last_name].filter(Boolean).join(' ').trim();

export default function CertificateManagement({
    user,
    schoolName,
    certificates,
    students,
    issuedCertificates,
}: CertificateManagementProps) {
    const { t } = useLanguage();
    const page = usePage<{
        flash?: { success?: string; error?: string };
        errors?: Record<string, string>;
    }>();
    const flash = page.props.flash ?? {};
    const { languageSettings } = usePage().props as any;
    const dualLanguageEnabled = Boolean(languageSettings?.dual_language_enabled);
    const regionalLanguage = languageSettings?.regional_language ?? 'mr';
    const defaultPreviewStudent = students[0] ?? null;
    const [selectedStudents, setSelectedStudents] = useState<string[]>([]);
    const [selectedCertificate, setSelectedCertificate] = useState<Certificate | null>(null);
    const [showBulkIssueDialog, setShowBulkIssueDialog] = useState(false);
    const [isEditorOpen, setIsEditorOpen] = useState(false);
    const [editingCertificateId, setEditingCertificateId] = useState<string | null>(null);
    const [activeVariable, setActiveVariable] = useState('{{student_name}}');
    const [selectedElementId, setSelectedElementId] = useState<string | null>(null);
    const canvasRef = useRef<HTMLDivElement>(null);
    const previewSectionRef = useRef<HTMLDivElement>(null);
    const editorSectionRef = useRef<HTMLDivElement>(null);
    const dragState = useRef<{
        id: string;
        offsetX: number;
        offsetY: number;
    } | null>(null);
    const historyRef = useRef<CertificateTemplateData[]>([]);
    const historyIndexRef = useRef(-1);

    const [formData, setFormData] = useState({
        title: '',
        type: 'merit',
        description: '',
        previewStudentId: defaultPreviewStudent?.id ?? '',
        studentName: defaultPreviewStudent ? getStudentFullName(defaultPreviewStudent) : '',
        admissionNo: defaultPreviewStudent?.admission_no ?? '',
        className: defaultPreviewStudent?.class ?? '',
        section: defaultPreviewStudent?.section ?? '',
        reason: '',
        date: new Date().toISOString().split('T')[0],
        issuedBy: user?.name || 'Principal',
        schoolName,
    });

    const [bulkIssueForm, setBulkIssueForm] = useState({
        certificateType: '',
        class: 'all',
        section: 'all',
        reason: '',
        reasonMr: '',
        date: new Date().toISOString().split('T')[0],
    });

    const [printLanguage, setPrintLanguage] = useState<'en' | 'mr'>('en');

    const localizedStudentName = (student?: StudentRecord | null, language: 'en' | 'mr' = printLanguage) => {
        if (!student) return '';
        if (language === 'mr' && (student.first_name_mr || student.last_name_mr)) {
            return (
                [student.first_name_mr, student.last_name_mr].filter(Boolean).join(' ').trim() ||
                getStudentFullName(student)
            );
        }
        return getStudentFullName(student);
    };

    const [templateData, setTemplateData] = useState<CertificateTemplateData>(() =>
        createDefaultTemplateData(schoolName),
    );
    const [canvasSize, setCanvasSize] = useState({ width: 820, height: 600 });
    const [canvasGuides, setCanvasGuides] = useState<CanvasGuides>({
        vertical: false,
        horizontal: false,
        peerLeft: null,
        peerCenter: null,
        peerRight: null,
        peerY: null,
    });

    const pushHistorySnapshot = (snapshot: CertificateTemplateData) => {
        const clonedSnapshot = cloneTemplateData(snapshot);
        const trimmedHistory = historyRef.current.slice(0, historyIndexRef.current + 1);
        trimmedHistory.push(clonedSnapshot);
        historyRef.current = trimmedHistory;
        historyIndexRef.current = trimmedHistory.length - 1;
    };

    const applyTemplateMutation = (
        updater: (current: CertificateTemplateData) => CertificateTemplateData,
        options?: { snapshotBefore?: boolean },
    ) => {
        setTemplateData((current) => {
            if (options?.snapshotBefore !== false) {
                pushHistorySnapshot(current);
            }

            return updater(current);
        });
    };

    const undoTemplateChange = () => {
        if (historyIndexRef.current < 0) {
            toast.info('Nothing to undo');
            return;
        }

        const previousSnapshot = historyRef.current[historyIndexRef.current];
        historyRef.current = historyRef.current.slice(0, historyIndexRef.current);
        historyIndexRef.current -= 1;
        setTemplateData(cloneTemplateData(previousSnapshot));
        setCanvasGuides({
            vertical: false,
            horizontal: false,
            peerLeft: null,
            peerCenter: null,
            peerRight: null,
            peerY: null,
        });
    };

    useEffect(() => {
        if (flash.success) {
            toast.success(flash.success);
        }

        if (flash.error) {
            toast.error(flash.error);
        }
    }, [flash.error, flash.success]);

    useEffect(() => {
        if (!canvasRef.current || typeof ResizeObserver === 'undefined') return;

        const updateCanvasSize = () => {
            if (!canvasRef.current) return;
            setCanvasSize({
                width: canvasRef.current.clientWidth,
                height: canvasRef.current.clientHeight,
            });
        };

        updateCanvasSize();

        const observer = new ResizeObserver(() => {
            updateCanvasSize();
        });

        observer.observe(canvasRef.current);

        return () => observer.disconnect();
    }, [isEditorOpen]);

    useEffect(() => {
        const handleMouseMove = (event: MouseEvent) => {
            if (!dragState.current || !canvasRef.current) return;

            const canvasRect = canvasRef.current.getBoundingClientRect();
            const nextX = event.clientX - canvasRect.left - dragState.current.offsetX;
            const nextY = event.clientY - canvasRect.top - dragState.current.offsetY;
            let nextGuides: CanvasGuides = {
                vertical: false,
                horizontal: false,
                peerLeft: null,
                peerCenter: null,
                peerRight: null,
                peerY: null,
            };

            setTemplateData((current) => ({
                ...current,
                elements: current.elements.map((element) => {
                    if (element.id !== dragState.current?.id) return element;

                    const maxX = Math.max(0, canvasSize.width - element.width);
                    const maxY = Math.max(0, canvasSize.height - element.fontSize - 16);
                    let boundedX = Math.max(0, Math.min(nextX, maxX));
                    let boundedY = Math.max(0, Math.min(nextY, maxY));

                    const elementCenterX = boundedX + element.width / 2;
                    const elementCenterY = boundedY + element.fontSize / 2;
                    const canvasCenterX = canvasSize.width / 2;
                    const canvasCenterY = canvasSize.height / 2;
                    const verticalAligned = Math.abs(elementCenterX - canvasCenterX) <= 8;
                    const horizontalAligned = Math.abs(elementCenterY - canvasCenterY) <= 8;
                    const peerElement = current.elements.find((peer) => {
                        if (peer.id === element.id) return false;

                        const peerCenterX = peer.x + peer.width / 2;
                        const peerCenterY = peer.y + peer.fontSize / 2;
                        const sameRow = Math.abs(elementCenterY - peerCenterY) <= 10;
                        const sameStart = Math.abs(boundedX - peer.x) <= 8;
                        const sameMiddle = Math.abs(elementCenterX - peerCenterX) <= 8;
                        const sameEnd = Math.abs(boundedX + element.width - (peer.x + peer.width)) <= 8;

                        return sameRow && (sameStart || sameMiddle || sameEnd);
                    });

                    if (peerElement) {
                        const peerCenterX = peerElement.x + peerElement.width / 2;
                        const sameStart = Math.abs(boundedX - peerElement.x) <= 8;
                        const sameMiddle = Math.abs(elementCenterX - peerCenterX) <= 8;
                        const sameEnd = Math.abs(boundedX + element.width - (peerElement.x + peerElement.width)) <= 8;

                        if (sameStart) {
                            boundedX = peerElement.x;
                        } else if (sameMiddle) {
                            boundedX = peerCenterX - element.width / 2;
                        } else if (sameEnd) {
                            boundedX = peerElement.x + peerElement.width - element.width;
                        }

                        nextGuides = {
                            ...nextGuides,
                            peerLeft: sameStart ? peerElement.x : null,
                            peerCenter: sameMiddle ? peerCenterX : null,
                            peerRight: sameEnd ? peerElement.x + peerElement.width : null,
                            peerY: peerElement.y + peerElement.fontSize / 2,
                        };
                    }

                    if (verticalAligned) {
                        boundedX = canvasCenterX - element.width / 2;
                    }

                    if (horizontalAligned) {
                        boundedY = canvasCenterY - element.fontSize / 2;
                    }

                    nextGuides = {
                        ...nextGuides,
                        vertical: verticalAligned,
                        horizontal: horizontalAligned,
                    };

                    return {
                        ...element,
                        x: boundedX,
                        y: boundedY,
                    };
                }),
            }));
            setCanvasGuides(nextGuides);
        };

        const handleMouseUp = () => {
            dragState.current = null;
            setCanvasGuides({
                vertical: false,
                horizontal: false,
                peerLeft: null,
                peerCenter: null,
                peerRight: null,
                peerY: null,
            });
        };

        window.addEventListener('mousemove', handleMouseMove);
        window.addEventListener('mouseup', handleMouseUp);

        return () => {
            window.removeEventListener('mousemove', handleMouseMove);
            window.removeEventListener('mouseup', handleMouseUp);
        };
    }, []);

    useEffect(() => {
        const handleKeyDown = (event: KeyboardEvent) => {
            if (!isEditorOpen) return;

            const target = event.target as HTMLElement | null;
            const tagName = target?.tagName?.toLowerCase();
            const isTypingTarget =
                tagName === 'input' || tagName === 'textarea' || tagName === 'select' || target?.isContentEditable;

            if ((event.ctrlKey || event.metaKey) && event.key.toLowerCase() === 'z' && !isTypingTarget) {
                event.preventDefault();
                undoTemplateChange();
            }
        };

        window.addEventListener('keydown', handleKeyDown);

        return () => window.removeEventListener('keydown', handleKeyDown);
    }, [isEditorOpen]);

    const variableValues = useMemo(
        () => ({
            '{{student_name}}':
                localizedStudentName(
                    students.find((student) => student.id === formData.previewStudentId) ?? null,
                    printLanguage,
                ) ||
                formData.studentName ||
                'Student Name',
            '{{admission_no}}': formData.admissionNo || 'Admission No',
            '{{class}}': formData.className || 'Class',
            '{{section}}': formData.section || 'Section',
            '{{achievement}}': formData.reason || 'Achievement text',
            '{{issue_date}}': formatIssueDate(formData.date) || 'Issue Date',
            '{{issued_by}}': formData.issuedBy || 'Issued By',
            '{{school_name}}': formData.schoolName || schoolName,
        }),
        [formData, schoolName, students, printLanguage],
    );

    const availableClassOptions = useMemo(() => {
        const dynamicOptions = students
            .map((student) => student.class?.trim())
            .filter((value): value is string => Boolean(value));

        return Array.from(new Set(dynamicOptions)).sort((left, right) =>
            left.localeCompare(right, undefined, {
                numeric: true,
                sensitivity: 'base',
            }),
        );
    }, [students]);

    const availableSectionOptions = useMemo(() => {
        const dynamicOptions = students
            .filter((student) => !formData.className || student.class === formData.className)
            .map((student) => student.section?.trim())
            .filter((value): value is string => Boolean(value));

        return Array.from(new Set(dynamicOptions)).sort((left, right) =>
            left.localeCompare(right, undefined, {
                numeric: true,
                sensitivity: 'base',
            }),
        );
    }, [formData.className, students]);

    const bulkSectionOptions = useMemo(() => {
        const dynamicOptions = students
            .filter((student) => bulkIssueForm.class === 'all' || student.class === bulkIssueForm.class)
            .map((student) => student.section?.trim())
            .filter((value): value is string => Boolean(value));

        return Array.from(new Set(dynamicOptions)).sort((left, right) =>
            left.localeCompare(right, undefined, {
                numeric: true,
                sensitivity: 'base',
            }),
        );
    }, [bulkIssueForm.class, students]);

    const filteredStudentsForBulk = useMemo(
        () =>
            students.filter((student) => {
                if (bulkIssueForm.class !== 'all' && student.class !== bulkIssueForm.class) return false;
                if (bulkIssueForm.section !== 'all' && student.section !== bulkIssueForm.section) return false;
                return true;
            }),
        [bulkIssueForm.class, bulkIssueForm.section, students],
    );

    useEffect(() => {
        if (!formData.previewStudentId && defaultPreviewStudent) {
            setFormData((current) => ({
                ...current,
                previewStudentId: defaultPreviewStudent.id,
                studentName: getStudentFullName(defaultPreviewStudent),
                admissionNo: defaultPreviewStudent.admission_no ?? '',
                className: defaultPreviewStudent.class ?? '',
                section: defaultPreviewStudent.section ?? '',
            }));
        }
    }, [defaultPreviewStudent, formData.previewStudentId]);

    useEffect(() => {
        if (!formData.className) return;

        if (formData.section && !availableSectionOptions.includes(formData.section)) {
            setFormData((current) => ({
                ...current,
                section: availableSectionOptions[0] ?? '',
            }));
        }
    }, [availableSectionOptions, formData.className, formData.section]);

    useEffect(() => {
        if (bulkIssueForm.section !== 'all' && !bulkSectionOptions.includes(bulkIssueForm.section)) {
            setBulkIssueForm((current) => ({ ...current, section: 'all' }));
        }
    }, [bulkIssueForm.section, bulkSectionOptions]);

    useEffect(() => {
        const filteredStudentIds = new Set(filteredStudentsForBulk.map((student) => student.id));

        setSelectedStudents((current) => current.filter((id) => filteredStudentIds.has(id)));
    }, [filteredStudentsForBulk]);

    const selectedElement = templateData.elements.find((element) => element.id === selectedElementId) || null;

    const openCreateEditor = () => {
        historyRef.current = [];
        historyIndexRef.current = -1;
        setCanvasGuides({
            vertical: false,
            horizontal: false,
            peerLeft: null,
            peerCenter: null,
            peerRight: null,
            peerY: null,
        });
        setEditingCertificateId(null);
        setSelectedElementId(null);
        setFormData((current) => ({
            ...current,
            title: '',
            type: 'merit',
            description: '',
            previewStudentId: defaultPreviewStudent?.id ?? '',
            studentName: defaultPreviewStudent ? getStudentFullName(defaultPreviewStudent) : '',
            admissionNo: defaultPreviewStudent?.admission_no ?? '',
            className: defaultPreviewStudent?.class ?? '',
            section: defaultPreviewStudent?.section ?? '',
            reason: '',
            schoolName,
        }));
        setTemplateData(createDefaultTemplateData(schoolName));
        setIsEditorOpen(true);
    };

    const openEditEditor = (certificate: Certificate) => {
        historyRef.current = [];
        historyIndexRef.current = -1;
        setCanvasGuides({
            vertical: false,
            horizontal: false,
            peerLeft: null,
            peerCenter: null,
            peerRight: null,
            peerY: null,
        });
        setEditingCertificateId(certificate.id);
        setSelectedElementId(certificate.templateData.elements[0]?.id || null);
        setFormData((current) => ({
            ...current,
            title: certificate.title,
            type: certificate.type,
            description: certificate.description,
            previewStudentId: defaultPreviewStudent?.id ?? '',
            studentName: defaultPreviewStudent ? getStudentFullName(defaultPreviewStudent) : '',
            admissionNo: defaultPreviewStudent?.admission_no ?? '',
            className: defaultPreviewStudent?.class ?? '',
            section: defaultPreviewStudent?.section ?? '',
            schoolName,
        }));
        setTemplateData({
            ...certificate.templateData,
            elements: certificate.templateData.elements.map((element) => ({
                ...element,
            })),
            watermark: { ...certificate.templateData.watermark },
        });
        setIsEditorOpen(true);
    };

    const resetEditor = () => {
        historyRef.current = [];
        historyIndexRef.current = -1;
        setCanvasGuides({
            vertical: false,
            horizontal: false,
            peerLeft: null,
            peerCenter: null,
            peerRight: null,
            peerY: null,
        });
        setIsEditorOpen(false);
        setEditingCertificateId(null);
        setSelectedElementId(null);
        setTemplateData(createDefaultTemplateData(schoolName));
        setFormData((current) => ({
            ...current,
            title: '',
            type: 'merit',
            description: '',
            previewStudentId: defaultPreviewStudent?.id ?? '',
            studentName: defaultPreviewStudent ? getStudentFullName(defaultPreviewStudent) : '',
            admissionNo: defaultPreviewStudent?.admission_no ?? '',
            className: defaultPreviewStudent?.class ?? '',
            section: defaultPreviewStudent?.section ?? '',
            reason: '',
            schoolName,
        }));
    };

    const handleInputChange = (field: string, value: string) => {
        setFormData((current) => ({ ...current, [field]: value }));
    };

    const handlePreviewStudentChange = (studentId: string) => {
        const student = students.find((item) => item.id === studentId);

        if (!student) {
            setFormData((current) => ({
                ...current,
                previewStudentId: '',
                studentName: '',
                admissionNo: '',
                className: '',
                section: '',
            }));
            return;
        }

        setFormData((current) => ({
            ...current,
            previewStudentId: student.id,
            studentName: getStudentFullName(student),
            admissionNo: student.admission_no ?? '',
            className: student.class ?? '',
            section: student.section ?? '',
        }));
    };

    const saveTemplate = () => {
        if (!formData.title.trim()) {
            toast.error('Certificate title is required');
            return;
        }

        if (templateData.elements.length === 0) {
            toast.error('Add at least one text or variable element');
            return;
        }

        const payload = {
            title: formData.title,
            type: formData.type,
            description: formData.description,
            template_data: templateData,
        };

        if (editingCertificateId) {
            router.patch(`/certificates/templates/${editingCertificateId}`, payload as unknown as RequestPayload, {
                preserveScroll: true,
                onSuccess: () => {
                    resetEditor();
                },
            });
        } else {
            router.post('/certificates/templates', payload as unknown as RequestPayload, {
                preserveScroll: true,
                onSuccess: () => {
                    resetEditor();
                },
            });
        }
    };

    const deleteCertificate = (id: string) => {
        if (!window.confirm('Delete this certificate template?')) {
            return;
        }

        router.delete(`/certificates/templates/${id}`, {
            preserveScroll: true,
        });
    };

    const deleteIssuedCertificate = (id: string) => {
        if (!window.confirm('Delete this issued certificate record?')) {
            return;
        }

        router.delete(`/certificates/issued/${id}`, {
            preserveScroll: true,
        });
    };

    const addTextElement = () => {
        const nextElement: TemplateElement = {
            id: createId(),
            kind: 'text',
            label: `Text ${templateData.elements.length + 1}`,
            content: 'New text block',
            x: 120,
            y: 120 + templateData.elements.length * 24,
            width: 260,
            fontSize: 20,
            fontFamily: '"Trebuchet MS", sans-serif',
            fontWeight: 'normal',
            fontStyle: 'normal',
            textDecoration: 'none',
            color: '#111827',
            align: 'left',
        };

        applyTemplateMutation((current) => ({
            ...current,
            elements: [...current.elements, nextElement],
        }));
        setSelectedElementId(nextElement.id);
    };

    const addVariableElement = () => {
        const variable = VARIABLE_OPTIONS.find((item) => item.value === activeVariable);
        if (!variable) return;

        const nextElement: TemplateElement = {
            id: createId(),
            kind: 'variable',
            label: variable.label,
            content: variable.value,
            x: 120,
            y: 140 + templateData.elements.length * 24,
            width: 280,
            fontSize: 22,
            fontFamily: 'Georgia, serif',
            fontWeight: 'bold',
            fontStyle: 'normal',
            textDecoration: 'none',
            color: '#111827',
            align: 'left',
        };

        applyTemplateMutation((current) => ({
            ...current,
            elements: [...current.elements, nextElement],
        }));
        setSelectedElementId(nextElement.id);
    };

    const updateSelectedElement = (patch: Partial<TemplateElement>) => {
        if (!selectedElementId) return;

        applyTemplateMutation((current) => ({
            ...current,
            elements: current.elements.map((element) =>
                element.id === selectedElementId ? { ...element, ...patch } : element,
            ),
        }));
    };

    const removeSelectedElement = () => {
        if (!selectedElementId) return;

        const remainingElements = templateData.elements.filter((element) => element.id !== selectedElementId);
        applyTemplateMutation((current) => ({
            ...current,
            elements: remainingElements,
        }));
        setSelectedElementId(remainingElements[0]?.id || null);
    };

    const startDragging = (event: React.MouseEvent<HTMLDivElement>, element: TemplateElement) => {
        if (!canvasRef.current) return;
        pushHistorySnapshot(templateData);
        const canvasRect = canvasRef.current.getBoundingClientRect();
        dragState.current = {
            id: element.id,
            offsetX: event.clientX - canvasRect.left - element.x,
            offsetY: event.clientY - canvasRect.top - element.y,
        };
        setSelectedElementId(element.id);
    };

    const openPreview = (certificate: Certificate) => {
        setSelectedCertificate(certificate);
    };

    const openIssuedPreview = (issuedCertificate: IssuedCertificateRecord) => {
        setFormData((current) => ({
            ...current,
            studentName:
                printLanguage === 'mr' && issuedCertificate.studentNameMr
                    ? issuedCertificate.studentNameMr
                    : issuedCertificate.studentName || current.studentName,
            admissionNo: issuedCertificate.admissionNo || '',
            className:
                printLanguage === 'mr' && issuedCertificate.classMr
                    ? issuedCertificate.classMr
                    : issuedCertificate.class || '',
            section:
                printLanguage === 'mr' && issuedCertificate.sectionMr
                    ? issuedCertificate.sectionMr
                    : issuedCertificate.section || '',
            reason:
                printLanguage === 'mr' && issuedCertificate.reasonMr
                    ? issuedCertificate.reasonMr
                    : issuedCertificate.reason || '',
            date: issuedCertificate.issueDate || current.date,
            issuedBy: issuedCertificate.issuedBy || current.issuedBy,
            schoolName,
        }));

        setSelectedCertificate({
            id: issuedCertificate.id,
            title: issuedCertificate.templateTitle,
            type: issuedCertificate.templateType || 'achievement',
            description: issuedCertificate.reason || '',
            createdAt: issuedCertificate.issueDate || new Date().toISOString().split('T')[0],
            issuedTo: 1,
            templateData: issuedCertificate.templateData,
        });
    };

    useEffect(() => {
        if (!selectedCertificate || !previewSectionRef.current) return;

        previewSectionRef.current.scrollIntoView({
            behavior: 'smooth',
            block: 'start',
        });
    }, [selectedCertificate]);

    useEffect(() => {
        if (!isEditorOpen || !editorSectionRef.current) return;

        editorSectionRef.current.scrollIntoView({
            behavior: 'smooth',
            block: 'start',
        });
    }, [isEditorOpen, editingCertificateId]);

    const handleDownloadCertificate = () => {
        if (!selectedCertificate) {
            toast.error('Select a certificate to download');
            return;
        }

        const theme = getPresetTheme(selectedCertificate.templateData.preset);
        const renderedElements = selectedCertificate.templateData.elements
            .map((element) => {
                const value = getVariableValue(element.content, variableValues);

                return `
          <div style="
            position:absolute;
            left:${element.x}px;
            top:${element.y}px;
            width:${element.width}px;
            font-size:${element.fontSize}px;
            font-family:${element.fontFamily};
            font-weight:${element.fontWeight};
            font-style:${element.fontStyle};
            text-decoration:${element.textDecoration};
            color:${element.color};
            text-align:${element.align};
            line-height:1.25;
          ">${escapeHtml(value)}</div>
        `;
            })
            .join('');

        const watermark = selectedCertificate.templateData.watermark.enabled
            ? `
        <div style="
          position:absolute;
          inset:0;
          display:flex;
          align-items:center;
          justify-content:center;
          font-weight:900;
          text-transform:uppercase;
          letter-spacing:0.4em;
          color:${selectedCertificate.templateData.watermark.color};
          opacity:${selectedCertificate.templateData.watermark.opacity};
          transform:rotate(${selectedCertificate.templateData.watermark.rotation}deg);
          font-size:${selectedCertificate.templateData.watermark.fontSize}px;
        ">${escapeHtml(selectedCertificate.templateData.watermark.text)}</div>
      `
            : '';

        const printWindow = window.open('', '_blank', 'width=1200,height=900');
        if (!printWindow) {
            toast.error('Allow pop-ups to download the certificate.');
            return;
        }

        printWindow.document.write(`
      <!DOCTYPE html>
      <html>
        <head>
          <title>${escapeHtml(selectedCertificate.title)} - Certificate</title>
          <style>
            body {
              margin: 0;
              padding: 24px;
              font-family: Arial, sans-serif;
              background: #f8fafc;
              display: flex;
              justify-content: center;
            }
            .certificate {
              position: relative;
              width: 820px;
              height: 600px;
              margin: 0 auto;
              overflow: hidden;
              border-radius: 16px;
              box-sizing: border-box;
              background-image: ${theme.backgroundImage};
              background-size: ${theme.backgroundSize};
              background-color: white;
            }
            @media print {
              body { padding: 0; background: white; }
              .certificate { margin: 0; border-radius: 0; }
            }
          </style>
        </head>
        <body>
          <div class="certificate">
            ${watermark}
            ${renderedElements}
          </div>
          <script>
            window.onload = function () {
              window.focus();
              setTimeout(function () {
                window.print();
              }, 150);
            };
          </script>
        </body>
      </html>
    `);
        printWindow.document.close();
        printWindow.focus();
    };

    const toggleStudentSelection = (studentId: string) => {
        setSelectedStudents((current) =>
            current.includes(studentId) ? current.filter((id) => id !== studentId) : [...current, studentId],
        );
    };

    const selectAllStudents = () => {
        setSelectedStudents(filteredStudentsForBulk.map((student) => student.id));
    };

    const handleBulkIssue = () => {
        if (!bulkIssueForm.certificateType) {
            toast.error('Select a certificate template first');
            return;
        }

        router.post(
            '/certificates/issue-bulk',
            {
                certificate_template_id: Number(bulkIssueForm.certificateType),
                student_ids: selectedStudents.map((id) => Number(id)),
                reason: bulkIssueForm.reason.trim() || null,
                reason_mr: bulkIssueForm.reasonMr.trim() || null,
                date: bulkIssueForm.date,
                issued_by: formData.issuedBy.trim() || null,
            },
            {
                preserveScroll: true,
                onSuccess: () => {
                    setShowBulkIssueDialog(false);
                    setSelectedStudents([]);
                    setBulkIssueForm((current) => ({
                        ...current,
                        certificateType: '',
                        reason: '',
                        reasonMr: '',
                        date: new Date().toISOString().split('T')[0],
                    }));
                },
            },
        );
    };

    const renderCanvas = (data: CertificateTemplateData, editable: boolean) => (
        <div
            ref={editable ? canvasRef : undefined}
            className={`relative h-[600px] w-full overflow-hidden rounded-2xl p-8 ${getPresetClasses(data.preset)}`}
            style={{
                backgroundImage: getPresetTheme(data.preset).backgroundImage,
                backgroundSize: getPresetTheme(data.preset).backgroundSize,
            }}
        >
            {editable ? (
                <>
                    <div
                        className={`pointer-events-none absolute inset-y-0 left-1/2 w-px -translate-x-1/2 border-l border-dashed ${
                            canvasGuides.vertical ? 'border-blue-500 opacity-100' : 'border-slate-300 opacity-70'
                        }`}
                    />

                    <div
                        className={`pointer-events-none absolute inset-x-0 top-1/2 h-px -translate-y-1/2 border-t border-dashed ${
                            canvasGuides.horizontal ? 'border-blue-500 opacity-100' : 'border-slate-300 opacity-70'
                        }`}
                    />

                    <div className="pointer-events-none absolute left-1/2 top-1/2 h-3 w-3 -translate-x-1/2 -translate-y-1/2 rounded-full border border-blue-300 bg-white/90" />
                    {canvasGuides.peerY !== null ? (
                        <div
                            className="pointer-events-none absolute inset-x-0 border-t border-dashed border-blue-500"
                            style={{ top: canvasGuides.peerY }}
                        />
                    ) : null}
                    {canvasGuides.peerLeft !== null ? (
                        <div
                            className="pointer-events-none absolute inset-y-0 border-l border-dashed border-blue-500"
                            style={{ left: canvasGuides.peerLeft }}
                        />
                    ) : null}
                    {canvasGuides.peerCenter !== null ? (
                        <div
                            className="pointer-events-none absolute inset-y-0 border-l border-dashed border-emerald-500"
                            style={{ left: canvasGuides.peerCenter }}
                        />
                    ) : null}
                    {canvasGuides.peerRight !== null ? (
                        <div
                            className="pointer-events-none absolute inset-y-0 border-l border-dashed border-fuchsia-500"
                            style={{ left: canvasGuides.peerRight }}
                        />
                    ) : null}
                </>
            ) : null}

            {data.watermark.enabled ? (
                <div
                    className="pointer-events-none absolute inset-0 flex items-center justify-center font-black uppercase tracking-[0.4em]"
                    style={{
                        color: data.watermark.color,
                        opacity: data.watermark.opacity,
                        transform: `rotate(${data.watermark.rotation}deg)`,
                        fontSize: `${data.watermark.fontSize}px`,
                    }}
                >
                    {data.watermark.text}
                </div>
            ) : null}

            {data.elements.map((element) => (
                <div
                    key={element.id}
                    className={
                        editable
                            ? `absolute cursor-move select-none rounded border border-dashed transition-all ${
                                  selectedElementId === element.id
                                      ? 'border-blue-500 bg-blue-50/95 shadow-[0_0_0_2px_rgba(37,99,235,0.18)]'
                                      : 'border-transparent hover:border-slate-300'
                              }`
                            : t('absolute')
                    }
                    style={{
                        left: element.x,
                        top: element.y,
                        width: element.width,
                        padding: editable ? '6px 8px' : 0,
                        background:
                            editable && selectedElementId === element.id ? 'rgba(255, 251, 235, 0.95)' : 'transparent',
                        fontSize: `${element.fontSize}px`,
                        fontFamily: element.fontFamily,
                        fontWeight: element.fontWeight,
                        fontStyle: element.fontStyle,
                        textDecoration: element.textDecoration,
                        color: element.color,
                        textAlign: element.align,
                        lineHeight: 1.25,
                        boxShadow:
                            editable && selectedElementId === element.id
                                ? '0 10px 24px rgba(245, 158, 11, 0.18)'
                                : 'none',
                    }}
                    onMouseDown={editable ? (event) => startDragging(event, element) : undefined}
                    onClick={editable ? () => setSelectedElementId(element.id) : undefined}
                >
                    {editable && selectedElementId === element.id ? (
                        <span className="absolute -top-6 left-0 rounded-md bg-blue-500 px-2 py-0.5 text-[10px] font-semibold uppercase tracking-wide text-white">
                            {t('Editing')}
                        </span>
                    ) : null}
                    {getVariableValue(element.content, variableValues)}
                </div>
            ))}
        </div>
    );

    return (
        <DashboardLayout user={user} activeTab="certificate">
            <div className="space-y-6 p-6">
                <div className="flex flex-col gap-4 lg:flex-row lg:items-start lg:justify-between">
                    <div className="space-y-1">
                        <h1 className="text-3xl font-bold text-gray-900">{t('Certificate Management')}</h1>
                        <p className="text-gray-600">
                            {t(
                                'Build certificate templates like a simple Canva editor with variables and watermark support.',
                            )}
                        </p>
                    </div>
                    <div className="flex flex-wrap gap-2">
                        <Dialog open={showBulkIssueDialog} onOpenChange={setShowBulkIssueDialog}>
                            <DialogTrigger asChild>
                                <Button variant="outline" className="gap-2">
                                    <Users className="h-4 w-4" />
                                    {t('Bulk Issue')}
                                </Button>
                            </DialogTrigger>
                            <DialogContent className="max-w-4xl">
                                <DialogHeader>
                                    <DialogTitle>{t('Bulk Issue Certificates')}</DialogTitle>
                                    <DialogDescription>
                                        {t('Select students and issue certificates in bulk.')}
                                    </DialogDescription>
                                </DialogHeader>
                                <div className="space-y-4">
                                    <div className="grid gap-4 md:grid-cols-3">
                                        <div className="space-y-2">
                                            <Label>{t('Certificate Type')}</Label>
                                            <Select
                                                value={bulkIssueForm.certificateType}
                                                onValueChange={(value) =>
                                                    setBulkIssueForm((current) => ({
                                                        ...current,
                                                        certificateType: value,
                                                    }))
                                                }
                                            >
                                                <SelectTrigger>
                                                    <SelectValue placeholder={t('Select type')} />
                                                </SelectTrigger>
                                                <SelectContent>
                                                    {certificates.map((certificate) => (
                                                        <SelectItem key={certificate.id} value={certificate.id}>
                                                            {t(certificate.title)}
                                                        </SelectItem>
                                                    ))}
                                                </SelectContent>
                                            </Select>
                                        </div>
                                        <div className="space-y-2">
                                            <Label>{t('Class')}</Label>
                                            <Select
                                                value={bulkIssueForm.class}
                                                onValueChange={(value) =>
                                                    setBulkIssueForm((current) => ({
                                                        ...current,
                                                        class: value,
                                                    }))
                                                }
                                            >
                                                <SelectTrigger>
                                                    <SelectValue />
                                                </SelectTrigger>
                                                <SelectContent>
                                                    <SelectItem value="all">{t('All Classes')}</SelectItem>
                                                    {availableClassOptions.map((option) => (
                                                        <SelectItem key={option} value={option}>
                                                            {option}
                                                        </SelectItem>
                                                    ))}
                                                </SelectContent>
                                            </Select>
                                        </div>
                                        <div className="space-y-2">
                                            <Label>{t('Section')}</Label>
                                            <Select
                                                value={bulkIssueForm.section}
                                                onValueChange={(value) =>
                                                    setBulkIssueForm((current) => ({
                                                        ...current,
                                                        section: value,
                                                    }))
                                                }
                                            >
                                                <SelectTrigger>
                                                    <SelectValue />
                                                </SelectTrigger>
                                                <SelectContent>
                                                    <SelectItem value="all">{t('All Sections')}</SelectItem>
                                                    {bulkSectionOptions.map((option) => (
                                                        <SelectItem key={option} value={option}>
                                                            {t('Section')}
                                                            {option}
                                                        </SelectItem>
                                                    ))}
                                                </SelectContent>
                                            </Select>
                                        </div>
                                    </div>
                                    <div className="space-y-2">
                                        <Label>{t('Reason')}</Label>
                                        <Textarea
                                            value={bulkIssueForm.reason}
                                            onChange={(event) =>
                                                setBulkIssueForm((current) => ({
                                                    ...current,
                                                    reason: event.target.value,
                                                }))
                                            }
                                            placeholder={t('Reason for certificate')}
                                        />

                                        {dualLanguageEnabled && (
                                            <Label className="mt-2 block">
                                                {t('Reason (')}
                                                {regionalLanguage === 'mr' ? t('Marathi') : t('Regional')})
                                            </Label>
                                        )}
                                        {dualLanguageEnabled && (
                                            <Textarea
                                                value={bulkIssueForm.reasonMr}
                                                onChange={(event) =>
                                                    setBulkIssueForm((current) => ({
                                                        ...current,
                                                        reasonMr: event.target.value,
                                                    }))
                                                }
                                                placeholder={`Reason for certificate in ${regionalLanguage === 'mr' ? 'Marathi' : 'regional language'}`}
                                            />
                                        )}
                                    </div>
                                    <div className="space-y-2">
                                        <div className="flex items-center justify-between">
                                            <Label>
                                                {t('Select Students ({count} selected)', {
                                                    count: selectedStudents.length,
                                                })}
                                            </Label>
                                            <Button
                                                type="button"
                                                size="sm"
                                                variant="outline"
                                                onClick={selectAllStudents}
                                            >
                                                {t('Select All ({count})', {
                                                    count: filteredStudentsForBulk.length,
                                                })}
                                            </Button>
                                        </div>
                                        <ScrollArea className="h-64 rounded-md border p-4">
                                            <div className="space-y-2">
                                                {filteredStudentsForBulk.map((student) => (
                                                    <div
                                                        key={student.id}
                                                        className="flex items-center gap-3 rounded-md px-2 py-2 hover:bg-slate-50"
                                                    >
                                                        <Checkbox
                                                            checked={selectedStudents.includes(student.id)}
                                                            onCheckedChange={() => toggleStudentSelection(student.id)}
                                                        />

                                                        <div className="flex-1">
                                                            <p className="text-sm font-medium">
                                                                {getStudentFullName(student)}
                                                            </p>
                                                            <p className="text-xs text-gray-500">
                                                                {student.admission_no || t('No admission no.')}
                                                                {' | '}
                                                                {student.class ? `${student.class}` : t('No class')}
                                                                {student.section ? ` - ${student.section}` : ''}
                                                            </p>
                                                        </div>
                                                    </div>
                                                ))}
                                            </div>
                                        </ScrollArea>
                                    </div>
                                </div>
                                <DialogFooter>
                                    <Button variant="outline" onClick={() => setShowBulkIssueDialog(false)}>
                                        {t('Cancel')}
                                    </Button>
                                    <Button
                                        onClick={handleBulkIssue}
                                        disabled={!bulkIssueForm.certificateType || selectedStudents.length === 0}
                                    >
                                        {t('Issue to')}
                                        {selectedStudents.length}
                                        {t('Students')}
                                    </Button>
                                </DialogFooter>
                            </DialogContent>
                        </Dialog>
                        <Button className="gap-2" onClick={openCreateEditor}>
                            <Plus className="h-4 w-4" />
                            {t('Create Template')}
                        </Button>
                    </div>
                </div>

                {isEditorOpen ? (
                    <div ref={editorSectionRef} className="space-y-6">
                        <Card className="overflow-hidden">
                            <CardHeader className="border-b bg-slate-50/80">
                                <div className="flex flex-col gap-3 lg:flex-row lg:items-center lg:justify-between">
                                    <div>
                                        <CardTitle>
                                            {editingCertificateId
                                                ? t('Edit Certificate Template')
                                                : t('Create Certificate Template')}
                                        </CardTitle>
                                        <p className="mt-1 text-sm text-gray-600">
                                            {t(
                                                'Drag text blocks on the canvas, insert student-detail variables, and style the layout.',
                                            )}
                                        </p>
                                    </div>
                                    <div className="flex flex-wrap gap-2">
                                        <Button
                                            type="button"
                                            variant="outline"
                                            className="gap-2"
                                            onClick={undoTemplateChange}
                                        >
                                            <Undo2 className="h-4 w-4" />
                                            {t('Undo')}
                                        </Button>
                                        <Button
                                            type="button"
                                            variant="outline"
                                            className="gap-2"
                                            onClick={addTextElement}
                                        >
                                            <Type className="h-4 w-4" />
                                            {t('Add Text')}
                                        </Button>
                                        <div className="flex min-w-[220px] gap-2">
                                            <Select value={activeVariable} onValueChange={setActiveVariable}>
                                                <SelectTrigger>
                                                    <SelectValue />
                                                </SelectTrigger>
                                                <SelectContent>
                                                    {VARIABLE_OPTIONS.map((variable) => (
                                                        <SelectItem key={variable.value} value={variable.value}>
                                                            {t(variable.label)}
                                                        </SelectItem>
                                                    ))}
                                                </SelectContent>
                                            </Select>
                                            <Button type="button" variant="outline" onClick={addVariableElement}>
                                                {t('Add Variable')}
                                            </Button>
                                        </div>
                                    </div>
                                </div>
                            </CardHeader>
                            <CardContent className="space-y-5 p-5">
                                <div className="grid gap-4 md:grid-cols-3">
                                    <div className="space-y-2">
                                        <Label>{t('Certificate Title')}</Label>
                                        <Input
                                            value={formData.title}
                                            onChange={(event) => handleInputChange('title', event.target.value)}
                                            placeholder={t('Academic Excellence')}
                                        />
                                    </div>
                                    <div className="space-y-2">
                                        <Label>{t('Certificate Type')}</Label>
                                        <Select
                                            value={formData.type}
                                            onValueChange={(value) => handleInputChange('type', value)}
                                        >
                                            <SelectTrigger>
                                                <SelectValue />
                                            </SelectTrigger>
                                            <SelectContent>
                                                <SelectItem value="merit">{t('Merit')}</SelectItem>
                                                <SelectItem value="achievement">{t('Achievement')}</SelectItem>
                                                <SelectItem value="participation">{t('Participation')}</SelectItem>
                                                <SelectItem value="appreciation">{t('Appreciation')}</SelectItem>
                                                <SelectItem value="completion">{t('Completion')}</SelectItem>
                                            </SelectContent>
                                        </Select>
                                    </div>
                                    <div className="space-y-2">
                                        <Label>{t('Template Preset')}</Label>
                                        <Select
                                            value={templateData.preset}
                                            onValueChange={(value: TemplatePreset) => {
                                                const nextTemplate = createDefaultTemplateData(
                                                    formData.schoolName || schoolName,
                                                    value,
                                                );
                                                applyTemplateMutation((current) => ({
                                                    ...current,
                                                    preset: value,
                                                    watermark: {
                                                        ...current.watermark,
                                                        color: nextTemplate.watermark.color,
                                                    },
                                                    elements: current.elements.map((element, index) => {
                                                        if (index === 1) {
                                                            return {
                                                                ...element,
                                                                color: nextTemplate.elements[1]?.color || element.color,
                                                            };
                                                        }

                                                        if (index === 2 || index === 4) {
                                                            return {
                                                                ...element,
                                                                color:
                                                                    nextTemplate.elements[index]?.color ||
                                                                    element.color,
                                                            };
                                                        }

                                                        return element;
                                                    }),
                                                }));
                                            }}
                                        >
                                            <SelectTrigger>
                                                <SelectValue />
                                            </SelectTrigger>
                                            <SelectContent>
                                                {PRESET_OPTIONS.map((preset) => (
                                                    <SelectItem key={preset.value} value={preset.value}>
                                                        {t(preset.label)}
                                                    </SelectItem>
                                                ))}
                                            </SelectContent>
                                        </Select>
                                    </div>
                                </div>

                                <div className="space-y-2">
                                    <Label>{t('Description')}</Label>
                                    <Textarea
                                        value={formData.description}
                                        onChange={(event) => handleInputChange('description', event.target.value)}
                                        placeholder={t('Short description of this certificate template')}
                                    />
                                </div>

                                <div className="grid gap-4 rounded-xl border bg-slate-50 p-4 md:grid-cols-4">
                                    <div className="space-y-2">
                                        <Label>{t('Select Student')}</Label>
                                        <Select
                                            value={formData.previewStudentId}
                                            onValueChange={handlePreviewStudentChange}
                                        >
                                            <SelectTrigger>
                                                <SelectValue
                                                    placeholder={
                                                        students.length
                                                            ? t('Select student')
                                                            : t('No students available')
                                                    }
                                                />
                                            </SelectTrigger>
                                            <SelectContent>
                                                {students.map((student) => (
                                                    <SelectItem key={student.id} value={student.id}>
                                                        {getStudentFullName(student)}
                                                    </SelectItem>
                                                ))}
                                            </SelectContent>
                                        </Select>
                                    </div>
                                    <div className="space-y-2">
                                        <Label>{t('Preview Student')}</Label>
                                        <Input value={formData.studentName} readOnly />
                                    </div>
                                    <div className="space-y-2">
                                        <Label>{t('Admission No')}</Label>
                                        <Input value={formData.admissionNo} readOnly />
                                    </div>
                                    <div className="space-y-2">
                                        <Label>{t('Class')}</Label>
                                        <Input value={formData.className} readOnly />
                                    </div>
                                    <div className="space-y-2">
                                        <Label>{t('Section')}</Label>
                                        <Input value={formData.section} readOnly />
                                    </div>
                                    <div className="space-y-2">
                                        <Label>{t('Achievement / Reason')}</Label>
                                        <Textarea
                                            value={formData.reason}
                                            onChange={(event) => handleInputChange('reason', event.target.value)}
                                            rows={3}
                                        />
                                    </div>
                                    <div className="space-y-2">
                                        <Label>{t('Issue Date')}</Label>
                                        <Input
                                            type="date"
                                            value={formData.date}
                                            onChange={(event) => handleInputChange('date', event.target.value)}
                                        />
                                    </div>
                                    <div className="space-y-2">
                                        <Label>{t('Issued By')}</Label>
                                        <Input
                                            value={formData.issuedBy}
                                            onChange={(event) => handleInputChange('issuedBy', event.target.value)}
                                        />
                                    </div>
                                    <div className="space-y-2">
                                        <Label>{t('School Name')}</Label>
                                        <Input
                                            value={formData.schoolName}
                                            onChange={(event) => handleInputChange('schoolName', event.target.value)}
                                        />
                                    </div>
                                </div>

                                <div className="rounded-2xl border bg-slate-100 p-4">
                                    <div className="mb-3 flex items-center gap-2 text-sm font-medium text-slate-600">
                                        <Move className="h-4 w-4" />
                                        {t('Drag elements directly on the certificate canvas')}
                                    </div>
                                    <div className="w-full">{renderCanvas(templateData, true)}</div>
                                </div>

                                <div className="flex flex-wrap justify-end gap-2">
                                    <Button variant="outline" onClick={resetEditor}>
                                        {t('Cancel')}
                                    </Button>
                                    <Button onClick={saveTemplate}>
                                        {editingCertificateId ? t('Update Template') : t('Save Template')}
                                    </Button>
                                </div>
                            </CardContent>
                        </Card>

                        <div className="grid gap-6 xl:grid-cols-3">
                            <Card>
                                <CardHeader>
                                    <CardTitle>{t('Element Styling')}</CardTitle>
                                </CardHeader>
                                <CardContent className="space-y-4">
                                    {selectedElement ? (
                                        <>
                                            <div className="space-y-2">
                                                <Label>{t('Element Label')}</Label>
                                                <Input
                                                    value={selectedElement.label}
                                                    onChange={(event) =>
                                                        updateSelectedElement({
                                                            label: event.target.value,
                                                        })
                                                    }
                                                />
                                            </div>
                                            <div className="space-y-2">
                                                <Label>
                                                    {selectedElement.kind === 'variable'
                                                        ? t('Variable Token')
                                                        : t('Text Content')}
                                                </Label>
                                                {selectedElement.kind === 'variable' ? (
                                                    <Select
                                                        value={selectedElement.content}
                                                        onValueChange={(value) =>
                                                            updateSelectedElement({
                                                                content: value,
                                                                label:
                                                                    VARIABLE_OPTIONS.find(
                                                                        (item) => item.value === value,
                                                                    )?.label || selectedElement.label,
                                                            })
                                                        }
                                                    >
                                                        <SelectTrigger>
                                                            <SelectValue />
                                                        </SelectTrigger>
                                                        <SelectContent>
                                                            {VARIABLE_OPTIONS.map((variable) => (
                                                                <SelectItem key={variable.value} value={variable.value}>
                                                                    {t(variable.label)}
                                                                </SelectItem>
                                                            ))}
                                                        </SelectContent>
                                                    </Select>
                                                ) : (
                                                    <Textarea
                                                        value={selectedElement.content}
                                                        onChange={(event) =>
                                                            updateSelectedElement({
                                                                content: event.target.value,
                                                            })
                                                        }
                                                        rows={3}
                                                    />
                                                )}
                                            </div>
                                            <div className="grid grid-cols-2 gap-3">
                                                <div className="space-y-2">
                                                    <Label>{t('Width')}</Label>
                                                    <Input
                                                        type="number"
                                                        value={selectedElement.width}
                                                        onChange={(event) =>
                                                            updateSelectedElement({
                                                                width: Number(event.target.value) || 0,
                                                            })
                                                        }
                                                    />
                                                </div>
                                                <div className="space-y-2">
                                                    <Label>{t('Font Size')}</Label>
                                                    <Input
                                                        type="number"
                                                        value={selectedElement.fontSize}
                                                        onChange={(event) =>
                                                            updateSelectedElement({
                                                                fontSize: Number(event.target.value) || 0,
                                                            })
                                                        }
                                                    />
                                                </div>
                                                <div className="space-y-2">
                                                    <Label>{t('X Position')}</Label>
                                                    <Input
                                                        type="number"
                                                        value={Math.round(selectedElement.x)}
                                                        onChange={(event) =>
                                                            updateSelectedElement({
                                                                x: Number(event.target.value) || 0,
                                                            })
                                                        }
                                                    />
                                                </div>
                                                <div className="space-y-2">
                                                    <Label>{t('Y Position')}</Label>
                                                    <Input
                                                        type="number"
                                                        value={Math.round(selectedElement.y)}
                                                        onChange={(event) =>
                                                            updateSelectedElement({
                                                                y: Number(event.target.value) || 0,
                                                            })
                                                        }
                                                    />
                                                </div>
                                            </div>
                                            <div className="space-y-2">
                                                <Label>{t('Font Family')}</Label>
                                                <Select
                                                    value={selectedElement.fontFamily}
                                                    onValueChange={(value) =>
                                                        updateSelectedElement({
                                                            fontFamily: value,
                                                        })
                                                    }
                                                >
                                                    <SelectTrigger>
                                                        <SelectValue />
                                                    </SelectTrigger>
                                                    <SelectContent>
                                                        {FONT_OPTIONS.map((font) => (
                                                            <SelectItem key={font.value} value={font.value}>
                                                                {t(font.label)}
                                                            </SelectItem>
                                                        ))}
                                                    </SelectContent>
                                                </Select>
                                            </div>
                                            <div className="space-y-2">
                                                <Label>{t('Text Color')}</Label>
                                                <Input
                                                    value={selectedElement.color}
                                                    onChange={(event) =>
                                                        updateSelectedElement({
                                                            color: event.target.value,
                                                        })
                                                    }
                                                    placeholder="#111827"
                                                />
                                            </div>
                                            <div className="space-y-2">
                                                <Label>{t('Formatting')}</Label>
                                                <div className="flex flex-wrap gap-2">
                                                    <Button
                                                        type="button"
                                                        variant={
                                                            selectedElement.fontWeight === 'bold'
                                                                ? 'default'
                                                                : 'outline'
                                                        }
                                                        size="sm"
                                                        onClick={() =>
                                                            updateSelectedElement({
                                                                fontWeight:
                                                                    selectedElement.fontWeight === 'bold'
                                                                        ? 'normal'
                                                                        : 'bold',
                                                            })
                                                        }
                                                    >
                                                        <Bold className="h-4 w-4" />
                                                    </Button>
                                                    <Button
                                                        type="button"
                                                        variant={
                                                            selectedElement.fontStyle === 'italic'
                                                                ? 'default'
                                                                : 'outline'
                                                        }
                                                        size="sm"
                                                        onClick={() =>
                                                            updateSelectedElement({
                                                                fontStyle:
                                                                    selectedElement.fontStyle === 'italic'
                                                                        ? 'normal'
                                                                        : 'italic',
                                                            })
                                                        }
                                                    >
                                                        <Italic className="h-4 w-4" />
                                                    </Button>
                                                    <Button
                                                        type="button"
                                                        variant={
                                                            selectedElement.textDecoration === 'underline'
                                                                ? 'default'
                                                                : 'outline'
                                                        }
                                                        size="sm"
                                                        onClick={() =>
                                                            updateSelectedElement({
                                                                textDecoration:
                                                                    selectedElement.textDecoration === 'underline'
                                                                        ? 'none'
                                                                        : 'underline',
                                                            })
                                                        }
                                                    >
                                                        <Underline className="h-4 w-4" />
                                                    </Button>
                                                    <Button
                                                        type="button"
                                                        variant={
                                                            selectedElement.align === 'left' ? 'default' : 'outline'
                                                        }
                                                        size="sm"
                                                        onClick={() =>
                                                            updateSelectedElement({
                                                                align: 'left',
                                                            })
                                                        }
                                                    >
                                                        <AlignLeft className="h-4 w-4" />
                                                    </Button>
                                                    <Button
                                                        type="button"
                                                        variant={
                                                            selectedElement.align === 'center' ? 'default' : 'outline'
                                                        }
                                                        size="sm"
                                                        onClick={() =>
                                                            updateSelectedElement({
                                                                align: 'center',
                                                            })
                                                        }
                                                    >
                                                        <AlignCenter className="h-4 w-4" />
                                                    </Button>
                                                    <Button
                                                        type="button"
                                                        variant={
                                                            selectedElement.align === 'right' ? 'default' : 'outline'
                                                        }
                                                        size="sm"
                                                        onClick={() =>
                                                            updateSelectedElement({
                                                                align: 'right',
                                                            })
                                                        }
                                                    >
                                                        <AlignRight className="h-4 w-4" />
                                                    </Button>
                                                </div>
                                            </div>
                                            <Button
                                                variant="destructive"
                                                className="w-full gap-2"
                                                onClick={removeSelectedElement}
                                            >
                                                <Trash2 className="h-4 w-4" />
                                                {t('Remove Selected Element')}
                                            </Button>
                                        </>
                                    ) : (
                                        <div className="rounded-lg border border-dashed p-6 text-center text-sm text-gray-500">
                                            {t('Select an element on the canvas to style it.')}
                                        </div>
                                    )}
                                </CardContent>
                            </Card>

                            <Card>
                                <CardHeader>
                                    <CardTitle className="flex items-center gap-2">
                                        <Droplets className="h-4 w-4" />
                                        {t('Watermark')}
                                    </CardTitle>
                                </CardHeader>
                                <CardContent className="space-y-4">
                                    <div className="flex items-center justify-between rounded-lg border px-3 py-2">
                                        <div>
                                            <p className="text-sm font-medium">{t('Show watermark')}</p>
                                            <p className="text-xs text-gray-500">
                                                {t('Useful for draft, brand, or security-style certificate templates.')}
                                            </p>
                                        </div>
                                        <Checkbox
                                            checked={templateData.watermark.enabled}
                                            onCheckedChange={(checked) =>
                                                applyTemplateMutation((current) => ({
                                                    ...current,
                                                    watermark: {
                                                        ...current.watermark,
                                                        enabled: Boolean(checked),
                                                    },
                                                }))
                                            }
                                        />
                                    </div>
                                    <div className="space-y-2">
                                        <Label>{t('Watermark Text')}</Label>
                                        <Input
                                            value={templateData.watermark.text}
                                            onChange={(event) =>
                                                applyTemplateMutation((current) => ({
                                                    ...current,
                                                    watermark: {
                                                        ...current.watermark,
                                                        text: event.target.value,
                                                    },
                                                }))
                                            }
                                        />
                                    </div>
                                    <div className="grid grid-cols-2 gap-3">
                                        <div className="space-y-2">
                                            <Label>{t('Opacity')}</Label>
                                            <Input
                                                type="number"
                                                step="0.01"
                                                min="0"
                                                max="1"
                                                value={templateData.watermark.opacity}
                                                onChange={(event) =>
                                                    applyTemplateMutation((current) => ({
                                                        ...current,
                                                        watermark: {
                                                            ...current.watermark,
                                                            opacity: Number(event.target.value) || 0,
                                                        },
                                                    }))
                                                }
                                            />
                                        </div>
                                        <div className="space-y-2">
                                            <Label>{t('Rotation')}</Label>
                                            <Input
                                                type="number"
                                                value={templateData.watermark.rotation}
                                                onChange={(event) =>
                                                    applyTemplateMutation((current) => ({
                                                        ...current,
                                                        watermark: {
                                                            ...current.watermark,
                                                            rotation: Number(event.target.value) || 0,
                                                        },
                                                    }))
                                                }
                                            />
                                        </div>
                                        <div className="space-y-2">
                                            <Label>{t('Font Size')}</Label>
                                            <Input
                                                type="number"
                                                value={templateData.watermark.fontSize}
                                                onChange={(event) =>
                                                    applyTemplateMutation((current) => ({
                                                        ...current,
                                                        watermark: {
                                                            ...current.watermark,
                                                            fontSize: Number(event.target.value) || 0,
                                                        },
                                                    }))
                                                }
                                            />
                                        </div>
                                        <div className="space-y-2">
                                            <Label>{t('Color')}</Label>
                                            <Input
                                                value={templateData.watermark.color}
                                                onChange={(event) =>
                                                    applyTemplateMutation((current) => ({
                                                        ...current,
                                                        watermark: {
                                                            ...current.watermark,
                                                            color: event.target.value,
                                                        },
                                                    }))
                                                }
                                            />
                                        </div>
                                    </div>
                                </CardContent>
                            </Card>

                            <Card className="xl:col-span-1">
                                <CardHeader>
                                    <CardTitle>{t('Template Variables')}</CardTitle>
                                </CardHeader>
                                <CardContent className="space-y-2">
                                    {VARIABLE_OPTIONS.map((variable) => (
                                        <div
                                            key={variable.value}
                                            className="flex items-center justify-between rounded-lg border px-3 py-2 text-sm"
                                        >
                                            <span>{t(variable.label)}</span>
                                            <Badge variant="secondary">{variable.value}</Badge>
                                        </div>
                                    ))}
                                </CardContent>
                            </Card>
                        </div>
                    </div>
                ) : null}

                <div className="grid gap-4 md:grid-cols-4">
                    <Card>
                        <CardContent className="pt-6">
                            <div className="flex items-center justify-between">
                                <div>
                                    <p className="text-sm text-gray-600">{t('Total Templates')}</p>
                                    <p className="text-2xl font-bold">{certificates.length}</p>
                                </div>
                                <FileText className="h-8 w-8 text-blue-500" />
                            </div>
                        </CardContent>
                    </Card>
                    <Card>
                        <CardContent className="pt-6">
                            <div className="flex items-center justify-between">
                                <div>
                                    <p className="text-sm text-gray-600">{t('Certificates Issued')}</p>
                                    <p className="text-2xl font-bold">{issuedCertificates.length}</p>
                                </div>
                                <Award className="h-8 w-8 text-blue-500" />
                            </div>
                        </CardContent>
                    </Card>
                    <Card>
                        <CardContent className="pt-6">
                            <div className="flex items-center justify-between">
                                <div>
                                    <p className="text-sm text-gray-600">{t('Variables Ready')}</p>
                                    <p className="text-2xl font-bold">{VARIABLE_OPTIONS.length}</p>
                                </div>
                                <Type className="h-8 w-8 text-emerald-500" />
                            </div>
                        </CardContent>
                    </Card>
                    <Card>
                        <CardContent className="pt-6">
                            <div className="flex items-center justify-between">
                                <div>
                                    <p className="text-sm text-gray-600">{t('Students')}</p>
                                    <p className="text-2xl font-bold">{students.length}</p>
                                </div>
                                <Users className="h-8 w-8 text-violet-500" />
                            </div>
                        </CardContent>
                    </Card>
                </div>

                <Tabs defaultValue="templates" className="space-y-4">
                    <TabsList className="h-auto w-full justify-start gap-2 rounded-2xl bg-white p-2 shadow-sm">
                        <TabsTrigger
                            value="templates"
                            className="data-[state=active]:bg-blue-600 data-[state=active]:text-white"
                        >
                            {t('Templates (')}
                            {certificates.length})
                        </TabsTrigger>
                        <TabsTrigger
                            value="issued"
                            className="data-[state=active]:bg-blue-600 data-[state=active]:text-white"
                        >
                            {t('Issued Certificates (')}
                            {issuedCertificates.length})
                        </TabsTrigger>
                    </TabsList>

                    <TabsContent value="templates">
                        <Card>
                            <CardHeader>
                                <CardTitle>{t('Certificate Templates')}</CardTitle>
                            </CardHeader>
                            <CardContent>
                                {certificates.length === 0 ? (
                                    <div className="py-12 text-center">
                                        <Award className="mx-auto mb-4 h-16 w-16 text-gray-400" />
                                        <p className="text-gray-600">{t('No certificate templates created yet.')}</p>
                                    </div>
                                ) : (
                                    <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-3">
                                        {certificates.map((certificate) => (
                                            <Card key={certificate.id} className="overflow-hidden border-slate-200">
                                                <div className="border-b bg-slate-50 p-3">
                                                    <div className="line-clamp-1 text-sm font-semibold">
                                                        {t(certificate.title)}
                                                    </div>
                                                </div>
                                                <CardContent className="space-y-4 p-4">
                                                    <div className="overflow-hidden rounded-xl border bg-slate-100 p-2">
                                                        <div className="origin-top-left scale-[0.31]">
                                                            <div className="-mb-[414px] -mr-[562px] w-[820px]">
                                                                {renderCanvas(certificate.templateData, false)}
                                                            </div>
                                                        </div>
                                                    </div>
                                                    <div className="flex items-center justify-between">
                                                        <Badge variant="outline" className="capitalize">
                                                            {t(certificate.type)}
                                                        </Badge>
                                                        <span className="text-xs text-gray-500">
                                                            {formatDate(certificate.createdAt)}
                                                        </span>
                                                    </div>
                                                    <p className="line-clamp-2 text-sm text-gray-600">
                                                        {t(certificate.description)}
                                                    </p>
                                                    <div className="text-xs text-gray-500">
                                                        {t('Issued to:')}
                                                        {certificate.issuedTo}
                                                        {t('students')}
                                                    </div>
                                                    <div className="flex gap-2">
                                                        <Button
                                                            variant="outline"
                                                            size="sm"
                                                            className="flex-1 gap-1"
                                                            onClick={() => openPreview(certificate)}
                                                        >
                                                            <Eye className="h-4 w-4" />
                                                            {t('Preview')}
                                                        </Button>
                                                        <Button
                                                            variant="outline"
                                                            size="sm"
                                                            className="gap-1"
                                                            onClick={() => openEditEditor(certificate)}
                                                        >
                                                            <Edit className="h-4 w-4" />
                                                        </Button>
                                                        <Button
                                                            variant="outline"
                                                            size="sm"
                                                            className="gap-1"
                                                            onClick={() => deleteCertificate(certificate.id)}
                                                        >
                                                            <Trash2 className="h-4 w-4" />
                                                        </Button>
                                                    </div>
                                                </CardContent>
                                            </Card>
                                        ))}
                                    </div>
                                )}
                            </CardContent>
                        </Card>
                    </TabsContent>

                    <TabsContent value="issued">
                        <Card>
                            <CardHeader>
                                <CardTitle>{t('Issued Certificates')}</CardTitle>
                            </CardHeader>
                            <CardContent>
                                {issuedCertificates.length === 0 ? (
                                    <div className="py-12 text-center">
                                        <Award className="mx-auto mb-4 h-16 w-16 text-gray-400" />
                                        <p className="text-gray-600">
                                            {t('No certificates have been issued to students yet.')}
                                        </p>
                                    </div>
                                ) : (
                                    <div className="space-y-3">
                                        {issuedCertificates.map((issuedCertificate) => (
                                            <div
                                                key={issuedCertificate.id}
                                                className="rounded-xl border border-slate-200 bg-white p-4 shadow-sm"
                                            >
                                                <div className="flex flex-col gap-3 lg:flex-row lg:items-start lg:justify-between">
                                                    <div className="space-y-2">
                                                        <div className="flex flex-wrap items-center gap-2">
                                                            <p className="text-base font-semibold text-slate-900">
                                                                {issuedCertificate.studentName}
                                                            </p>
                                                            <Badge variant="outline">
                                                                {issuedCertificate.templateTitle}
                                                            </Badge>
                                                            {issuedCertificate.templateType ? (
                                                                <Badge variant="secondary" className="capitalize">
                                                                    {issuedCertificate.templateType}
                                                                </Badge>
                                                            ) : null}
                                                        </div>
                                                        <p className="text-sm text-slate-600">
                                                            {issuedCertificate.admissionNo || t('No admission no.')}
                                                            {' | '}
                                                            {issuedCertificate.class
                                                                ? `${issuedCertificate.class}`
                                                                : t('No class')}
                                                            {issuedCertificate.section
                                                                ? ` - ${issuedCertificate.section}`
                                                                : ''}
                                                        </p>
                                                        <p className="text-sm text-slate-600">
                                                            {t('Certificate No:')}{' '}
                                                            <span className="font-medium text-slate-800">
                                                                {issuedCertificate.certificateNumber}
                                                            </span>
                                                        </p>
                                                        {issuedCertificate.reason ? (
                                                            <p className="text-sm text-slate-600">
                                                                {issuedCertificate.reason}
                                                            </p>
                                                        ) : null}
                                                    </div>
                                                    <div className="space-y-3 text-sm text-slate-500 lg:text-right">
                                                        <div className="space-y-1">
                                                            <p>
                                                                {t('Issued on')}
                                                                {formatDisplayDate(issuedCertificate.issueDate)}
                                                            </p>
                                                            <p>
                                                                {t('By')}
                                                                {issuedCertificate.issuedBy || t('N/A')}
                                                                {issuedCertificate.issuedByDesignation
                                                                    ? ` (${issuedCertificate.issuedByDesignation})`
                                                                    : ''}
                                                            </p>
                                                        </div>
                                                        <div className="flex justify-end gap-2">
                                                            <Button
                                                                variant="outline"
                                                                size="sm"
                                                                className="gap-1"
                                                                onClick={() => openIssuedPreview(issuedCertificate)}
                                                            >
                                                                <Eye className="h-4 w-4" />
                                                                {t('Preview')}
                                                            </Button>
                                                            <Button
                                                                variant="outline"
                                                                size="sm"
                                                                className="gap-1"
                                                                onClick={() =>
                                                                    deleteIssuedCertificate(issuedCertificate.id)
                                                                }
                                                            >
                                                                <Trash2 className="h-4 w-4" />
                                                                {t('Delete')}
                                                            </Button>
                                                        </div>
                                                    </div>
                                                </div>
                                            </div>
                                        ))}
                                    </div>
                                )}
                            </CardContent>
                        </Card>
                    </TabsContent>
                </Tabs>

                {selectedCertificate ? (
                    <div ref={previewSectionRef}>
                        <Card>
                            <CardHeader className="border-b bg-slate-50/70">
                                <div className="flex flex-col gap-3 lg:flex-row lg:items-center lg:justify-between">
                                    <div>
                                        <CardTitle>
                                            {t(selectedCertificate.title)}
                                            {t('Preview')}
                                        </CardTitle>
                                        <p className="mt-1 text-sm text-gray-600">
                                            {t(
                                                'Preview the certificate on the page with live student-detail variables.',
                                            )}
                                        </p>
                                    </div>
                                    <div className="flex gap-2">
                                        <Button variant="outline" onClick={() => setSelectedCertificate(null)}>
                                            {t('Close Preview')}
                                        </Button>
                                        <div className="flex overflow-hidden rounded-md border border-slate-200">
                                            <button
                                                type="button"
                                                onClick={() => setPrintLanguage('en')}
                                                className={`px-3 py-2 text-sm font-medium transition ${printLanguage === 'en' ? 'bg-blue-600 text-white' : 'bg-white text-slate-600'}`}
                                            >
                                                {t('English')}
                                            </button>
                                            <button
                                                type="button"
                                                onClick={() => setPrintLanguage('mr')}
                                                className={`px-3 py-2 text-sm font-medium transition ${printLanguage === 'mr' ? 'bg-blue-600 text-white' : 'bg-white text-slate-600'}`}
                                            >
                                                मराठी
                                            </button>
                                        </div>
                                        <Button onClick={handleDownloadCertificate}>
                                            <Download className="mr-2 h-4 w-4" />
                                            {t('Download')}
                                        </Button>
                                    </div>
                                </div>
                            </CardHeader>
                            <CardContent className="space-y-6 p-5">
                                <div className="rounded-xl border bg-slate-100 p-4">
                                    <ScrollArea className="h-[520px]">
                                        {renderCanvas(selectedCertificate.templateData, false)}
                                    </ScrollArea>
                                </div>
                                <Card>
                                    <CardHeader>
                                        <CardTitle className="text-base">{t('Preview Variables')}</CardTitle>
                                    </CardHeader>
                                    <CardContent className="space-y-3">
                                        <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-4">
                                            <div className="space-y-2">
                                                <Label>{t('Select Student')}</Label>
                                                <Select
                                                    value={formData.previewStudentId}
                                                    onValueChange={handlePreviewStudentChange}
                                                >
                                                    <SelectTrigger>
                                                        <SelectValue
                                                            placeholder={
                                                                students.length
                                                                    ? t('Select student')
                                                                    : t('No students available')
                                                            }
                                                        />
                                                    </SelectTrigger>
                                                    <SelectContent>
                                                        {students.map((student) => (
                                                            <SelectItem key={student.id} value={student.id}>
                                                                {getStudentFullName(student)}
                                                            </SelectItem>
                                                        ))}
                                                    </SelectContent>
                                                </Select>
                                            </div>
                                            <div className="space-y-2">
                                                <Label>{t('Student Name')}</Label>
                                                <Input value={formData.studentName} readOnly />
                                            </div>
                                            <div className="space-y-2">
                                                <Label>{t('Admission No')}</Label>
                                                <Input value={formData.admissionNo} readOnly />
                                            </div>
                                            <div className="space-y-2">
                                                <Label>{t('Class')}</Label>
                                                <Input value={formData.className} readOnly />
                                            </div>
                                            <div className="space-y-2">
                                                <Label>{t('Section')}</Label>
                                                <Input value={formData.section} readOnly />
                                            </div>
                                        </div>
                                        <div className="space-y-2">
                                            <Label>{t('Achievement')}</Label>
                                            <Textarea
                                                value={formData.reason}
                                                onChange={(event) => handleInputChange('reason', event.target.value)}
                                                rows={4}
                                            />
                                        </div>
                                    </CardContent>
                                </Card>
                            </CardContent>
                        </Card>
                    </div>
                ) : null}
            </div>
        </DashboardLayout>
    );
}
