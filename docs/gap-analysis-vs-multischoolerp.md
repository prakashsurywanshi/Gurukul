# Gap Analysis — QGurukul vs MultiSchoolERP Demo

> Source of truth: live study of `https://demo.multischoolerp.com/` (School Admin panel, 2026).
> Comparison baseline: current QGurukul web app (Sidebar nav, 80 controllers, 117-table MySQL schema).

## Scope decisions

- **In scope:** Phase 1–4 web modules + custom fields / data validator / admission-form field builder.
- **Deferred / out of scope:** Flutter mobile apps (Parent/Staff/Driver), live GPS driver tracking, Windows
  biometric agent, AI analytics (lead scorer, fee-defaulter predictor, student risk, route optimizer,
  smart alerts). These are platform-scale artifacts tracked separately.

## Methodology

1. Logged into the demo via `/demo-login/schooladmin` (instant School Admin session).
2. Extracted the complete 191-item navigation (categories: `academics`, `students`, `finance`, `operations`,
   `engagement`, `admin`).
3. Cross-checked every item against QGurukul: `resources/js/Pages/Sidebar.tsx`, `app/Http/Controllers`,
   `database/schema/mysql-schema.sql`, plus keyword scans.
4. Status legend: **Present** (working equivalent), **Partial** (exists but thinner), **Missing** (no equivalent).

## Headline

- Demo School Admin nav: **191 items** across 7 categories.
- QGurukul sidebar: ~100 nav surfaces.
- **~35 module areas entirely missing**, **~25 present-but-thinner**.

## Missing module backlog (plan order)

### Phase 1 — Academics

| Module | Demo items | QGurukul status | Notes |
|---|---|---|---|
| TC & Exit | `tc & exit` | Done | Transfer-certificate / leaving workflow (`student-exits`) |
| Datesheet | `datesheet` | Done | Per-exam datesheet with publish (`datesheets`) |
| Exam ops config | `exam types`, `manage periods`, `chapters & topics`, `assign class teacher`, `assign electives` | Done | Exam types, chapters & topics, exam schedule setup, class teacher & elective assignment (`exam-types`/`chapters-topics`/`exam-schedule`/`assign-*`) |
| Marks & grades | `enter marks`, `manage grades`, `teacher remarks`, `progress cards`, `generate/upload marksheet`, `schedule & marks setup` | Done | Marks entry, grade scales, report cards + marksheet generation/print (`exams/marks`, `manage-grades`, `report-card`) |
| CBC / competency | `cbc assessments/dashboard/reports`, `strands & outcomes`, `core competencies`, `pathways & tracks`, `cocurricular areas/grades` | Missing | Deferred (larger curriculum redesign) |
| OSM assessment | `osm evaluate/guide/moderation/reports/sessions` | Missing | Deferred (named assessment framework) |

### Phase 2 — Finance & operations

| Module | Demo items | QGurukul status | Notes |
|---|---|---|---|
| Fee structure config | `fee types`, `fee groups`, `fees discount` | Done | Fee types, groups and discounts managed (`fee-groups`, `fee-discounts`) |
| Universal import | `import center` | Done | Import center with Students/Staff/Fees/Income/Expenses/Library importers (`import-center`) |
| Document vault | `document vault` | Done | Staff/student document storage (`document-vault`) |
| Gate passes | `gate passes`, `gate terminal` | Done | Entry/exit passes with used/cancel lifecycle (`gate-passes`) |
| Houses & categories | `student houses`, `student categories` | Done | House + category config, assignable to students (`houses-categories`) |
| Facilities / campus workers / directory | `facilities`, `campus workers`, `staff directory` | Done | Facilities registry, campus-worker roster, staff directory (`facilities`/`campus-workers`/`staff-directory`) |
| Store ops | `point of sale`, `sales history`, `supplier payments`, `goods receipts` | Done | POS + sales history, GRN (stock + ledger), supplier payments in `store-pos`/`store-receipts`/`store-payments` |

### Phase 3 — HR & engagement

