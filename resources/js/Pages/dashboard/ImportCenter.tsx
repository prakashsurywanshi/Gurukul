import { useLanguage } from '../../i18n/LanguageProvider';
import { useEffect, useRef, useState } from 'react';
import { router, usePage } from '@inertiajs/react';
import {
    ArrowDownToLine,
    ArrowUpFromLine,
    BadgePercent,
    BookOpen,
    Download,
    FileSpreadsheet,
    IndianRupee,
    Trash2,
    Upload,
    UserRound,
    Users,
} from 'lucide-react';
import DashboardLayout from '../DashboardLayout';
import { Button } from '../ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '../ui/card';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '../ui/table';
import { Badge } from '../ui/badge';
import { toast } from 'sonner';

interface TemplateOption {
    description: string;
    href: string;
    icon: string;
}

interface RoleOption {
    slug: string;
    label: string;
}

interface RecentImport {
    type: string;
    id: string;
    status: string;
    submitted_count: number;
    created_count: number;
    skipped_count: number;
    error_message: string | null;
    created_at: string | null;
}

const ICONS: Record<string, typeof Users> = {
    UserRound,
    Users,
    IndianRupee,
    ArrowDownToLine,
    ArrowUpFromLine,
    BookOpen,
    BadgePercent,
};

const STAFF_HEADERS = ['name', 'email', 'phone', 'role', 'status', 'employee_id', 'designation', 'department'];

const STAFF_SAMPLE = `${STAFF_HEADERS.join(',')}\nRajesh Kumar,rajesh@gurukul.test,,teacher,active,T-101,Science Teacher,Science\nPriya Sharma,priya@gurukul.test,9876543211,accountant,active,A-201,Accounts Officer,Accounts`;

