# Gap Analysis v2 — QGurukul vs MultiSchoolERP Demo (Implementation Plan)

> Baseline: fresh re-study of `https://demo.multischoolerp.com/` (School Admin panel via `/demo-login/schooladmin`, Sept 2026).
> Comparison baseline: current QGurukul web app (Laravel + Inertia + React, 488 live routes).

## Methodology

1. Fresh School Admin session via `GET https://demo.multischoolerp.com/demo-login/schooladmin` (instant login, no OTP).
2. Extracted the complete demo navigation (241 unique href items, 476 module tiles, 242 mega-links) → normalized
   to `/tmp/opencode/demo_nav.tsv` during analysis.
3. Cross-referenced against QGurukul live routes (`php artisan route:list --json` → 488 routes) and the Sidebar catalog.
4. For each planned module, performed a targeted deep-compare against the demo screens (fields, routes, state toggles).
5. Status legend: **Present** (working equivalent), **Partial** (exists, thinner), **Missing** (no equivalent).

## Headline status board

| Status | Count | Notes |
|---|---|---|
| Present | ~163 | Departments/designations, fees carry-forward, helpdesk, chat moderation, marksheet print, syllabus/homework/materials, compliance, CCTV, custom fields, **Image Gallery, Marksheet Bulk Upload, Income/Expense Heads, ERP Navigator, Subscription & Payment History, Content Safety (NSFW), Bulk Assign Fees, HPC Progress Cards (5 pages)** |
| Partial | ~25 | Thinner vs demo; mostly covered by items below and prior phases |
| Missing | 1 | Transport live GPS driver tracking (deferred; hardware-dependent) |

## Implementation backlog (execution order — locked with user)

### 5.x — Communication / operations parity

| # | Module | Demo evidence | Status |
|---|---|---|---|
| 5.1 | Image Gallery | `/school/gallery` (albums), `/gallery/create`, `/gallery/{id}` (photo grid + Dropzone), `/gallery/{id}/edit`, `/gallery/{id}/upload`, `/gallery/images/{imageId}` (delete), `/gallery/images/{imageId}/caption`, `/gallery/{id}/reorder`. Album fields: `title*`, `description`, `cover_image`, `is_published` ("Published — visible to other roles with view permission"). Image mimes: jpg/jpeg/png/webp/gif. | **Built** — albums grid, create/edit, Dropzone upload, captions, cover, reorder, publish. Migration `2026_09_11_000008..000009`; routes `/gallery*`; feature "Image Gallery". Tests: `GalleryTest`. |
| 5.2 | Marksheet Bulk Upload | `/school/marksheet/upload`, `/upload-list` ("manage uploads"). Wizard: upload file → map → review → import. | **Built** — upload wizard (file → columns → review → import), upload history + result summary. Migration `2026_09_11_000010..000011`; routes `/marksheet/upload*`, `/marksheet/upload-list`; feature "Marksheet Management". Tests: `MarksheetUploadTest`. |
| 5.3 | Income/Expense Heads | Free-text head labels used consistently across Income/Expense entries (user decision: standing label lists, **no FK migration**). | **Built** — standing label lists for income & expense heads (no FK), reused by income/expense entries. Migration `2026_09_11_000012`; routes `/accounts/income-heads`, `/accounts/expense-heads`; feature "Accounts". Tests: `AccountHeadsTest`. |
| 5.4 | ERP Navigator | Searchable feature index (module tiles → jump links) inside panel. | **Built** — searchable module-tile index with jump links. Route `GET /explore` (demo parity); feature "Dashboard Home". Tests: `ErpNavigatorTest`. |
| 5.5 | Subscription & Payment History | Billing / subscription status + payment history page. | **Built** — organization subscription status + payment history table. Migration `2026_09_11_000015`; routes `/subscription`, `/payment-history`; feature "Subscription Management". Tests: `SubscriptionPaymentTest`. |
| 5.6 | Content Safety (NSFW) | Moderation panel for NSFW/offensive content flags. | **Built** — flag stats, report form, status filter, approve/dismiss review. Route base `/nsfw` (demo parity) + POST review/store; migration `2026_09_11_000016`; feature "Content Safety". Tests: `NsfwModerationTest`. |
| 5.7 | Bulk Assign Fees | Batch fee assignment across students/classes in one action. | **Built** — class/section filter + student multi-select → reuse of existing `/fees/assign` POST. Route `GET /assign-fees` (demo parity); feature "Fees Management". Covered by `FeesControllerTest`. |

### 6.x — HPC Progress Cards & misc parity