| Module | Demo items | QGurukul status | Notes |
|---|---|---|---|
| Leave types config | `leave types`, `approve leave` | Done | Leave-type catalogue (`staff/leave-types`) on top of existing leave flows |
| Staff loans | `manage staff loans` | Done | Loan registry + EMI tracking/outstanding in `staff/loans` |
| Staff appraisals | `appraisal criteria/cycles`, `appraisals` | Done | Appraisal cycles + staff appraisals in `staff/appraisals` |
| Salary config | `salary templates`, `set salary` | Done | Templates with computed gross/net (deductions) + per-staff assignments in `staff/salary-templates` |
| Surveys | `survey dashboard`, `all/my surveys`, `survey guide` | Done | Survey manager + response tracking with ratings in `surveys` |
| Engagement extras | `birthday manager`, `festival greetings` | Done | Auto birthdays from staff profiles + manual registry + greetings in `engagement` |
| Comms wallet / broadcast | `comms wallet`, `compose broadcast`, `broadcast history` | Done | Per-channel credit wallet (sms/email/whatsapp/push), per-staff allocations, ledger in `comms-wallet` |
| Chat moderation | `chat moderation`, `content safety` | Done | Chat message queue with approve/hide moderation + flags in `chat-moderation` |

### Phase 4 — Compliance, reports, security

| Module | Demo items | QGurukul status | Notes |
|---|---|---|---|
| Compliance suite | `compliance overview/packs/checklist/calendar` | Done | Pack + checklist tracking with frequencies, due dates, status & completion in `compliance` |
| Regulator reports | `cbse disclosure`, `government reports` | Done | CBSE disclosure (gender/class splits) + government/RTE aggregates (attendance, staff by role) in `regulator-reports` |
| CCTV | `cctv cameras`, `camera wall`, `cctv access log`, `face monitoring`, `search by photo` | Partial | Camera registry + tamper-proof access log (view/export/photo search) in `cctv`; face monitoring is hardware-dependent |
| QR / attendance | `qr attendance report`, `qr scan audit`, `attendance logs` | Now Done | QR attendance writes scan logs (`qr_scan_logs`); scan audit dashboard with success rate & today counts in `qr-scan-audit` |

### Custom fields (final)

| Module | Demo items | QGurukul status | Notes |
|---|---|---|---|
| Custom fields / data validator / admission form fields | `custom fields`, `data records`, `data validator`, `admission form fields`, `field settings` | Partial | Custom field definitions (text/textarea/number/date/dropdown) for students & staff, per-record data entry + completion/required validator in `custom-fields`; admission-form binding flag present, UI binding deferred |

## Partial-but-thinner (reference)

| Area | We have | Demo additionally has |
|---|---|---|
| Leads | CRUD + status/source | Pipeline board, stages config, lead dashboard, lead scorer |
| Lesson planning | lesson plans | Approvals, review, coverage reports, settings/guide |
| PTM | sessions | Attendance & remarks, follow-ups, reports/guide |
| Website CMS | CMS + pages | Template studio, creatives, testimonials, hero slides, nav builder |
| Certificates / ID cards | print | Card design studio (appearance templates) |
| Hostel | management + fees | Room types, student allocation |
| Inventory | items + stock | Goods receipts, POS |
| Transport | routes + fees | Live vehicle tracking |
| Library | books + issue/return | Dedicated category/config dashboards |
| Biometric | settings | Agent connector, device logs |
| Reports | report center | Government/compliance reports |

## Implementation convention (every module)

1. **Live deep-compare** — pull the module's demo pages/session; snapshot fields/schema into this doc's
   per-module section before coding.
2. Migration (idempotent, sqlite-safe, mirrors demo schema) → Model → Controller/Service →
   `RolePermissionCatalog` feature → routes behind `staff.permission:<Feature>,<action>` →
   React page → Sidebar nav + en/mr/hi i18n → feature tests → gates.
3. Gates: `php -l`, prettier, `validate-i18n` (0 bad), `npm run build`, full `php artisan test`.

## Per-module deep-compare notes

_(filled progressively during implementation)_