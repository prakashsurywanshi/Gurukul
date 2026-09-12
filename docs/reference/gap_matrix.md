# QGurukul <- Multi School ERP v3.6 - Sidebar Gap Matrix (School Admin)

Source: live capture of https://demo.multischoolerp.com/demo-login/schooladmin
Saved JSON trees: docs/reference/sidebar_*.json

Status legend:
- **EXISTS** - our sidebar already has this exact label/page
- **RENAME** - page exists, adopt reference label/icon
- **EXISTS-FOLDER** - a route folder exists under a different name (verify target)
- **NEW** - needs a newly built page

Counts: {'`nav-icon fas fa-fw fa-tachometer-alt `': 23, '`nav-icon fas fa-fw fa-compass `': 1, '`nav-icon fas fa-fw fa-life-ring `': 1, '`nav-icon fas fa-fw fa-hand-holding-usd `': 1, '`nav-icon fas fa-fw fa-file-invoice-dollar `': 2, '`nav-icon fas fa fa-exchange `': 1, '`nav-icon fas fa-fw fa-globe `': 1, '`nav-icon fas fa-fw fa-file-invoice `': 2, '`nav-icon fas fa-fw fa-user-tag `': 2, '`nav-icon fas fa-fw fa-angle-double-right `': 1, '`nav-icon fas fa-fw fa-layer-group `': 3, '`nav-icon fas fa-fw fa-percent `': 1, '`nav-icon fas fa-fw fa-tags `': 8, '`nav-icon fas fa-fw fa-history `': 3, '`nav-icon fas fa-fw fa-user-shield `': 2, '`nav-icon fas fa-fw fa-file-import `': 1, '`nav-icon fas fa-fw fa-arrow-down `': 1, '`nav-icon fas fa-fw fa-arrow-up `': 1, '`nav-icon fas fa-fw fa-university `': 1, '`nav-icon fas fa-fw fa-user-plus `': 1, '`nav-icon fas fa-fw fa-users `': 3, '`nav-icon fas fa-fw fa-camera-retro `': 1, '`nav-icon fas fa-fw fa-user-friends `': 1, '`nav-icon fas fa-fw fa-calendar-check `': 3, '`nav-icon fas fa-fw fa-address-book `': 1, '`nav-icon fas fa-home `': 1, '`nav-icon fas fa-fw fa-user-slash `': 1, '`nav-icon fas fa-fw fa-heartbeat `': 1, '`nav-icon fas fa-fw fa-trash-restore `': 1, '`nav-icon fas fa-fw fa-th-large `': 2, '`nav-icon fas fa-fw fa-calendar-alt `': 4, '`nav-icon fas fa-fw fa-chalkboard `': 1, '`nav-icon fas fa-fw fa-book `': 3, '`nav-icon fas fa-fw fa-link `': 1, '`nav-icon fas fa-fw fa-list-ol `': 2, '`nav-icon fas fa-fw fa-chalkboard-teacher `': 2, '`nav-icon fas fa-fw fa-clock `': 1, '`nav-icon fas fa-fw fa-table `': 1, '`nav-icon fas fa-fw fa-angle-double-up `': 1, '`nav-icon fas fa-fw fa-file-alt `': 3, '`nav-icon fas fa-fw fa-images `': 2, '`nav-icon fas fa-fw fa-swimmer `': 1, '`nav-icon fas fa-fw fa-quote-left `': 1, '`nav-icon fas fa-fw fa-bars `': 1, '`nav-icon fas fa-fw fa-clipboard-check `': 5, '`nav-icon fas fa-fw fa-magic `': 1, '`nav-icon fas fa-fw fa-paint-brush `': 1, '`nav-icon fas fa-fw fa-code `': 1, '`nav-icon fas fa-fw fa-desktop `': 1, '`nav-icon fas fa-fw fa-user-tie `': 1, '`nav-icon fas fa-fw fa-exclamation-circle `': 1, '`nav-icon fas fa-fw fa-mail-bulk `': 1, '`nav-icon fas fa-fw fa-door-open `': 2, '`nav-icon fas fa-fw fa-qrcode `': 1, '`nav-icon fas fa-fw fa-hard-hat `': 1, '`nav-icon fas fa-fw fa-columns `': 1, '`nav-icon fas fa-fw fa-sliders-h `': 3, '`nav-icon fas fa-fw fa-list-alt `': 2, '`nav-icon fas fa-fw fa-edit `': 3, '`nav-icon fas fa-fw fa-palette `': 5, '`nav-icon fas fa-fw fa-star `': 2, '`nav-icon fas fa-fw fa-award `': 1, '`nav-icon fas fa-fw fa-tools `': 2, '`nav-icon fas fa-fw fa-print `': 2, '`nav-icon fas fa-fw fa-file-upload `': 1, '`nav-icon fas fa-fw fa-tasks `': 4, '`nav-icon fas fa-fw fa-comment-dots `': 2, '`nav-icon fas fa-fw fa-stream `': 1, '`nav-icon fas fa-fw fa-route `': 1, '`nav-icon fas fa-fw fa-file-pdf `': 1, '`nav-icon fas fa-fw fa-sitemap `': 3, '`nav-icon fas fa-fw fa-id-card `': 4, '`nav-icon fas fa-fw fa-receipt `': 2, '`nav-icon fas fa-fw fa-money-check-alt `': 2, '`nav-icon fas fa-fw fa-check-circle `': 1, '`nav-icon fas fa-fw fa-clipboard-list `': 6, '`nav-icon fas fa-fw fa-building `': 2, '`nav-icon fas fa-fw fa-id-badge `': 2, '`nav-icon fas fa-fw fa-cog `': 4, '`nav-icon fas fa-fw fa-piggy-bank `': 1, '`nav-icon fas fa-fw fa-list-check `': 1, '`nav-icon fas fa-fw fa-star-half-alt `': 1, '`nav-icon fas fa-fw fa-handshake `': 1, '`nav-icon fas fa-fw fa-book-open `': 6, '`nav-icon fas fa-fw fa-chart-bar `': 4, '`nav-icon fas fa-fw fa-user-check `': 2, '`nav-icon fas fa-fw fa-stamp `': 1, '`nav-icon fas fa-fw fa-chart-line `': 3, '`nav-icon fas fa-fw fa-pen-nib `': 1, '`nav-icon fas fa-fw fa-balance-scale `': 1, '`nav-icon fas fa-fw fa-shield-alt `': 3, '`nav-icon fas fa-fw fa-fingerprint `': 1, '`nav-icon fas fa-fw fa-terminal `': 1, '`nav-icon fas fa-fw fa-list-ul `': 1, '`nav-icon fas fa-fw fa-inbox `': 1, '`nav-icon fas fa-fw fa-school `': 1, '`nav-icon fas fa-fw fa-box-open `': 1, '`nav-icon fas fa-fw fa-folder-open `': 1, '`nav-icon fas fa-fw fa-check-double `': 1, '`nav-icon fas fa-fw fa-file-export `': 1, '`nav-icon fas fa-fw fa-th `': 1, '`nav-icon fas fa-fw fa-folder `': 1, '`nav-icon fas fa-fw fa-user-graduate `': 1, '`nav-icon fas fa-fw fa-calendar-star `': 1, '`nav-icon fas fa-fw fa-pen-alt `': 1, '`nav-icon fas fa-fw fa-exchange-alt `': 1, '`nav-icon fas fa-fw fa-share-square `': 1, '`nav-icon fas fa-fw fa-plus-square `': 2, '`nav-icon fas fa-fw fa-boxes `': 1, '`nav-icon fas fa-fw fa-truck `': 2, '`nav-icon fas fa-fw fa-cash-register `': 1, '`nav-icon fas fa-fw fa-dolly `': 1, '`nav-icon fas fa-fw fa-satellite-dish `': 1, '`nav-icon fas fa-fw fa-road `': 1, '`nav-icon fas fa-fw fa-map-marked-alt `': 1, '`nav-icon fas fa-fw fa-bed `': 1, '`nav-icon fas fa-fw fa-robot `': 1, '`nav-icon fas fa-fw fa-cubes `': 2, '`nav-icon fas fa-fw fa-people-carry `': 1, '`nav-icon fas fa-fw fa-recycle `': 1, '`nav-icon fas fa-fw fa-birthday-cake `': 1, '`nav-icon fas fa-fw fa-gift `': 1, '`nav-icon fas fa-fw fa-video `': 1, '`nav-icon fas fa-fw fa-user-clock `': 1, '`nav-icon fas fa-fw fa-chart-pie `': 1, '`nav-icon fas fa-fw fa-cogs `': 1, '`nav-icon fas fa-fw fa-credit-card `': 1, '`nav-icon fas fa-fw fa-bell `': 2, '`nav-icon fas fa-fw fa-eye-slash `': 1, '`nav-icon fas fa-fw fa-rocket `': 2, '`nav-icon fas fa-fw fa-hdd `': 1, '`nav-icon fas fa-fw fa-wallet `': 1, '`nav-icon fas fa-fw fa-comments `': 1, '`nav-icon fas fa-fw fa-sign-out-alt text-danger `': 1}

