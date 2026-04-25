# Session log — 2026-04-24 (Energi Electric pivot kickoff)

**Owner:** Kenny Siddons
**Duration:** Single multi-hour session
**Project state at start:** `BlueWaveCreative/blue-shores-pm` (Vercel + Supabase + R2). Working V1 with full client portal + invoicing as of 2026-04-07.
**Project state at end:** `BlueWaveCreative/Energi-electric-app`. Rebrand wave 1 shipped to production, full V1 backlog scoped, UX audit complete.

---

## TL;DR

Pivoted the Blue Shores PM platform to Energi Electric in a single session. Went from "Joe wants to switch brands" to: complete PRD, 59-issue tracked backlog, brand foundation live in production (logos, fonts, tokens, manifest, copy scrubbed, auth pages fully rebranded), payment processor decision made (Stripe), one production bug discovered + fixed, one infrastructure incident handled, full UX audit with screenshots — all committed and merged.

**Total:** 10 PRs merged, 8 GitHub issues closed, 59 issues created across 5 milestones + V2 + research.

---

## Source material

This session was driven by two Joe ↔ Kenny call transcripts captured the same day:

- **Call 1:** Brand pivot decision, "main four" features (login, time, jobs, invoices), online payment model, materials DB concept introduced.
- **Call 2:** Materials DB clarified as internal-only (not customer-facing), customer invoice format = single summary line, Joe's materials prototype shared, "Energi Logic Pro" App Store side-product pitched.

Joe's Claude-artifact prototype source was captured at `docs/joe-materials-prototype.tsx` — 5 categories, 59 seed materials, exact calc formula.

---

## What shipped

### Brand foundations
- **Brand tokens** in `globals.css` + `tailwind.config` — `bg-energi-primary` / `font-heading` / etc. now usable as Tailwind utilities
- **Energi green corrected** to `#045815` (sampled from final logo) — prior memory had `#2E9640` from the mockup era
- **Tagline corrected** to "Reliable protection. Safer homes." (was "Smarter power. Safer homes." in memory)
- **Brand assets staged** at `public/brand/`:
  - Horizontal logo (light bg primary)
  - Mark-only logo (square)
  - Inverted source (dark bg JPG)
  - PDF source (vector for future design work)
  - Full PWA icon set (32 / 180 / 192 / 512 / maskable-512)
  - Apple-touch-icon (180×180 with solid Energi green bg)
  - Multi-resolution favicon.ico

### Visible rebrand work shipped to production
- Logo swapped on 6 surfaces: sidebar, login, signup, forgot-password, reset-password, customer portal magic-link
- Page metadata rebranded: `<title>`, OpenGraph tags, PWA manifest name + theme color, apple-touch-icon
- UI copy scrubbed: help page (3 strings), settings SMS body to customers, fallback URLs, service worker push notification title, CSV time-report filename prefix
- Auth pages fully restyled: dark-mode → light-mode + Energi green accents (login, signup, forgot, reset)
- Old Blue Shores SVG logos deleted

