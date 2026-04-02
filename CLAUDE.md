# Blue Shores PM

## Project Context
Custom project management app for Blue Shores Electric (Joe Lopez).
- **Live:** https://blue-shores-pm.vercel.app
- **Stack:** Next.js 16 + Supabase + Cloudflare R2 + Vercel
- **Supabase project:** jhznaijckdrokjpglwpp (us-east-1)
- **R2 bucket:** blue-shores

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
- Brand color: `#68BD45` (green) — no blue anywhere in the app
- Dark sidebar/login: `#32373C`
- All text on light backgrounds must be `text-gray-500` minimum — never use `text-gray-300` or `text-gray-400` on white/gray-50 backgrounds
- All headings must have explicit `text-gray-900`
- All pages must have `export const dynamic = 'force-dynamic'` to prevent stale data
- Secure every endpoint — auth check + RLS
- Photos compress client-side before upload (Vercel 4.5MB body limit)

## Testing
- Run `npm run test:run` before every commit
- Run `npm run build` before every push
- 53+ tests must pass
