<?php

namespace App\Http\Controllers;

use App\Models\AccountHead;
use App\Models\AccountTransaction;
use App\Models\AdmissionInquiry;
use App\Models\Assessment;
use App\Models\Asset;
use App\Models\AssetMaintenanceLog;
use App\Models\Attendance;
use App\Models\BankAccount;
use App\Models\CampusWorker;
use App\Models\CbcAssessment;
use App\Models\CbcCompetency;
use App\Models\CbcLearningOutcome;
use App\Models\CbcPathway;
use App\Models\CbcStrand;
use App\Models\ComplaintEntry;
use App\Models\DailyTrip;
use App\Models\Exam;
use App\Models\ExamResult;
use App\Models\ExamSchedule;
use App\Models\ExamType;
use App\Models\ExpenseEntry;
use App\Models\FeeDiscount;
use App\Models\FeePayment;
use App\Models\FeeType;
use App\Models\GatePass;
use App\Models\Hostel;
use App\Models\HostelAllocation;
use App\Models\HostelBed;
use App\Models\HostelRoom;
use App\Models\IncomeEntry;
use App\Models\Incident;
use App\Models\InventoryCategory;
use App\Models\InventoryItem;
use App\Models\InventoryStockEntry;
use App\Models\Lead;
use App\Models\LessonPlan;
use App\Models\LibraryBook;
use App\Models\LibraryCirculation;
use App\Models\LibraryMember;
use App\Models\OnlineExam;
use App\Models\OnlineExamAttempt;
use App\Models\Organization;
use App\Models\OsmEvaluation;
use App\Models\OsmSession;
use App\Models\PostalDeliveryEntry;
use App\Models\PostalDispatchEntry;
use App\Models\PtmAppointment;
use App\Models\PtmSession;
use App\Models\Question;
use App\Models\SchoolClass;
use App\Models\Student;
use App\Models\StudentFee;
use App\Models\StudentHouse;
use App\Models\Subject;
use App\Models\Survey;
use App\Models\SurveyResponse;
use App\Models\TimeSlot;
use App\Models\Timetable;
use App\Models\TransportAssignment;
use App\Models\TransportRoute;
use App\Models\TransportVehicle;
use App\Models\User;
use App\Models\VisitorRegisterEntry;
use Illuminate\Http\Request;
use Illuminate\Support\Carbon;
use Illuminate\Support\Collection;
use Illuminate\Support\Facades\Auth;
use Inertia\Inertia;

class DomainDashboardController extends Controller
{
    public function index(Request $request, string $domain)
    {
        if (! in_array($domain, $this->domains(), true)) {
            abort(404);
        }

        $user = Auth::user();
        $organization = $this->resolveOrganizationForUser($user);
        $config = $this->configFor($domain);

        if ($organization) {
            $data = $this->resolve($domain, $request, $organization);
        } else {
            $data = ['metrics' => [], 'sections' => [], 'charts' => []];
        }

        return Inertia::render('dashboard/DomainDashboard', [
            'user' => $user,
            'schoolName' => $organization?->name ?? 'Gurukul School',
            'domain' => $domain,
            'title' => $config['title'],
            'description' => $config['description'],
            'actions' => $config['actions'],
            'metrics' => $data['metrics'],
            'sections' => $data['sections'],
            'charts' => $data['charts'] ?? [],
        ]);
    }

    private function domains(): array
    {
        return array_keys($this->config());
    }

    private function config(): array
    {
        return [
            'fees' => ['title' => 'Fees Dashboard', 'description' => 'Overview of fee collection, dues and discounts for the current session.', 'actions' => [['label' => 'Assign Fees', 'href' => '/assign-fees'], ['label' => 'Collect Fees', 'href' => '/fees/challans']]],
            'accounts' => ['title' => 'Accounts Dashboard', 'description' => 'Income, expenses and bank position at a glance.', 'actions' => []],
            'students' => ['title' => 'Student Dashboard', 'description' => 'Student strength, attendance and class distribution for this session.', 'actions' => [['label' => 'Student Admission', 'href' => '/student-admission'], ['label' => 'Search Students', 'href' => '/search_students']]],
            'academics' => ['title' => 'Academic Dashboard', 'description' => 'Classes, sections, subjects and timetable overview.', 'actions' => []],
            'front-office' => ['title' => 'Front Office Dashboard', 'description' => 'Enquiries, visitors, complaints, postals and gate passes.', 'actions' => []],
            'leads' => ['title' => 'Lead Dashboard', 'description' => 'Admission leads by source, priority and stage.', 'actions' => []],
            'exams' => ['title' => 'Exam Dashboard', 'description' => 'Offline examinations, schedules and results overview.', 'actions' => []],
            'cbc' => ['title' => 'CBC Dashboard', 'description' => 'Competency Based Curriculum strands, competencies and assessments.', 'actions' => []],
            'online-exam' => ['title' => 'Online Exam Dashboard', 'description' => 'Online examinations, question bank and attempt analytics.', 'actions' => []],
            'ptm' => ['title' => 'PTM Dashboard', 'description' => 'Parent-Teacher Meeting sessions and appointments.', 'actions' => []],
            'lesson-plans' => ['title' => 'Lesson Planner Dashboard', 'description' => 'Lesson planning status and coverage.', 'actions' => []],
            'osm' => ['title' => 'OSM Dashboard', 'description' => 'Out of School Monitoring sessions and evaluations.', 'actions' => []],
            'assessment' => ['title' => 'Assessment Dashboard', 'description' => 'Scholastic and cocurricular assessment overview.', 'actions' => []],
            'survey' => ['title' => 'Survey Dashboard', 'description' => 'Feedback surveys and response analytics.', 'actions' => []],
            'library' => ['title' => 'Library Dashboard', 'description' => 'Books, members, issues and overdues overview.', 'actions' => []],
            'inventory' => ['title' => 'Inventory Dashboard', 'description' => 'Stock position, categories and low stock alerts.', 'actions' => []],
            'transport' => ['title' => 'Transport Dashboard', 'description' => 'Routes, vehicles, drivers and daily trips overview.', 'actions' => []],
            'hostel' => ['title' => 'Hostel Dashboard', 'description' => 'Hostels, rooms, beds and allocations overview.', 'actions' => []],
            'assets' => ['title' => 'Asset Dashboard', 'description' => 'Fixed assets, valuation and maintenance overview.', 'actions' => []],
        ];
    }

    private function configFor(string $domain): array
    {
        return $this->config()[$domain];
    }

    private function resolve(string $domain, Request $request, Organization $organization): array
    {
        return match ($domain) {
            'fees' => $this->fees($organization),
            'accounts' => $this->accounts($organization),
            'students' => $this->students($request, $organization),
            'academics' => $this->academics($organization),
            'front-office' => $this->frontOffice($request, $organization),
            'leads' => $this->leads($organization),
            'exams' => $this->exams($organization),
            'cbc' => $this->cbc($organization),
            'online-exam' => $this->onlineExams($organization),
            'ptm' => $this->ptm($organization),
            'lesson-plans' => $this->lessonPlans($organization),
            'osm' => $this->osm($organization),
            'assessment' => $this->assessment($organization),
            'survey' => $this->survey($organization),
            'library' => $this->library($organization),
            'inventory' => $this->inventory($organization),
            'transport' => $this->transport($request, $organization),
            'hostel' => $this->hostel($organization),
            'assets' => $this->assets($organization),
        };
    }

