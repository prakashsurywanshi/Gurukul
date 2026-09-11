import { useLanguage } from '../../i18n/LanguageProvider';
import { useState } from 'react';
import { Cake, Gift, PartyPopper, Plus, Trash2 } from 'lucide-react';
import { router } from '@inertiajs/react';
import DashboardLayout from '../DashboardLayout';
import { Card, CardContent, CardHeader, CardTitle } from '../ui/card';
import { Button } from '../ui/button';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '../ui/table';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '../ui/select';
import { Badge } from '../ui/badge';
import { Label } from '../ui/label';
import { Input } from '../ui/input';
import { Textarea } from '../ui/textarea';
import { toast } from 'sonner';

type BirthdayRow = {
    source: string;
    id: string;
    entryId?: number;
    person_name: string;
    person_type: string;
    birth_date: string;
    month: number;
    day: number;
    notes: string | null;
};
type GreetingRow = {
    id: number;
    title: string;
    message: string;
    festivalDate: string | null;
    status: string;
    sentCount: number;
};

export type EngagementProps = {
    user: any;
    birthdaysThisMonth: number;
    birthdaysToday: BirthdayRow[];
    upcomingBirthdays: BirthdayRow[];
    greetings: GreetingRow[];
};

export default function Engagement({
    user,
    birthdaysThisMonth,
    birthdaysToday,
    upcomingBirthdays,
    greetings,
}: EngagementProps) {
    const { t } = useLanguage();

    const [bName, setBName] = useState('');
    const [bDate, setBDate] = useState('');
    const [bType, setBType] = useState('staff');
    const [bSaving, setBSaving] = useState(false);

    const [gTitle, setGTitle] = useState('');
    const [gMessage, setGMessage] = useState('');
    const [gDate, setGDate] = useState('');
    const [gSaving, setGSaving] = useState(false);

    const submitBirthday = () => {
        if (!bName.trim() || !bDate) {
            toast.error(t('Name and birthday are required.'));
            return;
        }
        setBSaving(true);
        router.post(
            '/engagement/birthdays',
            { person_name: bName.trim(), birth_date: bDate, person_type: bType },
            {
                preserveScroll: true,
                onSuccess: () => {
                    setBName('');
                    setBDate('');
                    setBType('staff');
                    toast.success(t('Birthday added.'));
                },
                onFinish: () => setBSaving(false),
            },
        );
    };

    const removeBirthday = (row: BirthdayRow) => {
        if (row.source !== 'manual' || !row.entryId) return;
        if (!window.confirm(t('Remove this birthday?'))) return;
        router.delete(`/engagement/birthdays/${row.entryId}`, {
            preserveScroll: true,
            onSuccess: () => toast.success(t('Birthday removed.')),
        });
    };

    const submitGreeting = () => {
        if (!gTitle.trim() || !gMessage.trim()) {
            toast.error(t('Title and message are required.'));
            return;
        }
        setGSaving(true);
        router.post(
            '/engagement/greetings',
            { title: gTitle.trim(), message: gMessage.trim(), festival_date: gDate || null, status: 'pending' },
            {
                preserveScroll: true,
                onSuccess: () => {
                    setGTitle('');
                    setGMessage('');
                    setGDate('');
                    toast.success(t('Festival greeting added.'));
                },
                onFinish: () => setGSaving(false),
            },
        );
    };

    const removeGreeting = (row: GreetingRow) => {
        if (!window.confirm(t('Delete this greeting?'))) return;
        router.delete(`/engagement/greetings/${row.id}`, {
            preserveScroll: true,
            onSuccess: () => toast.success(t('Greeting removed.')),
        });
    };

    return (
        <DashboardLayout user={user} pageTitle={t('Engagement')}>
            <div className="space-y-6">
                <div className="grid gap-3 sm:grid-cols-3">
                    <Card>
                        <CardContent className="flex items-center justify-between pt-6">
                            <div>
                                <p className="text-sm text-muted-foreground">{t('Birthdays This Month')}</p>
                                <p className="text-2xl font-bold">{birthdaysThisMonth}</p>
                            </div>
                            <Cake className="h-5 w-5" />
                        </CardContent>
                    </Card>
                    <Card>
                        <CardContent className="flex items-center justify-between pt-6">
                            <div>
                                <p className="text-sm text-muted-foreground">{t('Birthdays Today')}</p>
                                <p className="text-2xl font-bold">{birthdaysToday.length}</p>
                            </div>
                            <PartyPopper className="h-5 w-5" />
                        </CardContent>
                    </Card>
                    <Card>
                        <CardContent className="flex items-center justify-between pt-6">
                            <div>
                                <p className="text-sm text-muted-foreground">{t('Festival Greetings')}</p>
                                <p className="text-2xl font-bold">{greetings.length}</p>
                            </div>
                            <Gift className="h-5 w-5" />
                        </CardContent>
                    </Card>
                </div>

                {birthdaysToday.length > 0 && (
                    <Card className="border-primary/40">
                        <CardHeader>
                            <CardTitle className="flex items-center gap-2">
                                <Cake className="h-5 w-5" /> {t('Happy Birthday Today')}
                            </CardTitle>
                        </CardHeader>
                        <CardContent className="flex flex-wrap gap-2">
                            {birthdaysToday.map((row) => (
                                <Badge key={row.id} className="px-3 py-1">
                                    {row.person_name}
                                </Badge>
                            ))}
                        </CardContent>
                    </Card>
                )}

                <div className="grid gap-6 lg:grid-cols-2">
                    <Card>
                        <CardHeader>
                            <CardTitle>{t('Add Birthday')}</CardTitle>
                        </CardHeader>
                        <CardContent className="space-y-3">
                            <div className="space-y-1">
                                <Label>{t('Name')}</Label>
                                <Input value={bName} onChange={(e) => setBName(e.target.value)} />
                            </div>
                            <div className="grid grid-cols-2 gap-2">
                                <div className="space-y-1">
                                    <Label>{t('Birth Date')}</Label>
                                    <Input type="date" value={bDate} onChange={(e) => setBDate(e.target.value)} />
                                </div>
                                <div className="space-y-1">
                                    <Label>{t('Type')}</Label>
                                    <Select value={bType} onValueChange={setBType}>
                                        <SelectTrigger>
                                            <SelectValue />
                                        </SelectTrigger>
                                        <SelectContent>
                                            <SelectItem value="staff">{t('Staff')}</SelectItem>
                                            <SelectItem value="student">{t('Student')}</SelectItem>
                                            <SelectItem value="other">{t('Other')}</SelectItem>
                                        </SelectContent>
                                    </Select>
                                </div>
                            </div>
                            <Button onClick={submitBirthday} disabled={bSaving}>
                                <Plus className="mr-2 h-4 w-4" />
                                {bSaving ? t('Saving...') : t('Add Birthday')}
                            </Button>
                        </CardContent>
                    </Card>

                    <Card>
                        <CardHeader>
                            <CardTitle>{t('Add Festival Greeting')}</CardTitle>
                        </CardHeader>
                        <CardContent className="space-y-3">
                            <div className="space-y-1">
                                <Label>{t('Title')}</Label>
                                <Input
                                    value={gTitle}
                                    onChange={(e) => setGTitle(e.target.value)}
                                    placeholder={t('e.g. Diwali Greetings')}
                                />
                            </div>
                            <div className="space-y-1">
                                <Label>{t('Message')}</Label>
                                <Textarea value={gMessage} onChange={(e) => setGMessage(e.target.value)} rows={3} />
                            </div>
                            <div className="space-y-1">
                                <Label>{t('Festival Date')}</Label>
                                <Input type="date" value={gDate} onChange={(e) => setGDate(e.target.value)} />
                            </div>
                            <Button onClick={submitGreeting} disabled={gSaving}>
                                <Gift className="mr-2 h-4 w-4" />
                                {gSaving ? t('Saving...') : t('Add Greeting')}
                            </Button>
                        </CardContent>
                    </Card>
                </div>

                <Card>
                    <CardHeader>
                        <CardTitle>{t('Upcoming Birthdays')}</CardTitle>
                    </CardHeader>
                    <CardContent className="pt-0">
                        {upcomingBirthdays.length === 0 && (
                            <p className="py-8 text-center text-muted-foreground">
                                {t('No birthdays coming up this month.')}
                            </p>
                        )}
                        <Table>
                            <TableHeader>
                                <TableRow>
                                    <TableHead>{t('Name')}</TableHead>
                                    <TableHead>{t('Date')}</TableHead>
                                    <TableHead>{t('Type')}</TableHead>
                                    <TableHead>{t('Source')}</TableHead>
                                    <TableHead className="w-10" />
                                </TableRow>
                            </TableHeader>
                            <TableBody>
                                {upcomingBirthdays.map((row) => (
                                    <TableRow key={row.id}>
                                        <TableCell className="font-medium">{row.person_name}</TableCell>
                                        <TableCell>{row.birth_date}</TableCell>
                                        <TableCell>
                                            <Badge variant="secondary">{t(row.person_type)}</Badge>
                                        </TableCell>
                                        <TableCell>{row.source === 'auto' ? t('Auto') : t('Manual')}</TableCell>
                                        <TableCell>
                                            {row.source === 'manual' && (
                                                <Button size="icon" variant="ghost" onClick={() => removeBirthday(row)}>
                                                    <Trash2 className="h-4 w-4" />
                                                </Button>
                                            )}
                                        </TableCell>
                                    </TableRow>
                                ))}
                            </TableBody>
                        </Table>
                    </CardContent>
                </Card>

                <Card>
                    <CardHeader>
                        <CardTitle>{t('Festival Greetings')}</CardTitle>
                    </CardHeader>
                    <CardContent className="pt-0">
                        {greetings.length === 0 && (
                            <p className="py-8 text-center text-muted-foreground">{t('No festival greetings yet.')}</p>
                        )}
                        <Table>
                            <TableHeader>
                                <TableRow>
                                    <TableHead>{t('Title')}</TableHead>
                                    <TableHead>{t('Message')}</TableHead>
                                    <TableHead>{t('Date')}</TableHead>
                                    <TableHead>{t('Status')}</TableHead>
                                    <TableHead className="text-right">{t('Sent')}</TableHead>
                                    <TableHead className="w-10" />
                                </TableRow>
                            </TableHeader>
                            <TableBody>
                                {greetings.map((row) => (
                                    <TableRow key={row.id}>
                                        <TableCell className="font-medium">{row.title}</TableCell>
                                        <TableCell className="max-w-md truncate">{row.message}</TableCell>
                                        <TableCell>{row.festivalDate ?? '—'}</TableCell>
                                        <TableCell>
                                            <Badge variant={row.status === 'sent' ? 'default' : 'secondary'}>
                                                {t(row.status)}
                                            </Badge>
                                        </TableCell>
                                        <TableCell className="text-right">{row.sentCount}</TableCell>
                                        <TableCell>
                                            <Button size="icon" variant="ghost" onClick={() => removeGreeting(row)}>
                                                <Trash2 className="h-4 w-4" />
                                            </Button>
                                        </TableCell>
                                    </TableRow>
                                ))}
                            </TableBody>
                        </Table>
                    </CardContent>
                </Card>
            </div>
        </DashboardLayout>
    );
}
