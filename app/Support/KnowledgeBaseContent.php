<?php

namespace App\Support;

use Illuminate\Support\Str;

class KnowledgeBaseContent
{
    public static function defaults(): array
    {
        return [
            'title' => 'Gurukul Knowledge Base',
            'subtitle' => 'Operational documentation for every major module in the platform. Superadmin can maintain these HTML documents from the CMS and publish updates instantly for staff.',
            'search_placeholder' => 'Search modules, features, workflows, or FAQs...',
            'documentation_title' => 'Module Documentation',
            'documentation_subtitle' => 'Structured HTML documentation for the platform modules, workflows, dependencies, and operating guidance.',
            'faq_title' => 'Frequently Asked Questions',
            'faq_subtitle' => 'Quick answers for staff across admissions, academics, communication, finance, operations, and settings.',
            'modules' => self::defaultModules(),
            'faqs' => self::defaultFaqs(),
        ];
    }

    public static function normalize(?array $content, bool $mergeDefaults = true): array
    {
        $defaults = self::defaults();
        $normalizedModules = collect($content['modules'] ?? [])
            ->map(function ($module) {
                $title = trim((string) ($module['title'] ?? ''));
                $summary = trim((string) ($module['summary'] ?? ''));
                $content = trim((string) ($module['content'] ?? ''));
                $id = trim((string) ($module['id'] ?? ''));

                if ($title === '' || $content === '') {
                    return null;
                }

                return [
                    'id' => $id !== '' ? $id : Str::slug(Str::limit($title, 80, '')),
                    'title' => $title,
                    'summary' => $summary,
                    'content' => $content,
                ];
            })
            ->filter()
            ->values();

        $normalizedFaqs = collect($content['faqs'] ?? $content['entries'] ?? [])
            ->map(function ($entry) {
                $question = trim((string) ($entry['question'] ?? ''));
                $answer = trim((string) ($entry['answer'] ?? ''));
                $id = trim((string) ($entry['id'] ?? ''));

                if ($question === '' || $answer === '') {
                    return null;
                }

                return [
                    'id' => $id !== '' ? $id : Str::slug(Str::limit($question, 80, '')),
                    'question' => $question,
                    'answer' => $answer,
                ];
            })
            ->filter()
            ->values();

        $modules = $mergeDefaults
            ? self::mergeById($defaults['modules'], $normalizedModules->all())
            : $normalizedModules->values()->all();
        $faqs = $mergeDefaults
            ? self::mergeById($defaults['faqs'], $normalizedFaqs->all())
            : $normalizedFaqs->values()->all();

        return [
            'title' => trim((string) ($content['title'] ?? $defaults['title'])) ?: $defaults['title'],
            'subtitle' => trim((string) ($content['subtitle'] ?? $defaults['subtitle'])) ?: $defaults['subtitle'],
            'search_placeholder' => trim((string) ($content['search_placeholder'] ?? $defaults['search_placeholder'])) ?: $defaults['search_placeholder'],
            'documentation_title' => trim((string) ($content['documentation_title'] ?? $defaults['documentation_title'])) ?: $defaults['documentation_title'],
            'documentation_subtitle' => trim((string) ($content['documentation_subtitle'] ?? $defaults['documentation_subtitle'])) ?: $defaults['documentation_subtitle'],
            'faq_title' => trim((string) ($content['faq_title'] ?? $defaults['faq_title'])) ?: $defaults['faq_title'],
            'faq_subtitle' => trim((string) ($content['faq_subtitle'] ?? $defaults['faq_subtitle'])) ?: $defaults['faq_subtitle'],
            'modules' => $modules,
            'faqs' => $faqs,
        ];
    }

    private static function mergeById(array $defaults, array $saved): array
    {
        $savedCollection = collect($saved)
            ->filter(fn (array $item) => filled($item['id'] ?? null))
            ->keyBy('id');

        $mergedDefaults = collect($defaults)->map(function (array $item) use ($savedCollection) {
            $savedItem = $savedCollection->get($item['id']);

            return $savedItem ? array_merge($item, $savedItem) : $item;
        });

        $extraSaved = collect($saved)->filter(function (array $item) use ($mergedDefaults) {
            return ! $mergedDefaults->contains(fn (array $defaultItem) => $defaultItem['id'] === $item['id']);
        });

        return $mergedDefaults
            ->concat($extraSaved)
            ->values()
            ->all();
    }

