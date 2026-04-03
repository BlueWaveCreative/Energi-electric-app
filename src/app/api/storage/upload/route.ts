import { NextResponse } from 'next/server'
import { cookies } from 'next/headers'
import { createClient as createSupabaseClient } from '@supabase/supabase-js'
import { uploadToR2 } from '@/lib/r2'

export const maxDuration = 30

/**
 * Extract user ID and access token from the Supabase auth cookie.
 *
 * Bypasses @supabase/ssr entirely — its cookie-to-session pipeline produces
 * an Authorization header that Node.js undici rejects with "Invalid character
 * in header content ['authorization']". Decoding the JWT locally avoids the
 * outbound HTTP call and the broken header construction.
 */
async function getAuthFromCookie(): Promise<{ userId: string; accessToken: string } | null> {
  const cookieStore = await cookies()
  const authCookie = cookieStore.getAll().find(
    (c) => c.name.includes('auth-token') && c.name.startsWith('sb-')
  )
  if (!authCookie) return null

  try {
    let value = authCookie.value
    if (value.startsWith('base64-')) {
      value = Buffer.from(value.substring(7), 'base64url').toString('utf-8')
    }
    const session = JSON.parse(value)
    const accessToken = session.access_token
    if (!accessToken) return null

    // JWT payload is the second dot-separated segment
    const parts = accessToken.split('.')
    if (parts.length !== 3) return null

    const payload = JSON.parse(Buffer.from(parts[1], 'base64url').toString('utf-8'))
    const userId = payload.sub
    if (!userId) return null

    return { userId, accessToken }
  } catch {
    return null
  }
}

export async function POST(request: Request) {
  const auth = await getAuthFromCookie()

  if (!auth) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

  try {
    const formData = await request.formData()
    const file = formData.get('file') as File | null
    const key = formData.get('key') as string | null

    const linkedType = formData.get('linkedType') as string | null
    const linkedId = formData.get('linkedId') as string | null
    const thumbnailKey = formData.get('thumbnailKey') as string | null

    if (!file || !key) {
      return NextResponse.json({ error: 'Missing file or key' }, { status: 400 })
    }

    if (!file.type.startsWith('image/') && file.type !== 'application/pdf') {
      return NextResponse.json({ error: 'Invalid file type' }, { status: 400 })
    }

    if (file.size > 50 * 1024 * 1024) {
      return NextResponse.json({ error: 'File too large (max 50MB)' }, { status: 400 })
    }

    const buffer = Buffer.from(await file.arrayBuffer())
    await uploadToR2(key, buffer, file.type)

    // DB insert — create a Supabase client directly (bypassing @supabase/ssr)
    // and set the access token manually so it's clean for undici
    if (linkedType && linkedId) {
      const supabase = createSupabaseClient(
        process.env.NEXT_PUBLIC_SUPABASE_URL!,
        process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
        {
          auth: { persistSession: false },
          global: {
            headers: {
              Authorization: `Bearer ${auth.accessToken}`,
            },
          },
        }
      )

      const { error: dbError } = await supabase.from('photos').insert({
        user_id: auth.userId,
        file_path: key,
        thumbnail_path: thumbnailKey ?? key,
        linked_type: linkedType,
        linked_id: linkedId,
      })
      if (dbError) {
        console.error('DB insert failed:', dbError)
        return NextResponse.json({ error: `Failed to save record: ${dbError.message}` }, { status: 500 })
      }
    }

    return NextResponse.json({ key })
  } catch (err) {
    console.error('Upload failed:', err)
    const message = err instanceof Error ? err.message : 'Upload failed'
    return NextResponse.json({ error: message }, { status: 500 })
  }
}
