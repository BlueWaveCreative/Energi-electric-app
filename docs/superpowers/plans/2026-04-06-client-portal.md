# Client Portal Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Build a token-based client portal where Joe's customers can view project status and invoices, plus a full invoice management system for Joe in the admin app.

**Architecture:** Public `/portal/[token]` routes sit outside the authenticated layout and use a server-side service-role Supabase client scoped to the token-matched customer. The admin invoice system is a new top-level Invoices section in the authenticated app. Email is sent via Resend; PDFs via `@react-pdf/renderer`.

**Tech Stack:** Next.js 15 (App Router), Supabase (Postgres + RLS), Resend (transactional email), `@react-pdf/renderer` (PDF generation), Tailwind CSS, TypeScript.

---

## File Map

### New files
| File | Purpose |
|------|---------|
| `supabase/migrations/009_client_portal.sql` | New tables: invoices, invoice_line_items, line_item_presets; adds portal_token/portal_active to customers |
| `src/lib/types/database.ts` | Add Invoice, InvoiceLineItem, LineItemPreset types |
| `src/lib/resend.ts` | Resend client + branded email templates (portal share, invoice notification) |
| `src/lib/pdf.tsx` | react-pdf invoice template component |
| `src/app/(authenticated)/invoices/page.tsx` | Admin invoices list (server component) |
| `src/app/(authenticated)/invoices/client.tsx` | Invoices list client (filter tabs, table) |
| `src/app/(authenticated)/invoices/new/page.tsx` | New invoice server component (fetches customers, presets) |
| `src/app/(authenticated)/invoices/new/client.tsx` | Invoice creation form |
| `src/app/(authenticated)/invoices/[id]/page.tsx` | Invoice detail/edit server component |
| `src/app/(authenticated)/invoices/[id]/client.tsx` | Invoice detail client (edit, mark sent/paid) |
| `src/app/api/invoices/route.ts` | POST /api/invoices — create invoice |
| `src/app/api/invoices/[id]/route.ts` | PATCH /api/invoices/[id] — update status or fields |
| `src/app/api/invoices/[id]/notify/route.ts` | POST /api/invoices/[id]/notify — send new-invoice email to customer |
| `src/app/api/customers/[id]/portal/route.ts` | POST /api/customers/[id]/portal — toggle portal_active |
| `src/app/api/customers/[id]/share-portal/route.ts` | POST /api/customers/[id]/share-portal — send portal link email |
| `src/app/api/portal/[token]/route.ts` | GET /api/portal/[token] — return customer's portal data (public) |
| `src/app/api/portal/invoice/[invoiceId]/pdf/route.ts` | GET — generate + stream PDF (validates token via query param) |
| `src/app/portal/[token]/page.tsx` | Public portal page (server, validates token) |
| `src/app/portal/[token]/client.tsx` | Portal client component (project cards, invoice list) |

### Modified files
| File | Change |
|------|--------|
| `src/components/layout/sidebar.tsx` | Add Invoices nav item (admin only) |
| `src/components/layout/bottom-nav.tsx` | No change needed (Invoices is admin-only, not in mobile bottom nav) |
| `src/lib/types/database.ts` | Add new types |
| `src/app/(authenticated)/settings/page.tsx` | Fetch line_item_presets |
| `src/app/(authenticated)/settings/client.tsx` | Add Line Item Presets section + Customer Portal tab section |
| `src/app/(authenticated)/projects/[id]/page.tsx` | Fetch invoices linked to this project |
| `src/app/(authenticated)/projects/[id]/client.tsx` | Add Invoices section (admin only) |

---

## Task 1: Database Migration

**Files:**
- Create: `supabase/migrations/009_client_portal.sql`

- [ ] **Step 1: Create migration file**

```sql
-- Migration: 009_client_portal.sql
-- Purpose: Client portal token on customers + invoicing tables

-- 1. Add portal columns to customers
ALTER TABLE customers
  ADD COLUMN portal_token UUID UNIQUE DEFAULT gen_random_uuid(),
  ADD COLUMN portal_active BOOLEAN NOT NULL DEFAULT false;

-- Backfill existing customers with tokens
UPDATE customers SET portal_token = gen_random_uuid() WHERE portal_token IS NULL;
ALTER TABLE customers ALTER COLUMN portal_token SET NOT NULL;

-- 2. Invoice number sequence starting at 1001
CREATE SEQUENCE invoice_number_seq START WITH 1001 INCREMENT BY 1;

-- 3. Invoices table
CREATE TABLE invoices (
  id              UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  customer_id     UUID NOT NULL REFERENCES customers(id) ON DELETE CASCADE,
  project_id      UUID REFERENCES projects(id) ON DELETE SET NULL,
  invoice_number  INTEGER NOT NULL DEFAULT nextval('invoice_number_seq'),
  title           TEXT NOT NULL,
  status          TEXT NOT NULL DEFAULT 'draft' CHECK (status IN ('draft', 'sent', 'paid')),
  tax_amount      NUMERIC(10,2) NOT NULL DEFAULT 0,
  notes           TEXT,
  issued_date     DATE NOT NULL DEFAULT CURRENT_DATE,
  due_date        DATE,
  notified_at     TIMESTAMPTZ,
  created_by      UUID NOT NULL REFERENCES profiles(id),
  created_at      TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at      TIMESTAMPTZ NOT NULL DEFAULT now()
);

ALTER TABLE invoices ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Admins can manage invoices"
  ON invoices FOR ALL
  USING (get_user_role() = 'admin')
  WITH CHECK (get_user_role() = 'admin');

CREATE POLICY "Field workers can read invoices"
  ON invoices FOR SELECT
  USING (get_user_role() = 'field_worker');

CREATE INDEX idx_invoices_customer ON invoices(customer_id);
CREATE INDEX idx_invoices_project ON invoices(project_id);
CREATE INDEX idx_invoices_status ON invoices(status);

-- 4. Invoice line items
CREATE TABLE invoice_line_items (
  id          UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  invoice_id  UUID NOT NULL REFERENCES invoices(id) ON DELETE CASCADE,
  description TEXT NOT NULL,
  quantity    NUMERIC(10,2) NOT NULL DEFAULT 1,
  unit_price  NUMERIC(10,2) NOT NULL DEFAULT 0,
  sort_order  INTEGER NOT NULL DEFAULT 0,
  created_at  TIMESTAMPTZ NOT NULL DEFAULT now()
);

ALTER TABLE invoice_line_items ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Admins can manage line items"
  ON invoice_line_items FOR ALL
  USING (get_user_role() = 'admin')
  WITH CHECK (get_user_role() = 'admin');

CREATE POLICY "Field workers can read line items"
  ON invoice_line_items FOR SELECT
  USING (get_user_role() = 'field_worker');

CREATE INDEX idx_line_items_invoice ON invoice_line_items(invoice_id);

-- 5. Line item presets
CREATE TABLE line_item_presets (
  id                  UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name                TEXT NOT NULL,
  default_unit_price  NUMERIC(10,2),
  sort_order          INTEGER NOT NULL DEFAULT 0,
  created_by          UUID NOT NULL REFERENCES profiles(id),
  created_at          TIMESTAMPTZ NOT NULL DEFAULT now()
);

ALTER TABLE line_item_presets ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Admins can manage presets"
  ON line_item_presets FOR ALL
  USING (get_user_role() = 'admin')
  WITH CHECK (get_user_role() = 'admin');

-- Seed default presets (created_by will be set manually or via a trigger — use a placeholder)
-- Note: Insert presets after migration via app Settings page; no hardcoded user ID here.
```

- [ ] **Step 2: Apply migration to Supabase**

```bash
cd /Users/kennysiddons/Documents/Projects/blue-shores-pm
npx supabase db push
```

Expected: migration applies cleanly, no errors.

- [ ] **Step 3: Seed line item presets via Supabase dashboard SQL editor**

