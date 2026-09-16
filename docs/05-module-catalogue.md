# QGurukul — Module Catalogue

> ~50 business modules. Each module can be enabled/disabled per organization via Module Management.
> Core modules (20) cannot be disabled. New-generation modules (10+) are opt-in via feature flags.

---

## Module Registry

**File:** `app/Support/ModuleRegistry.php` (107 lines)

### Core modules (always enabled)

| Key | Label | Description |
|-----|-------|-------------|
| `dashboard` | Dashboard | Role dashboard with summary widgets |
| `students` | Students | Student records, admission, alumni and exit management |
| `academics` | Academics | Classes, subjects, timetables, lesson plans, homework and study materials |
| `exams` | Exams & Marks | Exam management, marks entry, report cards and marksheets |
| `attendance` | Attendance | Daily attendance, QR and biometric tracking |
| `fees` | Fees & Finance | Fee structures, collection, expenses, income and bank accounts |
| `staff` | Staff & HR | Staff records, payroll, leave, appraisals, loans and recruitment |
| `front-office` | Front Office | Admission enquiries, leads, visitors, postal and gate passes |
| `hostel` | Hostel | Hostel blocks, rooms, allocations, fees and complaints |
| `transport` | Transport | Routes, vehicles, trips and transport fee collection |
| `library` | Library | Books, circulation and e-library |
| `inventory` | Inventory & Store | Items, stores, purchase orders and point of sale |
| `certificates` | Certificates | Certificate templates, marksheets and ID cards |
| `communication` | Communication | Messages, notices, WhatsApp, SMS, email and voice calls |
| `compliance` | Compliance | Regulatory packs, checklists and inspections |
| `cctv` | CCTV | Camera registry, access control and live wall |
| `knowledge-base` | Knowledge Base | Articles and self-service help content |
| `website` | Website CMS | Public website builder and page editor |
| `reports` | Reports & Analytics | MIS reports and analytics exports |
| `settings` | Settings | General, communication, payment and role settings |

### Gateable modules (opt-in per org)

| Key | Label | Module gate key | Description |
|-----|-------|----------------|-------------|
| `audit-trail` | Audit Trail | `audit-trail` | Track every user action with before/after diffs |
| `assets` | Asset Management | `assets` | Fixed assets, depreciation, maintenance, audits, disposals |
| `assessment` | Assessment | `assessment` | Continuous and term-based assessment plans |
| `digital-evaluation` | Digital Evaluation | `digital-evaluation` | Online subjective marking and moderation |
| `report-cards` | Report Card Setups | `report-cards` | Custom report card templates, remarks, layouts |
| `cbc` | CBC (Competency Based) | `cbc` | Competency strands, outcomes, pathways, CBC reports |
| `apps-center` | Apps Center | `apps-center` | AI and productivity apps, question paper generator |
| `dashboard-themes` | Dashboard Themes | `dashboard-themes` | Switchable dashboard colour themes |
| `face-search` | Face Search | `face-search` | Face-based student record lookup |
| `branch-admin` | Branch Admin | `branch-admin` | Head-office login spanning multiple branches |

### Module enable/disable API
```php
Organization::moduleEnabled('audit-trail')  // returns bool
Organization::moduleEnabled('students')      // always returns true (core)
```

Stored in `Organization.features` JSON column. The `module.enabled` middleware checks this before allowing access to gated routes.

---

## Module Deep-Dive

### 1. Admissions & Lead Management

| Item | Detail |
|------|--------|
| **Routes** | `GET /admissions/apply` (public), `POST /admissions`, `POST /online-admission/{id}/enroll`, `GET /leads` |
| **Controllers** | `AdmissionInquiryController`, `FrontOfficeController`, `LeadController` |
| **Models** | `AdmissionInquiry` (90+ fields), `Lead`, `LeadPipelineStage`, `LeadSource` |
| **Roles** | Public (form), admin, receptionist, teacher |
| **Workflow** | Parent submits public admission form → email verification → stored as `AdmissionInquiry` (status=pending) → receptionist reviews on Online Admission page → clicks Enroll → creates `Student` record. Leads module: CRM-style pipeline (Kanban) with configurable stages (new → contacted → interested → admitted/lost) |

### 2. Student Information

