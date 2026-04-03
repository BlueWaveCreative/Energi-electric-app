// Photo & plan storage
// Uses Supabase Storage for uploads (browser client handles auth via
// in-memory session token, avoiding the iOS Safari cookie header bug)
// Signed URLs fetched via Supabase Storage client

import type { SupabaseClient } from '@supabase/supabase-js'

const MAX_PHOTO_SIZE = 20 * 1024 * 1024 // 20MB

export async function uploadPhoto(
  supabase: SupabaseClient,
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

  // Upload directly to Supabase Storage using the browser client
  // The browser Supabase client uses an in-memory session token,
  // NOT cookies, so it avoids the iOS Safari header bug
  const { error: uploadError } = await supabase.storage
    .from('project-files')
    .upload(path, uploadFile, {
      contentType: 'image/jpeg',
      upsert: false,
    })

  if (uploadError) throw new Error(`Upload failed: ${uploadError.message}`)

  // Create and upload thumbnail (best-effort)
  try {
    const thumbnailBlob = await createThumbnail(file, 300)
    await supabase.storage
      .from('project-files')
      .upload(thumbnailPath, thumbnailBlob, {
        contentType: 'image/jpeg',
        upsert: false,
      })
    return { path, thumbnailPath }
  } catch {
    return { path, thumbnailPath: path }
  }
}

export async function uploadPlanFile(
  supabase: SupabaseClient,
  file: File | Blob,
  key: string
): Promise<void> {
  const contentType = file instanceof File ? file.type : 'image/png'
  const { error } = await supabase.storage
    .from('project-files')
    .upload(key, file, { contentType, upsert: false })

  if (error) throw new Error(`Plan upload failed: ${error.message}`)
}

export async function getSignedUrl(
  supabase: SupabaseClient,
  path: string,
  expiresIn = 3600
): Promise<string> {
  const { data, error } = await supabase.storage
    .from('project-files')
    .createSignedUrl(path, expiresIn)

  if (error) throw error
  return data.signedUrl
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