    private function fees(Organization $organization): array
    {
        $orgId = $organization->id;
        $today = Carbon::today();
        $monthStart = $today->copy()->startOfMonth();
        $collectedTotal = (float) FeePayment::query()
            ->where('organization_id', $orgId)
            ->where('status', 'success')
            ->sum('amount');
        $collectedToday = (float) FeePayment::query()
            ->where('organization_id', $orgId)
            ->where('status', 'success')
            ->whereDate('payment_date', $today)
            ->sum('amount');
        $collectedMonth = (float) FeePayment::query()
            ->where('organization_id', $orgId)
            ->where('status', 'success')
            ->whereDate('payment_date', '>=', $monthStart)
            ->sum('amount');
        $pendingDues = (float) StudentFee::query()
            ->where('organization_id', $orgId)
            ->whereIn('status', ['pending', 'partial', 'overdue'])
            ->sum('balance');
        $onlineCount = FeePayment::query()
            ->where('organization_id', $orgId)
            ->where('status', 'success')
            ->whereIn('payment_method', ['online', 'upi', 'card'])
            ->count();

        $metrics = [
            $this->metric('Total Collected', round($collectedTotal), '', 'indian-rupee', 'emerald'),
            $this->metric('Collected Today', round($collectedToday), '', 'receipt', 'green'),
            $this->metric('Collected (Month)', round($collectedMonth), '', 'calendar', 'teal'),
            $this->metric('Pending Dues', round($pendingDues), '', 'alert-circle', 'amber'),
            $this->metric('Fee Types', FeeType::query()->where('organization_id', $orgId)->count(), '', 'layers', 'blue'),
            $this->metric('Discount Schemes', FeeDiscount::query()->where('organization_id', $orgId)->count(), '', 'badge-percent', 'violet'),
            $this->metric('Transactions Today', FeePayment::query()->where('organization_id', $orgId)->whereDate('payment_date', $today)->count(), '', 'activity', 'sky'),
            $this->metric('Online Transactions', $onlineCount, '', 'globe', 'indigo'),
        ];

        $recent = FeePayment::query()
            ->with('student:id,first_name,last_name')
            ->where('organization_id', $orgId)
            ->orderByDesc('id')
            ->limit(8)
            ->get();

        $sections = [
            [
                'title' => 'Recent Transactions',
                'columns' => ['Student', 'Amount', 'Method', 'Date'],
                'rows' => $recent->map(fn ($p) => [
                    $p->student ? trim($p->student->first_name.' '.$p->student->last_name) : '—',
                    '₹ '.number_format((float) $p->amount, 2),
                    ucwords(str_replace('_', ' ', $p->payment_method ?? '')),
                    optional($p->payment_date)->format('d M Y'),
                ])->toArray(),
            ],
        ];

        $trend = collect(range(5, 0))->map(function (int $i) use ($orgId, $today) {
            $start = $today->copy()->startOfMonth()->subMonths($i);
            $end = $today->copy()->endOfMonth()->subMonths($i);
            $total = FeePayment::query()
                ->where('organization_id', $orgId)
                ->where('status', 'success')
                ->whereBetween('payment_date', [$start, $end])
                ->sum('amount');

            return ['label' => $start->format('M'), 'value' => round((float) $total)];
        })->values();

        $methodSplit = FeePayment::query()
            ->selectRaw('payment_method, SUM(amount) as total')
            ->where('organization_id', $orgId)
            ->where('status', 'success')
            ->groupBy('payment_method')
            ->orderByDesc('total')
            ->limit(6)
            ->get()
            ->map(fn ($row) => [
                'label' => ucfirst(str_replace('_', ' ', $row->payment_method)),
                'value' => round((float) $row->total),
            ])
            ->values();

        $charts = [
            $this->chart('Fee Collection Trend', 'area', $trend->toArray(), ['Collected']),
            $this->chart('Collected vs Pending', 'bar', [
                ['label' => 'Collected', 'value' => round($collectedTotal)],
                ['label' => 'Pending', 'value' => round($pendingDues)],
            ], ['Amount']),
        ];
        if ($methodSplit->isNotEmpty()) {
            $charts[] = $this->chart('Payment Methods', 'pie', $methodSplit->toArray());
        }

        return compact('metrics', 'sections', 'charts');
    }

    private function accounts(Organization $organization): array
    {
        $orgId = $organization->id;
        $today = Carbon::today();
        $monthStart = $today->copy()->startOfMonth();
        $income = (float) IncomeEntry::query()->where('organization_id', $orgId)->sum('amount');
        $expense = (float) ExpenseEntry::query()->where('organization_id', $orgId)->sum('amount');
        $incomeMonth = (float) IncomeEntry::query()->where('organization_id', $orgId)->whereDate('date', '>=', $monthStart)->sum('amount');
        $expenseMonth = (float) ExpenseEntry::query()->where('organization_id', $orgId)->whereDate('date', '>=', $monthStart)->sum('amount');
        $incomeHeads = AccountHead::query()->where('organization_id', $orgId)->where('type', 'income')->count();
        $expenseHeads = AccountHead::query()->where('organization_id', $orgId)->where('type', 'expense')->count();

        $metrics = [
            $this->metric('Total Income', round($income), '', 'trending-up', 'emerald'),
            $this->metric('Total Expense', round($expense), '', 'trending-down', 'rose'),
            $this->metric('Net Balance', round($income - $expense), '', 'wallet', 'blue'),
            $this->metric('Income (Month)', round($incomeMonth), '', 'calendar', 'teal'),
            $this->metric('Expense (Month)', round($expenseMonth), '', 'calendar', 'amber'),
            $this->metric('Income Heads', $incomeHeads, '', 'tags', 'sky'),
            $this->metric('Expense Heads', $expenseHeads, '', 'tag', 'violet'),
            $this->metric('Bank Accounts', BankAccount::query()->where('organization_id', $orgId)->count(), '', 'landmark', 'indigo'),
        ];

        $recent = AccountTransaction::query()
            ->where('organization_id', $orgId)
            ->orderByDesc('id')
            ->limit(8)
            ->get();

        $sections = [
            [
                'title' => 'Recent Transactions',
                'columns' => ['Description', 'Type', 'Amount', 'Date'],
                'rows' => $recent->map(fn ($t) => [
                    $t->description ?? '—',
                    ucfirst($t->type ?? '—'),
                    '₹ '.number_format((float) $t->amount, 2),
                    optional($t->transaction_date)->format('d M Y'),
                ])->toArray(),
            ],
        ];

        $trend = collect(range(5, 0))->map(function (int $i) use ($orgId, $today) {
            $start = $today->copy()->startOfMonth()->subMonths($i);
            $end = $today->copy()->endOfMonth()->subMonths($i);
            $inc = IncomeEntry::query()
                ->where('organization_id', $orgId)
                ->whereBetween('date', [$start, $end])
                ->sum('amount');
            $exp = ExpenseEntry::query()
                ->where('organization_id', $orgId)
                ->whereBetween('date', [$start, $end])
                ->sum('amount');

            return [
                'label' => $start->format('M'),
                'value' => round((float) $inc),
                'value2' => round((float) $exp),
            ];
        })->values();

        $topIncome = IncomeEntry::query()
            ->selectRaw('category, SUM(amount) as total')
            ->where('organization_id', $orgId)
            ->groupBy('category')
            ->orderByDesc('total')
            ->limit(6)
            ->get()
            ->map(fn ($row) => ['label' => $row->category, 'value' => round((float) $row->total)])
            ->values();

        $charts = [
            $this->chart('Income vs Expenses', 'bar', $trend->toArray(), ['Income', 'Expense']),
        ];
        if ($topIncome->isNotEmpty()) {
            $charts[] = $this->chart('Top Income Categories', 'pie', $topIncome->toArray());
        }

        return compact('metrics', 'sections', 'charts');
    }

