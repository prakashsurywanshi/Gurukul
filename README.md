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

## External Integrations

- **Firebase Cloud Messaging** — push notifications via registered device tokens
- **QWA WhatsApp API** + **WhatsApp bridge** — WhatsApp messages with QR session management
- **Smartflo** — voice calls
- **SMTP** — email delivery
- **dompdf** — PDF generation (marksheets, certificates, ID cards)

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