| - | Dashboard | `/school/dashboard` | `nav-icon fas fa-fw fa-tachometer-alt ` | EXISTS | `/dashboard` |
| - | ERP Navigator | `/school/explore` | `nav-icon fas fa-fw fa-compass ` | EXISTS | `/explore` |
| - | Contact Support | `/school/support` | `nav-icon fas fa-fw fa-life-ring ` | NEW |  |

## Finance & Fees

| # | Reference label | Demo path | Ref icon | Status | Match/Ours |
|---|---|---|---|---|---|
| - | Fees Dashboard | `/school/fees-dashboard` | `nav-icon fas fa-fw fa-tachometer-alt ` | EXISTS | `/fees-dashboard` |
| - | Collect Fees | `/school/collect-fees` | `nav-icon fas fa-fw fa-hand-holding-usd ` | RENAME | `Fees Dashboard` -> `/fees-dashboard` |
| - | Search Due Fees | `/school/due-fees` | `nav-icon fas fa-fw fa-file-invoice-dollar ` | RENAME | `Fees Dashboard` -> `/fees-dashboard` |
| - | All Transactions | `/school/transactions` | `nav-icon fas fa fa-exchange ` | NEW |  |
| - | Online Transactions | `/school/online-payments` | `nav-icon fas fa-fw fa-globe ` | RENAME | `Online Classes` -> `/online-classes` |
| - | Fee Challans | `/school/fee-challans` | `nav-icon fas fa-fw fa-file-invoice ` | EXISTS | `/fee-challans` |
| - | Assign Fees | `/school/assign-fees` | `nav-icon fas fa-fw fa-user-tag ` | EXISTS | `/assign-fees` |
| - | Fees Carry Forward | `/school/fees-carry-forward` | `nav-icon fas fa-fw fa-angle-double-right ` | RENAME | `Fees Dashboard` -> `/fees-dashboard` |
| - | Fee Groups | `/school/fee-groups` | `nav-icon fas fa-fw fa-layer-group ` | EXISTS | `/fee-groups` |
| - | Fees Discount | `/school/fee-discounts` | `nav-icon fas fa-fw fa-percent ` | RENAME | `Fees Dashboard` -> `/fees-dashboard` |
| - | Fee Types | `/school/fee-types` | `nav-icon fas fa-fw fa-tags ` | RENAME | `Fee Challans` -> `/fee-challans` |
| - | Generate Due Slip | `/school/due-slips` | `nav-icon fas fa-fw fa-file-invoice-dollar ` | RENAME | `Due Slips` -> `/due-slips` |
| - | Due Slip History | `/school/due-slips/history` | `nav-icon fas fa-fw fa-history ` | RENAME | `Due Slips` -> `/due-slips` |
| - | Fee Data Audit | `/school/fee-audit` | `nav-icon fas fa-fw fa-user-shield ` | RENAME | `Fee Audit` -> `/fee-audit` |
| - | Import Center | `/school/fee-imports` | `nav-icon fas fa-fw fa-file-import ` | EXISTS | `/import-center` |

## Accounts

| # | Reference label | Demo path | Ref icon | Status | Match/Ours |
|---|---|---|---|---|---|
| - | Accounts Dashboard | `/school/accounting/dashboard` | `nav-icon fas fa-fw fa-tachometer-alt ` | EXISTS | `/accounts-dashboard` |
| - | Income | `/school/accounts/incomes` | `nav-icon fas fa-fw fa-arrow-down ` | EXISTS | `/income-management` |
| - | Expense | `/school/accounts/expenses` | `nav-icon fas fa-fw fa-arrow-up ` | RENAME | `Expense Heads` -> `/expense-heads` |
| - | Income Heads | `/school/accounts/income-heads` | `nav-icon fas fa-fw fa-tags ` | EXISTS | `/income-heads` |
| - | Expense Heads | `/school/accounts/expense-heads` | `nav-icon fas fa-fw fa-tags ` | EXISTS | `/expense-heads` |
| - | Bank Accounts | `/school/bank-accounts` | `nav-icon fas fa-fw fa-university ` | EXISTS | `/bank-accounts` |