    private static function defaultModules(): array
    {
        return [
            self::module(
                'dashboard',
                'Dashboard',
                'Executive overview of school operations, reminders, and quick navigation across modules.',
                ['Dashboard Home'],
                [
                    'Use the dashboard to review today\'s operational picture before opening transactional modules.',
                    'Verify alerts first, then navigate into the linked module to complete corrective work.',
                    'Staff should treat dashboard cards as indicators, not the final source of record.',
                ],
                [
                    'Review attendance, fee, communication, and task indicators at the start of each day.',
                    'Follow up on overdue actions such as pending enquiries, unreturned books, or unpaid fees.',
                    'Open the detailed module page before editing records so context stays accurate.',
                ]
            ),
            self::module(
                'students',
                'Students',
                'Student lifecycle management from enquiry conversion through profile maintenance, alumni, and bulk actions.',
                ['Search Students', 'Student Details', 'Edit Student', 'Online Admission', 'Bulk Delete Students', 'Alumni Records'],
                [
                    'Search Students is the operational entry point for finding and filtering active student records.',
                    'Student Details should be used for audit-friendly review before editing profile, academic, or contact data.',
                    'Online Admission connects the enquiry flow to enrollment and should be completed only after document verification.',
                    'Bulk Delete must be restricted to cleanup cases after reviewing dependencies like fees, attendance, and academic history.',
                    'Alumni Records should be used after graduation, transfer, or completed offboarding.',
                ],
                [
                    'Create or review the admission enquiry.',
                    'Verify student identity, guardian details, class target, and required documents.',
                    'Convert approved enquiries into student records.',
                    'Update transport, hostel, fee, and academic settings after enrollment.',
                    'Move students to alumni only after completion or exit is confirmed.',
                ]
            ),
            self::module(
                'users',
                'Users',
                'Staff account administration, access control, status management, and password reset operations.',
                ['User Management'],
                [
                    'Create staff accounts only after role, organization access, and responsibility are finalized.',
                    'Use status updates instead of deletion when the user history must remain available for audit.',
                    'Reset passwords only through authorized administrative action and share credentials securely.',
                ],
                [
                    'Create the user with the correct role and organization context.',
                    'Verify the mapped permissions from Roles & Permissions before the user starts work.',
                    'Deactivate accounts for staff exits, leave, or temporary suspension.',
                ]
            ),
            self::module(
                'academics',
                'Academics',
                'Academic structure management including class setup, subjects, timetables, lesson planning, homework, and student promotion.',
                ['Class / Section', 'Class Time Table', 'Teachers Time Table', 'Lesson Plan', 'Homework', 'Subjects', 'Promote Students'],
                [
                    'Configure classes and sections before building subject or timetable data.',
                    'Keep class and teacher timetables synchronized so teaching load remains conflict-free.',
                    'Lesson Plan and Homework should align with the active session, subject, and class structure.',
                    'Promote Students should be performed after verifying academic completion and target class availability.',
                ],
                [
                    'Set up class and section records for the session.',
                    'Assign subjects and staff responsibilities.',
                    'Prepare class and teacher timetables.',
                    'Publish lesson plans and homework for teaching teams.',
                    'Run year-end promotion only after validating progression rules.',
                ]
            ),
            self::module(
                'front-office',
                'Front Office',
                'Reception and desk operations for enquiries, visits, calls, dispatch, deliveries, and complaint tracking.',
                ['Admission Enquiry', 'Visitor Register', 'Phone Call Log', 'Postal Dispatch', 'Postal Delivery', 'Complains'],
                [
                    'Front Office should be updated in real time to maintain reliable visitor and communication records.',
                    'Admission Enquiry data must be complete enough to support later enrollment conversion.',
                    'Complaint entries should capture owner, priority, status, and follow-up notes.',
                ],
                [
                    'Record the inbound interaction with contact details and context.',
                    'Assign the responsible department or follow-up owner.',
                    'Track outcome and close the record once resolved or handed off.',
                ]
            ),
            self::module(
                'fees-finance',
                'Fees & Finance',
                'Student fee operations plus institutional income and expense tracking for daily finance workflows.',
                ['Fees Management', 'Income Management', 'Expense Management'],
                [
                    'Fee structures should be finalized before collection begins for a session or class.',
                    'Income and Expense entries should include category, amount, date, and payment context for reporting accuracy.',
                    'Reversions or corrections should be documented immediately to keep reports trustworthy.',
                ],
                [
                    'Confirm the applicable fee structure and student balance.',
                    'Record payment, receipt details, and collection method.',
                    'Add non-fee income and institutional expenses with supporting context.',
                    'Review financial reports regularly to catch mismatches early.',
                ]
            ),
            self::module(
                'hostel',
                'Hostel',
                'Hostel rooms, beds, allocations, and hostel fee management for residential operations.',
                ['Hostel Management'],
                [
                    'Hostel setup must define facilities, room capacity, bed inventory, and fee structure before allocations begin.',
                    'Avoid allocating beds without checking active occupancy and student status.',
                    'Hostel fee collection should align with allocation and occupancy dates.',
                ],
                [
                    'Create hostel, room, and bed records.',
                    'Configure hostel fee structures.',
                    'Allocate students to available beds.',
                    'Collect or reconcile hostel fees and revert incorrect payments when needed.',
                ]
            ),
            self::module(
                'attendance',
                'Attendance',
                'Daily class-wise attendance operations that feed reporting and academic monitoring.',
                ['Attendance Management'],
                [
                    'Attendance should be marked during the first active period whenever school policy requires daily morning capture.',
                    'Review absences before submission so notifications and reports remain accurate.',
                    'Corrections should be made as soon as discrepancies are identified.',
                ],
                [
                    'Open the attendance page for the class or section.',
                    'Mark present, absent, or other supported statuses.',
                    'Review absentees and submit the register.',
                    'Use reports to monitor repeated absence patterns.',
                ]
            ),
            self::module(
                'exams',
                'Exams',
                'Offline exam configuration, scheduling, hall tickets, marksheets, and result publication.',
                ['Exam Management'],
                [
                    'Create the exam first, then attach schedules and result data module by module.',
                    'Hall ticket and marksheet outputs depend on accurate scheduling and result records.',
                    'Do not publish or print final outputs before timetable and marks validation is complete.',
                ],
                [
                    'Create the examination record.',
                    'Attach schedules by class, subject, and date.',
                    'Enter or update results after assessment.',
                    'Generate hall tickets and marksheets after verification.',
                ]
            ),
            self::module(
                'online-exams',
                'Online Exams',
                'Digital assessment flow for question management, exam assignment, submission, and result review.',
                ['Online Exams'],
                [
                    'Target classes and sections must be correct before publishing an online exam.',
                    'Submission records and snapshots should be preserved for result integrity.',
                    'Update exam windows carefully because timing affects student access immediately.',
                ],
                [
                    'Create the online exam and configure schedule, duration, and target audience.',
                    'Review attempts and submissions after the exam window.',
                    'Use results and attempt data for remediation or reporting.',
                ]
            ),
            self::module(
                'communication',
                'Communication',
                'Messages, notice board, voice calls, emails, feedback, and download center operations for campus communication.',
                ['Feedback Management', 'Messages', 'Notice Board', 'Voice Calls', 'Send Emails', 'Download Center'],
                [
                    'Choose the right communication channel based on urgency, audience, and traceability requirements.',
                    'Notice Board works best for broad announcements while Messages and Emails support more targeted communication.',
                    'Download Center should be used for persistent shared files, circulars, and templates.',
                    'Feedback campaigns should define audience, timing, and response handling before launch.',
                ],
                [
                    'Pick the feature based on audience and document needs.',
                    'Review recipients before sending or publishing.',
                    'Track logs or responses where the module supports operational follow-up.',
                ]
            ),
            self::module(
                'certificates',
                'Certificates',
                'Certificate templates, marksheets, and student ID card operations for printable academic documents.',
                ['Certificate Management', 'Marksheet Management', 'Student ID Card Management'],
                [
                    'Templates should be finalized and tested before bulk issuing documents.',
                    'Use student-specific verification before generating official outputs.',
                    'Regenerate documents only when the underlying record has changed or a corrected copy is required.',
                ],
                [
                    'Prepare the document template.',
                    'Select the student or exam context.',
                    'Preview the document carefully.',
                    'Generate or issue the final copy only after validation.',
                ]
            ),
            self::module(
                'library',
                'Library',
                'Library catalog, member operations, issue-return workflows, and acquisition requests.',
                ['Library Management'],
                [
                    'Books should be cataloged before circulation begins.',
                    'Member eligibility and copy availability must be checked before issue.',
                    'Return, overdue, and acquisition flows should be updated promptly to maintain accurate stock visibility.',
                ],
                [
                    'Create or import book records.',
                    'Manage members and issue cards when needed.',
                    'Issue books, track due dates, and record returns.',
                    'Review acquisition requests to plan library growth.',
                ]
            ),
            self::module(
                'inventory',
                'Inventory',
                'Inventory categories, stores, suppliers, items, stock movements, and issue tracking.',
                ['Inventory Management'],
                [
                    'Maintain categories, stores, and suppliers before creating stock items.',
                    'All stock additions and issues should be recorded against the right item and location.',
                    'Reconcile stock regularly to catch mismatch between physical and system inventory.',
                ],
                [
                    'Create foundational masters such as category, store, and supplier.',
                    'Add items and record stock entries.',
                    'Issue inventory to departments or users with traceable records.',
                ]
            ),
            self::module(
                'transport',
                'Transport',
                'Route, vehicle, assignment, and trip operations for school transportation management.',
                ['Transport Management'],
                [
                    'Routes and vehicles should be created before assigning students or staff.',
                    'Assignments should be reviewed whenever vehicle, driver, or route capacity changes.',
                    'Daily trips should be recorded with route context for operational tracking.',
                ],
                [
                    'Create route and stop planning.',
                    'Register vehicles and map operational details.',
                    'Assign students or staff to routes and vehicles.',
                    'Track daily trip execution and revise assignments when required.',
                ]
            ),
            self::module(
                'reports',
                'Reports & Analytics',
                'Cross-module reporting for operations, finance, academics, and management oversight.',
                ['Reports & Analytics'],
                [
                    'Reports should be interpreted using current transactional data from the linked modules.',
                    'Before sharing a report externally, verify filters, date range, and organization context.',
                    'Use reports to spot trends, but correct source data in the originating module.',
                ],
                [
                    'Select the relevant date range and report filters.',
                    'Review outliers and trace them back to the source module.',
                    'Export or communicate reports only after validation.',
                ]
            ),
            self::module(
                'knowledge-base',
                'Knowledge Base',
                'Internal operational guide for module documentation and FAQs managed from superadmin CMS.',
                ['Knowledge Base'],
                [
                    'This module is intended to centralize operating instructions for staff users.',
                    'Superadmin maintains shared HTML content and publishes updates centrally.',
                    'Use module documentation for detailed workflows and the FAQ section for quick answers.',
                ],
                [
                    'Open the superadmin Knowledge Base CMS.',
                    'Edit headings, module documentation, or FAQs in HTML format.',
                    'Save changes and review the staff-facing Knowledge Base page.',
                ]
            ),
            self::module(
                'settings',
                'Settings',
                'System setup for general settings, communication settings, roles and permissions, and sessions.',
                ['General Setting', 'Communication Setting', 'Roles & Permissions', 'Sessions'],
                [
                    'Changes in Settings can affect multiple modules, so review dependencies before publishing updates.',
                    'Roles & Permissions should be updated with care because they immediately change user access.',
                    'Sessions should be prepared ahead of academic rollover activities like promotion and timetable planning.',
                ],
                [
                    'Review the intended impact of the configuration change.',
                    'Update the specific settings section.',
                    'Verify downstream modules after save, especially permissions and session-linked workflows.',
                ]
            ),
            self::module(
                'website',
                'Website CMS',
                'Public website content management for the organization-facing site.',
                ['Website CMS'],
                [
                    'Website CMS should be used for public-facing content only, not internal operational instructions.',
                    'Review content quality, branding, and asset references before publishing.',
                    'Coordinate public changes with admissions and communication teams when content affects enquiries.',
                ],
                [
                    'Edit website sections such as banners, content blocks, and media.',
                    'Review the public preview.',
                    'Publish changes after confirming branding and copy quality.',
                ]
            ),
            self::module(
                'account',
                'Account & Profile',
                'Personal account maintenance for profile review and updates.',
                ['Profile', 'Edit Profile'],
                [
                    'Staff should keep profile contact details accurate so communication records stay current.',
                    'Sensitive changes such as email updates may require verification.',
                    'Use profile editing for personal account data, not organization-level settings.',
                ],
                [
                    'Review the current profile details.',
                    'Update supported fields and complete any verification workflow.',
                    'Confirm that the updated information displays correctly after save.',
                ]
            ),
        ];
    }

