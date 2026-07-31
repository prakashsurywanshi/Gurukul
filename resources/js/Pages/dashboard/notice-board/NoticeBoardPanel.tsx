import type { ReactNode } from 'react';
import { Bell, Pin } from 'lucide-react';
import { Badge } from '../../ui/badge';
import { Button } from '../../ui/button';
import { formatDate } from '../../ui/utils';

export type Notice = {
  id: string;
  title: string;
  audience: string;
  publishedOn: string;
  pinned: boolean;
  description: string;
};

export const initialNotices: Notice[] = [
  { id: 'NB-101', title: 'Examination Hall Seating', audience: 'All Students', publishedOn: '2026-03-30', pinned: true, description: 'Final seating plans are available on the exam portal and notice board.' },
  { id: 'NB-102', title: 'Fee Counter Timings', audience: 'Parents', publishedOn: '2026-03-29', pinned: false, description: 'The fee counter will remain open until 4:30 PM for the quarterly payment cycle.' },
  { id: 'NB-103', title: 'Library Inventory Week', audience: 'Teachers & Students', publishedOn: '2026-03-28', pinned: false, description: 'Book issue and return windows will follow a shortened timetable this week.' },
];

interface NoticeBoardPanelProps {
  notices: Notice[];
  actions?: (notice: Notice) => ReactNode;
  singleColumn?: boolean;
}

export function NoticeBoardPanel({ notices, actions, singleColumn = false }: NoticeBoardPanelProps) {
  const sortedNotices = [...notices].sort((left, right) => Number(right.pinned) - Number(left.pinned));

  return (
    <div>
      <div className="mb-5 flex flex-wrap items-center justify-between gap-3">
        <div>
          <p className="text-xs uppercase tracking-[0.28em] text-slate-500">School Notice Board</p>
          <h2 className="mt-2 font-serif text-2xl text-slate-900">Greenboard Announcements</h2>
        </div>
        <div className="rounded-full border border-slate-200 bg-slate-50 px-4 py-2 text-sm text-slate-700">
          {notices.length} active notices
        </div>
      </div>

      {sortedNotices.length === 0 ? (
        <div className="rounded-3xl border border-dashed border-slate-300 bg-slate-50 p-8 text-center">
          <p className="text-base font-medium text-slate-700">No notices available yet.</p>
          <p className="mt-2 text-sm text-slate-500">New announcements will show here as soon as they are published.</p>
        </div>
      ) : (
        <div className={`grid gap-5 ${singleColumn ? 'grid-cols-1' : 'lg:grid-cols-2'}`}>
          {sortedNotices.map((notice) => (
            <div
              key={notice.id}
              className="rounded-[1.9rem] border-[8px] border-[#6f4523] bg-[linear-gradient(135deg,_#8f5a2c_0%,_#6d431f_18%,_#a56a36_34%,_#70431d_52%,_#8b5728_70%,_#5f3818_100%)] p-[10px] text-emerald-50 shadow-[inset_0_1px_0_rgba(255,244,220,0.3),inset_0_-2px_0_rgba(77,42,18,0.35),0_18px_40px_rgba(63,39,18,0.24)]"
            >
              <div className="rounded-[1.35rem] border border-emerald-950/60 bg-[radial-gradient(circle_at_top,_rgba(255,255,255,0.08),_transparent_26%),linear-gradient(160deg,_#1f6f4a_0%,_#0d4f36_45%,_#073223_100%)] p-5 shadow-[inset_0_0_0_1px_rgba(255,255,255,0.06)]">
                <div className="rounded-[1.1rem] border border-dashed border-emerald-200/20 bg-emerald-950/10 p-5">
                  <div className="flex flex-wrap items-start justify-between gap-3">
                    <div className="min-w-0 flex-1">
                      <div className="flex flex-wrap items-center gap-3">
                        <h3 className="text-lg font-semibold tracking-wide text-emerald-50">{notice.title}</h3>
                        {notice.pinned ? (
                          <Badge className="border border-blue-200/40 bg-blue-300/15 text-blue-100 hover:bg-blue-300/15">
                            <Pin className="mr-1 h-3.5 w-3.5" />
                            Pinned
                          </Badge>
                        ) : null}
                      </div>
                      <div className="mt-3 flex flex-wrap items-center gap-3 text-sm text-emerald-100/80">
                        <span className="inline-flex items-center gap-2">
                          <Bell className="h-4 w-4" />
                          {notice.audience}
                        </span>
                        <span className="h-1 w-1 rounded-full bg-emerald-100/40" />
                        <span>{formatDate(notice.publishedOn)}</span>
                      </div>
                    </div>
                    {actions ? <div className="flex items-center gap-2">{actions(notice)}</div> : null}
                  </div>
                  <p className="mt-4 whitespace-pre-wrap text-sm leading-7 text-emerald-50/90">
                    {notice.description}
                  </p>
                </div>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}

interface NoticeBoardPreviewActionProps {
  href: string;
}

export function NoticeBoardPreviewAction({ href }: NoticeBoardPreviewActionProps) {
  return (
    <Button asChild variant="outline" className="border-emerald-200 bg-emerald-50 text-emerald-900 hover:bg-emerald-100">
      <a href={href}>Open Notice Board</a>
    </Button>
  );
}