## Student Information

| # | Reference label | Demo path | Ref icon | Status | Match/Ours |
|---|---|---|---|---|---|
| - | Student Dashboard | `/school/student-dashboard` | `nav-icon fas fa-fw fa-tachometer-alt ` | EXISTS | `/student-dashboard` |
| - | Student Admission | `/school/students/create` | `nav-icon fas fa-fw fa-user-plus ` | RENAME | `Student Health` -> `/student-health` |
| - | Student List | `/school/students` | `nav-icon fas fa-fw fa-users ` | RENAME | `Student Health` -> `/student-health` |
| - | Search by Photo | `/school/students-face-search` | `nav-icon fas fa-fw fa-camera-retro ` | RENAME | `Search Students` -> `/search_students` |
| - | Parents & Guardians | `/school/parents` | `nav-icon fas fa-fw fa-user-friends ` | EXISTS | `/parents` |
| - | Student Attendance | `/school/student-attendance` | `nav-icon fas fa-fw fa-calendar-check ` | RENAME | `Attendance` -> `/attendance` |
| - | Behavior Records | `/school/student-behavior` | `nav-icon fas fa-fw fa-address-book ` | RENAME | `Alumni Records` -> `/alumni-records` |
| - | Student Houses | `/school/student-houses` | `nav-icon fas fa-home ` | RENAME | `Student Health` -> `/student-health` |
| - | Student Categories | `/school/student-categories` | `nav-icon fas fa-fw fa-tags ` | RENAME | `Student Health` -> `/student-health` |
| - | TC & Exit | `/school/student-exits` | `nav-icon fas fa-fw fa-user-slash ` | EXISTS | `/student-exits` |
| - | Health Records | `/school/student-health` | `nav-icon fas fa-fw fa-heartbeat ` | RENAME | `Student Health` -> `/student-health` |
| - | Deleted Students | `/school/students-recycle-bin` | `nav-icon fas fa-fw fa-trash-restore ` | RENAME | `Students` -> `/students-menu` |

## Academics

| # | Reference label | Demo path | Ref icon | Status | Match/Ours |
|---|---|---|---|---|---|
| - | Academic Dashboard | `/school/academics/dashboard` | `nav-icon fas fa-fw fa-th-large ` | EXISTS | `/academic-dashboard` |
| - | Academic Sessions | `/school/academic-sessions` | `nav-icon fas fa-fw fa-calendar-alt ` | RENAME | `Academic Dashboard` -> `/academic-dashboard` |
| - | Classes | `/school/classes` | `nav-icon fas fa-fw fa-chalkboard ` | RENAME | `Online Classes` -> `/online-classes` |
| - | Sections | `/school/sections` | `nav-icon fas fa-fw fa-users ` | NEW |  |
| - | Subjects | `/school/subjects` | `nav-icon fas fa-fw fa-book ` | EXISTS | `/subjects` |
| - | Assign Subjects | `/school/assign-subjects` | `nav-icon fas fa-fw fa-link ` | RENAME | `Assign Fees` -> `/assign-fees` |
| - | Assign Electives | `/school/assign-electives` | `nav-icon fas fa-fw fa-list-ol ` | EXISTS | `/assign-electives` |
| - | Assign Class Teacher | `/school/assign-class-teacher` | `nav-icon fas fa-fw fa-chalkboard-teacher ` | EXISTS | `/assign-class-teacher` |
| - | Manage Periods | `/school/time-slots` | `nav-icon fas fa-fw fa-clock ` | EXISTS | `/time-slots` |
| - | Class Timetable | `/school/timetable` | `nav-icon fas fa-fw fa-table ` | RENAME | `Class / Section` -> `/classes` |
| - | Promote Students | `/school/promote-students` | `nav-icon fas fa-fw fa-angle-double-up ` | EXISTS | `/promote-students` |

## School Website

| # | Reference label | Demo path | Ref icon | Status | Match/Ours |
|---|---|---|---|---|---|
| - | Website Overview | `/school/website` | `nav-icon fas fa-fw fa-tachometer-alt ` | RENAME | `Website CMS` -> `/website-cms` |
| - | Pages | `/school/website/pages` | `nav-icon fas fa-fw fa-file-alt ` | EXISTS | `/pages-builder` |
| - | Hero Slides | `/school/website/slides` | `nav-icon fas fa-fw fa-images ` | NEW |  |
| - | Facilities | `/school/website/facilities` | `nav-icon fas fa-fw fa-swimmer ` | EXISTS | `/facilities` |
| - | Testimonials | `/school/website/testimonials` | `nav-icon fas fa-fw fa-quote-left ` | NEW |  |
| - | Navigation Menu | `/school/website/navigation` | `nav-icon fas fa-fw fa-bars ` | NEW |  |
| - | CBSE Disclosure | `/school/website/disclosure` | `nav-icon fas fa-fw fa-clipboard-check ` | EXISTS | `/cbse-disclosure` |
| - | Website Templates | `/school/website/templates` | `nav-icon fas fa-fw fa-magic ` | RENAME | `Website CMS` -> `/website-cms` |
| - | Design & Settings | `/school/website/settings` | `nav-icon fas fa-fw fa-paint-brush ` | RENAME | `Settings` -> `/settings` |
| - | Website (Full HTML) | `/school/landing-page` | `nav-icon fas fa-fw fa-code ` | RENAME | `Website CMS` -> `/website-cms` |

## Front Office

| # | Reference label | Demo path | Ref icon | Status | Match/Ours |
|---|---|---|---|---|---|
| - | Front Office Dashboard | `/school/front-office/dashboard` | `nav-icon fas fa-fw fa-desktop ` | EXISTS | `/front-office-dashboard` |
| - | Admission Enquiries | `/school/front-office/admission-enquiries` | `nav-icon fas fa-fw fa-user-tie ` | RENAME | `Online Admission` -> `/online-admission` |
| - | Visitor Book | `/school/front-office/visitor-logs` | `nav-icon fas fa-fw fa-book ` | RENAME | `Visitor Register` -> `/visitor-register` |
| - | Complaints | `/school/front-office/complaints` | `nav-icon fas fa-fw fa-exclamation-circle ` | EXISTS | `/complains` |
| - | Postal Records | `/school/front-office/postal-records` | `nav-icon fas fa-fw fa-mail-bulk ` | RENAME | `Alumni Records` -> `/alumni-records` |
| - | Gate Passes | `/school/front-office/gate-passes` | `nav-icon fas fa-fw fa-door-open ` | EXISTS | `/gate-passes` |
| - | Gate Terminal | `/school/front-office/gate-passes/gate` | `nav-icon fas fa-fw fa-qrcode ` | RENAME | `Gate Passes` -> `/gate-passes` |
| - | Campus Workers | `/school/front-office/campus-workers` | `nav-icon fas fa-fw fa-hard-hat ` | EXISTS | `/campus-workers` |

