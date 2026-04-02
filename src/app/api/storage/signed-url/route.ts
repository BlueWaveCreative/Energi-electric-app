import { NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import { getR2SignedUrl } from '@/lib/r2'

export async function GET(request: Request) {
  // Auth check
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

  const { searchParams } = new URL(request.url)
  const key = searchParams.get('key')

  if (!key) {
    return NextResponse.json({ error: 'Missing key' }, { status: 400 })
  }

  const url = await getR2SignedUrl(key)
  return NextResponse.json({ url })
}
