import React, { useEffect, useMemo, useState } from 'react';
import { Link, router, usePage } from '@inertiajs/react';
import { CheckCircle2, FileSearch, GraduationCap, Mail, Pencil, Phone, Search, School, Trash2, UserPlus } from 'lucide-react';
import DashboardLayout from '../../DashboardLayout';
import { Card, CardContent, CardHeader, CardTitle } from '../../ui/card';
import { Input } from '../../ui/input';
import { Badge } from '../../ui/badge';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '../../ui/table';
import { Button } from '../../ui/button';
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from '../../ui/dialog';
import { Label } from '../../ui/label';
import { Textarea } from '../../ui/textarea';

interface InquiryRecord {
  id: number;
  full_name: string;
  email: string;
  phone: string;
  program_interest: string;
  previous_institution?: string | null;
  message?: string | null;
  status?: string | null;
  enrolled_student_id?: number | null;
  enrolled_at?: string | null;
  created_at?: string | null;
}

interface ClassRecord {
  id: number;
  name: string;
  section: string;
}

interface OnlineAdmissionProps {
  user: any;
  tableReady: boolean;
  classRecords: ClassRecord[];
  inquiries: InquiryRecord[];
}

const initialEnrollmentForm = {
  selectedClassName: '',
  selectedSection: '',
  class_id: '',
  date_of_birth: '',
  gender: '',
  admission_date: '',
  roll_number: '',
};

const initialEditForm = {
  full_name: '',
  email: '',
  phone: '',
  program_interest: '',
  previous_institution: '',
  message: '',
};