## Lead Management

| # | Reference label | Demo path | Ref icon | Status | Match/Ours |
|---|---|---|---|---|---|
| - | Lead Dashboard | `/school/leads/dashboard` | `nav-icon fas fa-fw fa-tachometer-alt ` | EXISTS | `/lead-dashboard` |
| - | Lead Pipeline Board | `/school/leads/board` | `nav-icon fas fa-fw fa-columns ` | RENAME | `Lead Dashboard` -> `/lead-dashboard` |
| - | Lead Sources & Stages | `/school/leads/settings` | `nav-icon fas fa-fw fa-sliders-h ` | RENAME | `Lead Dashboard` -> `/lead-dashboard` |

## Offline Examinations

| # | Reference label | Demo path | Ref icon | Status | Match/Ours |
|---|---|---|---|---|---|
| - | Exam Dashboard | `/school/exams-dashboard` | `nav-icon fas fa-fw fa-tachometer-alt ` | RENAME | `Online Exam Dashboard` -> `/online-exam-dashboard` |
| - | Manage Offline Exams | `/school/exams` | `nav-icon fas fa-fw fa-list-alt ` | RENAME | `Offline Exams` -> `/offline-exams` |
| - | Exam Types | `/school/exam-types` | `nav-icon fas fa-fw fa-tags ` | EXISTS | `/exam-types` |
| - | Schedule & Marks Setup | `/school/exam-schedule` | `nav-icon fas fa-fw fa-calendar-alt ` | RENAME | `Schedule Setup` -> `/exam-schedule-setup` |
| - | Enter Marks | `/school/exam-marks/entry` | `nav-icon fas fa-fw fa-edit ` | EXISTS | `/enter-marks` |
| - | Cocurricular Areas | `/school/cocurricular-areas` | `nav-icon fas fa-fw fa-palette ` | NEW |  |
| - | Cocurricular Grades | `/school/cocurricular-grades` | `nav-icon fas fa-fw fa-star ` | RENAME | `Manage Grades` -> `/manage-grades` |
| - | Manage Grades | `/school/grades` | `nav-icon fas fa-fw fa-award ` | EXISTS | `/manage-grades` |
| - | Report Card Setups | `/school/report-card-setups` | `nav-icon fas fa-fw fa-tools ` | EXISTS | `/report-card-setups` |
| - | Generate Marksheet | `/school/marksheet` | `nav-icon fas fa-fw fa-print ` | RENAME | `Print Marksheet` -> `/print-marksheet` |
| - | Upload Marksheet | `/school/marksheet/upload` | `nav-icon fas fa-fw fa-file-upload ` | RENAME | `Marksheet Upload` -> `/marksheet-upload` |
| - | Manage Uploads | `/school/marksheet/upload-list` | `nav-icon fas fa-fw fa-tasks ` | RENAME | `Manage Grades` -> `/manage-grades` |
| - | Teacher Remarks | `/school/marksheet-remarks` | `nav-icon fas fa-fw fa-comment-dots ` | RENAME | `Parent-Teacher Meeting` -> `/ptm` |
| - | Datesheet | `/school/datesheets` | `nav-icon fas fa-fw fa-calendar-alt ` | EXISTS | `/datesheets` |

## CBC Academics

| # | Reference label | Demo path | Ref icon | Status | Match/Ours |
|---|---|---|---|---|---|
| - | CBC Dashboard | `/school/cbc/dashboard` | `nav-icon fas fa-fw fa-tachometer-alt ` | EXISTS | `/cbc-dashboard` |
| - | Strands & Outcomes | `/school/cbc/strands` | `nav-icon fas fa-fw fa-stream ` | NEW |  |
| - | CBC Assessments | `/school/cbc/assessments` | `nav-icon fas fa-fw fa-tasks ` | RENAME | `CBC Dashboard` -> `/cbc-dashboard` |
| - | Core Competencies | `/school/cbc/competencies` | `nav-icon fas fa-fw fa-star ` | NEW |  |
| - | Pathways & Tracks | `/school/cbc/pathways` | `nav-icon fas fa-fw fa-route ` | NEW |  |
| - | CBC Reports | `/school/cbc/cbcreports` | `nav-icon fas fa-fw fa-file-pdf ` | RENAME | `Reports Center` -> `/reports` |

## Online Examinations

| # | Reference label | Demo path | Ref icon | Status | Match/Ours |
|---|---|---|---|---|---|
| - | Online Exam Dashboard | `/school/online-exam/dashboard` | `nav-icon fas fa-fw fa-tachometer-alt ` | EXISTS | `/online-exam-dashboard` |
| - | Manage Online Exams | `/school/online-exam/manage-exams` | `nav-icon fas fa-fw fa-edit ` | RENAME | `Online Exams` -> `/online-exams` |
| - | Question Bank | `/school/online-exam/question-bank` | `nav-icon fas fa-fw fa-list-alt ` | EXISTS | `/question-bank` |
| - | Chapters & Topics | `/school/online-exam/question-topics` | `nav-icon fas fa-fw fa-sitemap ` | EXISTS | `/chapters-topics` |

## Human Resource

