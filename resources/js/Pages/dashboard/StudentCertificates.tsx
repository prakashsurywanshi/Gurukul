import React, { useMemo, useState } from 'react';
import DashboardLayout from '../DashboardLayout';
import { Badge } from '../ui/badge';
import { Button } from '../ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '../ui/card';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '../ui/dialog';
import { Award, Download, Eye } from 'lucide-react';
import { formatDate } from '../ui/utils';
import { toast } from 'sonner';

interface StudentCertificatesProps {
  user: any;
  schoolName: string;
  studentRecord?: StudentRecord | null;
  issuedCertificates: IssuedCertificateRecord[];
}

interface StudentRecord {
  id: string;
  admission_no?: string | null;
  first_name: string;
  last_name: string;
  class?: string | null;
  section?: string | null;
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

interface IssuedCertificateRecord {
  id: string;
  certificateNumber: string;
  templateTitle: string;
  templateType?: string | null;
  description?: string | null;
  studentName: string;
  admissionNo?: string | null;
  class?: string | null;
  section?: string | null;
  reason?: string | null;
  issueDate?: string | null;
  issuedBy?: string | null;
  issuedByDesignation?: string | null;
  templateData: CertificateTemplateData;
}

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

const CERTIFICATE_WIDTH = 820;
const CERTIFICATE_HEIGHT = 600;

const getPresetTheme = (preset: TemplatePreset) => {
  switch (preset) {
    case 'blue':
      return {
        borderWidth: '10px',
        borderStyle: 'double',
        borderColor: '#1d4ed8',
        backgroundColor: '#eff6ff',
        backgroundImage:
          'linear-gradient(to bottom right, #ffffff, #f0f9ff, #dbeafe), linear-gradient(135deg, rgba(59,130,246,.08), transparent 45%), linear-gradient(315deg, rgba(37,99,235,.06), transparent 40%)',
        backgroundSize: '100% 100%',
        boxShadow: 'inset 0 2px 14px rgba(59, 130, 246, 0.10)',
      };
    case 'yellow':
      return {
        borderWidth: '10px',
        borderStyle: 'double',
        borderColor: '#eab308',
        backgroundColor: '#dbeafe',
        backgroundImage:
          'linear-gradient(to bottom right, #dbeafe, #dbeafe, #ffffff), linear-gradient(135deg, rgba(234,179,8,.12), transparent 48%), radial-gradient(circle at top right, rgba(37,99,235,.08), transparent 35%)',
        backgroundSize: '100% 100%',
        boxShadow: 'inset 0 2px 14px rgba(234, 179, 8, 0.10)',
      };
    case 'green':
      return {
        borderWidth: '14px',
        borderStyle: 'double',
        borderColor: '#065f46',
        backgroundColor: '#f8fafc',
        backgroundImage: 'linear-gradient(90deg, rgba(5,150,105,.05), transparent 20%, rgba(132,204,22,.05) 80%)',
        backgroundSize: '100% 100%',
        boxShadow: 'inset 0 2px 14px rgba(5, 150, 105, 0.10)',
      };
    case 'orange':
      return {
        borderWidth: '10px',
        borderStyle: 'double',
        borderColor: '#ea580c',
        backgroundColor: '#eff6ff',
        backgroundImage:
          'linear-gradient(to bottom right, #eff6ff, #dbeafe, #ffffff), radial-gradient(circle at 18px 18px, rgba(234,88,12,.10) 1px, transparent 0)',
        backgroundSize: '36px 36px',
        boxShadow: 'inset 0 2px 14px rgba(234, 88, 12, 0.10)',
      };
    case 'all':
      return {
        borderWidth: '12px',
        borderStyle: 'double',
        borderColor: '#a21caf',
        backgroundColor: '#eff6ff',
        backgroundImage:
          'linear-gradient(to bottom right, #fff1f2, #fff7ed, #f0f9ff), linear-gradient(120deg, rgba(239,68,68,.08), rgba(37,99,235,.08), rgba(234,179,8,.08), rgba(34,197,94,.08), rgba(59,130,246,.08))',
        backgroundSize: '100% 100%',
        boxShadow: 'inset 0 2px 14px rgba(162, 28, 175, 0.10)',
      };
    case 'red':
    default:
      return {
        borderWidth: '10px',
        borderStyle: 'double',
        borderColor: '#b91c1c',
        backgroundColor: '#fff7f7',
        backgroundImage: 'radial-gradient(circle at 18px 18px, rgba(185,28,28,.09) 1px, transparent 0)',
        backgroundSize: '36px 36px',
        boxShadow: 'inset 0 2px 14px rgba(185, 28, 28, 0.10)',
      };
  }
};

const formatIssueDate = (value?: string | null) => {
  if (!value) return 'N/A';

  return formatDate(value, 'N/A');
};

const getVariableValue = (content: string, values: Record<string, string>) => {
  const match = VARIABLE_OPTIONS.find((item) => item.value === content);
  if (!match) return content;
  return values[content] || content;
};

const escapeHtml = (value: string) =>
  value
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#39;');

export default function StudentCertificates({ user, schoolName, studentRecord, issuedCertificates }: StudentCertificatesProps) {
  const [selectedCertificate, setSelectedCertificate] = useState<IssuedCertificateRecord | null>(null);

  const studentName = useMemo(() => {
    if (!studentRecord) return user?.name || 'Student';

    return [studentRecord.first_name, studentRecord.last_name].filter(Boolean).join(' ');
  }, [studentRecord, user?.name]);

  const getCertificateValues = (certificate: IssuedCertificateRecord) => ({
    '{{student_name}}': certificate.studentName || studentName,
    '{{admission_no}}': certificate.admissionNo || studentRecord?.admission_no || '',
    '{{class}}': certificate.class || studentRecord?.class || '',
    '{{section}}': certificate.section || studentRecord?.section || '',
    '{{achievement}}': certificate.reason || certificate.description || 'Certificate issued',
    '{{issue_date}}': formatIssueDate(certificate.issueDate),
    '{{issued_by}}': certificate.issuedBy || '',
    '{{school_name}}': schoolName,
  });

  const renderCanvas = (certificate: IssuedCertificateRecord) => {
    const variableValues = getCertificateValues(certificate);
    const theme = getPresetTheme(certificate.templateData.preset);

    return (
      <div
        className="relative h-[600px] w-[820px] shrink-0 overflow-hidden rounded-2xl p-8"
        style={{
          width: `${CERTIFICATE_WIDTH}px`,
          height: `${CERTIFICATE_HEIGHT}px`,
          borderWidth: theme.borderWidth,
          borderStyle: theme.borderStyle,
          borderColor: theme.borderColor,
          backgroundColor: theme.backgroundColor,
          backgroundImage: theme.backgroundImage,
          backgroundSize: theme.backgroundSize,
          boxShadow: theme.boxShadow,
        }}
      >
        {certificate.templateData.watermark.enabled ? (
          <div
            className="pointer-events-none absolute inset-0 flex items-center justify-center font-black uppercase tracking-[0.4em]"
            style={{
              color: certificate.templateData.watermark.color,
              opacity: certificate.templateData.watermark.opacity,
              transform: `rotate(${certificate.templateData.watermark.rotation}deg)`,
              fontSize: `${certificate.templateData.watermark.fontSize}px`,
            }}
          >
            {certificate.templateData.watermark.text}
          </div>
        ) : null}

        {certificate.templateData.elements.map((element) => (
          <div
            key={element.id}
            className="absolute"
            style={{
              left: element.x,
              top: element.y,
              width: element.width,
              fontSize: `${element.fontSize}px`,
              fontFamily: element.fontFamily,
              fontWeight: element.fontWeight,
              fontStyle: element.fontStyle,
              textDecoration: element.textDecoration,
              color: element.color,
              textAlign: element.align,
              lineHeight: 1.25,
            }}
          >
            {getVariableValue(element.content, variableValues)}
          </div>
        ))}
      </div>
    );
  };

  const handleDownload = (certificate: IssuedCertificateRecord) => {
    const variableValues = getCertificateValues(certificate);
    const theme = getPresetTheme(certificate.templateData.preset);
    const renderedElements = certificate.templateData.elements
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

    const watermark = certificate.templateData.watermark.enabled
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
          color:${certificate.templateData.watermark.color};
          opacity:${certificate.templateData.watermark.opacity};
          transform:rotate(${certificate.templateData.watermark.rotation}deg);
          font-size:${certificate.templateData.watermark.fontSize}px;
        ">${escapeHtml(certificate.templateData.watermark.text)}</div>
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
          <title>${escapeHtml(certificate.templateTitle)} - ${escapeHtml(certificate.studentName)}</title>
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
              width: ${CERTIFICATE_WIDTH}px;
              height: ${CERTIFICATE_HEIGHT}px;
              margin: 0 auto;
              overflow: hidden;
              border-radius: 16px;
              box-sizing: border-box;
              border-width: ${theme.borderWidth};
              border-style: ${theme.borderStyle};
              border-color: ${theme.borderColor};
              box-shadow: ${theme.boxShadow};
              background-color: ${theme.backgroundColor};
              background-image: ${theme.backgroundImage};
              background-size: ${theme.backgroundSize};
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

  return (
    <DashboardLayout user={user} activeTab="student-certificates">
      <div className="space-y-6 p-6">
        <div>
          <h1 className="text-3xl font-bold text-slate-900">My Certificates</h1>
          <p className="mt-1 text-sm text-slate-600">
            View and download the certificates issued to your student account.
          </p>
        </div>

        {!studentRecord ? (
          <Card>
            <CardContent className="py-12 text-center text-slate-500">
              Student certificate record not found.
            </CardContent>
          </Card>
        ) : (
          <>
            <div className="grid gap-4 md:grid-cols-3">
              <Card>
                <CardContent className="px-4 py-4">
                  <p className="text-xs uppercase tracking-wide text-slate-500">Student</p>
                  <p className="mt-2 text-xl font-bold text-slate-900">{studentName}</p>
                  <p className="text-sm text-slate-500">{studentRecord.admission_no || 'No admission no.'}</p>
                </CardContent>
              </Card>
              <Card>
                <CardContent className="px-4 py-4">
                  <p className="text-xs uppercase tracking-wide text-slate-500">Class</p>
                  <p className="mt-2 text-xl font-bold text-slate-900">
                    {studentRecord.class ? `${studentRecord.class}` : 'N/A'}
                    {studentRecord.section ? ` - ${studentRecord.section}` : ''}
                  </p>
                </CardContent>
              </Card>
              <Card>
                <CardContent className="px-4 py-4">
                  <p className="text-xs uppercase tracking-wide text-slate-500">Certificates Issued</p>
                  <p className="mt-2 text-2xl font-bold text-slate-900">{issuedCertificates.length}</p>
                </CardContent>
              </Card>
            </div>

            <Card>
              <CardHeader>
                <CardTitle>Issued Certificates</CardTitle>
              </CardHeader>
              <CardContent>
                {issuedCertificates.length === 0 ? (
                  <div className="py-12 text-center">
                    <Award className="mx-auto mb-4 h-16 w-16 text-slate-300" />
                    <p className="text-slate-500">No certificates have been issued to you yet.</p>
                  </div>
                ) : (
                  <div className="grid gap-4 lg:grid-cols-2">
                    {issuedCertificates.map((certificate) => (
                      <Card key={certificate.id} className="border-slate-200">
                        <CardContent className="space-y-4 p-5">
                          <div className="flex items-start justify-between gap-3">
                            <div>
                              <p className="text-lg font-semibold text-slate-900">{certificate.templateTitle}</p>
                              <p className="text-sm text-slate-500">Certificate No. {certificate.certificateNumber}</p>
                            </div>
                            {certificate.templateType ? (
                              <Badge variant="secondary" className="capitalize">
                                {certificate.templateType}
                              </Badge>
                            ) : null}
                          </div>

                          <div className="space-y-1 text-sm text-slate-600">
                            <p>Issued on {formatIssueDate(certificate.issueDate)}</p>
                            <p>
                              By {certificate.issuedBy || 'N/A'}
                              {certificate.issuedByDesignation ? ` (${certificate.issuedByDesignation})` : ''}
                            </p>
                            {certificate.reason ? <p>{certificate.reason}</p> : null}
                          </div>

                          <div className="flex flex-wrap gap-2">
                            <Button variant="outline" className="gap-2" onClick={() => setSelectedCertificate(certificate)}>
                              <Eye className="h-4 w-4" />
                              View Certificate
                            </Button>
                            <Button className="gap-2" onClick={() => handleDownload(certificate)}>
                              <Download className="h-4 w-4" />
                              Download
                            </Button>
                          </div>
                        </CardContent>
                      </Card>
                    ))}
                  </div>
                )}
              </CardContent>
            </Card>
          </>
        )}

        <Dialog open={Boolean(selectedCertificate)} onOpenChange={(open) => !open && setSelectedCertificate(null)}>
          <DialogContent className="max-h-[90vh] max-w-[calc(100vw-2rem)] overflow-y-auto">
            {selectedCertificate ? (
              <>
                <DialogHeader>
                  <DialogTitle>{selectedCertificate.templateTitle}</DialogTitle>
                </DialogHeader>
                <div className="space-y-4">
                  <div className="rounded-xl border bg-slate-100 p-4">
                    <div className="overflow-auto">
                      <div className="inline-block min-w-max">{renderCanvas(selectedCertificate)}</div>
                    </div>
                  </div>
                  <div className="flex justify-end gap-2">
                    <Button variant="outline" onClick={() => setSelectedCertificate(null)}>
                      Close
                    </Button>
                    <Button className="gap-2" onClick={() => handleDownload(selectedCertificate)}>
                      <Download className="h-4 w-4" />
                      Download
                    </Button>
                  </div>
                </div>
              </>
            ) : null}
          </DialogContent>
        </Dialog>
      </div>
    </DashboardLayout>
  );
}