| Item | Detail |
|------|--------|
| **Routes** | `GET /students`, `POST /students`, `POST /students/import`, `DELETE /students/bulk-delete`, `GET /student-exits`, `GET /alumni-records` |
| **Controllers** | `StudentsController` (1,358 lines), `StudentExitController`, `ParentsController` |
| **Models** | `Student` (159 lines, 90+ fillable fields), `StudentExit`, `AlumniRecord`, `StudentHouse`, `StudentCategory`, `StudentAcademicHistory` |
| **Roles** | admin, receptionist, teacher, accountant |
| **Features** | Full CRUD, CSV bulk import, bulk delete with recycle bin, student profiles (personal/parent/guardian/transport/hostel/medical/documents), houses & categories, academic history per session, alumni tracking |

### 3. Classes & Sections

| Item | Detail |
|------|--------|
| **Routes** | `GET /classes`, `POST /classes`, `PATCH /classes/{schoolClass}`, `DELETE /classes/{schoolClass}`, CRUD sections |
| **Controllers** | `ClassesController` |
| **Models** | `SchoolClass` |
| **Roles** | admin, teacher |
| **Purpose** | Defines academic classes (e.g. "Class 10") and sections (e.g. "A", "B"). Classes organize students, attendance, timetable, and exams |

### 4. Attendance

| Item | Detail |
|------|--------|
| **Routes** | `GET /attendance`, `POST /attendance`, `GET /attendance-qr`, `GET /attendance-corrections` |
| **Controllers** | `AttendanceController`, `QrAttendanceController`, `AttendanceCorrectionController` |
| **Models** | `Attendance` (student_id, class_id, date, status, check_in/out_time, marked_by), `AttendanceCorrection`, `QrScanLog` |
| **Roles** | admin, teacher |
| **Workflow** | Teacher selects class → marks each student's attendance for the day (present/absent/late/half_day/leave). Supports QR code and biometric tracking. Students can request corrections; admins approve. |

### 5. Fees & Payments (Finance Core)

| Item | Detail |
|------|--------|
| **Routes** | `GET /fees`, CRUD types/structures/assign/payments/challans/concessions/scholarships, `GET /assign-fees`, `GET /fee-groups`, `GET /fee-discounts`, `GET /scholarships` |
| **Controllers** | `FeesController` (2,005 lines — largest controller), `FeeGroupController`, `FeeDiscountController`, `OnlinePaymentController`, `ScholarshipController` |
| **Models** | `FeeType`, `FeeStructure`, `StudentFee`, `FeePayment`, `FeeGroup`, `FeeDiscount`, `FeeAudit`, `FeeConcessionRequest`, `StudentScholarship` |
| **Roles** | admin, accountant, receptionist; student (view own) |
| **Lifecycle** | See docs/06-student-and-fees-lifecycles.md |

### 6. Income & Expense (Accounting)

| Item | Detail |
|------|--------|
| **Routes** | `GET /income-management`, `GET /expense-management`, `GET /accounts/income-heads`, `GET /accounts/expense-heads`, `GET /bank-accounts`, `GET /all-transactions` |
| **Controllers** | `FeesController` (also handles income/expenses), `AccountHeadController`, `BankAccountController` |
| **Models** | `IncomeEntry`, `ExpenseEntry`, `AccountHead`, `AccountTransaction`, `BankAccount` |
| **Roles** | admin, accountant |
| **Purpose** | Track all non-fee income (donations, rent, etc.) and expenses (salary, maintenance, etc.) with heads/categories, bank accounts, and transaction reconciliation |

### 7. Exams, Marks & Results

| Item | Detail |
|------|--------|
| **Routes** | `GET /exams`, `POST /exams`, marks entry/save, datesheets, hall tickets, report cards, print marksheets |
| **Controllers** | `ExamController`, `ExamMarksController`, `ReportCardController`, `DatesheetController` |
| **Models** | `Exam`, `ExamType`, `ExamSchedule`, `ExamResult` (obtained_marks, grade, is_absent, remarks), `ReportCardTemplate` |
| **Roles** | admin, teacher; students view own results |
| **Workflow** | Admin creates Exam Types → Creates Exams (linked to academic year/semester) → Sets Exam Schedule (subject + date/time) → Teachers enter marks → Auto-calculates grades via grade scale → Report cards/marksheets generated. Hall tickets and datesheets published. |

### 8. Online Examinations

| Item | Detail |
|------|--------|
| **Routes** | `GET /online-exams`, `POST /online-exams`, submit, results |
| **Controllers** | `OnlineExamController` |
| **Models** | `OnlineExam`, `OnlineExamAttempt`, `Question` |
| **Roles** | admin/teacher (create), student (attempt) |
| **Purpose** | Timed online exams with question bank. Students take exams, auto-evaluation, results shown. |

### 9. Timetable

