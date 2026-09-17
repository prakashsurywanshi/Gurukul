import { useLanguage } from '../../i18n/LanguageProvider';
import { useState } from 'react';
import { CreditCard, Printer, Search } from 'lucide-react';
import { qrSvgToken } from '../../utils/qr';
import DashboardLayout from '../DashboardLayout';
import CardFace from '../../components/designer/CardFace';
import { normalizeDesign, IdCardDesign } from '../../components/designer/cardTypes';
import { Button } from '../ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '../ui/card';
import { Input } from '../ui/input';
import { Label } from '../ui/label';
import { Switch } from '../ui/switch';

interface StaffMember {
    id: string;
    name: string;
    email: string;
    phone?: string | null;
    employee_id?: string | null;
    designation?: string | null;
    department?: string | null;
    role: string;
    gender?: string | null;
    blood_group?: string | null;
    joining_date?: string | null;
    profile_photo?: string | null;
    qr_token?: string | null;
}

interface StaffIdCardsProps {
    user: any;
    organization?: any;
    staff: StaffMember[];
    design?: Partial<IdCardDesign> | null;
}

function roleLabel(role: string): string {
    const map: Record<string, string> = {
        admin: 'Admin',
        teacher: 'Teacher',
        accountant: 'Accountant',
        receptionist: 'Receptionist',
        librarian: 'Librarian',
    };
    return map[role] ?? role;
}

