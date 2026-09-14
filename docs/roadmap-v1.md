# QGurukul Roadmap v1 — to World-Class School / College / Institute ERP

> Source: `docs/gap-analysis-v3.md`. Target: fully-customizable, properly-interconnected #1 system
> (web admin + parent web + complete REST API for the Flutter companion), all phases gated.

## Module build convention (every surface)

1. **Migration** (idempotent, sqlite-safe, mirrors demo schema if any) → Model → Controller/Service → `RolePermissionCatalog` feature
   → `staff.permission:<Feature>,<action>` routes (web) → React page → Sidebar menu + `en/mr/hi` i18n → feature tests → gates.
2. **Gates:** `php -l`, prettier (TS only), `node scripts/validate-i18n.mjs` (0 bad), `npx tsc --noEmit`,
   `npm run build`, full `php artisan test` (target 700+).

## Phase acceptance criteria

### P1 — Close parity + clean dead code
- 11 PARTIAL surfaces become BUILT (dedicated route/page or verified wiring) **with tests**.
- `CardDesigns` wired-or-retired decision recorded; `AuditTrail.tsx` reachable via route.
- Accept: 0 MISSING, 0 PARTIAL-without-test.

### P2 — Design-studio engine + server PDF
- One shared `Designer` engine (elements/presets/tokens/live-preview) reused by certificates, ID cards (student+staff),
  report cards, HPC cards, slips/challans, marksheets.
- `CardDesigns` config consumed by card generation; on-screen previews everywhere.
- Server PDF with three backends: dompdf (Blade/deterministic), headless Chromium (render React preview), browser print
  fallback. mm-accurate sheets (CR80/A4/A3/letter/legal, cut marks, duplex) + print-center queue.
- Accept: every certificate/card/slip previews live; PDF download tests green.

### P3 — 360 hubs + interconnection
- Student 360 / Staff 360 / Class 360 / Fee 360 tabbed hubs with cross-links + breadcrumbs + row-action deep links.
- GlobalSearch (cmdk) resolves all primary entities role-scoped.
- Accept: 90%+ of list rows deep-link to a hub; search covers ≥6 entity types.

### P4 — Customization engines
- Field-builder v2: types url/email/phone/checkbox/radio/multi-select/currency/file; validation-rule builder; more
  entities (leads/books/assets/inventory); rendered on public admission form.
- Generic approval-chain engine (steps/approvers/notify) adopted by concessions + attendance-corrections + lesson plans.
- Notification rule engine (event→channel→recipients, digests, read receipts) + websocket bell.
- Panel theming/branding engine (logo/colors/fonts/density, live preview).

### P5 — Reports/export + i18n
- Saved-query report builder; PDF/CSV/Excel export center; en/hi/mr 0-fallback; RTL-safe layout readiness.

### P6 — College mode + platform
- Org-type mode: college/institute semantics (courses/batches/semesters/lectures/credits/CBCS) across exams/attendance/fees/reports.
- Platform: branch-admin multi-school; superadmin billing/subscription analytics.
- Flutter API completeness: map `routes/api.php` → `flutter_gurukul/lib/models` + screens; de-mock remaining
  `mock_data/` screens; version API `v1/`; contract tests.

## Burn-down

- [x] P0.1 Publish `docs/gap-analysis-v3.md`
- [x] P0.2 Publish `docs/roadmap-v1.md`
- [x] P1.1 Website Hero Slides / Testimonials / Nav surfaces + wiring + tests
- [x] P1.2 Departments standalone page + CRUD + tests
- [x] P1.3 Designations standalone page + CRUD + tests
- [x] P1.4 Appraisal Cycles full CRUD + tests
- [x] P1.5 Assessments feature tests
- [x] P1.6 Cocurricular feature tests
- [x] P1.7 CBC Strands/Competencies/Pathways feature tests
- [x] P1.8 Dead-code cleanup: AuditTrail route + CardDesigns decision
- [x] P2.1 Extract shared Designer engine
- [x] P2.2 Designer → student+staff ID cards; wire CardDesigns; previews
- [x] P2.3 Designer → report-card + HPC appearance
- [x] P2.4 PDF service (dompdf + Chromium + print fallback) + print-center + tests
- [x] P3.1 Student 360 hub
- [x] P3.2 Staff 360 + Class 360 + Fee 360 hubs + breadcrumbs/deep links
- [x] P3.3 GlobalSearch entity wiring
- [x] P4.1 Field-builder v2 + public admission rendering
- [x] P4.2 Generic approval-chain engine + migrate 3 modules (746 tests, 5838 assertions)
- [x] P4.3 Notification rule engine + digests + websocket bell (756 tests, 5865 assertions)
- [x] P4.4 Panel theming/branding engine (762 tests, 5897 assertions)
- [x] P5.1 Report builder + export center + i18n/RTL polish (771 tests, 5942 assertions)
- [ ] P5.2 —
- [ ] P6.1 College/Institute org-type mode
- [ ] P6.2 Platform: branch-admin + superadmin billing/analytics
- [ ] P6.3 Flutter API completeness + versioning + contract tests
- [ ] P6.4 Full regression gates (700+ tests)

