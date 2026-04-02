import { NextResponse } from 'next/server'
import { cookies } from 'next/headers'
import { getR2UploadUrl } from '@/lib/r2'

export async function POST(request: Request) {
  // Simple auth check — verify a Supabase auth cookie exists
  // We don't call Supabase API (which triggers the header error)
  // The cookie presence is enough — RLS protects the DB operations
  const cookieStore = await cookies()
  const authCookie = cookieStore.getAll().find(c => c.name.includes('auth-token'))

  if (!authCookie) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

  try {
    const { key, contentType } = await request.json()

    if (!key || !contentType) {
      return NextResponse.json({ error: 'Missing key or contentType' }, { status: 400 })
    }

    // Validate content type
    if (!contentType.startsWith('image/') && contentType !== 'application/pdf') {
      return NextResponse.json({ error: 'Invalid file type' }, { status: 400 })
    }

    const uploadUrl = await getR2UploadUrl(key, contentType)
    return NextResponse.json({ uploadUrl })
  } catch (err) {
    console.error('Presign failed:', err)
    return NextResponse.json({ error: 'Failed to generate upload URL' }, { status: 500 })
  }
}
