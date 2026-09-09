import { useLanguage } from '../../i18n/LanguageProvider';
import { useEffect, useState } from 'react';
import { router, usePage } from '@inertiajs/react';
import { AlertTriangle, ArrowLeft, CalendarDays, CheckCircle2, Pencil, Printer, Send } from 'lucide-react';
import DashboardLayout from '../DashboardLayout';
import { Badge } from '../ui/badge';
import { Button } from '../ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '../ui/card';
import { Checkbox } from '../ui/checkbox';
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from '../ui/dialog';
import { Label } from '../ui/label';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '../ui/table';
import { Textarea } from '../ui/textarea';
import { toast } from 'sonner';

interface SheetRow {
    date: string;
    day: string;
    subject: string;
    startTime: string | null;
    endTime: string | null;
    room: string | null;
    className?: string | null;
}

interface Sheet {
    title: string;
    rows: SheetRow[];
    warnings: string[];
}

export default function DatesheetDetail({
    user,
    exam,
    allSheet,
    classSheets,
    published,
    hasSchedule,
}: {
    user: any;
    exam: {
        id: number;
        name: string;
        publishStatus: string;
        publishedNote: string | null;
        startDate: string | null;
        endDate: string | null;
        classesInScope: number;
        papers: number;
    };
    allSheet: Sheet;
    classSheets: Sheet[];
    published: boolean;
    hasSchedule: boolean;
}) {
    const { t } = useLanguage();
    const flash = (usePage().props as any).flash ?? {};
    const [processing, setProcessing] = useState(false);

    const [publishScope, setPublishScope] = useState<'all' | string>('all');
    const [publishDialogOpen, setPublishDialogOpen] = useState(false);
    const [note, setNote] = useState(exam.publishedNote ?? '');
    const [notifyParents, setNotifyParents] = useState(true);

    useEffect(() => {
        if (flash.success) {
            toast.success(flash.success);
        }

        if (flash.error) {
            toast.error(flash.error);
        }
    }, [flash.error, flash.success]);

    const openPublish = (scope: 'all' | string) => {
        setPublishScope(scope);
        setNote(exam.publishedNote ?? '');
        setNotifyParents(true);
        setPublishDialogOpen(true);
    };

    const submitPublish = () => {
        setProcessing(true);
        router.post(
            `/datesheets/${exam.id}/publish`,
            { scope: publishScope, note: note || null },
            {
                preserveScroll: true,
                onSuccess: () => setPublishDialogOpen(false),
                onError: () => toast.error('Failed to publish datesheet.'),
                onFinish: () => setProcessing(false),
            },
        );
    };

    const SheetTable = ({ sheet, showClassColumn }: { sheet: Sheet; showClassColumn?: boolean }) => (
        <Table>
            <TableHeader>
                <TableRow>
                    <TableHead>{t('Date')}</TableHead>
                    <TableHead>{t('Day')}</TableHead>
                    <TableHead>{t('Subject')}</TableHead>
                    {showClassColumn && <TableHead>{t('Class')}</TableHead>}
                    <TableHead>{t('Time')}</TableHead>
                    <TableHead>{t('Room')}</TableHead>
                </TableRow>
            </TableHeader>
            <TableBody>
                {sheet.rows.length === 0 ? (
                    <TableRow>
                        <TableCell colSpan={6} className="h-20 text-center text-slate-500">
                            {t('Nothing scheduled yet.')}
                        </TableCell>
                    </TableRow>
                ) : (
                    sheet.rows.map((row, index) => (
                        <TableRow key={`${row.date}-${row.subject}-${index}`}>
                            <TableCell className="text-sm font-medium text-slate-900">{row.date}</TableCell>
                            <TableCell className="text-sm text-slate-600">{row.day}</TableCell>
                            <TableCell className="text-sm text-slate-600">{row.subject}</TableCell>
                            {showClassColumn && (
                                <TableCell className="text-sm text-slate-600">{row.className ?? '-'}</TableCell>
                            )}
                            <TableCell className="text-sm text-slate-600">
                                {row.startTime} &ndash; {row.endTime}
                            </TableCell>
                            <TableCell className="text-sm text-slate-600">{row.room ?? '-'}</TableCell>
                        </TableRow>
                    ))
                )}
            </TableBody>
        </Table>
    );

    const SheetCard = ({
        sheet,
        scope,
        showClassColumn,
    }: {
        sheet: Sheet;
        scope: string;
        showClassColumn?: boolean;
    }) => (
        <Card>
            <CardHeader className="flex flex-col gap-3 md:flex-row md:items-center md:justify-between">
                <div>
                    <div className="flex items-center gap-2">
                        <CardTitle>{sheet.title}</CardTitle>
                        <Badge variant="outline">
                            {sheet.rows.length} {t('papers')}
                        </Badge>
                    </div>
                    {sheet.warnings.length > 0 ? (
                        <CardDescription className="pt-2">
                            <div className="flex items-center gap-1.5 text-amber-600">
                                <AlertTriangle className="h-4 w-4" />
                                {t('Worth checking')}
                            </div>
                            <ul className="mt-1 space-y-0.5">
                                {sheet.warnings.map((warning) => (
                                    <li key={warning}>
                                        {warning} &mdash; {t('no room')}
                                    </li>
                                ))}
                            </ul>
                        </CardDescription>
                    ) : (
                        <CardDescription>{t('All papers have a room assigned.')}</CardDescription>
                    )}
                </div>
                <div className="flex flex-shrink-0 flex-wrap items-center gap-2 print:hidden">
                    <Button
                        type="button"
                        variant="outline"
                        size="sm"
                        className="gap-1.5"
                        onClick={() => window.print()}
                    >
                        <Printer className="h-4 w-4" />
                        {t('Print PDF')}
                    </Button>
                    <Button type="button" size="sm" className="gap-1.5" onClick={() => openPublish(scope)}>
                        <Send className="h-4 w-4" />
                        {t('Publish')}
                    </Button>
                </div>
            </CardHeader>
            <CardContent>
                <div className="overflow-hidden rounded-lg border border-slate-200">
                    <SheetTable sheet={sheet} showClassColumn={showClassColumn} />
                </div>
            </CardContent>
        </Card>
    );

    return (
        <DashboardLayout user={user} activeTab="datesheets">
            <div className="min-h-full bg-slate-50 p-6">
                <div className="space-y-6 print:space-y-4">
                    <div className="flex flex-col gap-4 md:flex-row md:items-center md:justify-between print:hidden">
                        <div>
                            <a
                                href="/datesheets"
                                className="inline-flex items-center gap-1 text-sm font-medium text-blue-600 hover:text-blue-700"
                            >
                                <ArrowLeft className="h-4 w-4" />
                                {t('All datesheets')}
                            </a>
                            <div className="mt-2 flex items-center gap-2">
                                <h1 className="text-3xl font-bold text-slate-900">{exam.name}</h1>
                                {published ? (
                                    <Badge className="gap-1 bg-emerald-50 text-emerald-700 hover:bg-emerald-50">
                                        <CheckCircle2 className="h-3 w-3" />
                                        {t('Published')}
                                    </Badge>
                                ) : (
                                    <Badge variant="secondary">{t('Not published')}</Badge>
                                )}
                            </div>
                            <div className="mt-2 flex flex-wrap items-center gap-x-4 gap-y-1 text-sm text-slate-600">
                                <span className="flex items-center gap-1.5">
                                    <CalendarDays className="h-4 w-4 text-slate-400" />
                                    {exam.startDate ?? '-'} {t('to')} {exam.endDate ?? '-'}
                                </span>
                                <span>
                                    {exam.classesInScope} {t('classes in scope')} &middot; {exam.papers} {t('papers')}
                                </span>
                            </div>
                        </div>
                        <div className="flex gap-2">
                            <Button asChild variant="outline" className="gap-2">
                                <a href="/exams">
                                    <Pencil className="h-4 w-4" />
                                    {t('Edit dates')}
                                </a>
                            </Button>
                        </div>
                    </div>

                    <div className={`print:block ${published ? '' : 'print:hidden'}`}>
                        {published && (
                            <Card className="border-emerald-200 bg-emerald-50/60">
                                <CardHeader>
                                    <CardTitle className="flex items-center gap-2 text-emerald-800">
                                        <CheckCircle2 className="h-5 w-5" />
                                        {t('This datesheet is published')}
                                    </CardTitle>
                                    <CardDescription>
                                        {exam.publishedNote
                                            ? exam.publishedNote
                                            : t(
                                                  'Published for all classes. Use the publish action to update the message.',
                                              )}
                                    </CardDescription>
                                </CardHeader>
                            </Card>
                        )}
                    </div>

                    {!hasSchedule ? (
                        <Card>
                            <CardHeader>
                                <CardTitle>{t('Nothing scheduled yet')}</CardTitle>
                                <CardDescription>
                                    {t(
                                        'A datesheet is built from the exam schedule. Set the dates in Schedule & Marks Setup first, then come back here to publish.',
                                    )}
                                </CardDescription>
                            </CardHeader>
                            <CardContent className="print:hidden">
                                <Button asChild className="gap-2">
                                    <a href="/exams">
                                        <Pencil className="h-4 w-4" />
                                        {t('Set exam dates')}
                                    </a>
                                </Button>
                            </CardContent>
                        </Card>
                    ) : (
                        <>
                            <div className="flex items-center gap-2 print:hidden">
                                <CardTitle className="text-lg">{t('Notice-board sheet')}</CardTitle>
                            </div>
                            <div>
                                <CardDescription className="mb-2">
                                    {t('One document covering all classes — the single sheet you pin up.')}
                                </CardDescription>
                                <SheetCard sheet={allSheet} scope="all" showClassColumn />
                            </div>

                            <div className="flex items-center gap-2 print:hidden">
                                <CardTitle className="text-lg">{t('Class sheets')}</CardTitle>
                            </div>
                            <div className="print:hidden">
                                {classSheets.map((sheet) => (
                                    <div key={sheet.title} className="space-y-4">
                                        <SheetCard sheet={sheet} scope={sheet.title} />
                                        <div className="print:block" />
                                    </div>
                                ))}
                            </div>
                            <div className="hidden print:block">
                                <div>
                                    <h2 className="max-w-none text-lg">{allSheet.title}</h2>
                                    <SheetTable sheet={allSheet} showClassColumn />
                                </div>
                            </div>
                        </>
                    )}
                </div>

                <Dialog open={publishDialogOpen} onOpenChange={setPublishDialogOpen}>
                    <DialogContent className="sm:max-w-md">
                        <DialogHeader>
                            <DialogTitle>
                                {publishScope === 'all'
                                    ? t('Publish datesheet — all classes')
                                    : t(`Publish datesheet — ${publishScope}`)}
                            </DialogTitle>
                            <DialogDescription>
                                {t('Visible on the notice board and in the parent app once published.')}
                            </DialogDescription>
                        </DialogHeader>
                        <div className="grid gap-4 py-2">
                            <div className="space-y-2">
                                <Label>{t('Note for parents (optional)')}</Label>
                                <Textarea
                                    value={note}
                                    onChange={(event) => setNote(event.target.value)}
                                    rows={3}
                                    placeholder={t('Appears on the printed sheet and in the message.')}
                                />
                            </div>
                            <div className="flex items-center gap-2">
                                <Checkbox
                                    checked={notifyParents}
                                    onCheckedChange={(checked) => setNotifyParents(Boolean(checked))}
                                    id="notify-parents"
                                />
                                <Label htmlFor="notify-parents" className="cursor-pointer">
                                    {t('Notify parents now')}
                                </Label>
                            </div>
                            <p className="text-xs text-slate-500">
                                {t('In-app notifications always go out when published.')}
                            </p>
                        </div>
                        <DialogFooter>
                            <Button type="button" variant="outline" onClick={() => setPublishDialogOpen(false)}>
                                {t('Cancel')}
                            </Button>
                            <Button type="button" onClick={submitPublish} disabled={processing} className="gap-2">
                                <Send className="h-4 w-4" />
                                {processing ? t('Publishing...') : t('Publish')}
                            </Button>
                        </DialogFooter>
                    </DialogContent>
                </Dialog>
            </div>
        </DashboardLayout>
    );
}