Run in the Supabase SQL editor (replace `<admin-user-id>` with Joe's profile ID — query: `SELECT id FROM profiles WHERE email = 'joe@blueshoresnc.com'`):

```sql
INSERT INTO line_item_presets (name, default_unit_price, sort_order, created_by) VALUES
  ('Labor', NULL, 0, '<admin-user-id>'),
  ('Materials', NULL, 1, '<admin-user-id>'),
  ('Permit Fee', NULL, 2, '<admin-user-id>'),
  ('Inspection Fee', NULL, 3, '<admin-user-id>'),
  ('Service Call', NULL, 4, '<admin-user-id>'),
  ('Travel', NULL, 5, '<admin-user-id>');
```

- [ ] **Step 4: Commit**

```bash
git checkout -b feat/client-portal
git add supabase/migrations/009_client_portal.sql
git commit -m "feat: add client portal + invoicing migrations"
```

---

## Task 2: TypeScript Types

**Files:**
- Modify: `src/lib/types/database.ts`

- [ ] **Step 1: Add new types at the bottom of the file**

```typescript
export type InvoiceStatus = 'draft' | 'sent' | 'paid'

export interface Invoice {
  id: string
  customer_id: string
  project_id: string | null
  invoice_number: number
  title: string
  status: InvoiceStatus
  tax_amount: number
  notes: string | null
  issued_date: string
  due_date: string | null
  notified_at: string | null
  created_by: string
  created_at: string
  updated_at: string
}

export interface InvoiceLineItem {
  id: string
  invoice_id: string
  description: string
  quantity: number
  unit_price: number
  sort_order: number
  created_at: string
}

export interface LineItemPreset {
  id: string
  name: string
  default_unit_price: number | null
  sort_order: number
  created_by: string
  created_at: string
}

export interface Customer {
  id: string
  name: string
  email: string | null
  phone: string | null
  address: string | null
  notes: string | null
  portal_token: string
  portal_active: boolean
  created_by: string
  created_at: string
}

// Joined types
export interface InvoiceWithLineItems extends Invoice {
  invoice_line_items: InvoiceLineItem[]
}

export interface InvoiceWithCustomer extends Invoice {
  customers: { name: string; email: string | null }
  projects: { name: string } | null
}
```

- [ ] **Step 2: Verify TypeScript compiles**

```bash
cd /Users/kennysiddons/Documents/Projects/blue-shores-pm
npx tsc --noEmit
```

Expected: no errors.

- [ ] **Step 3: Commit**

```bash
git add src/lib/types/database.ts
git commit -m "feat: add Invoice, InvoiceLineItem, LineItemPreset, Customer types"
```

---

## Task 3: Install Dependencies

**Files:** `package.json`

- [ ] **Step 1: Install Resend and react-pdf**

```bash
cd /Users/kennysiddons/Documents/Projects/blue-shores-pm
npm install resend @react-pdf/renderer
npm install --save-dev @types/react-pdf
```

- [ ] **Step 2: Verify install**

```bash
npx tsc --noEmit
```

Expected: no errors.

- [ ] **Step 3: Add Resend API key to Vercel env vars**

```bash
# Get the API key from resend.com (create account + add domain later)
# For now, create a key scoped to any domain for development
vercel env add RESEND_API_KEY
# When prompted, paste the key
# Select: Production, Preview, Development
```

Also add to `.env.local` for local dev:
```
RESEND_API_KEY=re_xxxxxxxxxxxx
RESEND_FROM_EMAIL=noreply@blueshoresnc.com
```

Add `RESEND_FROM_EMAIL` to Vercel too:
```bash
vercel env add RESEND_FROM_EMAIL
# value: noreply@blueshoresnc.com
```

- [ ] **Step 4: Commit**

```bash
git add package.json package-lock.json
git commit -m "feat: install resend and react-pdf"
```

---

## Task 4: Resend Email Client

**Files:**
- Create: `src/lib/resend.ts`

- [ ] **Step 1: Create Resend client and email templates**

```typescript
// src/lib/resend.ts
import { Resend } from 'resend'

export const resend = new Resend(process.env.RESEND_API_KEY)

const FROM = process.env.RESEND_FROM_EMAIL ?? 'noreply@blueshoresnc.com'
const BASE_URL = process.env.NEXT_PUBLIC_APP_URL ?? 'https://blue-shores-pm.vercel.app'

export async function sendPortalShareEmail({
  to,
  customerName,
  portalToken,
}: {
  to: string
  customerName: string
  portalToken: string
}) {
  const portalUrl = `${BASE_URL}/portal/${portalToken}`

  return resend.emails.send({
    from: FROM,
    to,
    subject: 'Your Blue Shores Electric Project Portal',
    html: `
      <!DOCTYPE html>
      <html>
        <body style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto; padding: 20px; color: #32373C;">
          <img src="${BASE_URL}/brand/logo-horizontal.svg" alt="Blue Shores Electric" style="height: 40px; margin-bottom: 24px;" />
          <h1 style="font-size: 22px; color: #32373C;">Hi ${customerName},</h1>
          <p style="font-size: 16px; line-height: 1.6;">
            Blue Shores Electric has set up a portal for you to view your project status and invoices.
          </p>
          <a href="${portalUrl}" style="display: inline-block; background-color: #68BD45; color: white; padding: 14px 28px; border-radius: 8px; text-decoration: none; font-weight: bold; font-size: 16px; margin: 16px 0;">
            View My Portal
          </a>
          <p style="font-size: 14px; color: #666; margin-top: 24px;">
            Bookmark this link — you can use it anytime to check on your project and view invoices.
          </p>
          <p style="font-size: 14px; color: #666;">
            Questions? Call us at <a href="tel:9104000000" style="color: #68BD45;">(910) 400-0000</a>
          </p>
          <hr style="border: none; border-top: 1px solid #eee; margin: 24px 0;" />
          <p style="font-size: 12px; color: #999;">Blue Shores Electric · Wilmington, NC</p>
        </body>
      </html>
    `,
  })
}

export async function sendInvoiceNotificationEmail({
  to,
  customerName,
  portalToken,
  invoiceTitle,
  invoiceNumber,
  totalAmount,
  dueDate,
}: {
  to: string
  customerName: string
  portalToken: string
  invoiceTitle: string
  invoiceNumber: number
  totalAmount: number
  dueDate: string | null
}) {
  const portalUrl = `${BASE_URL}/portal/${portalToken}`
  const formattedTotal = new Intl.NumberFormat('en-US', { style: 'currency', currency: 'USD' }).format(totalAmount)
  const formattedDue = dueDate
    ? new Date(dueDate + 'T00:00:00').toLocaleDateString('en-US', { month: 'long', day: 'numeric', year: 'numeric' })
    : null

  return resend.emails.send({
    from: FROM,
    to,
    subject: `Invoice #${invoiceNumber} from Blue Shores Electric`,
    html: `
      <!DOCTYPE html>
      <html>
        <body style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto; padding: 20px; color: #32373C;">
          <img src="${BASE_URL}/brand/logo-horizontal.svg" alt="Blue Shores Electric" style="height: 40px; margin-bottom: 24px;" />
          <h1 style="font-size: 22px; color: #32373C;">Hi ${customerName},</h1>
          <p style="font-size: 16px; line-height: 1.6;">
            You have a new invoice from Blue Shores Electric.
          </p>
          <div style="background: #f9f9f9; border-radius: 8px; padding: 20px; margin: 20px 0;">
            <p style="margin: 0 0 8px; font-size: 14px; color: #666;">Invoice #${invoiceNumber}</p>
            <p style="margin: 0 0 8px; font-size: 18px; font-weight: bold; color: #32373C;">${invoiceTitle}</p>
            <p style="margin: 0 0 8px; font-size: 24px; font-weight: bold; color: #68BD45;">${formattedTotal}</p>
            ${formattedDue ? `<p style="margin: 0; font-size: 14px; color: #666;">Due: ${formattedDue}</p>` : ''}
          </div>
          <a href="${portalUrl}" style="display: inline-block; background-color: #68BD45; color: white; padding: 14px 28px; border-radius: 8px; text-decoration: none; font-weight: bold; font-size: 16px; margin: 16px 0;">
            View Invoice
          </a>
          <p style="font-size: 14px; color: #666; margin-top: 24px;">
            Questions? Call us at <a href="tel:9104000000" style="color: #68BD45;">(910) 400-0000</a>
          </p>
          <hr style="border: none; border-top: 1px solid #eee; margin: 24px 0;" />
          <p style="font-size: 12px; color: #999;">Blue Shores Electric · Wilmington, NC</p>
        </body>
      </html>
    `,
  })
}
```

**Note:** Replace `(910) 400-0000` with Joe's actual phone number before shipping.

- [ ] **Step 2: Add `NEXT_PUBLIC_APP_URL` to env**

Add to `.env.local`:
```
NEXT_PUBLIC_APP_URL=http://localhost:3000
```

Add to Vercel:
```bash
vercel env add NEXT_PUBLIC_APP_URL
# value: https://blue-shores-pm.vercel.app
```

- [ ] **Step 3: Commit**

```bash
git add src/lib/resend.ts
git commit -m "feat: add Resend email client with portal share and invoice notification templates"
```

---

## Task 5: Add Invoices to Sidebar Nav

**Files:**
- Modify: `src/components/layout/sidebar.tsx`

- [ ] **Step 1: Add Receipt icon import and Invoices nav item**

In `src/components/layout/sidebar.tsx`, update the import and navItems:

```typescript
// Change the import line — add Receipt to the lucide import
import { LayoutDashboard, FolderOpen, FileStack, Settings, Clock, BarChart3, Activity, CalendarDays, HelpCircle, LogOut, Receipt } from 'lucide-react'
```

Add the Invoices item between Reports and Templates in the navItems array:

```typescript
const navItems = [
  { href: '/dashboard', label: 'Dashboard', icon: LayoutDashboard, adminOnly: false },
  { href: '/projects', label: 'Projects', icon: FolderOpen, adminOnly: false },
  { href: '/my-time', label: 'My Time', icon: Clock, adminOnly: false },
  { href: '/schedule', label: 'Schedule', icon: CalendarDays, adminOnly: false },
  { href: '/reports', label: 'Reports', icon: BarChart3, adminOnly: true },
  { href: '/invoices', label: 'Invoices', icon: Receipt, adminOnly: true },
  { href: '/activity', label: 'Activity', icon: Activity, adminOnly: false },
  { href: '/templates', label: 'Templates', icon: FileStack, adminOnly: true },
  { href: '/settings', label: 'Settings', icon: Settings, adminOnly: true },
  { href: '/help', label: 'Help', icon: HelpCircle, adminOnly: false },
]
```

- [ ] **Step 2: Start dev server and verify Invoices appears in sidebar for admin**

```bash
npm run dev
```

Open http://localhost:3000 and log in as Joe. Invoices should appear in the sidebar between Reports and Activity.

- [ ] **Step 3: Commit**

```bash
git add src/components/layout/sidebar.tsx
git commit -m "feat: add Invoices to admin sidebar nav"
```

---

## Task 6: Invoices List Page

**Files:**
- Create: `src/app/(authenticated)/invoices/page.tsx`
- Create: `src/app/(authenticated)/invoices/client.tsx`

- [ ] **Step 1: Create server component**

```typescript
// src/app/(authenticated)/invoices/page.tsx
export const dynamic = 'force-dynamic'

import { redirect } from 'next/navigation'
import { createClient } from '@/lib/supabase/server'
import { PageHeader } from '@/components/layout/page-header'
import { InvoicesClient } from './client'

export default async function InvoicesPage() {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) redirect('/login')

  const { data: profile } = await supabase
    .from('profiles')
    .select('role')
    .eq('id', user.id)
    .single()

  if (profile?.role !== 'admin') redirect('/dashboard')

  const { data: invoices } = await supabase
    .from('invoices')
    .select('*, customers(name), projects(name)')
    .order('created_at', { ascending: false })

  return (
    <div>
      <PageHeader title="Invoices" />
      <div className="p-4 md:p-6">
        <InvoicesClient invoices={invoices ?? []} />
      </div>
    </div>
  )
}
```

- [ ] **Step 2: Create client component**

```typescript
// src/app/(authenticated)/invoices/client.tsx
'use client'

import { useState } from 'react'
import Link from 'next/link'
import { Button } from '@/components/ui/button'
import { Card } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { Plus } from 'lucide-react'
import type { InvoiceStatus } from '@/lib/types/database'

type InvoiceRow = {
  id: string
  invoice_number: number
  title: string
  status: InvoiceStatus
  tax_amount: number
  issued_date: string
  due_date: string | null
  customers: { name: string } | null
  projects: { name: string } | null
  invoice_line_items?: { quantity: number; unit_price: number }[]
}

interface InvoicesClientProps {
  invoices: InvoiceRow[]
}

const STATUS_TABS: { label: string; value: 'all' | InvoiceStatus }[] = [
  { label: 'All', value: 'all' },
  { label: 'Draft', value: 'draft' },
  { label: 'Sent', value: 'sent' },
  { label: 'Paid', value: 'paid' },
]

function statusBadge(status: InvoiceStatus) {
  if (status === 'draft') return <Badge variant="default">Draft</Badge>
  if (status === 'sent') return <Badge variant="warning">Payment Due</Badge>
  return <Badge variant="success">Paid</Badge>
}

function formatCurrency(amount: number) {
  return new Intl.NumberFormat('en-US', { style: 'currency', currency: 'USD' }).format(amount)
}

