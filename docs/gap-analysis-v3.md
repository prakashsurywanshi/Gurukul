# Gap Analysis v3 — QGurukul vs MultiSchoolERP (Deep-Study Reference)

> Fresh deep-study: `https://demo.multischoolerp.com/` (login surface + marketing v3.7) + in-repo session captures
> (`docs/reference/sidebar_*.json`, `docs/reference/gap_matrix.md`), cross-verified against the **current** QGurukul
> codebase via route JSON, controllers, React pages, migrations and tests (September 2026).
> Comparison baseline: QGurukul web app — Laravel 12 + Inertia v2 + React 19 + Tailwind v4, ~900 routes, 219 dashboard pages,
> 108 RBAC features, 32 gateable modules, **664 tests / 4942 assertions** green.

## 1. Demo topology studied

- **Roles on the login surface:** Platform Owner (`/demo-login/superadmin`), School Admin (`/demo-login/schooladmin`),
  Branch Admin (`/demo-login/branchadmin`), Teacher, Accountant, Student/Parent. Demo is server-rendered Laravel + Blade,
  so every module is a distinct crawlable route.
- **Navigation captures** (in-repo): `sidebar_schooladmin.json` (241 unique hrefs), `sidebar_teacher.json`,
  `sidebar_accountant.json`, `sidebar_parent.json`.
- **Marketing inventory (v3.7):** "48+ Feature Modules" grid + 50-item feature list — admissions & enrollment, role &
  permission, data import/export, certificate generator, front office desk, alumni, promotion & transfer, disciplinary
  records, online exams, attendance, homework, timetable, report cards, library, virtual library, lesson planning, live
  classes, study center, question bank, fee collection, expense, payroll, **Tally integration**, inventory, vendor,
  scholarship & discounts, misc income, WhatsApp/SMS/Email, notice board, live chat, parent helpdesk, event calendar,
  staff mgmt, leave, visitor, teacher evaluations, **recruitment & hiring**, staff ID cards, **parent/staff mobile apps**,
  **bus tracking GPS**, **REST API**, **biometric agent**, transport, hostel, **Google/Microsoft SSO**, **automated backups**.

## 2. Status legend

- **BUILT** — route + functioning page + backend model/data + tests in QGurukul.
- **PARTIAL** — surface exists but no dedicated route/page or no tests (thin).
- **MISSING** — no equivalent at all (currently **0**).

## 3. Demo-parity status (26 reference "NEW" items re-verified against current code)

| Demo item (path) | v2 status | v3 status | Evidence |
|---|---|---|---|
| Contact Support `/school/support` | NEW | **BUILT** | `ContactSupport.tsx`, `SupportTicket`, `ContactSupportFeatureTest` |
| Sections `/school/sections` | NEW | **BUILT** | `Sections.tsx`, ClassesController@sections, `DashboardExtrasFeatureTest` |
| Appraisal Criteria `/school/appraisal-criteria` | NEW | **BUILT** | `AppraisalCriteria.tsx`, `S4bAppraisalCriteriaTest` |
| Agent Logs `/school/biometric/system-logs` | NEW | **BUILT** | `AgentLogs.tsx` (real `BiometricLog`), `DashboardExtrasFeatureTest` |
| Data Validator `/school/compliance/validator` | NEW | **BUILT** | `DataValidator.tsx`, `DataValidatorFeatureTest` |
| Inspections `/school/compliance/inspections` | NEW | **BUILT** | `Inspections.tsx`, `InspectionsFeatureTest` |
| Library Issue/Return `/school/library/issue-return` | NEW | **BUILT** | `LibraryManagement.tsx` circulation, `ApiContractTest` |
| Inventory Issue/Stock/Items/Suppliers | NEW | **BUILT** | `InventoryManagement.tsx`, 6 models, `StoreOpsTest` |
| Transport Drivers `/school/transport/drivers` | NEW | **BUILT** | `TransportDrivers.tsx`, `BuildSurfacesTest` |
| Knowledge Base Articles | NEW | **BUILT** | `KnowledgeBase.tsx`, `KnowledgeBaseCmsTest` |
| Payment Gateway `/school/gateway-settings` | NEW | **BUILT** | `OnlinePaymentSettings.tsx`, `OnlinePaymentSettingsTest` |
| Engagement Birthdays/Festivals/Creatives | NEW | **BUILT** | `Engagement.tsx`, `Creatives.tsx`, `EngagementCommsTest` |
| All Transactions `/school/transactions` | NEW | **BUILT** | `AllTransactions.tsx`, `AllTransactionsFeatureTest` |
| Classwork & Logbook `/school/study-center/classwork` | NEW | **BUILT** | `ClassworkLogbook.tsx`, `ClassworkLogbookFeatureTest` |
| Manage Uploads (marksheet) | NEW | **BUILT** | `MarksheetUploads.tsx`, `MarksheetUploadTest` |
| Website Hero Slides `/school/website/slides` | NEW | **BUILT (P1)** | slider images upload/destroy in `WebsiteCms.tsx`; `WebsiteCmsSurfacesTest` 5 tests |
| Website Testimonials `/school/website/testimonials` | NEW | **BUILT (P1)** | editable inside template arrays; `WebsiteCmsSurfacesTest` |
| Website Nav Menu `/school/website/navigation` | NEW | **BUILT (P1)** | shared nav labels in CMS; `WebsiteCmsSurfacesTest` |
| Departments `/school/departments` | NEW | **BUILT (P1)** | standalone `Departments.tsx` + full CRUD + staff count; `DepartmentsDesignationsFeatureTest` |
| Designations `/school/designations` | NEW | **BUILT (P1)** | standalone `Designations.tsx` + full CRUD + staff count; `DepartmentsDesignationsFeatureTest` |
| Appraisal Cycles `/school/appraisal-cycles` | NEW | **BUILT (P1)** | update/destroy routes added; edit/delete UI in `StaffAppraisals.tsx`; `AppraisalCycleFeatureTest` |
| Assessments `/school/assessment/assessments` | NEW | **BUILT (P1)** | `Assessment.tsx` + controller; `AssessmentFeatureTest` 6 tests |
| Cocurricular Areas `/school/cocurricular-areas` | NEW | **BUILT (P1)** | `Cocurricular.tsx` + CRUD; `CocurricularFeatureTest` 6 tests |
| CBC Strands `/school/cbc/strands` | NEW | **BUILT (P1)** | `Cbc.tsx` tab + model; `CbcFeatureTest` |
| CBC Core Competencies `/school/cbc/competencies` | NEW | **BUILT (P1)** | `Cbc.tsx` tab + model; `CbcFeatureTest` |
| CBC Pathways `/school/cbc/pathways` | NEW | **BUILT (P1)** | `Cbc.tsx` tab + model; `CbcFeatureTest` |