| # | Reference label | Demo path | Ref icon | Status | Match/Ours |
|---|---|---|---|---|---|
| - | HR Dashboard | `/school/hr-dashboard` | `nav-icon fas fa-fw fa-tachometer-alt ` | EXISTS | `/hr-dashboard` |
| - | Staff Directory | `/school/staff` | `nav-icon fas fa-fw fa-id-card ` | EXISTS | `/staff-directory` |
| - | Staff Attendance | `/school/staff-attendance` | `nav-icon fas fa-fw fa-calendar-check ` | EXISTS | `/staff-daily-attendance` |
| - | Payroll | `/school/payroll` | `nav-icon fas fa-fw fa-receipt ` | RENAME | `Payroll Management` -> `/payroll-management` |
| - | Set Salary | `/school/staff-salary` | `nav-icon fas fa-fw fa-money-check-alt ` | RENAME | `Salary Templates` -> `/salary-templates` |
| - | Approve Leave | `/school/approve-leave` | `nav-icon fas fa-fw fa-check-circle ` | RENAME | `Leave Management` -> `/leave-management` |
| - | Leave Types | `/school/leave-types` | `nav-icon fas fa-fw fa-clipboard-list ` | EXISTS | `/leave-types` |
| - | Departments | `/school/departments` | `nav-icon fas fa-fw fa-building ` | NEW |  |
| - | Designations | `/school/designations` | `nav-icon fas fa-fw fa-user-tag ` | NEW |  |
| - | Staff ID Card | `/school/staff-id-card` | `nav-icon fas fa-fw fa-id-badge ` | RENAME | `Student ID Card` -> `/student-id-card` |
| - | HR Settings | `/school/hr-settings` | `nav-icon fas fa-fw fa-cog ` | RENAME | `HR / Payroll Settings` -> `/hr-settings` |
| - | Manage Staff Loans | `/school/loans` | `nav-icon fas fa-fw fa-piggy-bank ` | RENAME | `Staff Loans` -> `/staff-loans` |
| - | Salary Templates | `/school/salary-templates` | `nav-icon fas fa-fw fa-palette ` | EXISTS | `/salary-templates` |
| - | Appraisal Cycles | `/school/appraisal-cycles` | `nav-icon fas fa-fw fa-calendar-check ` | NEW |  |
| - | Appraisal Criteria | `/school/appraisal-criteria` | `nav-icon fas fa-fw fa-list-check ` | NEW |  |
| - | Appraisals | `/school/appraisals` | `nav-icon fas fa-fw fa-star-half-alt ` | RENAME | `Staff Appraisals` -> `/staff-appraisals` |

## PTM Meetings

| # | Reference label | Demo path | Ref icon | Status | Match/Ours |
|---|---|---|---|---|---|
| - | PTM Dashboard | `/school/ptm/dashboard` | `nav-icon fas fa-fw fa-tachometer-alt ` | EXISTS | `/ptm-dashboard` |
| - | PTM Schedule Meetings | `/school/ptm/meetings` | `nav-icon fas fa-fw fa-handshake ` | RENAME | `PTM Dashboard` -> `/ptm-dashboard` |
| - | PTM Guide | `/school/ptm/guide` | `nav-icon fas fa-fw fa-book-open ` | RENAME | `PTM Dashboard` -> `/ptm-dashboard` |
| - | PTM Attendance & Remarks | `/school/ptm/record` | `nav-icon fas fa-fw fa-clipboard-check ` | RENAME | `Attendance` -> `/attendance` |
| - | PTM Follow-ups | `/school/ptm/followups` | `nav-icon fas fa-fw fa-tasks ` | RENAME | `PTM Dashboard` -> `/ptm-dashboard` |
| - | PTM Reports | `/school/ptm/reports` | `nav-icon fas fa-fw fa-chart-bar ` | RENAME | `PTM Dashboard` -> `/ptm-dashboard` |

## Lesson Planner

| # | Reference label | Demo path | Ref icon | Status | Match/Ours |
|---|---|---|---|---|---|
| - | Lesson Planner Dashboard | `/school/lesson-plans/dashboard` | `nav-icon fas fa-fw fa-tachometer-alt ` | EXISTS | `/lesson-plan-dashboard` |
| - | Lesson Plans | `/school/lesson-plans/plans` | `nav-icon fas fa-fw fa-clipboard-list ` | RENAME | `Lesson Planner Dashboard` -> `/lesson-plan-dashboard` |
| - | Lesson Planner Guide | `/school/lesson-plans/guide` | `nav-icon fas fa-fw fa-book-open ` | RENAME | `Lesson Planner Dashboard` -> `/lesson-plan-dashboard` |
| - | Lesson Plan Review | `/school/lesson-plans/review` | `nav-icon fas fa-fw fa-user-check ` | RENAME | `Lesson Plan` -> `/lesson-plan` |
| - | Lesson Plan Approvals | `/school/lesson-plans/approvals` | `nav-icon fas fa-fw fa-stamp ` | RENAME | `Lesson Plan` -> `/lesson-plan` |
| - | Lesson Plan Coverage | `/school/lesson-plans/coverage` | `nav-icon fas fa-fw fa-clipboard-check ` | RENAME | `Lesson Plan` -> `/lesson-plan` |
| - | Lesson Plan Reports | `/school/lesson-plans/reports` | `nav-icon fas fa-fw fa-chart-line ` | RENAME | `Lesson Plan` -> `/lesson-plan` |
| - | Lesson Planner Settings | `/school/lesson-plans/settings` | `nav-icon fas fa-fw fa-cog ` | RENAME | `Lesson Planner Dashboard` -> `/lesson-plan-dashboard` |

## OSM Module

| # | Reference label | Demo path | Ref icon | Status | Match/Ours |
|---|---|---|---|---|---|
| - | OSM Dashboard | `/school/osm/dashboard` | `nav-icon fas fa-fw fa-tachometer-alt ` | EXISTS | `/osm-dashboard` |
| - | OSM Sessions | `/school/osm/sessions` | `nav-icon fas fa-fw fa-layer-group ` | RENAME | `OSM Dashboard` -> `/osm-dashboard` |
| - | OSM Evaluate | `/school/osm/evaluate` | `nav-icon fas fa-fw fa-pen-nib ` | RENAME | `OSM Dashboard` -> `/osm-dashboard` |
| - | OSM Reports | `/school/osm/reports` | `nav-icon fas fa-fw fa-chart-bar ` | RENAME | `Reports Center` -> `/reports` |
| - | OSM Guide | `/school/osm/guide` | `nav-icon fas fa-fw fa-book-open ` | RENAME | `OSM Dashboard` -> `/osm-dashboard` |
| - | OSM Moderation | `/school/osm/moderation` | `nav-icon fas fa-fw fa-balance-scale ` | RENAME | `OSM Dashboard` -> `/osm-dashboard` |

## QR Code Attendance

| # | Reference label | Demo path | Ref icon | Status | Match/Ours |
|---|---|---|---|---|---|
| - | QR Attendance | `/school/qr-attendance` | `nav-icon fas fa-fw fa-id-card ` | EXISTS | `/attendance-qr` |
| - | QR Attendance Setting | `/school/qr-attendance/settings` | `nav-icon fas fa-fw fa-cog ` | RENAME | `QR Attendance` -> `/attendance-qr` |
| - | QR Attendance Report | `/school/qr-attendance/report` | `nav-icon fas fa-fw fa-chart-bar ` | RENAME | `QR Attendance` -> `/attendance-qr` |
| - | QR Scan Audit | `/school/qr-attendance/audit` | `nav-icon fas fa-fw fa-shield-alt ` | EXISTS | `/qr-scan-audit` |

## Biometric Devices

