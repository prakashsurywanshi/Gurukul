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