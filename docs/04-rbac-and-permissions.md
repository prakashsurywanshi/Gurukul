# QGurukul — RBAC & Permissions System

---

## 1. Role Taxonomy

| Role | Scope | Purpose |
|------|-------|---------|
| `super_admin` | Platform-wide | Creates orgs, billing, impersonation, absolute permission bypass |
| `branch_admin` | Multiple orgs | Manages a set of orgs via pivot table; session-based branch switching |
| `admin` | Single org | Full control within org; Profile always accessible regardless of permission matrix |
| `teacher` | Single org | Academic duties: attendance, marks, lesson plans, homework |
| `receptionist` | Single org | Front office, admissions, transport, communications |
| `accountant` | Single org | Fees, income/expense, bank accounts, inventory, payroll |
| `librarian` | Single org | Library catalog, circulation, e-library |
| `driver` | Single org | Transport view + trip management |
| `staff` | Single org | Generic staff role (customizable permissions) |
| `student` | Portfolio | Hardcoded allowlist; sees own records, fees, results, homework |
| `parent` | Portfolio | Linked to student; similar view-level access |
| *custom roles* | Single org | Admin-created via Roles & Permissions UI; bespoke permission matrix |

### Role storage
- **`roles` table:** `organization_id` (FK), `name` (display), `slug` (unique per org), `created_at`
- **`role_permissions` table:** `role_id` (FK), `module` (string), `feature` (string), `can_view`/`can_add`/`can_edit`/`can_delete` (boolean)
- Unique constraint: `(role_id, feature)` — one row per feature per role
- Org-scoped: each organization's roles are independent

---

## 2. Permission Model

### Modules and features
Defined in `app/Support/RolePermissionCatalog.php` (677 lines).

**20 module groups, ~100 features total.**

| Module | Feature count | Representative features |
|--------|---------------|------------------------|
| Dashboard | 1 | Dashboard Home |
| Students | 5 | Search Students, Online Admission, Student Exits, Houses & Categories |
| Staff | 6 | User Management, Staff Attendance, Payroll, Leave Management, Loans, Appraisals |
| Academics | 13 | Class/Section, Timetable, Lesson Plan, Homework, Study Materials, Syllabus, CBC |
| Front Office | 7 | Admission Enquiry, Visitor Register, Phone Call Log, Postal, Complaints, Gate Passes |
| Fees | 7 | Fees Management, Fee Groups, Fee Discounts, Scholarships, Challans, Concessions |
| Attendance | 3 | Attendance Management, QR Attendance, Attendance Corrections |
| Exams | 6 | Exam Management, Exam Types, Marks Entry, Datesheets, Report Cards |
| Communication | 9 | Notice Board, Email, SMS, WhatsApp, Voice Calls, Broadcast, Download Center |
| Transport | 2 | Transport Management, Transport Drivers |
| Hostel | 5 | Hostel Management, Allocations, Hostel Fees, Complaints, Lost & Found |
| Library | 2 | Library, E-Library |
| Inventory | 2 | Inventory, Purchase Orders |
| Certificates | 3 | Certificates, Marksheets, Student ID Cards |
| Reports | 2 | Reports & Analytics, Regulator Reports |
| Settings | 11 | General Settings, Language, Communication, Online Payments, Roles & Permissions, etc. |
| Website | 2 | Website CMS, CBSE Disclosure |
| Account | 3 | Subscription, All Transactions, Knowledge Base |
| System | 2 | Module Management, Audit Trail |
| Others | ~10 | AI Assistant, Face Search, Apps Center, Compliance, etc. |

### The 4 boolean flags per feature

| Flag | Maps to route middleware action |
|------|-------------------------------|
| `can_view` | `staff.permission:Feature,view` |
| `can_add` | `staff.permission:Feature,add` |
| `can_edit` | `staff.permission:Feature,edit` |
| `can_delete` | `staff.permission:Feature,delete` |

### Hardcoded default matrix
If no `RolePermission` row exists in the DB for a role, the system falls back to `defaultViewForRole()` (line 171):
- Uses the PHP hardcoded matrix in `defaults()` (line 196)
- Admin: nearly full access (view+add+edit+delete on most features)
- Teacher: academic features (attendance, homework, exams, lesson plans, study materials); no fees/settings
- Receptionist: front office + admissions + communications + transport fees; no attendance/exam management
- Accountant: fees + income/expense + bank + inventory + Tally; no academic features
- Librarian: library + e-library + inventory; minimal elsewhere
- Driver: transport management (view+add+edit) + messages + profile only

---

## 3. StaffPermissionService — Central RBAC Engine

**File:** `app/Services/StaffPermissionService.php` (594 lines)

### `allows(User $user, string $feature, string $action): bool` (line 151)

The single authorization check called by middleware and controllers:

```
1. super_admin    → return true (absolute bypass)
2. branch_admin   → check managed org, then return true
3. student        → check STUDENT_ALLOWED_ACTIONS hardcoded list
4. all others:
   a. resolve organization via resolveOrganizationForUser()
   b. resolve Role record: match User.role slug to Role.slug
   c. query RolePermission table for that role + feature
   d. if no row exists → use defaultViewForRole() fallback
   e. return the specific boolean flag (can_view / can_add / can_edit / can_delete)
   f. Admin safe features: even if denied, 'Profile' and 'Edit Profile' always pass
```

### `featurePermissionsFor(User $user, Organization $org): array` (line 209)

Returns the full permission map for every feature, shared to the frontend via Inertia.

| User type | Return value |
|-----------|-------------|
| `super_admin` | `[]` (empty → frontend treats as "all allowed") |
| `branch_admin` | All features with all 4 flags = `true` |
| All others | Query `role_permissions` table, merge with `defaults()` fallback |

