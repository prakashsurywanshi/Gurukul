import React, { useState, useEffect, useMemo } from 'react';
import { router, usePage } from '@inertiajs/react';
import { Card, CardContent, CardHeader, CardTitle } from '../ui/card';
import { Button } from '../ui/button';
import { Input } from '../ui/input';
import { Label } from '../ui/label';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger, DialogDescription } from '../ui/dialog';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '../ui/table';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '../ui/select';
import { Badge } from '../ui/badge';
import { Plus, Search, Edit, Eye, UserPlus, Upload, Download, FileSpreadsheet, AlertCircle, CheckCircle, Trash2, FileUp, Sparkles } from 'lucide-react';
import { toast } from 'sonner';
import { ScrollArea } from '../ui/scroll-area';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '../ui/tabs';
import { Alert, AlertDescription } from '../ui/alert';
import DashboardLayout from '../DashboardLayout';
import { formatDate, formatDateTime } from '../ui/utils';

interface StudentImportRecord {
  id: string;
  status: 'queued' | 'processing' | 'completed' | 'completed_with_errors' | 'failed' | string;
  queue: string;
  submitted_count: number;
  created_count: number;
  skipped_count: number;
  error_message?: string | null;
  errors?: string[];
  created_at?: string | null;
  started_at?: string | null;
  finished_at?: string | null;
}

interface StudentManagementProps {
  user: any;
  classRecords: {
    id: number;
    name: string;
    section: string;
  }[];
  studentRecords: any[];
  studentImports?: StudentImportRecord[];
}

