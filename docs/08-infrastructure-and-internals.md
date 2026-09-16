# QGurukul — Infrastructure & Internals

---

## 1. Authentication

**File:** `app/Http/Controllers/LoginController.php` (101 lines)
**Page:** `resources/js/Pages/LoginPage.tsx` (457 lines)

### Flow
1. User visits `/login` → `viewLogin()` resolves the public organization (via `ActiveOrgResolver`) to prefill school name/logo/orgType.
2. User selects a **portal** (Student/Parent, Super Admin, Admin, Teacher, Accountant, Receptionist, Librarian, Driver) — this drives the login email/password fields.
3. `POST /login` → `LoginController::login()`:
   - Auth attempt with credentials
   - **Status checks:** `status === 'inactive'` → blocked with "account inactive" message; `status === 'suspended'` → blocked with "account suspended" message
   - On success → redirect via `StaffPermissionService::landingPathFor($user)`
4. `demo_login` config enables quick demo credentials (default admin@qodeigence.com / 12345678).

### Session & Guard
- Standard Laravel `web` guard, session-based.
- No API-only auth (no Sanctum tokens needed — all Inertia SPA).
- Broadcasting auth via `/broadcasting/auth` for Reverb private channels.

### Password reset / registration
- Public **admission form** handles prospective-student registration (no self-service account creation).
- Staff/student accounts are created by org admins.

---

## 2. Multi-Tenancy & Organization Resolution

**Service:** `app/Services/ActiveOrgResolver.php` (256 lines)
**Full details:** see `docs/03-tenant-resolution-and-multi-org-gateway.md`

### Summary of resolution
| Source | How |
|--------|-----|
| Authenticated user | `resolveForRequest()` → `Organization::find($user->organization_id)` |
| Query param `?org=slug` | `organizationFromQueryParam()` |
| Path segment `/{slug}/...` | `organizationFromFirstPathSegment()` |
| Subdomain | `organizationFromSubdomain()` |
| Session `public_active_org_id` | `setPublicOrganization()` / resolve fallback |

### Isolation enforcement
- No global scopes; every controller/service appends `->where('organization_id', $org->id)` manually (100+ sites).
- Admin auto-link: email match or single-org fallback.

---

## 3. Language / i18n System

### Dictionaries
- `resources/js/i18n/en.ts`, `mr.ts`, `hi.ts` — **4,722 keys** each, validated by `node scripts/validate-i18n.mjs` (0 bad, en/mr/hi parity).
- Fallback chain in `LanguageProvider.tsx::t()`:
  ```
  manual_translations[locale] → dictionary[locale] → en → key itself
  ```

### Manual overrides (Language Manual Entry)
- **UI:** `resources/js/Pages/dashboard/LanguageTranslations.tsx`
- **Controller:** `app/Http/Controllers/LanguageTranslationController.php`
- **Model:** `LanguageTranslation` (org_id nullable, locale, translation_key, value)
- Columns: KEYs | English | Marathi | Hindi — **all three editable** (saved via `POST /settings/language-translations`). Empty value deletes the override (falls back to dictionary).
- `LanguageService::payload()` groups translations into `manual_translations: { [locale]: { key: value } }` shared to frontend.

### Locale selection
- Cookie `locale` (`readLocaleCookie()` / `setLocaleCookie()`), consumed on every request via `set.locale` middleware.
- `availableLanguages()` computes selectable UI languages (universal languages incl. en/mr/hi).

### Dual-language student records
- Regional language (e.g. Marathi) drives student records / certificates; dashboard UI stays universal.
- `DevanagariTransliterationService` (172 lines) converts Roman → Devanagari fully offline (standalone vowels, matras, digraphs, anusvara, Devanagari numerals, ~80 proper-noun overrides). Endpoint: `SettingsController::transliterateText()`.

---

## 4. Realtime Notifications

### Bell UI
**File:** `resources/js/components/header/NotificationBell.tsx` (283 lines)
**Props source:** `headerNotifications` Inertia shared prop `{ items, unreadCount }` + user ID.

- **Polling:** every 30s via `GET /notifications/recent`.
- **Realtime:** `createEcho()` → `echo.private('notifications.{userId}')` listening for `.SystemNotificationCreated` (Laravel event broadcast on Reverb). Prepend + increment unread.
- **Type-based icons:** leave_request, admit_card, admission_enquiry, lead, complaint, attendance_correction, fee_concession, fee_due, daily_digest, approval_request, info.
- Mark read / read all via Inertia POST `/notifications/{id}/read`, `/notifications/read-all`.
- Click navigates to `action_url`.

### Echo bootstrap
**File:** `resources/js/lib/echo.ts` — configures Echo from `VITE_REVERB_APP_KEY`, `VITE_REVERB_HOST`, `VITE_REVERB_PORT`, HTTPS scheme. Auth: `/broadcasting/auth`.

### Notification rules
- `SettingsController` / `NotificationRuleController` — configurable auto-notification rules (daily digest, fee due, etc.).
- `SystemNotificationService` scopes query by organization.

---

## 5. Communications (SMS / Email / WhatsApp / Voice)