    private function students(Request $request, Organization $organization): array
    {
        $orgId = $organization->id;
        $students = Student::query()->where('organization_id', $orgId);
        $active = (clone $students)->where('status', 'active')->count();
        $total = (clone $students)->count();
        $boys = (clone $students)->where('gender', 'male')->count();
        $girls = (clone $students)->where('gender', 'female')->count();
        $other = (clone $students)->whereNotIn('gender', ['male', 'female'])->count();
        $presentToday = Attendance::query()
            ->where('organization_id', $orgId)
            ->whereDate('date', Carbon::today())
            ->whereIn('status', ['present', 'late'])
            ->count();
        $absentToday = Attendance::query()
            ->where('organization_id', $orgId)
            ->whereDate('date', Carbon::today())
            ->where('status', 'absent')
            ->count();
        $markedToday = Attendance::query()
            ->where('organization_id', $orgId)
            ->whereDate('date', Carbon::today())
            ->count();
        $disabled = (clone $students)->where('status', 'inactive')->count();
        $newAdmissions = (clone $students)
            ->where('admission_date', '>=', Carbon::today()->startOfMonth())
            ->count();
        $activeClasses = SchoolClass::query()
            ->where('organization_id', $orgId)
            ->where('status', 'active')
            ->count();
        $behaviorCount = Incident::query()
            ->where('organization_id', $orgId)
            ->where('type', 'behavior')
            ->count();
        $behaviorOpen = Incident::query()
            ->where('organization_id', $orgId)
            ->where('type', 'behavior')
            ->whereIn('status', ['open', 'reviewed'])
            ->count();

        $classDistribution = $this->classStrength($orgId);

        $metrics = [
            $this->metric('Students (This Session)', $total, '', 'users', 'blue', $activeClasses.' classes active'),
            $this->metric('New Admissions', $newAdmissions, '', 'user-plus', 'emerald', 'This month'),
            $this->metric('Present Today', $presentToday, '', 'calendar-check', 'teal', $absentToday.' absent · '.$markedToday.' marked'),
            $this->metric('Behavior Records', $behaviorCount, '', 'shield-check', 'amber', $behaviorOpen.' open'),
            $this->metric('Boys', $boys, '', 'user', 'sky'),
            $this->metric('Girls', $girls, '', 'user', 'rose'),
            $this->metric('Attendance Marked Today', $markedToday, '', 'clipboard-check', 'indigo'),
            $this->metric('Classes', $activeClasses, '', 'school', 'violet'),
            $this->metric('Student Houses', StudentHouse::query()->where('organization_id', $orgId)->count(), '', 'star', 'green'),
            $this->metric('Disabled Students', $disabled, '', 'user-x', 'amber'),
        ];

        $genderChart = [
            ['label' => 'Boys', 'value' => $boys],
            ['label' => 'Girls', 'value' => $girls],
        ];
        if ($other > 0) {
            $genderChart[] = ['label' => 'Other', 'value' => $other];
        }

        $classChart = $classDistribution
            ->map(fn ($c) => [
                'label' => $c->name.($c->section ? ' - '.$c->section : ''),
                'value' => (int) $c->student_count,
            ])
            ->values();

        $recentAdmissions = Student::query()
            ->where('organization_id', $orgId)
            ->whereNotNull('admission_date')
            ->orderByDesc('id')
            ->limit(8)
            ->get();

        $charts = [
            $this->chart('Students by Class', 'bar', $classChart->toArray(), ['Students']),
            $this->chart('Gender Distribution', 'pie', $genderChart),
            $this->chart('Recent Activity', 'list', $recentAdmissions->map(function ($s) {
                $admissionNo = $s->admission_no ?: '—';

                return [
                    'label' => trim($s->first_name.' '.$s->last_name),
                    'sub' => 'New admission · '.$admissionNo,
                    'right' => $s->created_at->diffForHumans(),
                ];
            })->toArray()),
        ];

        $birthdays = $this->upcomingBirthdays($orgId, 30, 8);
        if ($birthdays->isNotEmpty()) {
            $charts[] = $this->chart('Upcoming Birthdays (30 days)', 'list', $birthdays->toArray());
        }

        $sections = [
            [
                'title' => 'Students by Class',
                'columns' => ['Class', 'Active Students'],
                'rows' => $classDistribution->map(fn ($c) => [
                    $c->name.($c->section ? ' - '.$c->section : ''),
                    $c->student_count,
                ])->toArray(),
            ],
        ];

        return compact('metrics', 'sections', 'charts');
    }

    private function upcomingBirthdays(int $orgId, int $withinDays, int $limit): Collection
    {
        $today = Carbon::today();
        $students = Student::query()
            ->with('schoolClass:id,name,section')
            ->where('organization_id', $orgId)
            ->where('status', 'active')
            ->whereNotNull('date_of_birth')
            ->get(['id', 'first_name', 'last_name', 'date_of_birth', 'class_id']);

        $rows = $students
            ->map(function (Student $s) use ($today) {
                $dob = Carbon::parse($s->date_of_birth);
                $nextBirthday = Carbon::create($today->year, $dob->month, $dob->day);
                if ($nextBirthday->lt($today)) {
                    $nextBirthday->addYear();
                }

                $days = $today->diffInDays($nextBirthday, false);

                return [
                    'days' => $days,
                    'label' => trim($s->first_name.' '.$s->last_name),
                    'sub' => 'Class '.optional($s->schoolClass)->name,
                    'right' => $nextBirthday->format('d M'),
                ];
            })
            ->filter(fn ($row) => $row['days'] >= 0 && $row['days'] < $withinDays)
            ->sortBy('days')
            ->take($limit)
            ->map(fn ($row) => array_filter([
                'label' => $row['label'],
                'sub' => $row['sub'],
                'right' => $row['right'],
            ]));

        return $rows->values();
    }

    private function classStrength(int $orgId): \Illuminate\Support\Collection
    {
        return SchoolClass::query()
            ->where('organization_id', $orgId)
            ->where('status', 'active')
            ->orderBy('name')
            ->limit(10)
            ->get()
            ->map(function (SchoolClass $class) use ($orgId) {
                $class->student_count = $this->studentCountForClass($orgId, $class->id);

                return $class;
            });
    }

    private function studentCountForClass(int $orgId, int $classId): int
    {
        return Student::query()
            ->where('organization_id', $orgId)
            ->where('class_id', $classId)
            ->where('status', 'active')
            ->count();
    }

