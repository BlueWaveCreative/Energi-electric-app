'use client'

import { useState, useEffect } from 'react'

export default function DebugAuthPage() {
  const [results, setResults] = useState<Record<string, unknown>>({})
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    async function run() {
      const output: Record<string, unknown> = {}

      // 1. Raw document.cookie
      const raw = document.cookie
      output.rawCookieLength = raw.length
      output.rawCookiePreview = raw.substring(0, 500)

      // 2. Parse cookies and check for bad chars
      const parsed = raw.split(';').filter(c => c.trim()).map(c => {
        const eqIndex = c.indexOf('=')
        if (eqIndex === -1) return { name: c.trim(), value: '' }
        const name = c.substring(0, eqIndex).trim()
        const value = c.substring(eqIndex + 1)

        const badChars: { code: number; pos: number; hex: string }[] = []
        for (let i = 0; i < value.length; i++) {
          const code = value.charCodeAt(i)
          if (code < 32 || code === 127) {
            badChars.push({ code, pos: i, hex: `\\x${code.toString(16).padStart(2, '0')}` })
          }
        }

        return {
          name,
          length: value.length,
          hasBadChars: badChars.length > 0,
          badChars: badChars.slice(0, 5),
          isSupabase: name.startsWith('sb-'),
          preview: value.length > 80 ? `${value.substring(0, 60)}...${value.substring(value.length - 20)}` : value,
        }
      })
      output.parsedCookies = parsed

      // 3. Try creating a Supabase client and calling getUser
      try {
        const { createClient } = await import('@/lib/supabase/client')
        const supabase = createClient()
        output.clientCreated = true

        try {
          const { data, error } = await supabase.auth.getUser()
          output.getUserResult = {
            success: !error,
            userId: data?.user?.id ?? null,
            email: data?.user?.email ?? null,
            error: error?.message ?? null,
          }
        } catch (err) {
          output.getUserResult = {
            success: false,
            caughtError: err instanceof Error ? err.message : String(err),
            errorName: err instanceof Error ? err.name : 'unknown',
            errorStack: err instanceof Error ? err.stack?.split('\n').slice(0, 3).join('\n') : null,
          }
        }

        // 4. Try a simple DB query (this also uses the auth header)
        try {
          const { data, error } = await supabase.from('profiles').select('id').limit(1)
          output.dbQueryResult = {
            success: !error,
            rowCount: data?.length ?? 0,
            error: error?.message ?? null,
          }
        } catch (err) {
          output.dbQueryResult = {
            success: false,
            caughtError: err instanceof Error ? err.message : String(err),
          }
        }
      } catch (err) {
        output.clientCreated = false
        output.clientError = err instanceof Error ? err.message : String(err)
      }

      // 5. Test the upload endpoint with a tiny test image (1x1 pixel)
      try {
        const canvas = document.createElement('canvas')
        canvas.width = 1
        canvas.height = 1
        const blob = await new Promise<Blob>((resolve) =>
          canvas.toBlob((b) => resolve(b!), 'image/png')
        )
        const formData = new FormData()
        formData.append('file', new File([blob], 'test.png', { type: 'image/png' }))
        formData.append('key', `debug/test-${Date.now()}.png`)

        const res = await fetch('/api/storage/upload', {
          method: 'POST',
          body: formData,
        })
        const body = await res.json().catch(() => ({}))
        output.uploadTest = {
          status: res.status,
          ok: res.ok,
          body,
        }
      } catch (err) {
        output.uploadTest = {
          caughtError: err instanceof Error ? err.message : String(err),
        }
      }

      // 6. Test the server debug endpoint
      try {
        const res = await fetch('/api/debug-cookies')
        output.serverCookieAnalysis = await res.json()
      } catch (err) {
        output.serverCookieAnalysis = { error: String(err) }
      }

      setResults(output)
      setLoading(false)
    }

    run()
  }, [])

  return (
    <div className="p-6 max-w-4xl mx-auto">
      <h1 className="text-2xl font-bold mb-4">Cookie & Auth Debug</h1>
      <p className="text-sm text-gray-500 mb-6">
        Tests the Supabase browser client, auth cookies, and upload endpoint.
      </p>

      {loading ? (
        <p className="text-gray-500">Running diagnostics...</p>
      ) : (
        <pre className="bg-gray-900 text-green-400 p-4 rounded-lg overflow-x-auto text-xs whitespace-pre-wrap">
          {JSON.stringify(results, null, 2)}
        </pre>
      )}

      <p className="text-xs text-red-400 mt-4">
        DELETE this page after debugging — it exposes auth info.
      </p>
    </div>
  )
}