| # | Reference label | Demo path | Ref icon | Status | Match/Ours |
|---|---|---|---|---|---|
| - | All Devices | `/school/biometric/devices` | `nav-icon fas fa-fw fa-fingerprint ` | RENAME | `Biometric Devices` -> `/biometric-devices` |
| - | Attendance Logs | `/school/biometric/logs` | `nav-icon fas fa-fw fa-clipboard-list ` | RENAME | `Attendance` -> `/attendance` |
| - | Face Monitoring | `/school/biometric/monitoring-logs` | `nav-icon fas fa-fw fa-shield-alt ` | RENAME | `Face Search` -> `/face-search` |
| - | Agent Logs | `/school/biometric/system-logs` | `nav-icon fas fa-fw fa-terminal ` | NEW |  |

## Assessment

| # | Reference label | Demo path | Ref icon | Status | Match/Ours |
|---|---|---|---|---|---|
| - | Assessment Dashboard | `/school/assessment/dashboard` | `nav-icon fas fa-fw fa-tachometer-alt ` | EXISTS | `/assessment-dashboard` |
| - | Assessments | `/school/assessment/assessments` | `nav-icon fas fa-fw fa-list-ol ` | NEW |  |
| - | Assessment Guide | `/school/assessment/guide` | `nav-icon fas fa-fw fa-book-open ` | RENAME | `Assessment Dashboard` -> `/assessment-dashboard` |
| - | Assessment Reports | `/school/assessment/reports` | `nav-icon fas fa-fw fa-chart-line ` | RENAME | `Reports Center` -> `/reports` |

## Surveys & Feedback

| # | Reference label | Demo path | Ref icon | Status | Match/Ours |
|---|---|---|---|---|---|
| - | Survey Dashboard | `/school/survey/dashboard` | `nav-icon fas fa-fw fa-tachometer-alt ` | EXISTS | `/survey-dashboard` |
| - | All Surveys | `/school/survey` | `nav-icon fas fa-fw fa-list-ul ` | RENAME | `Surveys` -> `/surveys` |
| - | My Surveys | `/school/survey/mine` | `nav-icon fas fa-fw fa-inbox ` | RENAME | `My Leaves` -> `/my-leaves` |
| - | Feedback Triage | `/school/feedback` | `nav-icon fas fa-fw fa-clipboard-list ` | RENAME | `Feedback` -> `/feedback` |
| - | Survey Guide | `/school/survey/guide` | `nav-icon fas fa-fw fa-book-open ` | RENAME | `Survey Dashboard` -> `/survey-dashboard` |

## Compliance & Governance

| # | Reference label | Demo path | Ref icon | Status | Match/Ours |
|---|---|---|---|---|---|
| - | Compliance Overview | `/school/compliance` | `nav-icon fas fa-fw fa-tachometer-alt ` | RENAME | `Compliance Suite` -> `/compliance` |
| - | School Profile | `/school/compliance/profile` | `nav-icon fas fa-fw fa-school ` | RENAME | `Profile` -> `/profile` |
| - | Compliance Packs | `/school/compliance/packs` | `nav-icon fas fa-fw fa-box-open ` | RENAME | `Compliance Suite` -> `/compliance` |
| - | Field Settings | `/school/compliance/fields` | `nav-icon fas fa-fw fa-sliders-h ` | RENAME | `Settings` -> `/settings` |
| - | Document Vault | `/school/compliance/documents` | `nav-icon fas fa-fw fa-folder-open ` | EXISTS | `/document-vault` |
| - | Compliance Checklist | `/school/compliance/checklist` | `nav-icon fas fa-fw fa-clipboard-check ` | RENAME | `Compliance Suite` -> `/compliance` |
| - | Data Records | `/school/compliance/records` | `nav-icon fas fa-fw fa-user-check ` | RENAME | `Alumni Records` -> `/alumni-records` |
| - | Data Validator | `/school/compliance/validator` | `nav-icon fas fa-fw fa-check-double ` | NEW |  |
| - | Government Reports | `/school/compliance/reports` | `nav-icon fas fa-fw fa-file-export ` | RENAME | `Reports Center` -> `/reports` |
| - | Inspections | `/school/compliance/inspections` | `nav-icon fas fa-fw fa-clipboard-list ` | NEW |  |
| - | Compliance Calendar | `/school/compliance/calendar` | `nav-icon fas fa-fw fa-calendar-alt ` | RENAME | `Events Calendar` -> `/events-calendar` |

## Holistic Progress Card

| # | Reference label | Demo path | Ref icon | Status | Match/Ours |
|---|---|---|---|---|---|
| - | HPC Dashboard | `/school/hpc/dashboard` | `nav-icon fas fa-fw fa-tachometer-alt ` | EXISTS | `/hpc-dashboard` |
| - | HPC Activities | `/school/hpc/activities` | `nav-icon fas fa-fw fa-tasks ` | EXISTS | `/hpc-activities` |
| - | Progress Cards | `/school/hpc/cards` | `nav-icon fas fa-fw fa-id-card ` | EXISTS | `/hpc-cards` |
| - | HPC Frameworks | `/school/hpc/frameworks` | `nav-icon fas fa-fw fa-sitemap ` | EXISTS | `/hpc-frameworks` |
| - | Card Appearance | `/school/hpc/card-appearance` | `nav-icon fas fa-fw fa-palette ` | EXISTS | `/hpc-card-appearance` |

## Live Classes

| # | Reference label | Demo path | Ref icon | Status | Match/Ours |
|---|---|---|---|---|---|
| - | Manage Live Classes | `/school/study-center/live-classes` | `nav-icon fas fa-fw fa-chalkboard-teacher ` | RENAME | `Online Classes` -> `/online-classes` |
| - | Live Class Settings | `/school/study-center/live-classes/settings` | `nav-icon fas fa-fw fa-cog ` | RENAME | `Settings` -> `/settings` |
| - | Apps Center | `/school/apps` | `nav-icon fas fa-fw fa-th ` | EXISTS | `/apps-center` |

## Study Center

| # | Reference label | Demo path | Ref icon | Status | Match/Ours |
|---|---|---|---|---|---|
| - | Dashboard | `/school/study-center` | `nav-icon fas fa-fw fa-tachometer-alt ` | EXISTS | `/dashboard` |
| - | Manage Syllabus | `/school/study-center/syllabus` | `nav-icon fas fa-fw fa-sitemap ` | RENAME | `Syllabus Coverage` -> `/syllabus` |
| - | Classwork & Logbook | `/school/study-center/classwork` | `nav-icon fas fa-fw fa-book-open ` | NEW |  |
| - | Manage Resources | `/school/study-center/materials` | `nav-icon fas fa-fw fa-folder ` | RENAME | `Manage Grades` -> `/manage-grades` |
| - | Homework & Assignments | `/school/study-center/homework` | `nav-icon fas fa-fw fa-edit ` | RENAME | `Homework` -> `/homework` |

