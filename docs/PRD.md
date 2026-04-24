# Energi Electric App — Product Brief v1

**Status:** Draft — based on partial discovery transcript (Joe–Kenny 2026-04-24). Dinner follow-up pending to close Open Questions.
**Source of truth:** This file. Mirrored in ChatPRD (uuid `eac959a6-cf89-4505-ac87-9874cd3dc694`).

---

## tl;dr

Energi Electric App is a business management platform for electrical contractors, tailored for Joe Lopez of Energi Electric (Wilmington / Leland / Brunswick County, NC). V1 supports CSV-based migration from Jobber. Focus: full rebrand (from Blue Shores), online payments via a card/ACH processor (Stripe recommended, TBD), materials database integration, and Jobber data migration — delivering the core operations (crew login, job tracking, invoicing, payments) Joe needs at a lower SaaS cost ($75/month) before his next builder job starts.

---

## Goals

### Business Goals

- Migrate 100% of active Energi Electric jobs and billing from Jobber to Energi Electric App before the next builder project start date.
- Reduce platform subscription costs by >45% (from $140/mo Jobber Bold plan to $75/mo on Energi Electric App).
- Process the first customer payment via the new app within 7 days of cutover.
- Zero Blue Shores branding present in production, invoices, or customer-facing portals at go-live.

### User Goals

- Simple, reliable field crew workflow: Crew can clock in/out, view jobs, and upload notes/photos from their phones.
- Admin control: Joe can create/manage jobs, customers, and invoices, and configure materials/pricing quickly.
- Customer convenience: Customers receive professional branded invoices they can pay online by card or ACH, with the option to save payment methods.
- Instant access: All users can access the app from any browser/device; customers have magic links (no login required) for payment/portal.

### Non-Goals

- No multi-company management (Fortify Solutions to remain separate).
- No advanced analytics, SMS, or "on my way" features in V1.
- No custom domain at initial launch (energi-electric-app.vercel.app is sufficient for V1).

---

## User Stories

### Admin (Joe Lopez)

- As an admin, I want to create and edit jobs, phases, and tasks, so that I can organize all active projects efficiently.
- As an admin, I want to generate and send invoices that customers can pay online, so that I can accelerate cash flow.
- As an admin, I want full CRUD access to a materials database, so that item pricing auto-fills for quotes/invoices.
- As an admin, I want to import customer and invoice data from Jobber via CSV, so that I don't re-enter current work manually.
- As an admin, I want visibility into payment fees (card/ACH), so that I control when to offer ACH on large tickets.

### Field Crew

- As a crew member, I want to clock in and out via my phone, so that my hours are logged accurately for payroll.
- As a crew member, I want to see my assigned tasks/phases and mark them complete, so that Joe can track job progress.
- As a crew member, I want to upload site photos or notes, so that job history is always current from the field.

### Customer (Homeowner or GC/Builder)

- As a customer, I want to receive my invoice as a magic-link email, so that I can view/pay without a login.
- As a customer, I want to pay by credit card or ACH, so that I can pick the faster or cheaper method for large payments.
- As a customer, I want the option to save my payment method on file, so that I don't have to re-enter data for recurring work.

---

## Functional Requirements

**Core Platform Features (P0 — already built, rebranding only)**

- Auth (invite-only, role-aware); Projects/Phases/Tasks; Time Tracking; Notes/Photos; Customer Table; CSV Export; Reports.

**Rebrand (P0)**

