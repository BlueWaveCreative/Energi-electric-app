// src/lib/storage.ts
// Photo & plan storage via Cloudflare R2
// Uploads: browser gets presigned PUT URL from API route, PUTs directly to R2
// Reads: browser gets signed GET URL from API route

const MAX_PHOTO_SIZE = 20 * 1024 * 1024 // 20MB

async function getPresignedUploadUrl(
  key: string,
  contentType: string
): Promise<string> {
  const res = await fetch('/api/storage/presign', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ key, contentType }),
  })
  if (!res.ok) {
    const body = await res.json().catch(() => ({ error: res.statusText }))
    throw new Error(body.error ?? `Presign failed: ${res.status}`)
  }
  const { uploadUrl } = await res.json()
  return uploadUrl
}

async function uploadToR2(
  key: string,
  file: File | Blob,
  contentType: string
): Promise<void> {
  let uploadUrl: string
  try {
    uploadUrl = await getPresignedUploadUrl(key, contentType)
  } catch (err) {
    throw new Error(`Presign step failed: ${err instanceof Error ? err.message : err}`)
  }

  try {
    const res = await fetch(uploadUrl, {
      method: 'PUT',
      body: file,
      headers: { 'Content-Type': contentType },
    })
    if (!res.ok) {
      const text = await res.text().catch(() => '')
      throw new Error(`R2 upload failed: ${res.status} ${res.statusText} ${text}`)
    }
  } catch (err) {
    if (err instanceof Error && err.message.startsWith('R2 upload failed'))
      throw err
    throw new Error(`R2 PUT failed: ${err instanceof Error ? err.message : err}`)
  }
}

export async function uploadPhoto(
  file: File,
  projectId: string
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

  await uploadToR2(path, uploadFile, 'image/jpeg')

  // Create and upload thumbnail (best-effort)
  try {
    const thumbnailBlob = await createThumbnail(file, 300)
    await uploadToR2(thumbnailPath, thumbnailBlob, 'image/jpeg')
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
  await uploadToR2(key, file, contentType)
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
