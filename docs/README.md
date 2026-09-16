# QGurukul Documentation

> Multi-tenant school/college ERP — Laravel + Inertia/React monolith.

## Index

| # | Document | What it covers |
|---|----------|----------------|
| 01 | [Overview & Architecture](01-overview-and-architecture.md) | Tech stack, codebase map, Inertia model, build gates |
| 02 | [Organization Lifecycle](02-organization-lifecycle.md) | Organization model, creation flow, auto-provisioning, branch admin, subscriptions |
| 03 | [Tenant Resolution & Multi-Org Gateway](03-tenant-resolution-and-multi-org-gateway.md) | ActiveOrgResolver, deep-links (query/path/subdomain), data isolation |
| 04 | [RBAC & Permissions](04-rbac-and-permissions.md) | Roles, permission model, StaffPermissionService, middleware, frontend gating |
| 05 | [Module Catalogue](05-module-catalogue.md) | ~50 business modules with routes, controllers, models, roles, workflows |
| 06 | [Student & Fees Lifecycles](06-student-and-fees-lifecycles.md) | Admission → enrollment → promotion → exit; fee setup → collection → reconciliation |
| 07 | [Onboarding & Operations](07-onboarding-and-operations.md) | Superadmin org setup, admin checklist, role-by-role usage, daily/monthly ops |
| 08 | [Infrastructure & Internals](08-infrastructure-and-internals.md) | Auth, i18n, realtime notifications, communications, payments, reports, middleware, tests |

## Recommended reading order

New to the system → **01 → 02 → 03 → 07** (understand the platform + how to run an org).
Contributing/technical → then **04 → 05 → 06 → 08**.