    private function academics(Organization $organization): array
    {
        $orgId = $organization->id;
        $activeClasses = SchoolClass::query()->where('organization_id', $orgId)->where('status', 'active');
        $classCount = (clone $activeClasses)->distinct()->count('name');
        $sectionCount = (clone $activeClasses)->count();

        $metrics = [
            $this->metric('Classes', $classCount, '', 'school', 'blue'),
            $this->metric('Sections', $sectionCount, '', 'layout-grid', 'sky'),
            $this->metric('Subjects', Subject::query()->where('organization_id', $orgId)->count(), '', 'book-open', 'violet'),
            $this->metric('Manage Periods', TimeSlot::query()->where('organization_id', $orgId)->count(), '', 'clock', 'teal'),
            $this->metric('Timetable Entries', Timetable::query()->where('organization_id', $orgId)->count(), '', 'calendar-range', 'indigo'),
            $this->metric('Enrolled Students', Student::query()->where('organization_id', $orgId)->where('status', 'active')->count(), '', 'users', 'emerald'),
        ];

        $teachers = User::query()
            ->where('organization_id', $orgId)
            ->whereIn('role', ['admin', 'teacher'])
            ->count();

        $metrics[] = $this->metric('Staff & Teachers', $teachers, '', 'graduation-cap', 'amber');

        $recent = SchoolClass::query()
            ->where('organization_id', $orgId)
            ->where('status', 'active')
            ->orderBy('name')
            ->limit(10)
            ->get()
            ->map(fn ($c) => [$c->name, $c->section ?: '—', $this->studentCountForClass($orgId, $c->id)]);

        $sections = [
            [
                'title' => 'Class Strength',
                'columns' => ['Class', 'Section', 'Students'],
                'rows' => $recent->toArray(),
            ],
        ];

        $charts = [
            $this->chart('Class Strength', 'bar', $recent->map(fn ($row) => [
                'label' => $row[0].($row[1] !== '—' ? ' - '.$row[1] : ''),
                'value' => (int) $row[2],
            ])->values()->toArray(), ['Students']),
        ];

        return compact('metrics', 'sections', 'charts');
    }

    private function frontOffice(Request $request, Organization $organization): array
    {
        $orgId = $organization->id;
        $today = Carbon::today();
        $openComplaints = ComplaintEntry::query()->where('organization_id', $orgId)->where('status', 'open')->count();
        $visitorsToday = VisitorRegisterEntry::query()->where('organization_id', $orgId)->whereDate('entry_date', $today)->count();
        $gatePassesToday = GatePass::query()->where('organization_id', $orgId)->whereDate('created_at', $today)->count();
        $postalIn = PostalDeliveryEntry::query()->where('organization_id', $orgId)->count();
        $postalOut = PostalDispatchEntry::query()->where('organization_id', $orgId)->count();

        $metrics = [
            $this->metric('Admission Enquiries', AdmissionInquiry::query()->where('organization_id', $orgId)->count(), '', 'inbox', 'blue'),
            $this->metric('Enquiries (Month)', AdmissionInquiry::query()->where('organization_id', $orgId)->where('created_at', '>=', $today->copy()->startOfMonth())->count(), '', 'inbox', 'sky'),
            $this->metric('Open Complaints', $openComplaints, '', 'triangle-alert', 'rose'),
            $this->metric('Visitors Today', $visitorsToday, '', 'door-open', 'emerald'),
            $this->metric('Gate Passes Today', $gatePassesToday, '', 'shield-check', 'teal'),
            $this->metric('Postal In', $postalIn, '', 'mailbox', 'violet'),
            $this->metric('Postal Out', $postalOut, '', 'send', 'indigo'),
            $this->metric('Campus Workers', CampusWorker::query()->where('organization_id', $orgId)->where('status', 'active')->count(), '', 'hard-hat', 'amber'),
        ];

        $recentEnquiries = AdmissionInquiry::query()
            ->where('organization_id', $orgId)
            ->orderByDesc('id')
            ->limit(8)
            ->get();

        $sections = [
            [
                'title' => 'Recent Enquiries',
                'columns' => ['Name', 'Mobile', 'Program', 'Date'],
                'rows' => $recentEnquiries->map(fn ($e) => [
                    $e->full_name ?? '—',
                    $e->phone ?? '—',
                    $e->program_interest ?? '—',
                    optional($e->created_at)->format('d M Y'),
                ])->toArray(),
            ],
        ];

        $charts = [
            $this->chart('Enquiries (Last 6 Months)', 'bar', collect(range(5, 0))->map(function (int $i) use ($orgId, $today) {
                $start = $today->copy()->startOfMonth()->subMonths($i);
                $end = $today->copy()->endOfMonth()->subMonths($i);
                $count = AdmissionInquiry::query()
                    ->where('organization_id', $orgId)
                    ->whereBetween('created_at', [$start, $end->copy()->endOfDay()])
                    ->count();

                return ['label' => $start->format('M'), 'value' => $count];
            })->values()->toArray(), ['Enquiries']),
        ];

        return compact('metrics', 'sections', 'charts');
    }

    private function leads(Organization $organization): array
    {
        $orgId = $organization->id;
        $today = Carbon::today();
        $highPriority = Lead::query()->where('organization_id', $orgId)->where('priority', 'high')->count();
        $followUpToday = Lead::query()->where('organization_id', $orgId)->whereDate('follow_up_date', $today)->count();

        $metrics = [
            $this->metric('Total Leads', Lead::query()->where('organization_id', $orgId)->count(), '', 'filter', 'blue'),
            $this->metric('New (Month)', Lead::query()->where('organization_id', $orgId)->where('created_at', '>=', $today->copy()->startOfMonth())->count(), '', 'user-plus', 'emerald'),
            $this->metric('High Priority', $highPriority, '', 'flame', 'rose'),
            $this->metric('Follow-ups Today', $followUpToday, '', 'calendar-check', 'amber'),
            $this->metric('Converted', Lead::query()->where('organization_id', $orgId)->where('status', 'converted')->count(), '', 'badge-check', 'teal'),
            $this->metric('Closed / Lost', Lead::query()->where('organization_id', $orgId)->where('status', 'lost')->count(), '', 'user-x', 'violet'),
        ];

        $bySource = Lead::query()
            ->selectRaw('COALESCE(source, "Other") as label, COUNT(*) as total')
            ->where('organization_id', $orgId)
            ->groupBy('label')
            ->orderByDesc('total')
            ->limit(8)
            ->get();

        $recent = Lead::query()->where('organization_id', $orgId)->orderByDesc('id')->limit(8)->get();

        $sections = [
            [
                'title' => 'Leads by Source',
                'columns' => ['Source', 'Leads'],
                'rows' => $bySource->map(fn ($s) => [$s->label, $s->total])->toArray(),
            ],
        ];
        if ($recent->isNotEmpty()) {
            $sections[] = [
                'title' => 'Recent Leads',
                'columns' => ['Student', 'Parent', 'Phone', 'Status'],
                'rows' => $recent->map(fn ($l) => [
                    $l->student_name ?? '—',
                    $l->parent_name ?? '—',
                    $l->phone ?? '—',
                    ucfirst($l->status ?? ''),
                ])->toArray(),
            ];
        }

        $charts = [
            $this->chart('Leads by Source', 'pie', $bySource->map(fn ($s) => [
                'label' => $s->label,
                'value' => (int) $s->total,
            ])->toArray()),
        ];

        return compact('metrics', 'sections', 'charts');
    }

