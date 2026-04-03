import { cookies } from 'next/headers'
import { NextResponse } from 'next/server'

export const dynamic = 'force-dynamic'

export async function GET() {
  const cookieStore = await cookies()
  const allCookies = cookieStore.getAll()

  const analysis = allCookies.map((cookie) => {
    const hasCarriageReturn = cookie.value.includes('\r')
    const hasNewline = cookie.value.includes('\n')
    const hasNull = cookie.value.includes('\0')

    // Check for any non-printable ASCII characters
    const nonPrintable: { char: string; code: number; position: number }[] = []
    for (let i = 0; i < cookie.value.length; i++) {
      const code = cookie.value.charCodeAt(i)
      if (code < 32 || code === 127) {
        nonPrintable.push({ char: `\\x${code.toString(16).padStart(2, '0')}`, code, position: i })
      }
    }

    // Check if it looks like a Supabase auth cookie
    const isSupabaseCookie = cookie.name.startsWith('sb-')

    // For supabase cookies, try to decode and check structure
    let decoded: string | null = null
    let jwtParts: number | null = null
    if (isSupabaseCookie) {
      try {
        decoded = decodeURIComponent(cookie.value)
        // base64url encoded JWT has 3 parts separated by dots
        const val = decoded.startsWith('base64-') ? decoded.slice(7) : decoded
        jwtParts = val.split('.').length
      } catch {
        decoded = '[decode error]'
      }
    }

    return {
      name: cookie.name,
      length: cookie.value.length,
      isSupabaseCookie,
      hasCarriageReturn,
      hasNewline,
      hasNull,
      nonPrintableCount: nonPrintable.length,
      nonPrintableChars: nonPrintable.slice(0, 10), // first 10
      jwtParts,
      // Show first 80 and last 40 chars for inspection
      valuePreview: cookie.value.length > 120
        ? `${cookie.value.substring(0, 80)}...${cookie.value.substring(cookie.value.length - 40)}`
        : cookie.value,
    }
  })

  // Also check: does reassembling chunked cookies produce a valid value?
  const sbCookies = allCookies.filter((c) => c.name.startsWith('sb-'))
  const chunkedGroups: Record<string, string[]> = {}
  for (const c of sbCookies) {
    // Supabase chunks cookies like sb-xxx-auth-token.0, sb-xxx-auth-token.1, etc.
    const baseName = c.name.replace(/\.\d+$/, '')
    if (!chunkedGroups[baseName]) chunkedGroups[baseName] = []
    chunkedGroups[baseName].push(c.value)
  }

  const reassembled: Record<string, { totalLength: number; nonPrintableCount: number; preview: string }> = {}
  for (const [name, chunks] of Object.entries(chunkedGroups)) {
    const joined = chunks.join('')
    let badChars = 0
    for (let i = 0; i < joined.length; i++) {
      const code = joined.charCodeAt(i)
      if (code < 32 || code === 127) badChars++
    }
    reassembled[name] = {
      totalLength: joined.length,
      nonPrintableCount: badChars,
      preview: joined.length > 120
        ? `${joined.substring(0, 80)}...${joined.substring(joined.length - 40)}`
        : joined,
    }
  }

  return NextResponse.json({
    cookieCount: allCookies.length,
    supabaseCookieCount: sbCookies.length,
    cookies: analysis,
    reassembledChunks: reassembled,
    timestamp: new Date().toISOString(),
  }, { status: 200 })
}
