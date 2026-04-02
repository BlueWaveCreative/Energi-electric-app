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
  const path = `projects/${projectId}/photos/${timestamp}.jpg`
  const thumbnailPath = `projects/${projectId}/photos/thumb_${timestamp}.jpg`

  // Compress the photo client-side before uploading
  // Vercel has a ~4.5MB body limit on serverless functions
  // iPhone photos are often 5-15MB, so we resize to max 2048px and compress as JPEG
  let uploadFile: File | Blob = file
  try {
    uploadFile = await compressImage(file, 2048, 0.85)
  } catch {
    // If compression fails (HEIC on some browsers), upload original
  }

  // Upload compressed photo to R2
  await uploadToR2(path, uploadFile)

  // Create and upload thumbnail (best-effort)
  try {
    const thumbnailBlob = await createThumbnail(file, 300)
    await uploadToR2(thumbnailPath, thumbnailBlob)
    return { path, thumbnailPath }
  } catch {
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
  const contentType = file instanceof File ? file.type : 'image/jpeg'

  // Step 1: Get a presigned upload URL from our API
  const presignRes = await fetch('/api/storage/presign', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ key, contentType }),
  })

  if (!presignRes.ok) {
    const data = await presignRes.json().catch(() => ({ error: 'Failed to get upload URL' }))
    throw new Error(data.error ?? 'Failed to get upload URL')
  }

  const { uploadUrl } = await presignRes.json()

  // Step 2: Upload directly to R2 using the presigned URL
  // This bypasses Vercel's body size limit entirely
  const uploadRes = await fetch(uploadUrl, {
    method: 'PUT',
    headers: { 'Content-Type': contentType },
    body: file,
  })

  if (!uploadRes.ok) {
    throw new Error(`Upload failed: ${uploadRes.status} ${uploadRes.statusText}`)
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

async function compressImage(file: File, maxDimension: number, quality: number): Promise<Blob> {
  return new Promise((resolve, reject) => {
    const img = new Image()
    const url = URL.createObjectURL(file)

    img.onload = () => {
      URL.revokeObjectURL(url)
      const canvas = document.createElement('canvas')
      const ctx = canvas.getContext('2d')
      if (!ctx) return reject(new Error('Canvas not supported'))

      let { width, height } = img
      if (width > maxDimension || height > maxDimension) {
        if (width > height) {
          height = (height * maxDimension) / width
          width = maxDimension
        } else {
          width = (width * maxDimension) / height
          height = maxDimension
        }
      }

      canvas.width = width
      canvas.height = height
      ctx.drawImage(img, 0, 0, width, height)

      canvas.toBlob(
        (blob) => (blob ? resolve(blob) : reject(new Error('Failed to compress image'))),
        'image/jpeg',
        quality
      )
    }

    img.onerror = () => reject(new Error('Failed to load image for compression'))
    img.src = url
  })
}