export default function StaffIdCards(pageProps: StaffIdCardsProps) {
    const { t } = useLanguage();
    const user = pageProps.user;
    const organization = pageProps.organization;
    const staff = pageProps.staff ?? [];
    const design = normalizeDesign(pageProps.design);
    const accent = design.primary_color;

    const [query, setQuery] = useState('');
    const [showQrCode, setShowQrCode] = useState(true);

    const filtered = staff.filter((member) => {
        const q = query.trim().toLowerCase();
        if (!q) return true;
        return (
            member.name.toLowerCase().includes(q) ||
            (member.designation ?? '').toLowerCase().includes(q) ||
            (member.employee_id ?? '').toLowerCase().includes(q)
        );
    });

    const printCard = (member: StaffMember) => {
        const printWindow = window.open('', '_blank', 'width=900,height=700');
        if (!printWindow) return;

        const initials = member.name
            .split(' ')
            .map((part) => part.charAt(0))
            .slice(0, 2)
            .join('')
            .toUpperCase();
        const designation = member.designation || roleLabel(member.role);
        const dept = member.department || '—';
        const empId = member.employee_id || `UID-${member.id}`;
        const photo = member.profile_photo
            ? `<img src="${member.profile_photo}" alt="photo" class="photo" />`
            : `<div class="initial">${initials}</div>`;
        const qrBlock = showQrCode && design.show_qr
            ? `
              <div class="qr-scan">
                ${qrSvgToken(member.qr_token || `EMP-${member.id}`, 72)}
                <p class="qr-hint">${t('Scan For Attendance')}</p>
              </div>`
            : '';

        printWindow.document.write(`
      <!DOCTYPE html>
      <html lang="en">
        <head>
          <meta charset="UTF-8" />
          <meta name="viewport" content="width=device-width, initial-scale=1.0" />
          <title>Staff ID Card - ${member.name}</title>
          <style>
            * { box-sizing: border-box; margin: 0; padding: 0; }
            body {
              font-family: Arial, sans-serif;
              background: #f1f5f9;
              display: flex;
              justify-content: center;
              align-items: center;
              min-height: 100vh;
              padding: 24px;
              color: #0f172a;
            }
            .card {
              width: 440px;
              border-radius: 22px;
              overflow: hidden;
              background: #ffffff;
              box-shadow: 0 20px 45px rgba(15, 23, 42, 0.14);
              border: 1px solid #cbd5e1;
            }
            .header {
              padding: 18px 20px;
              color: #ffffff;
              background: ${accent};
              display: flex;
              align-items: center;
              gap: 12px;
            }
            .header small {
              font-size: 10px;
              letter-spacing: 0.28em;
              text-transform: uppercase;
              opacity: 0.85;
            }
            .header h1 {
              margin-top: 4px;
              font-size: 18px;
            }
            .org-badge {
              margin-left: auto;
              background: rgba(255,255,255,0.16);
              border: 1px solid rgba(255,255,255,0.4);
              padding: 6px 10px;
              border-radius: 999px;
              font-size: 10px;
              letter-spacing: 0.08em;
            }
            .content {
              padding: 18px 20px;
            }
            .profile {
              display: flex;
              gap: 16px;
              align-items: center;
              margin-bottom: 16px;
            }
            .photo {
              width: 86px;
              height: 86px;
              border-radius: 18px;
              object-fit: cover;
            }
            .initial {
              width: 86px;
              height: 86px;
              border-radius: 18px;
              display: flex;
              align-items: center;
              justify-content: center;
              background: ${accent}26;
              color: ${accent};
              font-size: 30px;
              font-weight: 700;
            }
            .name {
              font-size: 20px;
              font-weight: 700;
            }
            .role {
              color: ${accent};
              font-size: 13px;
              font-weight: 600;
              text-transform: uppercase;
              letter-spacing: 0.06em;
              margin-top: 2px;
            }
            .dept {
              color: #64748b;
              font-size: 12px;
              margin-top: 2px;
            }
            .details {
              display: grid;
              grid-template-columns: 1fr 1fr;
              gap: 10px 14px;
              border-top: 1px dashed #cbd5e1;
              padding-top: 14px;
            }
            .field { font-size: 11px; color: #64748b; }
            .field b { display: block; color: #0f172a; font-size: 12.5px; margin-top: 1px; }
            .footer {
              background: #f8fafc;
              border-top: 1px solid #e2e8f0;
              padding: 10px 20px;
              display: flex;
              justify-content: space-between;
              font-size: 9.5px;
              color: #94a3b8;
              letter-spacing: 0.08em;
              text-transform: uppercase;
            }
            .qr-scan {
              display: flex;
              flex-direction: column;
              align-items: center;
              margin-top: 12px;
            }
            .qr-scan svg {
              display: block;
            }
            .qr-hint {
              margin: 6px 0 0;
              font-size: 9px;
              letter-spacing: 0.18em;
              text-transform: uppercase;
              color: #64748b;
            }
            @media print {
              body { padding: 0; background: #ffffff; }
              .card { box-shadow: none; border: 1px solid #cbd5e1; }
            }
          </style>
        </head>
        <body>
          <div class="card">
            <div class="header">
              <div>
                <small>${organization?.name ?? 'School'}</small>
                <h1>Staff Identity Card</h1>
              </div>
              <span class="org-badge">ESTD.</span>
            </div>
            <div class="content">
              <div class="profile">
                ${photo}
                <div>
                  <div class="name">${member.name}</div>
                  <div class="role">${designation}</div>
                  <div class="dept">${dept}</div>
                </div>
              </div>
              <div class="details">
                <div class="field">EMP ID <b>${empId}</b></div>
                <div class="field">ROLE <b>${roleLabel(member.role)}</b></div>
                <div class="field">BLOOD GROUP <b>${member.blood_group || '—'}</b></div>
                <div class="field">GENDER <b>${member.gender ? member.gender.charAt(0).toUpperCase() + member.gender.slice(1) : '—'}</b></div>
                <div class="field">PHONE <b>${member.phone || 'N/A'}</b></div>
                <div class="field">JOINED <b>${member.joining_date || '—'}</b></div>
              </div>
              ${qrBlock}
            </div>
            <div class="footer">
              <span>Authorized By ${organization?.name ?? 'School'}</span>
              <span>Valid for current academic year</span>
            </div>
          </div>
          <script>window.onload = function(){ window.print(); };<\/script>
        </body>
      </html>
    `);
        printWindow.document.close();
    };

    return (
        <DashboardLayout user={user}>
            <div className="min-h-full bg-slate-50 p-8">
                <div className="mx-auto max-w-6xl space-y-6">
                    <div className="flex flex-wrap items-center justify-between gap-4">
                        <div>
                            <h1 className="text-2xl font-bold tracking-tight text-gray-900 dark:text-white">
                                {t('Staff ID Card')}
                            </h1>
                            <p className="text-sm text-gray-500 dark:text-gray-400">
                                {t('Generate and print identity cards for your staff.')}
                            </p>
                        </div>
                        <div className="flex items-center gap-3">
                            <Label className="text-sm text-gray-600 dark:text-gray-400">
                                {t('Include attendance QR code')}
                            </Label>
                            <Switch
                                checked={showQrCode}
                                onCheckedChange={(checked) => setShowQrCode(Boolean(checked))}
                            />
                        </div>
                    </div>

                    <Card>
                        <CardHeader className="pb-3">
                            <CardTitle className="flex items-center gap-2 text-base">
                                <CreditCard className="h-5 w-5 text-blue-500" />
                                {t('Staff Members')}
                                <span className="ml-auto text-sm font-normal text-gray-400">
                                    {filtered.length} / {staff.length}
                                </span>
                            </CardTitle>
                        </CardHeader>
                        <CardContent>
                            <div className="relative mb-4">
                                <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-gray-400" />
                                <Input
                                    value={query}
                                    onChange={(e) => setQuery(e.target.value)}
                                    placeholder={t('Search by name, designation or employee ID')}
                                    className="pl-10"
                                />
                            </div>

                            {filtered.length > 0 && (
                                <div className="mb-6 grid gap-6 lg:grid-cols-[420px_1fr]">
                                    <Card className="h-fit">
                                        <CardHeader className="pb-2">
                                            <CardTitle className="text-sm">{t('Live Preview')}</CardTitle>
                                        </CardHeader>
                                        <CardContent>
                                            <CardFace
                                                design={{ ...design, show_qr: design.show_qr && showQrCode }}
                                                orgName={organization?.name ?? 'Gurukul School'}
                                                title={t('Staff ID Card')}
                                                coachLabel="ESTD."
                                                entity={{
                                                    name: filtered[0].name,
                                                    email: filtered[0].email || null,
                                                    phone: filtered[0].phone || null,
                                                    roleLabel: filtered[0].designation || roleLabel(filtered[0].role),
                                                    idLabel: filtered[0].employee_id || `UID-${filtered[0].id}`,
                                                    bloodGroup: filtered[0].blood_group || null,
                                                    gender: filtered[0].gender || null,
                                                    dob: filtered[0].joining_date || null,
                                                    qrToken: filtered[0].qr_token || `EMP-${filtered[0].id}`,
                                                }}
                                            />
                                        </CardContent>
                                    </Card>
                                    <div>
                                        <CardTitle className="mb-3 flex items-center gap-2 text-base">
                                            <CreditCard className="h-5 w-5 text-blue-500" />
                                            {t('Staff Members')}
                                        </CardTitle>
                                        <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-2">
                                            {filtered.map((member) => (
                                                <Card key={member.id} className="overflow-hidden">
                                                    <div className="h-1.5" style={{ backgroundColor: accent }} />
                                                    <CardContent className="p-4">
                                                        <div className="flex items-center gap-3">
                                                            <div className="flex h-12 w-12 items-center justify-center rounded-xl text-lg font-bold" style={{ backgroundColor: `${accent}26`, color: accent }}>
                                                                {member.name.charAt(0).toUpperCase()}
                                                            </div>
                                                            <div className="min-w-0">
                                                                <div className="truncate font-semibold text-gray-900 dark:text-white">
                                                                    {member.name}
                                                                </div>
                                                                <div className="text-xs text-gray-500 dark:text-gray-400">
                                                                    {member.designation || roleLabel(member.role)}
                                                                </div>
                                                                <div className="text-xs text-gray-400">
                                                                    {member.employee_id || `UID-${member.id}`}
                                                                </div>
                                                            </div>
                                                        </div>
                                                        <Button
                                                            className="mt-4 w-full"
                                                            size="sm"
                                                            onClick={() => printCard(member)}
                                                        >
                                                            <Printer className="mr-2 h-4 w-4" />
                                                            {t('Print ID Card')}
                                                        </Button>
                                                    </CardContent>
                                                </Card>
                                            ))}
                                        </div>
                                    </div>
                                </div>
                            )}
                        </CardContent>
                    </Card>
                </div>
            </div>
        </DashboardLayout>
    );
}
