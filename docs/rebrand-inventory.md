# Rebrand Inventory — Blue Shores → Energi Electric

**Generated:** 2026-04-24
**Scope:** grep audit across **tracked files only** (what Vercel actually deploys). Run via `git ls-files | xargs grep ...`. Local-only / untracked files are excluded. Intentional historical references in `docs/PRD.md` and `docs/joe-materials-prototype.tsx` are excluded as noise.

**Match totals:**
- **41 matches in tracked code/config** — the stuff that runs in production. ALL of Buckets A–F below.
- **44 matches in `docs/superpowers/`** — historical plan/spec markdown from the Blue Shores era. Bucket H. **Don't modify** — these are historical PM documentation.
- **2 orphan SVG asset files** — Bucket G.

This is the authoritative checklist for the M1 rebrand. Each Operations issue (#3–#13) maps to one or more buckets below.

---

## Bucket A — Visible logo `alt` text → swap to "Energi Electric"

These are accessibility / screen-reader strings on `<img>` elements. Swap when the issue that owns each surface ships.

| File | Line | Owner |
|---|---|---|
| `src/components/layout/sidebar.tsx` | 44 | Issue #3 (app header) |
| `src/app/login/page.tsx` | 117 | Issue #4 (login/signup) |
| `src/app/signup/page.tsx` | 23 | Issue #4 |
| `src/app/forgot-password/page.tsx` | 36 | Issue #4 |
| `src/app/reset-password/page.tsx` | 54 | Issue #4 |
| `src/app/portal/[token]/client.tsx` | 60 | Issue #8 (customer portal) |

All currently say `alt="Blue Shores Electric"` → `alt="Energi Electric"`.

---

## Bucket B — Visible page titles, help copy, customer-facing settings text

### Page metadata (Issue #5 owns these)

| File | Line | Current | Target |
|---|---|---|---|
| `src/app/layout.tsx` | 40 | `title: "Blue Shores PM"` | `title: "Energi Electric"` |
| `src/app/layout.tsx` | 41 | `description: "Project management for Blue Shores Electric"` | "Business management for Energi Electric" |
| `src/app/layout.tsx` | 46 | `appleWebApp.title: "Blue Shores PM"` | `"Energi"` (short name for iOS home screen) |
| `public/manifest.json` | 2 | `"name": "Blue Shores PM"` | `"name": "Energi Electric"` |
| `public/manifest.json` | 3 | `"short_name": "Blue Shores"` | `"short_name": "Energi"` |
| `public/manifest.json` | 4 | `"description": "Project management for Blue Shores Electric"` | "Business management for Energi Electric" |

### In-app help page (Issue #12 — copy scrub)

| File | Line | Current |
|---|---|---|
| `src/app/(authenticated)/help/page.tsx` | 56 | `<PageHeader title="How to Use Blue Shores PM" />` |
| `src/app/(authenticated)/help/page.tsx` | 61 | "Blue Shores PM helps you track projects..." |
| `src/app/(authenticated)/help/page.tsx` | 333 | "On your phone, you can install Blue Shores PM as an app..." |

### Customer-facing settings text (Issue #12)

| File | Line | Current | Notes |
|---|---|---|---|
| `src/app/(authenticated)/settings/client.tsx` | 51 | SMS body: ``"Hi ${customer.name}, here's your Blue Shores Electric project portal: ${portalUrl}"`` | Customer sees this in their texts |
| `src/app/(authenticated)/settings/client.tsx` | 34 | Fallback base URL `https://blue-shores-pm.vercel.app` | Update to `energi-electric-app.vercel.app` |

### Service worker push notification (Issue #12)

| File | Line | Current |
|---|---|---|
| `public/sw.js` | 2 | `var data = { title: 'Blue Shores PM', body: '' }` — fallback push title shown on user's lock screen |

### CSV download filename (Issue #12 — user sees the filename when downloading)

| File | Line | Current | Target |
|---|---|---|---|
| `src/components/reports/csv-export.tsx` | 36 | ``downloadCSV(csv, `blue-shores-time-report-${date}.csv`)`` | `energi-electric-time-report-${date}.csv` |

---

## Bucket C — Email templates (Issue #7 owns all of these)

`src/lib/email.ts` is the entire transactional email layer. Heavy customer-facing surface.

| Line | Current | Notes |
|---|---|---|
| 3 | `BASE_URL = process.env.NEXT_PUBLIC_APP_URL ?? 'https://blue-shores-pm.vercel.app'` | Fallback URL |
| 17 | `FROM = process.env.SMTP_FROM ?? 'noreply@blueshoresnc.com'` | Fallback from-address (still blocked on Energi domain decision) |
| 34 | Email subject: `'Your Blue Shores Electric Project Portal'` | Customer sees |
| 41 | Body: `'Blue Shores Electric has set up a portal for you...'` | Customer sees |
| 53 | Footer: `'Blue Shores Electric · Wilmington, NC'` | Customer sees |
| 87 | Email subject: ``'Invoice #${invoiceNumber} from Blue Shores Electric'`` | Customer sees |
| 94 | Body: `'You have a new invoice from Blue Shores Electric.'` | Customer sees |
| 109 | Footer: `'Blue Shores Electric · Wilmington, NC'` | Customer sees |

---

## Bucket D — Invoice PDF (Issue #6 owns these)

| File | Line | Current | Notes |
|---|---|---|---|
| `src/lib/pdf.tsx` | 72 | `<Text style={styles.companyName}>Blue Shores Electric</Text>` | Top of invoice — customer sees |
| `src/lib/pdf.tsx` | 151 | `'Blue Shores Electric · (910) 619-2000 · blueshoresnc.com'` | Footer — needs Joe's Energi phone + domain |

Issue #6 still blocked on Joe providing: phone, address, electrical license number, Energi domain.

---

## Bucket E — Repo hygiene (project metadata)

Not user-facing, but worth aligning so the project IS what it is. Suggested separate cleanup commit (low priority).

| File | Line | Current |
|---|---|---|
| `package.json` | 2 | `"name": "blue-shores-pm"` |
| `package-lock.json` | 2, 8 | matching package name |
| `CLAUDE.md` | 1, 4, 5, 8 | project description as Blue Shores PM |

If renamed, run `npm install` to regenerate the lockfile cleanly. **Vercel project name is already updated** (renamed earlier today).

---

## Bucket F — KEEP or migrate carefully (internal state — risk of data loss)

These are NOT user-visible. Renaming them blindly will lose user data or break existing infrastructure.

| File | Line | What it is | Recommendation |
|---|---|---|---|
| `src/lib/r2.ts` | 7 | `R2_BUCKET = process.env.R2_BUCKET ?? 'blue-shores'` | **DO NOT rename the R2 bucket.** All existing photo URLs reference the bucket name. The fallback string can be updated, but production uses the env var — verify Vercel env. |
| `src/hooks/use-timer.ts` | 5 | `localStorage` key `'blue-shores-timer'` | If renamed, all users mid-clock-in lose their active timer state. Either keep the key or write a migration that reads the old key on mount. |
| `src/lib/offline/db.ts` | 3 | IndexedDB name `'blue-shores-pm'` | Same concern — renaming creates a new empty database; users lose any offline-cached data. Keep, OR migrate. |
| `scripts/setup-r2-cors.ts` | 35, 40 | dev-only — bucket + CORS allowed origins. Update at convenience. |

**Note:** `scripts/test-r2-upload.ts` and `scripts/full-qa-test.ts` are local-only on Kenny's machine (untracked) — they're not in git, not deployed. The hardcoded admin credential `BlueShores2026!` in `full-qa-test.ts` is therefore not exposed publicly, but the file should still NOT be committed. Recommend adding `scripts/full-qa-test.ts` to `.gitignore` if the password is real.

---

## Bucket G — Orphan Blue Shores logo assets (DELETE in Issue #3 / #12)

| File | Action |
|---|---|
| `public/brand/logo-horizontal.svg` | Delete after Issue #3 swaps references to `energi-logo-horizontal.png` |
| `public/brand/logo-mark.svg` | Delete after all references updated |

These are Blue Shores wave/anchor design SVGs. Once code references the new Energi PNGs, these become unused dead weight in `public/`.

---

## Bucket H — Historical PM documentation (`docs/superpowers/`) — DO NOT MODIFY

44 matches across plan/spec markdown files that describe past work done when the project was Blue Shores PM. Files affected:

- `docs/superpowers/plans/2026-04-02-r2-photo-upload-fix.md`
- `docs/superpowers/plans/2026-04-06-client-portal.md`
- `docs/superpowers/specs/2026-04-02-r2-photo-upload-fix-design.md`
- `docs/superpowers/specs/2026-04-06-client-portal-design.md`

These are historical records of how features were planned and built. Modifying them rewrites history and obscures the project's actual evolution. Treat them like git commit messages — leave alone.

If you ever want to clean up the `docs/superpowers/` folder, do it as a separate "archive old PM docs" task — not as part of the rebrand.

---

## Cross-reference summary by Operations issue

| Issue | Items to handle |
|---|---|
| **#3** App header logo | Bucket A line 1 (`sidebar.tsx:44`); delete orphan SVGs (Bucket G) |
| **#4** Login/signup logos | Bucket A lines 2–5 |
| **#5** Favicon + PWA + OG | Bucket B page metadata (3 entries in `layout.tsx`, 3 in `manifest.json`) |
| **#6** Invoice PDF | Bucket D — still blocked on Joe's contact info |
| **#7** Email templates | Bucket C — still blocked on SMTP + Energi domain |
| **#8** Customer portal | Bucket A line 6 |
| **#9–#11** Apply tokens to admin pages | No string replacements; visual styling only (uses tokens from Issue #2 ✅) |
| **#12** UI copy scrub | Bucket B (help page, settings SMS, sw.js, CSV filename), Bucket E (CLAUDE.md, package.json — optional repo hygiene), Bucket G (delete SVGs if not done in #3) |
| **#13** Final verification | Re-run this same grep, expect zero hits in Buckets A–E. Buckets F and G should also be clear. |

---

## Notes for #13 (final verification)

After all M1 issues land, re-run on TRACKED files only:

```sh
git ls-files | xargs grep -ni -E "blue ?shores?|blue[-_]shores?|blueshores?" \
  | grep -v "^docs/" \
  | grep -v "rebrand-inventory.md"
```

Acceptable remaining matches (Bucket F — don't fix):
- The `'blue-shores-timer'` localStorage key (kept for user-state continuity unless migrated)
- The `'blue-shores-pm'` IndexedDB name (same)
- The R2 bucket name `'blue-shores'` (kept — bucket rename = photo URL invalidation)

Acceptable remaining matches (Bucket H — historical):
- Anything under `docs/superpowers/`

Document any other remaining matches with a one-line justification when closing #13.
