import { NextResponse } from 'next/server'
import { uploadToR2 } from '@/lib/r2'
import { createClient } from '@/lib/supabase/server'

export const maxDuration = 30

export async function POST(request: Request) {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()

  if (!user) {
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

    // Create DB record server-side if metadata provided
    if (linkedType && linkedId) {
      const { error: dbError } = await supabase.from('photos').insert({
        user_id: user.id,
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
