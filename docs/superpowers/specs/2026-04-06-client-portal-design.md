# Client Portal — Design Spec
**Date:** 2026-04-06  
**Project:** Blue Shores PM  
**Status:** Approved for implementation

---

## Overview

A public-facing client portal that lets Joe's customers view their project status and invoices via a magic link. No login required — each customer gets a unique, permanent URL Joe can share via email or text. Invoices are created and managed in the admin app; clients see what Joe has explicitly sent them.

**Out of scope (v1):** Online payments (Stripe), client requests for new work.

---

## 1. Data Model

### Customers table changes

Add two columns to the existing `customers` table:

```sql
portal_token    UUID UNIQUE DEFAULT gen_random_uuid()
portal_active   BOOLEAN NOT NULL DEFAULT false
```

- `portal_token` is generated once on first portal activation and never changes.
- `portal_active = false` means the portal URL returns a dead page even if the token is known.

---

### New table: `invoices`

```sql
id              UUID PRIMARY KEY DEFAULT gen_random_uuid()
customer_id     UUID NOT NULL REFERENCES customers(id) ON DELETE CASCADE
project_id      UUID REFERENCES projects(id) ON DELETE SET NULL  -- nullable
invoice_number  INTEGER NOT NULL  -- auto-incrementing from 1001 via sequence
title           TEXT NOT NULL
status          TEXT NOT NULL DEFAULT 'draft'  -- draft | sent | paid
tax_amount      NUMERIC(10,2) NOT NULL DEFAULT 0  -- flat dollar amount
notes           TEXT
issued_date     DATE NOT NULL DEFAULT CURRENT_DATE
due_date        DATE
notified_at     TIMESTAMPTZ  -- set when Joe sends the new-invoice notification email
created_by      UUID NOT NULL REFERENCES profiles(id)
created_at      TIMESTAMPTZ NOT NULL DEFAULT now()
updated_at      TIMESTAMPTZ NOT NULL DEFAULT now()
```

**Status meanings:**
- `draft` — only visible to Joe, not shown in portal
- `sent` — visible to client in portal, shown as "Payment Due"
- `paid` — Joe marks manually, shown as "Paid" in portal

---

### New table: `invoice_line_items`

```sql
id              UUID PRIMARY KEY DEFAULT gen_random_uuid()
invoice_id      UUID NOT NULL REFERENCES invoices(id) ON DELETE CASCADE
description     TEXT NOT NULL
quantity        NUMERIC(10,2) NOT NULL DEFAULT 1
unit_price      NUMERIC(10,2) NOT NULL DEFAULT 0
sort_order      INTEGER NOT NULL DEFAULT 0
created_at      TIMESTAMPTZ NOT NULL DEFAULT now()
```

Line item total = `quantity × unit_price`. Invoice subtotal = sum of all line items. Invoice total = subtotal + `tax_amount`.

---

### New table: `line_item_presets`

```sql
id                UUID PRIMARY KEY DEFAULT gen_random_uuid()
name              TEXT NOT NULL
default_unit_price NUMERIC(10,2)  -- nullable, optional default price
sort_order        INTEGER NOT NULL DEFAULT 0
created_by        UUID NOT NULL REFERENCES profiles(id)
created_at        TIMESTAMPTZ NOT NULL DEFAULT now()
```

**Seeded defaults:**
- Labor
- Materials
- Permit Fee
- Inspection Fee
- Service Call
- Travel

Joe can add, edit, or delete presets from Settings.

---

### RLS Policies

- `invoices`, `invoice_line_items`, `line_item_presets` — admin full access, field workers read-only (they may need to reference invoices on project pages).
- Portal routes use the Supabase **service role key** server-side and manually filter to the token-matched customer. No client-side Supabase calls on portal pages.

---

## 2. Admin Experience (Joe's Side)

### Navigation

Add **Invoices** as a top-level nav item (admin only, between Reports and Settings). This is Joe's primary billing workspace.

### Invoices page (`/invoices`)

- List of all invoices across all customers
- Filterable by status: All / Draft / Sent / Paid
- Sortable by date (default: newest first)
- Each row: invoice number, customer name, project (if linked), title, amount, due date, status badge
- "New Invoice" button (top right)

### Invoice creation flow