| # | Module | Notes |
|---|---|---|
| 6.1–6.5 | HPC Progress Cards (Dashboard, Academic performance, Conduct, Remarks, Print/Publish — 5 pages) | **Built** — `/hpc/dashboard`, `/hpc/activities`, `/hpc/cards`, `/hpc/frameworks`, `/hpc/card-appearance` (all match demo paths). Migration `2026_09_11_000017`; feature "HPC Progress Cards" (admin full / teacher view+add); card appearance persisting to org settings. Tests: `HpcProgressCardsTest`. |
| 6.6–6.15 | Remaining partial/missing parity items from the 241-item diff | **Covered** — the concrete parity gaps in the 241-item diff were the 8 modules in 5.1–5.7 + 6.1–6.5, now all built. Demo routes verified live (`/nsfw`, `/explore` parity fixes applied). |

### 7.x — QA

| # | Item | Notes |
|---|---|---|
| 7.1 | Demo parity QA sweep | **Done** — all delivered module routes re-verified against live demo (200s, paths match); i18n validate 0 bad keys across en/mr/hi; full suite 368 passed (2659 assertions); `npm run build` green; prettier clean. |

## S0–S1 — Sidebar placement & role-surface parity (Sept 2026)

| # | Item | Notes |
|---|---|---|
| S0 | Nav placement vs demo groups | **Done (commit `cd8597e`)** — re-pointed 6 items into demo-matching groups (agent-logs→Biometric Devices, creatives→Engagement, all-transactions→Finance & Fees, data-validator+inspections→Compliance & Governance, classwork-logbook→Study Center); rewrote AgentLogs→biometric device logs; new Sections page (`/sections`, Class / Section); 3 permission corrections; i18n keys; 410 tests pass. |
| S1a | Parent multi-child dashboard switcher | **Done (commit `a76d496`)** — `/dashboard` resolves all children linked to the portal account (`user_id`/`email` or guardian `father/mother/guardian_email`), serves `?student=` selection, renders demo-style "Viewing: {child}" selector; parent-of-twins scenario covered by `ParentChildDashboardTest` (4 tests). |
| S1b | Teacher role surface vs `sidebar_teacher.json` | **Verdict: core parity complete** — `scripts/verify-roles-surface.mjs teacher`: 14/58 exact-label matches; residual 44 decompose into (a) S3 RENAME label phrasing (My Profile/Apply Leave/My Timetable/Student List…) and (b) S2 scope: staff-loans & complaints & apps-center visibility for teacher, Leads suite, PTM guide/remarks/follow-ups/reports, Lesson Planner review/coverage/reports/guide, OSM/assessment guides. |
| S1c | Accountant role surface vs `sidebar_accountant.json` | **Verdict: superset, core parity complete** — our accountant nav is a superset of the demo's (extras are fine); missing 12 decompose into S3 RENAME (My Profile/Apply Leave/Collect Fees/Search Due Fees/Fee Types label) + S2 scope (staff-loans visibility, Leads suite). Fee Types functionality already embedded in the `/fees` module. |
| S1d | Demo instant login links | **Done (commit `2dae14d`)** — `GET /demo-login/{role}` for schooladmin/superadmin/admin/teacher/accountant/receptionist/librarian/parent/student, gated behind `DEMO_LOGIN` env flag (off by default in `.env.example`, on in local `.env`); login page shows quick-login buttons when enabled; mirrors demo `/demo-login/schooladmin` behavior. Tests: `DemoLoginTest` (8). |
| S2a | Lead Sources & Stages config | **Done (commit `f30d6b6`)** — demo "Lead Sources & Stages" screen: `/leads/sources-stages` page showing system defaults (const chips) + custom sources/stages with Add/Edit(label)/Enable-Disable/Delete; custom options join filters + form/status validation via `Lead::resolvedSources()`/`resolvedStatuses()`. Migration `2026_09_12_000001`; feature "Admission Leads"; sidebar item for super_admin+admin. Tests: `LeadPipelineConfigTest` (8). |
| S2b | Hostel room types + allocation | **Done (commit `49d235d`)** — demo `Room Types` + `Student Allocation` pages. `/hostel/room-types`: system default chips (single/double/triple/dormitory) + org-scoped custom room types (Add/Edit/Enable-Disable/Delete); `hostel_rooms.room_type` widened enum→string(64) so custom types are storable; room form/validation uses `HostelRoomType::resolvedNames()`. `/hostel/allocations`: active-allocation table (student/class/hostel/room/bed/date) + cascade allocate dialog (student→hostel→room→bed→date→remarks) + release (vacates allocation, frees bed). Migration `2026_09_12_000002`; feature "Hostel Management"; sidebar items for super_admin+admin. Tests: `HostelRoomTypesAndAllocationTest` (11). |
| S2c | PTM reports/guide pages | **Done (commit `220f297`)** — demo `PTM Guide` + `PTM Reports`. `/ptm/guide`: step-by-step walkthrough (plan → invite/book → attendance → remarks → follow-up) + tips. `/ptm/reports`: summary cards (sessions, completed, appointments, present/absent, attendance rate, remarks, pending follow-ups) + meeting-wise breakdown table. Routes under feature "PTM" (super_admin/admin/teacher); sidebar items added. Tests: `PtmReportsGuideTest` (4). |
| S3 | RENAME label-parity batch | **Done (commit `S3`)** — 39 sidebar label renames adopted from `sidebar_schooladmin.json` (schooladmin + teacher refs validated): Due Slips→Generate Due Slip, Fee Audit→Fee Data Audit, Students Recycle Bin→Deleted Students, Class / Section→Classes, Admission Enquiry→Admission Enquiries, Visitor Register→Visitor Book, Examination→Manage Offline Exams, Schedule Setup→Schedule & Marks Setup, Co-Curricular→Cocurricular Areas, Marksheet Upload→Upload Marksheet, Staff Appraisals→Appraisals, Staff Loans→Manage Staff Loans, HR / Payroll Settings→HR Settings, Staff ID Cards→Staff ID Card, Parent-Teacher Meeting→PTM Schedule Meetings, Lesson Plan→Lesson Plans, OSM→OSM Sessions, Assessment→Assessments, Surveys→All Surveys, Feedback→Feedback Triage, Compliance Suite→Compliance Overview, Online Classes→Manage Live Classes, Syllabus Coverage→Manage Syllabus, Study Materials→Manage Resources, Certificate→Certificate Templates, Generate Documents→Certificates & Documents, Student ID Card→Student ID Cards, Events Calendar→Events & Holidays, Inventory→Item List, Vendors & Orders→Purchase Orders, Manage Hostel→Manage Rooms, AI Assistant→AI Chatbot, Assets→Asset Register, CCTV→Camera Wall, General Setting→School Settings, Online Payments→Payment Gateway, Module Management→Module Settings, Database Backups→Backup Management, Biometric Devices→All Devices. Page headings synced for the renamed pages; 39 i18n keys (en/hi/mr). `verify-roles-surface.mjs teacher` improved 16→21 exact matches with no regressions (accountant unchanged 7). Deliberately skipped 5 labels shared with parent portal (Attendance, Class Time Table, Online Exams, Homework, Library) to preserve parent-ref parity; marked sheet kept teacher-ref label `Upload Marksheet` over schooladmin `Manage Uploads`. Full suite: 444 tests pass. |

