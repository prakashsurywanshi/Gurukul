# QGurukul — Tenant Resolution & Multi-Org Public Gateway

---

## 1. ActiveOrgResolver — Central Org Resolution

**File:** `app/Services/ActiveOrgResolver.php` (256 lines)

### Resolution priority (per request)

| Priority | Mechanism | Condition | Session storage |
|----------|-----------|-----------|-----------------|
| 1 | Authenticated user | `$user->organization_id` exists | N/A (on user record) |
| 2 | Query param | `?org={slug}` on any public route | `public_active_org_id` |
| 3 | Path segment | `/{orgSlug}/login` or `/{orgSlug}/home` | `public_active_org_id` |
| 4 | Subdomain | `{orgSlug}.example.com` | `public_active_org_id` |
| 5 | Session | `session('public_active_org_id')` | already stored |

### Key methods

| Method | Line | Purpose |
|--------|------|---------|
| `resolveForRequest(Request)` | :15 | Main entry point called by `HandleInertiaRequests` |
| `resolveForUser(User)` | :36 | Standard user resolution; auto-links admin by email |
| `resolveActiveBranch()` | :68 | Branch-admin session-based active org switching |
| `resolvePublicOrganization(?Request, $columns)` | :133 | Resolves org from public deep-links (no auth required) |
| `resolveDeepLinkOrganization(Request, $columns)` | :170 | Higher-level: query + path + subdomain combined |
| `organizationFromQueryParam($slug)` | :178 | Reads `?org=slug`, validates status, stores in session |
| `organizationFromFirstPathSegment($path)` | :210 | Reads first path segment, validates org exists |
| `organizationFromSubdomain($host)` | :231 | Reads subdomain from host, validates org exists |
| `subdomainFromHost($host)` | :243 | Extracts subdomain (e.g. `career-college.example.com` → `career-college`) |
| `switchBranch($organizationId)` | :95 | Validates org is in user's managed orgs, sets session |
| `managedOrganizationIds($user)` | :120 | super_admin → all; branch_admin → managed; others → own ID |
| `setPublicOrganization($orgId)` | :249 | Writes `public_active_org_id` to session |

### Auto-linking logic (for `admin` role without `organization_id`)

```
1. If User has organization_id → return that org (find by ID)
2. If User is 'student' → resolve via Student record's organization
3. If User is 'admin' with no org_id:
   a. Try matching User.email to Organization.email
   b. If only 1 org exists in DB → auto-assign User to it
4. Otherwise → return null (no org context)
```

---

## 2. Public Organization Gateway

**Controller:** `app/Http/Controllers/OrganizationGatewayController.php`
**Routes:**
| Method | URI | Name |
|--------|-----|------|
| GET | `/select-organization` | `select-organization` |
| POST | `/select-organization/{organization}` | `select-organization.choose` |
| POST | `/logout` | `logout` |

**Frontend:** `resources/js/Pages/SelectOrganization.tsx`

### Flow
1. Unauthenticated user visits `/` → gateway page lists all **active** organizations grouped by `type`.
2. User selects an org → POST to `/select-organization/{id}` → validates org exists and is active → stores `public_active_org_id` in session → redirects to `/`.
3. Homepage renders with the selected org's name, logo, and type-aware badge.
4. If no org is selected, the resolver falls back to the first active org in the DB.

### Inactive org exclusion
Organizations with `status !== 'active'` are hidden from the gateway. If the user's session holds an inactive org ID, the resolver silently ignores it and falls back.

### Type-aware public rendering (P9)
- `LoginPage` receives `orgType` prop → college/university/coaching render a "College" pill badge; school renders nothing.
- `TemplateOneHome` receives `cmsContent.type` → hero type pill after heading.
- `websiteContent.shared.type` is also available to all 5 website templates.

---

## 3. Deep-Link Mechanisms

### Query parameter
```
GET /?org=career-college
```
Sets `public_active_org_id` in session. User can then browse all public pages for that org.

### Path segment
```
GET /career-college/login
GET /career-college/home
```
First path segment matched against `Organization.slug`. Redirects to session-stored org.

### Subdomain
```
GET http://career-college.example.com/
```
Subdomain extracted from `Host` header via `subdomainFromHost()`. Matched against `Organization.slug`.

### Public home page with org selected
**Controller:** `SettingsController::publicHome()` → calls `publicWebsiteContent()` which returns the CMS content array with `type` and `shared.type`.

### Portal routing configuration
Each org has a `portal_routing` field (stored in DB as string):
- `path` — use path segment (default)
- `subdomain` — use subdomain
- `query` — use `?org=slug`
- `session` — use session only (manual gateway)

---

## 4. Data Isolation Pattern

### No global scopes
Every model query that involves organizational data is manually scoped at the controller/service level. Example pattern (found in 100+ sites):

```php
$user = Auth::user();
$organization = $this->resolveOrganizationForUser($user);

$students = $organization
    ? Student::where('organization_id', $organization->id)->get()
    : collect();
```

### `resolveOrganizationForUser()` duplication
This method is **re-implemented as a private method in nearly every controller** (not inherited from a base class — the base `Controller` class is empty). The implementation is consistent across controllers:
1. Check `$user->organization_id` → `Organization::find($user->organization_id)`
2. For student users → resolve via `Student` record
3. For admin without org_id → auto-link by email or single-org fallback
4. Return null if no org found

### Services also scope manually
All services (`LeaveBalanceService`, `AiContextService`, `ApprovalEngine`, `StaffImportService`, `SystemNotificationService`, etc.) accept an `Organization` parameter and apply `->where('organization_id', $org->id)` on every query.

---

## 5. Authenticated User Org Resolution

For authenticated users (staff/student/parent), the `ActiveOrgResolver::resolveForUser()` handles:

| User type | Org resolution |
|-----------|---------------|
| `super_admin` | Uses `$user->organization_id` (nullable; shows all orgs if null) |
| `branch_admin` | Uses `resolveActiveBranch()` — session-based active org switch |
| `admin` | Uses `resolveForUser()` — auto-links if missing via email/single-org rule |
| `teacher/receptionist/accountant/librarian/driver/staff` | Uses `$user->organization_id` directly |
| `student` | Resolved via `Student` model's `organization_id` |
| `parent` | Resolved via linked `Student`'s `organization_id` |

### Branch admin switching
```
POST /branch-admin/switch-branch → switchBranch($organizationId)
GET  /branch-admin/leave-branch  → clears session branch

Session key: branch_admin_active_org_id
```

---

## 6. Inertia Shared Props (per request)

The `HandleInertiaRequests` middleware resolves the org and shares it globally:

```php
// app/Http/Middleware/HandleInertiaRequests.php
$organization = $this->orgResolver->resolveForRequest($request);

return [
    'organization' => $organization,
    'staffPermissions' => $staffPermissionService->featurePermissionsFor($user, $organization),
    'modules' => $organization ? $organization->moduleEnabled(...) : [],
    // ...
];
```

Every Inertia page can read these props via `usePage()` — no manual fetch needed.
