// Photo storage helpers
// Currently uses Supabase Storage. Will migrate to Cloudflare R2
// when credentials are available — same interface, just swap the upload target.

import type { SupabaseClient } from '@supabase/supabase-js'

const ALLOWED_MIMES = ['image/jpeg', 'image/png', 'image/gif', 'image/webp', 'image/heic']
const MAX_PHOTO_SIZE = 10 * 1024 * 1024 // 10MB

export async function uploadPhoto(
  supabase: SupabaseClient,
  file: File,
  projectId: string
): Promise<{ path: string; thumbnailPath: string }> {
  if (!ALLOWED_MIMES.includes(file.type)) {
    throw new Error(`File type "${file.type}" is not allowed. Accepted types: JPEG, PNG, GIF, WebP, HEIC.`)
  }
  if (file.size > MAX_PHOTO_SIZE) {
    throw new Error(`File size (${(file.size / (1024 * 1024)).toFixed(1)} MB) exceeds the 10 MB limit.`)
  }

  const MIME_TO_EXT: Record<string, string> = {
    'image/jpeg': 'jpg',
    'image/png': 'png',
    'image/gif': 'gif',
    'image/webp': 'webp',
    'image/heic': 'heic',
  }
  const timestamp = Date.now()
  const ext = MIME_TO_EXT[file.type] ?? 'jpg'
  const path = `projects/${projectId}/photos/${timestamp}.${ext}`
  const thumbnailPath = `projects/${projectId}/photos/thumb_${timestamp}.${ext}`

  // Upload original
  const { error: uploadError } = await supabase.storage
    .from('project-files')
    .upload(path, file, { contentType: file.type })

  if (uploadError) throw uploadError

  // Create thumbnail via canvas
  const thumbnailBlob = await createThumbnail(file, 300)
  await supabase.storage
    .from('project-files')
    .upload(thumbnailPath, thumbnailBlob, { contentType: file.type })

  return { path, thumbnailPath }
}

export function getSignedUrl(
  supabase: SupabaseClient,
  path: string,
  expiresIn = 3600
): Promise<string> {
  return supabase.storage
    .from('project-files')
    .createSignedUrl(path, expiresIn)
    .then(({ data, error }) => {
      if (error) throw error
      return data.signedUrl
    })
}

async function createThumbnail(file: File, maxSize: number): Promise<Blob> {
  return new Promise((resolve, reject) => {
    const img = new Image()
    const url = URL.createObjectURL(file)

    img.onload = () => {
      URL.revokeObjectURL(url)
      const canvas = document.createElement('canvas')
      const ctx = canvas.getContext('2d')
      if (!ctx) return reject(new Error('Canvas not supported'))

      let { width, height } = img
      if (width > height) {
        if (width > maxSize) {
          height = (height * maxSize) / width
          width = maxSize
        }
      } else {
        if (height > maxSize) {
          width = (width * maxSize) / height
          height = maxSize
        }
      }

      canvas.width = width
      canvas.height = height
      ctx.drawImage(img, 0, 0, width, height)

      canvas.toBlob(
        (blob) => (blob ? resolve(blob) : reject(new Error('Failed to create thumbnail'))),
        file.type,
        0.7
      )
    }

    img.onerror = () => reject(new Error('Failed to load image'))
    img.src = url
  })
}
