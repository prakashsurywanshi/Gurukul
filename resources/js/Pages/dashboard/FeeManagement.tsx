import { useLanguage } from '../../i18n/LanguageProvider';
import React, { useEffect, useMemo, useState } from 'react';
import { router, Link, usePage } from '@inertiajs/react';
import type { RequestPayload } from '@inertiajs/core';
import { Card, CardContent, CardHeader, CardTitle } from '../ui/card';
import { Button } from '../ui/button';
import { Input } from '../ui/input';
import { Label } from '../ui/label';
import {
    Dialog,
    DialogContent,
    DialogHeader,
    DialogTitle,
    DialogTrigger,
    DialogDescription,
    DialogFooter,
} from '../ui/dialog';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '../ui/table';
import { Badge } from '../ui/badge';
import {
    CheckCircle,
    ExternalLink,
    IndianRupee,
    Plus,
    Search,
    Settings,
    Users,
    FileText,
    RotateCcw,
    Pencil,
    Trash2,
    Copy,
    Upload,
} from 'lucide-react';
import { toast } from 'sonner';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '../ui/select';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '../ui/tabs';
import { Checkbox } from '../ui/checkbox';
import { ScrollArea } from '../ui/scroll-area';
import DashboardLayout from '../DashboardLayout';

interface FeeManagementProps {
    user: any;
    organization?: { id: number; name: string; logo?: string | null } | null;
    students: any[];
    classRecords: { id: number; name: string; section: string }[];
    feeTypes: FeeType[];
    feeStructures: FeeStructure[];
    studentFeeRecords: Record<string, any>;
    academicSessions?: { id: string; name: string; isCurrent: boolean }[];
}

interface FeeType {
    id: string;
    name: string;
    description: string;
}

interface FeeStructure {
    id: string;
    class: string;
    section: string;
    feeType: string;
    amount: number;
    frequency: string; // monthly, quarterly, annually
    description: string;
}

interface FeeImportEntry {
    studentIdentifier: string;
    feeType: string;
    month: string | null;
    year: number | null;
    dueDate: string;
    amount: number;
    discount: number | null;
    fine: number | null;
    paidAmount: number | null;
}

interface FeeImportResult {
    imported: number;
    skipped: number;
    failed: number;
    totalAmount: number;
    failures: { row: number; reason: string }[];
}

interface FeeCarryForwardResult {
    carried: number;
    skipped: number;
    totalAmount: number;
    fromSession: string;
    toSession: string;
}

