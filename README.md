# QGurukul — School Management ERP

QGurukul is a full-featured, multi-tenant **School/Education ERP (SaaS)** system. It combines a Laravel 12 backend with an Inertia + React frontend for the web dashboard, and a complete REST API (Laravel Sanctum) that powers a companion mobile app.

## Tech Stack

- **Backend**: PHP 8.2, Laravel 12, MySQL
- **Frontend**: Inertia.js + React 19 + TypeScript, Tailwind CSS v4, Radix UI (shadcn-style components), Vite
- **API**: Laravel Sanctum token-based API for mobile clients
- **PDF**: barryvdh/laravel-dompdf
- **Tooling**: PHPUnit, Laravel Pint, Vite

## Architecture

- **Multi-tenancy**: each school is an `organization` with subscription plan/dates and capacity limits (`max_students`, `max_staff`), enforced by the `EnsureOrganizationSubscriptionIsActive` middleware. A **Super Admin** manages all organizations, impersonates organization admins, configures SMTP, and edits the support knowledge base.
- **RBAC**: granular `role` / `role_permission` system with `staff.permission` middleware (`RolePermissionCatalog`, `StaffPermissionService`).
- **Audit trail**: `AuditTrailObserver` + `LogAuditTrail` middleware log all admin actions.
- **Async work**: database queue with jobs for student imports and WhatsApp sends; `composer dev` runs the HTTP server, queue worker, and Vite together.

## Feature Modules

1. **Academics** — classes/sections, subjects, timetables (class & teacher), lesson plans, homework with submissions/evaluation, offline exams with hall tickets & PDF marksheets, online exams with attempts
2. **Students** — admission, bulk CSV import (queued), alumni records, promotion between classes, academic history
3. **Fees & finance** — fee structures/types, assignments, payment collection with revert, income & expense management
4. **Front Office** — admission enquiry, visitor register, phone call log, postal dispatch/delivery, complaints
5. **Hostel** — hostels, rooms, beds, fee structures, allocations, fee collection, notices, lost & found, complaints
6. **Transport** — routes, vehicles, assignments, daily trips with journey-stop tracking, fee collection
7. **Library** — books, members, circulation (issue/return), acquisition requests, printable member cards
8. **Inventory** — categories, stores, suppliers, items, stock entries, issue/return tracking
9. **Communication** — messages, notice board, voice calls (Smartflo integration with audio), email campaigns, WhatsApp (self-hosted bridge and QWA API), download center with shareable links
10. **Certificates** — templates, bulk issuance, student ID cards, marksheet printing
11. **HR** — staff management, designations, departments, attendance, payroll, leave requests
12. **Website CMS** — editable public pages/settings, public homepage, online admission form (email-verified), privacy policy
13. **Extras** — reports & analytics, feedback campaigns, knowledge base, todos, notifications
14. **AI Analytics** — deterministic risk scoring (leads/fee defaulters/at-risk students), route-optimizer suggestions, weekly `ai:score` sweep, and risk-alert smart notifications

## External Integrations

- **Firebase Cloud Messaging** — push notifications via registered device tokens
- **QWA WhatsApp API** + **WhatsApp bridge** — WhatsApp messages with QR session management
- **Smartflo** — voice calls
- **SMTP** — email delivery
- **dompdf** — PDF generation (marksheets, certificates, ID cards)
- **Laravel Socialite** — single sign-on with Google, Facebook, and GitHub
- **AI Assistant** — OpenAI-compatible chat completions (works with local self-hosted providers too)
- **Laravel Reverb** — realtime chat broadcasting (falls back to smart polling when not running)
- **Biometric sync API** — device-synced attendance via a shared or per-organization key

## Advanced Features

### Single Sign-On (SSO)
Google, Facebook, and GitHub login are available on the login page. Enable with `SSO_ENABLED=true` and set the matching `*_CLIENT_ID`, `*_CLIENT_SECRET`, and `*_REDIRECT_URI` env vars (OAuth apps must allow the `/auth/sso/{provider}/callback` URLs). Existing users match by email; first-time SSO users are created on their organization. SSO settings for each provider are managed by Super Admin under **SSO Settings**.

### AI Assistant
The AI Assistant page answers staff questions with school context and module data. It uses an OpenAI-compatible chat completions endpoint (`AI_MODE=openai`) so any OpenAI-compatible gateway or a local self-hosted model can be configured via `AI_BASE_URL`, `AI_API_KEY`, and `AI_MODEL`. Super Admin can also override the provider per the **AI Assistant** settings screen.