export function InvoicesClient({ invoices }: InvoicesClientProps) {
  const [activeTab, setActiveTab] = useState<'all' | InvoiceStatus>('all')

  const filtered = activeTab === 'all' ? invoices : invoices.filter(i => i.status === activeTab)

  return (
    <div className="space-y-4 max-w-4xl">
      <div className="flex items-center justify-between">
        <div className="flex gap-2">
          {STATUS_TABS.map(tab => (
            <button
              key={tab.value}
              onClick={() => setActiveTab(tab.value)}
              className={`px-4 py-1.5 rounded-full text-sm font-medium transition-colors ${
                activeTab === tab.value
                  ? 'bg-[#68BD45] text-white'
                  : 'bg-gray-100 text-gray-600 hover:bg-gray-200'
              }`}
            >
              {tab.label}
            </button>
          ))}
        </div>
        <Button asChild>
          <Link href="/invoices/new">
            <Plus className="w-4 h-4 mr-2" /> New Invoice
          </Link>
        </Button>
      </div>

      {filtered.length === 0 ? (
        <Card>
          <p className="text-gray-500 text-sm text-center py-4">No invoices yet.</p>
        </Card>
      ) : (
        <div className="space-y-2">
          {filtered.map(invoice => (
            <Link key={invoice.id} href={`/invoices/${invoice.id}`}>
              <Card className="hover:shadow-md transition-shadow cursor-pointer">
                <div className="flex items-center justify-between gap-4">
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2 mb-1">
                      <span className="text-xs text-gray-400 font-mono">#{invoice.invoice_number}</span>
                      {statusBadge(invoice.status)}
                    </div>
                    <p className="font-medium text-gray-900 truncate">{invoice.title}</p>
                    <p className="text-sm text-gray-500">
                      {invoice.customers?.name}
                      {invoice.projects ? ` · ${invoice.projects.name}` : ''}
                    </p>
                  </div>
                  <div className="text-right shrink-0">
                    <p className="font-semibold text-gray-900">
                      {formatCurrency(invoice.tax_amount)}
                    </p>
                    <p className="text-xs text-gray-400">
                      {invoice.due_date
                        ? `Due ${new Date(invoice.due_date + 'T00:00:00').toLocaleDateString('en-US', { month: 'short', day: 'numeric' })}`
                        : invoice.issued_date}
                    </p>
                  </div>
                </div>
              </Card>
            </Link>
          ))}
        </div>
      )}
    </div>
  )
}
```

**Note:** The invoice total displayed here shows `tax_amount` as a placeholder — in Task 8 we'll add the real total computation once line items are fetched. For now the list page fetches invoices without line items to stay fast; detail page fetches full data.

- [ ] **Step 3: Verify page loads**

Navigate to http://localhost:3000/invoices. Should show empty state with "New Invoice" button.

- [ ] **Step 4: Commit**

```bash
git add src/app/'(authenticated)'/invoices/
git commit -m "feat: add Invoices list page with status filter tabs"
```

---

## Task 7: Invoice Creation

**Files:**
- Create: `src/app/(authenticated)/invoices/new/page.tsx`
- Create: `src/app/(authenticated)/invoices/new/client.tsx`
- Create: `src/app/api/invoices/route.ts`

- [ ] **Step 1: Create API route for invoice creation**

```typescript
// src/app/api/invoices/route.ts
import { NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'

export async function POST(request: Request) {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const { data: profile } = await supabase.from('profiles').select('role').eq('id', user.id).single()
  if (profile?.role !== 'admin') return NextResponse.json({ error: 'Forbidden' }, { status: 403 })

  const body = await request.json()
  const { customer_id, project_id, title, issued_date, due_date, notes, tax_amount, line_items } = body

  if (!customer_id || !title || !issued_date) {
    return NextResponse.json({ error: 'Missing required fields' }, { status: 400 })
  }

  const { data: invoice, error } = await supabase
    .from('invoices')
    .insert({
      customer_id,
      project_id: project_id || null,
      title,
      issued_date,
      due_date: due_date || null,
      notes: notes || null,
      tax_amount: tax_amount ?? 0,
      created_by: user.id,
    })
    .select()
    .single()

  if (error || !invoice) {
    return NextResponse.json({ error: error?.message ?? 'Failed to create invoice' }, { status: 500 })
  }

  if (line_items && line_items.length > 0) {
    const items = line_items.map((item: { description: string; quantity: number; unit_price: number }, idx: number) => ({
      invoice_id: invoice.id,
      description: item.description,
      quantity: item.quantity,
      unit_price: item.unit_price,
      sort_order: idx,
    }))
    const { error: itemsError } = await supabase.from('invoice_line_items').insert(items)
    if (itemsError) {
      return NextResponse.json({ error: itemsError.message }, { status: 500 })
    }
  }

  return NextResponse.json({ invoice }, { status: 201 })
}
```

- [ ] **Step 2: Create new invoice server page**

```typescript
// src/app/(authenticated)/invoices/new/page.tsx
export const dynamic = 'force-dynamic'

import { redirect } from 'next/navigation'
import { createClient } from '@/lib/supabase/server'
import { PageHeader } from '@/components/layout/page-header'
import { NewInvoiceClient } from './client'

export default async function NewInvoicePage() {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) redirect('/login')

  const { data: profile } = await supabase.from('profiles').select('role').eq('id', user.id).single()
  if (profile?.role !== 'admin') redirect('/dashboard')

  const [{ data: customers }, { data: projects }, { data: presets }] = await Promise.all([
    supabase.from('customers').select('id, name, email').order('name'),
    supabase.from('projects').select('id, name, customer_id, status').eq('status', 'active').order('name'),
    supabase.from('line_item_presets').select('*').order('sort_order'),
  ])

  return (
    <div>
      <PageHeader title="New Invoice" />
      <div className="p-4 md:p-6">
        <NewInvoiceClient
          customers={customers ?? []}
          projects={projects ?? []}
          presets={presets ?? []}
        />
      </div>
    </div>
  )
}
```

- [ ] **Step 3: Create new invoice client form**

```typescript
// src/app/(authenticated)/invoices/new/client.tsx
'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import { Button } from '@/components/ui/button'
import { Card } from '@/components/ui/card'
import { Input } from '@/components/ui/input'
import { Plus, Trash2 } from 'lucide-react'
import type { LineItemPreset } from '@/lib/types/database'

interface NewInvoiceClientProps {
  customers: { id: string; name: string; email: string | null }[]
  projects: { id: string; name: string; customer_id: string | null; status: string }[]
  presets: LineItemPreset[]
}

interface LineItem {
  description: string
  quantity: string
  unit_price: string
}