## Notes & decisions log
- PDF engine question → user chose "all of above": dompdf + headless Chromium + browser print fallback.
- Platform scope → include branch-admin/superadmin billing; Flutter app exists at `../flutter_gurukul`; API-first.
- Status updated as phases ship; gate results recorded next to each phase.

## Phase gate results (recorded as we ship)
- **P1 (done, unbatched)**: `WebsiteCmsSurfacesTest` 5 tests / 38 asserts; `DepartmentsDesignationsFeatureTest` 9 tests / 69 asserts; `AppraisalCycleFeatureTest` 7 tests / 34 asserts; `AssessmentFeatureTest` 6 tests / ~? ; `CocurricularFeatureTest` 6 tests; `CbcFeatureTest` 7 tests. All green. i18n 0 bad, tsc clean, prod build OK.
- P1.8 notes: `AuditTrail` was **already fully wired** (route 916 + sidebar 3354 + controller renders `dashboard/AuditTrail`) — earlier gap-note was wrong, corrected in v3. `CardDesigns` (org `settings.id_card_design`, 8 fields) still unconsumed by `StudentIdCardManagement`/`StaffIdCards` → wiring moved to P2.2.
- **P2 (done, committed)**: 
  - P2.1+P2.2 — shared designer engine: `app/Services/IdCardDesignService.php`, `resources/js/components/designer/cardTypes.ts` + `CardFace.tsx`; `CardDesigns` page rewritten with live CardFace preview; `StudentIdCardManagement` (CardFace replaces hard-coded preview, QR gated by design) + `StaffIdCards` (design-aware print builder + live preview) wired; controllers pass `design`. `IdCardDesignFeatureTest` 5 tests / 69 asserts.
  - P2.3 — shared `App\Services\AppearanceService` (primary/accent/font/logo/grades) drives **report-card** appearance (new `PATCH /exams/report-card/appearance` + editor panel + live color/font/grades application) and **HPC** (`HpcController` refactored onto the service, `HpcCardAppearance` gains live sample-card preview). `ReportCardAppearanceFeatureTest` 4 tests / 44 asserts; HPC regression green.
  - P2.4 — `config/pdf.php` + `App\Services\PdfService` (drivers: `dompdf` default, `chromium` headless w/ dompdf fallback, `browser` print page); migrated 5 existing PDF endpoints (payroll payslip, reports export, fee challan batch + single + due slip) onto the service; new **Print & Export Center** hub (`GET /print-center`, sidebar Reports group). `PdfServiceAndPrintCenterTest` 6 tests / 27 asserts.
  - Gates: full suite **719 tests, 5326 asserts pass** (baseline was 664 tests); i18n 0 bad (4437 keys ×3), tsc clean, prod build OK.