| Item | Detail |
|------|--------|
| **Routes** | `GET /class-time-table`, CRUD, `GET /teacher-time-table`, `GET /auto-timetable`, `GET /time-slots` |
| **Controllers** | `ClassesController` (timetable methods), `AutoTimetableController`, `TimeSlotsController` |
| **Models** | `Timetable`, `TimeSlot` |
| **Roles** | admin, teacher |
| **Purpose** | Manual or auto-generated class timetable per class/section with period/time-slot management |

### 10. Transport & GPS Tracking

| Item | Detail |
|------|--------|
| **Routes** | `GET /transport-management`, routes/vehicles/assignments CRUD, trips, live tracking, GPS simulation |
| **Controllers** | `TransportManagementController`, `TransportDriversController` |
| **Models** | `TransportRoute`, `TransportVehicle`, `TransportAssignment`, `DailyTrip`, `TransportGpsPosition`, `CampusWorker` |
| **Roles** | admin, receptionist, driver |
| **Purpose** | Routes, vehicles, student assignments, daily trip tracking with GPS simulation, live vehicle tracking, transport fee collection |

### 11. Hostel Management

| Item | Detail |
|------|--------|
| **Routes** | `GET /hostel-management`, CRUD hostels/rooms/beds/room-types, allocations, fees, complaints, notices, lost & found |
| **Controllers** | `HostelManagementController` |
| **Models** | `Hostel`, `HostelRoom`, `HostelBed`, `HostelRoomType`, `HostelAllocation`, `HostelFeeStructure`, `HostelNotice` |
| **Roles** | admin (manage), student (view own) |
| **Purpose** | Full hostel lifecycle: define blocks/rooms/beds → allocate students → collect fees → complaints/notices/lost-found |

### 12. Library

| Item | Detail |
|------|--------|
| **Routes** | `GET /library`, CRUD books, import, issue/return, requests, `GET /e-library` |
| **Controllers** | `LibraryController`, `EbookLibraryController` |
| **Models** | `LibraryBook`, `LibraryCirculation`, `LibraryMember`, `Ebook` |
| **Roles** | librarian (primary), admin, teacher |
| **Purpose** | Physical book catalog, categories, issue/return circulation, member cards. E-library for digital ebooks. |

### 13. Homework & Lesson Plans

| Item | Detail |
|------|--------|
| **Routes** | `GET /homework`, CRUD, submit, evaluate; `GET /lesson-plan`, CRUD, review; `GET /syllabus`, CRUD |
| **Controllers** | `HomeworkController`, `ClassesController` (lesson plan), `SyllabusUnitController` |
| **Models** | `Homework`, `HomeworkSubmission`, `LessonPlan`, `SyllabusUnit` |
| **Roles** | admin, teacher (create/evaluate); student (submit/view) |
| **Purpose** | Teachers assign homework → students submit → teachers evaluate. Lesson plans per class/subject with HOD review. Syllabus coverage tracking. |

### 14. Communication (Multi-Channel)

| Item | Detail |
|------|--------|
| **Routes** | Messages, Notice Board, Email, SMS, WhatsApp, Voice Calls, Broadcast, Download Center, Document Vault, Gallery |
| **Controllers** | `CommunicationController`, `BroadcastController`, `GalleryController`, `DocumentVaultController` |
| **Models** | `Message`, `MessageRecipient`, `SmsLog`, `EmailLog`, `Broadcast`, `GalleryAlbum`, `DownloadCenterItem` |
| **Roles** | admin/teacher/receptionist (send); all roles (view) |
| **Purpose** | Internal messaging, notice board, bulk SMS/Email/WhatsApp (QWA bridge), voice call logging, broadcast, download center, gallery. Comms wallet for SMS credits. |

### 15. Front Office

| Item | Detail |
|------|--------|
| **Routes** | `GET /admission-enquiry`, `GET /visitor-register`, `GET /phone-call-log`, `GET /postal-dispatch`, `GET /postal-delivery`, `GET /complains`, `GET /gate-passes` |
| **Controllers** | `FrontOfficeController`, `GatePassController` |
| **Models** | `VisitorRegisterEntry`, `PhoneCallLogEntry`, `PostalDispatchEntry`, `PostalDeliveryEntry`, `ComplaintEntry`, `GatePass` |
| **Roles** | admin, receptionist |
| **Purpose** | Reception desk: admission enquiries, visitor check-in/out, phone call logs, postal tracking, complaints, gate passes with terminal scanning |

### 16. HR & Staff Management

