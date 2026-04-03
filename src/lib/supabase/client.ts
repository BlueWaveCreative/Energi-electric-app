import { createBrowserClient } from '@supabase/ssr'

export function createClient() {
  return createBrowserClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    {
      cookies: {
        getAll() {
          // Sanitize cookie values — iOS WebKit produces auth cookies
          // with \r\n characters that break HTTP Authorization headers.
          // This must strip those chars BEFORE the Supabase client
          // reassembles the JWT from cookie chunks.
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
        setAll(cookies) {
          cookies.forEach(({ name, value, options }) => {
            const parts = [`${name}=${value}`]
            if (options?.path) parts.push(`path=${options.path}`)
            if (options?.maxAge) parts.push(`max-age=${options.maxAge}`)
            if (options?.sameSite) parts.push(`samesite=${options.sameSite}`)
            document.cookie = parts.join('; ')
          })
        },
      },
    }
  )
}