    private static function defaultFaqs(): array
    {
        $answers = self::faqAnswerMap();

        return collect(RolePermissionCatalog::features())
            ->map(function (array $feature) use ($answers) {
                $module = $feature['module'];
                $featureName = $feature['feature'];
                $answer = $answers[$featureName] ?? self::genericFaqAnswer($module, $featureName);

                return [
                    'id' => Str::slug($featureName),
                    'question' => "How should staff use {$featureName}?",
                    'answer' => $answer,
                ];
            })
            ->values()
            ->all();
    }

    private static function module(
        string $id,
        string $title,
        string $summary,
        array $features,
        array $guidelines,
        array $workflowSteps
    ): array {
        return [
            'id' => $id,
            'title' => $title,
            'summary' => $summary,
            'content' => self::buildDocument($id, $title, $summary, $features, $guidelines, $workflowSteps),
        ];
    }

    private static function buildDocument(
        string $id,
        string $title,
        string $summary,
        array $features,
        array $guidelines,
        array $workflowSteps
    ): string {
        $featureItems = e(implode(', ', $features));
        $roleFocusItems = self::listItems(self::moduleRoleFocus($id));
        $guidelineItems = self::listItems($guidelines);
        $workflowItems = self::listItems($workflowSteps);
        $validationItems = self::listItems(self::moduleValidationChecklist($id));
        $handoffItems = self::listItems(self::moduleHandoffNotes($id));

        return <<<HTML
<article>
  <h1>{$title}</h1>
  <p>{$summary}</p>
  <h2>Module Purpose</h2>
  <p>Use this module when the task belongs to {$title} operations and the staff member needs to create, review, update, or complete records related to this area.</p>
  <h2>What This Module Covers</h2>
  <p>{$featureItems}</p>
  <h2>Role Focus</h2>
  <ul>{$roleFocusItems}</ul>
  <h2>Before You Start</h2>
  <ul>{$guidelineItems}</ul>
  <h2>Usage Flow</h2>
  <ol>{$workflowItems}</ol>
  <h2>Validation Checklist</h2>
  <ul>{$validationItems}</ul>
  <h2>Handoff And Follow-up</h2>
  <ul>{$handoffItems}</ul>
  <h2>Expected Outcome</h2>
  <p>After completing the workflow in {$title}, the related records should be updated, traceable, and ready for the next operational handoff or report.</p>
</article>
HTML;
    }