export default function FeeManagement({
    user,
    organization,
    students,
    classRecords,
    feeTypes,
    feeStructures,
    studentFeeRecords,
    academicSessions = [],
}: FeeManagementProps) {
    const { t } = useLanguage();
    const page = usePage<{
        flash?: {
            success?: string;
            error?: string;
            feeImportResult?: FeeImportResult;
            feeCarryForwardResult?: FeeCarryForwardResult;
        };
    }>();
    const urlTab = new URLSearchParams(page.url.split('?')[1] ?? '').get('tab');
    const [activeTab, setActiveTab] = useState<string>(() =>
        urlTab && ['overview', 'fee-types', 'structures', 'collection'].includes(urlTab) ? urlTab : 'overview',
    );
    const flash = page.props.flash ?? {};
    const feeImportResult = flash.feeImportResult;
    const feeCarryForwardResult = flash.feeCarryForwardResult;
    const isTransportFeeType = (value: string) => value.toLowerCase().startsWith('transport fee -');
    const [selectedStudent, setSelectedStudent] = useState<any>(null);
    const [studentFees, setStudentFees] = useState<any>(null);
    const [showCollectDialog, setShowCollectDialog] = useState(false);
    const [activeFee, setActiveFee] = useState<any>(null);
    const [showRevertDialog, setShowRevertDialog] = useState(false);
    const [activePayment, setActivePayment] = useState<any>(null);
    const [showFeeTypeDialog, setShowFeeTypeDialog] = useState(false);
    const [showStructureDialog, setShowStructureDialog] = useState(false);
    const [showBulkAssignDialog, setShowBulkAssignDialog] = useState(false);
    const [showImportDialog, setShowImportDialog] = useState(false);
    const [importText, setImportText] = useState('');
    const [importRows, setImportRows] = useState<FeeImportEntry[]>([]);
    const [showCarryForwardDialog, setShowCarryForwardDialog] = useState(false);
    const [carryForwardForm, setCarryForwardForm] = useState({ fromYearId: '', toYearId: '' });
    const [editingFeeTypeId, setEditingFeeTypeId] = useState<string | null>(null);
    const [editingStructureId, setEditingStructureId] = useState<string | null>(null);
    const [searchQuery, setSearchQuery] = useState('');
    const [classFilter, setClassFilter] = useState('');
    const [sectionFilter, setSectionFilter] = useState('');
    const [structureSearchQuery, setStructureSearchQuery] = useState('');
    const [structureClassFilter, setStructureClassFilter] = useState('all');
    const [structureSectionFilter, setStructureSectionFilter] = useState('all');
    const [feeTypeSearchQuery, setFeeTypeSearchQuery] = useState('');
    const [selectedStudents, setSelectedStudents] = useState<string[]>([]);

    const [structureForm, setStructureForm] = useState({
        class: '',
        section: '',
        feeType: '',
        amount: '',
        frequency: 'monthly',
        description: '',
    });

    const [bulkAssignForm, setBulkAssignForm] = useState({
        class: '',
        section: '',
        feeType: '',
        dueDate: '',
    });
    const [feeTypeForm, setFeeTypeForm] = useState({
        name: '',
        description: '',
    });

    const [collectForm, setCollectForm] = useState({
        fee_id: '',
        amount: '',
        payment_method: 'cash',
        transaction_id: '',
    });
    const [revertForm, setRevertForm] = useState({
        reason: '',
    });

    useEffect(() => {
        if (flash.success) {
            toast.success(flash.success);
        }

        if (flash.error) {
            toast.error(flash.error);
        }
    }, [flash.error, flash.success]);

    const classOptions = useMemo(
        () =>
            Array.from(new Set(classRecords.map((record) => record.name))).sort((left, right) =>
                left.localeCompare(right, undefined, { numeric: true }),
            ),
        [classRecords],
    );

    const allSections = useMemo(
        () => Array.from(new Set(classRecords.map((record) => record.section))).sort(),
        [classRecords],
    );

    const availableFeeTypeOptions = useMemo(() => {
        const options = new Map<string, string>();

        feeTypes.forEach((feeType) => {
            if (isTransportFeeType(feeType.name)) {
                return;
            }
            options.set(feeType.name, feeType.name);
        });

        feeStructures.forEach((structure) => {
            if (isTransportFeeType(structure.feeType)) {
                return;
            }
            options.set(structure.feeType, structure.feeType);
        });

        return Array.from(options.values()).sort((left, right) => left.localeCompare(right));
    }, [feeStructures, feeTypes]);

    const filteredFeeTypes = useMemo(() => {
        const query = feeTypeSearchQuery.trim().toLowerCase();

        return feeTypes.filter((feeType) => {
            if (isTransportFeeType(feeType.name)) {
                return false;
            }

            if (!query) {
                return true;
            }

            return feeType.name.toLowerCase().includes(query) || feeType.description.toLowerCase().includes(query);
        });
    }, [feeTypeSearchQuery, feeTypes]);

    const sectionsForClass = (className: string) =>
        Array.from(
            new Set(classRecords.filter((record) => record.name === className).map((record) => record.section)),
        ).sort();

    useEffect(() => {
        if (!selectedStudent) {
            return;
        }

        setStudentFees(
            studentFeeRecords[selectedStudent.id] ?? {
                fees: [],
                payments: [],
                summary: { total_pending: 0, total_paid: 0 },
            },
        );
    }, [selectedStudent, studentFeeRecords]);

    const handleStudentSelect = async (student: any) => {
        setSelectedStudent(student);
        setStudentFees(
            studentFeeRecords[student.id] ?? {
                fees: [],
                payments: [],
                summary: { total_pending: 0, total_paid: 0 },
            },
        );
    };

    const handleCreateStructure = () => {
        const payload = {
            class: structureForm.class,
            section: structureForm.section,
            feeType: structureForm.feeType,
            amount: parseFloat(structureForm.amount || '0'),
            frequency: structureForm.frequency,
            description: structureForm.description,
        };

        if (editingStructureId) {
            router.patch(`/fees/structures/${editingStructureId}`, payload, {
                preserveScroll: true,
                onSuccess: closeStructureDialog,
            });
        } else {
            router.post('/fees/structures', payload, {
                preserveScroll: true,
                onSuccess: closeStructureDialog,
            });
        }
    };

    const closeFeeTypeDialog = () => {
        setShowFeeTypeDialog(false);
        setEditingFeeTypeId(null);
        setFeeTypeForm({
            name: '',
            description: '',
        });
    };

    const openCreateFeeTypeDialog = () => {
        setEditingFeeTypeId(null);
        setFeeTypeForm({
            name: '',
            description: '',
        });
        setShowFeeTypeDialog(true);
    };

    const openEditFeeTypeDialog = (feeType: FeeType) => {
        setEditingFeeTypeId(feeType.id);
        setFeeTypeForm({
            name: feeType.name,
            description: feeType.description,
        });
        setShowFeeTypeDialog(true);
    };

    const handleSaveFeeType = () => {
        const payload = {
            name: feeTypeForm.name,
            description: feeTypeForm.description,
        };

        if (editingFeeTypeId) {
            router.patch(`/fees/types/${editingFeeTypeId}`, payload, {
                preserveScroll: true,
                onSuccess: closeFeeTypeDialog,
            });
        } else {
            router.post('/fees/types', payload, {
                preserveScroll: true,
                onSuccess: closeFeeTypeDialog,
            });
        }
    };

    const handleDeleteFeeType = (feeTypeId: string) => {
        if (!window.confirm('Delete this fee type? Existing fee structures will keep their current fee type names.')) {
            return;
        }

        router.delete(`/fees/types/${feeTypeId}`, {
            preserveScroll: true,
        });
    };

    const closeStructureDialog = () => {
        setShowStructureDialog(false);
        setEditingStructureId(null);
        setStructureForm({
            class: '',
            section: '',
            feeType: '',
            amount: '',
            frequency: 'monthly',
            description: '',
        });
    };

    const openCreateStructureDialog = () => {
        setEditingStructureId(null);
        setStructureForm({
            class: '',
            section: '',
            feeType: '',
            amount: '',
            frequency: 'monthly',
            description: '',
        });
        setShowStructureDialog(true);
    };

    const openEditStructureDialog = (structure: FeeStructure) => {
        setEditingStructureId(structure.id);
        setStructureForm({
            class: structure.class,
            section: structure.section,
            feeType: structure.feeType,
            amount: String(structure.amount),
            frequency: structure.frequency,
            description: structure.description,
        });
        setShowStructureDialog(true);
    };

    const handleDeleteStructure = (structureId: string) => {
        if (!window.confirm('Delete this fee structure?')) {
            return;
        }

        router.delete(`/fees/structures/${structureId}`, {
            preserveScroll: true,
        });
    };

    const handleDuplicateStructure = (structure: FeeStructure) => {
        router.post(
            '/fees/structures',
            {
                class: structure.class,
                section: structure.section,
                feeType: structure.feeType,
                amount: structure.amount,
                frequency: structure.frequency,
                description: structure.description,
            },
            {
                preserveScroll: true,
            },
        );
    };

    const handleBulkAssign = () => {
        if (selectedStudents.length === 0) {
            toast.error('No students selected');
            return;
        }

        router.post(
            '/fees/assign',
            {
                feeType: Number(bulkAssignForm.feeType),
                dueDate: bulkAssignForm.dueDate,
                studentIds: selectedStudents.map((id) => Number(id)),
            },
            {
                preserveScroll: true,
                onSuccess: () => {
                    setShowBulkAssignDialog(false);
                    setSelectedStudents([]);
                    setBulkAssignForm({
                        class: '',
                        section: '',
                        feeType: '',
                        dueDate: '',
                    });
                },
            },
        );
    };

    const parseImportText = (raw: string): FeeImportEntry[] => {
        const rows: FeeImportEntry[] = [];
        raw.split(/\r?\n/)
            .map((line) => line.trim())
            .filter((line) => line.length > 0)
            .forEach((line) => {
                const cols = line.split(/[,;\t]+/).map((col) => col.trim());
                const firstLower = (cols[0] ?? '').toLowerCase();
                if (firstLower.includes('admission') || firstLower.includes('student') || firstLower.includes('roll')) {
                    return;
                }
                if (cols.length < 4) {
                    return;
                }
                rows.push({
                    studentIdentifier: cols[0],
                    feeType: cols[1],
                    dueDate: cols[2],
                    amount: Number(cols[3]),
                    discount: cols[4] !== undefined && cols[4] !== '' ? Number(cols[4]) : null,
                    paidAmount: cols[5] !== undefined && cols[5] !== '' ? Number(cols[5]) : null,
                    month: cols[6] !== undefined && cols[6] !== '' ? cols[6] : null,
                    year: cols[7] !== undefined && cols[7] !== '' ? Number(cols[7]) : null,
                    fine: cols[8] !== undefined && cols[8] !== '' ? Number(cols[8]) : null,
                });
            });
        return rows;
    };

    const handleImportTextChange = (value: string) => {
        setImportText(value);
        setImportRows(parseImportText(value));
    };

    const handleImportFees = () => {
        if (importRows.length === 0) {
            toast.error(
                importText
                    ? 'No valid rows found — expected format: admission, fee type, due date, amount'
                    : 'Paste fee rows first',
            );
            return;
        }

        router.post('/fees/import', { entries: importRows } as unknown as RequestPayload, {
            preserveScroll: true,
            onSuccess: () => {
                setShowImportDialog(false);
                setImportText('');
                setImportRows([]);
            },
        });
    };

    const handleCarryForward = () => {
        if (!carryForwardForm.fromYearId || !carryForwardForm.toYearId) {
            toast.error('Select both source and target sessions');
            return;
        }

        router.post(
            '/fees/carry-forward',
            {
                fromYearId: Number(carryForwardForm.fromYearId),
                toYearId: Number(carryForwardForm.toYearId),
            },
            {
                preserveScroll: true,
                onSuccess: () => {
                    setShowCarryForwardDialog(false);
                    setCarryForwardForm({ fromYearId: '', toYearId: '' });
                },
            },
        );
    };

    const handleCollectFee = async (e: React.FormEvent) => {
        e.preventDefault();

        if (!activeFee) {
            toast.error('Select a fee to collect payment');
            return;
        }

        const paymentAmount = parseFloat(collectForm.amount);

        if (Number.isNaN(paymentAmount) || paymentAmount <= 0) {
            toast.error('Enter a valid payment amount');
            return;
        }

        if (paymentAmount > activeFee.due_amount) {
            toast.error('Payment amount cannot exceed the pending balance');
            return;
        }

        router.post(
            '/fees/payments',
            {
                fee_id: collectForm.fee_id,
                amount: paymentAmount,
                payment_method: collectForm.payment_method,
                transaction_id: collectForm.transaction_id || `TXN-${Date.now()}`,
            },
            {
                preserveScroll: true,
                onSuccess: () => {
                    setShowCollectDialog(false);
                    setActiveFee(null);
                    setCollectForm({
                        fee_id: '',
                        amount: '',
                        payment_method: 'cash',
                        transaction_id: '',
                    });
                },
            },
        );
    };

    const handleRevertPayment = async (e: React.FormEvent) => {
        e.preventDefault();

        if (!activePayment) {
            toast.error('Select a payment to revert');
            return;
        }

        if (!revertForm.reason.trim()) {
            toast.error('Enter a reason to revert the payment');
            return;
        }

        router.post(
            `/fees/payments/${activePayment.id}/revert`,
            {
                reason: revertForm.reason.trim(),
            },
            {
                preserveScroll: true,
                onSuccess: closeRevertDialog,
            },
        );
    };

    const openCollectDialog = (fee: any) => {
        setActiveFee(fee);
        setCollectForm({
            fee_id: fee.id,
            amount: fee.due_amount.toString(),
            payment_method: 'cash',
            transaction_id: '',
        });
        setShowCollectDialog(true);
    };

    const closeCollectDialog = () => {
        setShowCollectDialog(false);
        setActiveFee(null);
        setCollectForm({
            fee_id: '',
            amount: '',
            payment_method: 'cash',
            transaction_id: '',
        });
    };

    const openRevertDialog = (payment: any) => {
        setActivePayment(payment);
        setRevertForm({ reason: '' });
        setShowRevertDialog(true);
    };

    const closeRevertDialog = () => {
        setShowRevertDialog(false);
        setActivePayment(null);
        setRevertForm({ reason: '' });
    };

    const handleApprovePending = (payment: any) => {
        if (!window.confirm('Confirm this pending online payment?')) {
            return;
        }

        router.post(
            `/fees/payments/${payment.id}/approve`,
            {},
            {
                preserveScroll: true,
            },
        );
    };

    const handlePrintReceipt = (payment: any, relatedFee: any) => {
        if (!selectedStudent) {
            toast.error('Select a student before printing a receipt');
            return;
        }

        const receiptWindow = window.open('', '_blank', 'width=900,height=700');

        if (!receiptWindow) {
            toast.error('Popup blocked. Please allow popups to print the receipt.');
            return;
        }

        const receiptNumber = `RCT-${payment.id}`;
        const feeType = relatedFee?.fee_type || 'General Fee';
        const statusLabel = payment.status === 'reverted' ? 'Reverted' : 'Active';
        const schoolName = organization?.name || 'School Name';
        const schoolLogo = organization?.logo || '';
        const revertDetails =
            payment.status === 'reverted'
                ? `
        <div class="row">
          <span>Reverted On</span>
          <strong>${payment.reverted_at || '-'}</strong>
        </div>
        <div class="row">
          <span>Reverted By</span>
          <strong>${payment.reverted_by || '-'}</strong>
        </div>
        <div class="row">
          <span>Revert Reason</span>
          <strong>${payment.revert_reason || '-'}</strong>
        </div>
      `
                : '';

        receiptWindow.document.write(`
      <!DOCTYPE html>
      <html lang="en">
        <head>
          <meta charset="UTF-8" />
          <meta name="viewport" content="width=device-width, initial-scale=1.0" />
          <title>Fee Receipt ${receiptNumber}</title>
          <style>
            body {
              font-family: Arial, sans-serif;
              margin: 0;
              padding: 32px;
              color: #0f172a;
              background: #f8fafc;
              position: relative;
            }
            .receipt {
              max-width: 760px;
              margin: 0 auto;
              background: #ffffff;
              border: 1px solid #cbd5e1;
              border-radius: 16px;
              padding: 32px;
              position: relative;
              overflow: hidden;
            }
            .watermark {
              position: absolute;
              inset: 0;
              display: flex;
              align-items: center;
              justify-content: center;
              font-size: 64px;
              font-weight: 800;
              letter-spacing: 0.24em;
              color: rgba(15, 23, 42, 0.05);
              transform: rotate(-28deg);
              text-transform: uppercase;
              pointer-events: none;
              user-select: none;
            }
            .header {
              display: flex;
              justify-content: space-between;
              align-items: flex-start;
              gap: 24px;
              border-bottom: 2px solid #e2e8f0;
              padding-bottom: 20px;
              margin-bottom: 24px;
              position: relative;
              z-index: 1;
            }
            .brand {
              display: flex;
              align-items: center;
              gap: 16px;
            }
            .brand-logo {
              width: 72px;
              height: 72px;
              max-width: 72px;
              max-height: 72px;
              border-radius: 16px;
              object-fit: contain;
              object-position: center;
              border: 1px solid #cbd5e1;
              background: #ffffff;
              padding: 8px;
              box-sizing: border-box;
            }
            .brand-copy {
              display: flex;
              flex-direction: column;
              gap: 4px;
            }
            .school-name {
              margin: 0;
              font-size: 24px;
              font-weight: 800;
              color: #0f172a;
            }
            .title {
              margin: 0;
              font-size: 28px;
            }
            .subtitle {
              margin: 6px 0 0;
              color: #475569;
            }
            .status {
              display: inline-block;
              padding: 8px 14px;
              border-radius: 999px;
              background: ${payment.status === 'reverted' ? '#e2e8f0' : '#dcfce7'};
              color: ${payment.status === 'reverted' ? '#475569' : '#166534'};
              font-weight: 700;
              font-size: 13px;
            }
            .section {
              margin-top: 24px;
              position: relative;
              z-index: 1;
            }
            .section h2 {
              font-size: 16px;
              margin: 0 0 12px;
            }
            .grid {
              display: grid;
              grid-template-columns: 1fr 1fr;
              gap: 12px 24px;
            }
            .row {
              display: flex;
              justify-content: space-between;
              gap: 12px;
              padding: 10px 0;
              border-bottom: 1px solid #e2e8f0;
            }
            .row span {
              color: #475569;
            }
            .amount-box {
              margin-top: 24px;
              padding: 18px 20px;
              border-radius: 14px;
              background: #eff6ff;
              border: 1px solid #bfdbfe;
              display: flex;
              justify-content: space-between;
              align-items: center;
              position: relative;
              z-index: 1;
            }
            .amount-box strong {
              font-size: 24px;
            }
            .footer {
              margin-top: 30px;
              color: #64748b;
              font-size: 13px;
              text-align: center;
              position: relative;
              z-index: 1;
            }
            @media print {
              body {
                background: #ffffff;
                padding: 0;
              }
              .receipt {
                border: none;
                border-radius: 0;
                padding: 0;
              }
            }
          </style>
        </head>
        <body>
          <div class="receipt">
            <div class="watermark">${schoolName}</div>
            <div class="header">
              <div class="brand">
                ${schoolLogo ? `<img src="${schoolLogo}" alt="${schoolName} logo" class="brand-logo" />` : ''}
                <div class="brand-copy">
                  <p class="school-name">${schoolName}</p>
                  <h1 class="title">Fee Receipt</h1>
                  <p class="subtitle">Receipt No: ${receiptNumber}</p>
                </div>
              </div>
              <div class="status">${statusLabel}</div>
            </div>

            <div class="section">
              <h2>Student Details</h2>
              <div class="grid">
                <div class="row">
                  <span>Name</span>
                  <strong>${selectedStudent.first_name} ${selectedStudent.last_name}</strong>
                </div>
                <div class="row">
                  <span>Admission No.</span>
                  <strong>${selectedStudent.admission_no || '-'}</strong>
                </div>
                <div class="row">
                  <span>Class</span>
                  <strong>${selectedStudent.class}-${selectedStudent.section}</strong>
                </div>
                <div class="row">
                  <span>Roll No.</span>
                  <strong>${selectedStudent.roll_number || '-'}</strong>
                </div>
              </div>
            </div>

            <div class="section">
              <h2>Payment Details</h2>
              <div class="grid">
                <div class="row">
                  <span>Fee Type</span>
                  <strong>${feeType}</strong>
                </div>
                <div class="row">
                  <span>Payment Date</span>
                  <strong>${payment.payment_date || '-'}</strong>
                </div>
                <div class="row">
                  <span>Payment Method</span>
                  <strong>${String(payment.payment_method || '-').replace('_', ' ')}</strong>
                </div>
                <div class="row">
                  <span>Transaction ID</span>
                  <strong>${payment.transaction_id || '-'}</strong>
                </div>
                <div class="row">
                  <span>Collected By</span>
                  <strong>${payment.collected_by || '-'}</strong>
                </div>
                <div class="row">
                  <span>Due Date</span>
                  <strong>${relatedFee?.due_date || '-'}</strong>
                </div>
              </div>
            </div>

            ${revertDetails ? `<div class="section"><h2>Reversal Details</h2>${revertDetails}</div>` : ''}

            <div class="amount-box">
              <span>Amount Received</span>
              <strong>${formatCurrency(payment.amount || 0)}</strong>
            </div>

            <div class="footer">
              This is a system-generated fee receipt.
            </div>
          </div>
          <script>
            window.onload = function () {
              window.print();
            };
          </script>
        </body>
      </html>
    `);

        receiptWindow.document.close();
    };

    const formatCurrency = (amount: number) => {
        return new Intl.NumberFormat('en-IN', {
            style: 'currency',
            currency: 'INR',
            maximumFractionDigits: 0,
        }).format(amount);
    };

    const toggleStudentSelection = (studentId: string) => {
        if (selectedStudents.includes(studentId)) {
            setSelectedStudents(selectedStudents.filter((id) => id !== studentId));
        } else {
            setSelectedStudents([...selectedStudents, studentId]);
        }
    };

    const getBulkAssignableStudents = () => {
        return students.filter(
            (student) => student.class === bulkAssignForm.class && student.section === bulkAssignForm.section,
        );
    };

    const selectAllFilteredStudents = () => {
        const assignableStudents = getBulkAssignableStudents();
        setSelectedStudents(assignableStudents.map((student) => student.id));
    };

    const getFilteredStudents = () => {
        return students.filter((s) => {
            const matchesSearch =
                `${s.first_name} ${s.last_name}`.toLowerCase().includes(searchQuery.toLowerCase()) ||
                s.admission_no?.toLowerCase().includes(searchQuery.toLowerCase());
            const matchesClass = !classFilter || classFilter === 'all' || s.class === classFilter;
            const matchesSection = !sectionFilter || sectionFilter === 'all' || s.section === sectionFilter;
            return matchesSearch && matchesClass && matchesSection;
        });
    };

    const filteredStudents = getFilteredStudents();

    const getClassSectionSummary = () => {
        const summary: Record<
            string,
            {
                total: number;
                collected: number;
                pending: number;
                students: number;
            }
        > = {};

        students.forEach((student) => {
            const key = `${student.class}-${student.section}`;
            if (!summary[key]) {
                summary[key] = {
                    total: 0,
                    collected: 0,
                    pending: 0,
                    students: 0,
                };
            }
            summary[key].students += 1;
            const feeRecord = studentFeeRecords[student.id];
            const total = feeRecord?.fees?.reduce((sum: number, fee: any) => sum + (fee.total_amount || 0), 0) || 0;
            summary[key].total += total;
            summary[key].collected += feeRecord?.summary?.total_paid || 0;
            summary[key].pending += feeRecord?.summary?.total_pending || 0;
        });

        return summary;
    };

    const classSectionSummary = getClassSectionSummary();

    const getStructuresForClass = (className: string, section: string) => {
        return feeStructures.filter(
            (s) => s.class === className && s.section === section && !isTransportFeeType(s.feeType),
        );
    };

    const visibleFeeStructures = feeStructures.filter((structure) => !isTransportFeeType(structure.feeType));

    const selectedBulkStructure = bulkAssignForm.feeType
        ? (visibleFeeStructures.find((structure) => structure.id === bulkAssignForm.feeType) ?? null)
        : null;

    const getAssignedFeeLabelsForStudent = (studentId: string) => {
        return (studentFeeRecords[studentId]?.fees || [])
            .map((fee: any) => String(fee.fee_type))
            .filter((feeType: string) => !isTransportFeeType(feeType));
    };

    const hasSelectedFeeAssigned = (studentId: string) => {
        if (!selectedBulkStructure) {
            return false;
        }

        return getAssignedFeeLabelsForStudent(studentId).includes(selectedBulkStructure.feeType);
    };

    const filteredStructures = visibleFeeStructures
        .filter((structure) => {
            const matchesSearch =
                !structureSearchQuery.trim() ||
                structure.feeType.toLowerCase().includes(structureSearchQuery.toLowerCase()) ||
                structure.description.toLowerCase().includes(structureSearchQuery.toLowerCase());
            const matchesClass = structureClassFilter === 'all' || structure.class === structureClassFilter;
            const matchesSection = structureSectionFilter === 'all' || structure.section === structureSectionFilter;
            return matchesSearch && matchesClass && matchesSection;
        })
        .sort((a, b) => {
            if (a.class !== b.class) return parseInt(a.class) - parseInt(b.class);
            if (a.section !== b.section) return a.section.localeCompare(b.section);
            return a.feeType.localeCompare(b.feeType);
        });

    const visibleStudentFees = (studentFees?.fees || []).filter(
        (fee: any) => !isTransportFeeType(String(fee.fee_type || '')),
    );
    const visibleStudentPayments = (studentFees?.payments || []).filter((payment: any) =>
        visibleStudentFees.some((fee: any) => fee.id === payment.fee_id),
    );

    return (
        <DashboardLayout user={user} activeTab="fees">
            <div className="p-8">
                <div className="flex items-center justify-between mb-6">
                    <div>
                        <h1 className="text-3xl font-bold text-gray-900">{t('Fee Management')}</h1>
                        <p className="text-gray-600 mt-1">{t('Manage class-wise fee structures and collections')}</p>
                    </div>
                    <div className="flex gap-2">
                        <Dialog
                            open={showFeeTypeDialog}
                            onOpenChange={(open) => (open ? setShowFeeTypeDialog(true) : closeFeeTypeDialog())}
                        >
                            <DialogTrigger asChild>
                                <Button variant="outline" className="gap-2" onClick={openCreateFeeTypeDialog}>
                                    <Settings className="w-4 h-4" />
                                    {t('Fee Types')}
                                </Button>
                            </DialogTrigger>
                            <DialogContent className="max-w-lg">
                                <DialogHeader>
                                    <DialogTitle>
                                        {editingFeeTypeId ? t('Edit Fee Type') : t('Create Fee Type')}
                                    </DialogTitle>
                                    <DialogDescription>
                                        {t('Manage reusable fee types for fee structures and fee assignment.')}
                                    </DialogDescription>
                                </DialogHeader>
                                <div className="space-y-4">
                                    <div className="space-y-2">
                                        <Label>{t('Name')}</Label>
                                        <Input
                                            value={feeTypeForm.name}
                                            onChange={(e) =>
                                                setFeeTypeForm({
                                                    ...feeTypeForm,
                                                    name: e.target.value,
                                                })
                                            }
                                            placeholder={t('e.g. Tuition Fee')}
                                        />
                                    </div>
                                    <div className="space-y-2">
                                        <Label>{t('Description')}</Label>
                                        <Input
                                            value={feeTypeForm.description}
                                            onChange={(e) =>
                                                setFeeTypeForm({
                                                    ...feeTypeForm,
                                                    description: e.target.value,
                                                })
                                            }
                                            placeholder={t('Optional short description')}
                                        />
                                    </div>
                                </div>
                                <DialogFooter>
                                    <Button variant="outline" onClick={closeFeeTypeDialog}>
                                        {t('Cancel')}
                                    </Button>
                                    <Button onClick={handleSaveFeeType} disabled={!feeTypeForm.name.trim()}>
                                        {editingFeeTypeId ? t('Update Fee Type') : t('Create Fee Type')}
                                    </Button>
                                </DialogFooter>
                            </DialogContent>
                        </Dialog>

                        <Dialog
                            open={showStructureDialog}
                            onOpenChange={(open) => (open ? setShowStructureDialog(true) : closeStructureDialog())}
                        >
                            <DialogTrigger asChild>
                                <Button variant="outline" className="gap-2" onClick={openCreateStructureDialog}>
                                    <Settings className="w-4 h-4" />
                                    {t('Fee Structure')}
                                </Button>
                            </DialogTrigger>
                            <DialogContent>
                                <DialogHeader>
                                    <DialogTitle>
                                        {editingStructureId ? t('Edit Fee Structure') : t('Create Fee Structure')}
                                    </DialogTitle>
                                    <DialogDescription>
                                        {editingStructureId
                                            ? t('Update the fee structure details for this class and section')
                                            : t('Define fee structure for a specific class and section')}
                                    </DialogDescription>
                                </DialogHeader>
                                <div className="space-y-4">
                                    <div className="grid grid-cols-2 gap-4">
                                        <div className="space-y-2">
                                            <Label>{t('Class')}</Label>
                                            <Select
                                                value={structureForm.class}
                                                onValueChange={(v) =>
                                                    setStructureForm({
                                                        ...structureForm,
                                                        class: v,
                                                    })
                                                }
                                            >
                                                <SelectTrigger>
                                                    <SelectValue placeholder={t('Select class')} />
                                                </SelectTrigger>
                                                <SelectContent>
                                                    {classOptions.map((c) => (
                                                        <SelectItem key={c} value={c}>
                                                            {c}
                                                        </SelectItem>
                                                    ))}
                                                </SelectContent>
                                            </Select>
                                        </div>
                                        <div className="space-y-2">
                                            <Label>{t('Section')}</Label>
                                            <Select
                                                value={structureForm.section}
                                                onValueChange={(v) =>
                                                    setStructureForm({
                                                        ...structureForm,
                                                        section: v,
                                                    })
                                                }
                                            >
                                                <SelectTrigger>
                                                    <SelectValue placeholder={t('Select section')} />
                                                </SelectTrigger>
                                                <SelectContent>
                                                    {sectionsForClass(structureForm.class).map((s) => (
                                                        <SelectItem key={s} value={s}>
                                                            {t('Section')}
                                                            {s}
                                                        </SelectItem>
                                                    ))}
                                                </SelectContent>
                                            </Select>
                                        </div>
                                    </div>
                                    <div className="space-y-2">
                                        <Label>{t('Fee Type')}</Label>
                                        <Select
                                            value={structureForm.feeType}
                                            onValueChange={(v) =>
                                                setStructureForm({
                                                    ...structureForm,
                                                    feeType: v,
                                                })
                                            }
                                        >
                                            <SelectTrigger>
                                                <SelectValue placeholder={t('Select fee type')} />
                                            </SelectTrigger>
                                            <SelectContent>
                                                {availableFeeTypeOptions.map((feeType) => (
                                                    <SelectItem key={feeType} value={feeType}>
                                                        {feeType}
                                                    </SelectItem>
                                                ))}
                                            </SelectContent>
                                        </Select>
                                    </div>
                                    <div className="space-y-2">
                                        <Label>{t('Amount (₹)')}</Label>
                                        <Input
                                            type="number"
                                            value={structureForm.amount}
                                            onChange={(e) =>
                                                setStructureForm({
                                                    ...structureForm,
                                                    amount: e.target.value,
                                                })
                                            }
                                            placeholder={t('Enter amount')}
                                        />
                                    </div>
                                    <div className="space-y-2">
                                        <Label>{t('Frequency')}</Label>
                                        <Select
                                            value={structureForm.frequency}
                                            onValueChange={(v) =>
                                                setStructureForm({
                                                    ...structureForm,
                                                    frequency: v,
                                                })
                                            }
                                        >
                                            <SelectTrigger>
                                                <SelectValue />
                                            </SelectTrigger>
                                            <SelectContent>
                                                <SelectItem value="monthly">{t('Monthly')}</SelectItem>
                                                <SelectItem value="quarterly">{t('Quarterly')}</SelectItem>
                                                <SelectItem value="annually">{t('Annually')}</SelectItem>
                                                <SelectItem value="one-time">{t('One Time')}</SelectItem>
                                            </SelectContent>
                                        </Select>
                                    </div>
                                    <div className="space-y-2">
                                        <Label>{t('Description')}</Label>
                                        <Input
                                            value={structureForm.description}
                                            onChange={(e) =>
                                                setStructureForm({
                                                    ...structureForm,
                                                    description: e.target.value,
                                                })
                                            }
                                            placeholder={t('Brief description')}
                                        />
                                    </div>
                                </div>
                                <DialogFooter>
                                    <Button variant="outline" onClick={closeStructureDialog}>
                                        {t('Cancel')}
                                    </Button>
                                    <Button
                                        onClick={handleCreateStructure}
                                        disabled={
                                            !structureForm.class ||
                                            !structureForm.section ||
                                            !structureForm.feeType ||
                                            !structureForm.amount
                                        }
                                    >
                                        {editingStructureId ? t('Update Structure') : t('Create Structure')}
                                    </Button>
                                </DialogFooter>
                            </DialogContent>
                        </Dialog>

                        <Dialog open={showBulkAssignDialog} onOpenChange={setShowBulkAssignDialog}>
                            <DialogTrigger asChild>
                                <Button className="gap-2">
                                    <Users className="w-4 h-4" />
                                    {t('Bulk Assign')}
                                </Button>
                            </DialogTrigger>
                            <DialogContent className="max-w-4xl">
                                <DialogHeader>
                                    <DialogTitle>{t('Bulk Fee Assignment')}</DialogTitle>
                                    <DialogDescription>
                                        {t('Assign fees to multiple students by class and section')}
                                    </DialogDescription>
                                </DialogHeader>
                                <div className="space-y-4">
                                    <div className="grid grid-cols-3 gap-4">
                                        <div className="space-y-2">
                                            <Label>{t('Class')}</Label>
                                            <Select
                                                value={bulkAssignForm.class}
                                                onValueChange={(v) => {
                                                    setBulkAssignForm({
                                                        ...bulkAssignForm,
                                                        class: v,
                                                        section: '',
                                                        feeType: '',
                                                    });
                                                    setSelectedStudents([]);
                                                }}
                                            >
                                                <SelectTrigger>
                                                    <SelectValue placeholder={t('Select class')} />
                                                </SelectTrigger>
                                                <SelectContent>
                                                    {classOptions.map((c) => (
                                                        <SelectItem key={c} value={c}>
                                                            {c}
                                                        </SelectItem>
                                                    ))}
                                                </SelectContent>
                                            </Select>
                                        </div>
                                        <div className="space-y-2">
                                            <Label>{t('Section')}</Label>
                                            <Select
                                                value={bulkAssignForm.section}
                                                onValueChange={(v) => {
                                                    setBulkAssignForm({
                                                        ...bulkAssignForm,
                                                        section: v,
                                                        feeType: '',
                                                    });
                                                    setSelectedStudents([]);
                                                }}
                                                disabled={!bulkAssignForm.class}
                                            >
                                                <SelectTrigger>
                                                    <SelectValue placeholder={t('Select section')} />
                                                </SelectTrigger>
                                                <SelectContent>
                                                    {sectionsForClass(bulkAssignForm.class).map((s) => (
                                                        <SelectItem key={s} value={s}>
                                                            {t('Section')}
                                                            {s}
                                                        </SelectItem>
                                                    ))}
                                                </SelectContent>
                                            </Select>
                                        </div>
                                        <div className="space-y-2">
                                            <Label>{t('Fee Type')}</Label>
                                            <Select
                                                value={bulkAssignForm.feeType}
                                                onValueChange={(v) =>
                                                    setBulkAssignForm({
                                                        ...bulkAssignForm,
                                                        feeType: v,
                                                    })
                                                }
                                                disabled={!bulkAssignForm.class || !bulkAssignForm.section}
                                            >
                                                <SelectTrigger>
                                                    <SelectValue placeholder={t('Select fee')} />
                                                </SelectTrigger>
                                                <SelectContent>
                                                    {getStructuresForClass(
                                                        bulkAssignForm.class,
                                                        bulkAssignForm.section,
                                                    ).map((structure) => (
                                                        <SelectItem key={structure.id} value={structure.id}>
                                                            {structure.feeType} - {formatCurrency(structure.amount)} (
                                                            {structure.frequency})
                                                        </SelectItem>
                                                    ))}
                                                </SelectContent>
                                            </Select>
                                        </div>
                                    </div>
                                    <div className="space-y-2">
                                        <Label>{t('Due Date')}</Label>
                                        <Input
                                            type="date"
                                            value={bulkAssignForm.dueDate}
                                            onChange={(e) =>
                                                setBulkAssignForm({
                                                    ...bulkAssignForm,
                                                    dueDate: e.target.value,
                                                })
                                            }
                                        />
                                    </div>
                                    {bulkAssignForm.class && bulkAssignForm.section && (
                                        <div className="space-y-2">
                                            <div className="flex items-center justify-between">
                                                <Label>
                                                    {t('Select Students ({count} selected)', {
                                                        count: selectedStudents.length,
                                                    })}
                                                </Label>
                                                <Button
                                                    type="button"
                                                    variant="outline"
                                                    size="sm"
                                                    onClick={selectAllFilteredStudents}
                                                >
                                                    {t('Select All (')}
                                                    {getBulkAssignableStudents().length})
                                                </Button>
                                            </div>
                                            <ScrollArea className="h-64 border rounded-md p-4">
                                                <div className="space-y-2">
                                                    {getBulkAssignableStudents().map((student) => (
                                                        <div
                                                            key={student.id}
                                                            className="flex items-center space-x-2 p-2 hover:bg-gray-50 rounded"
                                                        >
                                                            <Checkbox
                                                                checked={selectedStudents.includes(student.id)}
                                                                onCheckedChange={() =>
                                                                    toggleStudentSelection(student.id)
                                                                }
                                                            />

                                                            <div className="flex-1">
                                                                <p className="font-medium text-sm">
                                                                    {student.first_name} {student.last_name}
                                                                </p>
                                                                <p className="text-xs text-gray-600">
                                                                    {student.admission_no}
                                                                    {t('| Roll No:')}
                                                                    {student.roll_number || t('N/A')}
                                                                </p>
                                                                <p className="text-xs text-gray-500">
                                                                    {t('Assigned Fees:')}
                                                                    {getAssignedFeeLabelsForStudent(student.id).join(
                                                                        ', ',
                                                                    ) || t('None')}
                                                                </p>
                                                                {hasSelectedFeeAssigned(student.id) && (
                                                                    <p className="text-xs font-medium text-blue-600">
                                                                        {t('Selected fee already assigned')}
                                                                    </p>
                                                                )}
                                                            </div>
                                                        </div>
                                                    ))}
                                                </div>
                                            </ScrollArea>
                                        </div>
                                    )}
                                </div>
                                <DialogFooter>
                                    <Button variant="outline" onClick={() => setShowBulkAssignDialog(false)}>
                                        {t('Cancel')}
                                    </Button>
                                    <Button
                                        onClick={handleBulkAssign}
                                        disabled={
                                            selectedStudents.length === 0 ||
                                            !bulkAssignForm.feeType ||
                                            !bulkAssignForm.dueDate
                                        }
                                    >
                                        {t('Assign to')}

                                        {selectedStudents.length}
                                        {t('Students')}
                                    </Button>
                                </DialogFooter>
                            </DialogContent>
                        </Dialog>

                        <Dialog open={showImportDialog} onOpenChange={setShowImportDialog}>
                            <DialogTrigger asChild>
                                <Button variant="outline" className="gap-2">
                                    <Upload className="w-4 h-4" />
                                    {t('Import Fees')}
                                </Button>
                            </DialogTrigger>
                            <DialogContent className="max-w-3xl">
                                <DialogHeader>
                                    <DialogTitle>{t('Import Fee Records')}</DialogTitle>
                                    <DialogDescription>
                                        {t(
                                            'Paste fee rows in the format: admission no, fee type, due date, amount, paid amount, month, year',
                                        )}
                                    </DialogDescription>
                                </DialogHeader>
                                <div className="space-y-4">
                                    <div className="rounded-md bg-muted/40 p-3 text-xs text-muted-foreground">
                                        <p className="font-medium text-foreground">{t('Example')}</p>
                                        <pre className="mt-1 whitespace-pre-wrap text-xs">
                                            {`ADM-1001, Tuition Fee, 2026-08-10, 5000, 0, August, 2026`}
                                            {`
ADM-1002, Tuition Fee, 2026-08-10, 5000, 2000, August, 2026`}
                                        </pre>
                                    </div>
                                    <textarea
                                        className="min-h-[140px] w-full rounded-md border border-input bg-background px-3 py-2 text-sm font-mono"
                                        placeholder="ADM-1001, Tuition Fee, 2026-08-10, 5000, 0, August, 2026&#10;ADM-1002, Tuition Fee, 2026-08-10, 5000, 2000, August, 2026"
                                        value={importText}
                                        onChange={(event) => handleImportTextChange(event.target.value)}
                                    />
                                    {importRows.length > 0 && (
                                        <div className="rounded-md border">
                                            <div className="flex items-center justify-between border-b px-3 py-2 text-xs font-medium text-muted-foreground">
                                                <span>
                                                    {importRows.length} {t('rows ready to import')}
                                                </span>
                                                <span>
                                                    {t('Total')}:{' '}
                                                    {formatCurrency(
                                                        importRows.reduce((sum, row) => sum + (row.amount || 0), 0),
                                                    )}
                                                </span>
                                            </div>
                                            <ScrollArea className="h-44">
                                                {importRows.map((row, index) => (
                                                    <div
                                                        key={index}
                                                        className="flex items-center justify-between border-b px-3 py-1.5 text-sm last:border-0"
                                                    >
                                                        <span className="font-medium">{row.studentIdentifier}</span>
                                                        <span className="text-muted-foreground">
                                                            {row.feeType} · {row.dueDate}
                                                        </span>
                                                        <span>₹{row.amount}</span>
                                                        <span className="text-muted-foreground">
                                                            {row.paidAmount ? `paid ₹${row.paidAmount}` : ''}
                                                        </span>
                                                    </div>
                                                ))}
                                            </ScrollArea>
                                        </div>
                                    )}
                                    {feeImportResult ? (
                                        <div className="rounded-md border bg-muted/30 p-3 text-sm">
                                            <p className="font-medium">
                                                {t('Imported')} {feeImportResult.imported} · {t('Skipped')}{' '}
                                                {feeImportResult.skipped} · {t('Failed')} {feeImportResult.failed}
                                            </p>
                                            {feeImportResult.failures.length > 0 && (
                                                <ul className="mt-2 list-disc space-y-1 pl-4 text-xs text-muted-foreground">
                                                    {feeImportResult.failures.map((failure, index) => (
                                                        <li key={index}>
                                                            {t('Row')} {failure.row}: {failure.reason}
                                                        </li>
                                                    ))}
                                                </ul>
                                            )}
                                        </div>
                                    ) : null}
                                </div>
                                <DialogFooter>
                                    <Button variant="outline" onClick={() => setShowImportDialog(false)}>
                                        {t('Cancel')}
                                    </Button>
                                    <Button onClick={handleImportFees} disabled={importRows.length === 0}>
                                        <Upload className="mr-2 h-4 w-4" />
                                        {t('Import')} {importRows.length} {t('rows')}
                                    </Button>
                                </DialogFooter>
                            </DialogContent>
                        </Dialog>

                        <Dialog open={showCarryForwardDialog} onOpenChange={setShowCarryForwardDialog}>
                            <DialogTrigger asChild>
                                <Button variant="outline" className="gap-2">
                                    <RotateCcw className="w-4 h-4" />
                                    {t('Carry Forward')}
                                </Button>
                            </DialogTrigger>
                            <DialogContent className="max-w-lg">
                                <DialogHeader>
                                    <DialogTitle>{t('Carry Forward Fees')}</DialogTitle>
                                    <DialogDescription>
                                        {t(
                                            'Move outstanding fee balances from a previous session into the target session',
                                        )}
                                    </DialogDescription>
                                </DialogHeader>
                                <div className="grid gap-4">
                                    <div className="space-y-2">
                                        <Label>{t('From Session')}</Label>
                                        <Select
                                            value={carryForwardForm.fromYearId}
                                            onValueChange={(value) =>
                                                setCarryForwardForm({
                                                    ...carryForwardForm,
                                                    fromYearId: value,
                                                    ...(value === carryForwardForm.toYearId ? { toYearId: '' } : {}),
                                                })
                                            }
                                        >
                                            <SelectTrigger>
                                                <SelectValue placeholder={t('Select source session')} />
                                            </SelectTrigger>
                                            <SelectContent>
                                                {academicSessions.map((session) => (
                                                    <SelectItem key={session.id} value={session.id}>
                                                        {session.name}
                                                        {session.isCurrent ? ` (${t('Current')})` : ''}
                                                    </SelectItem>
                                                ))}
                                            </SelectContent>
                                        </Select>
                                    </div>
                                    <div className="space-y-2">
                                        <Label>{t('To Session')}</Label>
                                        <Select
                                            value={carryForwardForm.toYearId}
                                            onValueChange={(value) =>
                                                setCarryForwardForm({ ...carryForwardForm, toYearId: value })
                                            }
                                        >
                                            <SelectTrigger>
                                                <SelectValue placeholder={t('Select target session')} />
                                            </SelectTrigger>
                                            <SelectContent>
                                                {academicSessions
                                                    .filter((session) => session.id !== carryForwardForm.fromYearId)
                                                    .map((session) => (
                                                        <SelectItem key={session.id} value={session.id}>
                                                            {session.name}
                                                            {session.isCurrent ? ` (${t('Current')})` : ''}
                                                        </SelectItem>
                                                    ))}
                                            </SelectContent>
                                        </Select>
                                    </div>
                                    <div className="rounded-md border bg-muted/30 p-3 text-xs text-muted-foreground">
                                        {t(
                                            'Only balances that are still outstanding in the source session will be carried forward.',
                                        )}
                                    </div>
                                    {feeCarryForwardResult ? (
                                        <div className="rounded-md border bg-emerald-50 p-3 text-sm">
                                            <p className="font-medium text-emerald-800">
                                                {feeCarryForwardResult.carried} {t('fees carried forward')} ·{' '}
                                                {feeCarryForwardResult.skipped} {t('skipped')}
                                            </p>
                                            <p className="mt-1 text-emerald-700">
                                                {formatCurrency(feeCarryForwardResult.totalAmount)} ·{' '}
                                                {feeCarryForwardResult.fromSession} → {feeCarryForwardResult.toSession}
                                            </p>
                                        </div>
                                    ) : null}
                                </div>
                                <DialogFooter>
                                    <Button variant="outline" onClick={() => setShowCarryForwardDialog(false)}>
                                        {t('Cancel')}
                                    </Button>
                                    <Button
                                        onClick={handleCarryForward}
                                        disabled={!carryForwardForm.fromYearId || !carryForwardForm.toYearId}
                                    >
                                        <RotateCcw className="mr-2 h-4 w-4" />
                                        {t('Carry Forward')}
                                    </Button>
                                </DialogFooter>
                            </DialogContent>
                        </Dialog>
                    </div>
                </div>

                <Tabs value={activeTab} onValueChange={setActiveTab} className="space-y-4">
                    <TabsList>
                        <TabsTrigger value="overview">{t('Overview')}</TabsTrigger>
                        <TabsTrigger value="fee-types">{t('Fee Types')}</TabsTrigger>
                        <TabsTrigger value="structures">{t('Fee Structures')}</TabsTrigger>
                        <TabsTrigger value="collection">{t('Collection')}</TabsTrigger>
                    </TabsList>

                    <TabsContent value="overview" className="space-y-4">
                        {/* Class-wise Summary */}
                        <Card>
                            <CardHeader>
                                <CardTitle>{t('Class-wise Fee Summary')}</CardTitle>
                            </CardHeader>
                            <CardContent>
                                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                                    {Object.keys(classSectionSummary)
                                        .sort()
                                        .map((key) => {
                                            const summary = classSectionSummary[key];
                                            const collectionRate = (summary.collected / summary.total) * 100;
                                            return (
                                                <Card key={key}>
                                                    <CardContent className="pt-6">
                                                        <div className="space-y-3">
                                                            <div className="flex items-center justify-between">
                                                                <h3 className="font-bold text-lg">{key}</h3>
                                                                <Badge variant="outline">
                                                                    {summary.students}
                                                                    {t('students')}
                                                                </Badge>
                                                            </div>
                                                            <div className="grid grid-cols-3 gap-2 text-sm">
                                                                <div>
                                                                    <p className="text-gray-600">{t('Total')}</p>
                                                                    <p className="font-semibold">
                                                                        {formatCurrency(summary.total)}
                                                                    </p>
                                                                </div>
                                                                <div>
                                                                    <p className="text-gray-600">{t('Collected')}</p>
                                                                    <p className="font-semibold text-green-600">
                                                                        {formatCurrency(summary.collected)}
                                                                    </p>
                                                                </div>
                                                                <div>
                                                                    <p className="text-gray-600">{t('Pending')}</p>
                                                                    <p className="font-semibold text-orange-600">
                                                                        {formatCurrency(summary.pending)}
                                                                    </p>
                                                                </div>
                                                            </div>
                                                            <div>
                                                                <div className="flex items-center justify-between text-xs mb-1">
                                                                    <span>{t('Collection Rate')}</span>
                                                                    <span className="font-medium">
                                                                        {collectionRate.toFixed(1)}%
                                                                    </span>
                                                                </div>
                                                                <div className="w-full bg-gray-200 rounded-full h-2">
                                                                    <div
                                                                        className="bg-green-600 h-2 rounded-full transition-all"
                                                                        style={{
                                                                            width: `${collectionRate}%`,
                                                                        }}
                                                                    ></div>
                                                                </div>
                                                            </div>
                                                        </div>
                                                    </CardContent>
                                                </Card>
                                            );
                                        })}
                                </div>
                            </CardContent>
                        </Card>
                    </TabsContent>

                    <TabsContent value="fee-types" className="space-y-4">
                        <Card>
                            <CardHeader>
                                <CardTitle>{t('Fee Type Management')}</CardTitle>
                                <div className="flex flex-col gap-3 md:flex-row md:items-center md:justify-between">
                                    <div className="relative min-w-[220px] flex-1 max-w-md">
                                        <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-gray-400" />
                                        <Input
                                            placeholder={t('Search fee types...')}
                                            value={feeTypeSearchQuery}
                                            onChange={(e) => setFeeTypeSearchQuery(e.target.value)}
                                            className="pl-10"
                                        />
                                    </div>
                                    <Button className="gap-2" onClick={openCreateFeeTypeDialog}>
                                        <Plus className="h-4 w-4" />
                                        {t('Add Fee Type')}
                                    </Button>
                                </div>
                            </CardHeader>
                            <CardContent>
                                <Table>
                                    <TableHeader>
                                        <TableRow>
                                            <TableHead>{t('Name')}</TableHead>
                                            <TableHead>{t('Description')}</TableHead>
                                            <TableHead>{t('Actions')}</TableHead>
                                        </TableRow>
                                    </TableHeader>
                                    <TableBody>
                                        {filteredFeeTypes.length > 0 ? (
                                            filteredFeeTypes.map((feeType) => (
                                                <TableRow key={feeType.id}>
                                                    <TableCell className="font-medium">{feeType.name}</TableCell>
                                                    <TableCell className="text-sm text-gray-600">
                                                        {feeType.description || '-'}
                                                    </TableCell>
                                                    <TableCell>
                                                        <div className="flex flex-wrap gap-2">
                                                            <Button
                                                                variant="outline"
                                                                size="sm"
                                                                className="gap-2"
                                                                onClick={() => openEditFeeTypeDialog(feeType)}
                                                            >
                                                                <Pencil className="h-4 w-4" />
                                                                {t('Edit')}
                                                            </Button>
                                                            <Button
                                                                variant="outline"
                                                                size="sm"
                                                                className="gap-2 text-red-600 hover:text-red-700"
                                                                onClick={() => handleDeleteFeeType(feeType.id)}
                                                            >
                                                                <Trash2 className="h-4 w-4" />
                                                                {t('Delete')}
                                                            </Button>
                                                        </div>
                                                    </TableCell>
                                                </TableRow>
                                            ))
                                        ) : (
                                            <TableRow>
                                                <TableCell
                                                    colSpan={3}
                                                    className="py-8 text-center text-sm text-gray-600"
                                                >
                                                    {t('No fee types found.')}
                                                </TableCell>
                                            </TableRow>
                                        )}
                                    </TableBody>
                                </Table>
                            </CardContent>
                        </Card>
                    </TabsContent>

                    <TabsContent value="structures" className="space-y-4">
                        <Card>
                            <CardHeader>
                                <CardTitle>{t('Fee Structures by Class & Section')}</CardTitle>
                                <div className="flex flex-col gap-3 md:flex-row md:items-center md:justify-between">
                                    <div className="flex flex-1 gap-2 flex-wrap">
                                        <div className="relative min-w-[220px] flex-1">
                                            <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-gray-400" />
                                            <Input
                                                placeholder={t('Search fee type or description...')}
                                                value={structureSearchQuery}
                                                onChange={(e) => setStructureSearchQuery(e.target.value)}
                                                className="pl-10"
                                            />
                                        </div>
                                        <Select value={structureClassFilter} onValueChange={setStructureClassFilter}>
                                            <SelectTrigger className="w-36">
                                                <SelectValue placeholder={t('All Classes')} />
                                            </SelectTrigger>
                                            <SelectContent>
                                                <SelectItem value="all">{t('All Classes')}</SelectItem>
                                                {classOptions.map((c) => (
                                                    <SelectItem key={c} value={c}>
                                                        {c}
                                                    </SelectItem>
                                                ))}
                                            </SelectContent>
                                        </Select>
                                        <Select
                                            value={structureSectionFilter}
                                            onValueChange={setStructureSectionFilter}
                                        >
                                            <SelectTrigger className="w-36">
                                                <SelectValue placeholder={t('All Sections')} />
                                            </SelectTrigger>
                                            <SelectContent>
                                                <SelectItem value="all">{t('All Sections')}</SelectItem>
                                                {allSections.map((s) => (
                                                    <SelectItem key={s} value={s}>
                                                        {t('Section')}
                                                        {s}
                                                    </SelectItem>
                                                ))}
                                            </SelectContent>
                                        </Select>
                                    </div>
                                    <Button className="gap-2" onClick={openCreateStructureDialog}>
                                        <Plus className="h-4 w-4" />
                                        {t('Add Structure')}
                                    </Button>
                                </div>
                            </CardHeader>
                            <CardContent>
                                <Table>
                                    <TableHeader>
                                        <TableRow>
                                            <TableHead>{t('Class')}</TableHead>
                                            <TableHead>{t('Section')}</TableHead>
                                            <TableHead>{t('Fee Type')}</TableHead>
                                            <TableHead>{t('Amount')}</TableHead>
                                            <TableHead>{t('Frequency')}</TableHead>
                                            <TableHead>{t('Description')}</TableHead>
                                            <TableHead>{t('Actions')}</TableHead>
                                        </TableRow>
                                    </TableHeader>
                                    <TableBody>
                                        {filteredStructures.map((structure) => (
                                            <TableRow key={structure.id}>
                                                <TableCell>{structure.class}</TableCell>
                                                <TableCell>
                                                    {t('Section')}
                                                    {structure.section}
                                                </TableCell>
                                                <TableCell className="font-medium">{structure.feeType}</TableCell>
                                                <TableCell>{formatCurrency(structure.amount)}</TableCell>
                                                <TableCell>
                                                    <Badge variant="outline" className="capitalize">
                                                        {structure.frequency}
                                                    </Badge>
                                                </TableCell>
                                                <TableCell className="text-sm text-gray-600">
                                                    {t(structure.description)}
                                                </TableCell>
                                                <TableCell>
                                                    <div className="flex flex-wrap gap-2">
                                                        <Button
                                                            variant="outline"
                                                            size="sm"
                                                            className="gap-2"
                                                            onClick={() => openEditStructureDialog(structure)}
                                                        >
                                                            <Pencil className="h-4 w-4" />
                                                            {t('Edit')}
                                                        </Button>
                                                        <Button
                                                            variant="outline"
                                                            size="sm"
                                                            className="gap-2"
                                                            onClick={() => handleDuplicateStructure(structure)}
                                                        >
                                                            <Copy className="h-4 w-4" />
                                                            {t('Duplicate')}
                                                        </Button>
                                                        <Button
                                                            variant="destructive"
                                                            size="sm"
                                                            className="gap-2"
                                                            onClick={() => handleDeleteStructure(structure.id)}
                                                        >
                                                            <Trash2 className="h-4 w-4" />
                                                            {t('Delete')}
                                                        </Button>
                                                    </div>
                                                </TableCell>
                                            </TableRow>
                                        ))}
                                        {filteredStructures.length === 0 && (
                                            <TableRow>
                                                <TableCell
                                                    colSpan={7}
                                                    className="py-8 text-center text-sm text-gray-600"
                                                >
                                                    {t('No fee structures found for the current filters.')}
                                                </TableCell>
                                            </TableRow>
                                        )}
                                    </TableBody>
                                </Table>
                            </CardContent>
                        </Card>
                    </TabsContent>

                    <TabsContent value="collection" className="space-y-4">
                        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
                            {/* Student List with Filters */}
                            <Card className="lg:col-span-1">
                                <CardHeader>
                                    <CardTitle>{t('Students')}</CardTitle>
                                    <div className="space-y-2 mt-2">
                                        <div className="relative">
                                            <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 w-4 h-4" />
                                            <Input
                                                placeholder={t('Search students...')}
                                                value={searchQuery}
                                                onChange={(e) => setSearchQuery(e.target.value)}
                                                className="pl-10"
                                            />
                                        </div>
                                        <div className="grid grid-cols-2 gap-2">
                                            <Select value={classFilter} onValueChange={setClassFilter}>
                                                <SelectTrigger className="h-9">
                                                    <SelectValue placeholder={t('All Classes')} />
                                                </SelectTrigger>
                                                <SelectContent>
                                                    <SelectItem value="all">{t('All Classes')}</SelectItem>
                                                    {classOptions.map((c) => (
                                                        <SelectItem key={c} value={c}>
                                                            {c}
                                                        </SelectItem>
                                                    ))}
                                                </SelectContent>
                                            </Select>
                                            <Select value={sectionFilter} onValueChange={setSectionFilter}>
                                                <SelectTrigger className="h-9">
                                                    <SelectValue placeholder={t('All Sections')} />
                                                </SelectTrigger>
                                                <SelectContent>
                                                    <SelectItem value="all">{t('All Sections')}</SelectItem>
                                                    {allSections.map((s) => (
                                                        <SelectItem key={s} value={s}>
                                                            {t('Section')}
                                                            {s}
                                                        </SelectItem>
                                                    ))}
                                                </SelectContent>
                                            </Select>
                                        </div>
                                    </div>
                                </CardHeader>
                                <CardContent>
                                    <ScrollArea className="h-[500px]">
                                        <div className="space-y-2">
                                            {filteredStudents.map((student) => (
                                                <div
                                                    key={student.id}
                                                    onClick={() => handleStudentSelect(student)}
                                                    className={`p-3 rounded-lg cursor-pointer transition-colors ${
                                                        selectedStudent?.id === student.id
                                                            ? 'bg-blue-50 border-2 border-blue-500'
                                                            : 'bg-gray-50 hover:bg-gray-100 border-2 border-transparent'
                                                    }`}
                                                >
                                                    <div className="flex items-center justify-between gap-2">
                                                        <p className="font-medium text-sm">
                                                            {student.first_name} {student.last_name}
                                                        </p>
                                                        <Link
                                                            href={`/students/${student.id}?tab=fees`}
                                                            onClick={(event) => event.stopPropagation()}
                                                            className="inline-flex shrink-0 items-center gap-1 rounded p-1 text-blue-600 hover:bg-blue-100"
                                                            title={t('Open Student Hub')}
                                                        >
                                                            <ExternalLink className="h-4 w-4" />
                                                        </Link>
                                                    </div>
                                                    <p className="text-xs text-gray-600">{student.admission_no}</p>
                                                    <p className="text-xs text-gray-600">
                                                        {student.class}-{student.section}
                                                    </p>
                                                </div>
                                            ))}
                                        </div>
                                    </ScrollArea>
                                </CardContent>
                            </Card>

                            {/* Fee Details */}
                            <Card className="lg:col-span-2">
                                <CardHeader>
                                    <CardTitle>
                                        {selectedStudent
                                            ? t(
                                                  'Fee Details - {selectedStudent.first_name} {selectedStudent.last_name}',
                                                  {
                                                      'selectedStudent.first_name': selectedStudent.first_name,
                                                      'selectedStudent.last_name': selectedStudent.last_name,
                                                  },
                                              )
                                            : t('Select a student to view fees')}
                                    </CardTitle>
                                </CardHeader>
                                <CardContent>
                                    {!selectedStudent ? (
                                        <div className="text-center py-12">
                                            <IndianRupee className="w-12 h-12 text-gray-400 mx-auto mb-4" />
                                            <p className="text-gray-600">{t('Select a student to view fee details')}</p>
                                        </div>
                                    ) : !studentFees ? (
                                        <div className="text-center py-8">
                                            <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600 mx-auto"></div>
                                            <p className="mt-2 text-gray-600">{t('Loading fees...')}</p>
                                        </div>
                                    ) : (
                                        <div className="space-y-6">
                                            {/* Summary Cards */}
                                            <div className="grid grid-cols-3 gap-4">
                                                <Card>
                                                    <CardContent className="pt-6">
                                                        <p className="text-sm text-gray-600">{t('Total Fees')}</p>
                                                        <p className="text-2xl font-bold text-gray-900">
                                                            {formatCurrency(
                                                                visibleStudentFees.reduce(
                                                                    (sum: number, fee: any) =>
                                                                        sum + (fee.total_amount || 0),
                                                                    0,
                                                                ) || 0,
                                                            )}
                                                        </p>
                                                    </CardContent>
                                                </Card>
                                                <Card>
                                                    <CardContent className="pt-6">
                                                        <p className="text-sm text-gray-600">{t('Paid')}</p>
                                                        <p className="text-2xl font-bold text-green-600">
                                                            {formatCurrency(studentFees.summary?.total_paid || 0)}
                                                        </p>
                                                    </CardContent>
                                                </Card>
                                                <Card>
                                                    <CardContent className="pt-6">
                                                        <p className="text-sm text-gray-600">{t('Balance')}</p>
                                                        <p className="text-2xl font-bold text-orange-600">
                                                            {formatCurrency(studentFees.summary?.total_pending || 0)}
                                                        </p>
                                                    </CardContent>
                                                </Card>
                                            </div>

                                            {/* Fee Items */}
                                            {visibleStudentFees.length > 0 ? (
                                                <div className="overflow-x-auto">
                                                    <Table>
                                                        <TableHeader>
                                                            <TableRow>
                                                                <TableHead>{t('Fee Type')}</TableHead>
                                                                <TableHead>{t('Amount')}</TableHead>
                                                                <TableHead>{t('Paid')}</TableHead>
                                                                <TableHead>{t('Balance')}</TableHead>
                                                                <TableHead>{t('Status')}</TableHead>
                                                                <TableHead>{t('Actions')}</TableHead>
                                                            </TableRow>
                                                        </TableHeader>
                                                        <TableBody>
                                                            {visibleStudentFees.map((fee: any) => (
                                                                <TableRow key={fee.id}>
                                                                    <TableCell className="font-medium capitalize">
                                                                        {fee.fee_type || t('General Fee')}
                                                                    </TableCell>
                                                                    <TableCell>
                                                                        {formatCurrency(fee.total_amount || 0)}
                                                                    </TableCell>
                                                                    <TableCell className="text-green-600">
                                                                        {formatCurrency(fee.paid_amount || 0)}
                                                                    </TableCell>
                                                                    <TableCell className="text-orange-600">
                                                                        {formatCurrency(fee.due_amount || 0)}
                                                                    </TableCell>
                                                                    <TableCell>
                                                                        <Badge
                                                                            variant={
                                                                                fee.status === 'paid'
                                                                                    ? 'default'
                                                                                    : fee.status === 'partial'
                                                                                      ? 'secondary'
                                                                                      : 'destructive'
                                                                            }
                                                                        >
                                                                            {t(fee.status)}
                                                                        </Badge>
                                                                    </TableCell>
                                                                    <TableCell>
                                                                        {(fee.due_amount || 0) > 0 && (
                                                                            <Button
                                                                                size="sm"
                                                                                onClick={() => openCollectDialog(fee)}
                                                                            >
                                                                                {t('Collect')}
                                                                            </Button>
                                                                        )}
                                                                    </TableCell>
                                                                </TableRow>
                                                            ))}
                                                        </TableBody>
                                                    </Table>
                                                </div>
                                            ) : (
                                                <div className="text-center py-8">
                                                    <p className="text-gray-600">
                                                        {t('No fees assigned to this student')}
                                                    </p>
                                                </div>
                                            )}

                                            <Card>
                                                <CardHeader>
                                                    <CardTitle>{t('Payment History')}</CardTitle>
                                                </CardHeader>
                                                <CardContent>
                                                    {visibleStudentPayments.length > 0 ? (
                                                        <Table>
                                                            <TableHeader>
                                                                <TableRow>
                                                                    <TableHead>{t('Date')}</TableHead>
                                                                    <TableHead>{t('Fee Type')}</TableHead>
                                                                    <TableHead>{t('Amount')}</TableHead>
                                                                    <TableHead>{t('Method')}</TableHead>
                                                                    <TableHead>{t('Transaction ID')}</TableHead>
                                                                    <TableHead>{t('Status')}</TableHead>
                                                                    <TableHead>{t('Actions')}</TableHead>
                                                                </TableRow>
                                                            </TableHeader>
                                                            <TableBody>
                                                                {[...visibleStudentPayments]
                                                                    .sort(
                                                                        (a: any, b: any) =>
                                                                            new Date(b.payment_date).getTime() -
                                                                            new Date(a.payment_date).getTime(),
                                                                    )
                                                                    .map((payment: any) => {
                                                                        const relatedFee = visibleStudentFees.find(
                                                                            (fee: any) => fee.id === payment.fee_id,
                                                                        );
                                                                        const isReverted =
                                                                            payment.status === 'reverted';
                                                                        const isPending = payment.status === 'pending';

                                                                        return (
                                                                            <TableRow key={payment.id}>
                                                                                <TableCell>
                                                                                    {payment.payment_date || '-'}
                                                                                </TableCell>
                                                                                <TableCell>
                                                                                    {relatedFee?.fee_type ||
                                                                                        t('General Fee')}
                                                                                </TableCell>
                                                                                <TableCell>
                                                                                    {formatCurrency(
                                                                                        payment.amount || 0,
                                                                                    )}
                                                                                </TableCell>
                                                                                <TableCell className="capitalize">
                                                                                    {String(
                                                                                        payment.payment_method || '-',
                                                                                    ).replace('_', ' ')}
                                                                                </TableCell>
                                                                                <TableCell>
                                                                                    {payment.transaction_id || '-'}
                                                                                </TableCell>
                                                                                <TableCell>
                                                                                    <Badge
                                                                                        variant={
                                                                                            isReverted
                                                                                                ? 'secondary'
                                                                                                : isPending
                                                                                                  ? 'outline'
                                                                                                  : 'default'
                                                                                        }
                                                                                    >
                                                                                        {isReverted
                                                                                            ? t('reverted')
                                                                                            : isPending
                                                                                              ? t('pending')
                                                                                              : t('active')}
                                                                                    </Badge>
                                                                                    {isReverted &&
                                                                                    payment.revert_reason ? (
                                                                                        <p className="mt-1 text-xs text-gray-600">
                                                                                            {t('Reason:')}
                                                                                            {payment.revert_reason}
                                                                                        </p>
                                                                                    ) : null}
                                                                                </TableCell>
                                                                                <TableCell>
                                                                                    <div className="flex flex-wrap gap-2">
                                                                                        {isPending ? (
                                                                                            <Button
                                                                                                variant="outline"
                                                                                                size="sm"
                                                                                                className="gap-2 border-emerald-300 text-emerald-700 hover:bg-emerald-50"
                                                                                                onClick={() =>
                                                                                                    handleApprovePending(
                                                                                                        payment,
                                                                                                    )
                                                                                                }
                                                                                            >
                                                                                                <CheckCircle className="h-4 w-4" />
                                                                                                {t('Confirm')}
                                                                                            </Button>
                                                                                        ) : null}
                                                                                        <Button
                                                                                            variant="outline"
                                                                                            size="sm"
                                                                                            className="gap-2"
                                                                                            onClick={() =>
                                                                                                handlePrintReceipt(
                                                                                                    payment,
                                                                                                    relatedFee,
                                                                                                )
                                                                                            }
                                                                                        >
                                                                                            <FileText className="h-4 w-4" />
                                                                                            {t('Print Receipt')}
                                                                                        </Button>
                                                                                        {!isReverted ? (
                                                                                            <Button
                                                                                                variant="outline"
                                                                                                size="sm"
                                                                                                className="gap-2"
                                                                                                onClick={() =>
                                                                                                    openRevertDialog(
                                                                                                        payment,
                                                                                                    )
                                                                                                }
                                                                                            >
                                                                                                <RotateCcw className="h-4 w-4" />
                                                                                                {t('Revert')}
                                                                                            </Button>
                                                                                        ) : (
                                                                                            <span className="self-center text-xs text-gray-500">
                                                                                                {t('Reverted')}
                                                                                            </span>
                                                                                        )}
                                                                                    </div>
                                                                                </TableCell>
                                                                            </TableRow>
                                                                        );
                                                                    })}
                                                            </TableBody>
                                                        </Table>
                                                    ) : (
                                                        <p className="text-sm text-gray-600">
                                                            {t('No payment history available for this student.')}
                                                        </p>
                                                    )}
                                                </CardContent>
                                            </Card>
                                        </div>
                                    )}
                                </CardContent>
                            </Card>
                        </div>

                        <Dialog
                            open={showCollectDialog}
                            onOpenChange={(open) => (open ? setShowCollectDialog(true) : closeCollectDialog())}
                        >
                            <DialogContent>
                                <DialogHeader>
                                    <DialogTitle>{t('Collect Payment')}</DialogTitle>
                                    {activeFee ? (
                                        <DialogDescription>
                                            {activeFee.fee_type}
                                            {t('for')}
                                            {selectedStudent?.first_name} {selectedStudent?.last_name}
                                        </DialogDescription>
                                    ) : null}
                                </DialogHeader>
                                <form onSubmit={handleCollectFee} className="space-y-4">
                                    <div className="space-y-2">
                                        <Label>{t('Amount (₹)')}</Label>
                                        <Input
                                            type="number"
                                            min="0"
                                            step="0.01"
                                            value={collectForm.amount}
                                            onChange={(e) =>
                                                setCollectForm({
                                                    ...collectForm,
                                                    amount: e.target.value,
                                                })
                                            }
                                            max={activeFee?.due_amount || undefined}
                                            required
                                        />

                                        <p className="text-sm text-gray-600">
                                            {t('Balance:')}
                                            {formatCurrency(activeFee?.due_amount || 0)}
                                        </p>
                                    </div>

                                    <div className="space-y-2">
                                        <Label>{t('Payment Method')}</Label>
                                        <Select
                                            value={collectForm.payment_method}
                                            onValueChange={(v) =>
                                                setCollectForm({
                                                    ...collectForm,
                                                    payment_method: v,
                                                })
                                            }
                                        >
                                            <SelectTrigger>
                                                <SelectValue />
                                            </SelectTrigger>
                                            <SelectContent>
                                                <SelectItem value="cash">{t('Cash')}</SelectItem>
                                                <SelectItem value="card">{t('Card')}</SelectItem>
                                                <SelectItem value="upi">{t('UPI')}</SelectItem>
                                                <SelectItem value="cheque">{t('Cheque')}</SelectItem>
                                                <SelectItem value="bank_transfer">{t('Bank Transfer')}</SelectItem>
                                            </SelectContent>
                                        </Select>
                                    </div>

                                    <div className="space-y-2">
                                        <Label>{t('Transaction ID (Optional)')}</Label>
                                        <Input
                                            value={collectForm.transaction_id}
                                            onChange={(e) =>
                                                setCollectForm({
                                                    ...collectForm,
                                                    transaction_id: e.target.value,
                                                })
                                            }
                                        />
                                    </div>

                                    <div className="flex justify-end gap-2">
                                        <Button type="button" variant="outline" onClick={closeCollectDialog}>
                                            {t('Cancel')}
                                        </Button>
                                        <Button type="submit">{t('Collect Payment')}</Button>
                                    </div>
                                </form>
                            </DialogContent>
                        </Dialog>

                        <Dialog
                            open={showRevertDialog}
                            onOpenChange={(open) => (open ? setShowRevertDialog(true) : closeRevertDialog())}
                        >
                            <DialogContent>
                                <DialogHeader>
                                    <DialogTitle>{t('Revert Payment')}</DialogTitle>
                                    {activePayment ? (
                                        <DialogDescription>
                                            {t('This will restore')}
                                            {formatCurrency(activePayment.amount || 0)}
                                            {t('back to the fee balance.')}
                                        </DialogDescription>
                                    ) : null}
                                </DialogHeader>
                                <form onSubmit={handleRevertPayment} className="space-y-4">
                                    <div className="space-y-2">
                                        <Label>{t('Reason for Revert')}</Label>
                                        <Input
                                            value={revertForm.reason}
                                            onChange={(e) =>
                                                setRevertForm({
                                                    reason: e.target.value,
                                                })
                                            }
                                            placeholder={t('Enter reason for reverting this payment')}
                                            required
                                        />
                                    </div>

                                    <div className="flex justify-end gap-2">
                                        <Button type="button" variant="outline" onClick={closeRevertDialog}>
                                            {t('Cancel')}
                                        </Button>
                                        <Button type="submit" variant="destructive">
                                            {t('Confirm Revert')}
                                        </Button>
                                    </div>
                                </form>
                            </DialogContent>
                        </Dialog>
                    </TabsContent>
                </Tabs>
            </div>
        </DashboardLayout>
    );
}