export function NewInvoiceClient({ customers, projects, presets }: NewInvoiceClientProps) {
  const router = useRouter()
  const [customerId, setCustomerId] = useState('')
  const [projectId, setProjectId] = useState('')
  const [title, setTitle] = useState('')
  const [issuedDate, setIssuedDate] = useState(new Date().toISOString().split('T')[0])
  const [dueDate, setDueDate] = useState('')
  const [notes, setNotes] = useState('')
  const [taxAmount, setTaxAmount] = useState('')
  const [lineItems, setLineItems] = useState<LineItem[]>([{ description: '', quantity: '1', unit_price: '' }])
  const [saving, setSaving] = useState(false)
  const [error, setError] = useState('')

  const filteredProjects = customerId
    ? projects.filter(p => p.customer_id === customerId)
    : projects

  function addLineItem() {
    setLineItems(prev => [...prev, { description: '', quantity: '1', unit_price: '' }])
  }

  function removeLineItem(idx: number) {
    setLineItems(prev => prev.filter((_, i) => i !== idx))
  }

  function updateLineItem(idx: number, field: keyof LineItem, value: string) {
    setLineItems(prev => prev.map((item, i) => i === idx ? { ...item, [field]: value } : item))
  }

  function applyPreset(idx: number, presetId: string) {
    const preset = presets.find(p => p.id === presetId)
    if (!preset) return
    setLineItems(prev => prev.map((item, i) =>
      i === idx
        ? { ...item, description: preset.name, unit_price: preset.default_unit_price?.toString() ?? '' }
        : item
    ))
  }

  function computeSubtotal() {
    return lineItems.reduce((sum, item) => {
      const qty = parseFloat(item.quantity) || 0
      const price = parseFloat(item.unit_price) || 0
      return sum + qty * price
    }, 0)
  }

  function formatCurrency(n: number) {
    return new Intl.NumberFormat('en-US', { style: 'currency', currency: 'USD' }).format(n)
  }

  async function handleSave(status: 'draft' | 'sent') {
    setError('')
    if (!customerId) { setError('Please select a customer.'); return }
    if (!title) { setError('Please enter a title.'); return }

    const validItems = lineItems.filter(i => i.description.trim())
    setSaving(true)
    try {
      const res = await fetch('/api/invoices', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          customer_id: customerId,
          project_id: projectId || null,
          title,
          issued_date: issuedDate,
          due_date: dueDate || null,
          notes: notes || null,
          tax_amount: parseFloat(taxAmount) || 0,
          line_items: validItems.map(i => ({
            description: i.description,
            quantity: parseFloat(i.quantity) || 1,
            unit_price: parseFloat(i.unit_price) || 0,
          })),
        }),
      })

      const data = await res.json()
      if (!res.ok) { setError(data.error ?? 'Failed to save.'); return }

      // If sent, update status
      if (status === 'sent') {
        await fetch(`/api/invoices/${data.invoice.id}`, {
          method: 'PATCH',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ status: 'sent' }),
        })
      }

      router.push(`/invoices/${data.invoice.id}`)
    } finally {
      setSaving(false)
    }
  }

  const subtotal = computeSubtotal()
  const tax = parseFloat(taxAmount) || 0
  const total = subtotal + tax

  return (
    <div className="max-w-2xl space-y-6">
      {error && <p className="text-sm text-red-600 bg-red-50 p-3 rounded-lg">{error}</p>}

      <Card>
        <h2 className="font-semibold text-gray-900 mb-4">Invoice Details</h2>
        <div className="space-y-4">
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Customer *</label>
            <select
              value={customerId}
              onChange={e => { setCustomerId(e.target.value); setProjectId('') }}
              className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-[#68BD45]"
            >
              <option value="">Select customer...</option>
              {customers.map(c => <option key={c.id} value={c.id}>{c.name}</option>)}
            </select>
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Link to Project (optional)</label>
            <select
              value={projectId}
              onChange={e => setProjectId(e.target.value)}
              className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-[#68BD45]"
            >
              <option value="">No project</option>
              {filteredProjects.map(p => <option key={p.id} value={p.id}>{p.name}</option>)}
            </select>
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Title *</label>
            <Input value={title} onChange={e => setTitle(e.target.value)} placeholder="e.g. Rough-in Wiring - Phase 1" />
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Issued Date *</label>
              <Input type="date" value={issuedDate} onChange={e => setIssuedDate(e.target.value)} />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Due Date</label>
              <Input type="date" value={dueDate} onChange={e => setDueDate(e.target.value)} />
            </div>
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Notes (optional)</label>
            <textarea
              value={notes}
              onChange={e => setNotes(e.target.value)}
              rows={2}
              className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-[#68BD45] placeholder:text-gray-400"
              placeholder="Any notes for the customer..."
            />
          </div>
        </div>
      </Card>

      <Card>
        <h2 className="font-semibold text-gray-900 mb-4">Line Items</h2>
        <div className="space-y-3">
          {lineItems.map((item, idx) => (
            <div key={idx} className="space-y-2 pb-3 border-b border-gray-100 last:border-0 last:pb-0">
              <div className="flex gap-2">
                <select
                  onChange={e => applyPreset(idx, e.target.value)}
                  className="flex-1 border border-gray-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-[#68BD45]"
                  defaultValue=""
                >
                  <option value="">Pick a preset or type below...</option>
                  {presets.map(p => <option key={p.id} value={p.id}>{p.name}</option>)}
                </select>
                {lineItems.length > 1 && (
                  <button onClick={() => removeLineItem(idx)} className="text-red-400 hover:text-red-600">
                    <Trash2 className="w-4 h-4" />
                  </button>
                )}
              </div>
              <Input
                value={item.description}
                onChange={e => updateLineItem(idx, 'description', e.target.value)}
                placeholder="Description"
              />
              <div className="grid grid-cols-2 gap-2">
                <Input
                  type="number"
                  value={item.quantity}
                  onChange={e => updateLineItem(idx, 'quantity', e.target.value)}
                  placeholder="Qty"
                  min="0"
                  step="0.01"
                />
                <Input
                  type="number"
                  value={item.unit_price}
                  onChange={e => updateLineItem(idx, 'unit_price', e.target.value)}
                  placeholder="Unit price ($)"
                  min="0"
                  step="0.01"
                />
              </div>
              {item.quantity && item.unit_price && (
                <p className="text-xs text-gray-400 text-right">
                  {formatCurrency((parseFloat(item.quantity) || 0) * (parseFloat(item.unit_price) || 0))}
                </p>
              )}
            </div>
          ))}
        </div>

        <button
          onClick={addLineItem}
          className="mt-3 flex items-center gap-1 text-sm text-[#68BD45] hover:text-green-700 font-medium"
        >
          <Plus className="w-4 h-4" /> Add line item
        </button>

        <div className="mt-4 pt-4 border-t border-gray-100 space-y-2">
          <div className="flex justify-between text-sm text-gray-600">
            <span>Subtotal</span><span>{formatCurrency(subtotal)}</span>
          </div>
          <div className="flex items-center justify-between text-sm text-gray-600">
            <span>Tax</span>
            <div className="flex items-center gap-1">
              <span>$</span>
              <input
                type="number"
                value={taxAmount}
                onChange={e => setTaxAmount(e.target.value)}
                placeholder="0.00"
                min="0"
                step="0.01"
                className="w-24 border border-gray-300 rounded px-2 py-1 text-sm text-right focus:outline-none focus:ring-1 focus:ring-[#68BD45]"
              />
            </div>
          </div>
          <div className="flex justify-between font-semibold text-gray-900 text-base pt-1 border-t border-gray-200">
            <span>Total</span><span>{formatCurrency(total)}</span>
          </div>
        </div>
      </Card>

      <div className="flex gap-3">
        <Button variant="secondary" onClick={() => handleSave('draft')} disabled={saving}>
          Save as Draft
        </Button>
        <Button onClick={() => handleSave('sent')} disabled={saving}>
          Mark as Sent
        </Button>
      </div>
    </div>
  )
}
```

- [ ] **Step 4: Create PATCH route for updating invoice status**

```typescript
// src/app/api/invoices/[id]/route.ts
import { NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'

export async function PATCH(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id } = await params
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const { data: profile } = await supabase.from('profiles').select('role').eq('id', user.id).single()
  if (profile?.role !== 'admin') return NextResponse.json({ error: 'Forbidden' }, { status: 403 })

  const body = await request.json()
  const allowedFields = ['status', 'title', 'notes', 'due_date', 'tax_amount', 'notified_at']
  const updates: Record<string, unknown> = { updated_at: new Date().toISOString() }

  for (const field of allowedFields) {
    if (field in body) updates[field] = body[field]
  }

  const { error } = await supabase.from('invoices').update(updates).eq('id', id)
  if (error) return NextResponse.json({ error: error.message }, { status: 500 })

  return NextResponse.json({ success: true })
}
```

- [ ] **Step 5: Test invoice creation**

Navigate to http://localhost:3000/invoices/new. Create a test invoice with a line item, save as draft. Should redirect to `/invoices/[id]` (returns 404 for now — that's expected, we build the detail page next).

- [ ] **Step 6: Commit**

```bash
git add src/app/'(authenticated)'/invoices/new/ src/app/api/invoices/
git commit -m "feat: add invoice creation form + API routes"
```

---

## Task 8: Invoice Detail Page

**Files:**
- Create: `src/app/(authenticated)/invoices/[id]/page.tsx`
- Create: `src/app/(authenticated)/invoices/[id]/client.tsx`

- [ ] **Step 1: Create server component**

```typescript
// src/app/(authenticated)/invoices/[id]/page.tsx
export const dynamic = 'force-dynamic'

import { notFound, redirect } from 'next/navigation'
import { createClient } from '@/lib/supabase/server'
import { PageHeader } from '@/components/layout/page-header'
import { InvoiceDetailClient } from './client'

export default async function InvoiceDetailPage({
  params,
}: {
  params: Promise<{ id: string }>
}) {
  const { id } = await params
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) redirect('/login')

  const { data: profile } = await supabase.from('profiles').select('role').eq('id', user.id).single()
  if (profile?.role !== 'admin') redirect('/dashboard')

  const { data: invoice } = await supabase
    .from('invoices')
    .select('*, invoice_line_items(*), customers(name, email, portal_token), projects(name)')
    .eq('id', id)
    .single()

  if (!invoice) notFound()

  return (
    <div>
      <PageHeader title={`Invoice #${invoice.invoice_number}`} />
      <div className="p-4 md:p-6">
        <InvoiceDetailClient invoice={invoice} />
      </div>
    </div>
  )
}
```

- [ ] **Step 2: Create detail client component**

```typescript
// src/app/(authenticated)/invoices/[id]/client.tsx
'use client'

import { useState } from 'react'
import { Card } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { CheckCircle, Send, Bell } from 'lucide-react'
import type { InvoiceStatus, InvoiceLineItem } from '@/lib/types/database'

interface InvoiceDetailClientProps {
  invoice: {
    id: string
    invoice_number: number
    title: string
    status: InvoiceStatus
    tax_amount: number
    notes: string | null
    issued_date: string
    due_date: string | null
    notified_at: string | null
    invoice_line_items: InvoiceLineItem[]
    customers: { name: string; email: string | null; portal_token: string } | null
    projects: { name: string } | null
  }
}

function formatCurrency(n: number) {
  return new Intl.NumberFormat('en-US', { style: 'currency', currency: 'USD' }).format(n)
}

function formatDate(d: string) {
  return new Date(d + 'T00:00:00').toLocaleDateString('en-US', { month: 'long', day: 'numeric', year: 'numeric' })
}

export function InvoiceDetailClient({ invoice }: InvoiceDetailClientProps) {
  const [status, setStatus] = useState<InvoiceStatus>(invoice.status)
  const [notifiedAt, setNotifiedAt] = useState(invoice.notified_at)
  const [loading, setLoading] = useState(false)
  const [notifyPrompt, setNotifyPrompt] = useState(false)

  const subtotal = invoice.invoice_line_items.reduce(
    (sum, item) => sum + item.quantity * item.unit_price, 0
  )
  const total = subtotal + invoice.tax_amount

  async function markSent() {
    setLoading(true)
    await fetch(`/api/invoices/${invoice.id}`, {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ status: 'sent' }),
    })
    setStatus('sent')
    setLoading(false)
    setNotifyPrompt(true)
  }

  async function markPaid() {
    setLoading(true)
    await fetch(`/api/invoices/${invoice.id}`, {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ status: 'paid' }),
    })
    setStatus('paid')
    setLoading(false)
  }

  async function sendNotification() {
    setLoading(true)
    const res = await fetch(`/api/invoices/${invoice.id}/notify`, { method: 'POST' })
    if (res.ok) {
      const now = new Date().toISOString()
      setNotifiedAt(now)
    }
    setNotifyPrompt(false)
    setLoading(false)
  }

  function statusBadge() {
    if (status === 'draft') return <Badge variant="default">Draft</Badge>
    if (status === 'sent') return <Badge variant="warning">Payment Due</Badge>
    return <Badge variant="success">Paid</Badge>
  }

  return (
    <div className="max-w-2xl space-y-4">
      {notifyPrompt && invoice.customers?.email && (
        <Card className="border-[#68BD45] bg-green-50">
          <p className="text-sm text-gray-700 mb-3">
            Send <strong>{invoice.customers.name}</strong> an email notification about this invoice?
          </p>
          <div className="flex gap-2">
            <Button onClick={sendNotification} disabled={loading}>
              <Bell className="w-4 h-4 mr-1" /> Send Email
            </Button>
            <Button variant="secondary" onClick={() => setNotifyPrompt(false)}>Skip</Button>
          </div>
        </Card>
      )}

      <Card>
        <div className="flex items-start justify-between mb-4">
          <div>
            <div className="flex items-center gap-2 mb-1">
              <span className="font-mono text-sm text-gray-400">#{invoice.invoice_number}</span>
              {statusBadge()}
            </div>
            <h2 className="text-xl font-semibold text-gray-900">{invoice.title}</h2>
            <p className="text-sm text-gray-500">
              {invoice.customers?.name}
              {invoice.projects ? ` · ${invoice.projects.name}` : ''}
            </p>
          </div>
          <div className="text-right">
            <p className="text-2xl font-bold text-gray-900">{formatCurrency(total)}</p>
            {invoice.due_date && (
              <p className="text-xs text-gray-500">Due {formatDate(invoice.due_date)}</p>
            )}
          </div>
        </div>

        <div className="text-sm text-gray-500 mb-4">
          Issued {formatDate(invoice.issued_date)}
          {notifiedAt && (
            <span className="ml-3 text-[#68BD45]">
              · Notified {new Date(notifiedAt).toLocaleDateString()}
            </span>
          )}
        </div>

        {invoice.notes && (
          <p className="text-sm text-gray-600 bg-gray-50 rounded-lg p-3 mb-4">{invoice.notes}</p>
        )}

        <div className="space-y-2 border-t border-gray-100 pt-4">
          {invoice.invoice_line_items.map(item => (
            <div key={item.id} className="flex justify-between text-sm">
              <span className="text-gray-700">
                {item.description}
                {item.quantity !== 1 && <span className="text-gray-400"> × {item.quantity}</span>}
              </span>
              <span className="text-gray-900 font-medium">
                {formatCurrency(item.quantity * item.unit_price)}
              </span>
            </div>
          ))}
          <div className="pt-2 border-t border-gray-100 space-y-1">
            <div className="flex justify-between text-sm text-gray-500">
              <span>Subtotal</span><span>{formatCurrency(subtotal)}</span>
            </div>
            {invoice.tax_amount > 0 && (
              <div className="flex justify-between text-sm text-gray-500">
                <span>Tax</span><span>{formatCurrency(invoice.tax_amount)}</span>
              </div>
            )}
            <div className="flex justify-between font-semibold text-gray-900 text-base">
              <span>Total</span><span>{formatCurrency(total)}</span>
            </div>
          </div>
        </div>
      </Card>

      <div className="flex gap-3">
        {status === 'draft' && (
          <Button onClick={markSent} disabled={loading}>
            <Send className="w-4 h-4 mr-2" /> Mark as Sent
          </Button>
        )}
        {status === 'sent' && (
          <Button onClick={markPaid} disabled={loading}>
            <CheckCircle className="w-4 h-4 mr-2" /> Mark as Paid
          </Button>
        )}
        <Button variant="secondary" asChild>
          <a
            href={`/api/portal/invoice/${invoice.id}/pdf?token=${invoice.customers?.portal_token}`}
            target="_blank"
            rel="noopener noreferrer"
          >
            Download PDF
          </a>
        </Button>
      </div>
    </div>
  )
}
```

- [ ] **Step 3: Verify invoice detail page loads**

Navigate to `/invoices/[id]` for the test invoice created in Task 7. Should show the invoice details and "Mark as Sent" button.

- [ ] **Step 4: Commit**

```bash
git add src/app/'(authenticated)'/invoices/'[id]'/
git commit -m "feat: add invoice detail page with mark-sent/paid actions"
```

---

## Task 9: Invoice Notification Email Route

**Files:**
- Create: `src/app/api/invoices/[id]/notify/route.ts`

- [ ] **Step 1: Create route**

```typescript
// src/app/api/invoices/[id]/notify/route.ts
import { NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import { sendInvoiceNotificationEmail } from '@/lib/resend'

export async function POST(
  _request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id } = await params
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const { data: profile } = await supabase.from('profiles').select('role').eq('id', user.id).single()
  if (profile?.role !== 'admin') return NextResponse.json({ error: 'Forbidden' }, { status: 403 })

  const { data: invoice } = await supabase
    .from('invoices')
    .select('*, invoice_line_items(*), customers(name, email, portal_token)')
    .eq('id', id)
    .single()

  if (!invoice) return NextResponse.json({ error: 'Not found' }, { status: 404 })
  if (invoice.status === 'draft') return NextResponse.json({ error: 'Cannot notify on draft invoice' }, { status: 400 })

  const customer = invoice.customers as { name: string; email: string | null; portal_token: string }
  if (!customer.email) return NextResponse.json({ error: 'Customer has no email' }, { status: 400 })

  const subtotal = (invoice.invoice_line_items as { quantity: number; unit_price: number }[])
    .reduce((sum, i) => sum + i.quantity * i.unit_price, 0)
  const total = subtotal + invoice.tax_amount

  await sendInvoiceNotificationEmail({
    to: customer.email,
    customerName: customer.name,
    portalToken: customer.portal_token,
    invoiceTitle: invoice.title,
    invoiceNumber: invoice.invoice_number,
    totalAmount: total,
    dueDate: invoice.due_date,
  })

  await supabase
    .from('invoices')
    .update({ notified_at: new Date().toISOString() })
    .eq('id', id)

  return NextResponse.json({ success: true })
}
```

- [ ] **Step 2: Test notification**

With a test invoice marked as "sent" and a customer with an email, click "Send Email" from the invoice detail page. Check Resend dashboard for delivery (or check inbox if email is real).

- [ ] **Step 3: Commit**

```bash
git add src/app/api/invoices/'[id]'/notify/
git commit -m "feat: add invoice notification email route"
```

---

## Task 10: Customer Portal Tab (Settings / Customer Page)

**Files:**
- Modify: `src/app/(authenticated)/settings/page.tsx`
- Modify: `src/app/(authenticated)/settings/client.tsx`
- Create: `src/app/api/customers/[id]/portal/route.ts`
- Create: `src/app/api/customers/[id]/share-portal/route.ts`

- [ ] **Step 1: Create portal toggle API route**

```typescript
// src/app/api/customers/[id]/portal/route.ts
import { NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'

export async function POST(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id } = await params
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const { data: profile } = await supabase.from('profiles').select('role').eq('id', user.id).single()
  if (profile?.role !== 'admin') return NextResponse.json({ error: 'Forbidden' }, { status: 403 })

  const { active } = await request.json()

  const { data: customer, error } = await supabase
    .from('customers')
    .update({ portal_active: active })
    .eq('id', id)
    .select('portal_token, portal_active')
    .single()

  if (error) return NextResponse.json({ error: error.message }, { status: 500 })
  return NextResponse.json({ customer })
}
```

- [ ] **Step 2: Create portal share email API route**

```typescript
// src/app/api/customers/[id]/share-portal/route.ts
import { NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import { sendPortalShareEmail } from '@/lib/resend'

export async function POST(
  _request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id } = await params
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const { data: profile } = await supabase.from('profiles').select('role').eq('id', user.id).single()
  if (profile?.role !== 'admin') return NextResponse.json({ error: 'Forbidden' }, { status: 403 })

  const { data: customer } = await supabase
    .from('customers')
    .select('name, email, portal_token, portal_active')
    .eq('id', id)
    .single()

  if (!customer) return NextResponse.json({ error: 'Not found' }, { status: 404 })
  if (!customer.email) return NextResponse.json({ error: 'Customer has no email on file' }, { status: 400 })
  if (!customer.portal_active) return NextResponse.json({ error: 'Portal is not active for this customer' }, { status: 400 })

  await sendPortalShareEmail({
    to: customer.email,
    customerName: customer.name,
    portalToken: customer.portal_token,
  })

  return NextResponse.json({ success: true })
}
```

- [ ] **Step 3: Add customers fetch to settings page**

In `src/app/(authenticated)/settings/page.tsx`, add to the data fetches:

```typescript
// Add to the existing supabase calls in settings page
const [{ data: users }, { data: notificationPrefs }, { data: customers }, { data: presets }] = await Promise.all([
  supabase.from('profiles').select('*').order('created_at', { ascending: true }),
  supabase.from('notification_preferences').select('*').eq('user_id', user.id).single(),
  supabase.from('customers').select('id, name, email, phone, portal_token, portal_active').order('name'),
  supabase.from('line_item_presets').select('*').order('sort_order'),
])
```

Update the return JSX to pass new props to `SettingsClient`:
```typescript
<SettingsClient
  users={users ?? []}
  notificationPreferences={(notificationPrefs as NotificationPreference) ?? null}
  userId={user.id}
  customers={customers ?? []}
  presets={presets ?? []}
