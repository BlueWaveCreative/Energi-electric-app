# Energi Electric App

## Project Context
Custom business management app for Energi Electric (Joe Lopez). Pivoted from the original Blue Shores PM build on 2026-04-24.
- **Live:** https://energi-electric-app.vercel.app
- **Stack:** Next.js 16 + Supabase + Cloudflare R2 + Vercel
- **Supabase project:** jhznaijckdrokjpglwpp (us-east-1)
- **R2 bucket:** `blue-shores` (kept — renaming would invalidate every existing photo URL; see `docs/rebrand-inventory.md` Bucket F)
- **PRD:** `docs/PRD.md`
- **Brand:** Energi green `#045815`, Barlow Condensed (headings) + Barlow (body) + IBM Plex Mono (numbers). Tagline: "Reliable protection. Safer homes."

## Git Workflow
- **Never push directly to main.** Always create a feature branch, push it, create a PR, and wait for Kenny's approval before merging.
- **Before creating a branch:** `git checkout main && git pull origin main && git checkout -b feat/...`
- **Always use Squash and merge** in the GitHub UI.
- **Never merge a PR without Kenny's explicit approval.**
- **Never prioritize speed over process.** Follow these rules every time, no exceptions.

## Vercel Deployment
- Production deploys when main is updated (auto via GitHub integration)
- Preview deploys on branch push
- All env vars must be set for both `production` AND `preview` environments

## Code Standards
- Brand color: `#045815` (Energi forest green). Use Tailwind utility `bg-energi-primary` / `text-energi-primary` / `border-energi-primary` (defined in `globals.css`).
- Legacy Blue Shores green `#68BD45` and dark sidebar `#32373C` still appear on some pages — being phased out in M1 issues #8, #9, #10, #11.
- All text on light backgrounds must be `text-gray-500` minimum — never use `text-gray-300` or `text-gray-400` on white/gray-50 backgrounds
- All headings must have explicit `text-gray-900`
- All pages must have `export const dynamic = 'force-dynamic'` to prevent stale data
- Secure every endpoint — auth check + RLS
- Photos compress client-side before upload (Vercel 4.5MB body limit)

## Testing
- Run `npm run test:run` before every commit
- Run `npm run build` before every push
- 53+ tests must pass