1. Joe clicks "New Invoice"
2. Selects customer (required) — dropdown from customers list
3. Optionally links to a project (filtered to that customer's projects)
4. Sets title, issued date, due date (optional), notes (optional)
5. Adds line items:
   - Preset picker (dropdown) pre-fills description and optional default price
   - Or type a custom description
   - Each line item: description, quantity, unit price
   - Running subtotal + tax + total shown at bottom
6. Optional tax amount (flat dollar, not percentage — simpler for v1)
7. Saves as **Draft** or uses explicit **"Mark as Sent"** action

**"Mark as Sent"** is a deliberate button, not a save state — prevents accidental client-visible invoices.

### Sending invoice notification email

When Joe marks an invoice as Sent, a prompt appears:
> "Send [Customer Name] an email notification about this invoice?"  
> [Send Email] [Skip]

If Joe clicks Send Email, a server-side API route fires via Resend, sending from `noreply@blueshoresnc.com` with:
- Subject: "You have a new invoice from Blue Shores Electric"
- Body: invoice summary + "View Invoice" button linking to their portal

### Customer Portal tab

Each customer's detail page gets a **Portal** tab:
- Portal status toggle (on/off)
- Portal link display with three share buttons:
  - **Copy Link** — copies URL to clipboard
  - **Send Email** — sends branded email via Resend to customer's email on file
  - **Share via Text** — opens `sms:` with customer's phone pre-filled and message pre-written
- List of this customer's invoices (same columns as Invoices page, scoped to customer)
- "New Invoice" button scoped to this customer

### Project page — Invoices section

On each project's detail page, add a small **Invoices** section (admin only):
- List of invoices linked to this project
- Total billed (sum of sent + paid invoices)
- Link to create a new invoice for this project

---

## 3. Client Portal Experience

### Route

`/portal/[token]` — completely outside the `(authenticated)` layout. No sidebar, no app chrome.

### Access control

On every request:
1. Look up `customers` where `portal_token = token`
2. If not found or `portal_active = false` → render a neutral "This portal is not active" page (no error details)
3. If found → render portal with that customer's data

### Portal page layout

**Header:**
- Blue Shores logo (mark + wordmark)
- Joe's phone number (pulled from a settings constant or env var)
- Clean white background, brand green accents

**Active Projects section:**
Cards for each project linked to this customer where status ≠ `complete`:
- Project name
- Address
- Current phase name
- Status pill: In Progress / On Hold

**Completed Projects section:**
Same card layout, collapsed by default with a "Show completed projects (N)" toggle. Status pill: Completed.

**Invoices section:**
List of all `sent` and `paid` invoices for this customer:
- Invoice number, title, issued date, due date
- Line items: description, quantity, unit price, line total
- Subtotal, tax (if any), **Total**
- Status badge: **Payment Due** (yellow) or **Paid** (green)
- **Download PDF** button per invoice

No draft invoices ever returned by portal API — enforced server-side before data leaves the API route.

**Footer:**
"Powered by Blue Wave Creative Design" — subtle gray text, links to bluewavecreativedesign.com.

### Mobile-first

Portal is designed for phone viewing — Joe's clients are likely on mobile when they receive the text or email. Single-column layout, large touch targets, no horizontal scrolling.

---

## 4. PDF Invoice Download

**Library:** `@react-pdf/renderer` — server-side PDF generation, works on Vercel serverless.

**Route:** `GET /api/portal/invoice/[invoiceId]/pdf?token=[portalToken]`

- Validates token → customer → invoice belongs to customer
- Only generates PDF for `sent` or `paid` invoices (never drafts)
- Returns `application/pdf` with filename `invoice-[number].pdf`

**PDF contents:**
- Blue Shores logo + header
- Invoice number, dates, customer info
- Line items table with subtotal, tax, total
- Status (Payment Due / Paid)
- Joe's contact info at the bottom

---

## 5. New Invoice Notification Email

**Trigger:** Joe clicks "Mark as Sent" and confirms the email prompt.

**Service:** Resend  
**From:** `noreply@blueshoresnc.com` (domain verified via Resend DNS records when blueshoresnc.com moves to BWC SiteGround)  
**Template:** Branded with Blue Shores logo, invoice summary table, "View My Portal" CTA button.

**API route:** `POST /api/invoices/[id]/notify`
- Admin-only (server-side role check)
- Sends via Resend SDK
- Logs send timestamp on the invoice row (`notified_at` column)

---

## 6. Portal Link Sharing

**Copy Link:** `navigator.clipboard.writeText(portalUrl)`

**Send Email:** `POST /api/customers/[id]/share-portal`
- Sends via Resend from `noreply@blueshoresnc.com`
- Subject: "Your Blue Shores Electric Project Portal"
- Body: brief intro + "View My Portal" button

**Share via Text:** Opens `sms:[phone]&body=[encodedMessage]`
- Pre-filled message: "Hi [Name], here's a link to view your Blue Shores project and invoices: [url]"
- Opens native Messages app on iOS, any SMS app on Android

---

## 7. Settings — Line Item Presets

Add a **Line Item Presets** section to the existing Settings page (admin only):
- List of presets with name and optional default price
- Add new preset (name + optional price)
- Edit / delete existing presets
- Drag to reorder (or up/down arrows — simpler)

---

## 8. Security

- **Token entropy:** UUID v4 = 122 bits of randomness. Practically unguessable.
- **Inactive portal = hard dead page:** No data returned if `portal_active = false`.
- **No client-side Supabase on portal pages:** All data fetched server-side via service role, manually scoped to token-matched customer.
- **Draft invoices never exposed:** Filtered server-side in API routes, not just UI.
- **PDF route validates token:** Same token → customer → invoice chain before generating PDF.
- **Invoice notify route is admin-only:** Server-side role check, not just UI gating.
- **No cross-customer data possible:** Token is the sole entry point; one token = one customer.

---

## 9. Future (Out of Scope for v1)

- Online payments via Stripe
- Client requests for new work
- SMS via Twilio or similar (replace `sms:` links with server-sent texts)
- Invoice tax as percentage instead of flat amount
- Invoice reminders (auto-email on due date)
- Custom domain: `pm.blueshoresnc.com` (depends on domain transfer)