### Repo hygiene
- `package.json` name: `blue-shores-pm` → `energi-electric-app`
- `package-lock.json` regenerated
- `CLAUDE.md` rewritten to describe the project as Energi Electric, references the PRD, documents brand colors/fonts, explains why R2 bucket name stays as-is
- 16 orphan `* 2.tsx` Finder-duplicate files moved out of the working tree to `/tmp/energi-orphan-duplicates/` (they'd been silently breaking local TypeScript checks)

### Documentation produced
- **PRD v1.2** at `docs/PRD.md` — comprehensive product brief with goals, user stories, milestones, open questions, materials DB spec, customer-facing invoice format
- **Rebrand inventory** at `docs/rebrand-inventory.md` — every "Blue Shores" reference in the codebase categorized into 8 buckets, mapped to the issue that handles it
- **Stripe research** at `docs/payment-processor-research.md` — comparison of Stripe / Square / Helcim / Stax with break-even math, recommendation: Stripe
- **Joe's materials prototype** at `docs/joe-materials-prototype.tsx` — full source from his Claude artifact, archived in case the artifact expires
- **UX audit** at `docs/ux-audit-2026-04-24.md` + 17 screenshots at `docs/ux-audit-2026-04-24/` — every authenticated page on desktop + mobile spot-check

### Bugs caught + fixed
1. **Middleware was intercepting `/manifest.json` and `/sw.js`** — Supabase auth middleware matcher only excluded a handful of image extensions, so PWA install was silently broken in production. Discovered by Dispatch agent QA on PR #40, fixed in PR #41.
2. **Orphan `* 2.tsx` files** — local-only Finder/Dropbox sync duplicates that broke `next build` for local TypeScript checking. Moved to backup location, build now passes locally.

### Infrastructure incidents
- **Supabase project paused** (free-tier inactivity) — DNS returned NXDOMAIN, login showed "Load failed". Resolved by Kenny restoring the project from the Supabase dashboard. Login verified working post-restore via Playwright.
- **Brief CORS limbo** after restore — Supabase needed ~60-90 seconds for config to propagate through Cloudflare after restore. Auth started working once propagation completed.

---

## PRs merged tonight

| # | Branch | Theme | Commit |
|---|---|---|---|
| 36 | `docs/prd-v1` | PRD + brand assets staged (no code changes) | `1ebf554` |
| 37 | `feat/energi-brand-tokens` | Brand tokens (CSS vars + Barlow / Plex Mono / Barlow Condensed fonts) | `42363d2` |
| 38 | `docs/rebrand-inventory` | Audit of every Blue Shores reference, categorized | `440bdf4` |
| 39 | `feat/rebrand-logos` | Logo swaps on sidebar, auth pages, customer portal | `72b2794` |
| 40 | `feat/rebrand-metadata` | Page metadata + manifest + favicon | `4386e90` |
| 41 | `feat/rebrand-copy-scrub` | UI copy scrub + middleware bugfix | `c81eb91` |
| 42 | `chore/repo-hygiene` | Rename package.json + update CLAUDE.md | `1677291` |
| 43 | `research/payment-processor` | Stripe vs alternatives — recommend Stripe | `a1c1dcb` |
| 44 | `feat/auth-pages-polish` | Auth pages: dark mode → light mode + Energi green | `1dc57fe` |
| 45 | `docs/ux-audit` | Full UX audit + 17 screenshots | `e9fb172` |

All squash-merged. Production verified clean by Dispatch agent after each merge.

---

## Operations issues

**59 total issues** across `BlueWaveCreative/Operations`:

| Milestone | Open | Closed |
|---|---|---|
| M1: Rebrand | 7 | **6** ✅ |
| M2: Online Payments | 13 | 0 |
| M3: Materials Database & Quotes | 13 | 0 |
| M4: Jobber Migration | 5 | 0 |
| M5: Pre-Launch Polish | 4 | 0 |
| V2 / Deferred (no milestone) | 6 | 0 |
| Research / Joe-TODO | 4 | **2** ✅ |

### Closed
- #1 Audit inventory (PR #38)
- #2 Brand tokens (PR #37)
- #3 Logo: header (PR #39)
- #4 Logo: auth pages (PR #39)
- #5 Favicon + PWA + OG (PR #40)
- #12 UI copy scrub (PR #41)
- #14 Stripe processor decision (PR #43)
- #55 Stripe research follow-up (PR #43)

### Still open on M1
- #6 Invoice PDF — ⛔ blocked on Joe providing address, phone, NC electrical license number
- #7 Email templates — ⛔ blocked on SMTP credentials + Energi domain
- #8 Customer portal — 🟡 logo done, color/typography still needed
- #9, #10, #11 Apply brand tokens to admin pages — 🟡 design judgment work
- #13 Final verification — 🟡 waits on the rest

### Notable backlog items
- M2-02 Joe creates Stripe account — ⛔ Joe TODO
- M4-01 Joe attempts Jobber export — ⛔ Joe TODO
- All M3 schema work is unblocked and ready when Materials DB build starts

---

## Decisions made

| Decision | Resolution |
|---|---|
| Payment processor | **Stripe** (research-backed, see `docs/payment-processor-research.md`) |
| Customer-facing invoice format | Single summary line: "Provided material and labor for [description]" — no itemization shown to customer |
| Materials DB scope | Internal-only quoting tool. NOT customer-facing. |
| Markup model | Global per-quote (matches Joe's prototype). Per-line override deferred to V2. |
| Tax model | Applied to materials + markup + labor + flat fee (everything). |
| Quote → Invoice flow | Confirmed as V1 requirement. |
| Go-live date | ASAP — no hard date. Cesar timeline is Joe's business problem, not ours. |
| Crew size at launch | 3-4 field workers + Joe |
| Custom domain in V1 | No. Stay on `energi-electric-app.vercel.app`. |
| Invoice reminder emails | Yes, but deferred to V2 |
| "Energi Logic Pro" App Store product | Captured as separate future product idea, NOT part of this PRD |
| R2 bucket / localStorage / IndexedDB names | Keep as-is (renaming would invalidate user data + photo URLs) |

---

## Open questions still requiring Joe input (dinner agenda)

1. Energi Electric business **address, phone, NC electrical license number** (blocks invoice PDF)
2. **Energi domain** registration + chosen subdomain for app (blocks email + custom domain)
3. **From-email address** + **SMTP credentials** (blocks email templates)
4. **Stripe account** creation + key sharing (blocks all M2 payment work)
5. **Jobber export attempt** — confirm what formats are available (blocks all M4 migration)
6. **Customer data volume** — how many customers and active invoices to migrate
7. **$75/mo pricing confirmation** post-rebrand
8. **Electrical license transfer timing** — legal milestone for invoice compliance
9. **Per-line markup override** — does Joe ever vary markup by item? (default V1 = no)
10. **Refund policy** — who can issue, time window
11. **Failed-payment retry** — automatic or manual
12. **Partial payments** — allowed or not

---

## UX audit findings (full doc at `docs/ux-audit-2026-04-24.md`)

### 🔴 P0
- Sidebar logo unreadable on every authenticated page (dark gray bg + green wordmark = invisible)
- Mobile has no Energi logo anywhere
- Mobile bottom-nav missing 6 sections

### 🟡 P1
- Every accent color in app still Blue Shores green `#68BD45` — needs to be `#045815`
- Issues #9-11 only cover 6 of the ~16 surfaces that need this swap

### 🟢 P2
- Toggle switches still bright Blue Shores green
- Customer avatars / folder / clock icons still Blue Shores
- Phase status badges in project detail use mixed greens

### Working well
- Auth pages (post PR #44) — clean, professional, on-brand
- Help page copy fully rebranded
- Page titles, meta, manifest all Energi
- Layout/spacing/typography solid
- Mobile responsive layout works mechanically

---

## Pages NOT visited in audit

- Customer portal (`/portal/[token]`) — no customers exist in DB yet
- Invoice detail (`/invoices/[id]`) — no invoices exist
- Invoice PDF render — no invoices to render
- Forgot/Reset password post-submit success states

These need priority QA once seed data exists.

---

## What's next (priority order for next session)

### Highest leverage
1. **Generate a white-on-transparent horizontal logo** — unblocks the sidebar contrast issue across the entire app
2. **Apply Energi green to remaining ~10 surfaces** that aren't covered by current open issues (Schedule, Templates, Activity, project detail, all the `/new` form pages). Either expand #9-11 scope or open additional issues.
3. **Mobile logo + nav** — add Energi logo to mobile header, add a "More" tab or hamburger for the missing 6 sections
4. **Issue #8 colors** — finish customer portal rebrand (logo done, colors still pending)

### Joe-blocked
5. **Dinner conversation** — collect contact info, license #, domain status, Jobber export, Stripe account
6. After dinner: unblock #6, #7, M2-02, M4-01

### Then
7. **#13 final verification** — grep sweep + visual QA, close M1
8. Move to M2 (Stripe integration) once Joe's account is created

---

## Files of record

| File | Purpose |
|---|---|
| `docs/PRD.md` | Source of truth for V1 scope |
| `docs/joe-materials-prototype.tsx` | Joe's data model + calc formula reference |
| `docs/rebrand-inventory.md` | Authoritative checklist of Blue Shores references |
| `docs/payment-processor-research.md` | Stripe decision record |
| `docs/ux-audit-2026-04-24.md` | What the rebrand actually looks like in production |
| `docs/ux-audit-2026-04-24/` | 17 screenshots backing the audit |
| `docs/session-log-2026-04-24.md` | This document |

---

## Closing note

Tonight took an idea ("Joe wants to pivot to Energi Electric") and turned it into a production-deployed brand foundation, a fully scoped backlog, two real bugs caught, and a clear-eyed audit of what's left. The remaining work is mechanical color swaps + waiting on Joe's input. None of it is hard. None of it is mysterious. The next session is mostly execution.