    private static function moduleRoleFocus(string $id): array
    {
        return match ($id) {
            'dashboard' => [
                'Admins and operational leads use Dashboard first to identify pending work and exceptions.',
                'Daily users should move from the dashboard into the source module instead of treating summary cards as the final record.',
            ],
            'students' => [
                'Admins, receptionists, and authorized academic staff use Students to manage the active student lifecycle.',
                'This module is the reference point before changing transport, hostel, fee, or academic-linked records.',
            ],
            'users' => [
                'Admins and superadmin-level operators use Users to provision and control staff access.',
                'This module should be handled carefully because role or status changes immediately affect operational access.',
            ],
            'academics' => [
                'Academic coordinators, admins, and teachers use Academics to maintain the instructional structure of the school.',
                'Most timetable, lesson, and promotion workflows depend on this module being configured correctly first.',
            ],
            'front-office' => [
                'Reception and admin teams use Front Office to track live desk activity and institutional interactions.',
                'Entries in this module often become the starting point for later admissions, complaints, or communication follow-up.',
            ],
            'fees-finance' => [
                'Admins and finance teams use this module for monetary records that affect dues, receipts, and reporting.',
                'Teams should work from verified student or accounting context before posting any transaction.',
            ],
            'hostel' => [
                'Hostel administrators and school admins use Hostel to manage residential capacity and student allocation.',
                'This module should be coordinated with student, fee, and transport data whenever boarding arrangements change.',
            ],
            'attendance' => [
                'Teachers and admins use Attendance as a time-sensitive daily classroom task.',
                'Because reports and notifications depend on this module, entries should be completed during the designated attendance window.',
            ],
            'exams' => [
                'Exam coordinators, admins, and authorized teachers use Exams to manage the offline assessment cycle.',
                'This module should be treated as controlled academic data because hall tickets, marksheets, and results depend on it.',
            ],
            'online-exams' => [
                'Academic staff use Online Exams for scheduled digital assessments and submission review.',
                'Publishing or changing settings here directly affects student access, timing, and result integrity.',
            ],
            'communication' => [
                'Admins, teachers, and office teams use Communication to distribute information and collect responses.',
                'Pick the communication channel based on urgency, audience size, and the need for a permanent audit trail.',
            ],
            'certificates' => [
                'Admins and authorized academic staff use Certificates to generate formal printable documents.',
                'This module should only be used after the underlying student or result data is fully verified.',
            ],
            'library' => [
                'Librarians, admins, and authorized staff use Library to manage circulation and inventory of books.',
                'This module is operationally strongest when book masters, member data, and due dates are maintained daily.',
            ],
            'inventory' => [
                'Admins, storekeepers, and operations teams use Inventory to maintain stock visibility and issue history.',
                'Teams should create master data first so stock and issue records stay categorized and reportable.',
            ],
            'transport' => [
                'Transport coordinators and admins use Transport to plan and run routes, vehicles, and assignments.',
                'This module should stay aligned with student movement and capacity planning throughout the session.',
            ],
            'reports' => [
                'Admins and management use Reports to review trends, compliance, and operational accuracy.',
                'Reports should be used for review and decisions, while corrections should always be made in the originating module.',
            ],
            'knowledge-base' => [
                'Superadmin maintains the Knowledge Base so staff have one operational reference for common workflows.',
                'Staff should use this module as guidance and then complete work in the source module referenced by the documentation.',
            ],
            'settings' => [
                'Admins use Settings for system-wide configuration that changes behavior across multiple modules.',
                'Because settings can alter permissions and workflows, these changes should be reviewed before and after save.',
            ],
            'website' => [
                'Admins and content owners use Website CMS for public pages, admissions-facing copy, and media updates.',
                'This module affects public communication, so edits should be reviewed like published content, not internal notes.',
            ],
            'account' => [
                'Each user uses Account & Profile to keep personal details and access credentials current.',
                'This module is personal in scope and should not be used for broader organization-level changes.',
            ],
            default => [
                'Authorized staff should use this module only within their role and permission scope.',
                'Changes here should be completed in a way that leaves records clear for the next user in the workflow.',
            ],
        };
    }

