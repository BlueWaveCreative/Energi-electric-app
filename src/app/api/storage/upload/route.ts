import { NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import { uploadToR2 } from '@/lib/r2'

// Accept any image/* type + PDF for blueprints
const MAX_SIZE = 50 * 1024 * 1024 // 50MB (covers both photos and plans)

export async function POST(request: Request) {
  // Auth check
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

  const formData = await request.formData()
  const file = formData.get('file') as File | null
  const key = formData.get('key') as string | null

  if (!file || !key) {
    return NextResponse.json({ error: 'Missing file or key' }, { status: 400 })
  }

  // Validate type — accept any image/* or PDF for blueprints
  if (!file.type.startsWith('image/') && file.type !== 'application/pdf') {
    return NextResponse.json({ error: 'Invalid file type. Only images and PDFs are accepted.' }, { status: 400 })
  }

  if (file.size > MAX_SIZE) {
    return NextResponse.json({ error: 'File too large' }, { status: 400 })
  }

  const buffer = Buffer.from(await file.arrayBuffer())
  await uploadToR2(key, buffer, file.type)

  return NextResponse.json({ key })
}