| Item | Detail |
|------|--------|
| **Routes** | Staff CRUD, staff attendance, payroll, leave management, loans, appraisals, salary templates, departments/designations, recruitment, import center, staff directory, HR dashboard, ID cards |
| **Controllers** | `UsersController`, `HrDashboardController`, `StaffLoansController`, `StaffAppraisalsController`, `SalaryTemplatesController`, `RecruitmentController`, `ImportCenterController` |
| **Models** | `User`, `StaffAttendance`, `StaffPayrollEntry`, `StaffSalary`, `StaffLoan`, `LeaveRequest`, `LeaveType`, `StaffLeaveBalance`, `StaffAppraisal`, `SalaryTemplate`, `Department`, `Designation`, `JobPosting` |
| **Roles** | admin (manage), staff (apply leaves, view own) |
| **Purpose** | Full HR lifecycle: onboarding, departments, daily attendance, leaves, payroll with payslips, loans, appraisals with criteria/cycles, recruitment (job postings), staff directory, HR dashboard, staff ID cards |

### 17. Reports & Analytics

| Item | Detail |
|------|--------|
| **Routes** | `GET /reports`, export (PDF/CSV/XLSX), `GET /reports/builder`, `GET /regulator-reports`, `GET /print-center` |
| **Controllers** | `ReportsController`, `SavedReportController`, `RegulatorReportsController`, `PrintCenterController` |
| **Models** | `SavedReport` |
| **Roles** | admin |
| **Purpose** | Cross-module analytics: students, attendance, fees, exams, library, transport, hostel, inventory, communication, HR, homework, alumni. Custom report builder. Export PDF/CSV/XLSX. Regulator reports for compliance. Print center for bulk printing. |

### 18. Certificates & Documents

| Item | Detail |
|------|--------|
| **Routes** | `GET /certificates`, templates CRUD, bulk issue, marksheet generation, student ID cards, `GET /documents/generate` |
| **Controllers** | `CertificateController`, `GenerateDocumentController` |
| **Models** | `CertificateTemplate`, `IssuedCertificate` |
| **Roles** | admin, teacher (manage); student (view own) |
| **Purpose** | Template-based certificates (TC, merit, etc.), bulk issue, marksheets, student ID cards, custom document generation, archival |

### 19. PTM (Parent-Teacher Meetings)

| Item | Detail |
|------|--------|
| **Routes** | `GET /ptm`, guide/record/followups/reports, CRUD sessions, appointments |
| **Controllers** | `PtmController` |
| **Models** | `PtmSession`, `PtmAppointment` |
| **Roles** | admin, teacher |
| **Purpose** | Schedule sessions → parents/students book appointments → record attendance/remarks → follow-ups → analytics |

### 20. Assessment, CBC & HPC

| Item | Detail |
|------|--------|
| **Routes** | `GET /assessment`, `GET /cbc`, `GET /hpc/dashboard` |
| **Controllers** | `AssessmentController`, `OsmController`, `CbcController`, `HpcController` |
| **Models** | `Assessment`, `OsmSession`, `CbcStrand`, `HpcFramework`, `HpcCard`, `HpcActivity` |
| **Roles** | admin, teacher |
| **Purpose** | Formative/summative assessment plans. OSM (answer sheet upload → multi-teacher moderation). CBC competency framework. HPC (NEP 2020 holistic progress cards) |

### 21. Surveys, Feedback & Events

| Item | Detail |
|------|--------|
| **Routes** | `GET /surveys`, `GET /feedback`, `GET /events`, `GET /engagement` |
| **Controllers** | `SurveysController`, `FeedbackController`, `EventsController`, `EngagementController` |
| **Models** | `Survey`, `SurveyQuestion`, `FeedbackCampaign`, `SchoolEvent`, `EngagementBirthday` |
| **Roles** | admin (manage); all roles (respond) |
| **Purpose** | Surveys with question collection, feedback campaigns, school events calendar, birthday manager, festival greetings, creatives for social media |

### 22. Inventory, Vendors & POS

| Item | Detail |
|------|--------|
| **Routes** | `GET /inventory`, `GET /purchase-orders`, `GET /store/pos`, `GET /store/goods-receipts`, `GET /store/supplier-payments` |
| **Controllers** | `InventoryController`, `PurchaseOrderController`, `StorePosController`, `GoodsReceiptController` |
| **Models** | `InventoryItem`, `InventoryStockEntry`, `Vendor`, `PurchaseOrder`, `PosSale`, `GoodsReceipt` |
| **Roles** | admin, accountant |
| **Purpose** | Track items across stores, purchase orders (create PO → receive goods → pay vendors), school store POS, goods receipt tracking |

### 23. Approval Workflows