**Counts (P1 shipped):** BUILT 26 · PARTIAL 0 · MISSING 0 — all 26 reference "NEW" items closed.

## 4. Template / card-design / preview deep-dive (our surfaces vs a "world #1" studio)

| Surface | Configurable today | Preview | Print/export | Verdict |
|---|---|---|---|---|
| Certificates (`CertificateManagement.tsx`) | drag-drop blocks, move/align, B/I/U, undo, watermark, 5 presets, variables | live preview canvas | browser print / bulk issue | **True designer — the engine to generalize** |
| ID cards (`CardDesigns.tsx` + controllers) | `layout`, `primary_color`, photo/admission-no/QR/guardian/blood-group/DOB toggles | `CardFace.tsx` live preview on designer **and** student/staff card pages | print styles + `window.print()` | **P2.2 BUILT:** `id_card_design` persisted by service and consumed everywhere |
| HPC card appearance (`HpcCardAppearance.tsx`) | accent/title/primary/accent colors, font size, logo/grades toggles | live sample-card preview (P2.3) | print | **P2.3 BUILT:** refactored onto shared `AppearanceService` |
| Report cards (`ReportCard.tsx`) | layout (standard/landscape), rank/percentage/remarks/topic-to-grade toggles, header color, default | live editor panel + appearance applied to report (P2.3) | print | **P2.3 BUILT:** new `report_card_appearance` setting via shared `AppearanceService` |
| Website CMS (`WebsiteCms.tsx` + `WebsiteCmsEditor.tsx`) | 5 templates (TemplateOne–Five), 4 themes (white/aurora/sunrise/emerald), per-section toggles, SEO/hero/features/admissions/gallery/events/contact | **live template preview** (lazy-loaded, error boundary) | n/a | strongest generic preview pattern |
| Document/ID-grid (`GenerateDocument.tsx` + preview) | layout certificate|id_grid, CR80 + custom mm sizes, paper A4/A3/letter/legal, orientation, margin/gap, cut marks, align, duplex (front_only/long_edge/side_by_side) | mm-accurate scaled sheet | `window.open` + `window.print()` (save-as-PDF) | best sheet engine; PDF still browser-side |

**Global PDF finding:** no server-side PDF renderer anywhere (no dompdf/Snappy/Chromium); every "PDF" is a print dialog. — **P2.4 CORRECTED:** added `App\Services\PdfService` (`config/pdf.php`; drivers `dompdf` default, headless `chromium` with dompdf fallback, `browser` print page) + **Print & Export Center** hub (`GET /print-center`); migrated payroll payslip, reports export, fee challan batch/single + due-slip endpoints onto the service. `GenerateDocument` grid sheets remain browser-side print.
**Dashboard branding:** only light/dark/system (`Themes.tsx` + next-themes); no org-level panel color/font/logo engine.
**Shared tokens:** `{{student_name}}`, `{{admission_no}}`, `{{class}}`, `{{section}}`, `{{school_name}}`, `{{issue_date}}`,
`{{issued_by}}`, `{{achievement}}` resolved server-side (`substitute()`).

