import { useLanguage } from '../../i18n/LanguageProvider';
import React, { useEffect, useMemo, useState } from 'react';
import { qrSvgToken } from '../../utils/qr';
import {
    AssignedIdCardTemplate,
    IdCardFace,
    idCardFaces,
    openIdCardPrintWindow,
    withQrCode,
} from '../../lib/templateTwin';
import DashboardLayout from '../DashboardLayout';
import CardFace from '../../components/designer/CardFace';
import { normalizeDesign, IdCardDesign } from '../../components/designer/cardTypes';
import { Card, CardContent, CardHeader, CardTitle } from '../ui/card';
import { Button } from '../ui/button';
import { Input } from '../ui/input';
import { Label } from '../ui/label';
import { Switch } from '../ui/switch';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '../ui/table';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '../ui/select';
import { Badge } from '../ui/badge';
import { Download, IdCard, Plus } from 'lucide-react';

interface StudentIdCardManagementProps {
    user: any;
    students?: StudentIdCardStudent[];
    design?: Partial<IdCardDesign> | null;
    assignedTemplate?: AssignedIdCardTemplate | null;
}

interface StudentIdCardStudent {
    id: string;
    organization_id?: number | string | null;
    admission_no?: string | null;
    roll_number?: string | number | null;
    first_name: string;
    first_name_mr?: string | null;
    last_name: string;
    last_name_mr?: string | null;
    class?: string | null;
    section?: string | null;
    email?: string | null;
    phone?: string | null;
    gender?: string | null;
    blood_group?: string | null;
    father_name?: string | null;
    father_name_mr?: string | null;
    mother_name?: string | null;
    mother_name_mr?: string | null;
    address?: string | null;
    address_mr?: string | null;
    qr_token?: string | null;
    idCardContext?: Record<string, string | number | null | undefined> | null;
}

interface GeneratedCard {
    id: string;
    studentId: string;
    studentName: string;
    studentCardId: string;
    classLabel: string;
    templateTitle: string;
    issuedOn: string;
    status: 'Generated';
}

const buildStudentCardId = (student: any) =>
    student.admission_no || `STU-${student.class}${student.section}-${student.roll_number || student.id}`;

const buildAdmissionNumber = (student: any) =>
    student.admission_no || `ADM-${student.class}${student.section}-${student.roll_number || student.id}`;

const hasClassAndSection = (student: StudentIdCardStudent) => Boolean(student.class && student.section);

