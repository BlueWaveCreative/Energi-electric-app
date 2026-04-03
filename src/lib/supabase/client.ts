import { createBrowserClient } from '@supabase/ssr'

let clientInstance: ReturnType<typeof createBrowserClient> | null = null

export function createClient() {
  // Return cached instance if available (prevents multiple session refreshes)
  if (clientInstance) return clientInstance

  const client = createBrowserClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    {
      cookies: {
        getAll() {
          // Sanitize cookie values — iOS WebKit produces auth cookies
          // with \r\n characters that break HTTP Authorization headers.
          return document.cookie
            .split(';')
            .filter((c) => c.trim())
            .map((c) => {
              const eqIndex = c.indexOf('=')
              if (eqIndex === -1) return { name: c.trim(), value: '' }
              const name = c.substring(0, eqIndex).trim()
              const rawValue = c.substring(eqIndex + 1)
              const cleanValue = rawValue.replace(/[\r\n\0]/g, '')

              // If cookie was corrupted, rewrite the clean value back to storage
              // so the Supabase client's internal cache also gets clean values
              if (cleanValue !== rawValue) {
                document.cookie = `${name}=${cleanValue}; path=/; max-age=31536000; samesite=lax`
              }

              return { name, value: cleanValue }
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

  // iOS WebKit: force session refresh to replace any corrupted stored tokens
  // getSession() triggers a token refresh → writes clean cookies via setAll()
  if (typeof navigator !== 'undefined' && /iPhone|iPad|iPod/.test(navigator.userAgent)) {
    client.auth.getSession().catch(() => {})
  }

  clientInstance = client
  return client
}