- Gate baseline note: coverage grew 664 → 719 across P1+P2 (+ ~55 tests).
- **P3.1 (done)**: Student details page (`dashboard/students/StudentDetails`) upgraded into a **tabbed Student 360 hub** — permission-gated tabs (Overview / Fees / Attendance / Exams / Certificates / Behaviour / Health / Exit-TC) gated by `staffPermissions` (super_admin + non-managed roles bypass), breadcrumbs, and per-slice summary panels with deep links to the full staff pages (`/fees?tab=collection`, `/attendance`, `/exams/report-card?student=..&exam=..`, `/certificates`, `/student-behavior?student_id=`, `/student-health?student_id=`, `/student-exits`); server aggregation added in `StudentsController::show` → `hub` prop (`buildStudentHub()`) covering fees (bills/outstanding/paid/pending), attendance status counts, latest exam result + report-card exam id, issued certificates, behavior incidents (open/resolved/latest), latest health record, latest exit/TC record, and enrollment status. `Student360HubTest` 4 tests / 113 asserts (full summaries, empty defaults, cross-org isolation, permission denial). Gates: full suite **723 tests, 5439 asserts pass**; i18n 0 bad (4474 keys ×3); tsc clean; prod build OK.
- **P3.2 (done)**: Added the **Staff 360**, **Class 360**, and **Fee 360** interconnection pieces following the P3.1 hub pattern:
  - Staff 360: new `GET /staff/{managedUser}` route (`users.show`) + `UsersController@show` → `dashboard/staff/StaffDetails` tabbed hub (Overview / Daily Attendance / Payroll / Leave / Appraisals / Loans) gated by `staffPermissions` + breadcrumbs (`Staff > name`); `hub` prop from `buildStaffHub()` aggregates attendance status counts (+ this-month present), latest payroll entry + net pay, annual leave balances + pending/approved, latest appraisal (score/rating/cycle/status), and active-loan outstanding; permission-gated quick-access deep links to `/staff/payroll-management`, `/staff/leave-management`, `/staff/appraisals`, `/staff/loans`, `/staff/daily-attendance`. Staff rows in `UserManagement.tsx` and `StaffDirectory.tsx` now deep-link to the hub (`ExternalLink` action; `id` added to the StaffDirectory payload).
  - Class 360: new `GET /classes/{schoolClass}` route (`classes.show`) + `ClassesController@show` → `dashboard/classes/ClassDetails` tabbed hub (Overview / Subjects / Timetable / Students) with breadcrumbs (`Classes > name`); `hub` prop from `buildClassHub()` lists pivot-assigned subjects (with teachers), timetable entries for the class, and the class summary (room/capacity/class teacher/active student count); deep links to `/class-time-table` and `/search_students`. Class rows in `ClassManagement.tsx` deep-link to the hub. Added missing `SchoolClass::subjects()`, `StudentAcademicHistory` aware `student_count`, and fixed the broken `StaffAppraisal::cycle()` FK (`cycle_id` → `appraisal_cycle_id`).
  - Fee 360: `StudentsController@show` now accepts & validates `?tab=` (whitelist, defaults `overview`, passed as `tab` prop) and `StudentDetails.tsx` honors it and keeps the URL in sync on tab switch; FeeManagement collection rows gained an "Open Student Hub" deep link to `/students/{id}?tab=fees`.
  - Shared hub UI helpers extracted to `resources/js/Pages/ui/hub.tsx` (StatChip / InfoRow / OpenPageButton / formatMoney).
   - Tests: `Staff360HubTest` 4 tests / ~93 asserts (full summaries incl. net pay + outstanding loan math, empty defaults, cross-org isolation, cross-org 404 + driver 403), `Class360HubTest` 4 tests / ~54 asserts (full hub, empty defaults, cross-org 404, driver 403), `Student360HubTest` +1 test for tab validation (5 tests). i18n +40 keys ×3 (en/hi/mr, 4513 keys each, 0 bad).
   - Gates: full suite **732 tests, 5635 asserts pass**; i18n 0 bad; tsc clean; prod build OK.
