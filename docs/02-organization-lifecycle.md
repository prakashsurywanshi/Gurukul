# QGurukul — Organization Lifecycle

---

## 1. The Organization Entity

**Model:** `app/Models/Organization.php` (226 lines)
**Table:** `organizations`

### Key fields

| Column | Type | Purpose |
|--------|------|---------|
| `id` | bigint PK | — |
| `name` | string | Display name |
| `slug` | string | URL-safe unique identifier (`Str::slug`); used for deep-links |
| `email` | string | Admin email; also used for auto-linking admin users |
| `phone` | string | — |
| `address/city/state/country/pincode` | string | — |
| `type` | enum | `school` / `college` / `coaching` / `university` |
| `status` | enum | `active` / `inactive` / `suspended` |
| `portal_routing` | nullable enum | Public website routing: `path` / `subdomain` / `query` / `session` |
| `subscription_plan` | string | e.g. `basic`, `pro` |
| `subscription_start_date` | date | — |
| `subscription_end_date` | date | — |
| `max_students` | int | Platform limit enforced on admission |
| `max_staff` | int | Platform limit enforced on staff creation |
| `currency` | string | Default `INR` |
| `timezone` | string | Default `Asia/Kolkata` |
| `features` | JSON | Module toggle map: `{ "audit-trail": true, "assets": false, ... }` |
| `settings` | JSON | Org-specific settings blob |
| `portal_routing` | nullable | Stored as string: `path` / `subdomain` / `query` / `session` |

### Key model methods

| Method | Line | What it does |
|--------|------|--------------|
| `moduleEnabled(string $module)` | :62 | Checks if a gateable module is enabled (core modules always return `true`) |
| `selectedAcademicYear()` | :78 | Returns `AcademicYear` marked as `is_active = true` |
| `hasActiveAccess(?Carbon $ref)` | :161 | Returns `true` only if `status === 'active'` AND subscription has not expired |
| `subscriptionIsExpired()` | :156 | Checks `subscription_end_date < today` |
| `users()` | — | `hasMany(User::class)` |
| `students()` | — | `hasMany(Student::class)` |

---

## 2. Organization Creation Flow

**Route:** `POST /superadmin/organizations` (web.php :171)
**Controller:** `DashboardController::storeOrganization()` (line 171)
**Frontend:** `resources/js/Pages/dashboard/SuperAdminDashboard.tsx`

### What the form collects
- `name`, `slug` (auto-generated from name via `Str::slug`), `email`, `phone`, `address/city/state/pincode`
- `type` (school/college/coaching/university) — select field
- `portal_routing` (path/subdomain/query/session) — select field
- `status` (active/inactive)
- `subscription_plan`, `subscription_start_date`, `subscription_end_date`
- `max_students`, `max_staff`

### What happens on submit
1. Validates all fields (slug uniqueness enforced server-side).
2. In a **DB transaction**, creates:
   - `Organization` record with default country=India, currency=INR, timezone=Asia/Kolkata, session=2025-2026
   - **Admin `User`** linked to the org (email, password set, `role = 'admin'`, `status = 'active'`)
3. Redirects to superadmin dashboard.
4. Roles are **NOT** created at this point — they are lazy-bootstrapped on first permission check (`ensureRolesExist()` in `StaffPermissionService`).

### Organization update & impersonation
- **Update:** `PATCH /superadmin/organizations/{organization}` — admin can edit all fields.
- **Impersonate:** `POST /superadmin/organizations/{organization}/impersonate` — superadmin can log in as any admin within an org, with session flag `impersonator_role = super_admin` (bypasses subscription check).
- **Delete:** `DELETE /superadmin/organizations/{organization}` — cascade deletes all org data.

---

## 3. What's Auto-Provisioned vs. Manual Setup

| Item | Auto-provisioned at creation? | Notes |
|------|-------------------------------|-------|
| Organization record | Yes | Country, currency, timezone, session defaults set |
| Admin user | Yes | Linked to org, password set |
| Role definitions | No (lazy) | Created on first `allows()` call via `ensureRolesExist()` |
| Academic years | No | Admin creates via Settings → Sessions |
| Classes & Sections | No | Admin creates via Academics → Class Management |
| Fee structures | No | Admin creates via Fees module |
| Staff users | No | Admin creates via Staff Management |
| Website CMS content | No (frontend defaults) | Page renders fine; edits saved via CMS editor |
| Language settings | No (frontend defaults) | Works out of the box with en/mr/hi dictionaries |
| Module toggles | No (defaults to all enabled) | Admin can disable via Module Management |

---

## 4. Branch Admin (Multi-Org Management)

**Route prefix:** `/branch-admin`
**Module gate:** `module.enabled:branch-admin`
**Pivot table:** `branch_admin_organizations` (user_id, organization_id)

### How it works
- A `branch_admin` user is assigned multiple organizations via the pivot table.
- On login, the user lands on `/branch-admin` and selects which org to manage.
- `ActiveOrgResolver::resolveActiveBranch()` reads `session('branch_admin_active_org_id')` to determine the current org.
- `ActiveOrgResolver::switchBranch()` validates the org is in the user's `managedOrganizations` before switching.
- The `super_admin` can see all org IDs via `managedOrganizationIds()`.

### Access level
- Branch admin gets **all permissions enabled** for the active org (bypasses the RBAC matrix, similar to super_admin but org-scoped).
- Branch admin can NOT see Billing Center or other super_admin-only pages.

---

## 5. Subscription & Access Enforcement

**Middleware:** `organization.subscription` (applied globally to all authenticated routes)
**File:** `app/Http/Middleware/EnsureOrganizationSubscriptionIsActive.php`

```
Bypass:
  - super_admin
  - impersonation sessions (impersonator_role = super_admin)

Check:
  - Organization.status must be 'active'
  - Organization.subscription_end_date must not be in the past

On failure:
  - User is logged out
  - Session invalidated
  - Redirected to /login with error message
```

The superadmin **Billing Center** (`/billing-center`) manages subscription plans, dates, and payment history for all organizations. Org admins can view their own subscription at `/subscription`.