export default function OnlineAdmission({ user, inquiries, tableReady, classRecords }: OnlineAdmissionProps) {
  const page = usePage<{ flash?: { success?: string; error?: string }; errors?: Record<string, string> }>();
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedInquiryId, setSelectedInquiryId] = useState<number | null>(null);
  const [editingInquiryId, setEditingInquiryId] = useState<number | null>(null);
  const [enrollmentForm, setEnrollmentForm] = useState(initialEnrollmentForm);
  const [editForm, setEditForm] = useState(initialEditForm);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [isSavingEdit, setIsSavingEdit] = useState(false);
  const [isDeleting, setIsDeleting] = useState<number | null>(null);

  const enrollmentClassNameOptions = useMemo(
    () => Array.from(new Set(classRecords.map((record) => record.name))).sort((a, b) => a.localeCompare(b, undefined, { numeric: true })),
    [classRecords]
  );

  const enrollmentSectionOptions = useMemo(
    () => Array.from(new Set(classRecords.filter((record) => enrollmentForm.selectedClassName && record.name === enrollmentForm.selectedClassName).map((record) => record.section))).sort((a, b) => a.localeCompare(b, undefined, { numeric: true })),
    [classRecords, enrollmentForm.selectedClassName]
  );

  const filteredInquiries = useMemo(() => {
    const normalizedQuery = searchQuery.trim().toLowerCase();

    if (!normalizedQuery) {
      return inquiries;
    }

    return inquiries.filter((inquiry) =>
      [
        inquiry.full_name,
        inquiry.email,
        inquiry.phone,
        inquiry.program_interest,
        inquiry.previous_institution || '',
        inquiry.message || '',
        inquiry.status || '',
      ].some((value) => value.toLowerCase().includes(normalizedQuery))
    );
  }, [inquiries, searchQuery]);

  const pendingCount = inquiries.filter((inquiry) => (inquiry.status || 'pending') !== 'enrolled').length;
  const enrolledCount = inquiries.filter((inquiry) => inquiry.status === 'enrolled').length;
  const selectedInquiry = inquiries.find((inquiry) => inquiry.id === selectedInquiryId) || null;
  const editingInquiry = inquiries.find((inquiry) => inquiry.id === editingInquiryId) || null;

  useEffect(() => {
    if (!selectedInquiry) {
      return;
    }

    const suggestedClass = classRecords.find((record) => {
      const classLabel = `${record.name}`.trim().toLowerCase();
      const inquiryClass = selectedInquiry.program_interest.trim().toLowerCase();

      return classLabel === inquiryClass || `class ${classLabel}` === inquiryClass;
    });

    setEnrollmentForm({
      class_id: suggestedClass ? String(suggestedClass.id) : '',
      date_of_birth: '',
      gender: '',
      admission_date: new Date().toISOString().slice(0, 10),
      roll_number: '',
    });
  }, [selectedInquiry, classRecords]);

  useEffect(() => {
    if (!editingInquiry) {
      setEditForm(initialEditForm);
      return;
    }

    setEditForm({
      full_name: editingInquiry.full_name,
      email: editingInquiry.email,
      phone: editingInquiry.phone,
      program_interest: editingInquiry.program_interest,
      previous_institution: editingInquiry.previous_institution || '',
      message: editingInquiry.message || '',
    });
  }, [editingInquiry]);

  const handleEnroll = () => {
    if (!selectedInquiry) {
      return;
    }

    setIsSubmitting(true);

    router.post(
      `/online-admission/${selectedInquiry.id}/enroll`,
      enrollmentForm,
      {
        preserveScroll: true,
        onFinish: () => setIsSubmitting(false),
      }
    );
  };

  const handleSaveEdit = () => {
    if (!editingInquiry) {
      return;
    }

    setIsSavingEdit(true);

    router.patch(`/online-admission/${editingInquiry.id}`, editForm, {
      preserveScroll: true,
      onSuccess: () => {
        setEditingInquiryId(null);
      },
      onFinish: () => setIsSavingEdit(false),
    });
  };

  const handleDelete = (inquiry: InquiryRecord) => {
    if (!window.confirm(`Delete the online admission entry for ${inquiry.full_name}?`)) {
      return;
    }

    setIsDeleting(inquiry.id);

    router.delete(`/online-admission/${inquiry.id}`, {
      preserveScroll: true,
      onSuccess: () => {
        if (selectedInquiryId === inquiry.id) {
          setSelectedInquiryId(null);
        }
        if (editingInquiryId === inquiry.id) {
          setEditingInquiryId(null);
        }
      },
      onFinish: () => setIsDeleting(null),
    });
  };

  return (
    <DashboardLayout user={user} activeTab="online-admission">
      <Dialog open={editingInquiry !== null} onOpenChange={(open) => !open && setEditingInquiryId(null)}>
        <DialogContent className="max-w-2xl">
          <DialogHeader>
            <DialogTitle>Edit Admission Request</DialogTitle>
            <DialogDescription>
              Update the online admission entry details before enrolling the student.
            </DialogDescription>
          </DialogHeader>

          <div className="grid gap-4 md:grid-cols-2">
            <div className="space-y-2">
              <Label htmlFor="edit_full_name">Full Name</Label>
              <Input id="edit_full_name" value={editForm.full_name} onChange={(event) => setEditForm((current) => ({ ...current, full_name: event.target.value }))} />
            </div>
            <div className="space-y-2">
              <Label htmlFor="edit_email">Email</Label>
              <Input id="edit_email" type="email" value={editForm.email} onChange={(event) => setEditForm((current) => ({ ...current, email: event.target.value }))} />
            </div>
            <div className="space-y-2">
              <Label htmlFor="edit_phone">Phone</Label>
              <Input id="edit_phone" value={editForm.phone} onChange={(event) => setEditForm((current) => ({ ...current, phone: event.target.value }))} />
            </div>
            <div className="space-y-2">
              <Label htmlFor="edit_program_interest">Program / Class</Label>
              <Input id="edit_program_interest" value={editForm.program_interest} onChange={(event) => setEditForm((current) => ({ ...current, program_interest: event.target.value }))} />
            </div>
            <div className="space-y-2 md:col-span-2">
              <Label htmlFor="edit_previous_institution">Previous Institution</Label>
              <Input id="edit_previous_institution" value={editForm.previous_institution} onChange={(event) => setEditForm((current) => ({ ...current, previous_institution: event.target.value }))} />
            </div>
            <div className="space-y-2 md:col-span-2">
              <Label htmlFor="edit_message">Message</Label>
              <Textarea id="edit_message" value={editForm.message} onChange={(event) => setEditForm((current) => ({ ...current, message: event.target.value }))} rows={4} />
            </div>
          </div>

          <DialogFooter>
            <Button type="button" variant="outline" onClick={() => setEditingInquiryId(null)}>
              Cancel
            </Button>
            <Button type="button" onClick={handleSaveEdit} disabled={isSavingEdit} className="bg-blue-600 text-white hover:bg-blue-700">
              {isSavingEdit ? 'Saving...' : 'Save Changes'}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      <div className="min-h-full bg-slate-50 p-8">
        <div className="mx-auto max-w-7xl space-y-6">
          <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
            <div>
              <h1 className="text-3xl font-bold text-slate-900">Online Admission</h1>
              <p className="mt-1 text-sm text-slate-600">
                Review public website requests and enroll them directly into student records.
              </p>
            </div>
            <Badge className="bg-blue-600 px-3 py-1 text-white hover:bg-blue-600">
              {filteredInquiries.length} Request{filteredInquiries.length === 1 ? '' : 's'}
            </Badge>
          </div>

          {page.props.flash?.success && (
            <div className="rounded-xl border border-emerald-200 bg-emerald-50 px-4 py-3 text-sm text-emerald-700">
              {page.props.flash.success}
            </div>
          )}

          {page.props.flash?.error && (
            <div className="rounded-xl border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700">
              {page.props.flash.error}
            </div>
          )}

          {Object.keys(page.props.errors || {}).length > 0 && (
            <div className="rounded-xl border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700">
              {Object.values(page.props.errors || {})[0]}
            </div>
          )}

          <div className="grid gap-6 md:grid-cols-4">
            <Card>
              <CardContent className="pt-6">
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-sm text-slate-500">Total Requests</p>
                    <p className="text-3xl font-bold text-slate-900">{inquiries.length}</p>
                  </div>
                  <div className="rounded-full bg-blue-100 p-3">
                    <FileSearch className="h-5 w-5 text-blue-600" />
                  </div>
                </div>
              </CardContent>
            </Card>

            <Card>
              <CardContent className="pt-6">
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-sm text-slate-500">Pending Enrollment</p>
                    <p className="text-3xl font-bold text-slate-900">{pendingCount}</p>
                  </div>
                  <div className="rounded-full bg-blue-100 p-3">
                    <UserPlus className="h-5 w-5 text-blue-600" />
                  </div>
                </div>
              </CardContent>
            </Card>

            <Card>
              <CardContent className="pt-6">
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-sm text-slate-500">Enrolled</p>
                    <p className="text-3xl font-bold text-slate-900">{enrolledCount}</p>
                  </div>
                  <div className="rounded-full bg-emerald-100 p-3">
                    <CheckCircle2 className="h-5 w-5 text-emerald-600" />
                  </div>
                </div>
              </CardContent>
            </Card>

            <Card>
              <CardContent className="pt-6">
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-sm text-slate-500">Classes</p>
                    <p className="text-3xl font-bold text-slate-900">
                      {new Set(inquiries.map((inquiry) => inquiry.program_interest)).size}
                    </p>
                  </div>
                  <div className="rounded-full bg-violet-100 p-3">
                    <School className="h-5 w-5 text-violet-600" />
                  </div>
                </div>
              </CardContent>
            </Card>
          </div>

          {selectedInquiry && (
            <Card>
              <CardHeader>
                <CardTitle>Enroll Student</CardTitle>
              </CardHeader>
              <CardContent className="space-y-5">
                <div className="rounded-xl border border-slate-200 bg-slate-50 p-4">
                  <div className="flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between">
                    <div>
                      <p className="text-lg font-semibold text-slate-900">{selectedInquiry.full_name}</p>
                      <p className="text-sm text-slate-600">
                        Requested class: {selectedInquiry.program_interest}
                      </p>
                    </div>
                    <Badge className={selectedInquiry.status === 'enrolled' ? 'bg-emerald-600 text-white hover:bg-emerald-600' : 'bg-blue-500 text-white hover:bg-blue-500'}>
                      {selectedInquiry.status === 'enrolled' ? 'Enrolled' : 'Pending'}
                    </Badge>
                  </div>
                </div>

                <div className="grid gap-4 md:grid-cols-2">
                  <div className="space-y-2">
                    <Label>Class</Label>
                    <select
                      value={enrollmentForm.selectedClassName}
                      onChange={(event) => {
                        const className = event.target.value;
                        const sections = classRecords.filter((r) => r.name === className).map((r) => r.section).sort((a, b) => a.localeCompare(b, undefined, { numeric: true }));
                        const firstSection = sections[0] || '';
                        const matchedRecord = classRecords.find((r) => r.name === className && r.section === firstSection);
                        setEnrollmentForm((current) => ({ ...current, selectedClassName: className, selectedSection: firstSection, class_id: matchedRecord ? String(matchedRecord.id) : '' }));
                      }}
                      className="flex h-10 w-full rounded-md border border-slate-200 bg-white px-3 py-2 text-sm text-slate-900 outline-none"
                    >
                      <option value="">Select class</option>
                      {enrollmentClassNameOptions.map((name) => (
                        <option key={name} value={name}>
                          {name}
                        </option>
                      ))}
                    </select>
                  </div>

                  <div className="space-y-2">
                    <Label>Section</Label>
                    <select
                      value={enrollmentForm.selectedSection}
                      onChange={(event) => {
                        const section = event.target.value;
                        const matchedRecord = classRecords.find((r) => r.name === enrollmentForm.selectedClassName && r.section === section);
                        setEnrollmentForm((current) => ({ ...current, selectedSection: section, class_id: matchedRecord ? String(matchedRecord.id) : '' }));
                      }}
                      disabled={!enrollmentForm.selectedClassName}
                      className="flex h-10 w-full rounded-md border border-slate-200 bg-white px-3 py-2 text-sm text-slate-900 outline-none disabled:opacity-50"
                    >
                      <option value="">Select section</option>
                      {enrollmentSectionOptions.map((section) => (
                        <option key={section} value={section}>
                          {section}
                        </option>
                      ))}
                    </select>
                  </div>

                  <div className="space-y-2">
                    <Label htmlFor="admission_date">Admission Date</Label>
                    <Input
                      id="admission_date"
                      type="date"
                      value={enrollmentForm.admission_date}
                      onChange={(event) => setEnrollmentForm((current) => ({ ...current, admission_date: event.target.value }))}
                    />
                  </div>

                  <div className="space-y-2">
                    <Label htmlFor="date_of_birth">Date Of Birth</Label>
                    <Input
                      id="date_of_birth"
                      type="date"
                      value={enrollmentForm.date_of_birth}
                      onChange={(event) => setEnrollmentForm((current) => ({ ...current, date_of_birth: event.target.value }))}
                    />
                  </div>

                  <div className="space-y-2">
                    <Label htmlFor="gender">Gender</Label>
                    <select
                      id="gender"
                      value={enrollmentForm.gender}
                      onChange={(event) => setEnrollmentForm((current) => ({ ...current, gender: event.target.value }))}
                      className="flex h-10 w-full rounded-md border border-slate-200 bg-white px-3 py-2 text-sm text-slate-900 outline-none"
                    >
                      <option value="">Select gender</option>
                      <option value="male">Male</option>
                      <option value="female">Female</option>
                      <option value="other">Other</option>
                    </select>
                  </div>

                  <div className="space-y-2">
                    <Label htmlFor="roll_number">Roll Number</Label>
                    <Input
                      id="roll_number"
                      value={enrollmentForm.roll_number}
                      onChange={(event) => setEnrollmentForm((current) => ({ ...current, roll_number: event.target.value }))}
                      placeholder="Optional"
                    />
                  </div>
                </div>

                <div className="flex flex-col gap-3 sm:flex-row">
                  <Button
                    type="button"
                    onClick={handleEnroll}
                    disabled={isSubmitting || selectedInquiry.status === 'enrolled'}
                    className="bg-blue-600 text-white hover:bg-blue-700"
                  >
                    {isSubmitting ? 'Enrolling...' : 'Enroll Student'}
                  </Button>
                  <Button
                    type="button"
                    variant="outline"
                    onClick={() => setSelectedInquiryId(null)}
                  >
                    Cancel
                  </Button>
                  {selectedInquiry.enrolled_student_id && (
                    <Link
                      href={`/students/${selectedInquiry.enrolled_student_id}`}
                      className="inline-flex items-center justify-center rounded-md border border-slate-200 bg-white px-4 py-2 text-sm font-medium text-slate-700 hover:bg-slate-50"
                    >
                      View Student Profile
                    </Link>
                  )}
                </div>
              </CardContent>
            </Card>
          )}

          <Card>
            <CardHeader>
              <CardTitle>Admission Requests</CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              {!tableReady && (
                <div className="rounded-lg border border-blue-200 bg-blue-50 px-4 py-3 text-sm text-blue-800">
                  The `admission_inquiries` table is not available yet. Run `php artisan migrate` to create it and start seeing public website admission requests here.
                </div>
              )}

              <div className="relative max-w-md">
                <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-400" />
                <Input
                  value={searchQuery}
                  onChange={(event) => setSearchQuery(event.target.value)}
                  placeholder="Search requests..."
                  className="pl-10"
                />
              </div>

              {filteredInquiries.length === 0 ? (
                <div className="rounded-lg border border-dashed border-slate-300 bg-white py-12 text-center">
                  <p className="text-sm text-slate-500">No admission requests found.</p>
                </div>
              ) : (
                <div className="overflow-x-auto">
                  <Table>
                    <TableHeader>
                      <TableRow>
                        <TableHead>Name</TableHead>
                        <TableHead>Contact</TableHead>
                        <TableHead>Class</TableHead>
                        <TableHead>Status</TableHead>
                        <TableHead>Submitted On</TableHead>
                        <TableHead className="text-right">Action</TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {filteredInquiries.map((inquiry) => (
                        <TableRow key={inquiry.id}>
                          <TableCell>
                            <div>
                              <p className="font-medium text-slate-900">{inquiry.full_name}</p>
                              <p className="mt-1 max-w-xs whitespace-normal text-sm text-slate-500">{inquiry.message || '-'}</p>
                            </div>
                          </TableCell>
                          <TableCell>
                            <div className="space-y-1">
                              <div className="flex items-center gap-2 text-sm text-slate-700">
                                <Mail className="h-4 w-4 text-slate-400" />
                                <span>{inquiry.email}</span>
                              </div>
                              <div className="flex items-center gap-2 text-sm text-slate-700">
                                <Phone className="h-4 w-4 text-slate-400" />
                                <span>{inquiry.phone}</span>
                              </div>
                            </div>
                          </TableCell>
                          <TableCell>
                            <div className="space-y-1">
                              <p>{inquiry.program_interest}</p>
                              <p className="text-sm text-slate-500">{inquiry.previous_institution || '-'}</p>
                            </div>
                          </TableCell>
                          <TableCell>
                            <Badge className={inquiry.status === 'enrolled' ? 'bg-emerald-600 text-white hover:bg-emerald-600' : 'bg-blue-500 text-white hover:bg-blue-500'}>
                              {inquiry.status === 'enrolled' ? 'Enrolled' : 'Pending'}
                            </Badge>
                          </TableCell>
                          <TableCell>
                            <div className="space-y-1 text-sm text-slate-700">
                              <p>{inquiry.created_at || '-'}</p>
                              {inquiry.enrolled_at && <p className="text-emerald-600">Enrolled: {inquiry.enrolled_at}</p>}
                            </div>
                          </TableCell>
                          <TableCell className="text-right">
                            <div className="flex justify-end gap-2">
                              <Button
                                type="button"
                                variant="outline"
                                onClick={() => setEditingInquiryId(inquiry.id)}
                                size="icon"
                                aria-label={`Edit ${inquiry.full_name}`}
                                title="Edit"
                              >
                                <Pencil className="h-4 w-4" />
                              </Button>
                              <Button
                                type="button"
                                variant="outline"
                                onClick={() => handleDelete(inquiry)}
                                disabled={isDeleting === inquiry.id}
                                size="icon"
                                aria-label={`Delete ${inquiry.full_name}`}
                                title={isDeleting === inquiry.id ? 'Deleting...' : 'Delete'}
                                className="border-red-200 text-red-600 hover:bg-red-50 hover:text-red-700"
                              >
                                <Trash2 className="h-4 w-4" />
                              </Button>
                              {inquiry.enrolled_student_id && (
                                <Link
                                  href={`/students/${inquiry.enrolled_student_id}`}
                                  className="inline-flex h-9 w-9 items-center justify-center rounded-md border border-slate-200 bg-white text-slate-700 hover:bg-slate-50"
                                  aria-label={`View student profile for ${inquiry.full_name}`}
                                  title="View Student"
                                >
                                  <GraduationCap className="h-4 w-4" />
                                </Link>
                              )}
                              <Button
                                type="button"
                                variant={inquiry.status === 'enrolled' ? 'outline' : 'default'}
                                onClick={() => setSelectedInquiryId(inquiry.id)}
                                size="icon"
                                aria-label={inquiry.status === 'enrolled' ? `View enrollment for ${inquiry.full_name}` : `Enroll ${inquiry.full_name}`}
                                title={inquiry.status === 'enrolled' ? 'View Enrollment' : 'Enroll'}
                                className={inquiry.status === 'enrolled' ? '' : 'bg-blue-600 text-white hover:bg-blue-700'}
                              >
                                {inquiry.status === 'enrolled' ? (
                                  <CheckCircle2 className="h-4 w-4" />
                                ) : (
                                  <UserPlus className="h-4 w-4" />
                                )}
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
      </div>
    </DashboardLayout>
  );
}
