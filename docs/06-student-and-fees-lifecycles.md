# QGurukul — Student & Fees Lifecycles

---

## Part A — Student Lifecycle (End-to-End)

```
Admission inquiry (public) → Enrollment → Academic records
  → Daily operations (attendance, fees, homework, exams)
  → Promotion (per session)
  → Exit / TC / Alumni
```

### Step 1: Public Admission Form

| Item | Detail |
|------|--------|
| **Route** | `GET /admissions/apply` (public, web.php :158) |
| **Controller** | `SettingsController::publicAdmissionForm()` |
| **Page** | `resources/js/Pages/PublicAdmissionForm.tsx` |
| **Model** | `AdmissionInquiry` (fields: full_name, email, phone, program_interest, student_stage, message, custom_data) |
| **Flow** | Parent/gurdian fills the public form → email verification code sent (`POST /admissions/send-verification-code`) → code verified (`POST /admissions/verify-code`) → inquiry stored with status `pending` |

### Step 2: Lead Tracking (Optional CRM)

| Item | Detail |
|------|--------|
| **Routes** | `GET /leads` (web.php :454), CRUD, pipeline config |
| **Controllers** | `LeadController` |
| **Models** | `Lead` (statuses: new, contacted, interested, admitted, lost, closed), `LeadPipelineStage`, `LeadSource` |
| **Flow** | Prospective students tracked in a Kanban pipeline. Can convert to a student record or be lost. Stages and sources are configurable. |

### Step 3: Admission Approval / Enrollment

| Item | Detail |
|------|--------|
| **Route** | `POST /online-admission/{admissionInquiry}/enroll` (web.php :313) |
| **Controller** | `AdmissionInquiryController::enroll()` |
| **Flow** | Admin/receptionist reviews inquiry on Online Admission page → clicks **Enroll** → system creates a `Student` record, links to selected class, assigns `admission_no` and `admission_date` |

### Step 4: Student Record & Academic History

| Item | Detail |
|------|--------|
| **Routes** | `POST /students` (web.php :247), `GET /students/{student}` |
| **Controller** | `StudentsController::store()` |
| **Model** | `Student` (159 lines, 90+ fillable fields), `StudentAcademicHistory` |
| **Fields** | Personal (name, DOB, gender, photo), parent/guardian details, transport info, hostel allocation, medical info, documents (birth certificate, Aadhaar, report cards), admission_no, admission_date, class_id |
| **Flow** | Full student profile created. A `StudentAcademicHistory` record links the student to class + academic year. Session enrollment tracked per year. |

### Step 5: Daily Attendance

| Item | Detail |
|------|--------|
| **Routes** | `POST /attendance` (web.php :617) |
| **Controller** | `AttendanceController::store()` |
| **Model** | `Attendance` (student_id, class_id, date, status, check_in/out_time, marked_by) |
| **Roles** | teacher marks; admin reviews corrections |
| **Flow** | Teacher selects class → marks each student (present/absent/late/half_day/leave) for the day. Also supports **QR code** and **biometric** attendance. Corrections requested by students go through admin approval. |

### Step 6: Fee Assignment & Collection

| Item | Detail |
|------|--------|
| **Route** | `POST /fees/assign` (web.php :508), `POST /fees/payments` (web.php :511) |
| **Controller** | `FeesController::assignFees()`, `FeesController::collectPayment()` |
| **Models** | `StudentFee`, `FeePayment` |
| **Flow** | Admin assigns fee structures to student/class → creates `StudentFee` rows per fee type per period → accountant collects payments → `FeePayment` receipt generated → balance tracked on `StudentFee.balance` |

### Step 7: Exams, Marks & Report Cards

| Item | Detail |
|------|--------|
| **Routes** | `POST /exams` (:655), `POST /exams/marks/save` (:630), `GET /exams/report-card` (:621) |
| **Controller** | `ExamController`, `ExamMarksController`, `ReportCardController` |
| **Models** | `Exam` → `ExamSchedule` → `ExamResult` → `ReportCardTemplate` |
| **Flow** | Admin creates exam → sets schedule (subject + date/time) → teachers enter marks → system auto-calculates grades via grade scale → report cards generated. Hall tickets and datesheets published. |

### Step 8: Promotion (Session Transition)

| Item | Detail |
|------|--------|
| **Route** | `POST /promote-students/promote` (web.php :448) |
| **Controller** | `PromoteStudentsController::promote()` |
| **Page** | `resources/js/Pages/dashboard/PromoteStudents.tsx` |
| **Flow** | Admin selects source class → target class → target session → selects students → system updates each student's `class_id` and creates a new `StudentAcademicHistory` entry. Can also save to `AlumniRecord`. |

