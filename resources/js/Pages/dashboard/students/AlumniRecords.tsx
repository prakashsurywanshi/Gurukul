import React, { useEffect, useMemo, useState } from 'react';
import { Download, GraduationCap, Search, Users } from 'lucide-react';
import { toast } from 'sonner';
import DashboardLayout from '../../DashboardLayout';
import { Card, CardContent, CardHeader, CardTitle } from '../../ui/card';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '../../ui/select';
import { Input } from '../../ui/input';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '../../ui/table';
import { Badge } from '../../ui/badge';
import { Button } from '../../ui/button';

interface AlumniRecord {
  id: string;
  admission_no: string;
  first_name: string;
  last_name: string;
  session: string;
  class?: string | null;
  section?: string | null;
  passing_year?: string | null;
  alumni_status: 'left_school' | string;
  organization_name?: string | null;
  current_city?: string | null;
  email?: string | null;
  phone?: string | null;
}

interface AlumniRecordsProps {
  user: any;
  alumniRecords: AlumniRecord[];
  sessions: string[];
}

export default function AlumniRecords({ user, alumniRecords, sessions }: AlumniRecordsProps) {
  const [searchQuery, setSearchQuery] = useState('');
  const [sessionFilter, setSessionFilter] = useState('all');
  const [classFilter, setClassFilter] = useState('all');
  const [sectionFilter, setSectionFilter] = useState('all');

  const classOptions = useMemo(
    () =>
      Array.from(new Set(alumniRecords.map((item) => String(item.class)))).sort((a, b) =>
        a.localeCompare(b, undefined, { numeric: true })
      ),
    [alumniRecords]
  );

  const sectionOptions = useMemo(() => {
    return Array.from(
      new Set(
        alumniRecords
          .filter((item) => classFilter === 'all' || String(item.class) === classFilter)
          .map((item) => String(item.section))
      )
    ).sort((a, b) => a.localeCompare(b, undefined, { numeric: true }));
  }, [alumniRecords, classFilter]);

  useEffect(() => {
    if (sectionFilter !== 'all' && !sectionOptions.includes(sectionFilter)) {
      setSectionFilter('all');
    }
  }, [sectionFilter, sectionOptions]);

  const filteredRecords = useMemo(() => {
    return alumniRecords.filter((item) => {
      const matchesSession = sessionFilter === 'all' || String(item.session) === sessionFilter;
      const matchesClass = classFilter === 'all' || String(item.class) === classFilter;
      const matchesSection = sectionFilter === 'all' || String(item.section) === sectionFilter;

      if (!matchesSession || !matchesClass || !matchesSection) {
        return false;
      }

      if (!searchQuery.trim()) {
        return true;
      }

      const searchLower = searchQuery.toLowerCase();
      return (
        `${item.first_name} ${item.last_name}`.toLowerCase().includes(searchLower) ||
        String(item.admission_no).toLowerCase().includes(searchLower) ||
        String(item.organization_name).toLowerCase().includes(searchLower)
      );
    });
  }, [alumniRecords, classFilter, searchQuery, sectionFilter, sessionFilter]);

  const handleExport = () => {
    if (filteredRecords.length === 0) {
      toast.error('No alumni records available to export');
      return;
    }

    const headers = [
      'Admission No',
      'Name',
      'Session',
      'Class',
      'Section',
      'Passing Year',
      'Status',
      'Current Organization',
      'City',
      'Email',
      'Phone',
    ];

    const rows = filteredRecords.map((record) => [
      record.admission_no,
      `${record.first_name} ${record.last_name}`,
      record.session,
      record.class,
      record.section,
      record.passing_year,
      record.alumni_status.replace('_', ' '),
      record.organization_name,
      record.current_city,
      record.email,
      record.phone,
    ]);

    const csvContent = [headers, ...rows]
      .map((row) => row.map((value) => `"${String(value ?? '').replace(/"/g, '""')}"`).join(','))
      .join('\n');

    const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
    const url = window.URL.createObjectURL(blob);
    const anchor = document.createElement('a');
    anchor.href = url;
    anchor.download = `alumni_records_${new Date().toISOString().split('T')[0]}.csv`;
    anchor.click();
    window.URL.revokeObjectURL(url);

    toast.success(`Exported ${filteredRecords.length} alumni record${filteredRecords.length === 1 ? '' : 's'}`);
  };

  return (
    <DashboardLayout user={user} activeTab="alumni-records">
      <div className="min-h-full bg-slate-50 p-8">
        <div className="mx-auto max-w-7xl space-y-6">
          <div className="flex items-center justify-between gap-3 overflow-x-auto">
            <div>
              <h1 className="text-3xl font-bold text-slate-900">Alumni Records</h1>
              <p className="mt-1 text-sm text-slate-600">Track alumni records class-wise and section-wise from one place.</p>
            </div>
            <Button type="button" variant="outline" className="gap-2" onClick={handleExport}>
              <Download className="h-4 w-4" />
              Export
            </Button>
          </div>

          <div className="grid gap-4 md:grid-cols-4">
            <Card>
              <CardContent className="pt-6">
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-sm text-slate-500">Total Alumni</p>
                    <p className="mt-1 text-3xl font-bold text-slate-900">{filteredRecords.length}</p>
                  </div>
                  <Users className="h-6 w-6 text-blue-600" />
                </div>
              </CardContent>
            </Card>
            <Card>
              <CardContent className="pt-6">
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-sm text-slate-500">Class Filter</p>
                    <p className="mt-1 text-2xl font-semibold text-slate-900">{classFilter === 'all' ? 'All' : classFilter}</p>
                  </div>
                  <GraduationCap className="h-6 w-6 text-emerald-600" />
                </div>
              </CardContent>
            </Card>
            <Card>
              <CardContent className="pt-6">
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-sm text-slate-500">Session Filter</p>
                    <p className="mt-1 text-2xl font-semibold text-slate-900">{sessionFilter === 'all' ? 'All' : sessionFilter}</p>
                  </div>
                  <Badge className="bg-indigo-100 text-indigo-700 hover:bg-indigo-100">Session</Badge>
                </div>
              </CardContent>
            </Card>
            <Card>
              <CardContent className="pt-6">
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-sm text-slate-500">Section Filter</p>
                    <p className="mt-1 text-2xl font-semibold text-slate-900">{sectionFilter === 'all' ? 'All' : sectionFilter}</p>
                  </div>
                  <Badge className="bg-blue-100 text-blue-700 hover:bg-blue-100">Alumni</Badge>
                </div>
              </CardContent>
            </Card>
          </div>

          <Card>
            <CardHeader>
              <CardTitle>Alumni Directory</CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="flex items-center gap-4 overflow-x-auto pb-1">
                <div className="relative min-w-[320px] flex-1">
                  <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-400" />
                  <Input
                    value={searchQuery}
                    onChange={(event) => setSearchQuery(event.target.value)}
                    placeholder="Search by name, admission no, or organization..."
                    className="pl-10"
                  />
                </div>

                <Select value={sessionFilter} onValueChange={setSessionFilter}>
                  <SelectTrigger className="w-[190px] shrink-0">
                    <SelectValue placeholder="Select session" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="all">All Sessions</SelectItem>
                    {sessions.map((session) => (
                      <SelectItem key={session} value={session}>
                        {session}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>

                <Select value={classFilter} onValueChange={(value) => {
                  setClassFilter(value);
                  setSectionFilter('all');
                }}>
                  <SelectTrigger className="w-[180px] shrink-0">
                    <SelectValue placeholder="Select class" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="all">All Classes</SelectItem>
                    {classOptions.map((className) => (
                      <SelectItem key={className} value={className}>
                         {className}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>

                <Select value={sectionFilter} onValueChange={setSectionFilter}>
                  <SelectTrigger className="w-[180px] shrink-0">
                    <SelectValue placeholder="Select section" />
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

              {filteredRecords.length === 0 ? (
                <div className="rounded-lg border border-dashed border-slate-300 bg-white py-12 text-center">
                  <p className="text-sm text-slate-500">No alumni records found for the selected session, class, and section.</p>
                </div>
              ) : (
                <div className="overflow-x-auto">
                  <Table>
                    <TableHeader>
                      <TableRow>
                        <TableHead>Admission No.</TableHead>
                        <TableHead>Name</TableHead>
                        <TableHead>Session</TableHead>
                        <TableHead>Class</TableHead>
                        <TableHead>Section</TableHead>
                        <TableHead>Passing Year</TableHead>
                        <TableHead>Status</TableHead>
                        <TableHead>Current Organization</TableHead>
                        <TableHead>City</TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {filteredRecords.map((record) => (
                        <TableRow key={record.id}>
                          <TableCell className="font-medium">{record.admission_no}</TableCell>
                          <TableCell>{record.first_name} {record.last_name}</TableCell>
                          <TableCell>{record.session}</TableCell>
                          <TableCell>{record.class}</TableCell>
                          <TableCell>{record.section}</TableCell>
                          <TableCell>{record.passing_year}</TableCell>
                          <TableCell>
                            <Badge variant="outline" className="capitalize">{record.alumni_status.replace('_', ' ')}</Badge>
                          </TableCell>
                          <TableCell>{record.organization_name}</TableCell>
                          <TableCell>{record.current_city}</TableCell>
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
