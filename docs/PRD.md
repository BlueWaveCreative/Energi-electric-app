# Energi Electric App — Product Brief v1

**Status:** Draft v1.1 — based on two Joe–Kenny transcripts (2026-04-24). Dinner follow-up pending to close remaining Open Questions.
**Source of truth:** This file. ChatPRD mirror (uuid `eac959a6-cf89-4505-ac87-9874cd3dc694`) is now stale — re-sync manually if needed.

**Changelog:**
- v1.0 (2026-04-24): Initial draft from first transcript
- v1.1 (2026-04-24): Incorporated second transcript — materials DB is internal (not customer-facing itemization), quote → invoice workflow confirmed, customer-facing invoice format simplified to "Provided material and labor for [description]"
- v1.2 (2026-04-24): Joe's materials prototype source code received + archived at `docs/joe-materials-prototype.tsx`. Concrete data model, 59 seed materials, exact calc formula, markup/tax/labor rules pulled from prototype and codified. Corrected brand green to `#045815`. Kenny resolved: go-live date (ASAP), crew size (3-4), domain (keep Vercel URL), per-line markup (global only), invoice reminders (deferred to V2).

---

## tl;dr

Energi Electric App is a business management platform for electrical contractors, tailored for Joe Lopez of Energi Electric (Wilmington / Leland / Brunswick County, NC). V1 supports CSV-based migration from Jobber. Focus: full rebrand (from Blue Shores), online payments via a card/ACH processor (Stripe recommended, TBD), materials database integration, and Jobber data migration — delivering the core operations (crew login, job tracking, invoicing, payments) Joe needs at a lower SaaS cost ($75/month) before his next builder job starts.

---

## Goals

### Business Goals