### AI Analytics
An in-app **AI Analytics** module (`/ai-analytics`) scores risk without requiring an LLM: leads, fee defaulters, and at-risk students are scored by a deterministic engine (0–100 with high/medium/low tiers) into the `ai_scores` table; the **Routes** tab turns capacity/assignment/coverage data into actionable route-optimizer suggestions. A weekly `ai:score` schedule command (`Schedule::command('ai:score')->weeklyOn(0, '01:30')`) refreshes every organization, and tier-crossing **risk alerts** fire as configurable smart notifications (bell + notification rules). When an AI provider is configured, top risks are additionally narrated via the OpenAI-compatible client. Module toggle lives in **Settings → Modules** (`ai-analytics`).

### Biometric Attendance Sync
A keyed HTTP API lets biometric devices and the Windows agent mark attendance:
- `GET /api/biometric/status` — public health check
- `POST /api/biometric/attendance` — requires `X-Biometric-Key` header equal to `BIOMETRIC_SYNC_KEY` (env) or the per-organization key shown in **Biometric Settings**. Devices pass a student `admission_no`, a Unix `timestamp`, and `status` (in/out).
- `POST /api/biometric/logs` — batch agent log upload: a JSON array of up to 500 `{device_serial, uid, event_time, direction, matched}` entries under the `logs` key. The agent pushes punches here; entries are written as `agent` biometric logs and linked to registry devices by serial number.

Both endpoints also accept `X-Cctv-Key`/`X-Transport-Key`-style per-organization keys resolved against `organizations.settings`.

### Built-in Staff Roles
Roles are created per organization on first use from `app/Support/RolePermissionCatalog.php`, which also carries each built-in role's default permissions (Admin, Teacher, Receptionist, Accountant, Librarian, Transport Manager, Driver). Permission rows are only inserted, never overwritten, so customized roles survive upgrades. After adding or changing a built-in role's defaults, re-apply them to existing organizations with:

```bash
php artisan permissions:sync-defaults                 # every organization
php artisan permissions:sync-defaults 1               # one organization
php artisan permissions:sync-defaults 1 --role=transport_manager
```

Without this, a role created before its defaults existed keeps its empty (all-false) permission rows and every protected page returns 403.

`php artisan db:seed --class=TransportDriverSeeder` seeds demo drivers (with license profiles), two routes, two vehicles with GPS device IDs, roster assignments, a running demo trip assigned to `driver@gurukul.com`, and a school-owned policy row for every demo vehicle.

### Per-Vehicle Transport Policy
Every bus carries its own switch set in `transport_vehicle_policies` (one row per vehicle, created by the driver or the transport office on the **Bus Roster** screen). The effective policy is resolved as *vehicle row → `organizations.settings.transport.vehicle_policy` → preset for the resolved bus type → school-owned preset*, so a vehicle with no row behaves exactly like a school bus.

| Switch | Values | Meaning |
| --- | --- | --- |
| `bus_type` | `school_owned`, `private_vendor` | Selects which preset fills the unset keys. |
| `roster_control` | `manager_only`, `driver_only`, `both` | Who may add/remove students. `driver_only` locks the transport manager out; `admin`/`super_admin` always bypass. |
| `boarding_control` | `driver_only`, `driver_and_manager`, `manager_only` | Who may record pickup/drop. |
| `requires_roster_approval` | bool | Driver submissions are stored as `pending` and only join the bus after the manager approves. |
| `requires_fee_approval` | bool | Dues are held back until the manager approves, so a driver cannot bill the school on their own. |
| `fee_ledger` | `school`, `vendor` | `school` posts the monthly amount to `student_fees`; `vendor` keeps it on the assignment as a vendor payable and never touches the school fee ledger. |
| vendor paperwork | name, contract no, valid from/till, contact | Required whenever `bus_type = private_vendor`. |

The `school_owned` preset keeps the roster with the transport office, boarding with the driver, no approvals, and the school fee ledger. The `private_vendor` preset hands the roster to the driver, requires roster and fee approval, and bills the vendor. A driver may only edit the policy of a bus assigned to them; the transport manager and system admins may force any vehicle.

Roster writes go through `TransportAssignmentService`, which enforces the policy before field validation, blocks a second bus per student per session, records who created and who reviewed each assignment, and only flags a student as needing transport once the assignment is `active`. `/driver/bus-students` (web) and `/api/driver/assignments*` are the driver-facing entry points; the manager sees the same screen for the whole fleet.

