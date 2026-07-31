import { useEffect, useState } from 'react';
import { router, usePage } from '@inertiajs/react';
import {
  FileText, ExternalLink, Plus, Pencil, Trash2,
  Eye, EyeOff, Globe, Calendar, ChevronDown, Search, Filter,
} from 'lucide-react';
import { toast } from 'sonner';
import DashboardLayout from '../../DashboardLayout';
import { Button } from '../../ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '../../ui/card';
import { Badge } from '../../ui/badge';
import { Input } from '../../ui/input';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '../../ui/table';
import {
  AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent,
  AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle,
} from '../../ui/alert-dialog';

interface PageData {
  id: number;
  title: string;
  slug: string;
  status: string;
  show_in_menu: boolean;
  menu_order: number;
  created_at: string;
  updated_at: string;
}

interface PagesIndexProps {
  user: any;
  pages: PageData[];
}

export default function PagesIndex({ user, pages }: PagesIndexProps) {
  const { flash } = usePage().props as any;
  const [search, setSearch] = useState('');
  const [statusFilter, setStatusFilter] = useState<string>('all');
  const [deleteId, setDeleteId] = useState<number | null>(null);

  useEffect(() => {
    if (flash?.success) toast.success(flash.success);
    if (flash?.error) toast.error(flash.error);
  }, [flash]);

  const filteredPages = pages.filter((page) => {
    const matchesSearch = page.title.toLowerCase().includes(search.toLowerCase()) ||
      page.slug.toLowerCase().includes(search.toLowerCase());
    const matchesStatus = statusFilter === 'all' || page.status === statusFilter;
    return matchesSearch && matchesStatus;
  });

  const handleDelete = () => {
    if (!deleteId) return;
    router.delete(`/pages-builder/${deleteId}`, {
      preserveScroll: true,
      onSuccess: () => {
        toast.success('Page deleted successfully.');
        setDeleteId(null);
      },
    });
  };

  const publishedCount = pages.filter((p) => p.status === 'published').length;
  const draftCount = pages.filter((p) => p.status === 'draft').length;
  const menuCount = pages.filter((p) => p.show_in_menu).length;

  return (
    <DashboardLayout user={user} activeTab="pages-builder">
      <div className="space-y-6 p-8">
        <div className="flex flex-col gap-4 xl:flex-row xl:items-start xl:justify-between">
          <div className="min-w-0 xl:max-w-sm">
            <h1 className="text-3xl font-bold text-slate-900">Pages</h1>
            <p className="mt-1 text-sm leading-6 text-slate-600">
              Create and manage custom pages for your website. No coding required.
            </p>
          </div>
          <Button className="gap-2 self-start md:shrink-0" onClick={() => router.visit('/pages-builder/create')}>
            <Plus className="h-4 w-4" /> Create New Page
          </Button>
        </div>

        <div className="grid gap-4 md:grid-cols-4">
          <Card>
            <CardContent className="pt-6">
              <p className="text-sm text-slate-500">Total Pages</p>
              <p className="mt-2 text-3xl font-semibold text-slate-900">{pages.length}</p>
            </CardContent>
          </Card>
          <Card>
            <CardContent className="pt-6">
              <p className="text-sm text-slate-500">Published</p>
              <p className="mt-2 text-3xl font-semibold text-emerald-600">{publishedCount}</p>
            </CardContent>
          </Card>
          <Card>
            <CardContent className="pt-6">
              <p className="text-sm text-slate-500">Drafts</p>
              <p className="mt-2 text-3xl font-semibold text-amber-600">{draftCount}</p>
            </CardContent>
          </Card>
          <Card>
            <CardContent className="pt-6">
              <p className="text-sm text-slate-500">In Navigation</p>
              <p className="mt-2 text-3xl font-semibold text-blue-600">{menuCount}</p>
            </CardContent>
          </Card>
        </div>

        <Card>
          <CardHeader>
            <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
              <div>
                <CardTitle className="flex items-center gap-2">
                  <FileText className="h-5 w-5 text-blue-600" /> All Pages
                </CardTitle>
                <CardDescription>Manage your website pages and content.</CardDescription>
              </div>
              <div className="flex items-center gap-2">
                <div className="relative">
                  <Search className="absolute left-2.5 top-2.5 h-4 w-4 text-slate-400" />
                  <Input
                    placeholder="Search pages..."
                    value={search}
                    onChange={(e) => setSearch(e.target.value)}
                    className="pl-9 w-60"
                  />
                </div>
                <select
                  value={statusFilter}
                  onChange={(e) => setStatusFilter(e.target.value)}
                  className="rounded-lg border border-slate-200 bg-white px-3 py-2 text-sm"
                >
                  <option value="all">All Status</option>
                  <option value="published">Published</option>
                  <option value="draft">Draft</option>
                </select>
              </div>
            </div>
          </CardHeader>
          <CardContent>
            {filteredPages.length === 0 ? (
              <div className="rounded-lg border border-dashed border-slate-300 bg-slate-50 px-6 py-12 text-center">
                <FileText className="mx-auto h-10 w-10 text-slate-300" />
                <p className="mt-3 text-sm text-slate-500">
                  {pages.length === 0
                    ? 'No pages created yet. Click "Create New Page" to get started.'
                    : 'No pages match your search.'}
                </p>
              </div>
            ) : (
              <div className="overflow-x-auto">
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>Title</TableHead>
                      <TableHead>Slug</TableHead>
                      <TableHead>Status</TableHead>
                      <TableHead>Menu</TableHead>
                      <TableHead>Order</TableHead>
                      <TableHead>Updated</TableHead>
                      <TableHead className="text-right">Actions</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {filteredPages.map((page) => (
                      <TableRow key={page.id}>
                        <TableCell className="font-medium text-slate-900">{page.title}</TableCell>
                        <TableCell className="font-mono text-xs text-slate-500">/{page.slug}</TableCell>
                        <TableCell>
                          <Badge
                            variant="outline"
                            className={
                              page.status === 'published'
                                ? 'border-emerald-200 bg-emerald-50 text-emerald-700'
                                : 'border-amber-200 bg-amber-50 text-amber-700'
                            }
                          >
                            {page.status === 'published' ? 'Published' : 'Draft'}
                          </Badge>
                        </TableCell>
                        <TableCell>
                          {page.show_in_menu ? (
                            <Badge variant="outline" className="border-blue-200 bg-blue-50 text-blue-700">
                              <Globe className="mr-1 h-3 w-3" /> In Menu
                            </Badge>
                          ) : (
                            <span className="text-xs text-slate-400">Hidden</span>
                          )}
                        </TableCell>
                        <TableCell className="text-slate-600">{page.menu_order}</TableCell>
                        <TableCell className="text-xs text-slate-500">
                          {new Date(page.updated_at).toLocaleDateString()}
                        </TableCell>
                        <TableCell className="text-right">
                          <div className="flex items-center justify-end gap-1">
                            <Button
                              variant="ghost"
                              size="icon"
                              className="h-8 w-8 text-slate-500 hover:text-blue-600"
                              asChild
                            >
                              <a href={`/pages/${page.slug}`} target="_blank" rel="noopener noreferrer">
                                <ExternalLink className="h-4 w-4" />
                              </a>
                            </Button>
                            <Button
                              variant="ghost"
                              size="icon"
                              className="h-8 w-8 text-slate-500 hover:text-emerald-600"
                              onClick={() => router.visit(`/pages-builder/${page.id}/edit`)}
                            >
                              <Pencil className="h-4 w-4" />
                            </Button>
                            <Button
                              variant="ghost"
                              size="icon"
                              className="h-8 w-8 text-slate-500 hover:text-red-600"
                              onClick={() => setDeleteId(page.id)}
                            >
                              <Trash2 className="h-4 w-4" />
                            </Button>
                          </div>
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

      <AlertDialog open={deleteId !== null} onOpenChange={() => setDeleteId(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Delete Page</AlertDialogTitle>
            <AlertDialogDescription>
              Are you sure you want to delete this page? This action cannot be undone.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <AlertDialogAction
              onClick={handleDelete}
              className="bg-red-600 text-white hover:bg-red-700"
            >
              Delete
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </DashboardLayout>
  );
}
