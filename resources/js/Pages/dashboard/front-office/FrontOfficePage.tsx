import { FormEvent, useEffect, useMemo, useState } from 'react';
import { Edit, Eye, Plus, Search, Trash2 } from 'lucide-react';
import { toast } from 'sonner';
import DashboardLayout from '../../DashboardLayout';
import { Button } from '../../ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '../../ui/card';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '../../ui/dialog';
import { Input } from '../../ui/input';
import { Label } from '../../ui/label';
import {
  Pagination,
  PaginationContent,
  PaginationItem,
  PaginationLink,
  PaginationNext,
  PaginationPrevious,
} from '../../ui/pagination';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '../../ui/table';

export interface FrontOfficeField {
  key: string;
  label: string;
  type?: 'text' | 'date' | 'tel';
  placeholder?: string;
}

export interface FrontOfficeRecord {
  id: number;
  [key: string]: string | number;
}

interface FrontOfficePageProps {
  user: any;
  activeTab: string;
  title: string;
  description: string;
  fields: FrontOfficeField[];
  initialRecords: FrontOfficeRecord[];
}

const ITEMS_PER_PAGE = 5;

export default function FrontOfficePage({
  user,
  activeTab,
  title,
  description,
  fields,
  initialRecords,
}: FrontOfficePageProps) {
  const [records, setRecords] = useState<FrontOfficeRecord[]>(initialRecords);
  const [currentPage, setCurrentPage] = useState(1);
  const [dialogOpen, setDialogOpen] = useState(false);
  const [editingRecord, setEditingRecord] = useState<FrontOfficeRecord | null>(null);
  const [viewingRecord, setViewingRecord] = useState<FrontOfficeRecord | null>(null);
  const [searchQuery, setSearchQuery] = useState('');
  const emptyFormData = useMemo(
    () =>
      fields.reduce<Record<string, string>>((accumulator, field) => {
        accumulator[field.key] = '';
        return accumulator;
      }, {}),
    [fields]
  );
  const [formData, setFormData] = useState<Record<string, string>>(emptyFormData);

  const filteredRecords = useMemo(() => {
    const normalizedQuery = searchQuery.trim().toLowerCase();

    if (!normalizedQuery) {
      return records;
    }

    return records.filter((record) =>
      fields.some((field) => String(record[field.key] ?? '').toLowerCase().includes(normalizedQuery))
    );
  }, [fields, records, searchQuery]);

  useEffect(() => {
    const totalPages = Math.max(1, Math.ceil(filteredRecords.length / ITEMS_PER_PAGE));
    if (currentPage > totalPages) {
      setCurrentPage(totalPages);
    }
  }, [currentPage, filteredRecords.length]);

  const totalPages = Math.max(1, Math.ceil(filteredRecords.length / ITEMS_PER_PAGE));
  const paginatedRecords = filteredRecords.slice((currentPage - 1) * ITEMS_PER_PAGE, currentPage * ITEMS_PER_PAGE);

  const openCreateDialog = () => {
    setEditingRecord(null);
    setFormData(emptyFormData);
    setDialogOpen(true);
  };

  const openEditDialog = (record: FrontOfficeRecord) => {
    setEditingRecord(record);
    setFormData(
      fields.reduce<Record<string, string>>((accumulator, field) => {
        accumulator[field.key] = String(record[field.key] ?? '');
        return accumulator;
      }, {})
    );
    setDialogOpen(true);
  };

  const handleSubmit = (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();

    if (editingRecord) {
      setRecords((current) =>
        current.map((record) =>
          record.id === editingRecord.id
            ? {
                ...record,
                ...formData,
              }
            : record
        )
      );
    } else {
      setRecords((current) => [
        {
          id: Date.now(),
          ...formData,
        },
        ...current,
      ]);
      setCurrentPage(1);
    }

    setDialogOpen(false);
    setEditingRecord(null);
    setFormData(emptyFormData);
  };

  const handleDelete = (recordId: number) => {
    if (!window.confirm(`Delete this ${title.toLowerCase()} record?`)) {
      return;
    }

    setRecords((current) => current.filter((record) => record.id !== recordId));
  };

  const exportRows = filteredRecords.map((record) =>
    fields.map((field) => String(record[field.key] ?? ''))
  );

  const handleCopy = async () => {
    const textContent = [fields.map((field) => field.label).join('\t'), ...exportRows.map((row) => row.join('\t'))].join('\n');

    try {
      await navigator.clipboard.writeText(textContent);
      toast.success(`${title} copied successfully`);
    } catch (error) {
      toast.error('Failed to copy records');
    }
  };

  const handleCsvExport = () => {
    const csvContent = [fields.map((field) => field.label).join(','), ...exportRows.map((row) => row.join(','))].join('\n');
    const blob = new Blob([csvContent], { type: 'text/csv' });
    const url = window.URL.createObjectURL(blob);
    const anchor = document.createElement('a');
    anchor.href = url;
    anchor.download = `${activeTab}_${new Date().toISOString().split('T')[0]}.csv`;
    anchor.click();
    window.URL.revokeObjectURL(url);
    toast.success(`${title} CSV exported successfully`);
  };

  const handlePdfExport = () => {
    const printWindow = window.open('', '_blank', 'width=1000,height=700');
    if (!printWindow) {
      toast.error('Unable to open print window');
      return;
    }

    const tableHeaders = fields.map((field) => `<th>${field.label}</th>`).join('');
    const tableRows = exportRows
      .map((row) => `<tr>${row.map((cell) => `<td>${cell}</td>`).join('')}</tr>`)
      .join('');

    printWindow.document.write(`
      <html>
        <head>
          <title>${title} Export</title>
          <style>
            body { font-family: Arial, sans-serif; padding: 24px; }
            h1 { margin-bottom: 16px; }
            table { width: 100%; border-collapse: collapse; }
            th, td { border: 1px solid #d1d5db; padding: 10px; text-align: left; font-size: 12px; }
            th { background: #f8fafc; }
          </style>
        </head>
        <body>
          <h1>${title}</h1>
          <table>
            <thead><tr>${tableHeaders}</tr></thead>
            <tbody>${tableRows}</tbody>
          </table>
        </body>
      </html>
    `);
    printWindow.document.close();
    printWindow.focus();
    printWindow.print();
    toast.success(`${title} PDF export opened`);
  };

  return (
    <DashboardLayout user={user} activeTab={activeTab}>
      <div className="min-h-full bg-slate-50 p-8">
        <div className="mx-auto max-w-6xl space-y-6">
          <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
            <div>
              <h1 className="text-3xl font-bold text-slate-900">{title}</h1>
              <p className="mt-1 text-sm text-slate-600">{description}</p>
            </div>
            <Button type="button" className="bg-blue-600 text-white hover:bg-blue-700" onClick={openCreateDialog}>
              <Plus className="h-4 w-4" />
              Create
            </Button>
          </div>

          <Card className="border-slate-200 shadow-sm">
            <CardHeader>
              <CardTitle>{title} Records</CardTitle>
              <CardDescription>Manage records with create, edit, delete, and paginated listing.</CardDescription>
            </CardHeader>
            <CardContent className="space-y-6">
              <div className="flex flex-wrap items-center gap-3">
                <div className="relative min-w-[280px] flex-1">
                  <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-400" />
                  <Input
                    value={searchQuery}
                    onChange={(event) => {
                      setSearchQuery(event.target.value);
                      setCurrentPage(1);
                    }}
                    placeholder={`Search ${title.toLowerCase()}...`}
                    className="pl-10"
                  />
                </div>

                <div className="flex items-center gap-2 whitespace-nowrap">
                  <Button type="button" variant="outline" size="sm" onClick={handleCopy}>
                    Copy
                  </Button>
                  <Button type="button" variant="outline" size="sm" onClick={handleCsvExport}>
                    CSV
                  </Button>
                  <Button type="button" variant="outline" size="sm" onClick={handlePdfExport}>
                    PDF
                  </Button>
                </div>
              </div>

              <Table>
                <TableHeader>
                  <TableRow>
                    {fields.map((field) => (
                      <TableHead key={field.key}>{field.label}</TableHead>
                    ))}
                    <TableHead className="text-right">Actions</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {paginatedRecords.length > 0 ? (
                    paginatedRecords.map((record) => (
                      <TableRow key={record.id}>
                        {fields.map((field) => (
                          <TableCell key={`${record.id}-${field.key}`}>{String(record[field.key] ?? '')}</TableCell>
                        ))}
                        <TableCell className="text-right">
                          <div className="flex justify-end gap-2">
                            <Button type="button" variant="outline" size="icon" onClick={() => setViewingRecord(record)}>
                              <Eye className="h-4 w-4" />
                            </Button>
                            <Button type="button" variant="outline" size="icon" onClick={() => openEditDialog(record)}>
                              <Edit className="h-4 w-4" />
                            </Button>
                            <Button
                              type="button"
                              variant="destructive"
                              size="icon"
                              onClick={() => handleDelete(record.id)}
                            >
                              <Trash2 className="h-4 w-4" />
                            </Button>
                          </div>
                        </TableCell>
                      </TableRow>
                    ))
                  ) : (
                    <TableRow>
                      <TableCell colSpan={fields.length + 1} className="py-8 text-center text-sm text-slate-500">
                        No records found.
                      </TableCell>
                    </TableRow>
                  )}
                </TableBody>
              </Table>

              <div className="flex flex-col gap-3 border-t border-slate-100 pt-4 sm:flex-row sm:items-center sm:justify-between">
                <p className="text-sm text-slate-600">
                  Showing {(currentPage - 1) * ITEMS_PER_PAGE + (paginatedRecords.length > 0 ? 1 : 0)} to{' '}
                  {(currentPage - 1) * ITEMS_PER_PAGE + paginatedRecords.length} of {filteredRecords.length} records
                </p>

                <Pagination className="mx-0 w-auto justify-end">
                  <PaginationContent>
                    <PaginationItem>
                      <PaginationPrevious
                        href="#"
                        onClick={(event) => {
                          event.preventDefault();
                          if (currentPage > 1) {
                            setCurrentPage((page) => page - 1);
                          }
                        }}
                      />
                    </PaginationItem>

                    {Array.from({ length: totalPages }, (_, index) => index + 1).map((page) => (
                      <PaginationItem key={page}>
                        <PaginationLink
                          href="#"
                          isActive={page === currentPage}
                          onClick={(event) => {
                            event.preventDefault();
                            setCurrentPage(page);
                          }}
                        >
                          {page}
                        </PaginationLink>
                      </PaginationItem>
                    ))}

                    <PaginationItem>
                      <PaginationNext
                        href="#"
                        onClick={(event) => {
                          event.preventDefault();
                          if (currentPage < totalPages) {
                            setCurrentPage((page) => page + 1);
                          }
                        }}
                      />
                    </PaginationItem>
                  </PaginationContent>
                </Pagination>
              </div>
            </CardContent>
          </Card>
        </div>
      </div>

      <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>{editingRecord ? `Edit ${title}` : `Create ${title}`}</DialogTitle>
            <DialogDescription>
              {editingRecord ? 'Update the selected record details.' : 'Add a new front office record.'}
            </DialogDescription>
          </DialogHeader>

          <form onSubmit={handleSubmit} className="space-y-4">
            {fields.map((field) => (
              <div key={field.key} className="space-y-2">
                <Label htmlFor={`${activeTab}-${field.key}`}>{field.label}</Label>
                <Input
                  id={`${activeTab}-${field.key}`}
                  type={field.type || 'text'}
                  value={formData[field.key] || ''}
                  placeholder={field.placeholder}
                  onChange={(event) => setFormData({ ...formData, [field.key]: event.target.value })}
                />
              </div>
            ))}

            <DialogFooter>
              <Button type="button" variant="outline" onClick={() => setDialogOpen(false)}>
                Cancel
              </Button>
              <Button type="submit" className="bg-blue-600 text-white hover:bg-blue-700">
                {editingRecord ? 'Update' : 'Create'}
              </Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>

      <Dialog open={Boolean(viewingRecord)} onOpenChange={(open) => !open && setViewingRecord(null)}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>View {title}</DialogTitle>
            <DialogDescription>Review the selected record details.</DialogDescription>
          </DialogHeader>

          <div className="space-y-4">
            {viewingRecord &&
              fields.map((field) => (
                <div key={field.key} className="space-y-1">
                  <Label>{field.label}</Label>
                  <div className="rounded-md border border-slate-200 bg-slate-50 px-3 py-2 text-sm text-slate-700">
                    {String(viewingRecord[field.key] ?? '')}
                  </div>
                </div>
              ))}
          </div>

          <DialogFooter>
            <Button type="button" variant="outline" onClick={() => setViewingRecord(null)}>
              Close
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </DashboardLayout>
  );
}