const escapeHtml = (value: string) =>
    value
        .replace(/&/g, '&amp;')
        .replace(/</g, '&lt;')
        .replace(/>/g, '&gt;')
        .replace(/"/g, '&quot;')
        .replace(/'/g, '&#39;');

export default function StudentIdCardManagement({
    user,
    students = [],
    design: designInput,
    assignedTemplate = null,
}: StudentIdCardManagementProps) {
    const { t } = useLanguage();
    const design = normalizeDesign(designInput);
    const availableStudents = students;
    const templateEnabled = Boolean(assignedTemplate && assignedTemplate.content);

    const facesForStudent = (student: StudentIdCardStudent): IdCardFace[] => {
        if (!assignedTemplate) {
            return [];
        }

        return idCardFaces(
            assignedTemplate,
            withQrCode(student.idCardContext ?? {}, student.qr_token || buildStudentCardId(student)),
        );
    };

    const classOptions = useMemo(
        () =>
            Array.from(
                new Set(
                    availableStudents
                        .map((student) => student.class)
                        .filter((className): className is string => Boolean(className)),
                ),
            ).sort((a, b) => a.localeCompare(b, undefined, { numeric: true })),
        [availableStudents],
    );

    const [selectedClass, setSelectedClass] = useState('');
    const sectionOptions = useMemo(() => {
        if (!selectedClass) {
            return [];
        }

        return Array.from(
            new Set(
                availableStudents
                    .filter((student) => student.class === selectedClass && student.section)
                    .map((student) => student.section),
            ),
        ).sort((a, b) => String(a).localeCompare(String(b), undefined, { numeric: true })) as string[];
    }, [availableStudents, selectedClass]);

    const [selectedSection, setSelectedSection] = useState('');
    const filteredStudents = useMemo(() => {
        if (!selectedClass || !selectedSection) {
            return [];
        }

        return availableStudents.filter(
            (student) =>
                hasClassAndSection(student) && student.class === selectedClass && student.section === selectedSection,
        );
    }, [availableStudents, selectedClass, selectedSection]);

    const [selectedStudentId, setSelectedStudentId] = useState('');
    const [cardTitle, setCardTitle] = useState('Student ID Card');
    const [printLanguage, setPrintLanguage] = useState<'en' | 'mr'>('en');
    const [applicableClass, setApplicableClass] = useState('All Classes');
    const [templateCode, setTemplateCode] = useState('ID-2026-A');
    const [showQrCode, setShowQrCode] = useState(true);
    const [generatedCards, setGeneratedCards] = useState<GeneratedCard[]>(() =>
        availableStudents.slice(0, 2).map((student, index): GeneratedCard => ({
            id: `generated-${student.id}`,
            studentId: student.id,
            studentName: `${student.first_name} ${student.last_name}`,
            studentCardId: buildStudentCardId(student),
            classLabel: `${student.class}-${student.section}`,
            templateTitle: index === 0 ? 'Default ID Card' : 'Senior Wing ID Card',
            issuedOn: new Date().toISOString().split('T')[0],
            status: 'Generated',
        })),
    );

    useEffect(() => {
        if (!selectedClass && classOptions[0]) {
            setSelectedClass(classOptions[0]);
        }
    }, [classOptions, selectedClass]);

    useEffect(() => {
        if (!selectedClass) {
            setSelectedSection('');
            setSelectedStudentId('');
            return;
        }

        if (!sectionOptions.includes(selectedSection)) {
            setSelectedSection(sectionOptions[0] ?? '');
        }
    }, [sectionOptions, selectedClass, selectedSection]);

    useEffect(() => {
        if (!selectedSection) {
            setSelectedStudentId('');
            return;
        }

        if (!filteredStudents.some((student) => student.id === selectedStudentId)) {
            setSelectedStudentId(filteredStudents[0]?.id ?? '');
        }
    }, [filteredStudents, selectedSection, selectedStudentId]);

    const selectedStudent = filteredStudents.find((student) => student.id === selectedStudentId) || null;

    const qrMarkup = (student: StudentIdCardStudent): string => {
        if (!showQrCode) {
            return '';
        }

        const value = student.qr_token || buildStudentCardId(student);

        return `
        <div class="qr-scan">
          ${qrSvgToken(value, 76)}
          <p class="qr-hint">${t('Scan For Attendance')}</p>
        </div>`;
    };

    const createGeneratedCard = (student: any, idSuffix: string): GeneratedCard => ({
        id: `${student.id}-${idSuffix}`,
        studentId: student.id,
        studentName: `${student.first_name} ${student.last_name}`,
        studentCardId: buildStudentCardId(student),
        classLabel: `${student.class}-${student.section}`,
        templateTitle: templateEnabled && assignedTemplate ? assignedTemplate.title : cardTitle,
        issuedOn: new Date().toISOString().split('T')[0],
        status: 'Generated',
    });

    const handleGenerateCard = () => {
        if (!selectedStudent) {
            return;
        }

        const generatedCard = createGeneratedCard(selectedStudent, String(Date.now()));

        setGeneratedCards((current) => [generatedCard, ...current]);
    };

    const handleBulkGenerate = () => {
        if (filteredStudents.length === 0) {
            return;
        }

        const batchTime = Date.now();
        const bulkCards = filteredStudents.map((student, index) =>
            createGeneratedCard(student, `${batchTime}-${index}`),
        );

        setGeneratedCards((current) => [...bulkCards, ...current]);
    };

    const handleDownloadPdf = () => {
        if (!selectedStudent) {
            return;
        }

        if (templateEnabled && assignedTemplate) {
            const studentName = `${selectedStudent.first_name} ${selectedStudent.last_name}`.trim();
            openIdCardPrintWindow(`${cardTitle || t('Student ID Card')} - ${studentName}`, [
                facesForStudent(selectedStudent),
            ]);
            return;
        }

        const printWindow = window.open('', '_blank', 'width=900,height=700');
        if (!printWindow) {
            return;
        }

        const studentName =
            printLanguage === 'mr' && (selectedStudent.first_name_mr || selectedStudent.last_name_mr)
                ? `${selectedStudent.first_name_mr || ''} ${selectedStudent.last_name_mr || ''}`.trim()
                : `${selectedStudent.first_name} ${selectedStudent.last_name}`;
        const studentId = buildStudentCardId(selectedStudent);
        const admissionNumber = buildAdmissionNumber(selectedStudent);
        const guardianName =
            printLanguage === 'mr' && (selectedStudent.father_name_mr || selectedStudent.mother_name_mr)
                ? selectedStudent.father_name_mr || selectedStudent.mother_name_mr
                : selectedStudent.father_name || selectedStudent.mother_name || 'Not available';
        const guardian = guardianName || 'Not available';
        const phone = selectedStudent.phone || 'N/A';
        const email = selectedStudent.email || 'student@gurukul.com';
        const classLabel = `${selectedStudent.class}-${selectedStudent.section}`;
        const gender = selectedStudent.gender || 'N/A';
        const bloodGroup = selectedStudent.blood_group || 'N/A';
        const address =
            printLanguage === 'mr' && selectedStudent.address_mr
                ? selectedStudent.address_mr
                : selectedStudent.address || 'Address not available';

        printWindow.document.write(`
      <!DOCTYPE html>
      <html lang="en">
        <head>
          <meta charset="UTF-8" />
          <meta name="viewport" content="width=device-width, initial-scale=1.0" />
          <title>${cardTitle} - ${studentName}</title>
          <style>
            * { box-sizing: border-box; }
            body {
              margin: 0;
              padding: 24px;
              font-family: Arial, sans-serif;
              background: #f8fafc;
              color: #0f172a;
            }
            .sheet {
              display: flex;
              justify-content: center;
              align-items: flex-start;
            }
            .card {
              width: 420px;
              border: 1px solid #bfdbfe;
              border-radius: 24px;
              overflow: hidden;
              background: #ffffff;
              box-shadow: 0 20px 45px rgba(15, 23, 42, 0.12);
            }
            .header {
              padding: 20px;
              color: #ffffff;
              background: linear-gradient(90deg, #1d4ed8 0%, #0284c7 55%, #06b6d4 100%);
            }
            .header small {
              display: block;
              font-size: 11px;
              letter-spacing: 0.3em;
              text-transform: uppercase;
              opacity: 0.85;
            }
            .header h1 {
              margin: 10px 0 0;
              font-size: 24px;
            }
            .content {
              padding: 20px;
            }
            .profile {
              display: flex;
              gap: 16px;
              align-items: center;
              margin-bottom: 20px;
            }
            .avatar {
              width: 80px;
              height: 80px;
              border-radius: 20px;
              display: flex;
              align-items: center;
              justify-content: center;
              background: #dbeafe;
              color: #1d4ed8;
              font-size: 28px;
              font-weight: 700;
            }
            .name {
              margin: 0;
              font-size: 24px;
              font-weight: 700;
            }
            .meta {
              margin: 6px 0 0;
              color: #64748b;
              font-size: 14px;
            }
            .badge {
              display: inline-block;
              margin-top: 10px;
              padding: 6px 10px;
              border-radius: 999px;
              background: #2563eb;
              color: #ffffff;
              font-size: 12px;
              font-weight: 700;
            }
            .grid {
              display: grid;
              grid-template-columns: repeat(2, minmax(0, 1fr));
              gap: 12px;
              margin-bottom: 16px;
            }
            .cell {
              border-radius: 16px;
              background: #f8fafc;
              padding: 14px;
            }
            .cell-label {
              margin: 0;
              font-size: 11px;
              letter-spacing: 0.08em;
              text-transform: uppercase;
              color: #64748b;
            }
            .cell-value {
              margin: 8px 0 0;
              font-size: 15px;
              font-weight: 700;
              color: #0f172a;
            }
            .guardian {
              border: 1px dashed #93c5fd;
              background: #eff6ff;
              border-radius: 16px;
              padding: 14px;
              font-size: 14px;
              color: #1e3a8a;
              margin-top: 12px;
            }
            .qr-scan {
              display: flex;
              flex-direction: column;
              align-items: center;
              margin-top: 14px;
            }
            .qr-scan svg {
              display: block;
            }
            .qr-hint {
              margin: 6px 0 0;
              font-size: 9px;
              letter-spacing: 0.18em;
              text-transform: uppercase;
              color: #64748b;
            }
            @media print {
              body {
                background: #ffffff;
                padding: 0;
              }
              .card {
                box-shadow: none;
              }
            }
          </style>
        </head>
        <body>
          <div class="sheet">
            <div class="card">
              <div class="header">
                <small>${t('Template')} ${templateCode}</small>
                <h1>${cardTitle || t('Student ID Card')}</h1>
              </div>
              <div class="content">
                <div class="profile">
                  <div class="avatar">${selectedStudent.first_name?.charAt(0)?.toUpperCase() || 'S'}</div>
                  <div>
                    <p class="name">${studentName}</p>
                    <p class="meta">${email}</p>
                    <span class="badge">${applicableClass}</span>
                  </div>
                </div>
                <div class="grid">
                  <div class="cell">
                    <p class="cell-label">${t('Student ID')}</p>
                    <p class="cell-value">${studentId}</p>
                  </div>
                  <div class="cell">
                    <p class="cell-label">${t('Admission Number')}</p>
                    <p class="cell-value">${admissionNumber}</p>
                  </div>
                  <div class="cell">
                    <p class="cell-label">${t('Class')}</p>
                    <p class="cell-value">${classLabel}</p>
                  </div>
                  <div class="cell">
                    <p class="cell-label">${t('Phone')}</p>
                    <p class="cell-value">${phone}</p>
                  </div>
                  <div class="cell">
                    <p class="cell-label">${t('Gender')}</p>
                    <p class="cell-value">${gender}</p>
                  </div>
                  <div class="cell">
                    <p class="cell-label">${t('Blood Group')}</p>
                    <p class="cell-value">${bloodGroup}</p>
                  </div>
                </div>
                <div class="guardian">${t('Guardian')}: ${guardian}</div>
                <div class="guardian">${t('Address')}: ${address}</div>
                ${qrMarkup(selectedStudent)}
              </div>
            </div>
          </div>
        </body>
      </html>
    `);

        printWindow.document.close();
        printWindow.focus();
        printWindow.print();
    };

    const handleBulkDownloadPdf = () => {
        if (filteredStudents.length === 0) {
            return;
        }

        if (templateEnabled && assignedTemplate) {
            openIdCardPrintWindow(
                `${cardTitle || t('Student ID Card')} - ${t('Bulk PDF')}`,
                filteredStudents.map((student) => facesForStudent(student)),
            );
            return;
        }

        const printWindow = window.open('', '_blank', 'width=1200,height=800');
        if (!printWindow) {
            return;
        }

        const cardsMarkup = filteredStudents
            .map((student) => {
                const studentName =
                    printLanguage === 'mr' && (student.first_name_mr || student.last_name_mr)
                        ? `${student.first_name_mr || ''} ${student.last_name_mr || ''}`.trim()
                        : `${student.first_name} ${student.last_name}`;
                const studentId = buildStudentCardId(student);
                const admissionNumber = buildAdmissionNumber(student);
                const guardianName =
                    printLanguage === 'mr' && (student.father_name_mr || student.mother_name_mr)
                        ? student.father_name_mr || student.mother_name_mr
                        : student.father_name || student.mother_name || 'Not available';
                const guardian = guardianName || 'Not available';
                const phone = student.phone || 'N/A';
                const email = student.email || 'student@gurukul.com';
                const classLabel = `${student.class}-${student.section}`;
                const initial = student.first_name?.charAt(0)?.toUpperCase() || 'S';
                const gender = student.gender || 'N/A';
                const bloodGroup = student.blood_group || 'N/A';
                const address =
                    printLanguage === 'mr' && student.address_mr
                        ? student.address_mr
                        : student.address || 'Address not available';

                return `
          <div class="card">
            <div class="header">
              <small>${t('Template')} ${escapeHtml(templateCode)}</small>
              <h1>${escapeHtml(cardTitle || t('Student ID Card'))}</h1>
            </div>
            <div class="content">
              <div class="profile">
                <div class="avatar">${escapeHtml(initial)}</div>
                <div>
                  <p class="name">${escapeHtml(studentName)}</p>
                  <p class="meta">${escapeHtml(email)}</p>
                  <span class="badge">${escapeHtml(applicableClass)}</span>
                </div>
              </div>
              <div class="grid">
                <div class="cell">
                  <p class="cell-label">${t('Student ID')}</p>
                  <p class="cell-value">${escapeHtml(studentId)}</p>
                </div>
                <div class="cell">
                  <p class="cell-label">${t('Admission Number')}</p>
                  <p class="cell-value">${escapeHtml(admissionNumber)}</p>
                </div>
                <div class="cell">
                  <p class="cell-label">${t('Class')}</p>
                  <p class="cell-value">${escapeHtml(classLabel)}</p>
                </div>
                <div class="cell">
                  <p class="cell-label">${t('Phone')}</p>
                  <p class="cell-value">${escapeHtml(phone)}</p>
                </div>
                <div class="cell">
                  <p class="cell-label">${t('Gender')}</p>
                  <p class="cell-value">${escapeHtml(gender)}</p>
                </div>
                <div class="cell">
                  <p class="cell-label">${t('Blood Group')}</p>
                  <p class="cell-value">${escapeHtml(bloodGroup)}</p>
                </div>
              </div>
              <div class="guardian">${t('Guardian')}: ${escapeHtml(guardian)}</div>
              <div class="guardian">${t('Address')}: ${escapeHtml(address)}</div>
              ${qrMarkup(student)}
            </div>
          </div>
        `;
            })
            .join('');

        printWindow.document.write(`
      <!DOCTYPE html>
      <html lang="en">
        <head>
          <meta charset="UTF-8" />
          <meta name="viewport" content="width=device-width, initial-scale=1.0" />
          <title>${escapeHtml(cardTitle)} - ${t('Bulk PDF')}</title>
          <style>
            * { box-sizing: border-box; }
            body {
              margin: 0;
              padding: 24px;
              font-family: Arial, sans-serif;
              background: #f8fafc;
              color: #0f172a;
            }
            .sheet-title {
              margin: 0 0 20px;
              font-size: 24px;
              font-weight: 700;
            }
            .sheet-subtitle {
              margin: 0 0 24px;
              color: #475569;
              font-size: 14px;
            }
            .cards {
              display: grid;
              grid-template-columns: repeat(2, minmax(0, 1fr));
              gap: 20px;
            }
            .card {
              border: 1px solid #bfdbfe;
              border-radius: 24px;
              overflow: hidden;
              background: #ffffff;
              box-shadow: 0 20px 45px rgba(15, 23, 42, 0.12);
              break-inside: avoid;
            }
            .header {
              padding: 20px;
              color: #ffffff;
              background: linear-gradient(90deg, #1d4ed8 0%, #0284c7 55%, #06b6d4 100%);
            }
            .header small {
              display: block;
              font-size: 11px;
              letter-spacing: 0.3em;
              text-transform: uppercase;
              opacity: 0.85;
            }
            .header h1 {
              margin: 10px 0 0;
              font-size: 24px;
            }
            .content {
              padding: 20px;
            }
            .profile {
              display: flex;
              gap: 16px;
              align-items: center;
              margin-bottom: 20px;
            }
            .avatar {
              width: 80px;
              height: 80px;
              border-radius: 20px;
              display: flex;
              align-items: center;
              justify-content: center;
              background: #dbeafe;
              color: #1d4ed8;
              font-size: 28px;
              font-weight: 700;
            }
            .name {
              margin: 0;
              font-size: 24px;
              font-weight: 700;
            }
            .meta {
              margin: 6px 0 0;
              color: #64748b;
              font-size: 14px;
            }
            .badge {
              display: inline-block;
              margin-top: 10px;
              padding: 6px 10px;
              border-radius: 999px;
              background: #2563eb;
              color: #ffffff;
              font-size: 12px;
              font-weight: 700;
            }
            .grid {
              display: grid;
              grid-template-columns: repeat(2, minmax(0, 1fr));
              gap: 12px;
              margin-bottom: 16px;
            }
            .cell {
              border-radius: 16px;
              background: #f8fafc;
              padding: 14px;
            }
            .cell-label {
              margin: 0;
              font-size: 11px;
              letter-spacing: 0.08em;
              text-transform: uppercase;
              color: #64748b;
            }
            .cell-value {
              margin: 8px 0 0;
              font-size: 15px;
              font-weight: 700;
              color: #0f172a;
            }
            .guardian {
              border: 1px dashed #93c5fd;
              background: #eff6ff;
              border-radius: 16px;
              padding: 14px;
              font-size: 14px;
              color: #1e3a8a;
            }
            .qr-scan {
              display: flex;
              flex-direction: column;
              align-items: center;
              margin-top: 12px;
            }
            .qr-scan svg {
              display: block;
            }
            .qr-hint {
              margin: 6px 0 0;
              font-size: 9px;
              letter-spacing: 0.18em;
              text-transform: uppercase;
              color: #64748b;
            }
            @media print {
              body {
                background: #ffffff;
                padding: 12px;
              }
              .cards {
                grid-template-columns: repeat(2, minmax(0, 1fr));
                gap: 12px;
              }
              .card {
                box-shadow: none;
              }
            }
          </style>
        </head>
        <body>
          <h1 class="sheet-title">${escapeHtml(cardTitle || t('Student ID Card'))} ${t('Bulk Download')}</h1>
          <p class="sheet-subtitle">
            ${escapeHtml(selectedClass)} Section ${escapeHtml(selectedSection)} • ${filteredStudents.length} students
          </p>
          <div class="cards">${cardsMarkup}</div>
        </body>
      </html>
    `);

        printWindow.document.close();
        printWindow.focus();
        printWindow.print();
    };

    return (
        <DashboardLayout user={user} activeTab="student-id-card">
            <div className="space-y-6 p-6">
                <div className="flex flex-col gap-4 md:flex-row md:items-center md:justify-between">
                    <div>
                        <h1 className="text-3xl font-bold text-gray-900">{t('Student ID Cards')}</h1>
                        <p className="mt-1 text-gray-600">
                            {t('Generate Student ID Card layouts and preview student identity details.')}
                        </p>
                    </div>
                    <div className="flex flex-col gap-2 sm:flex-row">
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
                        <Button
                            variant="outline"
                            className="gap-2"
                            onClick={handleBulkGenerate}
                            disabled={filteredStudents.length === 0}
                        >
                            <Plus className="h-4 w-4" />
                            {t('Bulk Generate')}
                        </Button>
                        <Button
                            variant="outline"
                            className="gap-2"
                            onClick={handleBulkDownloadPdf}
                            disabled={filteredStudents.length === 0}
                        >
                            <Download className="h-4 w-4" />
                            {t('Bulk Download PDF')}
                        </Button>
                        <Button className="gap-2" onClick={handleGenerateCard} disabled={!selectedStudent}>
                            <Plus className="h-4 w-4" />
                            {t('Generate Student ID Card')}
                        </Button>
                    </div>
                </div>

                <div className="grid gap-6 xl:grid-cols-[minmax(0,1fr)_420px]">
                    <Card>
                        <CardHeader>
                            <CardTitle>{t('ID Card Layout')}</CardTitle>
                        </CardHeader>
                        <CardContent className="grid gap-4 md:grid-cols-2">
                            <div className="space-y-2">
                                <Label>{t('Card Title')}</Label>
                                <Input value={cardTitle} onChange={(event) => setCardTitle(event.target.value)} />
                            </div>
                            <div className="space-y-2">
                                <Label>{t('Applicable Class')}</Label>
                                <Input
                                    value={applicableClass}
                                    onChange={(event) => setApplicableClass(event.target.value)}
                                />
                            </div>
                            <div className="space-y-2">
                                <Label>{t('Template Code')}</Label>
                                <Input value={templateCode} onChange={(event) => setTemplateCode(event.target.value)} />
                            </div>
                            <div className="space-y-2">
                                <Label>{t('Select Class')}</Label>
                                <Select value={selectedClass} onValueChange={setSelectedClass}>
                                    <SelectTrigger>
                                        <SelectValue placeholder={t('Choose a class')} />
                                    </SelectTrigger>
                                    <SelectContent>
                                        {classOptions.map((className) => (
                                            <SelectItem key={className} value={className}>
                                                {className}
                                            </SelectItem>
                                        ))}
                                    </SelectContent>
                                </Select>
                            </div>
                            <div className="space-y-2">
                                <Label>{t('Select Section')}</Label>
                                <Select
                                    value={selectedSection}
                                    onValueChange={setSelectedSection}
                                    disabled={!selectedClass || sectionOptions.length === 0}
                                >
                                    <SelectTrigger>
                                        <SelectValue placeholder={t('Choose a section')} />
                                    </SelectTrigger>
                                    <SelectContent>
                                        {sectionOptions.map((section) => (
                                            <SelectItem key={section} value={section}>
                                                {t('Section')}
                                                {section}
                                            </SelectItem>
                                        ))}
                                    </SelectContent>
                                </Select>
                            </div>
                            <div className="flex items-center justify-between gap-4 md:col-span-2">
                                <div>
                                    <Label>{t('Include attendance QR code')}</Label>
                                    <p className="text-xs text-slate-500">
                                        {t('Print a QR code on the card that can be scanned to mark attendance.')}
                                    </p>
                                </div>
                                <Switch
                                    checked={showQrCode}
                                    onCheckedChange={(checked) => setShowQrCode(Boolean(checked))}
                                />
                            </div>
                            <div className="space-y-2 md:col-span-2">
                                <Label>{t('Select Student')}</Label>
                                <Select value={selectedStudentId} onValueChange={setSelectedStudentId}>
                                    <SelectTrigger disabled={!selectedSection || filteredStudents.length === 0}>
                                        <SelectValue placeholder={t('Choose a student')} />
                                    </SelectTrigger>
                                    <SelectContent>
                                        {filteredStudents.map((student) => (
                                            <SelectItem key={student.id} value={student.id}>
                                                {student.first_name} {student.last_name} • {student.class}-
                                                {student.section}
                                            </SelectItem>
                                        ))}
                                    </SelectContent>
                                </Select>
                                <p className="text-xs text-slate-500">
                                    {filteredStudents.length}
                                    {t('student')}
                                    {filteredStudents.length === 1 ? '' : 's'}
                                    {t('found for the selected class and section.')}
                                </p>
                            </div>
                        </CardContent>
                    </Card>

                    <Card className="border-blue-100 bg-gradient-to-br from-sky-50 via-white to-blue-50 shadow-sm">
                        <CardHeader>
                            <CardTitle>{t('Student ID Card Preview')}</CardTitle>
                        </CardHeader>
                        <CardContent>
                            {selectedStudent && templateEnabled && assignedTemplate ? (
                                <div className="space-y-3">
                                    <p className="text-xs text-slate-500">
                                        {t('Default template:')}
                                        <span className="font-medium text-slate-700"> {assignedTemplate.title}</span>
                                    </p>
                                    <div className="overflow-x-auto pb-2">
                                        {facesForStudent(selectedStudent).map((face, index) => (
                                            <div key={index} className={index > 0 ? 'mt-3' : ''}>
                                                {index > 0 && (
                                                    <p className="mb-1 text-[10px] uppercase tracking-wide text-slate-400">
                                                        {t('Back')}
                                                    </p>
                                                )}
                                                <div
                                                    className="relative overflow-hidden rounded-sm border border-slate-300 bg-white"
                                                    style={{
                                                        width: `${face.widthMm}mm`,
                                                        height: `${face.heightMm}mm`,
                                                    }}
                                                    dangerouslySetInnerHTML={{ __html: face.html }}
                                                />
                                            </div>
                                        ))}
                                    </div>
                                </div>
                            ) : selectedStudent ? (
                                <CardFace
                                    design={{ ...design, show_qr: design.show_qr && showQrCode }}
                                    orgName={
                                        user?.organization?.name ?? user?.organization?.school_name ?? 'Gurukul School'
                                    }
                                    title={cardTitle || t('Student ID Card')}
                                    coachLabel={`${t('Template')} ${templateCode}`}
                                    onDownloadPdf={handleDownloadPdf}
                                    entity={{
                                        name:
                                            printLanguage === 'mr' &&
                                            (selectedStudent.first_name_mr || selectedStudent.last_name_mr)
                                                ? `${selectedStudent.first_name_mr || ''} ${selectedStudent.last_name_mr || ''}`.trim()
                                                : `${selectedStudent.first_name} ${selectedStudent.last_name}`,
                                        email: selectedStudent.email || null,
                                        phone: selectedStudent.phone || null,
                                        classLabel: applicableClass,
                                        admissionNo: buildAdmissionNumber(selectedStudent),
                                        idLabel: buildStudentCardId(selectedStudent),
                                        gender: selectedStudent.gender || null,
                                        bloodGroup: selectedStudent.blood_group || null,
                                        guardian:
                                            printLanguage === 'mr' &&
                                            (selectedStudent.father_name_mr || selectedStudent.mother_name_mr)
                                                ? selectedStudent.father_name_mr || selectedStudent.mother_name_mr
                                                : selectedStudent.father_name || selectedStudent.mother_name || null,
                                        address:
                                            printLanguage === 'mr' && selectedStudent.address_mr
                                                ? selectedStudent.address_mr
                                                : selectedStudent.address || null,
                                        qrToken: selectedStudent.qr_token || buildStudentCardId(selectedStudent),
                                    }}
                                />
                            ) : (
                                <div className="py-10 text-center text-gray-500">
                                    <IdCard className="mx-auto mb-3 h-10 w-10 text-gray-400" />
                                    {t('No students available for ID card generation.')}
                                </div>
                            )}
                        </CardContent>
                    </Card>
                </div>

                <Card>
                    <CardHeader>
                        <CardTitle>{t('Generated Student ID Cards')}</CardTitle>
                    </CardHeader>
                    <CardContent>
                        <div className="overflow-x-auto">
                            <Table>
                                <TableHeader>
                                    <TableRow>
                                        <TableHead>{t('Student')}</TableHead>
                                        <TableHead>{t('Student ID')}</TableHead>
                                        <TableHead>{t('Class')}</TableHead>
                                        <TableHead>{t('Template')}</TableHead>
                                        <TableHead>{t('Issued On')}</TableHead>
                                        <TableHead>{t('Status')}</TableHead>
                                    </TableRow>
                                </TableHeader>
                                <TableBody>
                                    {generatedCards.map((card) => (
                                        <TableRow key={card.id}>
                                            <TableCell className="font-medium">{card.studentName}</TableCell>
                                            <TableCell>{card.studentCardId}</TableCell>
                                            <TableCell>{card.classLabel}</TableCell>
                                            <TableCell>{card.templateTitle}</TableCell>
                                            <TableCell>{card.issuedOn}</TableCell>
                                            <TableCell>
                                                <Badge className="bg-emerald-100 text-emerald-700 hover:bg-emerald-100">
                                                    {t(card.status)}
                                                </Badge>
                                            </TableCell>
                                        </TableRow>
                                    ))}
                                </TableBody>
                            </Table>
                        </div>
                        {generatedCards.length === 0 && (
                            <div className="py-10 text-center text-gray-500">
                                <IdCard className="mx-auto mb-3 h-10 w-10 text-gray-400" />
                                {t('No Student ID Card generated yet.')}
                            </div>
                        )}
                    </CardContent>
                </Card>
            </div>
        </DashboardLayout>
    );
}
