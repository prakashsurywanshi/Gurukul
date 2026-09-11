<?php

namespace App\Http\Controllers;

use App\Models\Organization;
use App\Models\User;
use Illuminate\Http\Request;
use Inertia\Inertia;
use Inertia\Response;

class ErpNavigatorController extends Controller
{
    public function index(Request $request): Response
    {
        $organization = $this->resolveOrganizationForUser($request->user());

        return Inertia::render('dashboard/ErpNavigator', [
            'user' => $request->user(),
            'categories' => $this->catalog(),
            'orgName' => $organization?->name ?? '',
        ]);
    }

    private function catalog(): array
    {
        return [
            [
                'name' => 'Dashboard & Profiles',
                'icon' => 'Home',
                'modules' => [
                    ['name' => 'Dashboard', 'href' => '/dashboard', 'feature' => 'Dashboard Home'],
                    ['name' => 'My Profile', 'href' => '/my-profile', 'feature' => 'My Profile'],
                    ['name' => 'HR Dashboard', 'href' => '/hr-dashboard', 'feature' => 'User Management'],
                ],
            ],
            [
                'name' => 'Students',
                'icon' => 'Users',
                'modules' => [
                    ['name' => 'Student List', 'href' => '/students', 'feature' => 'Student Management'],
                    ['name' => 'Admission Inquiry', 'href' => '/admission-inquiries', 'feature' => 'Admission Inquiry'],
                    ['name' => 'Student Transfer', 'href' => '/student-exits', 'feature' => 'Student Exits'],
                    ['name' => 'Discipline', 'href' => '/discipline', 'feature' => 'Discipline Management'],
                    ['name' => 'Custom Fields', 'href' => '/custom-fields', 'feature' => 'Custom Fields'],
                ],
            ],
            [
                'name' => 'Exams & Academics',
                'icon' => 'FileText',
                'modules' => [
                    ['name' => 'Exam Management', 'href' => '/exams', 'feature' => 'Exam Management'],
                    ['name' => 'Exam Types', 'href' => '/exam-types', 'feature' => 'Exam Types'],
                    ['name' => 'Date Sheets', 'href' => '/datesheets', 'feature' => 'Date Sheet'],
                    ['name' => 'Enter Marks', 'href' => '/enter-marks', 'feature' => 'Enter Marks'],
                    ['name' => 'Marksheet Upload', 'href' => '/marksheet/upload-list', 'feature' => 'Marksheet Management'],
                    ['name' => 'Assignments', 'href' => '/assignments', 'feature' => 'Assignments'],
                    ['name' => 'Class Time Table', 'href' => '/class-timetable', 'feature' => 'Class Time Table'],
                    ['name' => 'HPC Dashboard', 'href' => '/hpc/dashboard', 'feature' => 'HPC Progress Cards'],
                    ['name' => 'HPC Activities', 'href' => '/hpc/activities', 'feature' => 'HPC Progress Cards'],
                    ['name' => 'Progress Cards', 'href' => '/hpc/cards', 'feature' => 'HPC Progress Cards'],
                    ['name' => 'HPC Frameworks', 'href' => '/hpc/frameworks', 'feature' => 'HPC Progress Cards'],
                    ['name' => 'Card Appearance', 'href' => '/hpc/card-appearance', 'feature' => 'HPC Progress Cards'],
                ],
            ],
            [
                'name' => 'Fees & Accounts',
                'icon' => 'IndianRupee',
                'modules' => [
                    ['name' => 'Fees Management', 'href' => '/fees', 'feature' => 'Fees Management'],
                    ['name' => 'Income', 'href' => '/income-management', 'feature' => 'Income Management'],
                    ['name' => 'Expenses', 'href' => '/expense-management', 'feature' => 'Expense Management'],
                    ['name' => 'Income Heads', 'href' => '/accounts/income-heads', 'feature' => 'Income Management'],
                    ['name' => 'Expense Heads', 'href' => '/accounts/expense-heads', 'feature' => 'Expense Management'],
                    ['name' => 'Bank Accounts', 'href' => '/bank-accounts', 'feature' => 'Bank Accounts'],
                    ['name' => 'Tally Export', 'href' => '/tally', 'feature' => 'Tally Export'],
                    ['name' => 'Fee Challans', 'href' => '/fees/challans', 'feature' => 'Fees Management'],
                    ['name' => 'Fee Due Slips', 'href' => '/fees/due-slips', 'feature' => 'Fees Management'],
                    ['name' => 'Fee Discounts', 'href' => '/fees-discounts', 'feature' => 'Fees Management'],
                    ['name' => 'Assign Fees', 'href' => '/assign-fees', 'feature' => 'Fees Management'],
                ],
            ],
            [
                'name' => 'Attendance & Leave',
                'icon' => 'CalendarCheck',
                'modules' => [
                    ['name' => 'Attendance Management', 'href' => '/attendance', 'feature' => 'Attendance Management'],
                    ['name' => 'Apply Leave', 'href' => '/leave-applications', 'feature' => 'Leave Management'],
                    ['name' => 'Leave Management', 'href' => '/leave', 'feature' => 'Leave Management'],
                ],
            ],
            [
                'name' => 'Communication',
                'icon' => 'MessageSquare',
                'modules' => [
                    ['name' => 'Messages', 'href' => '/messages', 'feature' => 'Messages'],
                    ['name' => 'Notice Board', 'href' => '/notices', 'feature' => 'Notice Board'],
                    ['name' => 'Image Gallery', 'href' => '/gallery', 'feature' => 'Image Gallery'],
                    ['name' => 'Events Calendar', 'href' => '/events', 'feature' => 'Events'],
                    ['name' => 'Communication Massages', 'href' => '/communication', 'feature' => 'Communication'],
                ],
            ],
            [
                'name' => 'Staff',
                'icon' => 'UserCog',
                'modules' => [
                    ['name' => 'Staff Management', 'href' => '/staff', 'feature' => 'User Management'],
                    ['name' => 'Teacher Evaluations', 'href' => '/teacher-evaluations', 'feature' => 'Teacher Evaluations'],
                    ['name' => 'Staff ID Cards', 'href' => '/staff-id-cards', 'feature' => 'Staff ID Cards'],
                    ['name' => 'Loans & Advances', 'href' => '/loans', 'feature' => 'Loan Management'],
                    ['name' => 'Salary Management', 'href' => '/salaries', 'feature' => 'Salary Management'],
                ],
            ],
            [
                'name' => 'Documents & Certificates',
                'icon' => 'Archive',
                'modules' => [
                    ['name' => 'Document Vault', 'href' => '/document-vault', 'feature' => 'Document Vault'],
                    ['name' => 'Certificates', 'href' => '/certificates', 'feature' => 'Certificate Management'],
                    ['name' => 'Student ID Card', 'href' => '/certificates/student-id-card', 'feature' => 'Student ID Card Management'],
                    ['name' => 'Download Center', 'href' => '/download-center', 'feature' => 'Download Center'],
                ],
            ],
            [
                'name' => 'Library, Inventory & Facilities',
                'icon' => 'Book',
                'modules' => [
                    ['name' => 'Library', 'href' => '/library', 'feature' => 'Library Management'],
                    ['name' => 'E-Library', 'href' => '/e-library', 'feature' => 'E-Library'],
                    ['name' => 'Inventory', 'href' => '/inventory', 'feature' => 'Inventory Management'],
                    ['name' => 'Assets', 'href' => '/assets', 'feature' => 'Asset Management'],
                    ['name' => 'Facilities', 'href' => '/facilities', 'feature' => 'Facility Management'],
                    ['name' => 'Hostel Management', 'href' => '/hostel', 'feature' => 'Hostel Management'],
                ],
            ],
            [
                'name' => 'Admin & Settings',
                'icon' => 'Settings',
                'modules' => [
                    ['name' => 'Class Management', 'href' => '/classes', 'feature' => 'Class Management'],
                    ['name' => 'Assign Class Teacher', 'href' => '/assign-class-teacher', 'feature' => 'Assign Class Teacher'],
                    ['name' => 'Academic Calendar', 'href' => '/academic-calendar', 'feature' => 'Academic Calendar'],
                    ['name' => 'Audit Trail', 'href' => '/audit-trail', 'feature' => 'Audit Trail'],
                    ['name' => 'Custom Fields', 'href' => '/custom-fields', 'feature' => 'Custom Fields'],
                    ['name' => 'Lead Dashboard', 'href' => '/leads/dashboard', 'feature' => 'Lead Management'],
                    ['name' => 'Apps Center', 'href' => '/apps', 'feature' => 'Apps Center'],
                    ['name' => 'Subscription', 'href' => '/subscription', 'feature' => 'Subscription Management'],
                    ['name' => 'Subscription History', 'href' => '/payment-history', 'feature' => 'Subscription Management'],
                    ['name' => 'Content Safety', 'href' => '/nsfw', 'feature' => 'Content Safety'],
                ],
            ],
        ];
    }

    private function resolveOrganizationForUser(User $user): ?Organization
    {
        if ($user->organization_id) {
            return Organization::query()->find($user->organization_id);
        }

        if ($user->role !== 'admin') {
            return null;
        }

        $organization = Organization::query()->where('email', $user->email)->first();

        if (! $organization && Organization::query()->count() === 1) {
            $organization = Organization::query()->first();
        }

        return $organization;
    }
}