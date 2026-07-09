import React, { useState } from 'react';
import { router, usePage } from '@inertiajs/react';
import { Card, CardContent, CardHeader, CardTitle } from '../ui/card';
import { Button } from '../ui/button';
import { Input } from '../ui/input';
import { Label } from '../ui/label';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from '../ui/dialog';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '../ui/table';
import { Badge } from '../ui/badge';
import { Pencil, Plus, School, Trash2 } from 'lucide-react';
import { toast } from 'sonner';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '../ui/select';
import DashboardLayout from '../DashboardLayout';

interface ClassManagementProps {
  user: any;
  classRecords: any[];
  sectionRecords: string[];
  teacherRecords: { id: string; name: string }[];
}

const DEFAULT_CLASS_FORM = {
  name: '',
  section: '',
  teacher_id: '',
  teacher_name: '',
  room_number: '',
};

const DEFAULT_SECTION_FORM = {
  name: '',
};

export default function ClassManagement({ user, classRecords, sectionRecords, teacherRecords }: ClassManagementProps) {
  const flash = (usePage().props as any).flash ?? {};
  const classes = classRecords || [];
  const sections = sectionRecords || [];
  const teachers = teacherRecords || [];
  const [showCreateDialog, setShowCreateDialog] = useState(false);
  const [showCreateSectionDialog, setShowCreateSectionDialog] = useState(false);
  const [editingClassId, setEditingClassId] = useState<number | null>(null);
  const [editingSectionName, setEditingSectionName] = useState<string | null>(null);

  const [classForm, setClassForm] = useState(DEFAULT_CLASS_FORM);
  const [sectionForm, setSectionForm] = useState(DEFAULT_SECTION_FORM);

  const resetClassDialog = () => {
    setClassForm(DEFAULT_CLASS_FORM);
    setEditingClassId(null);
    setShowCreateDialog(false);
  };

  const handleCreateOrUpdateClass = async (e: React.FormEvent) => {
    e.preventDefault();

    if (!classForm.name || !classForm.section) {
      toast.error('Please select both class and section');
      return;
    }

    const duplicateClass = classes.some(
      (classItem) =>
        classItem.id !== editingClassId &&
        classItem.name === classForm.name &&
        classItem.section === classForm.section
    );

    if (duplicateClass) {
      toast.error(`Class ${classForm.name} Section ${classForm.section} already exists`);
      return;
    }

    try {
      const payload = {
        name: classForm.name,
        section: classForm.section,
        teacher_id: classForm.teacher_id,
        room_number: classForm.room_number,
      };

      if (editingClassId) {
        router.patch(`/classes/${editingClassId}`, payload, {
          preserveScroll: true,
          onSuccess: () => {
            resetClassDialog();
            toast.success('Class updated successfully!');
          },
        });
      } else {
        router.post('/classes', payload, {
          preserveScroll: true,
          onSuccess: () => {
            resetClassDialog();
            toast.success('Class created successfully!');
          },
        });
      }
    } catch (error) {
      console.error('Error saving class:', error);
      toast.error(editingClassId ? 'Failed to update class' : 'Failed to create class');
    }
  };

  const handleEditClass = (classItem: any) => {
    const matchedTeacher = teachers.find(
      (teacher) => teacher.id === classItem.teacher_id || teacher.name === classItem.teacher_name
    );

    setEditingClassId(classItem.id);
    setClassForm({
      name: classItem.name || '',
      section: classItem.section || '',
      teacher_id: matchedTeacher?.id || classItem.teacher_id || '',
      teacher_name: matchedTeacher?.name || classItem.teacher_name || '',
      room_number: classItem.room_number || '',
    });
    setShowCreateDialog(true);
  };

  const handleDeleteClass = (classItem: any) => {
    const confirmed = window.confirm(`Delete Class ${classItem.name} Section ${classItem.section}?`);

    if (!confirmed) {
      return;
    }

    router.delete(`/classes/${classItem.id}`, {
      preserveScroll: true,
      onSuccess: () => {
        toast.success(`Class ${classItem.name} Section ${classItem.section} deleted successfully!`);
      },
    });
  };

  const resetSectionDialog = () => {
    setSectionForm(DEFAULT_SECTION_FORM);
    setEditingSectionName(null);
    setShowCreateSectionDialog(false);
  };

  const handleEditSection = (section: string) => {
    setEditingSectionName(section);
    setSectionForm({ name: section });
    setShowCreateSectionDialog(true);
  };

  const handleCreateOrUpdateSection = async (e: React.FormEvent) => {
    e.preventDefault();

    const sectionName = sectionForm.name.trim().toUpperCase();

    if (!sectionName) {
      toast.error('Please enter a section name');
      return;
    }

    if (sections.includes(sectionName) && sectionName !== editingSectionName) {
      toast.error(`Section ${sectionName} already exists`);
      return;
    }

    if (!editingSectionName) {
      router.post('/classes/sections', { name: sectionName }, {
        preserveScroll: true,
        onSuccess: () => {
          resetSectionDialog();
          toast.success(`Section ${sectionName} created successfully!`);
        },
      });
      return;
    }

    router.patch(`/classes/sections/${encodeURIComponent(editingSectionName)}`, { name: sectionName }, {
      preserveScroll: true,
      onSuccess: () => {
        resetSectionDialog();
        toast.success(`Section ${editingSectionName} updated to ${sectionName}!`);
      },
    });
  };

  const handleDeleteSection = (section: string) => {
    const linkedClasses = classes.filter((classItem) => classItem.section === section).length;

    if (linkedClasses > 0) {
      toast.error(`Section ${section} is linked to ${linkedClasses} class${linkedClasses > 1 ? 'es' : ''}`);
      return;
    }

    const confirmed = window.confirm(`Delete Section ${section}?`);

    if (!confirmed) {
      return;
    }

    router.delete(`/classes/sections/${encodeURIComponent(section)}`, {
      preserveScroll: true,
      onSuccess: () => {
        toast.success(`Section ${section} deleted successfully!`);
      },
    });
  };

  const canManageClasses = ['super_admin', 'admin'].includes(user.role);

  return (
    <DashboardLayout user={user} activeTab="classes" onLogout={() => {}}>
    <div className="p-8">
      {flash.success && (
        <div className="mb-4 rounded-lg border border-green-200 bg-green-50 p-3 text-sm text-green-800">
          {flash.success}
        </div>
      )}

      {flash.error && (
        <div className="mb-4 rounded-lg border border-red-200 bg-red-50 p-3 text-sm text-red-800">
          {flash.error}
        </div>
      )}

      <div className="flex items-center justify-between mb-6">
        <div>
          <h1 className="text-3xl font-bold text-gray-900">Class Management</h1>
          <p className="text-gray-600 mt-1">Manage classes and sections</p>
        </div>
        {canManageClasses && (
          <div className="flex gap-2">
            <Dialog
              open={showCreateSectionDialog}
              onOpenChange={(open) => {
                if (!open) {
                  resetSectionDialog();
                  return;
                }

                setShowCreateSectionDialog(true);
              }}
            >
              <DialogTrigger asChild>
                <Button variant="outline" className="gap-2">
                  <Plus className="w-4 h-4" />
                  Create Section
                </Button>
              </DialogTrigger>
              <DialogContent>
                <DialogHeader>
                  <DialogTitle>{editingSectionName ? `Edit Section ${editingSectionName}` : 'Create New Section'}</DialogTitle>
                </DialogHeader>
                <form onSubmit={handleCreateOrUpdateSection} className="space-y-4">
                  <div className="space-y-2">
                    <Label>Section Name</Label>
                    <Input
                      value={sectionForm.name}
                      onChange={(e) => setSectionForm({ name: e.target.value.toUpperCase() })}
                      placeholder="e.g., A"
                      maxLength={10}
                    />
                  </div>

                  <div className="flex justify-end gap-2">
                    <Button type="button" variant="outline" onClick={resetSectionDialog}>
                      Cancel
                    </Button>
                    <Button type="submit">{editingSectionName ? 'Update Section' : 'Create Section'}</Button>
                  </div>
                </form>
              </DialogContent>
            </Dialog>

            <Dialog
              open={showCreateDialog}
              onOpenChange={(open) => {
                if (!open) {
                  resetClassDialog();
                  return;
                }

                setShowCreateDialog(true);
              }}
            >
              <DialogTrigger asChild>
                <Button className="gap-2" onClick={() => {
                  setEditingClassId(null);
                  setClassForm(DEFAULT_CLASS_FORM);
                }}>
                  <Plus className="w-4 h-4" />
                  Create Class
                </Button>
              </DialogTrigger>
              <DialogContent>
                <DialogHeader>
                  <DialogTitle>{editingClassId ? 'Edit Class' : 'Create New Class'}</DialogTitle>
                </DialogHeader>
                <form onSubmit={handleCreateOrUpdateClass} className="space-y-4">
                  <div className="space-y-2">
                    <Label>Class Name</Label>
                    <Input
                      value={classForm.name}
                      onChange={(e) => setClassForm({ ...classForm, name: e.target.value })}
                      placeholder="e.g., 10 or Nursery"
                    />
                  </div>

                  <div className="space-y-2">
                    <Label>Section</Label>
                    <Select
                      value={classForm.section}
                      onValueChange={(v) => setClassForm({ ...classForm, section: v })}
                      disabled={sections.length === 0}
                    >
                      <SelectTrigger>
                        <SelectValue placeholder={sections.length === 0 ? 'Create a section first' : 'Select section'} />
                      </SelectTrigger>
                      <SelectContent>
                        {sections.map((section) => (
                          <SelectItem key={section} value={section}>Section {section}</SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                    {sections.length === 0 && (
                      <p className="text-sm text-gray-500">Create a section before adding a class.</p>
                    )}
                  </div>

                  <div className="space-y-2">
                    <Label>Teacher in Charge</Label>
                    <Select
                      value={classForm.teacher_id}
                      onValueChange={(value) => {
                        const selectedTeacher = teachers.find((teacher) => teacher.id === value);
                        setClassForm({
                          ...classForm,
                          teacher_id: value,
                          teacher_name: selectedTeacher?.name || '',
                        });
                      }}
                      disabled={teachers.length === 0}
                    >
                      <SelectTrigger>
                        <SelectValue placeholder={teachers.length === 0 ? 'No teachers available' : 'Select teacher'} />
                      </SelectTrigger>
                      <SelectContent>
                        {teachers.map((teacher) => (
                          <SelectItem key={teacher.id} value={teacher.id}>
                            {teacher.name}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>

                  <div className="space-y-2">
                    <Label>Room Number</Label>
                    <Input
                      value={classForm.room_number}
                      onChange={(e) => setClassForm({ ...classForm, room_number: e.target.value })}
                      placeholder="e.g., 101"
                    />
                  </div>

                  <div className="flex justify-end gap-2">
                    <Button type="button" variant="outline" onClick={resetClassDialog}>
                      Cancel
                    </Button>
                    <Button type="submit" disabled={sections.length === 0}>
                      {editingClassId ? 'Update Class' : 'Create Class'}
                    </Button>
                  </div>
                </form>
              </DialogContent>
            </Dialog>
          </div>
        )}
      </div>

      <div className="grid grid-cols-2 gap-6 mb-6">
        <Card>
          <CardContent className="pt-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-gray-600">Total Classes</p>
                <p className="text-3xl font-bold text-gray-900">{classes.length}</p>
              </div>
              <div className="w-12 h-12 bg-blue-100 rounded-full flex items-center justify-center">
                <School className="w-6 h-6 text-blue-600" />
              </div>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="pt-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-gray-600">Total Sections</p>
                <p className="text-3xl font-bold text-gray-900">{sections.length}</p>
              </div>
              <div className="w-12 h-12 bg-amber-100 rounded-full flex items-center justify-center">
                <Badge variant="outline" className="border-amber-300 text-amber-700">SEC</Badge>
              </div>
            </div>
          </CardContent>
        </Card>

      </div>

      <div className="grid grid-cols-1 xl:grid-cols-[2fr_1fr] gap-6">
        <Card>
          <CardHeader>
            <CardTitle>All Classes</CardTitle>
          </CardHeader>
          <CardContent>
            {classes.length === 0 ? (
              <div className="text-center py-12">
                <School className="w-12 h-12 text-gray-400 mx-auto mb-4" />
                <p className="text-gray-600">No classes found</p>
                {canManageClasses && (
                  <p className="text-sm text-gray-500 mt-1">Create your first class to get started</p>
                )}
              </div>
            ) : (
              <div className="overflow-x-auto">
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>Class</TableHead>
                      <TableHead>Section</TableHead>
                      <TableHead>Teacher in Charge</TableHead>
                    <TableHead>Room Number</TableHead>
                    <TableHead>Students</TableHead>
                    {canManageClasses && <TableHead className="text-right">Actions</TableHead>}
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {classes.map((classItem) => (
                      <TableRow key={classItem.id}>
                        <TableCell className="font-medium">Class {classItem.name}</TableCell>
                        <TableCell>
                          <Badge variant="outline">Section {classItem.section}</Badge>
                        </TableCell>
                        <TableCell>{classItem.teacher_name || '-'}</TableCell>
                        <TableCell>{classItem.room_number || '-'}</TableCell>
                        <TableCell>
                          <Badge variant="outline">{classItem.student_count || 0}</Badge>
                        </TableCell>
                        {canManageClasses && (
                          <TableCell className="text-right">
                            <div className="flex justify-end gap-2">
                              <Button type="button" variant="outline" size="sm" onClick={() => handleEditClass(classItem)}>
                                <Pencil className="w-4 h-4" />
                              </Button>
                              <Button type="button" variant="outline" size="sm" onClick={() => handleDeleteClass(classItem)}>
                                <Trash2 className="w-4 h-4 text-red-600" />
                              </Button>
                            </div>
                          </TableCell>
                        )}
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              </div>
            )}
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>All Sections</CardTitle>
          </CardHeader>
          <CardContent>
            {sections.length === 0 ? (
              <div className="text-center py-12">
                <p className="text-gray-600">No sections found</p>
                {canManageClasses && (
                  <p className="text-sm text-gray-500 mt-1">Create a section to start assigning it to classes</p>
                )}
              </div>
            ) : (
              <div className="space-y-3">
                {sections.map((section) => {
                  const linkedClasses = classes.filter((classItem) => classItem.section === section).length;
                  return (
                    <div key={section} className="flex items-center justify-between rounded-lg border p-3">
                      <div>
                        <p className="font-medium">Section {section}</p>
                        <p className="text-sm text-gray-600">{linkedClasses} classes linked</p>
                      </div>
                      <div className="flex items-center gap-2">
                        <Badge variant="outline">{section}</Badge>
                        {canManageClasses && (
                          <>
                            <Button type="button" variant="outline" size="sm" onClick={() => handleEditSection(section)}>
                              <Pencil className="w-4 h-4" />
                            </Button>
                            <Button type="button" variant="outline" size="sm" onClick={() => handleDeleteSection(section)}>
                              <Trash2 className="w-4 h-4 text-red-600" />
                            </Button>
                          </>
                        )}
                      </div>
                    </div>
                  );
                })}
              </div>
            )}
          </CardContent>
        </Card>
      </div>

      <div className="mt-6 grid grid-cols-1 lg:grid-cols-2 gap-6">
        <Card>
          <CardHeader>
            <CardTitle>Class Distribution</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-4">
              {Array.from(new Set(classes.map(c => c.name))).map((className) => {
                const classCount = classes.filter(c => c.name === className).length;
                return (
                  <div key={className} className="flex items-center justify-between">
                    <div className="flex items-center gap-3">
                      <div className="w-10 h-10 bg-blue-100 rounded-lg flex items-center justify-center">
                        <span className="text-sm font-bold text-blue-600">{className}</span>
                      </div>
                      <div>
                        <p className="font-medium">Class {className}</p>
                        <p className="text-sm text-gray-600">{classCount} sections</p>
                      </div>
                    </div>
                    <Badge>{classCount}</Badge>
                  </div>
                );
              })}
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>Quick Stats</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-4">
              <div className="flex items-center justify-between p-3 bg-blue-50 rounded-lg">
                <div>
                  <p className="text-sm text-gray-600">Primary Classes (1-5)</p>
                  <p className="text-xl font-bold text-blue-900">
                    {classes.filter(c => parseInt(c.name) <= 5).length}
                  </p>
                </div>
              </div>
              <div className="flex items-center justify-between p-3 bg-green-50 rounded-lg">
                <div>
                  <p className="text-sm text-gray-600">Middle School (6-8)</p>
                  <p className="text-xl font-bold text-green-900">
                    {classes.filter(c => parseInt(c.name) >= 6 && parseInt(c.name) <= 8).length}
                  </p>
                </div>
              </div>
              <div className="flex items-center justify-between p-3 bg-purple-50 rounded-lg">
                <div>
                  <p className="text-sm text-gray-600">High School (9-12)</p>
                  <p className="text-xl font-bold text-purple-900">
                    {classes.filter(c => parseInt(c.name) >= 9).length}
                  </p>
                </div>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
    </DashboardLayout>
  );
}