    private function exams(Organization $organization): array
    {
        $orgId = $organization->id;
        $today = Carbon::today();
        $upcoming = Exam::query()->where('organization_id', $orgId)->where('status', 'scheduled')->whereDate('start_date', '>=', $today)->count();
        $ongoing = Exam::query()->where('organization_id', $orgId)->where('status', 'ongoing')->count();
        $overdue = Exam::query()->where('organization_id', $orgId)->where('status', 'completed')->count();

        $metrics = [
            $this->metric('Exams', Exam::query()->where('organization_id', $orgId)->count(), '', 'file-text', 'blue'),
            $this->metric('Exam Types', ExamType::query()->where('organization_id', $orgId)->count(), '', 'layers', 'violet'),
            $this->metric('Schedule Entries', ExamSchedule::query()->where('organization_id', $orgId)->count(), '', 'calendar-range', 'indigo'),
            $this->metric('Results Entered', ExamResult::query()->where('organization_id', $orgId)->count(), '', 'clipboard-check', 'emerald'),
            $this->metric('Upcoming', $upcoming, '', 'calendar-clock', 'teal'),
            $this->metric('Ongoing', $ongoing, '', 'activity', 'amber'),
            $this->metric('Completed', $overdue, '', 'badge-check', 'sky'),
        ];

        $recent = Exam::query()->where('organization_id', $orgId)->orderByDesc('start_date')->limit(8)->get();

        $byType = Exam::query()
            ->selectRaw('COALESCE(exam_type, "Other") as label, COUNT(*) as total')
            ->where('organization_id', $orgId)
            ->groupBy('label')
            ->orderByDesc('total')
            ->get();

        $charts = [
            $this->chart('Exams by Type', 'pie', $byType->map(fn ($e) => [
                'label' => ucfirst($e->label),
                'value' => (int) $e->total,
            ])->toArray()),
        ];

        $sections = [
            [
                'title' => 'Examinations',
                'columns' => ['Exam', 'Type', 'From', 'To', 'Status'],
                'rows' => $recent->map(fn ($e) => [
                    $e->name ?? '—',
                    ucfirst($e->exam_type ?? '—'),
                    optional($e->start_date)->format('d M y'),
                    optional($e->end_date)->format('d M y'),
                    ucfirst($e->status ?? ''),
                ])->toArray(),
            ],
        ];

        return compact('metrics', 'sections', 'charts');
    }

    private function cbc(Organization $organization): array
    {
        $orgId = $organization->id;

        $metrics = [
            $this->metric('Strands', CbcStrand::query()->where('organization_id', $orgId)->count(), '', 'rows', 'blue'),
            $this->metric('Competencies', CbcCompetency::query()->where('organization_id', $orgId)->count(), '', 'target', 'violet'),
            $this->metric('Learning Outcomes', CbcLearningOutcome::query()->where('organization_id', $orgId)->count(), '', 'book-open', 'teal'),
            $this->metric('Pathways & Tracks', CbcPathway::query()->where('organization_id', $orgId)->count(), '', 'git-branch', 'indigo'),
            $this->metric('Assessments', CbcAssessment::query()->where('organization_id', $orgId)->count(), '', 'clipboard-list', 'emerald'),
        ];

        $recent = CbcAssessment::query()
            ->with('student:id,first_name,last_name')
            ->where('organization_id', $orgId)
            ->orderByDesc('id')
            ->limit(8)
            ->get();

        $sections = [
            [
                'title' => 'Recent CBC Assessments',
                'columns' => ['Student', 'Level', 'Assessed On'],
                'rows' => $recent->map(fn ($a) => [
                    $a->student ? trim($a->student->first_name.' '.$a->student->last_name) : '—',
                    $a->level ?? '—',
                    optional($a->assessed_on)->format('d M Y'),
                ])->toArray(),
            ],
        ];

        return compact('metrics', 'sections');
    }

    private function onlineExams(Organization $organization): array
    {
        $orgId = $organization->id;
        $attempts = OnlineExamAttempt::query()->where('organization_id', $orgId)->whereIn('status', ['submitted', 'auto_submitted']);

        $metrics = [
            $this->metric('Online Exams', OnlineExam::query()->where('organization_id', $orgId)->count(), '', 'monitor', 'blue'),
            $this->metric('Question Bank', Question::query()->where('organization_id', $orgId)->count(), '', 'help-circle', 'violet'),
            $this->metric('Published', OnlineExam::query()->where('organization_id', $orgId)->where('status', 'published')->count(), '', 'send', 'emerald'),
            $this->metric('Attempts', (clone $attempts)->count(), '', 'file-check', 'indigo'),
            $this->metric('Avg. Score', round((clone $attempts)->avg('percentage') ?? 0, 1), '%', 'percent', 'teal'),
            $this->metric('High Scorers', (clone $attempts)->where('percentage', '>=', 90)->count(), '', 'trophy', 'amber'),
        ];

        $recent = (clone $attempts)
            ->with('student:id,first_name,last_name')
            ->orderByDesc('id')
            ->limit(8)
            ->get();

        $bands = [
            'Below 35' => [0, 34],
            '35 - 60' => [35, 60],
            '61 - 85' => [61, 85],
            '86 - 100' => [86, 100],
        ];
        $scoreBands = collect($bands)->map(function (array $range) use ($orgId) {
            $count = OnlineExamAttempt::query()
                ->where('organization_id', $orgId)
                ->whereIn('status', ['submitted', 'auto_submitted'])
                ->whereBetween('percentage', [$range[0], $range[1]])
                ->count();

            return ['label' => $range[0] === 86 ? $range[0].'+' : $range[0].' - '.$range[1], 'value' => $count];
        })->values();

        $charts = [
            $this->chart('Score Distribution', 'bar', $scoreBands->toArray(), ['Attempts']),
        ];

        $sections = [
            [
                'title' => 'Recent Attempts',
                'columns' => ['Student', 'Exam', 'Score', 'Percentage'],
                'rows' => $recent->map(fn ($a) => [
                    $a->student ? trim($a->student->first_name.' '.$a->student->last_name) : '—',
                    $a->exam_title ?? '—',
                    ($a->obtained_marks ?? '—').' / '.($a->total_marks ?? '—'),
                    ($a->percentage ?? '—').'%',
                ])->toArray(),
            ],
        ];

        return compact('metrics', 'sections', 'charts');
    }

    private function ptm(Organization $organization): array
    {
        $orgId = $organization->id;

        $metrics = [
            $this->metric('PTM Sessions', PtmSession::query()->where('organization_id', $orgId)->count(), '', 'handshake', 'blue'),
            $this->metric('Upcoming', PtmSession::query()->where('organization_id', $orgId)->whereDate('date', '>=', Carbon::today())->count(), '', 'calendar-clock', 'teal'),
            $this->metric('Appointments', PtmAppointment::query()->where('organization_id', $orgId)->count(), '', 'calendar-check', 'indigo'),
            $this->metric('Completed', PtmAppointment::query()->where('organization_id', $orgId)->where('status', 'completed')->count(), '', 'check-check', 'emerald'),
            $this->metric('Awaiting Parents', PtmAppointment::query()->where('organization_id', $orgId)->whereIn('status', ['booked', 'checked_in'])->count(), '', 'users', 'amber'),
            $this->metric('Absent', PtmAppointment::query()->where('organization_id', $orgId)->where('status', 'absent')->count(), '', 'user-x', 'rose'),
        ];

        $recent = PtmSession::query()->where('organization_id', $orgId)->orderByDesc('date')->limit(8)->get();

        $byStatus = PtmAppointment::query()
            ->selectRaw('COALESCE(NULLIF(status, ""), "unknown") as label, COUNT(*) as total')
            ->where('organization_id', $orgId)
            ->groupBy('label')
            ->orderByDesc('total')
            ->get();

        $charts = [
            $this->chart('Appointment Status', 'pie', $byStatus->map(fn ($a) => [
                'label' => ucfirst($a->label),
                'value' => (int) $a->total,
            ])->toArray()),
        ];

        $sections = [
            [
                'title' => 'Sessions',
                'columns' => ['Session', 'Date', 'Time', 'Status'],
                'rows' => $recent->map(fn ($s) => [
                    $s->title ?? '—',
                    optional($s->date)->format('d M Y'),
                    optional($s->start_time)->format('h:i A'),
                    ucfirst($s->status ?? ''),
                ])->toArray(),
            ],
        ];

        return compact('metrics', 'sections', 'charts');
    }

