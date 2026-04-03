# R2 Photo Upload Fix — Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Migrate all file uploads and reads from Supabase Storage to Cloudflare R2 using presigned URLs, fixing the "Failed to fetch" upload bug on all platforms.

**Architecture:** Browser gets a presigned PUT URL from the API route (cookie-existence auth, no Supabase auth call), then PUTs the file directly to R2. Reads go through an API route that returns R2 signed GET URLs. No Supabase Storage SDK involvement.

**Tech Stack:** Cloudflare R2 (S3-compatible), `@aws-sdk/client-s3`, `@aws-sdk/s3-request-presigner`, Next.js API routes

**Spec:** `docs/superpowers/specs/2026-04-02-r2-photo-upload-fix-design.md`

---

## File Map

| File | Action | Purpose |
|------|--------|---------|
| `scripts/setup-r2-cors.ts` | Create | One-time script to set CORS on R2 bucket |
| `src/lib/storage.ts` | Rewrite | Remove Supabase dependency, use presigned R2 URLs |
| `src/app/api/storage/signed-url/route.ts` | Modify | Cookie-existence auth instead of `supabase.auth.getUser()` |
| `src/app/api/storage/presign/route.ts` | No change | Already correct |
| `src/app/(authenticated)/projects/[id]/client.tsx` | Modify | Remove supabase arg from upload, add error check on insert |
| `src/components/field/photo-gallery.tsx` | Modify | Remove supabase arg from getSignedUrl |
| `src/components/field/expense-form.tsx` | Modify | Remove supabase arg from uploadPhoto |
| `src/components/field/expense-list.tsx` | Modify | Remove supabase arg from getSignedUrl |
| `src/components/annotation/plan-upload.tsx` | Modify | Remove supabase arg from uploadPlanFile, fix auth check |
| `src/components/annotation/plan-canvas.tsx` | Modify | Remove supabase arg from getSignedUrl |
| `src/lib/offline/sync.ts` | Modify | Use presigned URL upload instead of Supabase Storage |

---

### Task 1: Set R2 CORS Configuration

**Files:**
- Create: `scripts/setup-r2-cors.ts`

- [ ] **Step 1: Create the CORS setup script**

```typescript
// scripts/setup-r2-cors.ts
import { S3Client, PutBucketCorsCommand } from '@aws-sdk/client-s3'
import * as dotenv from 'dotenv'
dotenv.config({ path: '.env.local' })

const r2Client = new S3Client({
  region: 'auto',
  endpoint: `https://${process.env.R2_ACCOUNT_ID}.r2.cloudflarestorage.com`,
  credentials: {
    accessKeyId: process.env.R2_ACCESS_KEY_ID!,
    secretAccessKey: process.env.R2_SECRET_ACCESS_KEY!,
  },
})

async function main() {
  await r2Client.send(
    new PutBucketCorsCommand({
      Bucket: process.env.R2_BUCKET ?? 'blue-shores',
      CORSConfiguration: {
        CORSRules: [
          {
            AllowedOrigins: [
              'https://blue-shores-pm.vercel.app',
              'http://localhost:3000',
            ],
            AllowedMethods: ['PUT', 'GET'],
            AllowedHeaders: ['Content-Type', 'Content-Length'],
            ExposeHeaders: ['ETag'],
            MaxAgeSeconds: 86400,
          },
        ],
      },
    })
  )
  console.log('R2 CORS configured successfully')
}

main().catch((err) => {
  console.error('Failed to set CORS:', err)
  process.exit(1)
})
```

- [ ] **Step 2: Run the script**

```bash
npx tsx scripts/setup-r2-cors.ts
```

Expected: `R2 CORS configured successfully`

- [ ] **Step 3: Verify CORS with curl**

```bash
curl -I -X OPTIONS \
  -H "Origin: https://blue-shores-pm.vercel.app" \
  -H "Access-Control-Request-Method: PUT" \
  -H "Access-Control-Request-Headers: Content-Type" \
  "https://3a749b288715efe8fa86dadeee7ccbb1.r2.cloudflarestorage.com/blue-shores/test-cors"
```

Expected: Response includes `Access-Control-Allow-Origin: https://blue-shores-pm.vercel.app` and `Access-Control-Allow-Methods` containing `PUT`.

- [ ] **Step 4: Commit**