/>
```

- [ ] **Step 4: Add Customer Portals and Line Item Presets sections to settings client**

At the bottom of `src/app/(authenticated)/settings/client.tsx`, update the props interface and add two new sections:

```typescript
// Update interface
interface SettingsClientProps {
  users: Profile[]
  notificationPreferences: NotificationPreference | null
  userId: string
  customers: { id: string; name: string; email: string | null; phone: string | null; portal_token: string; portal_active: boolean }[]
  presets: LineItemPreset[]
}
```

Add these sections inside the return JSX (after the Team section):

```typescript
{/* Customer Portals section */}
<div>
  <h2 className="font-semibold text-gray-900 mb-3">Client Portals</h2>
  <div className="space-y-2">
    {customers.map(customer => (
      <CustomerPortalRow
        key={customer.id}
        customer={customer}
        onToggle={async (id, active) => {
          await fetch(`/api/customers/${id}/portal`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ active }),
          })
          router.refresh()
        }}
        onSendEmail={async (id) => {
          const res = await fetch(`/api/customers/${id}/share-portal`, { method: 'POST' })
          if (!res.ok) {
            const d = await res.json()
            alert(d.error ?? 'Failed to send')
          } else {
            alert('Portal link sent!')
          }
        }}
      />
    ))}
    {customers.length === 0 && (
      <p className="text-sm text-gray-500">No customers yet. Add customers when creating projects.</p>
    )}
  </div>
</div>

{/* Line Item Presets section */}
<LineItemPresetsSection presets={presets} onRefresh={() => router.refresh()} />
```

- [ ] **Step 5: Create CustomerPortalRow sub-component (add to settings/client.tsx)**

```typescript
function CustomerPortalRow({
  customer,
  onToggle,
  onSendEmail,
}: {
  customer: { id: string; name: string; email: string | null; phone: string | null; portal_token: string; portal_active: boolean }
  onToggle: (id: string, active: boolean) => Promise<void>
  onSendEmail: (id: string) => Promise<void>
}) {
  const [active, setActive] = useState(customer.portal_active)
  const [copying, setCopying] = useState(false)
  const [toggling, setToggling] = useState(false)

  const baseUrl = typeof window !== 'undefined' ? window.location.origin : 'https://blue-shores-pm.vercel.app'
  const portalUrl = `${baseUrl}/portal/${customer.portal_token}`

  async function handleToggle() {
    setToggling(true)
    await onToggle(customer.id, !active)
    setActive(prev => !prev)
    setToggling(false)
  }

  async function copyLink() {
    await navigator.clipboard.writeText(portalUrl)
    setCopying(true)
    setTimeout(() => setCopying(false), 2000)
  }

  const smsBody = encodeURIComponent(`Hi ${customer.name}, here's your Blue Shores Electric project portal: ${portalUrl}`)
  const smsHref = customer.phone
    ? `sms:${customer.phone.replace(/\D/g, '')}?&body=${smsBody}`
    : null

  return (
    <Card>
      <div className="flex items-start justify-between gap-4">
        <div>
          <p className="font-medium text-gray-900">{customer.name}</p>
          <p className="text-sm text-gray-500">{customer.email ?? 'No email'}</p>
        </div>
        <button
          onClick={handleToggle}
          disabled={toggling}
          className={`relative inline-flex h-6 w-11 shrink-0 items-center rounded-full transition-colors ${
            active ? 'bg-[#68BD45]' : 'bg-gray-300'
          }`}
          role="switch"
          aria-checked={active}
          aria-label={`Portal ${active ? 'active' : 'inactive'} for ${customer.name}`}
        >
          <span className={`inline-block h-4 w-4 transform rounded-full bg-white transition-transform ${active ? 'translate-x-6' : 'translate-x-1'}`} />
        </button>
      </div>
      {active && (
        <div className="mt-3 flex flex-wrap gap-2">
          <button
            onClick={copyLink}
            className="text-xs px-3 py-1.5 rounded-full border border-gray-300 text-gray-600 hover:bg-gray-50"
          >
            {copying ? 'Copied!' : 'Copy Link'}
          </button>
          {customer.email && (
            <button
              onClick={() => onSendEmail(customer.id)}
              className="text-xs px-3 py-1.5 rounded-full border border-[#68BD45] text-[#68BD45] hover:bg-green-50"
            >
              Send Email
            </button>
          )}
          {smsHref && (
            <a
              href={smsHref}
              className="text-xs px-3 py-1.5 rounded-full border border-gray-300 text-gray-600 hover:bg-gray-50"
            >
              Share via Text
            </a>
          )}
        </div>
      )}
    </Card>
  )
}
```

- [ ] **Step 6: Create LineItemPresetsSection sub-component (add to settings/client.tsx)**

```typescript
function LineItemPresetsSection({
  presets: initialPresets,
  onRefresh,
}: {
  presets: LineItemPreset[]
  onRefresh: () => void
}) {
  const supabase = useSupabase()
  const [presets, setPresets] = useState(initialPresets)
  const [newName, setNewName] = useState('')
  const [newPrice, setNewPrice] = useState('')
  const [saving, setSaving] = useState(false)

  async function addPreset() {
    if (!newName.trim()) return
    setSaving(true)
    const { data: profile } = await supabase.from('profiles').select('id').single()
    await supabase.from('line_item_presets').insert({
      name: newName.trim(),
      default_unit_price: newPrice ? parseFloat(newPrice) : null,
      sort_order: presets.length,
      created_by: profile!.id,
    })
    setNewName('')
    setNewPrice('')
    setSaving(false)
    onRefresh()
  }

  async function deletePreset(id: string) {
    await supabase.from('line_item_presets').delete().eq('id', id)
    onRefresh()
  }

  return (
    <div>
      <h2 className="font-semibold text-gray-900 mb-3">Invoice Line Item Presets</h2>
      <div className="space-y-2 mb-3">
        {presets.map(preset => (
          <Card key={preset.id}>
            <div className="flex items-center justify-between">
              <div>
                <p className="font-medium text-gray-900 text-sm">{preset.name}</p>
                {preset.default_unit_price && (
                  <p className="text-xs text-gray-500">
                    Default: {new Intl.NumberFormat('en-US', { style: 'currency', currency: 'USD' }).format(preset.default_unit_price)}
                  </p>
                )}
              </div>
              <button
                onClick={() => deletePreset(preset.id)}
                className="text-red-400 hover:text-red-600 text-xs"
              >
                Remove
              </button>
            </div>
          </Card>
        ))}
      </div>
      <div className="flex gap-2">
        <Input
          value={newName}
          onChange={e => setNewName(e.target.value)}
          placeholder="Preset name (e.g. Labor)"
          className="flex-1"
        />
        <Input
          type="number"
          value={newPrice}
          onChange={e => setNewPrice(e.target.value)}
          placeholder="Default price"
          className="w-32"
          min="0"
          step="0.01"
        />
        <Button onClick={addPreset} disabled={saving || !newName.trim()}>Add</Button>
      </div>
    </div>
  )
}
```

Also add the import for `LineItemPreset` at the top of `settings/client.tsx`:
```typescript
import type { Profile, UserStatus, NotificationPreference, LineItemPreset } from '@/lib/types/database'
```

And add `useState` to the imports if not already imported.

- [ ] **Step 7: Verify settings page**

Navigate to http://localhost:3000/settings. Client Portals section should list customers with toggle switches. Line Item Presets section should show defaults and allow adding new ones.

- [ ] **Step 8: Commit**

```bash
git add src/app/'(authenticated)'/settings/ src/app/api/customers/
git commit -m "feat: add client portal controls and line item presets to settings"
```

---

## Task 11: Project Page Invoices Section

**Files:**
- Modify: `src/app/(authenticated)/projects/[id]/page.tsx`
- Modify: `src/app/(authenticated)/projects/[id]/client.tsx`

- [ ] **Step 1: Add invoices fetch to project page**

In `src/app/(authenticated)/projects/[id]/page.tsx`, add `invoicesResult` to the `Promise.all` block:

```typescript
const [notesResult, photosResult, timeResult, plansResult, expensesResult, inspectionsResult, invoicesResult] = await Promise.all([
  // ... existing fetches unchanged ...
  supabase
    .from('invoices')
    .select('id, invoice_number, title, status, tax_amount, due_date, invoice_line_items(quantity, unit_price)')
    .eq('project_id', id)
    .order('created_at', { ascending: false }),
])
```

Pass invoices to the client component (add to the `ProjectDetailClient` props):

```typescript
<ProjectDetailClient
  // ... existing props ...
  invoices={isAdmin ? (invoicesResult.data ?? []) : []}
  isAdmin={isAdmin}