- **P3.3 (done)**: GlobalSearch upgraded from a 2-group Popover to a **cmdk CommandDialog** (Ctrl+K / Cmd+K shortcut, keyboard-navigable) resolving **6 entity types** — students, staff, classes, fees, behavior, health — each with role-scoped permission gates (`User Management`, `Class / Section`, `Fees Management`, `Discipline`, `Student Health`) and entity-specific icons (`GraduationCap`, `Users`, `School`, `Wallet`, `ShieldAlert`, `HeartPulse`). Backend `GlobalSearchController` already returned all 6 groups; frontend now renders them all in grouped `CommandGroup` sections with entity-specific deep-link hrefs (`/students/{id}`, `/staff/{id}`, `/classes/{id}`, `/students/{id}?tab=fees`, `/student-behavior?student_id={id}`, `/student-health?student_id={id}`). `GlobalSearchFeatureTest` expanded from 6 → 7 tests / 57 asserts covering all 6 entity types for admin, permission-gating for teacher (students only), cross-org scoping, blank query, and staff href correctness. Gates: full suite **733 tests, 5656 asserts pass**; i18n 0 bad (4513 keys ×3); tsc clean; prod build OK.
- **P4.1 (done)**: Custom-field builder upgraded from student/staff + 5 field types to an app-wide **Field-builder v2**:
  - Migrations: `custom_field_definitions` gains `pattern`, `pattern_message`, `min_value`, `max_value`, `min_length`, `max_length`; `admission_inquiries` gains JSON `custom_data`.
  - New `App\Services\CustomFieldValueService` (shared validate/normalize engine): **6 entities** (student, staff, lead, book, asset, inventory), **13 field types** (text, textarea, number, date, select, url, email, phone, checkbox, radio, multi-select, currency, file), validation rules (regex pattern + custom message, numeric min/max, length min/max), and per-type normalization (multi-select → JSON string, checkbox → `'1'/'0'`, currency → `1234.50`, date → `Y-m-d`). Error-key prefix configurable (`values.*` vs `custom_fields.*`).
  - `CustomFieldsController` rewritten: definition create/update/destroy across all 6 entities (optioned types keep `options`, non-optioned null them), `storeValues` row-scoped per entity (404 for cross-org), dashboard `records` grouped by entity (lead/book/asset/inventory rows sourced from their model tables), `summary` shape updated to `recordCounts` + `entityEntities` + `entityLabels`.
  - Student create/edit now use the service (`StudentsController` keyed by `field_key`, `custom_fields.*` errors); multi-select values decoded back to arrays in `getStudentCustomFieldValues`.
  - **Public admission rendering**: `SettingsController@publicAdmissionForm` passes `admissionCustomFields`; `AdmissionInquiryController@store` validates + persists them as `custom_data` (rejects non-admission fields), `@enroll` copies them into the student's `custom_field_values`; `PublicAdmissionForm.tsx` renders them (all 13 types, incl. multi-select) and submits as `custom_fields`.
  - Frontend: `CustomFields.tsx` rewritten (validation-rule editor dialog, 6 entity cards + selector, options editor); `AdmissionCustomFields.tsx` rewritten for `string | string[]` values and all new types; `CreateStudent/EditStudent` typed for the new value record.
  - Tests: `CustomFieldsTest` 10 → **14 tests / 248 asserts** (new-type normalization, pattern/min/max/length rules incl. custom pattern message, all-entity dashboard listing + per-entity value scoping, public admission expose/store + enroll copy). Gates: full suite **737 tests, 5757 asserts pass**; i18n 0 bad (4513 keys ×3); tsc clean; prod build OK.
- **P5.1 (done)**: Saved-query **Report Builder** + CSV export + i18n/RTL polish:
  - `saved_reports` table + `SavedReport` model; `SavedReportController` (`GET/POST /reports/builder`, `PATCH …/toggle`, `DELETE …/{id}`, org-scoped, `filters` whitelisted to class/session/month/search/date_from/date_to).
  - `ReportsController` now hydrates filters from a saved report (`applySavedReport()`) at `index` and `exportPdf`, and gains **`exportCsv`** (`/reports/export-csv`, streamed `fputcsv` from the shared module-report rows).
  - `dashboard/ReportBuilder.tsx` page (create default-filtered reports; Run → Reports Center, Export PDF, Export CSV, enable/disable/delete) + sidebar "Report Builder" item; admin granted full CRUD on `Reports & Analytics` in `RolePermissionCatalog`.
  - **RTL-safe layout readiness**: `LanguageProvider` sets `document.documentElement.dir` (`ltr` now; `ar/ur/fa` hook present).
  - Tests: `SavedReportBuilderFeatureTest` 9 tests / 45 asserts (page loads, create, validation, filter hydration at run, CSV stream, PDF export, delete, cross-org delete/run forbidden). Gates: full suite **771 tests, 5942 asserts pass**; i18n 0 bad (4587 keys ×3); tsc clean; prod build OK.