### Step 9: Student Exit / TC / Alumni

| Item | Detail |
|------|--------|
| **Routes** | `POST /student-exits` (web.php :262), `GET /student-exits`, `GET /alumni-records` |
| **Controller** | `StudentExitController::store()` |
| **Model** | `StudentExit` (types: `exit` / `hold`; statuses: `pending` / `exited` / `held` / `restored`; reasons: `transfer_out`, `withdrawn`, `passed_out`, `struck_off`) |
| **Flow** | Admin initiates exit → sets type + reason + exit_date → status `exited` → `Student.enrollment_status` updated → TC number/date tracked (`markTcPrinted()`) → student can be restored. Alumni records maintained for alumni tracking. |

---

## Part B — Fees Lifecycle (End-to-End)

```
Fee Types & Groups → Fee Structures → Fee Assignment → Fee Collection
  → Receipts & Challans → Due Slips → Concessions & Scholarships
  → Carry-Forward → Reconciliation
```

### Step 1: Fee Types & Groups

| Item | Detail |
|------|--------|
| **Routes** | `POST /fees/types` (:494), `POST /fee-groups` (:496) |
| **Controllers** | `FeesController`, `FeeGroupController` |
| **Models** | `FeeType` (tuition, lab, library, etc.), `FeeGroup` |
| **Purpose** | Define fee categories and bundle multiple types for easy management |

### Step 2: Fee Structure Definition

| Item | Detail |
|------|--------|
| **Route** | `POST /fees/structures` (web.php :505) |
| **Controller** | `FeesController::storeStructure()` |
| **Model** | `FeeStructure` (org_id, academic_year_id, class_id, fee_type, amount, frequency, is_compulsory, applicable_from/to) |
| **Purpose** | Define what fees exist per class per academic year, with amounts and frequency (monthly/quarterly/annual) |

### Step 3: Fee Assignment

| Item | Detail |
|------|--------|
| **Routes** | `POST /fees/assign` (:508), `POST /fees/import` (:509), `POST /fees/carry-forward` (:510) |
| **Controller** | `FeesController::assignFees()` |
| **Page** | `resources/js/Pages/dashboard/AssignFees.tsx` |
| **Flow** | Admin assigns structures to individual students or bulk to all students in a class. Creates `StudentFee` records per student. Supports bulk import and carry-forward from previous session. |

### Step 4: Fee Collection

| Item | Detail |
|------|--------|
| **Routes** | `POST /fees/payments` (:511) through `POST /fees/online/upi/confirm` (:518) |
| **Controller** | `FeesController::collectPayment()`, `OnlinePaymentController` |
| **Model** | `FeePayment` (receipt_number, amount, payment_method, transaction_id, cheque_number, bank_name, collected_by, status) |
| **Payment methods** | cash, cheque, online (Razorpay), UPI, card |
| **Flow** | Accountant selects student → views outstanding fees → collects payment → receipt auto-generated → `StudentFee.paid_amount` and `balance` updated |

### Step 5: Receipts & Challans

| Item | Detail |
|------|--------|
| **Routes** | While collecting: `GET /fees/challans` (:519-523), due slips (:524-527) |
| **Purpose** | Generate challans for manual payments, due slips for student reminders, both printable/exportable |

### Step 6: Concessions & Scholarships

| Item | Detail |
|------|--------|
| **Routes** | `GET /fees/concessions` (:529-531), `GET /scholarships` (:936-940) |
| **Models** | `FeeConcessionRequest`, `StudentScholarship` |
| **Flow** | Parents/students submit concession requests → admin approves → discount applied to `StudentFee.discount`. Scholarships tracked separately. |

### Step 7: Fee Audit & Reconciliation

| Item | Detail |
|------|--------|
| **Routes** | `GET /fees/audit` (:528), `GET /fees/reconciliation` |
| **Models** | `FeeAudit`, `AccountTransaction` |
| **Purpose** | Track every fee-related change (audit log). Reconcile collected payments with bank/UPI/Razorpay records. |

---

## Part C — Fee Data Model Relationships

```
FeeType
  └─ FeeStructure (org, year, class)
       └─ StudentFee (per student per fee type per period)
            ├─ FeePayment (collections; receipt_no)
            ├─ FeeConcessionRequest (discount)
            └─ StudentScholarship (scholarship amount)
```