/>
```

- [ ] **Step 2: Add invoices to project detail client**

In `src/app/(authenticated)/projects/[id]/client.tsx`, update the props interface to include invoices:

```typescript
interface InvoiceSummary {
  id: string
  invoice_number: number
  title: string
  status: 'draft' | 'sent' | 'paid'
  tax_amount: number
  due_date: string | null
  invoice_line_items: { quantity: number; unit_price: number }[]
}

// Add to ProjectDetailClientProps:
invoices?: InvoiceSummary[]
```

Add an Invoices section in the JSX (after the Customer section, admin only):

```typescript
{isAdmin && invoices && invoices.length > 0 && (
  <div>
    <h3 className="font-semibold text-gray-900 mb-2">Invoices</h3>
    <div className="space-y-2">
      {invoices.map(inv => {
        const subtotal = inv.invoice_line_items.reduce((s, i) => s + i.quantity * i.unit_price, 0)
        const total = subtotal + inv.tax_amount
        return (
          <a key={inv.id} href={`/invoices/${inv.id}`} className="block">
            <div className="flex items-center justify-between bg-gray-50 rounded-lg px-3 py-2 hover:bg-gray-100 transition-colors">
              <div>
                <span className="text-xs text-gray-400 font-mono mr-2">#{inv.invoice_number}</span>
                <span className="text-sm text-gray-700">{inv.title}</span>
              </div>
              <div className="flex items-center gap-2">
                <span className="text-sm font-medium text-gray-900">
                  {new Intl.NumberFormat('en-US', { style: 'currency', currency: 'USD' }).format(total)}
                </span>
                <span className={`text-xs px-2 py-0.5 rounded-full font-medium ${
                  inv.status === 'paid' ? 'bg-green-100 text-green-700' :
                  inv.status === 'sent' ? 'bg-yellow-100 text-yellow-700' :
                  'bg-gray-100 text-gray-500'
                }`}>
                  {inv.status === 'paid' ? 'Paid' : inv.status === 'sent' ? 'Payment Due' : 'Draft'}
                </span>
              </div>
            </div>
          </a>
        )
      })}
    </div>
  </div>
)}
```

- [ ] **Step 3: Verify project page shows invoices**

Create an invoice linked to a project, then navigate to that project's page. The Invoices section should appear with the invoice listed.

- [ ] **Step 4: Commit**

```bash
git add src/app/'(authenticated)'/projects/'[id]'/
git commit -m "feat: add invoices section to project detail page"
```

---

## Task 12: Public Portal Route

**Files:**
- Create: `src/app/api/portal/[token]/route.ts`
- Create: `src/app/portal/[token]/page.tsx`
- Create: `src/app/portal/[token]/client.tsx`

- [ ] **Step 1: Create portal data API route (public, no auth)**

```typescript
// src/app/api/portal/[token]/route.ts
import { NextResponse } from 'next/server'
import { createServiceClient } from '@/lib/supabase/service'

export async function GET(
  _request: Request,
  { params }: { params: Promise<{ token: string }> }
) {
  const { token } = await params
  const supabase = createServiceClient()

  const { data: customer } = await supabase
    .from('customers')
    .select('id, name, portal_active')
    .eq('portal_token', token)
    .single()

  if (!customer || !customer.portal_active) {
    return NextResponse.json({ error: 'Portal not found' }, { status: 404 })
  }

  const [{ data: projects }, { data: invoices }] = await Promise.all([
    supabase
      .from('projects')
      .select('id, name, address, status, phases(name, status, sort_order)')
      .eq('customer_id', customer.id)
      .order('created_at', { ascending: false }),
    supabase
      .from('invoices')
      .select('id, invoice_number, title, status, tax_amount, issued_date, due_date, invoice_line_items(description, quantity, unit_price, sort_order)')
      .eq('customer_id', customer.id)
      .in('status', ['sent', 'paid'])
      .order('created_at', { ascending: false }),
  ])

  return NextResponse.json({ customer: { name: customer.name }, projects: projects ?? [], invoices: invoices ?? [] })
}
```

- [ ] **Step 2: Create Supabase service client helper**

```typescript
// src/lib/supabase/service.ts
import { createClient } from '@supabase/supabase-js'

export function createServiceClient() {
  return createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!,
    { auth: { persistSession: false } }
  )
}
```

Add `SUPABASE_SERVICE_ROLE_KEY` to `.env.local` (get from Supabase dashboard → Project Settings → API → service_role key) and to Vercel:
```bash
vercel env add SUPABASE_SERVICE_ROLE_KEY
```

- [ ] **Step 3: Create public portal page (server component)**

```typescript
// src/app/portal/[token]/page.tsx
export const dynamic = 'force-dynamic'

import { notFound } from 'next/navigation'
import { createServiceClient } from '@/lib/supabase/service'
import { PortalClient } from './client'

export default async function PortalPage({
  params,
}: {
  params: Promise<{ token: string }>
}) {
  const { token } = await params
  const supabase = createServiceClient()

  const { data: customer } = await supabase
    .from('customers')
    .select('id, name, portal_active')
    .eq('portal_token', token)
    .single()

  if (!customer || !customer.portal_active) notFound()

  const [{ data: projects }, { data: invoices }] = await Promise.all([
    supabase
      .from('projects')
      .select('id, name, address, status, phases(name, status, sort_order)')
      .eq('customer_id', customer.id)
      .order('created_at', { ascending: false }),
    supabase
      .from('invoices')
      .select('id, invoice_number, title, status, tax_amount, issued_date, due_date, invoice_line_items(description, quantity, unit_price, sort_order)')
      .eq('customer_id', customer.id)
      .in('status', ['sent', 'paid'])
      .order('created_at', { ascending: false }),
  ])

  return (
    <PortalClient
      customerName={customer.name}
      portalToken={token}
      projects={projects ?? []}
      invoices={invoices ?? []}
    />
  )
}
```

- [ ] **Step 4: Create portal client component**

```typescript
// src/app/portal/[token]/client.tsx
'use client'

import { useState } from 'react'
import { ChevronDown, ChevronUp } from 'lucide-react'

type PhaseStatus = 'not_started' | 'in_progress' | 'complete'
type ProjectStatus = 'active' | 'completed' | 'archived'
type InvoiceStatus = 'sent' | 'paid'

interface PortalProject {
  id: string
  name: string
  address: string | null
  status: ProjectStatus
  phases: { name: string; status: PhaseStatus; sort_order: number }[]
}

interface PortalInvoice {
  id: string
  invoice_number: number
  title: string
  status: InvoiceStatus
  tax_amount: number
  issued_date: string
  due_date: string | null
  invoice_line_items: { description: string; quantity: number; unit_price: number; sort_order: number }[]
}

interface PortalClientProps {
  customerName: string
  portalToken: string
  projects: PortalProject[]
  invoices: PortalInvoice[]
}

function formatCurrency(n: number) {
  return new Intl.NumberFormat('en-US', { style: 'currency', currency: 'USD' }).format(n)
}

function formatDate(d: string) {
  return new Date(d + 'T00:00:00').toLocaleDateString('en-US', { month: 'long', day: 'numeric', year: 'numeric' })
}

function getCurrentPhase(phases: PortalProject['phases']) {
  const sorted = [...phases].sort((a, b) => a.sort_order - b.sort_order)
  return sorted.find(p => p.status === 'in_progress') ?? sorted.find(p => p.status === 'not_started') ?? sorted[sorted.length - 1]
}

