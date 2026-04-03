import { cookies } from 'next/headers'
import { NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'

export const dynamic = 'force-dynamic'

export async function GET() {
  const cookieStore = await cookies()
  const allCookies = cookieStore.getAll()

  const results: Record<string, unknown> = {}

  // 1. Raw cookie analysis
  const sbCookies = allCookies.filter((c) => c.name.startsWith('sb-'))
  results.cookieCount = allCookies.length
  results.supabaseCookieCount = sbCookies.length

  results.cookies = allCookies.map((cookie) => {
    const nonPrintable: { hex: string; code: number; position: number }[] = []
    for (let i = 0; i < cookie.value.length; i++) {
      const code = cookie.value.charCodeAt(i)
      if (code < 32 || code === 127) {
        nonPrintable.push({ hex: `\\x${code.toString(16).padStart(2, '0')}`, code, position: i })
      }
    }

    return {
      name: cookie.name,
      length: cookie.value.length,
      isSupabase: cookie.name.startsWith('sb-'),
      nonPrintableCount: nonPrintable.length,
      nonPrintableChars: nonPrintable.slice(0, 10),
      preview: cookie.value.length > 120
        ? `${cookie.value.substring(0, 80)}...${cookie.value.substring(cookie.value.length - 40)}`
        : cookie.value,
    }
  })

  // 2. Decode the base64- prefix manually and inspect the session JSON
  const authCookie = sbCookies.find((c) => c.name.includes('auth-token'))
  if (authCookie) {
    try {
      let val = authCookie.value
      if (val.startsWith('base64-')) {
        val = val.substring(7)
      }
      // Decode using Node.js Buffer (not the Supabase custom decoder)
      const decoded = Buffer.from(val, 'base64url').toString('utf-8')
      const session = JSON.parse(decoded)

      // Extract the access token and check it for bad chars
      const accessToken = session.access_token ?? ''
      const tokenBadChars: { hex: string; code: number; pos: number }[] = []
      for (let i = 0; i < accessToken.length; i++) {
        const code = accessToken.charCodeAt(i)
        if (code < 32 || code === 127 || code > 127) {
          tokenBadChars.push({ hex: `\\x${code.toString(16).padStart(2, '0')}`, code, pos: i })
        }
      }

      results.sessionDecode = {
        success: true,
        sessionKeys: Object.keys(session),
        accessTokenLength: accessToken.length,
        accessTokenBadChars: tokenBadChars.slice(0, 10),
        accessTokenPreview: accessToken.length > 80
          ? `${accessToken.substring(0, 60)}...${accessToken.substring(accessToken.length - 20)}`
          : accessToken,
        // The full Authorization header that would be sent
        authHeaderValue: `Bearer ${accessToken}`,
        authHeaderLength: `Bearer ${accessToken}`.length,
        authHeaderBadChars: (() => {
          const header = `Bearer ${accessToken}`
          const bad: { hex: string; code: number; pos: number }[] = []
          for (let i = 0; i < header.length; i++) {
            const code = header.charCodeAt(i)
            if (code < 32 || code === 127 || code > 127) {
              bad.push({ hex: `\\x${code.toString(16).padStart(2, '0')}`, code, pos: i })
            }
          }
          return bad.slice(0, 10)
        })(),
      }

      // Also decode using Supabase's custom base64url decoder and compare
      try {
        const { stringFromBase64URL } = await import('@supabase/ssr/dist/main/utils/base64url.js')
        const supabaseDecoded = stringFromBase64URL(authCookie.value.substring(7))
        const supabaseSession = JSON.parse(supabaseDecoded)
        const supabaseToken = supabaseSession.access_token ?? ''

        const supabaseBadChars: { hex: string; code: number; pos: number }[] = []
        for (let i = 0; i < supabaseToken.length; i++) {
          const code = supabaseToken.charCodeAt(i)
          if (code < 32 || code === 127 || code > 127) {
            supabaseBadChars.push({ hex: `\\x${code.toString(16).padStart(2, '0')}`, code, pos: i })
          }
        }

        results.supabaseDecoderComparison = {
          tokensMatch: accessToken === supabaseToken,
          supabaseTokenLength: supabaseToken.length,
          supabaseTokenBadChars: supabaseBadChars.slice(0, 10),
        }
      } catch (err) {
        results.supabaseDecoderComparison = {
          error: err instanceof Error ? err.message : String(err),
        }
      }
    } catch (err) {
      results.sessionDecode = {
        success: false,
        error: err instanceof Error ? err.message : String(err),
      }
    }
  }

  // 3. Try server-side getUser() — this is what fails in the upload route
  try {
    const supabase = await createClient()
    const { data, error } = await supabase.auth.getUser()
    results.serverGetUser = {
      success: !error,
      userId: data?.user?.id ?? null,
      email: data?.user?.email ?? null,
      error: error?.message ?? null,
    }
  } catch (err) {
    results.serverGetUser = {
      success: false,
      caughtError: err instanceof Error ? err.message : String(err),
      errorName: err instanceof Error ? err.name : 'unknown',
      stack: err instanceof Error ? err.stack?.split('\n').slice(0, 5).join('\n') : null,
    }
  }

  // 4. Try a server-side DB query
  try {
    const supabase = await createClient()
    const { data, error } = await supabase.from('profiles').select('id').limit(1)
    results.serverDbQuery = {
      success: !error,
      rowCount: data?.length ?? 0,
      error: error?.message ?? null,
    }
  } catch (err) {
    results.serverDbQuery = {
      success: false,
      caughtError: err instanceof Error ? err.message : String(err),
    }
  }

  results.timestamp = new Date().toISOString()
  return NextResponse.json(results, { status: 200 })
}