    private function lessonPlans(Organization $organization): array
    {
        $orgId = $organization->id;
        $total = LessonPlan::query()->where('organization_id', $orgId)->count();
        $completed = LessonPlan::query()->where('organization_id', $orgId)->where('status', 'completed')->count();

        $metrics = [
            $this->metric('Lesson Plans', $total, '', 'book-open', 'blue'),
            $this->metric('Planned', LessonPlan::query()->where('organization_id', $orgId)->where('status', 'planned')->count(), '', 'calendar', 'violet'),
            $this->metric('In Progress', LessonPlan::query()->where('organization_id', $orgId)->where('status', 'in_progress')->count(), '', 'loader', 'amber'),
            $this->metric('Completed', $completed, '', 'check-check', 'emerald'),
            $this->metric('Coverage', $total ? round(($completed / $total) * 100) : 0, '%', 'gauge', 'teal'),
            $this->metric('Carried Forward', LessonPlan::query()->where('organization_id', $orgId)->where('status', 'carried_forward')->count(), '', 'repeat', 'rose'),
        ];

        $recent = LessonPlan::query()
            ->with('schoolClass:id,name,section', 'subject:id,name')
            ->where('organization_id', $orgId)
            ->orderByDesc('id')
            ->limit(8)
            ->get();

        $byStatus = LessonPlan::query()
            ->selectRaw('COALESCE(NULLIF(status, ""), "unknown") as label, COUNT(*) as total')
            ->where('organization_id', $orgId)
            ->groupBy('label')
            ->orderByDesc('total')
            ->get();

        $charts = [
            $this->chart('Plans by Status', 'bar', $byStatus->map(fn ($p) => [
                'label' => ucwords(str_replace('_', ' ', $p->label)),
                'value' => (int) $p->total,
            ])->toArray(), ['Plans']),
        ];

        $sections = [
            [
                'title' => 'Recent Lesson Plans',
                'columns' => ['Class', 'Subject', 'Lesson', 'Status'],
                'rows' => $recent->map(fn ($p) => [
                    optional($p->schoolClass)->name.' '.optional($p->schoolClass)->section ?? '—',
                    optional($p->subject)->name ?? '—',
                    $p->lesson_title ?? '—',
                    ucwords(str_replace('_', ' ', $p->status ?? '')),
                ])->toArray(),
            ],
        ];

        return compact('metrics', 'sections', 'charts');
    }

    private function osm(Organization $organization): array
    {
        $orgId = $organization->id;
        $evaluations = OsmEvaluation::query()->where('organization_id', $orgId)->where('status', 'evaluated');

        $metrics = [
            $this->metric('OSM Sessions', OsmSession::query()->where('organization_id', $orgId)->count(), '', 'briefcase', 'blue'),
            $this->metric('Evaluations', (clone $evaluations)->count(), '', 'clipboard-check', 'emerald'),
            $this->metric('Pending Evaluation', OsmEvaluation::query()->where('organization_id', $orgId)->where('status', 'pending')->count(), '', 'hourglass', 'amber'),
            $this->metric('Avg. Grade', round((clone $evaluations)->avg('grade_level') ?? 0, 1), '', 'star', 'violet'),
            $this->metric('Moderated', OsmEvaluation::query()->where('organization_id', $orgId)->whereNotNull('moderated_at')->count(), '', 'shield-check', 'teal'),
        ];

        $recent = OsmSession::query()->where('organization_id', $orgId)->orderByDesc('id')->limit(8)->get();

        $sections = [
            [
                'title' => 'Sessions',
                'columns' => ['Name', 'Term', 'Status'],
                'rows' => $recent->map(fn ($s) => [$s->name ?? '—', ucfirst($s->term ?? ''), ucfirst($s->status ?? '')])->toArray(),
            ],
        ];

        return compact('metrics', 'sections');
    }

    private function assessment(Organization $organization): array
    {
        $orgId = $organization->id;
        $active = Assessment::query()->where('organization_id', $orgId)->where('status', 'active')->count();

        $metrics = [
            $this->metric('Assessments', Assessment::query()->where('organization_id', $orgId)->count(), '', 'clipboard-list', 'blue'),
            $this->metric('Active', $active, '', 'activity', 'emerald'),
            $this->metric('Completed', Assessment::query()->where('organization_id', $orgId)->where('status', 'completed')->count(), '', 'check-check', 'violet'),
            $this->metric('Total Marks Pool', Assessment::query()->where('organization_id', $orgId)->sum('total_marks'), '', 'award', 'indigo'),
        ];

        $recent = Assessment::query()
            ->with('class:id,name', 'subject:id,name')
            ->where('organization_id', $orgId)
            ->orderByDesc('id')
            ->limit(8)
            ->get();

        $byType = Assessment::query()
            ->selectRaw('COALESCE(NULLIF(assessment_type, ""), "other") as label, COUNT(*) as total')
            ->where('organization_id', $orgId)
            ->groupBy('label')
            ->orderByDesc('total')
            ->get();

        $charts = [
            $this->chart('Assessments by Type', 'pie', $byType->map(fn ($a) => [
                'label' => ucwords(str_replace('_', ' ', $a->label)),
                'value' => (int) $a->total,
            ])->toArray()),
        ];

        $sections = [
            [
                'title' => 'Recent Assessments',
                'columns' => ['Class', 'Subject', 'Assessment', 'Type'],
                'rows' => $recent->map(fn ($a) => [
                    optional($a->class)->name ?? '—',
                    optional($a->subject)->name ?? '—',
                    $a->name ?? '—',
                    ucfirst($a->assessment_type ?? ''),
                ])->toArray(),
            ],
        ];

        return compact('metrics', 'sections', 'charts');
    }