    private static function moduleValidationChecklist(string $id): array
    {
        return match ($id) {
            'dashboard' => [
                'Confirm whether the alert represents a real exception or just an informational summary.',
                'Open the linked module before taking action so the source record is reviewed in context.',
                'Recheck the dashboard later to confirm the pending indicator has cleared if expected.',
            ],
            'students' => [
                'Verify student identity, class, guardian details, and active status before editing records.',
                'Check whether the student has linked fee, attendance, transport, hostel, or academic dependencies.',
                'Confirm the updated data is visible in the student profile after save.',
            ],
            'users' => [
                'Confirm the correct role, organization scope, and status before saving the user.',
                'Review permission impact if the user is being promoted, restricted, or deactivated.',
                'Ensure the user can access only the required modules after the change.',
            ],
            'academics' => [
                'Check that the active session and class structure are correct before creating academic records.',
                'Review whether timetable, subject, lesson, and promotion changes will affect other academic flows.',
                'Confirm the updated setup appears correctly for staff and classes after save.',
            ],
            'front-office' => [
                'Verify contact details, date, responsibility owner, and case context before submission.',
                'Make sure the record contains enough detail for another staff member to continue follow-up.',
                'Close or escalate the entry only after the operational outcome is captured.',
            ],
            'fees-finance' => [
                'Verify the student, fee structure, category, amount, and payment mode before posting.',
                'Check whether the transaction belongs under fee collection, income, or expense.',
                'Confirm the resulting balance, receipt trail, or ledger context after the entry is saved.',
            ],
            'hostel' => [
                'Confirm room, bed, and occupancy availability before allocation.',
                'Verify the student is eligible and that hostel fee settings are already configured.',
                'Check the final allocation or fee entry after save to avoid duplicate boarding records.',
            ],
            'attendance' => [
                'Confirm the class, date, and active session before marking attendance.',
                'Review absentees before submission so the wrong students are not marked absent.',
                'Reopen and correct records promptly if a discrepancy is noticed later in the day.',
            ],
            'exams' => [
                'Verify the exam name, class scope, dates, and subjects before publishing schedules.',
                'Check result accuracy before generating any hall ticket or marksheet output.',
                'Make sure corrected marks are saved in the exam records before issuing revised documents.',
            ],
            'online-exams' => [
                'Confirm target classes, sections, start time, end time, and duration before publishing.',
                'Review whether the question set and attempt rules match the intended exam policy.',
                'Check attempts and results after completion for missing or abnormal submissions.',
            ],
            'communication' => [
                'Verify audience, message text, attachments, and scheduling before sending or publishing.',
                'Choose the correct channel so the communication record matches the intended level of urgency.',
                'Review logs, responses, or delivery outcomes where the feature supports tracking.',
            ],
            'certificates' => [
                'Confirm the student, template, and academic context before generating the document.',
                'Preview the output to ensure names, dates, and result details are accurate.',
                'Regenerate only after correcting the source data if an error is discovered.',
            ],
            'library' => [
                'Verify book availability, member eligibility, and due date before issue.',
                'Check return status and fines or overdue conditions when closing circulation records.',
                'Confirm catalog and circulation history remain accurate after every transaction.',
            ],
            'inventory' => [
                'Verify category, store, supplier, item, quantity, and unit context before saving stock activity.',
                'Check whether the action is a stock addition, adjustment, or issue to a user or department.',
                'Confirm balances after the transaction so physical and system stock remain aligned.',
            ],
            'transport' => [
                'Verify route, stop, vehicle, and assignment capacity before confirming changes.',
                'Check that the correct students or staff are mapped to the correct route and trip context.',
                'Review daily trip or assignment records after updates to avoid duplicate mapping.',
            ],
            'reports' => [
                'Confirm filters, organization context, and date range before interpreting the report.',
                'Validate major outliers by tracing them back to the source module.',
                'Share or export only after you are confident the underlying data is current.',
            ],
            'knowledge-base' => [
                'Check that the guidance matches the actual current workflow in the source module.',
                'Review HTML formatting, headings, and readability before publishing changes.',
                'Open the staff-facing Knowledge Base page after saving to confirm the document renders correctly.',
            ],
            'settings' => [
                'Verify that the change belongs to the correct settings area before editing.',
                'Review which modules or users will be affected after the configuration update.',
                'Test the affected workflow after save, especially for permissions and communication settings.',
            ],
            'website' => [
                'Check copy, images, section order, and branding before publishing.',
                'Confirm whether the public content change affects admissions or campaign messaging.',
                'Review the public-facing page after save to ensure layout and messaging are correct.',
            ],
            'account' => [
                'Confirm personal details before saving profile changes.',
                'Complete any verification step required for sensitive updates such as email.',
                'Log back in or refresh the profile view if needed to confirm the change is active.',
            ],
            default => [
                'Verify the primary record and its related context before saving.',
                'Check that the update follows the intended workflow and permission scope.',
                'Confirm the final state is visible and usable for the next staff member.',
            ],
        };
    }

