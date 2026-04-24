import { type NextRequest } from 'next/server'
import { updateSession } from '@/lib/supabase/middleware'

export async function middleware(request: NextRequest) {
  return await updateSession(request)
}

export const config = {
  matcher: [
    // Exclude Next.js internals, API routes, and common static assets
    // (images, favicon, manifest.json, service worker, robots/sitemap).
    // Without these exclusions, Supabase auth middleware intercepts
    // /manifest.json and /sw.js and returns HTML instead of the expected
    // JSON/JS — breaking PWA install + push notifications.
    '/((?!_next|api/|.*\\.(?:svg|png|jpg|jpeg|gif|webp|ico|json|js|txt|xml|webmanifest)$).*)',
  ],
}