export default function StudentManagement({ user, classRecords, studentRecords, studentImports = [] }: StudentManagementProps) {
  const flash = (usePage().props as any).flash ?? {};
  const [students, setStudents] = useState<any[]>(studentRecords ?? []);
  const [loading, setLoading] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');
  const [classFilter, setClassFilter] = useState('all');
  const [sectionFilter, setSectionFilter] = useState('all');
  const [showAddDialog, setShowAddDialog] = useState(false);
  const [showImportSection, setShowImportSection] = useState(false);
  const [importFile, setImportFile] = useState<File | null>(null);
  const [importData, setImportData] = useState<any[]>([]);
  const [importErrors, setImportErrors] = useState<string[]>([]);
  const [isImporting, setIsImporting] = useState(false);
  const [importStatusMessage, setImportStatusMessage] = useState('');
  const [currentPage, setCurrentPage] = useState(1);
  const importSampleHeaders = 'first_name,last_name,email,phone,date_of_birth,gender,blood_group,class,section,roll_number,admission_date,father_name,father_phone,father_occupation,mother_name,mother_phone,mother_occupation,address,city,state,pincode,category,religion,caste,previous_school';
  const importHeaderList = importSampleHeaders.split(',');
  const requiredImportHeaders = ['first_name', 'last_name', 'date_of_birth', 'gender', 'class', 'section', 'admission_date'];
  const hasActiveImport = studentImports.some((studentImport) => ['queued', 'processing'].includes(studentImport.status));

  // Form state
  const [formData, setFormData] = useState({
    first_name: '',
    last_name: '',
    email: '',
    phone: '',
    date_of_birth: '',
    gender: '',
    blood_group: '',
    class: '',
    section: '',
    roll_number: '',
    admission_date: new Date().toISOString().split('T')[0],
    // Parent details
    father_name: '',
    father_phone: '',
    father_occupation: '',
    mother_name: '',
    mother_phone: '',
    mother_occupation: '',
    // Address
    address: '',
    city: '',
    state: '',
    pincode: '',
    // Additional
    category: '',
    religion: '',
    caste: '',
    previous_school: '',
  });

  useEffect(() => {
    setStudents(studentRecords ?? []);
    setLoading(false);
  }, [studentRecords]);

  useEffect(() => {
    if (flash.success) {
      toast.success(flash.success);
    }

    if (flash.error) {
      toast.error(flash.error);
    }
  }, [flash.error, flash.success]);

  const classOptions = useMemo(
    () => Array.from(new Set(classRecords.map((classRecord) => String(classRecord.name)))).sort((a, b) =>
      a.localeCompare(b, undefined, { numeric: true })
    ),
    [classRecords]
  );

  const sectionOptionsByClass = useMemo(() => {
    return classRecords.reduce<Record<string, string[]>>((accumulator, classRecord) => {
      const className = String(classRecord.name);
      const sectionName = String(classRecord.section);

      if (!accumulator[className]) {
        accumulator[className] = [];
      }

      if (!accumulator[className].includes(sectionName)) {
        accumulator[className].push(sectionName);
        accumulator[className].sort((a, b) => a.localeCompare(b, undefined, { numeric: true }));
      }

      return accumulator;
    }, {});
  }, [classRecords]);

  const importSampleRow = useMemo(() => {
    const sampleClassRecord = classRecords[0];

    return [
      'John',
      'Doe',
      'john@example.com',
      '9876543210',
      '15-01-2010',
      'male',
      'O+',
      sampleClassRecord?.name || '10',
      sampleClassRecord?.section || 'A',
      '101',
      '01-04-2026',
      'Michael Doe',
      '9876543211',
      'Engineer',
      'Sarah Doe',
      '9876543212',
      'Teacher',
      '123 Main Street',
      'Mumbai',
      'Maharashtra',
      '400001',
      'General',
      'Hindu',
      'General',
      'ABC Public School',
    ].join(',');
  }, [classRecords]);

  const importSampleCsv = `${importSampleHeaders}\n${importSampleRow}`;

  const sectionOptions = useMemo(() => {
    if (classFilter && classFilter !== 'all') {
      return sectionOptionsByClass[classFilter] || [];
    }

    return Array.from(new Set(classRecords.map((classRecord) => String(classRecord.section)))).sort((a, b) =>
      a.localeCompare(b, undefined, { numeric: true })
    );
  }, [classFilter, classRecords, sectionOptionsByClass]);

  const formSectionOptions = useMemo(
    () => (formData.class ? sectionOptionsByClass[formData.class] || [] : []),
    [formData.class, sectionOptionsByClass]
  );

  const filteredStudents = useMemo(() => {
    let filtered = students;

    if (classFilter !== 'all') {
      filtered = filtered.filter((student) => String(student.class) === classFilter);
    }

    if (sectionFilter !== 'all') {
      filtered = filtered.filter((student) => String(student.section) === sectionFilter);
    }

    if (!searchQuery.trim()) {
      return filtered;
    }

    const searchLower = searchQuery.toLowerCase();

    return filtered.filter(
      (student) =>
        String(student.first_name).toLowerCase().includes(searchLower) ||
        String(student.last_name).toLowerCase().includes(searchLower) ||
        String(student.email).toLowerCase().includes(searchLower) ||
        String(student.roll_number).toLowerCase().includes(searchLower) ||
        String(student.admission_no || '').toLowerCase().includes(searchLower)
    );
  }, [classFilter, searchQuery, sectionFilter, students]);

  const rowsPerPage = 10;
  const totalPages = Math.max(1, Math.ceil(filteredStudents.length / rowsPerPage));
  const paginatedStudents = filteredStudents.slice((currentPage - 1) * rowsPerPage, currentPage * rowsPerPage);

  useEffect(() => {
    if (sectionFilter !== 'all' && !sectionOptions.includes(sectionFilter)) {
      setSectionFilter('all');
    }
  }, [sectionFilter, sectionOptions]);

  useEffect(() => {
    if (formData.section && !formSectionOptions.includes(formData.section)) {
      setFormData((current) => ({ ...current, section: '' }));
    }
  }, [formData.section, formSectionOptions]);

  useEffect(() => {
    setCurrentPage(1);
  }, [searchQuery, classFilter, sectionFilter]);

  useEffect(() => {
    if (currentPage > totalPages) {
      setCurrentPage(totalPages);
    }
  }, [currentPage, totalPages]);

  useEffect(() => {
    if (!hasActiveImport) {
      return;
    }

    const interval = window.setInterval(() => {
      router.reload({
        only: ['studentImports', 'studentRecords'],
        preserveScroll: true,
        preserveState: true,
      });
    }, 3000);

    return () => window.clearInterval(interval);
  }, [hasActiveImport]);

  const importStatusLabel = (status: StudentImportRecord['status']) => {
    switch (status) {
      case 'queued':
        return 'Queued';
      case 'processing':
        return 'Processing';
      case 'completed':
        return 'Completed';
      case 'completed_with_errors':
        return 'Completed with skipped rows';
      case 'failed':
        return 'Failed';
      default:
        return String(status || 'Unknown');
    }
  };

  const importStatusClass = (status: StudentImportRecord['status']) => {
    switch (status) {
      case 'queued':
        return 'border-blue-200 bg-blue-50 text-blue-700';
      case 'processing':
        return 'border-amber-200 bg-amber-50 text-amber-700';
      case 'completed':
        return 'border-emerald-200 bg-emerald-50 text-emerald-700';
      case 'completed_with_errors':
        return 'border-orange-200 bg-orange-50 text-orange-700';
      case 'failed':
        return 'border-red-200 bg-red-50 text-red-700';
      default:
        return 'border-slate-200 bg-slate-50 text-slate-700';
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    router.post('/students', formData, {
      preserveScroll: true,
      onSuccess: () => {
        setShowAddDialog(false);
        resetForm();
      },
      onError: (errors) => {
        const emailErrors = Array.isArray(errors.email) ? errors.email : errors.email ? [errors.email] : [];
        const firstError = emailErrors[0] || Object.values(errors).flat()[0] || 'Failed to add student';

        if (emailErrors.length > 0) {
          window.alert(String(firstError));
          return;
        }

        toast.error(String(firstError));
      },
    });
  };

  const resetForm = () => {
    setFormData({
      first_name: '',
      last_name: '',
      email: '',
      phone: '',
      date_of_birth: '',
      gender: '',
      blood_group: '',
      class: '',
      section: '',
      roll_number: '',
      admission_date: new Date().toISOString().split('T')[0],
      father_name: '',
      father_phone: '',
      father_occupation: '',
      mother_name: '',
      mother_phone: '',
      mother_occupation: '',
      address: '',
      city: '',
      state: '',
      pincode: '',
      category: '',
      religion: '',
      caste: '',
      previous_school: '',
    });
  };

  const handleInputChange = (field: string, value: any) => {
    setFormData({ ...formData, [field]: value });
  };

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      setImportFile(file);
      setImportErrors([]);
      setImportData([]);
      setImportStatusMessage('');
      readCSV(file);
    }
  };

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

  const readCSV = (file: File) => {
    const reader = new FileReader();
    reader.onload = (e) => {
      const text = String(e.target?.result || '').replace(/\r\n/g, '\n').replace(/\r/g, '\n');
      const lines = text
        .split('\n')
        .map((line) => line.trim())
        .filter((line) => line.length > 0);

      if (lines.length < 2) {
        setImportErrors(['The CSV file must include a header row and at least one student row.']);
        setImportData([]);
        return;
      }

      const headers = parseCsvLine(lines[0]).map((header) => header.trim());
      const missingHeaders = requiredImportHeaders.filter((header) => !headers.includes(header));

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

          const missingRequiredValues = requiredImportHeaders.filter((header) => !String(row[header] ?? '').trim());

          if (missingRequiredValues.length > 0) {
            rowErrors.push(`Row ${index + 2} is missing: ${missingRequiredValues.join(', ')}`);
          }

          return row;
        })
        .filter(Boolean) as Record<string, string>[];

      if (data.length === 0) {
        setImportErrors(['No valid student rows were found in the CSV file.']);
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

  const handleImport = async () => {
    if (importData.length === 0) {
      setImportErrors(['Please upload a valid CSV file before importing.']);
      return;
    }

    setIsImporting(true);
    setImportStatusMessage(
      importErrors.length > 0
        ? 'Uploading student records. Rows with issues will be skipped during processing...'
        : 'Uploading student records to the import queue...'
    );

    router.post('/students/import', { students: importData }, {
      preserveScroll: true,
      preserveState: true,
      onStart: () => {
        setImportStatusMessage('Submitting import job...');
      },
      onSuccess: () => {
        setImportStatusMessage('Import queued. The background worker will process the student rows.');
        window.setTimeout(() => {
          setImportFile(null);
          setImportData([]);
          setImportErrors([]);
          setShowImportSection(false);
          setImportStatusMessage('');
        }, 350);
      },
      onError: (errors) => {
        const errorMessages = Object.values(errors).flat().map((error) => String(error));
        setImportErrors(errorMessages.length > 0 ? errorMessages : ['Failed to import students.']);
        setImportStatusMessage('');
      },
      onFinish: () => {
        setIsImporting(false);
      },
    });
  };

  const handleDeleteStudent = (studentId: string, studentName: string) => {
    if (!window.confirm(`Delete ${studentName} permanently? This action cannot be undone.`)) {
      return;
    }

    router.delete(`/students/${studentId}`, {
      preserveScroll: true,
    });
  };

  const handleDeleteStudentImport = (studentImport: StudentImportRecord) => {
    if (['queued', 'processing'].includes(studentImport.status)) {
      toast.error('Active imports cannot be deleted while they are still running.');
      return;
    }

    if (!window.confirm('Delete this import history entry? This will not delete imported students.')) {
      return;
    }

    router.delete(`/students/imports/${studentImport.id}`, {
      preserveScroll: true,
    });
  };

  const toggleImportSection = (open: boolean) => {
    setShowImportSection(open);

    if (!open && !isImporting) {
      setImportFile(null);
      setImportData([]);
      setImportErrors([]);
      setImportStatusMessage('');
    }
  };

  const downloadImportTemplate = () => {
    const blob = new Blob([importSampleCsv], { type: 'text/csv' });
    const url = window.URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = 'student_import_template.csv';
    a.click();
    window.URL.revokeObjectURL(url);
    toast.success('Template downloaded successfully');
  };

  return (
    <DashboardLayout user={user} activeTab="search_students" onTabChange={() => {}} onLogout={() => {}}>
    <div className="p-8">
      <div className="flex items-center justify-between mb-6">
        <div>
          <h1 className="text-3xl font-bold text-gray-900">Student Management</h1>
          <p className="text-gray-600 mt-1">Manage student admissions and records</p>
        </div>
        <div className="flex gap-2">
          <Button
            variant={showImportSection ? 'default' : 'outline'}
            className="gap-2"
            onClick={() => toggleImportSection(!showImportSection)}
          >
            <Upload className="w-4 h-4" />
            {showImportSection ? 'Hide Import Layout' : 'Import Students'}
          </Button>

          <Button
            variant="outline"
            className="gap-2"
            onClick={downloadImportTemplate}
          >
            <Download className="w-4 h-4" />
            Download Template
          </Button>

          <Dialog open={showAddDialog} onOpenChange={setShowAddDialog}>
            <DialogTrigger asChild>
              <Button className="gap-2">
                <Plus className="w-4 h-4" />
                Add Student
              </Button>
            </DialogTrigger>
            <DialogContent className="max-w-4xl max-h-[90vh]">
              <DialogHeader>
                <DialogTitle>Add New Student</DialogTitle>
                <DialogDescription>Enter the student's details below.</DialogDescription>
              </DialogHeader>
              <ScrollArea className="max-h-[calc(90vh-8rem)] pr-4">
                <form onSubmit={handleSubmit} className="space-y-6">
                  <Tabs defaultValue="personal">
                    <TabsList className="grid w-full grid-cols-4">
                      <TabsTrigger value="personal">Personal</TabsTrigger>
                      <TabsTrigger value="academic">Academic</TabsTrigger>
                      <TabsTrigger value="parent">Parent</TabsTrigger>
                      <TabsTrigger value="address">Address</TabsTrigger>
                    </TabsList>

                    <TabsContent value="personal" className="space-y-4 mt-4">
                      <div className="grid grid-cols-2 gap-4">
                        <div className="space-y-2">
                          <Label>First Name *</Label>
                          <Input
                            value={formData.first_name}
                            onChange={(e) => handleInputChange('first_name', e.target.value)}
                            required
                          />
                        </div>
                        <div className="space-y-2">
                          <Label>Last Name *</Label>
                          <Input
                            value={formData.last_name}
                            onChange={(e) => handleInputChange('last_name', e.target.value)}
                            required
                          />
                        </div>
                        <div className="space-y-2">
                          <Label>Email</Label>
                          <Input
                            type="email"
                            value={formData.email}
                            onChange={(e) => handleInputChange('email', e.target.value)}
                          />
                        </div>
                        <div className="space-y-2">
                          <Label>Phone</Label>
                          <Input
                            value={formData.phone}
                            onChange={(e) => handleInputChange('phone', e.target.value)}
                          />
                        </div>
                        <div className="space-y-2">
                          <Label>Date of Birth *</Label>
                          <Input
                            type="date"
                            value={formData.date_of_birth}
                            onChange={(e) => handleInputChange('date_of_birth', e.target.value)}
                            required
                          />
                        </div>
                        <div className="space-y-2">
                          <Label>Gender *</Label>
                          <Select value={formData.gender} onValueChange={(v) => handleInputChange('gender', v)}>
                            <SelectTrigger>
                              <SelectValue placeholder="Select gender" />
                            </SelectTrigger>
                            <SelectContent>
                              <SelectItem value="male">Male</SelectItem>
                              <SelectItem value="female">Female</SelectItem>
                              <SelectItem value="other">Other</SelectItem>
                            </SelectContent>
                          </Select>
                        </div>
                        <div className="space-y-2">
                          <Label>Blood Group</Label>
                          <Select value={formData.blood_group} onValueChange={(v) => handleInputChange('blood_group', v)}>
                            <SelectTrigger>
                              <SelectValue placeholder="Select blood group" />
                            </SelectTrigger>
                            <SelectContent>
                              <SelectItem value="A+">A+</SelectItem>
                              <SelectItem value="A-">A-</SelectItem>
                              <SelectItem value="B+">B+</SelectItem>
                              <SelectItem value="B-">B-</SelectItem>
                              <SelectItem value="AB+">AB+</SelectItem>
                              <SelectItem value="AB-">AB-</SelectItem>
                              <SelectItem value="O+">O+</SelectItem>
                              <SelectItem value="O-">O-</SelectItem>
                            </SelectContent>
                          </Select>
                        </div>
                        <div className="space-y-2">
                          <Label>Admission Date *</Label>
                          <Input
                            type="date"
                            value={formData.admission_date}
                            onChange={(e) => handleInputChange('admission_date', e.target.value)}
                            required
                          />
                        </div>
                      </div>
                    </TabsContent>

                    <TabsContent value="academic" className="space-y-4 mt-4">
                      <div className="grid grid-cols-2 gap-4">
                        <div className="space-y-2">
                          <Label>Class *</Label>
                          <Select
                            value={formData.class}
                            onValueChange={(value) => setFormData((current) => ({ ...current, class: value, section: '' }))}
                          >
                            <SelectTrigger>
                              <SelectValue placeholder="Select class" />
                            </SelectTrigger>
                            <SelectContent>
                              {classOptions.map(c => (
                                <SelectItem key={c} value={c}>Class {c}</SelectItem>
                              ))}
                            </SelectContent>
                          </Select>
                        </div>
                        <div className="space-y-2">
                          <Label>Section *</Label>
                          <Select
                            value={formData.section}
                            onValueChange={(v) => handleInputChange('section', v)}
                            disabled={formSectionOptions.length === 0}
                          >
                            <SelectTrigger>
                              <SelectValue placeholder="Select section" />
                            </SelectTrigger>
                            <SelectContent>
                              {formSectionOptions.map(s => (
                                <SelectItem key={s} value={s}>Section {s}</SelectItem>
                              ))}
                            </SelectContent>
                          </Select>
                        </div>
                        <div className="space-y-2">
                          <Label>Roll Number</Label>
                          <Input
                            value={formData.roll_number}
                            onChange={(e) => handleInputChange('roll_number', e.target.value)}
                          />
                        </div>
                        <div className="space-y-2">
                          <Label>Category</Label>
                          <Select value={formData.category} onValueChange={(v) => handleInputChange('category', v)}>
                            <SelectTrigger>
                              <SelectValue placeholder="Select category" />
                            </SelectTrigger>
                            <SelectContent>
                              <SelectItem value="General">General</SelectItem>
                              <SelectItem value="OBC">OBC</SelectItem>
                              <SelectItem value="SC">SC</SelectItem>
                              <SelectItem value="ST">ST</SelectItem>
                            </SelectContent>
                          </Select>
                        </div>
                        <div className="space-y-2">
                          <Label>Previous School</Label>
                          <Input
                            value={formData.previous_school}
                            onChange={(e) => handleInputChange('previous_school', e.target.value)}
                          />
                        </div>
                      </div>
                    </TabsContent>

                    <TabsContent value="parent" className="space-y-4 mt-4">
                      <div className="grid grid-cols-2 gap-4">
                        <div className="space-y-2">
                          <Label>Father's Name</Label>
                          <Input
                            value={formData.father_name}
                            onChange={(e) => handleInputChange('father_name', e.target.value)}
                          />
                        </div>
                        <div className="space-y-2">
                          <Label>Father's Phone</Label>
                          <Input
                            value={formData.father_phone}
                            onChange={(e) => handleInputChange('father_phone', e.target.value)}
                          />
                        </div>
                        <div className="space-y-2">
                          <Label>Father's Occupation</Label>
                          <Input
                            value={formData.father_occupation}
                            onChange={(e) => handleInputChange('father_occupation', e.target.value)}
                          />
                        </div>
                        <div className="space-y-2">
                          <Label>Mother's Name</Label>
                          <Input
                            value={formData.mother_name}
                            onChange={(e) => handleInputChange('mother_name', e.target.value)}
                          />
                        </div>
                        <div className="space-y-2">
                          <Label>Mother's Phone</Label>
                          <Input
                            value={formData.mother_phone}
                            onChange={(e) => handleInputChange('mother_phone', e.target.value)}
                          />
                        </div>
                        <div className="space-y-2">
                          <Label>Mother's Occupation</Label>
                          <Input
                            value={formData.mother_occupation}
                            onChange={(e) => handleInputChange('mother_occupation', e.target.value)}
                          />
                        </div>
                      </div>
                    </TabsContent>

                    <TabsContent value="address" className="space-y-4 mt-4">
                      <div className="grid grid-cols-2 gap-4">
                        <div className="space-y-2 col-span-2">
                          <Label>Address</Label>
                          <Input
                            value={formData.address}
                            onChange={(e) => handleInputChange('address', e.target.value)}
                          />
                        </div>
                        <div className="space-y-2">
                          <Label>City</Label>
                          <Input
                            value={formData.city}
                            onChange={(e) => handleInputChange('city', e.target.value)}
                          />
                        </div>
                        <div className="space-y-2">
                          <Label>State</Label>
                          <Input
                            value={formData.state}
                            onChange={(e) => handleInputChange('state', e.target.value)}
                          />
                        </div>
                        <div className="space-y-2">
                          <Label>Pincode</Label>
                          <Input
                            value={formData.pincode}
                            onChange={(e) => handleInputChange('pincode', e.target.value)}
                          />
                        </div>
                      </div>
                    </TabsContent>
                  </Tabs>

                  <div className="flex justify-end gap-2 pt-4 border-t">
                    <Button type="button" variant="outline" onClick={() => setShowAddDialog(false)}>
                      Cancel
                    </Button>
                    <Button type="submit">Add Student</Button>
                  </div>
                </form>
              </ScrollArea>
            </DialogContent>
          </Dialog>
        </div>
      </div>

      {showImportSection && (
        <Card className="mb-6 border-slate-200 shadow-sm">
          <CardHeader className="border-b border-slate-200 bg-white">
            <div className="flex items-start gap-4">
              <div className="flex h-12 w-12 items-center justify-center rounded-2xl bg-blue-100 text-blue-700">
                <FileUp className="h-6 w-6" />
              </div>
              <div className="min-w-0">
                <CardTitle className="text-2xl text-slate-900">Import Students from CSV</CardTitle>
                <p className="mt-1 text-sm text-slate-600">
                  Upload a CSV file, review the preview, and valid rows will continue even when another row is skipped.
                </p>
              </div>
            </div>
          </CardHeader>
          <CardContent className="space-y-5 bg-slate-50 p-6">
            <div className="grid min-w-0 gap-5 xl:grid-cols-[minmax(0,1.2fr)_minmax(320px,0.8fr)]">
              <div className="min-w-0 space-y-6">
                <div className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm">
                  <div className="flex items-center justify-between gap-4">
                    <div>
                      <p className="text-sm font-semibold text-slate-900">Step 1. Upload CSV File</p>
                      <p className="mt-1 text-sm text-slate-500">
                        Required headers: {requiredImportHeaders.join(', ')}
                      </p>
                    </div>
                    <Button type="button" variant="outline" className="gap-2" onClick={downloadImportTemplate}>
                      <Download className="h-4 w-4" />
                      Download Template
                    </Button>
                  </div>

                  <label
                    htmlFor="csv-file-inline"
                    className="mt-5 flex cursor-pointer flex-col items-center justify-center rounded-2xl border border-dashed border-slate-300 bg-slate-50 px-6 py-10 text-center transition hover:border-blue-300 hover:bg-blue-50"
                  >
                    <Upload className="h-8 w-8 text-slate-400" />
                    <p className="mt-3 text-sm font-medium text-slate-900">
                      {importFile?.name || 'Click to choose a CSV file'}
                    </p>
                    <p className="mt-1 text-xs text-slate-500">
                      Only `.csv` files are supported.
                    </p>
                  </label>
                  <Input
                    id="csv-file-inline"
                    type="file"
                    accept=".csv"
                    onChange={handleFileChange}
                    className="hidden"
                  />

                  <p className="mt-4 text-sm font-medium text-slate-700">
                    CSV should have headers:
                  </p>
                  <div className="mt-2 flex max-w-full flex-wrap gap-2 rounded-lg border border-slate-200 bg-slate-50 p-3">
                    {importHeaderList.map((header) => (
                      <code key={header} className="rounded-md border border-slate-200 bg-white px-2 py-1 text-xs text-slate-600">
                        {header}
                      </code>
                    ))}
                  </div>
                  <p className="mt-2 max-w-full text-sm text-slate-500">
                    Admission number is auto-generated during import. Do not add an <code className="rounded bg-slate-100 px-1 py-0.5 text-xs text-slate-700">admission_no</code> column.
                  </p>

                  <div className="mt-5 grid gap-3 sm:grid-cols-3">
                    <div className="rounded-xl border border-slate-200 bg-slate-50 p-3">
                      <p className="text-xs font-medium uppercase tracking-wide text-slate-500">File</p>
                      <p className="mt-1 truncate text-sm font-medium text-slate-800">{importFile?.name || 'Not selected'}</p>
                    </div>
                    <div className="rounded-xl border border-slate-200 bg-slate-50 p-3">
                      <p className="text-xs font-medium uppercase tracking-wide text-slate-500">Rows Ready</p>
                      <p className="mt-1 text-sm font-medium text-slate-800">{importData.length}</p>
                    </div>
                    <div className="rounded-xl border border-slate-200 bg-slate-50 p-3">
                      <p className="text-xs font-medium uppercase tracking-wide text-slate-500">Issues</p>
                      <p className="mt-1 text-sm font-medium text-slate-800">{importErrors.length}</p>
                    </div>
                  </div>
                </div>

                <div className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm">
                  <div className="flex items-center gap-3">
                    <Sparkles className="h-5 w-5 text-blue-600" />
                    <div>
                      <p className="text-sm font-semibold text-slate-900">Step 2. Preview Import Data</p>
                      <p className="mt-1 text-sm text-slate-500">
                        Rows with missing required values are reported and skipped; the remaining rows are still queued.
                      </p>
                    </div>
                  </div>

                  {importData.length > 0 && importErrors.length === 0 && (
                    <Alert className="mt-4 border-emerald-200 bg-emerald-50 text-emerald-900">
                      <CheckCircle className="h-4 w-4" />
                      <AlertDescription>
                        {importData.length} students are ready to import.
                      </AlertDescription>
                    </Alert>
                  )}

                  {importData.length > 0 ? (
                    <div className="mt-4 space-y-2">
                      <Label className="text-slate-900">Preview (First 5 records)</Label>
                      <ScrollArea className="h-64 rounded-xl border border-slate-200">
                        <Table>
                          <TableHeader>
                            <TableRow>
                              <TableHead>First Name</TableHead>
                              <TableHead>Last Name</TableHead>
                              <TableHead>Class</TableHead>
                              <TableHead>Section</TableHead>
                              <TableHead>Email</TableHead>
                            </TableRow>
                          </TableHeader>
                          <TableBody>
                            {importData.slice(0, 5).map((student, index) => (
                              <TableRow key={index}>
                                <TableCell>{student.first_name}</TableCell>
                                <TableCell>{student.last_name}</TableCell>
                                <TableCell>{student.class}</TableCell>
                                <TableCell>{student.section}</TableCell>
                                <TableCell>{student.email || '-'}</TableCell>
                              </TableRow>
                            ))}
                          </TableBody>
                        </Table>
                      </ScrollArea>
                    </div>
                  ) : (
                    <div className="mt-4 rounded-xl border border-dashed border-slate-300 bg-slate-50 px-6 py-10 text-center text-sm text-slate-500">
                      Upload a CSV file to see the parsed preview here.
                    </div>
                  )}
                </div>
              </div>

              <div className="min-w-0 space-y-6">
                <div className="rounded-2xl border border-blue-200 bg-blue-50 p-5 shadow-sm">
                  <div>
                    <Label className="text-slate-900">Sample CSV</Label>
                    <p className="mt-1 text-sm text-slate-600">
                      Match this structure exactly for the fastest import.
                    </p>
                  </div>
                  <pre className="mt-4 overflow-x-auto rounded-xl border border-blue-100 bg-white p-4 text-xs text-slate-700">
                    {importSampleCsv}
                  </pre>
                </div>

                <div className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm">
                  <p className="text-sm font-semibold text-slate-900">Import Checklist</p>
                  <ul className="mt-3 space-y-2 text-sm text-slate-600">
                    <li>Each row must use a class and section that already exist in the system.</li>
                    <li>`date_of_birth` and `admission_date` should use `DD-MM-YYYY` format.</li>
                    <li>`gender` should be `male`, `female`, or `other`.</li>
                    <li>Email can be blank, but if provided it must be unique.</li>
                    <li>Bulk import creates student records without sending welcome emails.</li>
                    <li>`admission_no` is auto-generated by the system during import.</li>
                  </ul>
                </div>
              </div>
            </div>

            {studentImports.length > 0 && (
              <div className="overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-sm">
                <div className="border-b border-slate-200 px-5 py-4">
                  <div className="flex items-center justify-between gap-4">
                    <div>
                      <p className="text-sm font-semibold text-slate-900">Recent Imports</p>
                      <p className="mt-1 text-sm text-slate-500">
                        Review the latest background CSV import jobs from this screen.
                      </p>
                    </div>
                    {hasActiveImport && (
                      <Badge variant="outline" className="border-blue-200 bg-blue-50 text-blue-700">
                        Auto-refreshing
                      </Badge>
                    )}
                  </div>
                </div>
                <div className="overflow-x-auto">
                  <Table>
                    <TableHeader>
                      <TableRow>
                        <TableHead>Status</TableHead>
                        <TableHead>Submitted</TableHead>
                        <TableHead>Imported</TableHead>
                        <TableHead>Skipped</TableHead>
                        <TableHead>Queued At</TableHead>
                        <TableHead>Finished At</TableHead>
                        <TableHead>Latest Message</TableHead>
                        <TableHead className="text-right">Actions</TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {studentImports.map((studentImport) => (
                        <TableRow key={studentImport.id}>
                          <TableCell>
                            <Badge variant="outline" className={importStatusClass(studentImport.status)}>
                              {importStatusLabel(studentImport.status)}
                            </Badge>
                          </TableCell>
                          <TableCell>{studentImport.submitted_count}</TableCell>
                          <TableCell>{studentImport.created_count}</TableCell>
                          <TableCell>{studentImport.skipped_count}</TableCell>
                          <TableCell>{formatDateTime(studentImport.created_at)}</TableCell>
                          <TableCell>{formatDateTime(studentImport.finished_at)}</TableCell>
                          <TableCell className="max-w-md truncate text-sm text-slate-600">
                            {studentImport.error_message || (['queued', 'processing'].includes(studentImport.status) ? 'Waiting for the background worker.' : 'No issues reported.')}
                          </TableCell>
                          <TableCell className="text-right">
                            <Button
                              type="button"
                              size="sm"
                              variant="ghost"
                              className="text-red-600 hover:text-red-700 disabled:text-slate-300"
                              disabled={['queued', 'processing'].includes(studentImport.status)}
                              title={['queued', 'processing'].includes(studentImport.status) ? 'Active imports cannot be deleted' : 'Delete import history'}
                              onClick={() => handleDeleteStudentImport(studentImport)}
                            >
                              <Trash2 className="h-4 w-4" />
                            </Button>
                          </TableCell>
                        </TableRow>
                      ))}
                    </TableBody>
                  </Table>
                </div>
              </div>
            )}

            {isImporting && (
              <div className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm">
                <div className="flex items-center justify-between gap-4">
                  <Label className="text-slate-900">Importing Students...</Label>
                  <span className="text-sm text-slate-600">{importStatusMessage || 'Please wait...'}</span>
                </div>
                <div className="mt-3 h-2 overflow-hidden rounded-full bg-blue-100">
                  <div className="h-full w-2/5 rounded-full bg-blue-600 animate-pulse" />
                </div>
                <p className="mt-3 text-sm text-slate-500">
                  Large imports are queued in the background so the page can respond quickly.
                </p>
              </div>
            )}

            {importErrors.length > 0 && (
              <Alert variant="destructive" className="rounded-2xl">
                <AlertCircle className="h-4 w-4" />
                <AlertDescription>
                  <p className="font-semibold mb-1">These rows will be skipped:</p>
                  <ul className="list-disc list-inside space-y-1">
                    {importErrors.slice(0, 5).map((error, index) => (
                      <li key={index} className="text-sm">{error}</li>
                    ))}
                    {importErrors.length > 5 && (
                      <li className="text-sm">...and {importErrors.length - 5} more errors</li>
                    )}
                  </ul>
                </AlertDescription>
              </Alert>
            )}

            <div className="flex justify-end gap-2 border-t border-slate-200 pt-4">
              <Button variant="outline" onClick={() => toggleImportSection(false)}>
                Cancel
              </Button>
              <Button
                onClick={handleImport}
                disabled={isImporting || importData.length === 0}
              >
                {isImporting ? 'Importing...' : `Import ${importData.length} Students`}
              </Button>
            </div>
          </CardContent>
        </Card>
      )}

      {/* Bulk Operations Toolbar */}
      {students.length > 0 && (
        <Card className="mb-4">
          <CardContent className="pt-6">
            <div className="flex flex-wrap items-center gap-4">
              <div className="flex items-center gap-2">
                <FileSpreadsheet className="w-5 h-5 text-gray-600" />
                <span className="font-medium">Bulk Operations:</span>
              </div>
              <Button
                variant="outline"
                size="sm"
                className="gap-2"
                onClick={() => {
                  // Export all students to CSV
                  const headers = 'admission_no,first_name,last_name,email,phone,date_of_birth,gender,blood_group,class,section,roll_number,admission_date,father_name,father_phone,father_occupation,mother_name,mother_phone,mother_occupation,address,city,state,pincode,category,religion,caste,previous_school\n';
                  const rows = students.map(s => 
                    `${s.admission_no},${s.first_name},${s.last_name},${s.email || ''},${s.phone || ''},${formatDate(s.date_of_birth, '')},${s.gender || ''},${s.blood_group || ''},${s.class},${s.section},${s.roll_number || ''},${formatDate(s.admission_date, '')},${s.father_name || ''},${s.father_phone || ''},${s.father_occupation || ''},${s.mother_name || ''},${s.mother_phone || ''},${s.mother_occupation || ''},${s.address || ''},${s.city || ''},${s.state || ''},${s.pincode || ''},${s.category || ''},${s.religion || ''},${s.caste || ''},${s.previous_school || ''}`
                  ).join('\n');
                  const csvContent = headers + rows;
                  const blob = new Blob([csvContent], { type: 'text/csv' });
                  const url = window.URL.createObjectURL(blob);
                  const a = document.createElement('a');
                  a.href = url;
                  a.download = `students_export_${new Date().toISOString().split('T')[0]}.csv`;
                  a.click();
                  toast.success(`Exported ${students.length} students successfully`);
                }}
              >
                <Download className="w-4 h-4" />
                Export to CSV
              </Button>
              <div className="ml-auto text-sm text-gray-600">
                Total Students: <span className="font-semibold">{filteredStudents.length}</span>
              </div>
            </div>
          </CardContent>
        </Card>
      )}

      <Card>
        <CardHeader>
          <div className="flex flex-col md:flex-row gap-4 items-start md:items-center justify-between">
            <CardTitle>All Students</CardTitle>
            <div className="flex gap-2 w-full md:w-auto flex-wrap">
              <div className="relative flex-1 md:w-64">
                <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 w-4 h-4" />
                <Input
                  placeholder="Search students..."
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  className="pl-10"
                />
              </div>
              <Select
                value={classFilter}
                onValueChange={(value) => {
                  setClassFilter(value);
                  setSectionFilter('all');
                }}
              >
                <SelectTrigger className="w-32">
                  <SelectValue placeholder="All Classes" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">All Classes</SelectItem>
                  {classOptions.map(c => (
                    <SelectItem key={c} value={c}>Class {c}</SelectItem>
                  ))}
                </SelectContent>
              </Select>

              <Select value={sectionFilter} onValueChange={setSectionFilter} disabled={sectionOptions.length === 0}>
                <SelectTrigger className="w-36">
                  <SelectValue placeholder="All Sections" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">All Sections</SelectItem>
                  {sectionOptions.map((section) => (
                    <SelectItem key={section} value={section}>
                      Section {section}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          </div>
        </CardHeader>
        <CardContent>
          {loading ? (
            <div className="text-center py-8">
              <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600 mx-auto"></div>
              <p className="mt-2 text-gray-600">Loading students...</p>
            </div>
          ) : filteredStudents.length === 0 ? (
            <div className="text-center py-8">
              <UserPlus className="w-12 h-12 text-gray-400 mx-auto mb-4" />
              <p className="text-gray-600">No students found</p>
              <p className="text-sm text-gray-500 mt-1">Try a different class, section, or search term</p>
            </div>
          ) : (
            <div className="overflow-x-auto">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Admission No.</TableHead>
                    <TableHead>Name</TableHead>
                    <TableHead>Class</TableHead>
                    <TableHead>Section</TableHead>
                    <TableHead>Roll No.</TableHead>
                    <TableHead>Contact</TableHead>
                    <TableHead>Actions</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {paginatedStudents.map((student) => (
                    <TableRow key={student.id}>
                      <TableCell className="font-medium">{student.admission_no}</TableCell>
                      <TableCell>
                        {student.first_name} {student.last_name}
                      </TableCell>
                      <TableCell>
                        <Badge variant="outline">{student.class}</Badge>
                      </TableCell>
                      <TableCell>{student.section}</TableCell>
                      <TableCell>{student.roll_number || '-'}</TableCell>
                      <TableCell className="text-sm text-gray-600">{student.phone || '-'}</TableCell>
                      <TableCell>
                        <div className="flex gap-2">
                          <Button
                            size="sm"
                            variant="ghost"
                            onClick={() => router.visit(`/students/${student.id}/edit`)}
                          >
                            <Edit className="w-4 h-4" />
                          </Button>
                          <Button
                            size="sm"
                            variant="ghost"
                            onClick={() => router.visit(`/students/${student.id}`)}
                          >
                            <Eye className="w-4 h-4" />
                          </Button>
                          <Button
                            size="sm"
                            variant="ghost"
                            className="text-red-600 hover:text-red-700"
                            onClick={() => handleDeleteStudent(student.id, `${student.first_name} ${student.last_name}`)}
                          >
                            <Trash2 className="w-4 h-4" />
                          </Button>
                        </div>
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
              <div className="mt-4 flex flex-col gap-3 border-t border-slate-200 pt-4 md:flex-row md:items-center md:justify-between">
                <p className="text-sm text-slate-500">
                  Showing {filteredStudents.length === 0 ? 0 : (currentPage - 1) * rowsPerPage + 1}
                  {' '}to{' '}
                  {Math.min(currentPage * rowsPerPage, filteredStudents.length)} of {filteredStudents.length} students
                </p>
                <div className="flex items-center gap-2">
                  <Button
                    variant="outline"
                    size="sm"
                    disabled={currentPage === 1}
                    onClick={() => setCurrentPage((page) => Math.max(1, page - 1))}
                  >
                    Previous
                  </Button>
                  <span className="text-sm text-slate-600">
                    Page {currentPage} of {totalPages}
                  </span>
                  <Button
                    variant="outline"
                    size="sm"
                    disabled={currentPage === totalPages || filteredStudents.length === 0}
                    onClick={() => setCurrentPage((page) => Math.min(totalPages, page + 1))}
                  >
                    Next
                  </Button>
                </div>
              </div>
            </div>
          )}
        </CardContent>
      </Card>

    </div>
    </DashboardLayout>
  );
}