    private static function moduleHandoffNotes(string $id): array
    {
        return match ($id) {
            'dashboard' => [
                'Handoff happens by opening the linked module and completing the underlying operational task.',
                'If an alert cannot be resolved immediately, note the owner and expected follow-up in the relevant module.',
            ],
            'students' => [
                'After student updates, notify finance, transport, hostel, or academic teams if their workflows are affected.',
                'Admission conversions should be followed by downstream setup such as fees, classes, and login readiness.',
            ],
            'users' => [
                'After creating or changing a staff account, communicate access expectations to the user or department head.',
                'Deactivations should be coordinated with any team that may still be expecting work from that user.',
            ],
            'academics' => [
                'Once academic structures change, confirm that teachers and affected classes can follow the updated plan.',
                'Promotion or timetable changes should be communicated before the next teaching cycle begins.',
            ],
            'front-office' => [
                'Escalate incomplete enquiries, complaints, or visitor follow-ups to the responsible team without delay.',
                'Use clear notes so the next operator understands the current status and expected next action.',
            ],
            'fees-finance' => [
                'Share payment or dues updates with the concerned student-facing or administrative team when needed.',
                'Flag reversals, mismatches, or exceptional entries early so finance reports remain trustworthy.',
            ],
            'hostel' => [
                'Coordinate hostel changes with student records, fee collection, and guardians where applicable.',
                'Any occupancy issue should be handed off with room, bed, and student context clearly noted.',
            ],
            'attendance' => [
                'Attendance outcomes feed reports and may trigger communication or review, so submission should not be delayed.',
                'Escalate recurring absentee patterns to the academic or administrative team for intervention.',
            ],
            'exams' => [
                'Once exams or results are finalized, inform teams responsible for hall tickets, marksheets, or publication.',
                'Corrections should be routed back to the exam record before any final document is reissued.',
            ],
            'online-exams' => [
                'After exam completion, hand off attempts and results for academic review or remedial action.',
                'Any timing, access, or submission anomaly should be documented before closing the exam cycle.',
            ],
            'communication' => [
                'After publishing or sending, monitor the response path that belongs to the chosen channel.',
                'If the message requires action, identify the team that owns the next operational step.',
            ],
            'certificates' => [
                'Issued documents should be handed off only after preview and verification are complete.',
                'Any document error should trigger a source-data correction before reissuing the final copy.',
            ],
            'library' => [
                'Overdues, lost books, or pending requests should be handed off with member and item details.',
                'Keep circulation outcomes current so the next librarian sees accurate availability.',
            ],
            'inventory' => [
                'Issued stock should be traceable to the receiving department, person, or operational purpose.',
                'Escalate shortages, stock mismatches, or supplier issues as soon as they are identified.',
            ],
            'transport' => [
                'Route or assignment updates should be communicated to affected operations staff before execution.',
                'Daily trip issues should be logged clearly so the next shift or reviewer has full context.',
            ],
            'reports' => [
                'Use the report to start action in the source module, not to replace correction there.',
                'Share report findings with the team that owns the underlying operational records.',
            ],
            'knowledge-base' => [
                'After documentation updates, staff should be directed to the Knowledge Base as the latest working reference.',
                'When workflows change in the product, update the Knowledge Base promptly so it stays operationally correct.',
            ],
            'settings' => [
                'Communicate impactful configuration changes to affected users before or immediately after activation.',
                'If a setting changes module behavior, verify the downstream team can complete its workflow normally.',
            ],
            'website' => [
                'After publishing, align admissions or communication teams if the public message has changed.',
                'Track whether related inbound enquiries or campaign activity need corresponding operational follow-up.',
            ],
            'account' => [
                'Profile changes usually end with the user confirming access still works as expected.',
                'If login, email, or contact data changes create issues, escalate to the admin team with clear context.',
            ],
            default => [
                'Make sure the next owner in the workflow knows what was completed and what remains pending.',
                'Leave enough record detail that the handoff can continue without rework or guesswork.',
            ],
        };
    }

