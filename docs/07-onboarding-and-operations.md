# QGurukul — Onboarding & Operations Guide

---

## Part A — Platform Setup (Super Admin)

### 1. Initial Platform Bootstrap
1. Install app, run migrations, configure `.env`.
2. Seed a `super_admin` user (via seeder or manual DB insert).
3. Configure `VITE_REVERB_*` for realtime notifications, SMS/WhatsApp provider keys, Razorpay keys (if online payments used).

### 2. Create a New Organization

**Route:** `POST /superadmin/organizations`
**UI:** Super Admin Dashboard → "Add Organization"

Form fields:
| Field | Required | Notes |
|-------|----------|-------|
| Organization Name | Yes | Display name |
| Slug | Yes | Auto-generated from name; unique |
| Email | Yes | Becomes the admin login email |
| Phone | Yes | — |
| Type | Yes | school / college / coaching / university |
| Portal Routing | Yes | path / subdomain / query / session |
| Status | Yes | active / inactive |
| Subscription Plan | Yes | basic / pro / custom |
| Start & End Date | Yes | Access period |
| Max Students / Max Staff | Yes | Platform limits |

**Result:** `Organization` + `admin` user created atomically. Admin can immediately log in.

### 3. Impersonation
Superadmin can impersonate any org's admin (bypasses subscription expiry during impersonation).

### 4. Billing Center
| Page | Route | Purpose |
|------|-------|---------|
| Billing Center | `GET /billing-center` | Manage all orgs' subscriptions/plans/payments |
| Subscription (org view) | `GET /subscription` | Org admin views own subscription |

---

## Part B — Admin First-Login Checklist

After the admin logs in for the first time, configure the org in this recommended order:

### 1. General Settings
**Page:** `/settings` (`Settings.tsx`)
- School/college name, address, contact
- Academic session (e.g. 2025-2026)
- Currency, timezone, session dates

### 2. Academic Setup
| Page | Route | Purpose |
|------|-------|---------|
| Sessions / Academic Years | `/settings/sessions` | Define current academic year; mark `is_active` |
| Semesters | `/settings/semesters` | Optional subdivisions |
| Classes & Sections | `/classes`, `/sections` | e.g. Class 10 → A, B |

### 3. Module Management
**Page:** `/module-management` (`ModuleManagement.tsx`)
- Enable/disable gateable modules: audit-trail, assets, assessment, digital-evaluation, report-cards, CBC, apps-center, dashboard-themes, face-search, branch-admin
- Core modules cannot be disabled

### 4. Staff / HR Setup
| Page | Route | Purpose |
|------|-------|---------|
| Staff Management | `/staff` | Create staff users (teachers, accountant, receptionist, librarian, driver) |
| Departments & Designations | `/staff/departments`, `/staff/designations` | Optional org structure |
| Roles & Permissions | `/settings/roles-permissions` | Review/tweak permission matrix per role |

### 5. Website CMS
| Page | Route | Purpose |
|------|-------|---------|
| Website CMS | `/website-cms` | Edit public templates (TemplateOne–Five), hero slides, brand |
| CBSE Disclosure | `/website-cms/cbse-disclosure` | Mandatory public info page |
| Public Admission Form | `/admissions/apply` | Public-facing application (preview) |

### 6. Fees Setup
| Page | Route | Purpose |
|------|-------|---------|
| Fee Types | `/fees/types` | Define fee categories |
| Fee Groups | `/fee-groups` | Bundle fee types |
| Fee Structures | `/fees/structures` | Define amounts per class per year |
| Assign Fees | `/assign-fees` | Assign to students/classes |

### 7. Operational Modules
Configure and operate each as needed:
- Attendance (QR settings, correction rules)
- Exams (exam types, grade scales)
- Transport (routes, vehicles, drivers)
- Hostel (blocks, rooms, beds, allocations)
- Library (categories, books)
- HR (payroll, leave types, salary templates, holidays)
- Communication (provider keys, notice board, comms wallet)

---

## Part C — Role-by-Role Usage Guide

### Super Admin
- Create/manage organizations, view all orgs
- Billing Center: subscriptions, plans, payment history
- Impersonate any org admin
- Manage platform-wide settings; DB-level config; knowledge base CMS

### Branch Admin
- Switch between assigned organizations (pivot table)
- Manage schools as if admin within active branch
- Cannot access Billing Center / superadmin-only pages

### Admin (per org)
- **Everything within the org**: settings, modules, staff, roles, website
- Approves fee concessions, exit requests, attendance corrections

### Teacher
- Mark attendance / QR attendance
- Enter exam marks, publish datesheets
- Create lesson plans, homework, study materials
- Join PTM sessions, record remarks
- View own timetable

### Receptionist
- Front office: enquiries, visitor register, phone calls, postal
- Online admission: review + enroll inquiries
- Transport: fare management, fee collection
- Notice board / communication broadcasting

### Accountant
- Fee collection, receipts, due slips, challans
- Income/expense entries, bank accounts
- Inventory, Tally integration, payroll payments
- Fee reconciliation

### Librarian
- Library catalog, circulation (issue/return), member cards
- E-library management

### Driver
- View assigned transport routes/vehicles
- Mark trips with GPS, log route activity
- Check messages, view own leaves

### Student / Parent
- View attendance, fees, results, homework
- Submit homework, take online exams
- View own hostel allocation, certificates, TC
- Respond to surveys, chat with teachers

---

## Part D — Day-to-Day Operations

### Daily admin routine
- Staff attendance marking
- Review attendance corrections
- Approve leave requests
- Check fee collections / dues
- Review notification rules and in-app notifications

### End-of-month ops
- Payroll generation + payslips
- Fee reconciliation
- Report generation (student, attendance, fee, exam)
- Compliance calendar check

### End-of-session ops
- Exam result finalization → report cards
- Student promotion to next class/session
- Transfer certificates for exiting students
- Carry-forward unpaid fees to next session
- Archive alumni records

### Subscription & renewal ops
- Check `subscription_end_date` approaching; renew via Billing Center / subscription page
- If expired → org access blocked; logs out existing sessions

---

## Part E — Support & Troubleshooting

| Symptom | Likely cause | Check |
|---------|-------------|-------|
| "Organization subscription expired" on login | Subscription end date past | Billing Center → set new date |
| 403 on a page | Permission matrix denies feature | Roles & Permissions → grant `view` |
| Route hidden in sidebar | Module disabled or role missing from menu config | Module Management / `sidebarMenu.ts` roles |
| i18n string wrong on site | Manual translation override | Language Manual Entry → search key |
| Realtime bell not updating | Reverb not running / `.env` misconfig | `VITE_REVERB_HOST/PORT/APP_KEY` |
| Public org pages show wrong org | Session holds old org | Deep-link `?org=slug` or re-select on gateway |

---

## Part F — Impersonation & Security Notes
- super_admin bypasses subscription checks; impersonation sessions also bypass.
- `staff.permission` middleware is authoritative — frontend gating is cosmetic only.
- Admin safe features (`Profile`, `Edit Profile`) always pass even if permission matrix denies.
- System roles cannot be deleted; deleting a custom role reassigns users to `teacher`.
- All multi-org data access is enforced by manual `organization_id` scoping in controllers/services.