export default function ImportCenter({
    user,
    templates,
    recentImports,
    roleOptions,
}: {
    user: any;
    templates: Record<string, TemplateOption>;
    recentImports: RecentImport[];
    roleOptions: RoleOption[];
}) {
    const { t } = useLanguage();
    const flash = (usePage().props as any).flash ?? {};
    const fileInputRef = useRef<HTMLInputElement>(null);
    const [importFile, setImportFile] = useState<File | null>(null);
    const [importData, setImportData] = useState<Record<string, string>[]>([]);
    const [importErrors, setImportErrors] = useState<string[]>([]);
    const [isImporting, setIsImporting] = useState(false);
    const [importStatusMessage, setImportStatusMessage] = useState('');

    useEffect(() => {
        if (flash.success) {
            toast.success(flash.success);
        }

        if (flash.error) {
            toast.error(flash.error);
        }
    }, [flash.error, flash.success]);

    const parseCsvLine = (line: string) => {
        const values: string[] = [];
        let currentValue = '';
        let inQuotes = false;

        for (let index = 0; index < line.length; index += 1) {
            const char = line[index];
            const nextChar = line[index + 1];

            if (char === '"') {
                if (inQuotes && nextChar === '"') {
                    currentValue += '"';
                    index += 1;
                } else {
                    inQuotes = !inQuotes;
                }
                continue;
            }

            if (char === ',' && !inQuotes) {
                values.push(currentValue.trim());
                currentValue = '';
                continue;
            }

            currentValue += char;
        }

        values.push(currentValue.trim());

        return values;
    };

    const readStaffCSV = (file: File) => {
        const reader = new FileReader();

        reader.onload = () => {
            const content = String(reader.result ?? '');
            const lines = content
                .split('\n')
                .map((line) => line.trim())
                .filter((line) => line.length > 0);

            if (lines.length < 2) {
                setImportErrors(['The CSV file must include a header row and at least one staff row.']);
                setImportData([]);
                return;
            }

            const headers = parseCsvLine(lines[0]).map((header) => header.trim());
            const missingHeaders = STAFF_HEADERS.filter((header) => !headers.includes(header));
            const requiredHeaders = ['name', 'email'];

            if (missingHeaders.length > 0) {
                setImportErrors([`Missing required headers: ${missingHeaders.join(', ')}`]);
                setImportData([]);
                return;
            }

            const rowErrors: string[] = [];
            const data = lines
                .slice(1)
                .map((line, index) => {
                    const cells = parseCsvLine(line);
                    const row: Record<string, string> = {};

                    headers.forEach((header, cellIndex) => {
                        row[header] = cells[cellIndex] ?? '';
                    });

                    const hasAnyValue = Object.values(row).some((value) => String(value).trim().length > 0);

                    if (!hasAnyValue) {
                        return null;
                    }

                    const missingRequiredValues = requiredHeaders.filter((header) => !String(row[header] ?? '').trim());

                    if (missingRequiredValues.length > 0) {
                        rowErrors.push(`Row ${index + 2} is missing: ${missingRequiredValues.join(', ')}`);
                    }

                    return row;
                })
                .filter(Boolean) as Record<string, string>[];

            if (data.length === 0) {
                setImportErrors(['No valid staff rows were found in the CSV file.']);
                setImportData([]);
                return;
            }

            setImportErrors(rowErrors);
            setImportData(data);
        };

        reader.onerror = () => {
            setImportErrors(['The selected CSV file could not be read.']);
            setImportData([]);
        };

        reader.readAsText(file);
    };

    const handleFileChange = (event: React.ChangeEvent<HTMLInputElement>) => {
        const file = event.target.files?.[0];
        if (file) {
            setImportFile(file);
            setImportErrors([]);
            setImportData([]);
            setImportStatusMessage('');
            readStaffCSV(file);
        }
    };

    const handleImport = () => {
        if (importData.length === 0) {
            setImportErrors(['Please upload a valid CSV file before importing.']);
            return;
        }

        setIsImporting(true);
        setImportStatusMessage(
            importErrors.length > 0
                ? 'Uploading staff records. Rows with issues will be skipped during processing...'
                : 'Uploading staff records to the import queue...',
        );

        router.post(
            '/import-center/staff',
            { staff: importData },
            {
                preserveScroll: true,
                preserveState: true,
                onSuccess: () => {
                    setImportStatusMessage('Import queued. The background worker will process the staff rows.');
                    window.setTimeout(() => {
                        setImportFile(null);
                        setImportData([]);
                        setImportErrors([]);
                        setImportStatusMessage('');
                        if (fileInputRef.current) {
                            fileInputRef.current.value = '';
                        }
                    }, 350);
                },
                onError: (errors) => {
                    const errorMessages = Object.values(errors)
                        .flat()
                        .map((error) => String(error));
                    setImportErrors(errorMessages.length > 0 ? errorMessages : ['Failed to import staff.']);
                    setImportStatusMessage('');
                },
                onFinish: () => setIsImporting(false),
            },
        );
    };

    const handleDeleteImport = (row: RecentImport) => {
        if (row.type !== 'Staff') {
            return;
        }

        if (['queued', 'processing'].includes(row.status)) {
            toast.error('Active imports cannot be deleted while they are still running.');
            return;
        }

        if (!window.confirm('Delete this import history entry? This will not delete imported staff accounts.')) {
            return;
        }

        router.delete(`/import-center/imports/${row.id}`, { preserveScroll: true });
    };

    const downloadStaffTemplate = () => {
        const blob = new Blob([STAFF_SAMPLE], { type: 'text/csv' });
        const url = URL.createObjectURL(blob);
        const link = document.createElement('a');
        link.href = url;
        link.download = 'staff-import-template.csv';
        link.click();
        URL.revokeObjectURL(url);
    };

    const renderStatus = (status: string) => {
        const className =
            status === 'completed'
                ? 'bg-green-100 text-green-700 hover:bg-green-100'
                : status === 'completed_with_errors' || status === 'failed'
                  ? 'bg-red-100 text-red-700 hover:bg-red-100'
                  : 'bg-amber-100 text-amber-700 hover:bg-amber-100';

        return <Badge className={className}>{status}</Badge>;
    };

    const canImportStaff = ['admin', 'super_admin'].includes(user?.role);

    return (
        <DashboardLayout user={user} activeTab="import-center">
            <div className="min-h-full bg-slate-50 p-6">
                <div className="space-y-6">
                    <div>
                        <h1 className="text-3xl font-bold text-slate-900">{t('Import Center')}</h1>
                        <p className="mt-1 text-sm text-slate-600">
                            {t('Bulk import students, staff and financial records from spreadsheets.')}
                        </p>
                    </div>

                    <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
                        {Object.entries(templates).map(([name, template]) => {
                            const Icon = ICONS[template.icon] ?? FileSpreadsheet;

                            return (
                                <Card
                                    key={name}
                                    className={template.href === '#staff-import' ? 'ring-2 ring-blue-200' : ''}
                                >
                                    <CardHeader className="pb-2">
                                        <CardTitle className="flex items-center gap-2">
                                            <Icon className="h-5 w-5 text-blue-600" />
                                            {name}
                                        </CardTitle>
                                        <CardDescription>{t(template.description)}</CardDescription>
                                    </CardHeader>
                                    <CardContent>
                                        <Button
                                            variant={template.href === '#staff-import' ? 'default' : 'outline'}
                                            asChild={template.href !== '#staff-import'}
                                        >
                                            {template.href === '#staff-import' ? (
                                                <span
                                                    role="button"
                                                    tabIndex={0}
                                                    onClick={() => (window.location.hash = '#staff-import')}
                                                    onKeyDown={(event) => {
                                                        if (event.key === 'Enter') {
                                                            window.location.hash = '#staff-import';
                                                        }
                                                    }}
                                                    className="gap-2"
                                                >
                                                    <Upload className="h-4 w-4" />
                                                    {t('Launch Staff Import')}
                                                </span>
                                            ) : (
                                                <a href={template.href} className="gap-2">
                                                    <FileSpreadsheet className="h-4 w-4" />
                                                    {t('Open Importer')}
                                                </a>
                                            )}
                                        </Button>
                                    </CardContent>
                                </Card>
                            );
                        })}
                    </div>

                    {canImportStaff && (
                        <Card className="scroll-mt-20" id="staff-import">
                            <CardHeader className="pb-2">
                                <CardTitle className="flex items-center gap-2">
                                    <Users className="h-5 w-5 text-blue-600" />
                                    {t('Import Staff')}
                                </CardTitle>
                                <CardDescription>
                                    {t('Upload a CSV with name, email, phone, role, and optional department fields.')}
                                </CardDescription>
                            </CardHeader>
                            <CardContent className="space-y-4">
                                <div className="flex flex-wrap items-center gap-3">
                                    <input
                                        ref={fileInputRef}
                                        type="file"
                                        accept=".csv,text/csv"
                                        onChange={handleFileChange}
                                        className="block w-full max-w-md text-sm text-slate-500 file:mr-3 file:rounded-md file:border-0 file:bg-blue-50 file:px-4 file:py-2 file:text-sm file:font-medium file:text-blue-700 hover:file:bg-blue-100"
                                    />
                                    <Button variant="outline" onClick={downloadStaffTemplate} className="gap-2">
                                        <Download className="h-4 w-4" />
                                        {t('Download Template')}
                                    </Button>
                                </div>

                                <div>
                                    <p className="text-sm font-medium text-slate-700">{t('Required columns')}:</p>
                                    <p className="mt-1 text-xs text-slate-500">{STAFF_HEADERS.join(', ')}</p>
                                </div>

                                <div>
                                    <p className="text-sm font-medium text-slate-700">{t('Roles')}:</p>
                                    <div className="mt-1 flex flex-wrap gap-1.5">
                                        {roleOptions.map((role) => (
                                            <Badge key={role.slug} variant="outline">
                                                {role.label}
                                            </Badge>
                                        ))}
                                    </div>
                                </div>

                                {importErrors.length > 0 && (
                                    <div className="rounded-lg border border-red-200 bg-red-50 p-3 text-sm text-red-700">
                                        <ul className="list-disc space-y-1 pl-5">
                                            {importErrors.map((error) => (
                                                <li key={error}>{error}</li>
                                            ))}
                                        </ul>
                                    </div>
                                )}

                                {importData.length > 0 && (
                                    <div className="overflow-hidden rounded-lg border border-slate-200">
                                        <Table>
                                            <TableHeader>
                                                <TableRow>
                                                    <TableHead className="w-12">#</TableHead>
                                                    <TableHead>{t('Name')}</TableHead>
                                                    <TableHead>{t('Email')}</TableHead>
                                                    <TableHead>{t('Phone')}</TableHead>
                                                    <TableHead>{t('Role')}</TableHead>
                                                    <TableHead>{t('Department')}</TableHead>
                                                </TableRow>
                                            </TableHeader>
                                            <TableBody>
                                                {importData.slice(0, 10).map((row, index) => (
                                                    <TableRow key={`${row.email}-${index}`}>
                                                        <TableCell className="text-sm text-slate-500">
                                                            {index + 1}
                                                        </TableCell>
                                                        <TableCell className="font-medium text-slate-800">
                                                            {row.name}
                                                        </TableCell>
                                                        <TableCell className="text-sm text-slate-500">
                                                            {row.email}
                                                        </TableCell>
                                                        <TableCell className="text-sm text-slate-500">
                                                            {row.phone || '-'}
                                                        </TableCell>
                                                        <TableCell className="text-sm text-slate-500">
                                                            {row.role || '-'}
                                                        </TableCell>
                                                        <TableCell className="text-sm text-slate-500">
                                                            {row.department || '-'}
                                                        </TableCell>
                                                    </TableRow>
                                                ))}
                                            </TableBody>
                                        </Table>
                                        {importData.length > 10 && (
                                            <p className="border-t border-slate-200 px-4 py-2 text-xs text-slate-500">
                                                {t('Showing first')} 10 {t('of')} {importData.length} {t('rows.')}
                                            </p>
                                        )}
                                    </div>
                                )}

                                {importData.length > 0 && (
                                    <div className="flex items-center gap-3">
                                        <Button onClick={handleImport} disabled={isImporting} className="gap-2">
                                            <Upload className="h-4 w-4" />
                                            {isImporting ? t('Importing...') : t(`Import ${importData.length} Staff`)}
                                        </Button>
                                        {importStatusMessage && (
                                            <span className="text-sm text-slate-600">{importStatusMessage}</span>
                                        )}
                                    </div>
                                )}
                            </CardContent>
                        </Card>
                    )}

                    <Card>
                        <CardHeader className="pb-2">
                            <CardTitle>{t('Recent Imports')}</CardTitle>
                            <CardDescription>
                                {t('Progress of student and staff import jobs queued for your organization.')}
                            </CardDescription>
                        </CardHeader>
                        <CardContent>
                            {recentImports.length === 0 ? (
                                <p className="rounded-lg border border-dashed border-slate-300 bg-slate-50 p-8 text-center text-sm text-slate-500">
                                    {t('No import jobs yet. Use one of the importers above to get started.')}
                                </p>
                            ) : (
                                <div className="overflow-hidden rounded-lg border border-slate-200">
                                    <Table>
                                        <TableHeader>
                                            <TableRow>
                                                <TableHead>{t('Type')}</TableHead>
                                                <TableHead>{t('Status')}</TableHead>
                                                <TableHead>{t('Submitted')}</TableHead>
                                                <TableHead>{t('Created')}</TableHead>
                                                <TableHead>{t('Skipped')}</TableHead>
                                                <TableHead>{t('Error')}</TableHead>
                                                <TableHead>{t('Requested At')}</TableHead>
                                                <TableHead className="text-right">{t('Actions')}</TableHead>
                                            </TableRow>
                                        </TableHeader>
                                        <TableBody>
                                            {recentImports.map((row) => (
                                                <TableRow key={`${row.type}-${row.id}`}>
                                                    <TableCell className="font-medium text-slate-800">
                                                        {row.type}
                                                    </TableCell>
                                                    <TableCell>{renderStatus(row.status)}</TableCell>
                                                    <TableCell className="text-sm text-slate-500">
                                                        {row.submitted_count}
                                                    </TableCell>
                                                    <TableCell className="text-sm text-slate-500">
                                                        {row.created_count}
                                                    </TableCell>
                                                    <TableCell className="text-sm text-slate-500">
                                                        {row.skipped_count}
                                                    </TableCell>
                                                    <TableCell className="max-w-[240px] truncate text-sm text-slate-500">
                                                        {row.error_message || <span className="text-slate-400">-</span>}
                                                    </TableCell>
                                                    <TableCell className="text-sm text-slate-500">
                                                        {row.created_at
                                                            ? new Date(row.created_at).toLocaleString()
                                                            : '-'}
                                                    </TableCell>
                                                    <TableCell>
                                                        {row.type === 'Staff' && (
                                                            <div className="flex justify-end">
                                                                <Button
                                                                    type="button"
                                                                    variant="ghost"
                                                                    size="sm"
                                                                    className="text-red-600 hover:bg-red-50"
                                                                    onClick={() => handleDeleteImport(row)}
                                                                >
                                                                    <Trash2 className="h-3.5 w-3.5" />
                                                                    {t('Delete')}
                                                                </Button>
                                                            </div>
                                                        )}
                                                    </TableCell>
                                                </TableRow>
                                            ))}
                                        </TableBody>
                                    </Table>
                                </div>
                            )}
                        </CardContent>
                    </Card>
                </div>
            </div>
        </DashboardLayout>
    );
}