```bash
git add scripts/setup-r2-cors.ts
git commit -m "feat: add R2 CORS setup script"
```

---

### Task 2: Rewrite `storage.ts` to Use R2 Presigned URLs

**Files:**
- Rewrite: `src/lib/storage.ts`

The key change: remove the `SupabaseClient` parameter from all functions. Uploads go through the presign API route → direct PUT to R2. Reads go through the signed-url API route.

- [ ] **Step 1: Rewrite storage.ts**

```typescript
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
  const uploadUrl = await getPresignedUploadUrl(key, contentType)
  const res = await fetch(uploadUrl, {
    method: 'PUT',
    body: file,
    headers: { 'Content-Type': contentType },
  })
  if (!res.ok) {
    throw new Error(`R2 upload failed: ${res.status} ${res.statusText}`)
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
```

- [ ] **Step 2: Commit**

```bash
git add src/lib/storage.ts
git commit -m "feat: rewrite storage.ts to use R2 presigned URLs"
```

---

### Task 3: Fix `signed-url/route.ts` Auth

**Files:**
- Modify: `src/app/api/storage/signed-url/route.ts`

Replace `supabase.auth.getUser()` with cookie-existence check (same pattern as the presign route). This avoids the iOS cookie header bug and is consistent with the presign route.

- [ ] **Step 1: Rewrite the route**

Replace the entire file with:

```typescript
import { NextResponse } from 'next/server'
import { cookies } from 'next/headers'
import { getR2SignedUrl } from '@/lib/r2'

export async function GET(request: Request) {
  // Cookie-existence auth — avoids supabase.auth.getUser() which
  // breaks on iOS due to invalid characters in auth cookies
  const cookieStore = await cookies()
  const authCookie = cookieStore.getAll().find(c =>
    c.name.includes('auth-token') || c.name.includes('sb-')
  )

  if (!authCookie) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

  const { searchParams } = new URL(request.url)
  const key = searchParams.get('key')
  const expiresIn = parseInt(searchParams.get('expiresIn') ?? '3600', 10)

  if (!key) {
    return NextResponse.json({ error: 'Missing key' }, { status: 400 })
  }

  try {
    const url = await getR2SignedUrl(key, expiresIn)
    return NextResponse.json({ url })
  } catch (err) {
    console.error('Signed URL failed:', err)
    return NextResponse.json({ error: 'Failed to generate signed URL' }, { status: 500 })
  }
}
```

- [ ] **Step 2: Commit**

```bash
git add src/app/api/storage/signed-url/route.ts
git commit -m "fix: signed-url route uses cookie-existence auth"
```

---

### Task 4: Update All Upload Consumers

**Files:**
- Modify: `src/app/(authenticated)/projects/[id]/client.tsx`
- Modify: `src/components/field/expense-form.tsx`
- Modify: `src/components/annotation/plan-upload.tsx`

All three files call `uploadPhoto(supabase, file, projectId)` or `uploadPlanFile(supabase, file, key)`. The new signatures drop the `supabase` argument.

- [ ] **Step 1: Update `client.tsx` photo upload**

In `src/app/(authenticated)/projects/[id]/client.tsx`:

Change line 138 from:
```typescript
      const { path, thumbnailPath } = await uploadPhoto(supabase, file, project.id)
```
to:
```typescript
      const { path, thumbnailPath } = await uploadPhoto(file, project.id)
```

Also add error checking on the DB insert. Change lines 139-145 from:
```typescript
      await supabase.from('photos').insert({
        user_id: userId,
        file_path: path,
        thumbnail_path: thumbnailPath,
        linked_type: 'project',
        linked_id: project.id,
      })
```
to:
```typescript
      const { error: insertError } = await supabase.from('photos').insert({
        user_id: userId,
        file_path: path,
        thumbnail_path: thumbnailPath,
        linked_type: 'project',
        linked_id: project.id,
      })
      if (insertError) throw new Error(`Failed to save photo record: ${insertError.message}`)
```

- [ ] **Step 2: Update `expense-form.tsx` receipt upload**

In `src/components/field/expense-form.tsx`:

Change line 46 from:
```typescript
        const { path, thumbnailPath } = await uploadPhoto(supabase, receiptFile, projectId)
```
to:
```typescript
        const { path, thumbnailPath } = await uploadPhoto(receiptFile, projectId)
```