    private static function listItems(array $items): string
    {
        return collect($items)
            ->map(fn (string $item) => '<li>' . e($item) . '</li>')
            ->implode('');
    }

    private static function faqAnswerMap(): array
    {
        return [
            'Dashboard Home' => self::answer('Review dashboard cards and alerts first, then open the linked module for action. Treat the dashboard as a starting summary and complete edits in the relevant module.'),
            'Search Students' => self::answer('Use filters or search terms to find the student record quickly, then open Student Details before making major updates. Confirm organization, class, and status to avoid editing the wrong profile.'),
            'Student Details' => self::answer('Open Student Details when you need a full view of profile, academic, fee, and linked operational context. Review here first so downstream edits remain intentional and traceable.'),
            'Edit Student' => self::answer('Update student data only after verifying identity, class placement, guardian details, and linked dependencies like transport or hostel. Save corrections promptly so attendance, fees, and reports stay aligned.'),
            'Online Admission' => self::answer('Use Online Admission to review incoming applications, validate documents, and convert approved applicants into student records. Complete the conversion only after the enquiry has been fully verified.'),
            'Bulk Delete Students' => self::answer('Reserve bulk deletion for controlled cleanup cases. Review linked fees, attendance, academic history, and admissions context before removing records so historical data is not lost unintentionally.'),
            'Alumni Records' => self::answer('Move students into Alumni Records only after graduation, transfer, or exit has been formally confirmed. Use alumni status to preserve history without leaving students active in daily operations.'),
            'User Management' => self::answer('Create, update, deactivate, or reset staff accounts from User Management. Always confirm the user role and permission scope before granting access.'),
            'Class / Section' => self::answer('Set up class and section structure before assigning subjects, timetables, or promotions. This is the academic foundation for many other modules.'),
            'Class Time Table' => self::answer('Build or update class timetables after classes, sections, and subjects are finalized. Recheck conflicts before publishing schedules to staff or students.'),
            'Teachers Time Table' => self::answer('Use Teachers Time Table to balance staff teaching schedules and avoid overlaps. Review changes against class timetable updates so both views stay synchronized.'),
            'Lesson Plan' => self::answer('Publish lesson plans class-wise and subject-wise to keep teaching aligned with the session plan. Update plans when actual instruction pacing changes.'),
            'Homework' => self::answer('Use Homework to assign, track, and review class work outside the classroom. Confirm class, subject, due date, and instructions before publishing.'),
            'Subjects' => self::answer('Manage subject masters before timetable planning and lesson planning. Ensure subject names and mappings are correct for each class structure.'),
            'Promote Students' => self::answer('Promote Students should be run only after year-end academic verification. Confirm target class availability and current session configuration before proceeding.'),
            'Admission Enquiry' => self::answer('Capture complete contact and follow-up details when logging an enquiry. Strong enquiry data makes later admission conversion easier and more accurate.'),
            'Visitor Register' => self::answer('Record visitors at the time of entry with purpose, host, and contact details. Update the record when the visit is completed if your process requires closure.'),
            'Phone Call Log' => self::answer('Use Phone Call Log to document incoming and outgoing calls that need operational traceability. Include caller details, purpose, and follow-up owner.'),
            'Postal Dispatch' => self::answer('Record outgoing courier or postal items with recipient, date, and reference details. This helps teams trace document movement later.'),
            'Postal Delivery' => self::answer('Log inbound postal deliveries as they are received so documents or packages can be tracked and handed over correctly.'),
            'Complains' => self::answer('Use Complains to register issues, assign responsibility, and track resolution. Add enough detail that another staff member can continue the case if needed.'),
            'Fees Management' => self::answer('Use Fees Management to collect, track, and review student fee payments against configured fee structures. Always verify the student and balance before posting a payment.'),
            'Income Management' => self::answer('Record non-fee income with category, amount, and payment context so finance reports remain complete. Enter transactions promptly and consistently.'),
            'Expense Management' => self::answer('Use Expense Management for institutional spending records and keep expense categories clean. Accurate entry improves auditability and reporting.'),
            'Hostel Management' => self::answer('Manage hostels, rooms, beds, allocations, and hostel fees from this module. Confirm room capacity and student status before allocating beds.'),
            'Attendance Management' => self::answer('Mark attendance at the defined daily time, usually during the first active period. Review absences before submit so reports and notifications stay accurate.'),
            'Exam Management' => self::answer('Create exams, attach schedules, and manage results here. Final documents such as hall tickets or marksheets should only be generated after data verification.'),
            'Online Exams' => self::answer('Use Online Exams to configure digital tests, assign target classes or sections, and review submissions. Double-check timing and audience settings before publishing.'),
            'Feedback Management' => self::answer('Create feedback campaigns with a clear audience and purpose. Review responses after launch so teams can close the loop on findings.'),
            'Certificate Management' => self::answer('Use Certificate Management to prepare templates and generate student certificates. Preview carefully before issuing official copies.'),
            'Marksheet Management' => self::answer('Generate marksheets only after result data is complete and verified. Any corrections should be made in the source exam records first.'),
            'Student ID Card Management' => self::answer('Create or regenerate student ID cards from the approved template after confirming identity, class, and core profile details.'),
            'Library Management' => self::answer('Manage books, members, circulation, and requests from Library Management. Keep issue and return transactions up to date for reliable availability tracking.'),
            'Inventory Management' => self::answer('Use Inventory Management to maintain categories, stores, suppliers, stock entries, and issues. Record every movement so stock reports stay dependable.'),
            'Messages' => self::answer('Use Messages for direct communication to targeted recipients or groups. Review the audience before sending to avoid cross-team confusion.'),
            'Notice Board' => self::answer('Publish Notice Board updates for broad announcements that many users need to see. Keep titles and dates clear for easy scanning.'),
            'Voice Calls' => self::answer('Use Voice Calls when phone-based outreach or notifications are required. Review logs and delivery outcomes where available.'),
            'Send Emails' => self::answer('Use Send Emails for documented communication that may need attachments, subject lines, or formal record keeping. Verify recipient lists before sending.'),
            'Download Center' => self::answer('Store and share reusable files such as circulars, forms, or learning materials in Download Center. Keep file names and descriptions clear for staff and students.'),
            'Transport Management' => self::answer('Manage transport routes, vehicles, assignments, and trips here. Update assignments whenever operational capacity or routes change.'),
            'Reports & Analytics' => self::answer('Use reports to evaluate patterns and performance across modules. If you find incorrect numbers, correct the source data in the originating module.'),
            'Knowledge Base' => self::answer('Knowledge Base is the shared operational help center for staff. Superadmin can edit HTML documentation and FAQs centrally from the CMS.'),
            'General Setting' => self::answer('Use General Setting for organization-level configuration that affects daily operations. Review the downstream impact before saving changes.'),
            'Communication Setting' => self::answer('Manage communication-related defaults and configuration here. Validate that messaging channels still work after updating settings.'),
            'Roles & Permissions' => self::answer('Use Roles & Permissions to control who can view or change each feature. Confirm changes carefully because access updates take effect immediately.'),
            'Sessions' => self::answer('Use Sessions to manage academic years or active sessions that drive class, timetable, and promotion workflows. Set the active session correctly before rollover tasks.'),
            'Website CMS' => self::answer('Use Website CMS for public-facing website sections rather than internal operational help. Review branding, copy, and media before publishing.'),
            'Profile' => self::answer('Open Profile to review your personal account details and current information. This is intended for account visibility, not organization configuration.'),
            'Edit Profile' => self::answer('Use Edit Profile to update your own supported account details. Complete any verification steps required for sensitive changes such as email updates.'),
        ];
    }

    private static function genericFaqAnswer(string $module, string $feature): string
    {
        return self::answer("Use {$feature} within the {$module} module after verifying that the related records and permissions are in place. Review the module documentation for the recommended workflow before making major updates.");
    }

    private static function answer(string $text): string
    {
        $escaped = e($text);

        return <<<HTML
<article>
  <p>{$escaped}</p>
</article>
HTML;
    }
}
