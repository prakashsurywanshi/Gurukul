<?php

namespace App\Support;

class ModuleRegistry
{
    /**
     * Central registry of feature modules. Each entry identifies a module that
     * can be enabled/disabled per-organization via the Module Management screen.
     *
     * Existing core modules default to 'enabled' so current behavior is unchanged
     * until an organization explicitly disables them.
     *
     * @return array<int, array{key: string, label: string, description: string, group: string}>
     */
    public static function all(): array
    {
        return [
            // Core modules (existing functionality, gateable)
            ['key' => 'dashboard', 'label' => 'Dashboard', 'description' => 'Role dashboard with summary widgets.', 'group' => 'Core'],
            ['key' => 'students', 'label' => 'Students', 'description' => 'Student records, admission, alumni and exit management.', 'group' => 'Core'],
            ['key' => 'academics', 'label' => 'Academics', 'description' => 'Classes, subjects, timetables, lesson plans, homework and study materials.', 'group' => 'Core'],
            ['key' => 'exams', 'label' => 'Exams & Marks', 'description' => 'Exam management, marks entry, report cards and marksheets.', 'group' => 'Core'],
            ['key' => 'attendance', 'label' => 'Attendance', 'description' => 'Daily attendance, QR and biometric tracking.', 'group' => 'Core'],
            ['key' => 'fees', 'label' => 'Fees & Finance', 'description' => 'Fee structures, collection, expenses, income and bank accounts.', 'group' => 'Core'],
            ['key' => 'staff', 'label' => 'Staff & HR', 'description' => 'Staff records, payroll, leave, appraisals, loans and recruitment.', 'group' => 'Core'],
            ['key' => 'front-office', 'label' => 'Front Office', 'description' => 'Admission enquiries, leads, visitors, postal and gate passes.', 'group' => 'Core'],
            ['key' => 'hostel', 'label' => 'Hostel', 'description' => 'Hostel blocks, rooms, allocations, fees and complaints.', 'group' => 'Core'],
            ['key' => 'transport', 'label' => 'Transport', 'description' => 'Routes, vehicles, trips and transport fee collection.', 'group' => 'Core'],
            ['key' => 'library', 'label' => 'Library', 'description' => 'Books, circulation and e-library.', 'group' => 'Core'],
            ['key' => 'inventory', 'label' => 'Inventory & Store', 'description' => 'Items, stores, purchase orders and point of sale.', 'group' => 'Core'],
            ['key' => 'certificates', 'label' => 'Certificates', 'description' => 'Certificate templates, marksheets and ID cards.', 'group' => 'Core'],
            ['key' => 'communication', 'label' => 'Communication', 'description' => 'Messages, notices, WhatsApp, SMS, email and voice calls.', 'group' => 'Core'],
            ['key' => 'compliance', 'label' => 'Compliance', 'description' => 'Regulatory packs, checklists and inspections.', 'group' => 'Core'],
            ['key' => 'cctv', 'label' => 'CCTV', 'description' => 'Camera registry, access control and live wall.', 'group' => 'Core'],
            ['key' => 'knowledge-base', 'label' => 'Knowledge Base', 'description' => 'Articles and self-service help content.', 'group' => 'Core'],
            ['key' => 'website', 'label' => 'Website CMS', 'description' => 'Public website builder and page editor.', 'group' => 'Core'],
            ['key' => 'reports', 'label' => 'Reports & Analytics', 'description' => 'MIS reports and analytics exports.', 'group' => 'Core'],
            ['key' => 'settings', 'label' => 'Settings', 'description' => 'General, communication, payment and role settings.', 'group' => 'Core'],

            // New generation modules
            ['key' => 'audit-trail', 'label' => 'Audit Trail', 'description' => 'Track every user action across the system with before/after diffs.', 'group' => 'System'],
            ['key' => 'assets', 'label' => 'Asset Management', 'description' => 'Fixed assets, depreciation, maintenance, audits and disposals.', 'group' => 'Finance'],
            ['key' => 'assessment', 'label' => 'Assessment', 'description' => 'Continuous and term-based assessment plans with weightage and timelines.', 'group' => 'Academics'],
            ['key' => 'digital-evaluation', 'label' => 'Digital Evaluation', 'description' => 'Online subjective marking and moderation workflow.', 'group' => 'Academics'],
            ['key' => 'report-cards', 'label' => 'Report Card Setups', 'description' => 'Custom report card templates, remarks and layouts.', 'group' => 'Academics'],
            ['key' => 'cbc', 'label' => 'CBC (Competency Based)', 'description' => 'Competency strands, outcomes, pathways and CBC reports.', 'group' => 'Academics'],
            ['key' => 'apps-center', 'label' => 'Apps Center', 'description' => 'AI and productivity apps: question paper, 360 view, exports and more.', 'group' => 'AI & Apps'],
            ['key' => 'ai-analytics', 'label' => 'AI Analytics', 'description' => 'AI scoring for leads, fee defaulters, at-risk students and transport route suggestions.', 'group' => 'AI & Apps'],
            ['key' => 'dashboard-themes', 'label' => 'Dashboard Themes', 'description' => 'Switchable dashboard colour themes.', 'group' => 'System'],
            ['key' => 'face-search', 'label' => 'Face Search', 'description' => 'Face-based student record lookup.', 'group' => 'Students'],
            ['key' => 'branch-admin', 'label' => 'Branch Admin', 'description' => 'Head-office login spanning multiple branches.', 'group' => 'System'],
        ];
    }

    /**
     * @return array<string, string> key => label
     */
    public static function keyed(): array
    {
        $keyed = [];

        foreach (self::all() as $module) {
            $keyed[$module['key']] = $module['label'];
        }

        return $keyed;
    }

    public static function label(string $module): string
    {
        $index = array_search($module, array_column(self::all(), 'key'), true);

        return $index === false ? ucfirst($module) : self::all()[$index]['label'];
    }

    public static function isKnown(string $module): bool
    {
        return in_array($module, self::keys(), true);
    }

    /**
     * Core modules are foundational and cannot be disabled through the
     * Module Management screen.
     *
     * @return array<int, string>
     */
    public static function coreKeys(): array
    {
        return array_values(array_column(
            array_filter(self::all(), fn (array $module) => ($module['group'] ?? '') === 'Core'),
            'key'
        ));
    }

    public static function isCore(string $module): bool
    {
        return in_array($module, self::coreKeys(), true);
    }

    /**
     * @return array<int, string>
     */
    public static function keys(): array
    {
        return array_column(self::all(), 'key');
    }
}