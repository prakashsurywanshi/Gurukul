import { useLanguage } from '../../i18n/LanguageProvider';
import { useEffect, useMemo, useState } from 'react';
import { router, usePage } from '@inertiajs/react';
import { Megaphone, Pencil, Plus, Trash2 } from 'lucide-react';
import DashboardLayout from '../DashboardLayout';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '../ui/card';
import { Badge } from '../ui/badge';
import { Button } from '../ui/button';
import {
    Dialog,
    DialogContent,
    DialogDescription,
    DialogFooter,
    DialogHeader,
    DialogTitle,
    DialogTrigger,
} from '../ui/dialog';
import { Input } from '../ui/input';
import { Label } from '../ui/label';
import { Textarea } from '../ui/textarea';
import { Checkbox } from '../ui/checkbox';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '../ui/select';
import { toast } from 'sonner';
import { Notice, NoticeBoardPanel } from './notice-board/NoticeBoardPanel';
import { formatDate } from '../ui/utils';

interface NoticeRecord extends Notice {
    audienceType?: 'students' | 'staff' | 'both' | 'class_section';
    selectedGroups?: string[];
    createdBy?: string;
}

interface NoticeBoardProps {
    user: any;
    notices: NoticeRecord[];
    classOptions: string[];
    sectionOptions: string[];
    classSectionOptions: { value: string; label: string }[];
    canManageNotices: boolean;
}