- [ ] **Step 3: Update `plan-upload.tsx` blueprint upload**

In `src/components/annotation/plan-upload.tsx`:

Change line 48 from:
```typescript
      const { data: { user } } = await supabase.auth.getUser()
```
to:
```typescript
      const { data: { user } } = await supabase.auth.getSession()
        .then(({ data }) => ({ data: { user: data.session?.user ?? null } }))
```

Actually, the plan-upload uses `supabase.auth.getUser()` to get the user ID for the DB insert. Since we can't call `getUser()` (broken on iOS), but we need the user ID for the `uploaded_by` column, we should pass `userId` as a prop instead.

Change `plan-upload.tsx` props interface and component:

Add `userId` to the interface:
```typescript
interface PlanUploadProps {
  projectId: string
  userId: string
}
```

Update the component signature:
```typescript
export function PlanUpload({ projectId, userId }: PlanUploadProps) {
```

Remove the `supabase.auth.getUser()` call (lines 48-54) and replace `user.id` with `userId`:
```typescript
      setProgress('Uploading...')
      await uploadPlanFile(uploadFile, filePath)

      setProgress('Saving...')

      const { error: dbError } = await supabase.from('plans').insert({
        project_id: projectId,
        name: name.trim(),
        file_path: filePath,
        uploaded_by: userId,
      })
```

Change line 78 from:
```typescript
      await uploadPlanFile(supabase, uploadFile, filePath)
```
to:
```typescript
      await uploadPlanFile(uploadFile, filePath)
```

Then find where `PlanUpload` is rendered and pass `userId`. Search for `<PlanUpload` in the codebase and add the `userId` prop.

- [ ] **Step 4: Commit**

```bash
git add src/app/\(authenticated\)/projects/\[id\]/client.tsx src/components/field/expense-form.tsx src/components/annotation/plan-upload.tsx
git commit -m "fix: update all upload consumers for R2 presigned URLs"
```

---

### Task 5: Update All Read Consumers

**Files:**
- Modify: `src/components/field/photo-gallery.tsx`
- Modify: `src/components/field/expense-list.tsx`
- Modify: `src/components/annotation/plan-canvas.tsx`

All three call `getSignedUrl(supabase, path)`. The new signature is `getSignedUrl(path)`.

- [ ] **Step 1: Update `photo-gallery.tsx`**

In `src/components/field/photo-gallery.tsx`:

Remove the supabase import and hook:
```typescript
// Remove: import { useSupabase } from '@/hooks/use-supabase'
// Remove: const supabase = useSupabase()
```

Change line 34 from:
```typescript
            const url = await getSignedUrl(supabase, path)
```
to:
```typescript
            const url = await getSignedUrl(path)
```

Remove `supabase` from the `useEffect` dependency array (line 44):
```typescript
  }, [photos])
```

In the `LightBox` component, remove the supabase hook and update the call:
```typescript
// Remove: const supabase = useSupabase()
```

Change line 171 from:
```typescript
    getSignedUrl(supabase, photo.file_path).then(setFullUrl)
```
to:
```typescript
    getSignedUrl(photo.file_path).then(setFullUrl)
```

Remove `supabase` from that `useEffect` dependency array:
```typescript
  }, [photo])
```

- [ ] **Step 2: Update `expense-list.tsx`**

In `src/components/field/expense-list.tsx`:

Remove the supabase import and hook:
```typescript
// Remove: import { useSupabase } from '@/hooks/use-supabase'
// Remove: const supabase = useSupabase()
```

Change line 49 from:
```typescript
            const url = await getSignedUrl(supabase, path)
```
to:
```typescript
            const url = await getSignedUrl(path)
```

Remove `supabase` from the `useEffect` dependency array.

- [ ] **Step 3: Update `plan-canvas.tsx`**

In `src/components/annotation/plan-canvas.tsx`:

Remove the supabase import and hook (if supabase is still needed for other operations in this file, only remove it from the `getSignedUrl` call):
```typescript
// Check if supabase is used elsewhere in the file first
```

Change line 50 from:
```typescript
      const url = await getSignedUrl(supabase, filePath)
```
to:
```typescript
      const url = await getSignedUrl(filePath)
```

Remove `supabase` from that `useEffect` dependency array.

- [ ] **Step 4: Commit**