## Certificates

| # | Reference label | Demo path | Ref icon | Status | Match/Ours |
|---|---|---|---|---|---|
| - | Certificate Templates | `/school/certificate-templates` | `nav-icon fas fa-fw fa-file-alt ` | RENAME | `Certificate` -> `/certificate` |
| - | Certificates & Documents | `/school/generate-document` | `nav-icon fas fa-fw fa-print ` | RENAME | `Certificates` -> `/certificates` |

## ID Cards

| # | Reference label | Demo path | Ref icon | Status | Match/Ours |
|---|---|---|---|---|---|
| - | Student ID Cards | `/school/id-cards/students` | `nav-icon fas fa-fw fa-user-graduate ` | RENAME | `Student ID Card` -> `/student-id-card` |
| - | Staff ID Cards | `/school/id-cards/staff` | `nav-icon fas fa-fw fa-id-badge ` | EXISTS | `/staff-id-cards` |
| - | Card Designs | `/school/id-cards/designs` | `nav-icon fas fa-fw fa-palette ` | RENAME | `Report Card Setups` -> `/report-card-setups` |

## Communicate

| # | Reference label | Demo path | Ref icon | Status | Match/Ours |
|---|---|---|---|---|---|
| - | Notice Board | `/school/notices` | `nav-icon fas fa-fw fa-clipboard-list ` | EXISTS | `/notice-board` |
| - | Events & Holidays | `/school/events` | `nav-icon fas fa-fw fa-calendar-star ` | RENAME | `Events Calendar` -> `/events-calendar` |
| - | Compose Broadcast | `/school/communicate/broadcast/create` | `nav-icon fas fa-fw fa-pen-alt ` | EXISTS | `/compose-broadcast` |
| - | Broadcast History | `/school/communicate/broadcast` | `nav-icon fas fa-fw fa-history ` | EXISTS | `/broadcast-history` |
| - | Image Gallery | `/school/gallery` | `nav-icon fas fa-fw fa-images ` | EXISTS | `/image-gallery` |

## Library

| # | Reference label | Demo path | Ref icon | Status | Match/Ours |
|---|---|---|---|---|---|
| - | Library Dashboard | `/school/library/dashboard` | `nav-icon fas fa-fw fa-tachometer-alt ` | EXISTS | `/library-dashboard` |
| - | Issue/Return Book | `/school/library/issue-return` | `nav-icon fas fa-fw fa-exchange-alt ` | NEW |  |
| - | Manage Books | `/school/library/books` | `nav-icon fas fa-fw fa-book ` | RENAME | `Manage Grades` -> `/manage-grades` |
| - | Book Categories | `/school/library/categories` | `nav-icon fas fa-fw fa-tags ` | RENAME | `Houses & Categories` -> `/houses-categories` |

## Inventory

| # | Reference label | Demo path | Ref icon | Status | Match/Ours |
|---|---|---|---|---|---|
| - | Inventory Dashboard | `/school/inventory/dashboard` | `nav-icon fas fa-fw fa-tachometer-alt ` | EXISTS | `/inventory-dashboard` |
| - | Issue Item | `/school/inventory/issue-item` | `nav-icon fas fa-fw fa-share-square ` | NEW |  |
| - | Add Stock | `/school/inventory/add-stock` | `nav-icon fas fa-fw fa-plus-square ` | NEW |  |
| - | Item List | `/school/inventory/items` | `nav-icon fas fa-fw fa-boxes ` | NEW |  |
| - | Item Categories | `/school/inventory/categories` | `nav-icon fas fa-fw fa-tags ` | RENAME | `Houses & Categories` -> `/houses-categories` |
| - | Suppliers | `/school/inventory/suppliers` | `nav-icon fas fa-fw fa-truck ` | NEW |  |
| - | Point of Sale | `/school/inventory/sales/create` | `nav-icon fas fa-fw fa-cash-register ` | EXISTS | `/store-pos` |
| - | Sales History | `/school/inventory/sales` | `nav-icon fas fa-fw fa-receipt ` | RENAME | `Subscription History` -> `/payment-history` |
| - | Purchase Orders | `/school/inventory/purchase-orders` | `nav-icon fas fa-fw fa-file-invoice ` | RENAME | `Vendors & Orders` -> `/purchase-orders` |
| - | Goods Receipts | `/school/inventory/grns` | `nav-icon fas fa-fw fa-dolly ` | EXISTS | `/store-receipts` |
| - | Supplier Payments | `/school/inventory/supplier-payments` | `nav-icon fas fa-fw fa-money-check-alt ` | EXISTS | `/store-payments` |

## Transport

| # | Reference label | Demo path | Ref icon | Status | Match/Ours |
|---|---|---|---|---|---|
| - | Transport Dashboard | `/school/transport/dashboard` | `nav-icon fas fa-fw fa-tachometer-alt ` | EXISTS | `/transport-dashboard` |
| - | Manage Vehicles | `/school/transport/vehicles` | `nav-icon fas fa-fw fa-truck ` | RENAME | `Manage Grades` -> `/manage-grades` |
| - | Live Operations | `/school/transport/live` | `nav-icon fas fa-fw fa-satellite-dish ` | RENAME | `Live Chat` -> `/chat` |
| - | Manage Routes | `/school/transport/routes` | `nav-icon fas fa-fw fa-road ` | RENAME | `Manage Grades` -> `/manage-grades` |
| - | Live Vehicle Tracking | `/school/transport/tracking` | `nav-icon fas fa-fw fa-map-marked-alt ` | RENAME | `Live Chat` -> `/chat` |
| - | Drivers | `/school/transport/drivers` | `nav-icon fas fa-fw fa-id-card ` | NEW |  |

## Hostel

| # | Reference label | Demo path | Ref icon | Status | Match/Ours |
|---|---|---|---|---|---|
| - | Hostel Dashboard | `/school/hostel/dashboard` | `nav-icon fas fa-fw fa-tachometer-alt ` | EXISTS | `/hostel-dashboard` |
| - | Student Allocation | `/school/hostel/allocations` | `nav-icon fas fa-fw fa-users ` | RENAME | `Student Health` -> `/student-health` |
| - | Manage Rooms | `/school/hostel/rooms` | `nav-icon fas fa-fw fa-door-open ` | RENAME | `Manage Grades` -> `/manage-grades` |
| - | Room Types | `/school/hostel/room-types` | `nav-icon fas fa-fw fa-bed ` | RENAME | `Exam Types` -> `/exam-types` |
| - | Manage Hostels | `/school/hostel/hostels` | `nav-icon fas fa-fw fa-building ` | RENAME | `Manage Grades` -> `/manage-grades` |