export function PortalClient({ customerName, portalToken, projects, invoices }: PortalClientProps) {
  const [showCompleted, setShowCompleted] = useState(false)

  const activeProjects = projects.filter(p => p.status === 'active')
  const completedProjects = projects.filter(p => p.status === 'completed' || p.status === 'archived')

  return (
    <div className="min-h-screen bg-gray-50">
      {/* Header */}
      <header className="bg-[#32373C] text-white px-4 py-4">
        <div className="max-w-xl mx-auto flex items-center justify-between">
          <img src="/brand/logo-horizontal.svg" alt="Blue Shores Electric" className="h-8" />
          <a href="tel:9104000000" className="text-sm text-[#68BD45] font-medium">(910) 400-0000</a>
        </div>
      </header>

      <main className="max-w-xl mx-auto px-4 py-6 space-y-8">
        <p className="text-gray-500 text-sm">Hi <strong className="text-gray-900">{customerName}</strong> — here's your project status and invoices.</p>

        {/* Active Projects */}
        <section>
          <h2 className="font-semibold text-gray-900 mb-3">Active Projects</h2>
          {activeProjects.length === 0 ? (
            <p className="text-sm text-gray-500">No active projects at this time.</p>
          ) : (
            <div className="space-y-3">
              {activeProjects.map(project => {
                const currentPhase = getCurrentPhase(project.phases)
                return (
                  <div key={project.id} className="bg-white rounded-xl border border-gray-200 p-4">
                    <div className="flex items-start justify-between gap-2">
                      <div>
                        <p className="font-semibold text-gray-900">{project.name}</p>
                        {project.address && <p className="text-sm text-gray-500 mt-0.5">{project.address}</p>}
                        {currentPhase && (
                          <p className="text-sm text-gray-600 mt-1">
                            Current phase: <span className="font-medium">{currentPhase.name}</span>
                          </p>
                        )}
                      </div>
                      <span className="shrink-0 text-xs font-medium px-2.5 py-1 rounded-full bg-green-100 text-green-700">
                        In Progress
                      </span>
                    </div>
                  </div>
                )
              })}
            </div>
          )}
        </section>

        {/* Completed Projects */}
        {completedProjects.length > 0 && (
          <section>
            <button
              onClick={() => setShowCompleted(prev => !prev)}
              className="flex items-center gap-1 text-sm text-gray-500 font-medium hover:text-gray-700"
            >
              {showCompleted ? <ChevronUp className="w-4 h-4" /> : <ChevronDown className="w-4 h-4" />}
              {showCompleted ? 'Hide' : 'Show'} completed projects ({completedProjects.length})
            </button>
            {showCompleted && (
              <div className="space-y-3 mt-3">
                {completedProjects.map(project => (
                  <div key={project.id} className="bg-white rounded-xl border border-gray-200 p-4">
                    <div className="flex items-start justify-between gap-2">
                      <div>
                        <p className="font-semibold text-gray-900">{project.name}</p>
                        {project.address && <p className="text-sm text-gray-500 mt-0.5">{project.address}</p>}
                      </div>
                      <span className="shrink-0 text-xs font-medium px-2.5 py-1 rounded-full bg-gray-100 text-gray-500">
                        Completed
                      </span>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </section>
        )}

        {/* Invoices */}
        <section>
          <h2 className="font-semibold text-gray-900 mb-3">Invoices</h2>
          {invoices.length === 0 ? (
            <p className="text-sm text-gray-500">No invoices yet.</p>
          ) : (
            <div className="space-y-4">
              {invoices.map(invoice => {
                const sortedItems = [...invoice.invoice_line_items].sort((a, b) => a.sort_order - b.sort_order)
                const subtotal = sortedItems.reduce((s, i) => s + i.quantity * i.unit_price, 0)
                const total = subtotal + invoice.tax_amount
                const isPaid = invoice.status === 'paid'

                return (
                  <div key={invoice.id} className="bg-white rounded-xl border border-gray-200 p-4">
                    <div className="flex items-start justify-between gap-2 mb-3">
                      <div>
                        <p className="text-xs text-gray-400 font-mono mb-0.5">Invoice #{invoice.invoice_number}</p>
                        <p className="font-semibold text-gray-900">{invoice.title}</p>
                        <p className="text-xs text-gray-500 mt-0.5">Issued {formatDate(invoice.issued_date)}</p>
                        {invoice.due_date && !isPaid && (
                          <p className="text-xs text-gray-500">Due {formatDate(invoice.due_date)}</p>
                        )}
                      </div>
                      <span className={`shrink-0 text-xs font-medium px-2.5 py-1 rounded-full ${
                        isPaid ? 'bg-green-100 text-green-700' : 'bg-yellow-100 text-yellow-700'
                      }`}>
                        {isPaid ? 'Paid' : 'Payment Due'}
                      </span>
                    </div>

                    <div className="space-y-1 border-t border-gray-100 pt-3">
                      {sortedItems.map((item, idx) => (
                        <div key={idx} className="flex justify-between text-sm">
                          <span className="text-gray-600">
                            {item.description}
                            {item.quantity !== 1 && <span className="text-gray-400"> × {item.quantity}</span>}
                          </span>
                          <span className="text-gray-900">{formatCurrency(item.quantity * item.unit_price)}</span>
                        </div>
                      ))}
                      {invoice.tax_amount > 0 && (
                        <div className="flex justify-between text-sm text-gray-500">
                          <span>Tax</span><span>{formatCurrency(invoice.tax_amount)}</span>
                        </div>
                      )}
                      <div className="flex justify-between font-semibold text-gray-900 pt-1 border-t border-gray-100">
                        <span>Total</span><span>{formatCurrency(total)}</span>
                      </div>
                    </div>

                    <a
                      href={`/api/portal/invoice/${invoice.id}/pdf?token=${portalToken}`}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="mt-3 inline-block text-sm text-[#68BD45] hover:text-green-700 font-medium"
                    >
                      Download PDF →
                    </a>
                  </div>
                )
              })}
            </div>
          )}
        </section>
      </main>

      <footer className="text-center py-8">
        <a href="https://bluewavecreativedesign.com" target="_blank" rel="noopener noreferrer" className="text-xs text-gray-400 hover:text-gray-500">
          Powered by Blue Wave Creative Design
        </a>
      </footer>
    </div>
  )
}
```

- [ ] **Step 5: Verify portal page loads**

Activate a customer's portal in Settings, then navigate to `http://localhost:3000/portal/[their-token]`. Should show the branded portal with project cards and any sent/paid invoices.

- [ ] **Step 6: Verify inactive portal returns 404**

Toggle the portal off for the customer, reload the portal URL. Should show Next.js 404 page (or a custom not-found page if one exists).

- [ ] **Step 7: Commit**

```bash
git add src/app/portal/ src/app/api/portal/ src/lib/supabase/service.ts
git commit -m "feat: add public client portal page with project status and invoices"
```

---

## Task 13: PDF Invoice Generation

**Files:**
- Create: `src/lib/pdf.tsx`
- Create: `src/app/api/portal/invoice/[invoiceId]/pdf/route.ts`

- [ ] **Step 1: Create react-pdf invoice template**

```typescript
// src/lib/pdf.tsx
import { Document, Page, Text, View, StyleSheet, Image } from '@react-pdf/renderer'

const styles = StyleSheet.create({
  page: { padding: 40, fontFamily: 'Helvetica', color: '#32373C', backgroundColor: '#ffffff' },
  header: { flexDirection: 'row', justifyContent: 'space-between', marginBottom: 32 },
  logo: { width: 140, height: 28 },
  headerRight: { textAlign: 'right' },
  invoiceTitle: { fontSize: 22, fontFamily: 'Helvetica-Bold', color: '#32373C', marginBottom: 4 },
  invoiceNumber: { fontSize: 11, color: '#888', fontFamily: 'Helvetica' },
  section: { marginBottom: 20 },
  label: { fontSize: 9, color: '#888', textTransform: 'uppercase', letterSpacing: 0.5, marginBottom: 4 },
  value: { fontSize: 12, color: '#32373C' },
  divider: { borderTop: '1px solid #eee', marginVertical: 16 },
  tableHeader: { flexDirection: 'row', backgroundColor: '#f9f9f9', padding: '8 12', marginBottom: 4 },
  tableHeaderText: { fontSize: 9, color: '#888', textTransform: 'uppercase', letterSpacing: 0.5 },
  tableRow: { flexDirection: 'row', padding: '6 12', borderBottom: '1px solid #f0f0f0' },
  tableCell: { fontSize: 11 },
  colDescription: { flex: 3 },
  colQty: { flex: 1, textAlign: 'right' },
  colPrice: { flex: 1, textAlign: 'right' },
  colTotal: { flex: 1, textAlign: 'right' },
  totalsRow: { flexDirection: 'row', justifyContent: 'flex-end', paddingTop: 4 },
  totalsLabel: { fontSize: 11, color: '#666', width: 120, textAlign: 'right', paddingRight: 12 },
  totalsValue: { fontSize: 11, width: 80, textAlign: 'right' },
  grandTotalLabel: { fontSize: 13, fontFamily: 'Helvetica-Bold', width: 120, textAlign: 'right', paddingRight: 12 },
  grandTotalValue: { fontSize: 13, fontFamily: 'Helvetica-Bold', color: '#68BD45', width: 80, textAlign: 'right' },
  statusBadge: { fontSize: 10, fontFamily: 'Helvetica-Bold', paddingVertical: 4, paddingHorizontal: 10, borderRadius: 4 },
  statusPaid: { backgroundColor: '#dcfce7', color: '#16a34a' },
  statusDue: { backgroundColor: '#fef9c3', color: '#a16207' },
  footer: { position: 'absolute', bottom: 32, left: 40, right: 40, textAlign: 'center', fontSize: 9, color: '#aaa' },
  notes: { fontSize: 10, color: '#555', backgroundColor: '#f9f9f9', padding: 10, borderRadius: 4, marginTop: 8 },
})

function formatCurrency(n: number) {
  return new Intl.NumberFormat('en-US', { style: 'currency', currency: 'USD' }).format(n)
}

function formatDate(d: string) {
  return new Date(d + 'T00:00:00').toLocaleDateString('en-US', { month: 'long', day: 'numeric', year: 'numeric' })
}

interface InvoicePDFProps {
  invoiceNumber: number
  title: string
  status: 'sent' | 'paid'
  issuedDate: string
  dueDate: string | null
  customerName: string
  projectName: string | null
  notes: string | null
  taxAmount: number
  lineItems: { description: string; quantity: number; unit_price: number }[]
  baseUrl: string
}

export function InvoicePDF({
  invoiceNumber, title, status, issuedDate, dueDate, customerName, projectName,
  notes, taxAmount, lineItems, baseUrl,
}: InvoicePDFProps) {
  const subtotal = lineItems.reduce((s, i) => s + i.quantity * i.unit_price, 0)
  const total = subtotal + taxAmount

  return (
    <Document>
      <Page size="LETTER" style={styles.page}>
        {/* Header */}
        <View style={styles.header}>
          <Image src={`${baseUrl}/brand/logo-horizontal.png`} style={styles.logo} />
          <View style={styles.headerRight}>
            <Text style={styles.invoiceTitle}>Invoice</Text>
            <Text style={styles.invoiceNumber}>#{invoiceNumber}</Text>
          </View>
        </View>

        {/* Meta */}
        <View style={{ flexDirection: 'row', marginBottom: 24, gap: 24 }}>
          <View style={styles.section}>
            <Text style={styles.label}>Bill To</Text>
            <Text style={styles.value}>{customerName}</Text>
            {projectName && <Text style={{ fontSize: 10, color: '#888' }}>{projectName}</Text>}
          </View>
          <View style={styles.section}>
            <Text style={styles.label}>Issued</Text>
            <Text style={styles.value}>{formatDate(issuedDate)}</Text>
          </View>
          {dueDate && (
            <View style={styles.section}>
              <Text style={styles.label}>Due</Text>
              <Text style={styles.value}>{formatDate(dueDate)}</Text>
            </View>
          )}
          <View style={styles.section}>
            <Text style={styles.label}>Status</Text>
            <Text style={[styles.statusBadge, status === 'paid' ? styles.statusPaid : styles.statusDue]}>
              {status === 'paid' ? 'Paid' : 'Payment Due'}
            </Text>
          </View>
        </View>

        <Text style={{ fontSize: 12, fontFamily: 'Helvetica-Bold', marginBottom: 8 }}>{title}</Text>

        {/* Line items table */}
        <View style={styles.tableHeader}>
          <Text style={[styles.tableHeaderText, styles.colDescription]}>Description</Text>
          <Text style={[styles.tableHeaderText, styles.colQty]}>Qty</Text>
          <Text style={[styles.tableHeaderText, styles.colPrice]}>Price</Text>
          <Text style={[styles.tableHeaderText, styles.colTotal]}>Total</Text>
        </View>

        {lineItems.map((item, idx) => (
          <View key={idx} style={styles.tableRow}>
            <Text style={[styles.tableCell, styles.colDescription]}>{item.description}</Text>
            <Text style={[styles.tableCell, styles.colQty]}>{item.quantity}</Text>
            <Text style={[styles.tableCell, styles.colPrice]}>{formatCurrency(item.unit_price)}</Text>
            <Text style={[styles.tableCell, styles.colTotal]}>{formatCurrency(item.quantity * item.unit_price)}</Text>
          </View>
        ))}

        {/* Totals */}
        <View style={styles.divider} />
        <View style={styles.totalsRow}>
          <Text style={styles.totalsLabel}>Subtotal</Text>
          <Text style={styles.totalsValue}>{formatCurrency(subtotal)}</Text>
        </View>
        {taxAmount > 0 && (
          <View style={styles.totalsRow}>
            <Text style={styles.totalsLabel}>Tax</Text>
            <Text style={styles.totalsValue}>{formatCurrency(taxAmount)}</Text>
          </View>
        )}
        <View style={[styles.totalsRow, { marginTop: 4 }]}>
          <Text style={styles.grandTotalLabel}>Total</Text>
          <Text style={styles.grandTotalValue}>{formatCurrency(total)}</Text>
        </View>

        {notes && (
          <View style={{ marginTop: 24 }}>
            <Text style={styles.label}>Notes</Text>
            <Text style={styles.notes}>{notes}</Text>
          </View>
        )}

        <Text style={styles.footer}>
          Blue Shores Electric · (910) 400-0000 · blueshoresnc.com
        </Text>
      </Page>
    </Document>
  )
}
```

**Note:** Replace `(910) 400-0000` with Joe's actual phone number.

**Note:** The Image component uses `/brand/logo-horizontal.png` — export a PNG version of the logo for PDF use (SVG isn't supported by react-pdf). Place at `public/brand/logo-horizontal.png`.

- [ ] **Step 2: Create PDF API route**

```typescript
// src/app/api/portal/invoice/[invoiceId]/pdf/route.ts
import { NextResponse } from 'next/server'
import { createServiceClient } from '@/lib/supabase/service'
import { renderToBuffer } from '@react-pdf/renderer'
import { InvoicePDF } from '@/lib/pdf'
import React from 'react'

export async function GET(
  request: Request,
  { params }: { params: Promise<{ invoiceId: string }> }
) {
  const { invoiceId } = await params
  const { searchParams } = new URL(request.url)
  const token = searchParams.get('token')

  if (!token) return NextResponse.json({ error: 'Missing token' }, { status: 400 })

  const supabase = createServiceClient()

  // Validate token → customer → invoice belongs to customer
  const { data: customer } = await supabase
    .from('customers')
    .select('id, name, portal_active')
    .eq('portal_token', token)
    .single()

  if (!customer || !customer.portal_active) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

  const { data: invoice } = await supabase
    .from('invoices')
    .select('*, invoice_line_items(description, quantity, unit_price, sort_order), projects(name)')
    .eq('id', invoiceId)
    .eq('customer_id', customer.id)
    .in('status', ['sent', 'paid'])
    .single()

  if (!invoice) return NextResponse.json({ error: 'Invoice not found' }, { status: 404 })

  const baseUrl = process.env.NEXT_PUBLIC_APP_URL ?? 'https://blue-shores-pm.vercel.app'
  const sortedItems = [...invoice.invoice_line_items].sort((a: { sort_order: number }, b: { sort_order: number }) => a.sort_order - b.sort_order)

  const buffer = await renderToBuffer(
    React.createElement(InvoicePDF, {
      invoiceNumber: invoice.invoice_number,
      title: invoice.title,
      status: invoice.status as 'sent' | 'paid',
      issuedDate: invoice.issued_date,
      dueDate: invoice.due_date,
      customerName: customer.name,
      projectName: invoice.projects?.name ?? null,
      notes: invoice.notes,
      taxAmount: invoice.tax_amount,
      lineItems: sortedItems,
      baseUrl,
    })
  )

  return new NextResponse(buffer, {
    headers: {
      'Content-Type': 'application/pdf',
      'Content-Disposition': `attachment; filename="invoice-${invoice.invoice_number}.pdf"`,
    },
  })
}
```

- [ ] **Step 3: Export PNG logo for PDF**

The react-pdf Image component cannot render SVG files. Convert the SVG logo to PNG:

```bash
# If you have ImageMagick installed:
cd /Users/kennysiddons/Documents/Projects/blue-shores-pm/public/brand
convert -background none logo-horizontal.svg -resize 280x56 logo-horizontal.png

# Or use any SVG→PNG tool and place at public/brand/logo-horizontal.png
# Minimum size: 280x56px, transparent background
```

- [ ] **Step 4: Test PDF download**

Navigate to a sent invoice in the portal (http://localhost:3000/portal/[token]) and click "Download PDF →". Should download a branded PDF.

Also test the route directly:
```
http://localhost:3000/api/portal/invoice/[invoiceId]/pdf?token=[token]
```

- [ ] **Step 5: Commit**

```bash
git add src/lib/pdf.tsx src/app/api/portal/invoice/ public/brand/logo-horizontal.png
git commit -m "feat: add PDF invoice generation via react-pdf"
```

---

## Task 14: Fix Invoices List Total Calculation

**Files:**
- Modify: `src/app/(authenticated)/invoices/page.tsx`
- Modify: `src/app/(authenticated)/invoices/client.tsx`

The list page currently shows `tax_amount` as the total placeholder. Now that the full pattern is established, fetch line items too and compute real totals.

- [ ] **Step 1: Update invoices list query to include line items**

In `src/app/(authenticated)/invoices/page.tsx`, update the select:

```typescript
const { data: invoices } = await supabase
  .from('invoices')
  .select('*, customers(name), projects(name), invoice_line_items(quantity, unit_price)')
  .order('created_at', { ascending: false })
```

- [ ] **Step 2: Update InvoicesClient to compute real totals**

In `src/app/(authenticated)/invoices/client.tsx`, update `InvoiceRow` type and the total display:

```typescript
type InvoiceRow = {
  id: string
  invoice_number: number
  title: string
  status: InvoiceStatus
  tax_amount: number
  issued_date: string
  due_date: string | null
  customers: { name: string } | null
  projects: { name: string } | null
  invoice_line_items: { quantity: number; unit_price: number }[]
}
```

Update the total display in the card:

```typescript
// Replace the formatCurrency(invoice.tax_amount) line with:
const subtotal = invoice.invoice_line_items.reduce((s, i) => s + i.quantity * i.unit_price, 0)
const total = subtotal + invoice.tax_amount
// then use formatCurrency(total) in the JSX
```

Since this is inside a `.map()`, compute it inline:

```typescript
{filtered.map(invoice => {
  const subtotal = invoice.invoice_line_items.reduce((s, i) => s + i.quantity * i.unit_price, 0)
  const total = subtotal + invoice.tax_amount
  return (
    <Link key={invoice.id} href={`/invoices/${invoice.id}`}>
      ...
      <p className="font-semibold text-gray-900">{formatCurrency(total)}</p>
      ...
    </Link>
  )
})}
```

- [ ] **Step 3: Verify totals are correct**

Check the invoices list — totals should match the invoice detail page.

- [ ] **Step 4: Commit**

```bash
git add src/app/'(authenticated)'/invoices/
git commit -m "fix: compute real invoice totals on list page"
```

---

## Task 15: Final Checks and Push

- [ ] **Step 1: Run TypeScript check**

```bash
cd /Users/kennysiddons/Documents/Projects/blue-shores-pm
npx tsc --noEmit
```

Expected: 0 errors.

- [ ] **Step 2: Run linter**

```bash
npm run lint
```

Fix any errors before continuing.

- [ ] **Step 3: End-to-end smoke test checklist**

Test each flow manually:

- [ ] Create a customer in Settings
- [ ] Create an invoice for that customer (draft)
- [ ] Invoice appears in `/invoices` list as Draft
- [ ] Open invoice detail, mark as Sent
- [ ] Email notification prompt appears — send it (check Resend dashboard)
- [ ] Open Settings → Client Portals → activate portal for customer
- [ ] Copy link, open in a new incognito window
- [ ] Portal loads with correct customer name
- [ ] Invoice appears as "Payment Due" in portal
- [ ] Download PDF from portal — verify branding and amounts
- [ ] Mark invoice as Paid in admin
- [ ] Reload portal — invoice shows as "Paid"
- [ ] Deactivate portal in Settings
- [ ] Reload portal URL — shows dead page (not-found)
- [ ] Create a project linked to the customer; verify project appears in portal
- [ ] Complete a project; verify it moves to "completed" section in portal

- [ ] **Step 4: Push branch**

```bash
git push origin feat/client-portal
```

- [ ] **Step 5: Create PR**

```bash
gh pr create --title "feat: client portal + invoicing" --body "$(cat <<'EOF'
## Summary
- Public `/portal/[token]` client portal showing project status and invoices
- Full invoice management for Joe: create, send, mark paid
- Invoice PDF download via react-pdf
- Email notifications via Resend (portal share + new invoice)
- Customer portal controls in Settings
- Line item presets management in Settings
- Invoices section on project detail page

## Test plan
- [ ] Create invoice → mark sent → send email notification
- [ ] Activate customer portal → share link via email/text/copy
- [ ] Load portal in incognito → verify project cards + invoices
- [ ] Download PDF → verify branding and correct amounts
- [ ] Mark invoice paid → verify portal updates
- [ ] Deactivate portal → verify link goes dead

🤖 Generated with [Claude Code](https://claude.com/claude-code)
EOF
)"
```

Wait for Kenny's review and explicit approval before merging.
