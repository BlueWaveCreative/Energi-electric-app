import { createBrowserClient } from '@supabase/ssr'

export function createClient() {
  return createBrowserClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    {
      cookies: {
        getAll() {
          // Sanitize cookie values — iOS WebKit produces auth cookies
          // with \r\n characters that break HTTP Authorization headers
          return document.cookie
            .split(';')
            .filter((c) => c.trim())
            .map((c) => {
              const eqIndex = c.indexOf('=')
              if (eqIndex === -1) return { name: c.trim(), value: '' }
              return {
                name: c.substring(0, eqIndex).trim(),
                value: c.substring(eqIndex + 1).replace(/[\r\n\0]/g, ''),
              }
            })
        },
      },
    }
  )
}