| Item | Detail |
|------|--------|
| **Routes** | `GET /approvals`, CRUD flows, action center, submitted requests, approve/reject |
| **Controllers** | `ApprovalFlowController`, `ApprovalInboxController` |
| **Models** | `ApprovalFlow`, `ApprovalFlowStep`, `ApprovalRequest`, `ApprovalRequestStep` |
| **Roles** | admin (config), all staff (submit/approve) |
| **Purpose** | Configurable multi-step approval chains. Users submit requests; approvers review in their inbox. Supports multi-level approve/reject. |

### 24. Compliance & Audit

| Item | Detail |
|------|--------|
| **Routes** | `GET /compliance`, `GET /audit-trail`, `GET /data-validator`, `GET /inspections` |
| **Controllers** | `ComplianceController`, `AuditTrailController` |
| **Models** | `ComplianceItem`, `CompliancePack`, `AuditTrail`, `ActivityLog` |
| **Roles** | admin |
| **Purpose** | Compliance packs with checklists, compliance calendar, audit trail (track all actions with diffs), data validator, inspection records |

### 25. Transport Drivers & Biometric

| Item | Detail |
|------|--------|
| **Routes** | `GET /transport/drivers`, `GET /settings/biometric`, `GET /biometric-devices`, `GET /cctv` |
| **Controllers** | `TransportDriversController`, `BiometricDeviceController`, `CctvController` |
| **Models** | `CampusWorker`, `BiometricDevice`, `BiometricLog`, `CctvCamera`, `CctvAccessLog` |
| **Roles** | admin |
| **Purpose** | Driver management, biometric device integration for attendance, CCTV camera management with access logging |

### 26. Online Classes & E-Library

| Item | Detail |
|------|--------|
| **Routes** | `GET /online-classes`, `GET /e-library`, `GET /question-bank`, `GET /study-materials` |
| **Controllers** | `OnlineClassController`, `EbookLibraryController`, `QuestionBankController`, `StudyMaterialController` |
| **Models** | `OnlineClass`, `Ebook`, `Question`, `StudyMaterial` |
| **Roles** | admin, teacher |
| **Purpose** | Schedule live online classes (Zoom/Meet), digital ebook library, question bank for exams, study material repository |

### 27. Chat & AI

| Item | Detail |
|------|--------|
| **Routes** | `GET /chat`, `GET /chat-moderation`, `GET /ai-assistant` |
| **Controllers** | `ChatController`, `ChatModerationController`, `AiAssistantController` |
| **Models** | `ChatMessage` |
| **Roles** | all (chat), admin (moderation/AI) |
| **Purpose** | Real-time chat between users (with content moderation for NSFW detection). AI chatbot for school data queries. |

### 28. Settings & Configuration

| Item | Detail |
|------|--------|
| **Routes** | General, Language, Communication, Online Payments, SSO, Social Media, Telegram, HR, Roles & Permissions, Sessions, Semesters, Admission Settings, Custom Fields, Module Management, Dashboard Themes |
| **Controllers** | `SettingsController` (2,144 lines), `LanguageTranslationController`, `CustomFieldsController`, `ModuleManagementController`, `SemesterController` |
| **Models** | `LanguageTranslation`, `AcademicYear`, `Semester`, `CustomFieldDefinition`, `WebsiteSetting` |
| **Roles** | admin |
| **Purpose** | Comprehensive org configuration: school details, academic sessions, semesters, languages, communication settings (SMS providers), online payments (Razorpay/UPI), SSO, social media auto-post, Telegram bot, HR policies, roles & permissions matrix, custom fields, module enable/disable, dashboard themes |

### 29. Subscription & Billing

| Item | Detail |
|------|--------|
| **Routes** | `GET /subscription`, `GET /billing-center` |
| **Controllers** | `SubscriptionController`, `BillingCenterController` |
| **Models** | `SubscriptionPayment` |
| **Roles** | super_admin (billing), admin (view own) |
| **Purpose** | SaaS subscription management. Super admin manages billing for all orgs. Org admins view their own subscription and payment history. |

### 30. Knowledge Base & Support

| Item | Detail |
|------|--------|
| **Routes** | `GET /knowledge-base`, `GET /contact-support` |
| **Controllers** | `SettingsController` (knowledgeBase), `DashboardExtrasController` (support) |
| **Models** | `KnowledgeBaseFaq`, `KnowledgeBaseModule`, `KnowledgeBasePageSetting`, `SupportTicket` |
| **Roles** | admin, teacher, receptionist, accountant, librarian, parent |
| **Purpose** | Internal knowledge base with FAQs/articles. Contact support for helpdesk tickets with reply threads. Superadmin CMS for KB content management. |
