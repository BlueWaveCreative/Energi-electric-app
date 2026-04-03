import { NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import { getR2SignedUrl } from '@/lib/r2'

export async function GET(request: Request) {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

  const { searchParams } = new URL(request.url)
  const key = searchParams.get('key')

  if (!key || key.includes('..') || !key.startsWith('projects/')) {
    return NextResponse.json({ error: 'Invalid key' }, { status: 400 })
  }

  const MAX_EXPIRY = 86400 // 24 hours
  const expiresIn = Math.min(
    parseInt(searchParams.get('expiresIn') ?? '3600', 10),
    MAX_EXPIRY
  )

  try {
    const url = await getR2SignedUrl(key, expiresIn)
    return NextResponse.json({ url })
  } catch (err) {
    console.error('Signed URL failed:', err)
    return NextResponse.json({ error: 'Failed to generate signed URL' }, { status: 500 })
  }
}
