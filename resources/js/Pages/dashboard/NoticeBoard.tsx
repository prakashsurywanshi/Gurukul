import { useEffect, useMemo, useState } from 'react';
import { router, usePage } from '@inertiajs/react';
import { Megaphone, Pencil, Plus, Trash2 } from 'lucide-react';
import DashboardLayout from '../DashboardLayout';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '../ui/card';
import { Button } from '../ui/button';
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle, DialogTrigger } from '../ui/dialog';
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
  classGroups: { value: string; label: string }[];
  canManageNotices: boolean;
}

export default function NoticeBoard({ user, notices, classGroups, canManageNotices }: NoticeBoardProps) {
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
            <h1 className="text-3xl font-bold text-slate-900">Notice Board</h1>
            <p className="mt-1 text-sm leading-6 text-slate-600">Publish campus-wide alerts, announcements, and pinned updates.</p>
          </div>
          {canManageNotices ? (
            <Dialog open={showNoticeDialog} onOpenChange={handleDialogChange}>
              <DialogTrigger asChild>
                <Button className="gap-2 self-start md:shrink-0">
                  <Plus className="h-4 w-4" />
                  Publish Notice
                </Button>
              </DialogTrigger>
              <DialogContent className="sm:max-w-lg">
                <DialogHeader>
                  <DialogTitle>{editingNoticeId ? 'Edit notice' : 'Create notice'}</DialogTitle>
                  <DialogDescription>
                    {editingNoticeId ? 'Update this published notice on the communication board.' : 'Add a public notice for the communication board.'}
                  </DialogDescription>
                </DialogHeader>
                <form onSubmit={handleNoticeSubmit} className="space-y-4">
                  <div className="space-y-2">
                    <Label htmlFor="notice-title">Title</Label>
                    <Input id="notice-title" value={noticeForm.title} onChange={(event) => setNoticeForm((current) => ({ ...current, title: event.target.value }))} required />
                    {errors?.title ? <p className="text-sm text-red-600">{errors.title}</p> : null}
                  </div>
                  <div className="space-y-2">
                    <Label>Audience</Label>
                    <Select
                      value={noticeForm.audienceType}
                      onValueChange={(value) => setNoticeForm((current) => ({ ...current, audienceType: value as typeof current.audienceType, selectedGroups: value === 'class_section' ? current.selectedGroups : [] }))}
                    >
                      <SelectTrigger>
                        <SelectValue placeholder="Select audience" />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="both">School Community</SelectItem>
                        <SelectItem value="students">All Students</SelectItem>
                        <SelectItem value="staff">All Staff</SelectItem>
                        <SelectItem value="class_section">Class / Section</SelectItem>
                      </SelectContent>
                    </Select>
                    {errors?.audienceType ? <p className="text-sm text-red-600">{errors.audienceType}</p> : null}
                  </div>
                  {noticeForm.audienceType === 'class_section' ? (
                    <div className="space-y-2">
                      <Label>Class / Section Groups</Label>
                      <div className="grid gap-2 rounded-lg border border-slate-200 p-3">
                        {classGroups.map((group) => (
                          <label key={group.value} className="flex items-center gap-3">
                            <Checkbox
                              checked={noticeForm.selectedGroups.includes(group.value)}
                              onCheckedChange={(checked) =>
                                setNoticeForm((current) => ({
                                  ...current,
                                  selectedGroups: checked
                                    ? [...current.selectedGroups, group.value]
                                    : current.selectedGroups.filter((value) => value !== group.value),
                                }))
                              }
                            />
                            <span className="text-sm text-slate-700">{group.label}</span>
                          </label>
                        ))}
                      </div>
                      {errors?.selectedGroups ? <p className="text-sm text-red-600">{errors.selectedGroups}</p> : null}
                      {errors?.notice_recipients ? <p className="text-sm text-red-600">{errors.notice_recipients}</p> : null}
                    </div>
                  ) : null}
                  <div className="space-y-2">
                    <Label htmlFor="notice-description">Description</Label>
                    <Textarea id="notice-description" rows={5} value={noticeForm.description} onChange={(event) => setNoticeForm((current) => ({ ...current, description: event.target.value }))} required />
                    {errors?.description ? <p className="text-sm text-red-600">{errors.description}</p> : null}
                  </div>
                  <label className="flex items-center gap-3 rounded-lg border border-slate-200 px-3 py-2">
                    <Checkbox
                      checked={noticeForm.pinned}
                      onCheckedChange={(checked) => setNoticeForm((current) => ({ ...current, pinned: Boolean(checked) }))}
                    />
                    <span className="text-sm text-slate-700">Pin this notice on top</span>
                  </label>
                  <DialogFooter>
                    <Button type="button" variant="outline" onClick={() => handleDialogChange(false)}>
                      Cancel
                    </Button>
                    <Button type="submit">{editingNoticeId ? 'Save Changes' : 'Publish'}</Button>
                  </DialogFooter>
                </form>
              </DialogContent>
            </Dialog>
          ) : null}
        </div>

        <div className="grid gap-4 md:grid-cols-3">
          <Card><CardContent className="pt-6"><p className="text-sm text-slate-500">Total notices</p><p className="mt-2 text-3xl font-semibold text-slate-900">{notices.length}</p></CardContent></Card>
          <Card><CardContent className="pt-6"><p className="text-sm text-slate-500">Pinned</p><p className="mt-2 text-3xl font-semibold text-slate-900">{notices.filter((notice) => notice.pinned).length}</p></CardContent></Card>
          <Card><CardContent className="pt-6"><p className="text-sm text-slate-500">Published today</p><p className="mt-2 text-3xl font-semibold text-slate-900">{todayCount}</p></CardContent></Card>
        </div>

        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Megaphone className="h-5 w-5 text-blue-600" />
              Active notices
            </CardTitle>
            <CardDescription>Recent announcements visible to the school community.</CardDescription>
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
