import React, { useMemo, useState } from 'react';
import { router } from '@inertiajs/react';
import { CalendarCheck, Download, FileText } from 'lucide-react';
import DashboardLayout from '../DashboardLayout';
import { Button } from '../ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '../ui/card';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '../ui/select';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '../ui/table';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '../ui/tabs';
import { toast } from 'sonner';

type ModuleStat = {
  label: string;
  value: string;
};

type ModuleReport = {
  id: string;
  label: string;
  description: string;
  columns: string[];
  stats: ModuleStat[];
  rows: string[][];
};

interface ReportsAnalyticsProps {
  user: any;
  accessToken?: string;
  classOptions: { value: string; label: string }[];
  sessionOptions: { value: string; label: string; isCurrent: boolean }[];
  monthOptions: { value: string; label: string }[];
  selectedFilters: { class: string; month: string; session: string; module: string };
  moduleReports: ModuleReport[];
}

const escapeCsvCell = (value: string | number) => {
  const text = String(value ?? '').replace(/"/g, '""');
  return /[",\n]/.test(text) ? `"${text}"` : text;
};

const downloadCsv = (filename: string, rows: Array<Array<string | number>>) => {
  const csv = rows.map((row) => row.map(escapeCsvCell).join(',')).join('\n');
  const blob = new Blob([csv], { type: 'text/csv;charset=utf-8;' });
  const url = URL.createObjectURL(blob);
  const link = document.createElement('a');
  link.href = url;
  link.download = filename;
  link.click();
  URL.revokeObjectURL(url);
};

const exportPdf = (title: string, headers: string[], rows: string[][]) => {
  const printWindow = window.open('', '_blank', 'width=1200,height=800');

  if (!printWindow) {
    toast.error('Unable to open print window for PDF export');
    return;
  }

  const headerHtml = headers.map((header) => `<th>${header}</th>`).join('');
  const rowHtml = rows.map((row) => `<tr>${row.map((cell) => `<td>${cell}</td>`).join('')}</tr>`).join('');

  printWindow.document.write(`
    <html>
      <head>
        <title>${title}</title>
        <style>
          body { font-family: Arial, sans-serif; padding: 24px; color: #0f172a; }
          h1 { margin: 0 0 8px; font-size: 24px; }
          p { margin: 0 0 20px; color: #475569; }
          table { width: 100%; border-collapse: collapse; }
          th, td { border: 1px solid #cbd5e1; padding: 10px; text-align: left; font-size: 12px; }
          th { background: #eff6ff; }
          tr:nth-child(even) td { background: #f8fafc; }
        </style>
      </head>
      <body>
        <h1>${title}</h1>
        <p>Generated from the Reports module</p>
        <table>
          <thead><tr>${headerHtml}</tr></thead>
          <tbody>${rowHtml}</tbody>
        </table>
      </body>
    </html>
  `);
  printWindow.document.close();
  printWindow.focus();
  printWindow.print();
};

export default function ReportsAnalytics({
  user,
  accessToken,
  classOptions,
  sessionOptions,
  monthOptions,
  selectedFilters,
  moduleReports,
}: ReportsAnalyticsProps) {
  const [selectedClass, setSelectedClass] = useState(selectedFilters.class);
  const [selectedMonth, setSelectedMonth] = useState(selectedFilters.month);
  const [selectedSession, setSelectedSession] = useState(selectedFilters.session);
  const [activeModule, setActiveModule] = useState(selectedFilters.module || moduleReports[0]?.id || 'students');

  const selectedMonthLabel = monthOptions.find((option) => option.value === selectedMonth)?.label || selectedMonth;
  const selectedSessionOption = sessionOptions.find((option) => option.value === selectedSession);
  const activeReport = useMemo(
    () => moduleReports.find((module) => module.id === activeModule) ?? moduleReports[0],
    [activeModule, moduleReports]
  );

  const applyFilters = (nextClass: string, nextMonth: string, nextSession: string, nextModule = activeModule) => {
    setSelectedClass(nextClass);
    setSelectedMonth(nextMonth);
    setSelectedSession(nextSession);
    setActiveModule(nextModule);

    router.get('/reports', {
      class: nextClass,
      month: nextMonth,
      session: nextSession,
      module: nextModule,
    }, {
      preserveScroll: true,
      preserveState: true,
    });
  };

  const handleModuleChange = (nextModule: string) => {
    setActiveModule(nextModule);
    router.get('/reports', {
      class: selectedClass,
      month: selectedMonth,
      session: selectedSession,
      module: nextModule,
    }, {
      preserveScroll: true,
      preserveState: true,
      replace: true,
    });
  };

  const exportModuleCsv = (module: ModuleReport) => {
    downloadCsv(`${module.id}-report-${selectedSessionOption?.label || selectedSession}-${selectedMonth}.csv`, [module.columns, ...module.rows]);
    toast.success(`${module.label} CSV exported successfully`);
  };

  const exportModulePdf = (module: ModuleReport) => {
    exportPdf(`${module.label} Report`, module.columns, module.rows);
    toast.success(`${module.label} PDF export opened`);
  };

  const handleSetCurrentSession = () => {
    if (!selectedSessionOption || selectedSessionOption.isCurrent) {
      return;
    }

    router.patch(`/reports/sessions/${selectedSession}/activate`, {}, {
      preserveScroll: true,
      preserveState: true,
    });
  };

  return (
    <DashboardLayout user={user} activeTab="reports" onLogout={() => {}} accessToken={accessToken}>
      <div className="space-y-6 p-8">
        <div className="flex flex-col items-start gap-4 xl:flex-row xl:items-center xl:justify-between">
          <div className="space-y-2 text-left">
            <div>
              <h1 className="text-3xl font-bold text-slate-900">Reports Center</h1>
              <p className="mt-1 text-slate-600">
                Select a report type to review records and export report tables.
              </p>
            </div>
          </div>

          <div className="flex flex-wrap gap-2">
            <Select value={selectedClass} onValueChange={(value) => applyFilters(value, selectedMonth, selectedSession)}>
              <SelectTrigger className="w-48 bg-white">
                <SelectValue placeholder="Select class" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All Classes</SelectItem>
                {classOptions.map((option) => (
                  <SelectItem key={option.value} value={option.value}>
                    {option.label}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>

            <Select value={selectedSession} onValueChange={(value) => applyFilters(selectedClass, selectedMonth, value)}>
              <SelectTrigger className="w-48 bg-white">
                <SelectValue placeholder="Select session" />
              </SelectTrigger>
              <SelectContent>
                {sessionOptions.map((option) => (
                  <SelectItem key={option.value} value={option.value}>
                    {option.label}{option.isCurrent ? ' (Current)' : ''}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>

            <Select value={selectedMonth} onValueChange={(value) => applyFilters(selectedClass, value, selectedSession)}>
              <SelectTrigger className="w-36 bg-white">
                <SelectValue placeholder="Select month" />
              </SelectTrigger>
              <SelectContent>
                {monthOptions.map((option) => (
                  <SelectItem key={option.value} value={option.value}>
                    {option.label}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>

            <Button
              type="button"
              variant="outline"
              className="gap-2 bg-white"
              disabled={!selectedSessionOption || selectedSessionOption.isCurrent}
              onClick={handleSetCurrentSession}
            >
              <CalendarCheck className="h-4 w-4" />
              {selectedSessionOption?.isCurrent ? 'Current Session' : 'Set Current Session'}
            </Button>
          </div>
        </div>

        <Card className="border-slate-200">
          <CardHeader className="flex flex-col gap-4 lg:flex-row lg:items-center lg:justify-between">
            <div>
              <CardTitle>{activeReport?.label ?? 'Module'} Reports</CardTitle>
              <CardDescription>
                {selectedMonthLabel} · {selectedSessionOption?.label || '-'} · Export-ready report tables.
              </CardDescription>
            </div>
          </CardHeader>

          <CardContent>
            <Tabs value={activeModule} onValueChange={handleModuleChange} className="space-y-6">
              <TabsList className="flex h-auto flex-wrap justify-start gap-2 bg-transparent p-0">
                {moduleReports.map((module) => (
                  <TabsTrigger
                    key={module.id}
                    value={module.id}
                    className="rounded-full border border-slate-200 bg-white px-4 py-2 text-slate-600 data-[state=active]:border-blue-600 data-[state=active]:bg-blue-600 data-[state=active]:text-white"
                  >
                    {module.label}
                  </TabsTrigger>
                ))}
              </TabsList>

              {moduleReports.map((module) => (
                <TabsContent key={module.id} value={module.id} className="space-y-5">
                  <div className="flex flex-col gap-4 lg:flex-row lg:items-start lg:justify-between">
                    <div className="space-y-1">
                      <h3 className="text-xl font-semibold text-slate-900">{module.label} Report</h3>
                      <p className="text-sm text-slate-600">{module.description}</p>
                    </div>
                    <div className="flex flex-wrap gap-2">
                      <Button type="button" variant="outline" className="gap-2" onClick={() => exportModuleCsv(module)}>
                        <Download className="h-4 w-4" />
                        Export CSV
                      </Button>
                      <Button type="button" variant="outline" className="gap-2" onClick={() => exportModulePdf(module)}>
                        <FileText className="h-4 w-4" />
                        Export PDF
                      </Button>
                    </div>
                  </div>

                  <div className="grid grid-cols-1 gap-4 md:grid-cols-2 xl:grid-cols-4">
                    {module.stats.map((stat) => (
                      <Card key={stat.label} className="border-slate-200 bg-slate-50/70">
                        <CardContent className="pt-6">
                          <p className="text-sm text-slate-500">{stat.label}</p>
                          <p className="mt-2 text-2xl font-semibold text-slate-900">{stat.value}</p>
                        </CardContent>
                      </Card>
                    ))}
                  </div>

                  <div className="overflow-hidden rounded-xl border border-slate-200 bg-white">
                    <Table>
                      <TableHeader className="bg-slate-50">
                        <TableRow>
                          {module.columns.map((column) => (
                            <TableHead key={column}>{column}</TableHead>
                          ))}
                        </TableRow>
                      </TableHeader>
                      <TableBody>
                        {module.rows.length > 0 ? (
                          module.rows.map((row, rowIndex) => (
                            <TableRow key={`${module.id}-${rowIndex}`}>
                              {row.map((cell, cellIndex) => (
                                <TableCell key={`${module.id}-${rowIndex}-${cellIndex}`}>{cell}</TableCell>
                              ))}
                            </TableRow>
                          ))
                        ) : (
                          <TableRow>
                            <TableCell colSpan={module.columns.length} className="py-8 text-center text-slate-500">
                              No records found for this module and filter selection.
                            </TableCell>
                          </TableRow>
                        )}
                      </TableBody>
                    </Table>
                  </div>
                </TabsContent>
              ))}
            </Tabs>
          </CardContent>
        </Card>
      </div>
    </DashboardLayout>
  );
}
