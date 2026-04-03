import { NextResponse } from 'next/server'
import { cookies } from 'next/headers'
import { getR2SignedUrl } from '@/lib/r2'

export async function GET(request: Request) {
  // Cookie-existence auth — avoids supabase.auth.getUser() which
  // breaks on iOS due to invalid characters in auth cookies
  const cookieStore = await cookies()
  const authCookie = cookieStore.getAll().find(c =>
    c.name.includes('auth-token') || c.name.includes('sb-')
  )

  if (!authCookie) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

  const { searchParams } = new URL(request.url)
  const key = searchParams.get('key')
  const expiresIn = parseInt(searchParams.get('expiresIn') ?? '3600', 10)

  if (!key) {
    return NextResponse.json({ error: 'Missing key' }, { status: 400 })
  }

  try {
    const url = await getR2SignedUrl(key, expiresIn)
    return NextResponse.json({ url })
  } catch (err) {
    console.error('Signed URL failed:', err)
    return NextResponse.json({ error: 'Failed to generate signed URL' }, { status: 500 })
  }
}
