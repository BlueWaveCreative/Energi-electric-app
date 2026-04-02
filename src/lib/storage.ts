// Photo & plan storage via Cloudflare R2
// Uploads go through /api/storage/upload (server-side, auth-gated)
// Signed URLs via /api/storage/signed-url (server-side, auth-gated)

// Accept any image/* MIME type — covers JPEG, PNG, GIF, WebP, HEIC, HEIF, BMP, TIFF, etc.
// Android/iPhone cameras all produce image/* types
const ALLOWED_MIMES_PREFIX = 'image/'
const MAX_PHOTO_SIZE = 20 * 1024 * 1024 // 20MB (iPhone photos can be large)

const MIME_TO_EXT: Record<string, string> = {
  'image/jpeg': 'jpg',
  'image/png': 'png',
  'image/gif': 'gif',
  'image/webp': 'webp',
  'image/heic': 'heic',
  'image/heif': 'heif',
}

export async function uploadPhoto(
  _supabase: unknown, // kept for API compatibility — not used
  file: File,
  projectId: string
): Promise<{ path: string; thumbnailPath: string }> {
  if (!file.type.startsWith(ALLOWED_MIMES_PREFIX)) {
    throw new Error(`File type "${file.type}" is not allowed. Only image files are accepted.`)
  }
  if (file.size > MAX_PHOTO_SIZE) {
    throw new Error(`File size (${(file.size / (1024 * 1024)).toFixed(1)} MB) exceeds the 20 MB limit.`)
  }

  const timestamp = Date.now()
  const ext = MIME_TO_EXT[file.type] ?? 'jpg'
  const path = `projects/${projectId}/photos/${timestamp}.${ext}`
  const thumbnailPath = `projects/${projectId}/photos/thumb_${timestamp}.jpg`

  // Upload original to R2
  await uploadToR2(path, file)

  // Create and upload thumbnail (best-effort — HEIC/HEIF may not render in canvas)
  try {
    const thumbnailBlob = await createThumbnail(file, 300)
    await uploadToR2(thumbnailPath, thumbnailBlob)
    return { path, thumbnailPath }
  } catch {
    // Thumbnail failed (unsupported format on this browser) — use original as fallback
    return { path, thumbnailPath: path }
  }
}

export async function uploadPlanFile(
  file: File | Blob,
  key: string
): Promise<void> {
  await uploadToR2(key, file)
}

async function uploadToR2(key: string, file: File | Blob): Promise<void> {
  const formData = new FormData()
  formData.append('file', file)
  formData.append('key', key)

  const res = await fetch('/api/storage/upload', {
    method: 'POST',
    body: formData,
  })

  if (!res.ok) {
    const data = await res.json().catch(() => ({ error: 'Upload failed' }))
    throw new Error(data.error ?? 'Upload failed')
  }
}

export async function getSignedUrl(
  _supabase: unknown, // kept for API compatibility — not used
  path: string
): Promise<string> {
  const res = await fetch(`/api/storage/signed-url?key=${encodeURIComponent(path)}`)
  if (!res.ok) {
    throw new Error('Failed to get signed URL')
  }
  const data = await res.json()
  return data.url
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
