// src/lib/storage.ts
// Photo & plan storage via Cloudflare R2
// Uploads: POST file to /api/storage/upload (same-origin, no CORS issues)
// Reads: GET signed URL from /api/storage/signed-url

const MAX_PHOTO_SIZE = 20 * 1024 * 1024 // 20MB

async function sendToR2(
  key: string,
  file: File | Blob,
  contentType: string,
  metadata?: { linkedType: string; linkedId: string; thumbnailKey?: string }
): Promise<void> {
  const formData = new FormData()
  formData.append('file', file instanceof File ? file : new File([file], 'upload', { type: contentType }))
  formData.append('key', key)

  // Pass metadata so the server handles the DB insert too
  if (metadata) {
    formData.append('linkedType', metadata.linkedType)
    formData.append('linkedId', metadata.linkedId)
    if (metadata.thumbnailKey) formData.append('thumbnailKey', metadata.thumbnailKey)
  }

  const res = await fetch('/api/storage/upload', {
    method: 'POST',
    body: formData,
  })
  if (!res.ok) {
    const body = await res.json().catch(() => ({ error: res.statusText }))
    throw new Error(body.error ?? `Upload failed: ${res.status}`)
  }
}

export async function uploadPhoto(
  file: File,
  projectId: string,
  linkedType?: string,
  linkedId?: string
): Promise<{ path: string; thumbnailPath: string }> {
  if (!file.type.startsWith('image/')) {
    throw new Error(`File type "${file.type}" is not allowed. Only image files are accepted.`)
  }
  if (file.size > MAX_PHOTO_SIZE) {
    throw new Error(`File size (${(file.size / (1024 * 1024)).toFixed(1)} MB) exceeds the 20 MB limit.`)
  }

  const timestamp = Date.now()
  const path = `projects/${projectId}/photos/${timestamp}.jpg`
  const thumbnailPath = `projects/${projectId}/photos/thumb_${timestamp}.jpg`

  // Compress the photo client-side before uploading
  let uploadFile: File | Blob = file
  try {
    uploadFile = await compressImage(file, 2048, 0.85)
  } catch {
    // If compression fails (HEIC on some browsers), upload original
  }

  // Upload photo — server handles R2 upload AND DB insert if metadata provided
  await sendToR2(path, uploadFile, 'image/jpeg',
    linkedType && linkedId ? { linkedType, linkedId, thumbnailKey: thumbnailPath } : undefined
  )

  // Create and upload thumbnail (best-effort, no DB record needed)
  try {
    const thumbnailBlob = await createThumbnail(file, 300)
    await sendToR2(thumbnailPath, thumbnailBlob, 'image/jpeg')
    return { path, thumbnailPath }
  } catch {
    return { path, thumbnailPath: path }
  }
}

export async function uploadPlanFile(
  file: File | Blob,
  key: string
): Promise<void> {
  const contentType = file instanceof File ? file.type : 'image/png'
  await sendToR2(key, file, contentType)
}

export async function getSignedUrl(
  path: string,
  expiresIn = 3600
): Promise<string> {
  const res = await fetch(
    `/api/storage/signed-url?key=${encodeURIComponent(path)}&expiresIn=${expiresIn}`
  )
  if (!res.ok) {
    const body = await res.json().catch(() => ({ error: res.statusText }))
    throw new Error(body.error ?? `Failed to get signed URL: ${res.status}`)
  }
  const { url } = await res.json()
  return url
}

async function createThumbnail(file: File | Blob, maxSize: number): Promise<Blob> {
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
        'image/jpeg',
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