    private function survey(Organization $organization): array
    {
        $orgId = $organization->id;
        $surveys = Survey::query()->where('organization_id', $orgId);

        $metrics = [
            $this->metric('Surveys', (clone $surveys)->count(), '', 'file-question', 'blue'),
            $this->metric('Active Surveys', (clone $surveys)->where('status', 'active')->whereDate('ends_on', '>=', Carbon::today())->count(), '', 'play', 'emerald'),
            $this->metric('Responses', SurveyResponse::query()->where('organization_id', $orgId)->count(), '', 'messages-square', 'violet'),
        ];

        $perSurvey = SurveyResponse::query()
            ->selectRaw('survey_id, COUNT(*) as total')
            ->where('organization_id', $orgId)
            ->groupBy('survey_id')
            ->get();
        $avgPerSurvey = $perSurvey->avg('total') ?? 0;

        $metrics[] = $this->metric('Avg. Responses / Survey', round($avgPerSurvey, 1), '', 'bar-chart', 'teal');

        $recent = (clone $surveys)->orderByDesc('id')->limit(8)->get();

        $responsesBySurvey = SurveyResponse::query()
            ->selectRaw('survey_id, COUNT(*) as total')
            ->where('organization_id', $orgId)
            ->groupBy('survey_id')
            ->orderByDesc('total')
            ->limit(8)
            ->get()
            ->map(function ($row) use ($orgId) {
                $survey = Survey::query()->find($row->survey_id);

                return [
                    'label' => $survey?->title ?? '#' . $row->survey_id,
                    'value' => (int) $row->total,
                ];
            });

        $charts = [
            $this->chart('Responses per Survey', 'bar', $responsesBySurvey->toArray(), ['Responses']),
        ];

        $sections = [
            [
                'title' => 'Surveys',
                'columns' => ['Title', 'Audience', 'Status', 'Ends On'],
                'rows' => $recent->map(fn ($s) => [
                    $s->title ?? '—',
                    ucfirst($s->audience ?? ''),
                    ucfirst($s->status ?? ''),
                    optional($s->ends_on)->format('d M Y'),
                ])->toArray(),
            ],
        ];

        return compact('metrics', 'sections', 'charts');
    }

    private function library(Organization $organization): array
    {
        $orgId = $organization->id;
        $recentBooks = LibraryBook::query()
            ->where('organization_id', $orgId)
            ->where('created_at', '>=', Carbon::today()->startOfMonth())
            ->count();

        $metrics = [
            $this->metric('Total Books', LibraryBook::query()->where('organization_id', $orgId)->sum('total_copies'), '', 'book', 'blue'),
            $this->metric('Available Copies', LibraryBook::query()->where('organization_id', $orgId)->sum('available_copies'), '', 'book-open', 'emerald'),
            $this->metric('Members', LibraryMember::query()->where('organization_id', $orgId)->count(), '', 'users', 'violet'),
            $this->metric('Books Issued', LibraryCirculation::query()->where('organization_id', $orgId)->where('status', 'Issued')->count(), '', 'bookmark', 'indigo'),
            $this->metric('Overdue', LibraryCirculation::query()->where('organization_id', $orgId)->where('status', 'Overdue')->count(), '', 'alert-triangle', 'rose'),
            $this->metric('Acquired (Month)', $recentBooks, '', 'package-plus', 'teal'),
        ];

        $recent = LibraryCirculation::query()
            ->with('book:id,title', 'member:id,member_type,student_id')
            ->where('organization_id', $orgId)
            ->orderByDesc('id')
            ->limit(8)
            ->get();

        $byCategory = LibraryBook::query()
            ->selectRaw('COALESCE(NULLIF(category, ""), "Other") as label, SUM(total_copies) as total')
            ->where('organization_id', $orgId)
            ->groupBy('label')
            ->orderByDesc('total')
            ->limit(6)
            ->get();

        $charts = [
            $this->chart('Books by Category', 'pie', $byCategory->map(fn ($row) => [
                'label' => $row->label,
                'value' => (int) $row->total,
            ])->toArray()),
        ];

        $sections = [
            [
                'title' => 'Recent Issues',
                'columns' => ['Book', 'Member', 'Due Date', 'Status'],
                'rows' => $recent->map(fn ($c) => [
                    optional($c->book)->title ?? '—',
                    optional($c->member)->id ?? '—',
                    optional($c->due_date)->format('d M Y'),
                    ucfirst($c->status ?? ''),
                ])->toArray(),
            ],
        ];

        return compact('metrics', 'sections', 'charts');
    }

    private function inventory(Organization $organization): array
    {
        $orgId = $organization->id;
        $lowStock = InventoryItem::query()
            ->where('organization_id', $orgId)
            ->whereColumn('available_stock', '<=', 'minimum_stock')
            ->where('minimum_stock', '>', 0)
            ->count();
        $stockIn = InventoryStockEntry::query()->where('organization_id', $orgId)->sum('quantity');
        $stockValue = (float) InventoryStockEntry::query()
            ->where('organization_id', $orgId)
            ->selectRaw('COALESCE(SUM(quantity * unit_price), 0) as total')
            ->value('total');

        $metrics = [
            $this->metric('Items', InventoryItem::query()->where('organization_id', $orgId)->count(), '', 'box', 'blue'),
            $this->metric('Categories', InventoryCategory::query()->where('organization_id', $orgId)->count(), '', 'tags', 'violet'),
            $this->metric('Units In', $stockIn, '', 'package', 'teal'),
            $this->metric('Low Stock Alerts', $lowStock, '', 'alert-triangle', 'rose'),
            $this->metric('Stocked Value', round($stockValue), '', 'coins', 'amber'),
        ];

        $lowStockItems = InventoryItem::query()
            ->with('category:id,name')
            ->where('organization_id', $orgId)
            ->whereColumn('available_stock', '<=', 'minimum_stock')
            ->where('minimum_stock', '>', 0)
            ->orderBy('available_stock')
            ->limit(8)
            ->get();

        $byCategory = InventoryItem::query()
            ->selectRaw('inventory_category_id, SUM(available_stock) as total')
            ->where('organization_id', $orgId)
            ->groupBy('inventory_category_id')
            ->orderByDesc('total')
            ->limit(6)
            ->get()
            ->map(function ($row) {
                $category = InventoryCategory::query()->find($row->inventory_category_id);

                return [
                    'label' => $category?->name ?? '#' . $row->inventory_category_id,
                    'value' => (int) $row->total,
                ];
            });

        $charts = [
            $this->chart('Stock by Category', 'pie', $byCategory->toArray()),
        ];

        $sections = [
            [
                'title' => 'Low Stock Items',
                'columns' => ['Item', 'Category', 'Available', 'Minimum'],
                'rows' => $lowStockItems->map(fn ($i) => [
                    $i->name ?? '—',
                    optional($i->category)->name ?? '—',
                    $i->available_stock ?? 0,
                    $i->minimum_stock ?? 0,
                ])->toArray(),
            ],
        ];

        return compact('metrics', 'sections', 'charts');
    }