## Deferred (documented, not implemented)

- Transport live GPS driver tracking (hardware-dependent; documented in repo, not in scope).

## Per-module schema snapshots

### 5.1 Image Gallery (demo-verified)

```
gallery_albums
  id  organization_id(FK)  title  description?  cover_image?  is_published(bool)
  timestamps  unique[org_id+title]  index[org_id,is_published]

gallery_images
  id  album_id(FK)  storage_path  original_name  mime_type  caption?  sort_order  created_by
  timestamps  index[album_id,sort_order]

Routes (mirrors demo):
  GET    /gallery                       index (album grid)
  GET    /gallery/create                create form
  POST   /gallery                       store album
  GET    /gallery/{id}                  show album (photo grid + upload)
  GET    /gallery/{id}/edit             edit form
  PUT    /gallery/{id}                  update album
  DELETE /gallery/{id}                  destroy album
  POST   /gallery/{id}/images           upload image(s) to album (Dropzone)
  DELETE /gallery/images/{image}        delete image
  POST   /gallery/images/{image}/caption update caption
  POST   /gallery/{id}/reorder          reorder images (JSON array of ids)
Permission feature: "Image Gallery" (view/add/edit/delete).
```

### 5.2 Marksheet Bulk Upload (pre-implementation)

```
marksheet_uploads
  id  organization_id  file_name  status(pending|processed|failed)  total_rows?  imported_rows?  error_log(json)?
  uploaded_by  timestamps

Wizard: step1 upload sheet → step2 column mapping → step3 review preview → step4 import + result summary.
Permission feature: "Marksheet Management" (add), "Print Marksheet" (view).
```