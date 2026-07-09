import { toast } from 'sonner';

const escapeCsvCell = (value: string) => {
  const normalized = value.replace(/"/g, '""');

  if (/[",\n]/.test(normalized)) {
    return `"${normalized}"`;
  }

  return normalized;
};

export const copyFrontOfficeRows = async (title: string, headers: string[], rows: string[][]) => {
  const textContent = [headers.join('\t'), ...rows.map((row) => row.join('\t'))].join('\n');

  try {
    await navigator.clipboard.writeText(textContent);
    toast.success(`${title} copied successfully`);
  } catch {
    toast.error('Failed to copy records');
  }
};

export const exportFrontOfficeCsv = (filePrefix: string, title: string, headers: string[], rows: string[][]) => {
  const csvContent = [
    headers.map(escapeCsvCell).join(','),
    ...rows.map((row) => row.map(escapeCsvCell).join(',')),
  ].join('\n');

  const blob = new Blob([csvContent], { type: 'text/csv' });
  const url = window.URL.createObjectURL(blob);
  const anchor = document.createElement('a');
  anchor.href = url;
  anchor.download = `${filePrefix}_${new Date().toISOString().split('T')[0]}.csv`;
  anchor.click();
  window.URL.revokeObjectURL(url);
  toast.success(`${title} CSV exported successfully`);
};

export const exportFrontOfficePdf = (title: string, headers: string[], rows: string[][]) => {
  const printWindow = window.open('', '_blank', 'width=1000,height=700');

  if (!printWindow) {
    toast.error('Unable to open print window');
    return;
  }

  const tableHeaders = headers.map((header) => `<th>${header}</th>`).join('');
  const tableRows = rows
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