    private function transport(Request $request, Organization $organization): array
    {
        $orgId = $organization->id;
        $tripsToday = DailyTrip::query()
            ->whereDate('journey_date', Carbon::today())
            ->whereHas('route', fn ($q) => $q->where('organization_id', $orgId))
            ->count();
        $assigned = TransportAssignment::query()
            ->whereHas('route', fn ($q) => $q->where('organization_id', $orgId))
            ->where('status', 'active')
            ->count();
        $drivers = User::query()->where('organization_id', $orgId)->where('role', 'driver')->where('status', 'active')->count();

        $metrics = [
            $this->metric('Routes', TransportRoute::query()->where('organization_id', $orgId)->where('status', 'active')->count(), '', 'map', 'blue'),
            $this->metric('Vehicles', TransportVehicle::query()->where('organization_id', $orgId)->count(), '', 'bus', 'violet'),
            $this->metric('Active Vehicles', TransportVehicle::query()->where('organization_id', $orgId)->where('status', 'active')->count(), '', 'car', 'emerald'),
            $this->metric('Drivers', $drivers, '', 'user', 'indigo'),
            $this->metric('Students on Transport', $assigned, '', 'users', 'teal'),
            $this->metric('Trips Today', $tripsToday, '', 'route', 'amber'),
        ];

        $recent = DailyTrip::query()
            ->with('route:id,route_name', 'vehicle:id,vehicle_number')
            ->whereHas('route', fn ($q) => $q->where('organization_id', $orgId))
            ->orderByDesc('journey_date')
            ->limit(8)
            ->get();

        $byStatus = TransportVehicle::query()
            ->selectRaw('status, COUNT(*) as total')
            ->where('organization_id', $orgId)
            ->groupBy('status')
            ->orderByDesc('total')
            ->get();

        $charts = [
            $this->chart('Vehicles by Status', 'pie', $byStatus->map(fn ($v) => [
                'label' => ucfirst($v->status ?? 'unknown'),
                'value' => (int) $v->total,
            ])->toArray()),
        ];

        $sections = [
            [
                'title' => 'Recent Trips',
                'columns' => ['Route', 'Vehicle', 'Date', 'Shift'],
                'rows' => $recent->map(fn ($t) => [
                    optional($t->route)->route_name ?? '—',
                    optional($t->vehicle)->vehicle_number ?? '—',
                    optional($t->journey_date)->format('d M Y'),
                    ucfirst($t->shift ?? ''),
                ])->toArray(),
            ],
        ];

        return compact('metrics', 'sections', 'charts');
    }

    private function hostel(Organization $organization): array
    {
        $orgId = $organization->id;
        $hostelIds = Hostel::query()->where('organization_id', $orgId)->pluck('id');
        $rooms = HostelRoom::query()->whereIn('hostel_id', $hostelIds);
        $beds = HostelBed::query()->whereIn('hostel_id', $hostelIds);
        $allocations = HostelAllocation::query()
            ->whereIn('student_id', Student::query()->where('organization_id', $orgId)->select('id'))
            ->where('status', 'active');

        $metrics = [
            $this->metric('Hostels', $hostelIds->count(), '', 'building-2', 'blue'),
            $this->metric('Rooms', (clone $rooms)->count(), '', 'bed', 'violet'),
            $this->metric('Beds', (clone $beds)->count(), '', 'bed-double', 'indigo'),
            $this->metric('Occupied Beds', (clone $beds)->where('status', 'occupied')->count(), '', 'bed-single', 'emerald'),
            $this->metric('Available Beds', (clone $beds)->where('status', 'available')->count(), '', 'door-open', 'teal'),
            $this->metric('Active Allocations', (clone $allocations)->count(), '', 'user-check', 'amber'),
        ];

        $recent = HostelAllocation::query()
            ->with('student:id,first_name,last_name', 'hostel:id,name', 'room:id,room_number')
            ->whereIn('student_id', Student::query()->where('organization_id', $orgId)->select('id'))
            ->orderByDesc('id')
            ->limit(8)
            ->get();

        $bedChart = Hostel::query()
            ->withCount([
                'beds as total_beds',
                'beds as occupied_beds' => fn ($q) => $q->where('status', 'occupied'),
            ])
            ->where('organization_id', $orgId)
            ->get()
            ->map(fn (Hostel $hostel) => [
                'label' => $hostel->name,
                'value' => (int) $hostel->occupied_beds,
                'value2' => (int) $hostel->total_beds,
            ]);

        $charts = [
            $this->chart('Beds by Hostel', 'bar', $bedChart->toArray(), ['Occupied', 'Total']),
        ];

        $sections = [
            [
                'title' => 'Recent Allocations',
                'columns' => ['Student', 'Hostel', 'Room', 'Status'],
                'rows' => $recent->map(fn ($a) => [
                    $a->student ? trim($a->student->first_name.' '.$a->student->last_name) : '—',
                    optional($a->hostel)->name ?? '—',
                    optional($a->room)->room_number ?? '—',
                    ucfirst($a->status ?? ''),
                ])->toArray(),
            ],
        ];

        return compact('metrics', 'sections', 'charts');
    }

    private function assets(Organization $organization): array
    {
        $orgId = $organization->id;
        $assets = Asset::query()->where('organization_id', $orgId);

        $metrics = [
            $this->metric('Assets', (clone $assets)->count(), '', 'warehouse', 'blue'),
            $this->metric('In Use', (clone $assets)->where('status', 'in_use')->count(), '', 'hammer', 'emerald'),
            $this->metric('Maintenance', (clone $assets)->where('status', 'maintenance')->count(), '', 'wrench', 'amber'),
            $this->metric('Total Cost', round((clone $assets)->sum('purchase_cost') / 100), '', 'indian-rupee', 'indigo'),
            $this->metric('Current Value', round((clone $assets)->sum('current_value') / 100), '', 'coins', 'teal'),
            $this->metric('Maintenance Logs', AssetMaintenanceLog::query()->where('organization_id', $orgId)->count(), '', 'clipboard-list', 'rose'),
        ];

        $recent = AssetMaintenanceLog::query()
            ->with('asset:id,name,asset_code')
            ->where('organization_id', $orgId)
            ->orderByDesc('id')
            ->limit(8)
            ->get();

        $byStatus = (clone $assets)
            ->selectRaw('COALESCE(NULLIF(status, ""), "unknown") as label, COUNT(*) as total')
            ->groupBy('label')
            ->orderByDesc('total')
            ->get();

        $charts = [
            $this->chart('Assets by Status', 'pie', $byStatus->map(fn ($a) => [
                'label' => ucwords(str_replace('_', ' ', $a->label)),
                'value' => (int) $a->total,
            ])->toArray()),
        ];

        $sections = [
            [
                'title' => 'Recent Maintenance',
                'columns' => ['Asset', 'Type', 'Cost', 'Date'],
                'rows' => $recent->map(fn ($m) => [
                    optional($m->asset)->name ?? '—',
                    ucfirst(str_replace('_', ' ', $m->maintenance_type ?? '')),
                    '₹ '.number_format((float) $m->cost, 2),
                    optional($m->maintenance_date)->format('d M Y'),
                ])->toArray(),
            ],
        ];

        return compact('metrics', 'sections', 'charts');
    }

    private function metric(string $label, mixed $value, string $suffix = '', string $icon = 'chart', string $tone = 'blue', ?string $detail = null): array
    {
        return [
            'label' => $label,
            'value' => $value,
            'suffix' => $suffix,
            'icon' => $icon,
            'tone' => $tone,
            'detail' => $detail,
        ];
    }

    private function chart(string $title, string $kind, array $data, array $legend = []): array
    {
        return [
            'title' => $title,
            'kind' => $kind,
            'data' => $data,
            'legend' => $legend,
        ];
    }

    private function resolveOrganizationForUser(User $user): ?Organization
    {
        if ($user->organization_id) {
            return Organization::query()->find($user->organization_id);
        }

        if ($user->role === 'student') {
            $studentOrganizationId = Student::query()
                ->where(function ($query) use ($user) {
                    $query
                        ->where('user_id', $user->id)
                        ->orWhere('email', $user->email);
                })
                ->value('organization_id');

            return $studentOrganizationId ? Organization::query()->find($studentOrganizationId) : null;
        }

        return null;
    }
}