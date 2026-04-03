# R2 Photo Upload Fix

**Date:** 2026-04-02
**Status:** Approved
**Scope:** Bug fix — migrate photo upload/read from broken Supabase Storage to Cloudflare R2

---

## Problem

Photo uploads fail on all platforms (desktop Chrome and iOS) with "Failed to fetch". Three stacked bugs:

1. **R2 CORS** — Browser PUT to R2 via presigned URL is blocked by missing/misconfigured CORS rules on the `blue-shores` bucket.
2. **signed-url route auth** — `GET /api/storage/signed-url` calls `supabase.auth.getUser()` which triggers the iOS cookie header bug. Even on desktop, this is fragile.
3. **Silent DB insert failure** — `photos` table insert in `client.tsx` doesn't check the Supabase response for errors, so failed inserts are invisible.

**Evidence:**
- 2 files exist in Supabase Storage (`storage.objects`) but 0 rows in `photos` table
- "Failed to fetch" error confirmed on desktop Chrome (screenshot)
- R2 bucket, API token, and server module (`src/lib/r2.ts`) all exist and work server-side

## Architecture

```
Browser                          Vercel API              Cloudflare R2
  |                                  |                        |
  |-- POST /api/storage/presign ---->|                        |
  |   (cookie-existence auth)        |-- getR2UploadUrl() --->|
  |                                  |<-- presigned PUT URL --|
  |<-- { uploadUrl } ---------------|                        |
  |                                                           |
  |-- PUT <presigned URL> ---------------------------------->|
  |   (file body, no auth header)    |                        |
  |<-- 200 OK ------------------------------------------------|
  |                                                           |
  |-- supabase.from('photos')        |                        |
  |   .insert({...})                 |                        |
  |   (browser client, in-memory     |                        |
  |    token, error checked)         |                        |
  |                                                           |
  |-- GET /api/storage/signed-url -->|                        |
  |   (cookie-existence auth)        |-- getR2SignedUrl() --->|
  |                                  |<-- signed GET URL -----|
  |<-- { url } -----------------|                        |
```

## Changes

### 1. R2 CORS Configuration

Set CORS on the `blue-shores` R2 bucket via S3 `PutBucketCors`:

```json
{
  "CORSRules": [{
    "AllowedOrigins": ["https://blue-shores-pm.vercel.app", "http://localhost:3000"],
    "AllowedMethods": ["PUT", "GET"],
    "AllowedHeaders": ["Content-Type", "Content-Length"],
    "ExposeHeaders": ["ETag"],
    "MaxAgeSeconds": 86400
  }]
}
```

One-time setup script using the existing `@aws-sdk/client-s3` dependency.

### 2. `src/lib/storage.ts` — Upload via presigned R2 URL

Replace `supabase.storage.upload()` with:
1. `fetch('/api/storage/presign', { method: 'POST', body: { key, contentType } })` to get presigned URL
2. `fetch(presignedUrl, { method: 'PUT', body: compressedFile, headers: { 'Content-Type': contentType } })` to upload directly to R2

Same compression/thumbnail logic, just different upload target.

For reading signed URLs: `fetch('/api/storage/signed-url?key=...')` instead of `supabase.storage.createSignedUrl()`.

Remove `SupabaseClient` parameter — functions no longer need the Supabase client for storage operations.

### 3. `src/app/api/storage/signed-url/route.ts` — Fix auth

Replace `supabase.auth.getUser()` with cookie-existence check (same pattern as presign route). This avoids the iOS cookie header bug entirely.

### 4. `src/app/(authenticated)/projects/[id]/client.tsx` — Error check DB insert

```typescript
const { error: insertError } = await supabase.from('photos').insert({...})
if (insertError) throw new Error(`Failed to save photo record: ${insertError.message}`)
```

### 5. `src/components/field/photo-gallery.tsx` — Read via R2

Replace `getSignedUrl(supabase, path)` with `getSignedUrl(path)` (the updated function that calls the API route).

### 6. `src/components/annotation/plan-upload.tsx` — Upload via R2

Update `uploadPlanFile()` call to use the new presigned URL flow.

## Files Modified

| File | Change |
|------|--------|
| `src/lib/storage.ts` | Presigned URL upload, API-based signed URLs |
| `src/app/api/storage/signed-url/route.ts` | Cookie-existence auth |
| `src/app/(authenticated)/projects/[id]/client.tsx` | Error checking on photos insert |
| `src/components/field/photo-gallery.tsx` | Remove Supabase dependency for URLs |
| `src/components/annotation/plan-upload.tsx` | Use new upload function |
| `scripts/setup-r2-cors.ts` | One-time CORS setup script |

## Not Changing

- `src/lib/r2.ts` — Already correct, works server-side
- `src/app/api/storage/presign/route.ts` — Already has cookie-existence auth, already excluded from middleware
- `src/app/api/storage/upload/route.ts` — Unused (direct upload), keep for potential fallback
- Supabase Storage bucket — Leave in place, existing files stay
- RLS policies — Already correct