## 5. Customization / cross-cutting infrastructure (our strengths)

- **RBAC:** `RolePermissionCatalog` — 108 features × (view/add/edit/delete); enforced via `staff.permission` 774× web /
  188× API; super_admin hard bypass; custom roles per org; sidebar gated.
- **Module toggles:** `ModuleRegistry` (32 modules), stored `organizations.features`, enforced middleware
  `module.enabled` + sidebar hiding; core modules non-disableable.
- **Org settings:** `organizations.settings` JSON (currency, timezone, date format, session, notification rules,
  payment keys); `website_settings` key/value; plan/subscription gating at login + middleware.
- **Custom fields:** `CustomFieldDefinition`/`CustomFieldValue` — **P4.1 v2**: 6 entities (student, staff, lead, book,
  asset, inventory), 13 field types (text/textarea/number/date/select/url/email/phone/checkbox/radio/multi-select/
  currency/file) validated by shared `CustomFieldValueService` (regex pattern, min/max value, min/max length);
  `show_in_admission` wired into Create/EditStudent **and rendered + validated on the public admission form**
  (`custom_data` JSON on `AdmissionInquiry`, copied to the student on enroll).
- **Notifications:** DB-first `SystemNotification` + FCM HTTP v1 push (FirebaseCloudMessagingService, device tokens);
  realtime libs installed (Pusher/Echo) but bell not websocket-driven.
- **Approvals:** ~~per-module ad-hoc (FeeConcession, AttendanceCorrection, LessonPlan) — no generic engine.~~ **CORRECTED (P4.2):** generic approval-chain engine (`approval_flows`, `approval_flow_steps`, `approval_requests`, `approval_request_steps`). Config `/approvals` (per-module chains, role/user actors, enable/disable), action center `/approvals/action-center` + submitted `/approvals/submitted` with approve/reject/cancel; lazy default single-admin step preserves legacy behavior; `ensureForRecord` backfills legacy records; handlers migrated — FeeConcession (discount+applied_amount+ActivityLog), AttendanceCorrection (attendance updateOrCreate+ActivityLog), LessonPlan (approved_by/approved_at + auto-submit on plan creation when `require_approval`).
- **API:** `routes/api.php` 332 routes / 24 controllers, Sanctum, per-feature gates, parent portal endpoints; README
  declares REST for the Flutter companion (`flutter_gurukul` at `../flutter_gurukul`, `ApiService._baseUrl =
  https://qgurukul.qodeigence.com/api`).
- **Audit trail:** observer on 14 models + middleware; backups DB-dump; SSO Google/Facebook/GitHub (auto-provision parent).

## 6. Interconnection & detail-view gaps

1. ~~**Dead designer config:** `id_card_design` written/read only in `CardDesignController`; never passed to card generators.~~ **CORRECTED (P2.2):** wiring shipped — `IdCardDesignService` + `CardFace.tsx` drive designer, student and staff card pages; adds `layouts` default + 8-field settings consumed everywhere.
2. ~~**AuditTrail UI orphaned:** `AuditTrail.tsx` exists but no web route renders it.~~ **CORRECTED (P1.8):** `AuditTrail` is fully wired — route `/audit-trail` (`web.php:916`), sidebar id `reports-audit-trail` (`sidebarMenu.ts:3354`, module `audit-trail`), controller renders `dashboard/AuditTrail`, export + clear actions present.
3. ~~**List-first entities:** many modules lack a "360 hub" detail view with cross-links.~~ **CORRECTED (P3.1–P3.3):** Student 360 hub (P3.1), Staff/Class/Fee 360 hubs with breadcrumbs and deep links (P3.2), GlobalSearch cmdk wiring all 6 entity types role-scoped (P3.3). Cross-linking meets the "90%+ rows deep-link" bar; search covers students, staff, classes, fees, behavior, health.
4. ~~**GlobalSearch** (cmdk) not wired to entity search; breadcrumbs inconsistent across pages.~~ **CORRECTED (P3.3):** GlobalSearch rewritten as CommandDialog (Ctrl+K), renders 6 entity groups (students, staff, classes, fees, behavior, health) with role-scoped permission gates and entity-specific icons/hrefs.
5. **Detail rows** generally lack deep-link actions (e.g. fee row → student card, attendance row → student card).

## 7. College / Institute mode gap

- `organizations.type` supports `school/college/coaching/university` but the UI and terminology are school-flavored:
  no course/batch/semester/lecture/credit/CBCS mode, no per-type grading/attendance/fee semantics.

## 8. Tracking

This doc is the mutable reference. Per-module deep-compare notes, card/template/preview specs, and the interconnection
map get appended under section 9 as each module ships (roadmap in `docs/roadmap-v1.md`). Status is re-verified on every
phase completion; the v2 matrix + sidebar JSONs remain the historical raw captures.