- Logo, color palette (#2E9640 / white), typography (Barlow Condensed), invoice/email branding, manifest/OG tags.

**Invoicing & Payments (P0)**

- Card/ACH integration (Stripe recommended, pending processor confirmation).
- Customer magic-link portal with "Pay Invoice" flow.
- Save payment method with explicit consent.
- Admin dashboard: view fee breakdown, payment status; initiate charges to saved methods (with consent).
- Payment status reflected in invoice and customer list.

**Materials & Pricing Database (P0)**

- CRUD materials: name, SKU/code, unit, price, category, notes, active/inactive.
- Autocomplete picker in invoice/quote line-item UI.
- Line-item snapshotting (no retroactive price update).
- CSV import/export for bulk management.
- Markup/margin logic: field for "markup %" per line item (pending Joe's confirmation).

**Jobber Data Migration (P0)**

- One-time CSV import: customers, open/unpaid invoices, open quotes.
- Tool to review and validate import before committing to DB.

**Field Crew Mobile Experience (P1)**

- Responsive mobile UI: clock in/out, Today view, simple task/phase navigation.

**Polish & QA (P0)**

- No Blue Shores branding or residual code.
- Test coverage / automated regression (53 existing tests, maintain parity).

---

## Proposed Milestones (Sequencing)

| Milestone | Description | Dependencies |
|---|---|---|
| **1: Rebrand** (Blue Shores → Energi Electric) | Visual/copy pass only. Update branding, colors, remove all Blue Shores assets and references. | None — lowest risk, ships first. |
| **2: Online Payments** | Select and integrate payment processor (Stripe recommended, pending confirmation). Card + ACH flows; save-card; admin-initiated charge. | Processor decision, SMTP config for receipts (optional). |
| **3: Materials Database** | CRUD UI/API, invoice picker, CSV import/export, price snapshotting. | Joe to finalize data model; sample data from his Claude build. |
| **4: Jobber Migration** | Customer and open-invoice import tooling; validation UI. | Joe's cutover timing, Jobber export format confirmed. |
| **5 (optional/as-needed):** SMTP, mobile polish, domain | SMTP credentials for transactional email, field-crew mobile polish, custom domain wiring. | SMTP creds, mobile feedback, domain ops. |

**Note:** The "core four" Joe asked for (login, time tracking, jobs, invoices) are already built — they only require Milestone 1 (rebrand) to become Energi Electric production-ready.

---

## User Experience

### Entry Point & First-Time Experience

- **Admins and field crew** receive invitation emails with magic link to set their password.
- **Customers** receive magic-link invoices by email (no login required).
- **Admin configuration** happens via Settings pages — Joe sets up payments, uploads logo, customizes branding. No guided onboarding in V1.

### Core Experience

**Admin**

1. Logs in at energi-electric-app.vercel.app (Energi Electric green/white branding).
2. Imports existing customers/invoices (CSV upload, map columns).
3. Creates/edits jobs, assigns crew, sets up materials DB via Materials tab or bulk import.
4. Generates invoice → selects materials from picker → sends to customer.
5. Monitors status, views paid/unpaid stats, charges saved cards if needed.

**Field Crew**

1. Uses phone browser, logs in, sees Today screen with assigned jobs.
2. Clocks in/out, adds photos/notes, marks tasks complete.

**Customer**

1. Receives invoice email with magic link.
2. Opens branded portal, reviews invoice, clicks "Pay Invoice".
3. Chooses credit card or ACH, with option to save payment method (consent required).
4. Receives confirmation screen and email.

### Edge Cases

- **Import failure:** CSV columns don't match; app prompts admin to map columns / fix errors interactively.
- **Payment errors:** Card declines, insufficient funds, ACH failed — clear error messages, admin notified, retry options.
- **Unpaid invoice:** No automated reminders in V1; portal always reflects current status.
- **Partial payments:** Needs confirmation — see Open Questions.
- **Saved card not present:** If customer hasn't saved a payment method, admin cannot initiate charge.
- **Empty state:** "No jobs/crew/customers yet" — clear call to action to add/import.

---

## Success Metrics

| Metric | Target |
|---|---|
| Jobber account cancellation date | Energi Electric cancels Jobber within 30 days of cutover. |
| Days from cutover to first paid invoice | Payment processed via new app within 7 days of go-live. |
| Invoices processed / $ volume in first 30 days | Track via admin dashboard. |
| Ratio of online payments (card/ACH via app) vs. checks/cash | Maximize online payments. |
| Total monthly SaaS cost for Joe | ≤ $75/mo on Energi Electric (excludes processor variable fees). |
| Zero "Blue Shores" strings in production | Verified by grep on launch day. |

---

## Technical Considerations

- **No Blue Shores residue:** full asset/code/text sweep; regression tests required.
- **CSV import:** robust format handling; interactive column mapping.
- **Payments:** PCI compliance via processor's hosted UI (e.g., Stripe Elements); app never stores raw card/ACH data.
- **Materials pricing:** snapshotted per invoice/quote; later edits in DB do not affect existing docs.
- **Bulk data ops:** admin-facing import/export tooling.
- **Mobile:** responsive web app. Field crew UI designed for mobile browser, not native.
- **No animated transitions** — focus on fast, simple UI.

---

## UI Architecture (actual stack)

- **Framework:** Next.js 16 (React, server components)
- **Styling:** Tailwind CSS (custom Energi Electric palette). No third-party UI library; all components are custom Tailwind + lucide-react icons.
- **Icons:** lucide-react
- **PDF rendering:** @react-pdf/renderer
- **Blueprint annotation:** fabric
- **IndexedDB access:** idb (offline storage, large CSV caching)
- **Conditional classes:** clsx, tailwind-merge
- **Responsive design:** mobile-first
- **Accessibility target:** WCAG AA minimum

---

## API & Backend (actual stack)

- **Framework:** Next.js API routes (serverless on Vercel)
- **Database:** Supabase Postgres via @supabase/supabase-js and @supabase/ssr
- **Authentication:** Supabase Auth (invite-only, role-aware: admin, crew)
- **Email:** Nodemailer for transactional mail (SMTP credentials pending)
- **PDF generation:** @react-pdf/renderer, pdfjs-dist
- **Storage:** S3-compatible via @aws-sdk/client-s3 + @aws-sdk/s3-request-presigner; production uses Cloudflare R2.
- **Web Push:** web-push (staged for V2, not live)
- **Testing/QA:** Vitest, Playwright, jest-dom, testing-library/react, ESLint, TypeScript.
- **No error monitoring or uptime tooling in V1** — add in V2 if needed.

**Core API endpoints:**

- `/api/projects` — CRUD for jobs/phases/tasks
- `/api/materials` — CRUD, import/export, price history snapshot
- `/api/invoices` — CRUD, send, payment status
- `/api/payment-intent` — processor-dependent payment creation/read
- `/api/customers` — CRUD, magic link
- `/api/auth` — invite, reset, role management

---

## Performance & Scalability

- SSR for dashboard routes; lazy load media; photo uploads via presigned S3/R2 URLs with CDN cache.
- Designed for ~100 DAU (crew + admin + customers) and up to ~1,000 invoices/month.
- Autoscale on Vercel + Supabase; unbounded S3/R2 object storage for job media.
- No error logging / uptime monitoring configured in V1.

---

## Integration Points

| Integration | Purpose | SDK/Library | Notes |
|---|---|---|---|
| Card/ACH payments | Online payments, card-on-file | Pending: Stripe (TBD) | Recommended, not confirmed. |
| Supabase | DB / Auth / Storage | @supabase/supabase-js, @supabase/ssr | Invite-only. |
| S3 / R2 | Job photos, blueprint uploads | @aws-sdk/client-s3, R2 planned | Presigned URLs for direct upload. |
| Nodemailer SMTP | Transactional email | Nodemailer | SMTP creds TBD. |
| @react-pdf/renderer | Branded invoice PDFs | @react-pdf/renderer, pdfjs-dist | |
| CSV import/export | Jobber migration, materials import | idb, custom parsing | Admin-only. |
| fabric | Annotation of blueprints | fabric | Crew markup of job docs. |
| lucide-react | Iconography | lucide-react | Used throughout UI. |

---

## Open Questions (Must Answer Before Build)

- **Payment processor:** Stripe recommended, not confirmed. Kenny to research fees. Joe said "whatever will be easiest."
- **ACH implementation:** Stripe's ACH may require Plaid UX and costs. Simpler alternative?
- **Partial payments:** Allowed or not? Joe has not stated.
- **Saved card charges:** Admin-initiated only, or customer-scheduled recurring? Joe described admin-initiated.
- **Refund flow:** Who can issue, UI, time window?
- **Failed payment retry:** Automatic or manual?
- **Markup on materials:** Per material / per invoice / manual override? Joe's pricing model unknown.
- **Quote → Invoice conversion:** In V1? Joe mentioned quotes, didn't specify conversion flow.
- **Jobber export format:** CSV? JSON? Other? Confirmation needed.
- **Customer data volume:** How many customers and active invoices to migrate?
- **Go-live date:** "Before the next builder job starts" — what's the actual date?
- **Crew size:** How many field users at launch?
- **$75/mo pricing:** Still correct post-rebrand? Seat model (unlimited or per-seat)?
- **Energi Electric logo files:** Where stored? What variants needed?
- **Domain:** energi-electric.com registered? Subdomain for app?
- **License transfer:** When does Joe's electrical license formally transfer to Energi?
- **Customer payment methods in Jobber:** Portable? (Assume no.)
- **Invoice reminder emails:** Want them? Cadence? Not discussed with Joe.

---

## Reference

*Source: Joe–Kenny call, 2026-04-24 (partial transcript — cuts off mid-discussion of materials DB). Dinner follow-up planned to close Open Questions.*
