import { NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import { getR2UploadUrl } from '@/lib/r2'

export async function POST(request: Request) {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

  try {
    const { key, contentType } = await request.json()

    if (!key || typeof key !== 'string' || key.includes('..') || !key.startsWith('projects/')) {
      return NextResponse.json({ error: 'Invalid key' }, { status: 400 })
    }

    if (!contentType) {
      return NextResponse.json({ error: 'Missing contentType' }, { status: 400 })
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