| Channel | Service/Controller | Notes |
|---------|-------------------|-------|
| SMS | `CommunicationController`, `CommsWalletController` | Provider config in settings; comms wallet tracks credits |
| Email | `CommunicationController::sendEmails()` | SMTP config |
| WhatsApp | `CommunicationController`, `SendQwaWhatsapp` | QWA WhatsApp bridge |
| Voice calls | `VoiceCallsSmartflo` | Smartflo provider; submission + history |
| Broadcast | `BroadcastController` | Compose + history, recipients |
| Download Center | `DownloadCenterController` | File sharing with shares |
| Gallery | `GalleryController` | Albums + images |

---

## 6. Online Payments

**Service:** `app/Services/OnlinePaymentService.php` (141 lines)

### Razorpay
- Settings from `org.settings.online_payment`: `enabled`, `razorpay_enabled`, `razorpay_key_id`, `razorpay_key_secret`, `razorpay_currency` (INR), `upi_enabled`, `upi_id`, `upi_holder_name`.
- `createRazorpayOrder()` → POST `https://api.razorpay.com/v1/orders` (basic auth, encrypted secret decrypt, `payment_capture=1`).
- `verifySignature()` → HMAC-SHA256 over `orderId|paymentId` compared with `hash_equals()`.
- Mode derived from key prefix: `rzp_test_` / `rzp_live_` / custom.

### UPI
- `upiPayload()` builds `upi://pay?pa=...&pn=...&am=...&cu=INR&tn=...` deep link.
- Flow: create UPIPaymentIntent → merchant confirm via `/fees/online/upi/confirm`.

---

## 7. Reports & Exports

- **Engine:** `ReportsController` (`/reports`) + `ReportBuilder.tsx`.
- **Exports:** PDF, CSV, XLSX (per route `get /reports/export`).
- **Modules covered:** students, attendance, fees, exams, library, transport, hostel, inventory, front-office, communication, lesson-plans, HR, homework, alumni, activity log.
- **Custom reports:** `SavedReport` model; config `{ source, filters, columns }` persisted.
- **Regulator reports:** `RegulatorReportsController` for government compliance.
- **Print center:** `PrintCenterController` bulk printing (fee receipts, ID cards, certificates).

---

## 8. File Storage & Uploads

- Laravel `storage` public disk; CSP headers applied to student/organization assets.
- Website CMS slider images, org logos, student documents, homework attachments, marksheet uploads, gallery images.
- Upload endpoints are Inertia multipart POSTs (no separate S3 abstraction).

---

## 9. Settings System

**Controller:** `app/Http/Controllers/SettingsController.php` (2,144 lines)

| Settings area | Route / page |
|---------------|--------------|
| General | `/settings` |
| Language | `/settings/language` + `/settings/language-translations` |
| Communication | `/settings/communication` (SMS, WhatsApp, email) |
| Online payments | `/settings/online-payments` (Razorpay/UPI) |
| SSO | `/settings/sso` |
| Social media | `/settings/social-media` (auto-post) |
| Telegram | `/settings/telegram` |
| HR | `/settings/hr` (policies) |
| Roles & Permissions | `/settings/roles-permissions` |
| Sessions & Semesters | `/settings/sessions`, `/settings/semesters` |
| Admission settings | `/admission-settings` |
| Custom fields | `/settings/custom-fields` |
| Module management | `/module-management` |
| Dashboard themes | `/settings/dashboard-themes` |

Settings stored in `Organization.settings` JSON + dedicated tables (`LanguageTranslation`, `CustomFieldDefinition`, etc.).

---

## 10. Module Flags & Feature Toggles

**File:** `app/Support/ModuleRegistry.php` (107 lines)
**Controller:** `app/Http/Controllers/ModuleManagementController.php`

### Core (non-disableable) modules
`dashboard, students, academics, exams, attendance, fees, staff, front-office, hostel, transport, library, inventory, certificates, communication, compliance, cctv, knowledge-base, website, reports, settings`

### Gateable modules (per org)
`audit-trail, assets, assessment, digital-evaluation, report-cards, cbc, apps-center, dashboard-themes, face-search, branch-admin`

**Enforcement:** `Organization::moduleEnabled($key)` → `middleware('module.enabled:key')`. super_admin/branch_admin bypass.

---

## 11. Middleware Summary

| Alias | Class | Purpose |
|-------|-------|---------|
| `auth` | Laravel | Authentication |
| `organization.subscription` | `EnsureOrganizationSubscriptionIsActive` | Org active + subscription unexpired |
| `staff.permission` | `EnsureStaffPermission` | RBAC: `Feature,action` |
| `module.enabled` | `EnsureModuleEnabled` | Feature-flag gate |
| `audit.trail` | `LogAuditTrail` | Action logging |
| `set.locale` | `SetLocale` | Locale cookie handling |

Registered in `bootstrap/app.php`; applied in `routes/web.php` (auth group at :207).

---

## 12. Testing

- **Suite:** `tests/Feature·`, ~870 tests, 6,665 assertions, ~905s
- **Key files:**
  - `PublicOrganizationGatewayTest.php` — deep-link resolution (query/path/subdomain/session), orgType/type exposure
  - `SuperAdminOrganizationTypeTest.php` — org type + portal routing CRUD
  - `BilingualLanguageTest.php` — i18n / dual language
  - `WebsiteCmsSurfacesTest.php` — website CMS
- **Run:** `php artisan test` (full) or path-filtered.

### i18n validation gate
```bash
node scripts/validate-i18n.mjs   # 4,722 keys / 0 bad / en-mr-hi parity
```

### TypeScript + build gates
```bash
npx tsc --noEmit    # 0 errors
npm run build       # ~48s prod build
```