- **Ship V1 ASAP.** Joe's target is "as soon as possible" — every blocker is urgent. Milestone 1 (rebrand) ships first because it has the fewest dependencies.
- Migrate 100% of active Energi Electric jobs and billing from Jobber to Energi Electric App.
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
- **Customer-facing material itemization.** Customers never see materials broken out by line — invoices show a single summary line ("Provided material and labor for [description]"). Materials DB is a Joe-only internal quoting tool.
- **"Energi Logic Pro" service-load-calculator app.** Separate product idea Joe mentioned — a potential App Store product ($2–$3.99) for electricians. Not in scope for this PRD. Captured as a future BWC product opportunity (see `project_energi_logic_pro.md` in Dex memory).
- **Per-line markup override.** V1 uses global markup only (matches Joe's prototype). Add per-line override as V2 if Joe asks.
- **Custom domain.** V1 stays on `energi-electric-app.vercel.app`. Custom domain is a V2 / post-launch concern.

### Deferred to V2 (explicit post-V1 work)

These are confirmed wants, just not V1:

- **Invoice reminder emails.** Joe wants automated reminders for unpaid invoices. Ship after V1 is stable. Cadence TBD (suggest: reminder at 7 days past due, another at 14, another at 30).
- **SMS customer texting** (existing Issue #32 on app repo).
- **"On my way" button** with timer + customer email (existing Issue #31).
- **Per-line markup override** if Joe asks for it.
- **Custom domain** (e.g., app.energi-electric.com once domain is registered).
- **Stripe Connect / advanced payment features** if Joe wants subscription billing or multi-party payouts.

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

- Logo, color palette (#045815 / white), typography (Barlow Condensed), invoice/email branding, manifest/OG tags.

**Invoicing & Payments (P0)**

- Card/ACH integration (Stripe recommended, pending processor confirmation).
- Customer magic-link portal with "Pay Invoice" flow.
- Save payment method with explicit consent.
- Admin dashboard: view fee breakdown, payment status; initiate charges to saved methods (with consent).
- Payment status reflected in invoice and customer list.
- **Customer-facing invoice format:** A single summary line — "Provided material and labor for [Joe's free-text description]" — plus total. No itemized breakdown shown to customer. (Joe's words: "the customers they never see the price of the material; they don't see it broken down.")

**Quotes (P0)**

- Joe builds quotes internally using the Materials DB (below) to calculate totals.
- Quote → Invoice conversion: once a quote is approved, generate a customer-facing invoice with the summary line above — materials and markup are **collapsed into the total**, not shown to the customer.
- Quotes have job-type categorization (Rough-in, Trim-out, Service) per Joe's prototype.
- Quote line items are snapshotted — editing a material's price in the DB later does not change historical quotes or invoices.

**Materials & Pricing Database (P0) — INTERNAL ONLY**

Joe's own words clarified this is **NOT customer-facing**. It's his quoting/estimating tool.

Joe has a working prototype built in Claude — source preserved at `docs/joe-materials-prototype.tsx`. The data model below is lifted from that prototype.

**Categories (he calls them "phases"):**
1. Rough-In
2. Trim-Out
3. Service/Panel
4. Temporary Power
5. Misc/Other

**Material schema:**
- `id` (int)
- `name` (string)
- `unit` (string — `ft`, `ea`, `box`, `bag`, `set`)
- `price` (number, USD per unit)
- `qty` (int, per-quote — not stored on the material itself, lives on the quote line)
- `phase` (foreign key → phase)

**Prototype ships with 59 default materials** across the 5 categories — use as the seed dataset for Joe's Energi Electric account on first launch.

**Global per-quote settings** (not per material):
- Markup % (toggle ON/OFF, default 20%) — applies only to materials, NOT labor
- Sales Tax % (toggle ON/OFF, default 8.5%) — applies to EVERYTHING after markup + labor
- Labor Rate $/hr (default $85/hr)
- Labor Hours (default 0)
- Flat Fee $ (toggle ON/OFF, default $0) — for service call / trip charges

**Calculation formula (from prototype, exactly):**
```
phaseSubtotal = sum(price × qty) per phase
materialsTotal = sum of all phaseSubtotals
markupAmt = markupOn ? materialsTotal × (markup/100) : 0
laborAmt = laborRate × laborHours          ← labor is NOT marked up
subtotalBeforeTax = materialsTotal + markupAmt + laborAmt + (flatOn ? flatFee : 0)
taxAmt = taxOn ? subtotalBeforeTax × (tax/100) : 0    ← tax applied to EVERYTHING
grandTotal = subtotalBeforeTax + taxAmt
```

**V1 behavior requirements:**
- CRUD materials — Joe can add/edit/delete in the Materials admin page
- **Auto-grow:** adding a new line item inline on a quote (via the "+ Add" flow) persists it to the DB for future quotes
- **Price editable over time** — updates do NOT retroactively affect existing quotes/invoices (line-item snapshotting required)
- CSV import/export for bulk management
- Markup is GLOBAL per quote, not per-line-item (matches prototype; confirm with Joe if per-line override wanted)
- Labor-exempt-from-markup and tax-on-everything are both confirmed from prototype behavior — not assumptions

**Brand note:** Joe's prototype uses orange (#c8390a) as accent. Production version must use Energi green (#045815). Fonts are already Barlow Condensed + IBM Plex Mono + Barlow — aligns with Energi brand guide.

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
4. Builds a **quote** internally — adds line items from Materials DB, sets labor rate + hours + markup. Total calculates automatically.
5. Converts quote to **invoice** — customer-facing invoice shows a single summary line ("Provided material and labor for [description]") + total. Materials are NOT itemized to the customer.
6. Sends invoice to customer via email with magic-link portal access.
7. Monitors status, views paid/unpaid stats, charges saved cards if needed.

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

### Still open

- **Payment processor:** Stripe recommended, not confirmed. Kenny to research fees. Joe said "whatever will be easiest."
- **ACH implementation:** Stripe's ACH may require Plaid UX and costs. Simpler alternative?
- **Partial payments:** Allowed or not? Joe has not stated.
- **Saved card charges:** Admin-initiated only, or customer-scheduled recurring? Joe described admin-initiated.
- **Refund flow:** Who can issue, UI, time window?
- **Failed payment retry:** Automatic or manual?
- **Jobber export format:** CSV? JSON? Other? Confirmation needed.
- **Customer data volume:** How many customers and active invoices to migrate?
- **$75/mo pricing:** Still correct post-rebrand?
- **License transfer:** When does Joe's electrical license formally transfer to Energi?
- **Customer payment methods in Jobber:** Portable? (Assume no.)

### Resolved

**v1.1 (from 2nd transcript 2026-04-24):**
- ✅ **Customer-facing invoice format:** Single summary line ("Provided material and labor for X"), no itemized breakdown.
- ✅ **Quote → Invoice conversion:** Yes, in V1. Quote is built internally with materials; invoice is the customer-facing output.
- ✅ **Energi Electric logo files:** Received from Joe, staged in `public/brand/`.
- ✅ **Tagline:** "Reliable protection. Safer homes." (correction from prior "Smarter power. Safer homes.")
- ✅ **Brand green:** `#045815` (dark forest green, sampled from final logo), NOT `#2E9640` (mockup stage color).
- ✅ **Materials DB data model:** Prototype source code in `docs/joe-materials-prototype.tsx`. 5 categories, 59 seed materials, schema + calc formula documented in Materials & Pricing Database section.
- ✅ **Markup model:** Global per-quote markup % (20% default). Applies to materials only, not labor.
- ✅ **Tax model:** Applied to materials + markup + labor + flat fee (everything). 8.5% default.

**v1.2 (2026-04-24 Kenny answers):**
- ✅ **Go-live date:** ASAP — treat all V1 blockers as urgent. No hard date. (Cesar timeline is Joe's business problem, not ours.)
- ✅ **Crew size at launch:** 3-4 field workers + Joe (admin). Small team — seat model can be permissive/unlimited.
- ✅ **Custom domain for V1:** Not needed. Keep `energi-electric-app.vercel.app`. Domain swap can happen post-V1 as a separate issue if/when Joe decides.
- ✅ **Per-line markup override:** Going with global-only (matches Joe's prototype). Can add per-line override as V2 if Joe asks for it later.
- ✅ **Invoice reminder emails:** **Yes, but deferred to V2.** See "Deferred to V2" section below.

---

## Reference

- **Source transcripts (both 2026-04-24, Joe ↔ Kenny):**
  - Call 1 (partial): brand pivot, "main four" features (login, time, jobs, invoices), online payment model, materials DB concept introduced.
  - Call 2: materials DB clarified as internal-only, customer invoice format confirmed as summary-line, Joe's materials prototype referenced (link TBD), "Energi Logic Pro" App Store side-product pitched (separate scope).
- **Joe's materials prototype:** [Claude artifact](https://claude.ai/public/artifacts/51be6aef-32e5-4034-8250-77086d5fa788) — source preserved locally at `docs/joe-materials-prototype.tsx` in case artifact expires.
- Dinner follow-up still planned to close remaining Open Questions.