```bash
git add src/components/field/photo-gallery.tsx src/components/field/expense-list.tsx src/components/annotation/plan-canvas.tsx
git commit -m "fix: update all read consumers for R2 signed URLs"
```

---

### Task 6: Update Offline Sync

**Files:**
- Modify: `src/lib/offline/sync.ts`

The offline sync uploads photos via `supabase.storage.upload()`. Change it to use the presigned URL flow (the same `uploadToR2` approach). Since offline sync only runs when the device is back online, the presigned URL API route will be accessible.

- [ ] **Step 1: Update the upload_photo case in sync.ts**

Change the `upload_photo` case (around line 47-67) from:
```typescript
      case 'upload_photo': {
        const db = await getDB()
        const photoRecord = await db.get('photos', op.data.photoId as string)
        if (photoRecord) {
          const { error: uploadError } = await supabase.storage
            .from('project-files')
            .upload(op.data.filePath as string, photoRecord.blob, {
              contentType: 'image/jpeg',
            })
          if (uploadError) throw uploadError
```
to:
```typescript
      case 'upload_photo': {
        const db = await getDB()
        const photoRecord = await db.get('photos', op.data.photoId as string)
        if (photoRecord) {
          // Get presigned URL and upload directly to R2
          const presignRes = await fetch('/api/storage/presign', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
              key: op.data.filePath as string,
              contentType: 'image/jpeg',
            }),
          })
          if (!presignRes.ok) throw new Error('Failed to get presigned URL')
          const { uploadUrl } = await presignRes.json()

          const uploadRes = await fetch(uploadUrl, {
            method: 'PUT',
            body: photoRecord.blob,
            headers: { 'Content-Type': 'image/jpeg' },
          })
          if (!uploadRes.ok) throw new Error(`R2 upload failed: ${uploadRes.status}`)
```

The rest of the case (DB insert + cleanup) stays the same.

- [ ] **Step 2: Commit**

```bash
git add src/lib/offline/sync.ts
git commit -m "fix: offline sync uses R2 presigned URLs"
```

---

### Task 7: Find and Pass `userId` to `PlanUpload`

**Files:**
- Potentially modify: parent component that renders `<PlanUpload>`

- [ ] **Step 1: Find where PlanUpload is rendered**

```bash
grep -rn "PlanUpload" src/ --include="*.tsx"
```

Find the parent component and add `userId` prop. The `userId` is typically available from the server component and passed down. Follow the same pattern used for `PhotoCapture`'s `userId` in `client.tsx`.

- [ ] **Step 2: Pass userId to PlanUpload**

In whatever file renders `<PlanUpload projectId={...} />`, change it to:
```typescript
<PlanUpload projectId={...} userId={userId} />
```

- [ ] **Step 3: Commit**

```bash
git add <modified-file>
git commit -m "fix: pass userId to PlanUpload component"
```

---

### Task 8: Clean Up Unused Supabase Storage Imports

**Files:**
- Modify: any file that still imports `useSupabase` only for storage operations

- [ ] **Step 1: Check for unused imports**

After all changes, grep for files that import `useSupabase` but no longer need it (because storage was the only reason). Remove unused imports.

Also remove `import type { SupabaseClient } from '@supabase/supabase-js'` from `storage.ts` (it was removed in the rewrite but verify).

- [ ] **Step 2: Verify build**

```bash
npm run build
```

Expected: Build succeeds with no TypeScript errors. There may be warnings — address any related to the changed files.

- [ ] **Step 3: Commit**

```bash
git add -A
git commit -m "chore: remove unused Supabase Storage imports"
```

---

### Task 9: Deploy and Test

- [ ] **Step 1: Push to a feature branch**

```bash
git checkout -b fix/r2-photo-upload
git push -u origin fix/r2-photo-upload
```

This triggers a Vercel preview deploy.

- [ ] **Step 2: Test on the preview deploy**

1. Log in as Joe (joe@blueshoresnc.com)
2. Navigate to a project
3. Click Upload → select an image
4. Verify: photo uploads without error, appears in the gallery
5. Click the photo → verify lightbox loads the full image
6. Test on mobile (iOS Safari) if available
7. Test blueprint upload
8. Test expense receipt upload

- [ ] **Step 3: Create PR**

```bash
gh pr create --title "fix: R2 photo upload with presigned URLs" --body "..."
```
