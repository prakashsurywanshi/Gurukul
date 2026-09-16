# QGurukul — System Overview and Architecture

> Multi-tenant school/college ERP platform.
> `laravel-gurukul` — single monolith codebase.

---

## 1. Tech Stack

| Layer | Technology |
|-------|-----------|
| Backend | Laravel (PHP), Eloquent ORM, Blade/Inertia |
| Frontend | React 18 + Inertia.js + Tailwind CSS |
| Realtime | Laravel Reverb (WebSocket) + echo.js (Pusher protocol) |
| Payments | Razorpay (orders/signature verification), UPI deep links |
| Transliteration | Custom Puro engine (Roman → Devanagari; no external API) |
| Build | Vite (frontend), npm (build tooling), PHP artisan (backend) |
| Database | MySQL (single DB, all orgs share tables, scoped by `organization_id`) |
| File storage | Laravel filesystem (public disk, CSP headers for security) |
| Search | Native DB queries (no ElasticSearch) |
| i18n | Static TypeScript dictionaries (en/mr/hi) + DB manual overrides via `LanguageTranslation` model |

---

## 2. Codebase Map

| Area | Path | Count / Lines |
|------|------|---------------|
| **Models** | `app/Models/` | 196 files |
| **Controllers** | `app/Http/Controllers/` | 146 files |
| **Services** | `app/Services/` | 40+ files (RBAC, AI, payments, transliteration, approvals, etc.) |
| **Support / catalogues** | `app/Support/` | RolePermissionCatalog (677 lines), ModuleRegistry (107 lines), etc. |
| **Middleware** | `app/Http/Middleware/` | 5 custom guards (auth, subscription, staff.permission, module.enabled, audit.trail) |
| **Routes** | `routes/web.php` | 1,113 lines (~250+ route registrations) |
| **Frontend pages** | `resources/js/Pages/dashboard/` | 224+ components + nested subdirectories |
| **Sidebar menu** | `resources/js/Pages/sidebarMenu.ts` | 3,464 lines (full role/module/feature gating per menu item) |
| **i18n dictionaries** | `resources/js/i18n/{en,mr,hi}.ts` | 4,722 keys each |
| **Tests** | `tests/Feature/` | ~870 tests, 6,665 assertions, ~905 s runtime |

---

## 3. Data Model — Multi-Tenant by Convention

Every data table that holds organisational data includes an `organization_id` foreign key (nullable for global data, cascade on delete).

**There are no Eloquent global scopes** filtering by `organization_id` on any model (except one unrelated `WebsitePage` scope). Multi-org isolation is achieved entirely through **controller-level and service-level scoping** — every method calls a resolver to get the current `Organization` and manually appends `->where('organization_id', $org->id)` to queries. This is enforced across 100+ query sites in the codebase.

---

## 4. Inertia Shared Props (every page)

The `HandleInertiaRequests` middleware (`app/Http/Middleware/HandleInertiaRequests.php`) shares these on every request:

| Prop | Purpose |
|------|---------|
| `user` | Authenticated user (or null) |
| `organization` | Resolved `Organization` for the request |
| `staffPermissions` | Full RBAC map: `{ [feature]: { can_view, can_add, can_edit, can_delete } }` |
| `modules` | `{ [moduleKey]: boolean }` — which modules are enabled for the current org |
| `languageSettings` | `{ languages, manual_translations, locale, dual_language_enabled, ... }` |
| `headerNotifications` | `{ items: Notification[], unreadCount: number }` |
| `academicYear` | Currently active academic year for the org |

---

## 5. The Inertia Model

QGurukul uses **Inertia.js** — Laravel serves page props as JSON; React hydrates the SPA shell. No separate API layer. Every `GET` returns `inertia('PageComponent', [...props])`. Every mutation uses `router.post()` or `router.patch()`. Responses are redirect-based (`return redirect()->route(...)`) for all write operations, preserving the SPA flow without REST API calls.

---

## 6. Static Analysis & Build Gates

| Command | Purpose | Expected |
|---------|---------|----------|
| `npx tsc --noEmit` | TypeScript check (0 errors) | Pass |
| `node scripts/validate-i18n.mjs` | i18n parity across en/mr/hi | 4,722 keys, 0 bad |
| `npm run build` | Vite production build | ~48s, no errors |
| `php artisan test` | Full test suite | ~870 tests, 0 failures, ~905s |

Run these before every commit.