export default function NoticeBoard({
    user,
    notices,
    classOptions,
    sectionOptions,
    classSectionOptions,
    canManageNotices,
}: NoticeBoardProps) {
    const { t } = useLanguage();
    const { errors, flash } = usePage().props as any;
    const [showNoticeDialog, setShowNoticeDialog] = useState(false);
    const [editingNoticeId, setEditingNoticeId] = useState<string | null>(null);
    const [noticeForm, setNoticeForm] = useState({
        title: '',
        audienceType: 'both' as 'students' | 'staff' | 'both' | 'class_section',
        selectedGroups: [] as string[],
        description: '',
        pinned: false,
    });
    const [noticeClass, setNoticeClass] = useState('');
    const [noticeSection, setNoticeSection] = useState('');

    const filteredSectionOptions = useMemo(
        () =>
            Array.from(
                new Set(
                    classSectionOptions
                        .filter((opt) => !noticeClass || opt.value.startsWith(noticeClass + '-'))
                        .map((opt) => {
                            const parts = opt.value.split('-');
                            return parts.slice(1).join('-');
                        }),
                ),
            ).sort((a, b) => a.localeCompare(b, undefined, { numeric: true })),
        [classSectionOptions, noticeClass],
    );

    const addNoticeGroup = () => {
        if (!noticeClass || !noticeSection) {
            toast.error('Select class and section first');
            return;
        }
        const value = `${noticeClass}-${noticeSection}`;
        setNoticeForm((current) => ({
            ...current,
            selectedGroups: current.selectedGroups.includes(value)
                ? current.selectedGroups
                : [...current.selectedGroups, value],
        }));
        setNoticeClass('');
        setNoticeSection('');
    };

    useEffect(() => {
        if (flash?.success) {
            toast.success(flash.success);
        }
        if (flash?.error) {
            toast.error(flash.error);
        }
    }, [flash]);

    const todayCount = useMemo(() => {
        const today = formatDate(new Date(), '');
        return notices.filter((notice) => formatDate(notice.publishedOn, '') === today).length;
    }, [notices]);

    const resetNoticeForm = () => {
        setNoticeForm({
            title: '',
            audienceType: 'both',
            selectedGroups: [],
            description: '',
            pinned: false,
        });
        setEditingNoticeId(null);
    };

    const handleNoticeSubmit = (event: React.FormEvent<HTMLFormElement>) => {
        event.preventDefault();

        const payload = {
            title: noticeForm.title,
            audienceType: noticeForm.audienceType,
            selectedGroups: noticeForm.audienceType === 'class_section' ? noticeForm.selectedGroups : [],
            description: noticeForm.description,
            pinned: noticeForm.pinned,
        };

        const requestOptions = {
            preserveScroll: true,
            onSuccess: () => {
                resetNoticeForm();
                setShowNoticeDialog(false);
            },
        };

        if (editingNoticeId) {
            router.patch(`/communication/notice-board/${editingNoticeId}`, payload, requestOptions);
            return;
        }

        router.post('/communication/notice-board', payload, requestOptions);
    };

    const handleEditNotice = (notice: NoticeRecord) => {
        setEditingNoticeId(notice.id);
        setNoticeForm({
            title: notice.title,
            audienceType: notice.audienceType || 'both',
            selectedGroups: notice.selectedGroups || [],
            description: notice.description,
            pinned: notice.pinned,
        });
        setShowNoticeDialog(true);
    };

    const handleDeleteNotice = (noticeId: string) => {
        router.delete(`/communication/notice-board/${noticeId}`, {
            preserveScroll: true,
        });
    };

    const handleDialogChange = (open: boolean) => {
        setShowNoticeDialog(open);
        if (!open) {
            resetNoticeForm();
        }
    };

    return (
        <DashboardLayout user={user} activeTab="notice-board">
            <div className="space-y-6 p-8">
                <div className="flex flex-col gap-4 xl:flex-row xl:items-start xl:justify-between">
                    <div className="min-w-0 xl:max-w-sm">
                        <h1 className="text-3xl font-bold text-slate-900">{t('Notice Board')}</h1>
                        <p className="mt-1 text-sm leading-6 text-slate-600">
                            {t('Publish campus-wide alerts, announcements, and pinned updates.')}
                        </p>
                    </div>
                    {canManageNotices ? (
                        <Dialog open={showNoticeDialog} onOpenChange={handleDialogChange}>
                            <DialogTrigger asChild>
                                <Button className="gap-2 self-start md:shrink-0">
                                    <Plus className="h-4 w-4" />
                                    {t('Publish Notice')}
                                </Button>
                            </DialogTrigger>
                            <DialogContent className="sm:max-w-lg">
                                <DialogHeader>
                                    <DialogTitle>{editingNoticeId ? t('Edit notice') : t('Create notice')}</DialogTitle>
                                    <DialogDescription>
                                        {editingNoticeId
                                            ? t('Update this published notice on the communication board.')
                                            : t('Add a public notice for the communication board.')}
                                    </DialogDescription>
                                </DialogHeader>
                                <form onSubmit={handleNoticeSubmit} className="space-y-4">
                                    <div className="space-y-2">
                                        <Label htmlFor="notice-title">{t('Title')}</Label>
                                        <Input
                                            id="notice-title"
                                            value={noticeForm.title}
                                            onChange={(event) =>
                                                setNoticeForm((current) => ({
                                                    ...current,
                                                    title: event.target.value,
                                                }))
                                            }
                                            required
                                        />

                                        {errors?.title ? (
                                            <p className="text-sm text-red-600">{t(errors.title)}</p>
                                        ) : null}
                                    </div>
                                    <div className="space-y-2">
                                        <Label>{t('Audience')}</Label>
                                        <Select
                                            value={noticeForm.audienceType}
                                            onValueChange={(value) =>
                                                setNoticeForm((current) => ({
                                                    ...current,
                                                    audienceType: value as typeof current.audienceType,
                                                    selectedGroups:
                                                        value === 'class_section' ? current.selectedGroups : [],
                                                }))
                                            }
                                        >
                                            <SelectTrigger>
                                                <SelectValue placeholder={t('Select audience')} />
                                            </SelectTrigger>
                                            <SelectContent>
                                                <SelectItem value="both">{t('School Community')}</SelectItem>
                                                <SelectItem value="students">{t('All Students')}</SelectItem>
                                                <SelectItem value="staff">{t('All Staff')}</SelectItem>
                                                <SelectItem value="class_section">{t('Class / Section')}</SelectItem>
                                            </SelectContent>
                                        </Select>
                                        {errors?.audienceType ? (
                                            <p className="text-sm text-red-600">{errors.audienceType}</p>
                                        ) : null}
                                    </div>
                                    {noticeForm.audienceType === 'class_section' ? (
                                        <>
                                            <div className="space-y-2">
                                                <Label>{t('Class')}</Label>
                                                <Select
                                                    value={noticeClass}
                                                    onValueChange={(value) => {
                                                        setNoticeClass(value);
                                                        setNoticeSection('');
                                                    }}
                                                >
                                                    <SelectTrigger>
                                                        <SelectValue placeholder={t('Select class')} />
                                                    </SelectTrigger>
                                                    <SelectContent>
                                                        {classOptions.map((cls) => (
                                                            <SelectItem key={cls} value={cls}>
                                                                {cls}
                                                            </SelectItem>
                                                        ))}
                                                    </SelectContent>
                                                </Select>
                                            </div>
                                            <div className="space-y-2">
                                                <Label>{t('Section')}</Label>
                                                <div className="flex gap-2">
                                                    <Select
                                                        value={noticeSection}
                                                        onValueChange={setNoticeSection}
                                                        disabled={!noticeClass}
                                                    >
                                                        <SelectTrigger>
                                                            <SelectValue placeholder={t('Select section')} />
                                                        </SelectTrigger>
                                                        <SelectContent>
                                                            {filteredSectionOptions.map((section) => (
                                                                <SelectItem key={section} value={section}>
                                                                    {section}
                                                                </SelectItem>
                                                            ))}
                                                        </SelectContent>
                                                    </Select>
                                                    <Button type="button" variant="outline" onClick={addNoticeGroup}>
                                                        {t('Add')}
                                                    </Button>
                                                </div>
                                            </div>
                                            <div className="space-y-2">
                                                <Label>{t('Selected Groups')}</Label>
                                                <div className="flex flex-wrap gap-2 rounded-lg border border-slate-200 p-3">
                                                    {noticeForm.selectedGroups.length > 0 ? (
                                                        noticeForm.selectedGroups.map((group) => (
                                                            <Badge
                                                                key={group}
                                                                variant="secondary"
                                                                className="cursor-pointer"
                                                                onClick={() =>
                                                                    setNoticeForm((current) => ({
                                                                        ...current,
                                                                        selectedGroups: current.selectedGroups.filter(
                                                                            (g) => g !== group,
                                                                        ),
                                                                    }))
                                                                }
                                                            >
                                                                {group}
                                                            </Badge>
                                                        ))
                                                    ) : (
                                                        <p className="text-sm text-slate-500">
                                                            {t('No class-section groups selected yet.')}
                                                        </p>
                                                    )}
                                                </div>
                                                {errors?.selectedGroups ? (
                                                    <p className="text-sm text-red-600">{errors.selectedGroups}</p>
                                                ) : null}
                                                {errors?.notice_recipients ? (
                                                    <p className="text-sm text-red-600">{errors.notice_recipients}</p>
                                                ) : null}
                                            </div>
                                        </>
                                    ) : null}
                                    <div className="space-y-2">
                                        <Label htmlFor="notice-description">{t('Description')}</Label>
                                        <Textarea
                                            id="notice-description"
                                            rows={5}
                                            value={noticeForm.description}
                                            onChange={(event) =>
                                                setNoticeForm((current) => ({
                                                    ...current,
                                                    description: event.target.value,
                                                }))
                                            }
                                            required
                                        />

                                        {errors?.description ? (
                                            <p className="text-sm text-red-600">{t(errors.description)}</p>
                                        ) : null}
                                    </div>
                                    <label className="flex items-center gap-3 rounded-lg border border-slate-200 px-3 py-2">
                                        <Checkbox
                                            checked={noticeForm.pinned}
                                            onCheckedChange={(checked) =>
                                                setNoticeForm((current) => ({
                                                    ...current,
                                                    pinned: Boolean(checked),
                                                }))
                                            }
                                        />

                                        <span className="text-sm text-slate-700">{t('Pin this notice on top')}</span>
                                    </label>
                                    <DialogFooter>
                                        <Button
                                            type="button"
                                            variant="outline"
                                            onClick={() => handleDialogChange(false)}
                                        >
                                            {t('Cancel')}
                                        </Button>
                                        <Button type="submit">
                                            {editingNoticeId ? t('Save Changes') : t('Publish')}
                                        </Button>
                                    </DialogFooter>
                                </form>
                            </DialogContent>
                        </Dialog>
                    ) : null}
                </div>

                <div className="grid gap-4 md:grid-cols-3">
                    <Card>
                        <CardContent className="pt-6">
                            <p className="text-sm text-slate-500">{t('Total notices')}</p>
                            <p className="mt-2 text-3xl font-semibold text-slate-900">{notices.length}</p>
                        </CardContent>
                    </Card>
                    <Card>
                        <CardContent className="pt-6">
                            <p className="text-sm text-slate-500">{t('Pinned')}</p>
                            <p className="mt-2 text-3xl font-semibold text-slate-900">
                                {notices.filter((notice) => notice.pinned).length}
                            </p>
                        </CardContent>
                    </Card>
                    <Card>
                        <CardContent className="pt-6">
                            <p className="text-sm text-slate-500">{t('Published today')}</p>
                            <p className="mt-2 text-3xl font-semibold text-slate-900">{todayCount}</p>
                        </CardContent>
                    </Card>
                </div>

                <Card>
                    <CardHeader>
                        <CardTitle className="flex items-center gap-2">
                            <Megaphone className="h-5 w-5 text-blue-600" />
                            {t('Active notices')}
                        </CardTitle>
                        <CardDescription>{t('Recent announcements visible to the school community.')}</CardDescription>
                    </CardHeader>
                    <CardContent>
                        <NoticeBoardPanel
                            notices={notices}
                            actions={
                                canManageNotices
                                    ? (notice) => (
                                          <>
                                              <Button
                                                  type="button"
                                                  variant="outline"
                                                  size="icon"
                                                  className="border-emerald-100/20 bg-emerald-950/10 text-emerald-50 hover:bg-emerald-900/40"
                                                  onClick={() => handleEditNotice(notice as NoticeRecord)}
                                              >
                                                  <Pencil className="h-4 w-4" />
                                              </Button>
                                              <Button
                                                  type="button"
                                                  variant="outline"
                                                  size="icon"
                                                  className="border-rose-200/20 bg-rose-950/10 text-rose-100 hover:bg-rose-900/40"
                                                  onClick={() => handleDeleteNotice(notice.id)}
                                              >
                                                  <Trash2 className="h-4 w-4" />
                                              </Button>
                                          </>
                                      )
                                    : undefined
                            }
                        />
                    </CardContent>
                </Card>
            </div>
        </DashboardLayout>
    );
}