Pickup and drop are hardened: the trip must be `running`, the student must hold an `active` assignment on the trip's route, the trip's current stop must match the student's pickup/drop point when both are known, and parents are notified only when the status actually changes.

### Transport GPS Sync
- `GET /api/transport/gps/status` — public health check
- `POST /api/transport/gps` — requires `X-Transport-Key` equal to `TRANSPORT_GPS_KEY` (env) or the key managed under **Transport → Device Settings**. Payload: `vehicle_number` or `gps_device_id`, `lat`, `lng`, plus optional `speed_kmh`, `heading`, `recorded_at`, `daily_trip_id`. Writes a `TransportGpsPosition` and marks the linked daily trip as running.

### Driver App API
Driver-facing endpoints live under `/api/driver/*` (mirrored at `/api/v1/driver/*`) and require a Sanctum token whose user has the `driver` role — the `driver.role` middleware alias returns `403` for every other role. Drivers only ever see their own vehicles, routes, and trips; a trip they do not own returns `403`.
- `GET /api/driver/me` — driver profile, license/compliance summary, and assigned vehicles
- `GET /api/driver/trips` — today's trips plus anything still running or scheduled
- `POST /api/driver/trips` — start a journey (`routeId`, `vehicleId`, `shift`, `direction`); the vehicle/route must be assigned to the driver
- `GET /api/driver/trips/{trip}` — trip detail with the student roster, each student's stop, and current boarding status
- `POST /api/driver/trips/{trip}/reached-stop` — records a reached stop in `stop_updates` and notifies the parents of students at that stop
- `POST /api/driver/trips/{trip}/boarding` — marks a roster student `present`/`absent` for the trip's `pickup` or `drop` direction (`transport_boarding_records`, unique per trip/student/direction) and notifies the parent
- `POST /api/driver/trips/{trip}/gps` — stores a live position for the trip's vehicle
- `POST /api/driver/trips/{trip}/end` — completes the journey

Boarding marks create an in-app message, a bell notification (`transport_boarding`), and a Firebase push to the parent. The **Transport Management** console shows the same counts per trip in the Journeys tab's Boarding column.

### CCTV Face-Scan Sync
- `GET /api/cctv/status` — public health check
- `POST /api/cctv/face-scan` — requires `X-Cctv-Key` equal to `CCTV_SYNC_KEY` (env) or the key managed on the **CCTV Camera Registry** page. Payload: optional `camera` (name/location), `timestamp`, `uid`, `image` (data URL). Always writes a `BiometricLog` (`face`) and a `CctvAccessLog`; when an image and a vision-capable AI provider are configured, the frame is analyzed and matched against active students.

### Realtime Chat
Direct messaging between staff uses Laravel Reverb for instant delivery. `ChatController::send` broadcasts a `ChatMessageSent` event on a private channel and also sends a Firebase push notification. If a Reverb server (`php artisan reverb:start`) is unavailable, the chat UI automatically falls back to 5-second polling, so messages never get lost.

### Database Backups
`php artisan backup:run` archives the database to `storage/app/backups`. Admins can restore any backup from the **Automated Backups** screen (admin-only) — the restore command switches back to the dump's driver, re-runs migrations when needed, and logs the operator out.

## Getting Started

```bash
composer setup
```

This installs dependencies, generates an application key, runs migrations, and builds the frontend assets.

For local development, the `dev` script starts the HTTP server, the database queue worker (imports/whatsapp/default), log tailing, and Vite together:

```bash
composer dev
```

To run the queue worker manually:

```bash
php artisan queue:work database --queue=imports,whatsapp,default --tries=1 --timeout=900
```

For realtime chat, start a Reverb server (and a queue worker for scheduled sends):

```bash
php artisan reverb:start
```

## Testing

The test suite runs against an in-memory SQLite database:

```bash
php artisan test
```

Key suites:
- `EndToEndPreviewTest` — all twenty module pages render for an seeded admin
- `ApiContractTest` — identity/auth contract plus every module's HTTP API surface
- `StaffPermissionsTest` — RBAC enforcement incl. class-scoped teacher access
- `BiometricFeatureTest`, `ChatRealtimeFeatureTest`, `BackupRestoreFeatureTest` — realtime & sync shell features

Before a release, run the full gates: `php -l` on changed PHP, `npx prettier --write`, `node scripts/validate-i18n.mjs` (en/mr/hi 0-bad policy), `npm run build`, and the full PHPUnit suite.
