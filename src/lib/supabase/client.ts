import { createBrowserClient } from '@supabase/ssr'

// Sanitize fetch headers — iOS WebKit produces auth cookies with \r\n
// characters that corrupt the Authorization header. This wrapper strips
// invalid characters from all header values before sending.
const sanitizedFetch: typeof fetch = (input, init) => {
  if (init?.headers) {
    const headers = new Headers(init.headers)
    const sanitized = new Headers()
    headers.forEach((value, key) => {
      sanitized.set(key, value.replace(/[\r\n\0]/g, ''))
    })
    init = { ...init, headers: sanitized }
  }
  return fetch(input, init)
}

export function createClient() {
  return createBrowserClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    {
      global: {
        fetch: sanitizedFetch,
      },
      cookies: {
        getAll() {
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