## Help Center

| # | Reference label | Demo path | Ref icon | Status | Match/Ours |
|---|---|---|---|---|---|
| - | Manage Categories | `/school/knowledge-base/categories` | `nav-icon fas fa-fw fa-layer-group ` | RENAME | `Houses & Categories` -> `/houses-categories` |
| - | Browse Articles | `/school/knowledge-base/articles` | `nav-icon fas fa-fw fa-file-alt ` | NEW |  |
| - | AI Chatbot | `/school/knowledge-base/chatbot` | `nav-icon fas fa-fw fa-robot ` | RENAME | `AI Assistant` -> `/ai-assistant` |

## Asset Management

| # | Reference label | Demo path | Ref icon | Status | Match/Ours |
|---|---|---|---|---|---|
| - | Asset Dashboard | `/school/assets/dashboard` | `nav-icon fas fa-fw fa-tachometer-alt ` | EXISTS | `/asset-dashboard` |
| - | Asset Register | `/school/assets/assets` | `nav-icon fas fa-fw fa-cubes ` | RENAME | `Asset Dashboard` -> `/asset-dashboard` |
| - | Asset Categories | `/school/assets/categories` | `nav-icon fas fa-fw fa-tags ` | RENAME | `Asset Dashboard` -> `/asset-dashboard` |
| - | Asset Assignments | `/school/assets/assignments` | `nav-icon fas fa-fw fa-people-carry ` | RENAME | `Asset Dashboard` -> `/asset-dashboard` |
| - | Asset Depreciation | `/school/assets/depreciation` | `nav-icon fas fa-fw fa-chart-line ` | RENAME | `Asset Dashboard` -> `/asset-dashboard` |
| - | Asset Maintenance | `/school/assets/maintenance` | `nav-icon fas fa-fw fa-tools ` | RENAME | `Asset Dashboard` -> `/asset-dashboard` |
| - | Asset Disposals | `/school/assets/disposals` | `nav-icon fas fa-fw fa-recycle ` | RENAME | `Asset Dashboard` -> `/asset-dashboard` |
| - | Asset Audits | `/school/assets/audits` | `nav-icon fas fa-fw fa-clipboard-check ` | RENAME | `Asset Dashboard` -> `/asset-dashboard` |
| - | Asset Reports | `/school/assets/reports` | `nav-icon fas fa-fw fa-chart-bar ` | RENAME | `Asset Dashboard` -> `/asset-dashboard` |

## Engagement

| # | Reference label | Demo path | Ref icon | Status | Match/Ours |
|---|---|---|---|---|---|
| - | Creatives | `/school/engagement/designs` | `nav-icon fas fa-fw fa-palette ` | NEW |  |
| - | Birthday Manager | `/school/engagement/birthdays` | `nav-icon fas fa-fw fa-birthday-cake ` | NEW |  |
| - | Festival Greetings | `/school/engagement/festivals` | `nav-icon fas fa-fw fa-gift ` | NEW |  |
| - | Auto-send Settings | `/school/engagement/settings` | `nav-icon fas fa-fw fa-sliders-h ` | RENAME | `Settings` -> `/settings` |

## CCTV

| # | Reference label | Demo path | Ref icon | Status | Match/Ours |
|---|---|---|---|---|---|
| - | Camera Wall | `/school/cctv/wall` | `nav-icon fas fa-fw fa-th-large ` | RENAME | `CCTV Camera Registry` -> `/cctv` |
| - | CCTV Cameras | `/school/cctv/cameras` | `nav-icon fas fa-fw fa-video ` | RENAME | `CCTV Camera Registry` -> `/cctv` |
| - | CCTV Access Log | `/school/cctv/logs` | `nav-icon fas fa-fw fa-user-clock ` | RENAME | `Phone Call Log` -> `/phone-call-log` |
| - | Reports & Analytics | `/school/reports` | `nav-icon fas fa-fw fa-chart-pie ` | RENAME | `Reports Center` -> `/reports` |

## Settings & Billing

| # | Reference label | Demo path | Ref icon | Status | Match/Ours |
|---|---|---|---|---|---|
| - | School Settings | `/school/settings` | `nav-icon fas fa-fw fa-cogs ` | RENAME | `Settings` -> `/settings` |
| - | Custom Fields | `/school/custom-fields` | `nav-icon fas fa-fw fa-plus-square ` | EXISTS | `/custom-fields` |
| - | Roles & Permissions | `/school/roles` | `nav-icon fas fa-fw fa-user-shield ` | EXISTS | `/roles-permissions` |
| - | Payment Gateway | `/school/gateway-settings` | `nav-icon fas fa-fw fa-credit-card ` | NEW |  |
| - | Notification Settings | `/school/notification-settings` | `nav-icon fas fa-fw fa-bell ` | RENAME | `Settings` -> `/settings` |
| - | Admission Settings | `/school/admission-settings` | `nav-icon fas fa-fw fa-bell ` | EXISTS | `/admission-settings` |
| - | Admission Form Fields | `/school/admission-fields` | `nav-icon fas fa-fw fa-eye-slash ` | RENAME | `Online Admission` -> `/online-admission` |
| - | Audit Trail | `/school/audit-trail` | `nav-icon fas fa-fw fa-history ` | EXISTS | `/reports-audit-trail` |
| - | Subscription | `/school/subscription` | `nav-icon fas fa-fw fa-rocket ` | EXISTS | `/subscription` |
| - | Subscription History | `/school/payment-history` | `nav-icon fas fa-fw fa-rocket ` | EXISTS | `/payment-history` |
| - | Module Settings | `/school/module-settings` | `nav-icon fas fa-fw fa-cubes ` | RENAME | `Settings` -> `/settings` |
| - | Content Safety | `/school/nsfw` | `nav-icon fas fa-fw fa-shield-alt ` | EXISTS | `/nsfw` |
| - | Backup Management | `/school/backups` | `nav-icon fas fa-fw fa-hdd ` | RENAME | `Staff Management` -> `/staff` |
| - | Comms Wallet | `/school/comms` | `nav-icon fas fa-fw fa-wallet ` | EXISTS | `/comms-wallet` |
| - | Chat Moderation | `/school/chat` | `nav-icon fas fa-fw fa-comment-dots ` | EXISTS | `/chat-moderation` |
| - | Messages | `/school/messages` | `nav-icon fas fa-fw fa-comments ` | EXISTS | `/communication` |
| - | Logout | `#` | `nav-icon fas fa-fw fa-sign-out-alt text-danger ` | NEW |  |