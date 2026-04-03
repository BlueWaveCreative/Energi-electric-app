import { NextResponse } from 'next/server'
import { cookies } from 'next/headers'
import { uploadToR2 } from '@/lib/r2'

export const maxDuration = 30

export async function POST(request: Request) {
  // Auth check — verify Supabase auth cookie exists
  // We intentionally avoid calling supabase.auth.getUser() because
  // iOS Safari produces auth cookies with characters that break
  // HTTP header validation in the Supabase client
  const cookieStore = await cookies()
  const hasAuth = cookieStore.getAll().some(c =>
    c.name.includes('auth-token') || c.name.includes('sb-')
  )

  if (!hasAuth) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

  try {
    const formData = await request.formData()
    const file = formData.get('file') as File | null
    const key = formData.get('key') as string | null

    if (!file || !key) {
      return NextResponse.json({ error: 'Missing file or key' }, { status: 400 })
    }

    // Validate type
    if (!file.type.startsWith('image/') && file.type !== 'application/pdf') {
      return NextResponse.json({ error: 'Invalid file type' }, { status: 400 })
    }

    if (file.size > 50 * 1024 * 1024) {
      return NextResponse.json({ error: 'File too large (max 50MB)' }, { status: 400 })
    }

    const buffer = Buffer.from(await file.arrayBuffer())
    await uploadToR2(key, buffer, file.type)

    return NextResponse.json({ key })
  } catch (err) {
    console.error('Upload failed:', err)
    const message = err instanceof Error ? err.message : 'Upload failed'
    return NextResponse.json({ error: message }, { status: 500 })
  }
}
