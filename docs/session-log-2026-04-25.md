# Session Log — 2026-04-25 (M3 build + M1 cleanup)

**Duration:** ~7h working session
**Outcome:** M3 (Materials Database & Quotes) functionally complete + M1 (Rebrand) fully closed
**PRs merged:** 6 (#47 through #52)
**Lines:** ~2,800 inserted, ~480 deleted across schema, API, UI, and tests

## tl;dr

Joe can now build a quote from his electrical materials catalog, set markup/tax/labor knobs, watch totals compute live, and convert the quote to an invoice with the PRD-mandated single summary line. The 59-row materials database from his prototype is seeded. CSV import/export is wired. The mobile experience is no longer admin-broken — there's a hamburger drawer that mirrors the desktop sidebar, the schedule no longer overflows, and the brand colors actually match Energi for the first time. Migration `010_materials_quotes.sql` was applied to Supabase mid-session; the data layer + builder were end-to-end verified on the Vercel preview.

What's left for V1: M2 Payments (blocked on Stripe account), M4 Jobber migration (blocked on Joe's CSV export), M5 Pre-launch polish (blocked on the rest), invoice PDF contact info (#6, blocked on Joe), email templates (#7, blocked on SMTP creds).

---

## PRs merged today, in order

### PR #47 — Schema + calc engine + seed data
**Closes Ops #27, #28, #29**
- `supabase/migrations/010_materials_quotes.sql` — `material_categories` (5 phases), `materials` master with 59 seed rows from `docs/joe-materials-prototype.tsx`, `quotes` header (markup/tax/labor/flat-fee knobs + draft/sent/accepted/declined/expired/converted lifecycle), `quote_line_items` with full snapshot fields. RLS policies, `updated_at` triggers.
- `src/lib/quotes/calc.ts` — pure `computeQuoteTotals()`. Labor exempt from markup; tax applied to materials + markup + labor + flat fee. Matches the prototype formula exactly.
- `src/lib/types/database.ts` — Material / MaterialCategory / Quote / QuoteLineItem types + joined shapes + QuoteTotals.
- `tests/lib/quotes-calc.test.ts` — 7 cases including empty quote, markup-on-materials-only, tax-on-everything, all toggles, Postgres NUMERIC string coercion.

### PR #48 — Materials admin page
**Closes Ops #30**
- `/materials` admin page with grouped-by-category list, global search, per-category Add, inline edit, soft-delete (active=false).
- Add/Edit/Delete Modals (replaces native `confirm()`/`alert()`; uses `router.refresh()` to preserve search state).
- `/api/materials` POST + `/api/materials/[id]` PATCH/DELETE; shared `requireAdmin()` helper extracted to `src/lib/api/admin.ts`.
- Soft-delete reactivation: re-adding a deleted material flips `active=true` instead of inserting a duplicate.
- Sidebar nav added (admin-only, `Package` icon).

### PR #49 — CSV import + export
**Closes Ops #36, #37**
- `src/lib/csv-parse.ts` — minimal RFC-4180-ish parser with 13 tests. Handles quoted fields with embedded commas/quotes/newlines, `\r\n`, BOM, trailing newlines. Throws on unescaped or unterminated quotes. Strips formula-injection `'` prefix on round-trip so export → import is stable.
- `/api/materials/import` — admin-only POST; payload-level dedupe on (lowercased name, category_id); Content-Length 2 MB cap; per-row insert/skip/reactivate with row-level error reporting.
- `ImportModal` — file picker (max 2 MB, 1000 rows) → CSV parse → preview table with per-row error rows (visible inline, not hover-only) → submit → result screen. ARIA live regions on submit/done. All-skipped result switches to neutral blue banner instead of misleading green.
- Materials toolbar gets Export (client-side download via `generateCSV`/`downloadCSV`) + Import buttons.
- Materials POST unified with import behavior: active duplicate → 409 with clear message; soft-deleted → reactivate.

### PR #50 — Quote builder
**Closes Ops #31, #32, #34, #35, #39 — defers #33 (auto-grow)**
- `/quotes` list with status tabs (All / Draft / Sent / Accepted / Converted) + grand total per row computed via `computeQuoteTotals`.
- `/quotes/new` minimal create form (customer, project, title, description, job_type) → creates a draft, redirects to builder.
- `/quotes/[id]` full builder:
  - Header summary card — customer, status, big grand total, customer-facing description preview.
  - Line items card — grouped by phase with per-phase subtotals, materials picker modal entry, inline quantity edit (save on blur, Enter-to-commit, AbortController-serialized server saves, response-reconciled), per-row delete.
  - Pricing knobs card — markup/tax/labor/flat-fee toggle+value pattern, "(not applied)" caption when toggled off.
  - Totals breakdown card — itemized materials/markup/labor/flat-fee/subtotal/tax/grand-total.
  - "Mark as sent" button → confirmation Modal (replaces native `confirm()`).
  - Read-only mode when status='converted', with yellow Lock banner explaining why.
- Material picker modal — search + categorized list of active materials → quantity step.
- API: POST `/api/quotes`, PATCH/DELETE `/api/quotes/[id]` (terminal-status guard, locked-fields-when-converted, idempotent `sent_at`, `Date.parse` validated `valid_until`), POST `/api/quotes/[id]/line-items` (server-side material snapshot from DB, refuses 409 on converted quotes), PATCH/DELETE `/api/quotes/[id]/line-items/[lineId]`.

### PR #51 — Quote → Invoice conversion
**Closes Ops #38**
- `POST /api/quotes/[id]/convert` — atomic single-flight via status-guarded UPDATE. Lock-first pattern eliminates the race where two concurrent POSTs would both produce invoices.
- Full PRD compliance on customer-facing format: invoice ships with a single line `Provided material and labor for [description || title]`. Materials never itemized to customer. `unit_price = round2(grandTotal − taxAmount)` so `unit_price + tax_amount === grandTotal` exactly (no penny drift from compound rounding).
- Rejects: empty quotes, all-quantity-zero quotes (`grandTotal <= 0`), quotes already converted (returns 409 with prior `invoice_id`), quotes with status not in {draft, sent, accepted}.
- Postgres FK violation `23503` (deleted customer/project) → 409 with clear message instead of generic 500.
- Partial-failure recovery: rollback on invoice insert / line-item insert failure; log critically on rollback failure.
- UI: "Convert to invoice" button next to "Mark as sent" (visible for status in {draft, sent, accepted}, hidden when readOnly). Confirmation Modal previews the customer summary line and grand total. Read-only banner on converted quotes gains "View invoice →" link.
- Client `confirmConvert()`: any response with `invoice_id` (success / 409 already-converted / 500 partial-failure) routes to that invoice.

### PR #52 — M1 cleanup (brand + mobile + schedule + dead link)
**Closes Ops #8, #9, #10, #11, #13**
- **Mobile admin nav.** New `MobileMenuDrawer` component (hamburger top-left, slide-in panel from the left). Mirrors the desktop sidebar exactly. Closes on item tap, backdrop click, route change, or Esc. Body scroll lock. Focus trap (Tab cycles between Close → first nav → Log Out). Focus restored to hamburger on close. `aria-modal="true"`, `inert` while closed (no Tab leak to hidden links). Solves the prior gap where admins on mobile could not reach Quotes / Invoices / Materials / Settings / Reports / Activity / Templates.
- **Brand color sweep.** Global find/replace `#68BD45` → `#045815` (Energi forest green) and `#5aa83c` → `#023510` across every `.tsx`/`.ts`/`.css`. 136 occurrences across 51 files. Sidebar active state redesigned from `bg-[#045815]/15 text-[#045815]` (invisible on dark sidebar) to solid `bg-[#045815] text-white` pill. Sidebar logo container goes `bg-white` so the dark-text logo asset reads cleanly. Badge `info` variant + every freestanding `bg-[#045815]/10 text-[#045815]` (~3.4:1 contrast, fail AA) bumped to `bg-[#045815]/15 text-[#023510]` (clears AA). Schedule today highlight `bg-[#045815]/5` (nearly invisible) → `bg-[#045815]/10 ring-1 ring-[#045815]/20`.
- **Schedule overflow.** `min-w-0` added to `<main>` and the schedule wrapper so the existing `overflow-x-auto` actually constrains width. The 14-day grid was overflowing ~3.7× viewport on mobile; now scrolls horizontally inside its container.
- **`/customers` dead link.** `/quotes/new` empty-state previously linked to `/customers` (a 404 — customers are created during project setup, not a standalone CRUD page). Replaced with: "You don't have any customers yet. Customers are created during project setup — start a project to add one." pointing at `/projects`.
- **Invoices list parity with quotes.** Toolbar wraps cleanly on mobile (no more two-line "+ New Invoice" button). Empty state gets a centered "+ New invoice" CTA matching the Quotes pattern.
- **PageHeader `pl-16 md:pl-6`** so the title doesn't overlap the fixed top-3 hamburger button. Title got `truncate`; actions got `shrink-0`.
- **Hamburger button visibility** on white PageHeader: was `bg-white border-gray-200` (invisible against the same-color header). Now solid `bg-[#32373C] text-white shadow-md` so it reads as a control.

---

## Reviews incorporated

Every PR went through the same review loop before merge:
- **Critic** for code/correctness — found 14 P0/P1 issues across the session (quantity blur race in the quote builder, payload dedupe in CSV import, parser silent corruption on bad quotes, conversion race, penny precision, terminal-status guard on the quote PATCH route, missing 404 mapping for `PGRST116`, soft-delete reactivation path, Content-Length cap on import, etc.). All addressed before merge.
- **Aesthetic** for UX/a11y — found ~30 P0/P1/P2 issues (touch targets, focus rings, ARIA live regions, mobile layouts, dynamic-Tailwind class bug in `TotalsRow`, status-badge color-only signaling, drawer focus trap, hamburger overlap, tint-on-tint contrast). All addressed before merge.
- **Dispatch** for deploy verify — every push verified on Vercel before opening the PR.

The Aesthetic review was the most consequential late in the session: it caught the WCAG keyboard-reachability hit on the closed drawer (`inert` was missing), the `bg-[#045815]/10 text-[#045815]` tint-on-tint contrast regression that the brand sweep introduced across 5+ components, and the `text-gray-${cond?'900':'600'}` dynamic-Tailwind-class bug in `TotalsRow` that was silently rendering wrong shades because JIT couldn't see the partial class names.

---

## Database state (post-migration)

```
material_categories : 5  (Rough-In, Trim-Out, Service/Panel, Temporary Power, Misc/Other)
materials           : 59 (all active=true)
quotes              : 0
quote_line_items    : 0
invoices            : 0
customers           : 0
profiles            : 2  (joe@blueshoresnc.com admin + kasiddons@gmail.com field)
```

`invoice_number_seq` and `quote_number_seq` both reset to start at 1001.

---

## Mid-session DB cleanup

Kenny ran a TRUNCATE script via Supabase SQL Editor that preserved profiles + materials + categories + project_templates and cleared all transactional data so the post-cleanup visual UX walkthrough was on a clean slate. Both auto-numbering sequences were reset. Documented for repeatability — same script can be re-run before launch.

---

## Visual UX walkthrough

Two passes via Playwright:
1. **Pre-cleanup audit** — found 5 real issues (404 on `/customers` dead link, mobile bottom nav hides every admin feature, schedule mobile layout breaks at 375px, entire UI still uses legacy `#68BD45` Blue Shores green, sidebar logo unreadable on dark background) plus inconsistencies (empty-state CTA pattern, action-button placement, etc.) and polish items.
2. **Post-cleanup verification** — on the Vercel preview deploy after PR #52 was pushed but before merge. Confirmed each fix landed visually: hamburger drawer opens cleanly with focus management, brand sweep applied across every page, schedule scrolls horizontally inside its wrapper, dead link replaced, sidebar active pill solid green with white text, logo readable on white container.

Both passes used the test admin (`joe@blueshoresnc.com`).

---

## What's blocked on Joe

Same list as before, no progress today:
1. Business address, phone number, NC electrical license number (for invoice PDF — Ops #6)
2. SMTP credentials + Energi domain (for transactional email — Ops #7)
3. Stripe account creation + key sharing (for M2 Payments)
4. Jobber export attempt + sample files (for M4 Migration)
5. Customer + invoice volume estimate
6. Refund policy / failed-payment retry / partial payments policy

---

## What's locked-in technically

- Stack: Next.js 16, Supabase (auth/DB/storage), Cloudflare R2, Nodemailer SMTP (creds pending)
- Brand: `#045815` everywhere; sidebar active = solid pill; logo on white container
- Quote → invoice math: `unit_price = round2(grandTotal - taxAmount)`, `tax_amount = round2(taxAmount)`. Penny-exact.
- Materials soft-delete: `active=false`. Quote line items snapshot name/unit/price/phase. Reactivation path on POST and import.
- Quote conversion: lock-first pattern via status-guarded UPDATE. Single-flight under concurrency.
- Mobile admin nav: hamburger drawer with full focus trap, `inert` while closed, `aria-modal="true"`.

---

## Reference / artifacts

- PRs: BlueWaveCreative/Energi-electric-app#47 #48 #49 #50 #51 #52
- Operations issues closed: #8, #9, #10, #11, #13, #27, #28, #29, #30, #31, #32, #34, #35, #36, #37, #38, #39
- Operations issues deferred: #33 (auto-grow — manual + bulk via materials page covers it for V1)
- Migration applied: `010_materials_quotes.sql`
- Test admin: `joe@blueshoresnc.com` / `BlueShores2026!` (rotate before launch)
- Live: https://energi-electric-app.vercel.app
- Supabase project ref: `jhznaijckdrokjpglwpp`
- Repo: BlueWaveCreative/Energi-electric-app