### `landingPathFor(User $user): string` (line 82)

Determines post-login redirect. Priority-ordered feature list:

| Priority | Feature | Route |
|----------|---------|-------|
| 1 | Dashboard Home | `/dashboard` |
| 2 | Search Students | `/search_students` |
| 3 | Online Admission | `/online-admission` |
| 4 | Class / Section | `/classes` |
| 5 | Attendance Management | `/attendance` |
| 6 | Fees Management | `/students` |
| 7 | Income Management | `/income-management` |
| 8 | Expense Management | `/expense-management` |
| 9 | User Management | `/staff` |
| 10 | Staff Attendance | `/staff/daily-attendance` |
| ... | ... | continues through all features |
| Last | — | `/profile` (fallback) |

### Role CRUD

| Method | Line | Behavior |
|--------|------|----------|
| `createRole(Organization, name, slug)` | :382 | Creates org-scoped `Role` + seeds all features with `can_view/add/edit/delete = false` |
| `deleteRole(Role)` | :423 | Cannot delete system roles (admin/teacher/receptionist/accountant/librarian/driver); reassigns affected users to `teacher` |
| `updateRole(Role, name)` | :405 | Updates display name |
| `syncPermissions(Role, permissions)` | :398 | Bulk upserts permission rows for a role |

---

## 4. Middleware Enforcement (Defense in Depth)

### 4.1 Authentication
Standard Laravel `auth` middleware. Applied to the entire authenticated route group (web.php :207).

### 4.2 Subscription check
`organization.subscription` → `EnsureOrganizationSubscriptionIsActive.php`
- Checks `org.status === 'active'` AND `org.subscription_end_date >= today`
- super_admin and impersonation sessions bypass
- On failure: logout + session invalidate + redirect `/login`

### 4.3 Audit trail (logging)
`audit.trail` → `LogAuditTrail` — records user actions; not an enforcement gate.

### 4.4 Staff permission (per-route RBAC)
`staff.permission:Feature,action` → `EnsureStaffPermission.php`
```
handle(Request, Closure, feature, action):
  $this->staffPermissionService->allows($request->user(), $feature, $action)
  → abort 403 if false
```
Applied to **every individual route** in `web.php` (250+ instances):
```php
Route::get('/students', [...])->middleware('staff.permission:Search Students,view');
Route::post('/students', [...])->middleware('staff.permission:Search Students,add');
```

### 4.5 Module enabled (feature flag)
`module.enabled:module-key` → `EnsureModuleEnabled.php`
- super_admin and branch_admin bypass module checks
- For others: resolves org, checks `$org->moduleEnabled($moduleKey)`
- Applied to newer module routes (audit-trail, assets, assessment, CBC, face-search, etc.)

### 4.6 Controller inline checks
50+ controllers add a second guard:
```php
if ($user->role !== 'admin') {
    return null; // or abort(403)
}
```
This is a **dual defense** on top of the middleware — admin-only write operations are protected even if middleware passes.

---

## 5. Frontend Permission Gating

### `staffPermissions` Inertia prop
Shared on every request via `HandleInertiaRequests`. Structure:
```json
{
  "Dashboard Home": { "can_view": true, "can_add": true, "can_edit": true, "can_delete": true },
  "Search Students": { "can_view": true, "can_add": false, "can_edit": true, "can_delete": false }
}
```

### `Sidebar.tsx` (299 lines)
`canAccessItem(item)` (line 142) implements 3-tier logic:
1. **super_admin** — only sees items explicitly listing `'super_admin'` in their `roles` array
2. **Module gating** — item's `module` property must be enabled
3. **Managed staff roles** — checks `staffPermissions[feature]?.view`

### `sidebarMenu.ts` (3,464 lines)
Each menu item config:
```typescript
{
  id: string,
  label: string,          // i18n key
  icon: LucideIcon,
  roles?: string[],       // allowed roles (optional)
  feature?: string,       // permission feature key (optional)
  module?: string,        // module gate key (optional)
}
```
Examples:
- Settings (School Settings): `roles: ['admin']` only
- Branch Admin: `roles: ['super_admin', 'branch_admin']`
- Fee Collection: `roles: ['super_admin', 'admin', 'accountant']`

### `DashboardLayout.tsx` (237 lines)
Header items gated by role:
- Todo bell: super_admin always; managed staff only if `staffPermissions.Todo.view`
- Global search: super_admin/branch_admin always; others only if `staffPermissions['Search Students'].view`

---

## 6. Login Portals & Role Routing

**File:** `resources/js/Pages/LoginPage.tsx`

| Portal | `LoginPortal` type |
|--------|-------------------|
| Student/Parent | `student_parent` |
| Super Admin | `super_admin` |
| Admin | `admin` |
| Teacher | `teacher` |
| Accountant | `accountant` |
| Receptionist | `receptionist` |
| Librarian | `librarian` |
| Driver | `driver` |

After login, `landingPathFor()` routes to the first feature the user has `view` access to (priority list, last resort `/profile`).

---

## 7. Roles & Permissions Admin UI

**Controller:** `SettingsController::rolesPermissions()` (line 1568)
**Frontend:** `resources/js/Pages/dashboard/RolesPermissions.tsx` (948 lines)

### Features
- Full matrix: each role × each feature with checkboxes for view/add/edit/delete
- Create custom roles (per-org unique slug)
- System roles (admin/teacher/receptionist/accountant/librarian/driver) flagged as `isSystemRole` — can be edited but not deleted
- Bulk permission updates via `updateRolesPermissions()` (line 1640)
- `normalizeRolePermissions()` normalizes the incoming data; `syncPermissions()` does bulk DB writes
