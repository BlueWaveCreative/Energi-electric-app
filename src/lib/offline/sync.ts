import type { SupabaseClient } from '@supabase/supabase-js'
import { getQueuedOperations, removeFromQueue, incrementRetry } from './queue'
import { getDB } from './db'
import { isOnline, onConnectivityChange } from '../connectivity'

const MAX_RETRIES = 5

interface SyncResult {
  success: boolean
  error?: string
}

export async function processOperation(
  supabase: SupabaseClient,
  op: {
    id: string
    type: string
    table: string
    data: Record<string, unknown>
    timestamp: string
    retries: number
  }
): Promise<SyncResult> {
  try {
    switch (op.type) {
      case 'create_note':
      case 'create_time_entry':
      case 'create_annotation': {
        const { error } = await supabase
          .from(op.table)
          .insert(op.data)
        if (error) throw error
        break
      }

      case 'update_phase_status':
      case 'update_task_status': {
        const { id: recordId, ...updateData } = op.data
        const { error } = await supabase
          .from(op.table)
          .update(updateData)
          .eq('id', recordId as string)
        if (error) throw error
        break
      }

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

          // Create photo record in DB
          const { error: dbError } = await supabase.from('photos').insert({
            user_id: op.data.user_id,
            file_path: op.data.filePath,
            thumbnail_path: op.data.thumbnailPath,
            caption: op.data.caption,
            linked_type: op.data.linked_type,
            linked_id: op.data.linked_id,
          })
          if (dbError) throw dbError

          // Clean up local blob
          await db.delete('photos', op.data.photoId as string)
        }
        break
      }

      default:
        return { success: false, error: `Unknown operation type: ${op.type}` }
    }

    return { success: true }
  } catch (err) {
    return {
      success: false,
      error: err instanceof Error ? err.message : 'Unknown error',
    }
  }
}

export async function syncQueue(supabase: SupabaseClient): Promise<{
  processed: number
  failed: number
  remaining: number
}> {
  if (!isOnline()) return { processed: 0, failed: 0, remaining: 0 }

  const operations = await getQueuedOperations()
  let processed = 0
  let failed = 0

  for (const op of operations) {
    if (op.retries >= MAX_RETRIES) {
      await removeFromQueue(op.id)
      failed++
      continue
    }

    const result = await processOperation(supabase, op)

    if (result.success) {
      await removeFromQueue(op.id)
      processed++
    } else {
      await incrementRetry(op.id)
      failed++
    }
  }

  const remaining = (await getQueuedOperations()).length
  return { processed, failed, remaining }
}

/**
 * Start the background sync listener.
 * Automatically syncs when connectivity is restored.
 */
export function startSyncListener(supabase: SupabaseClient): () => void {
  const cleanup = onConnectivityChange(async (online) => {
    if (online) {
      await syncQueue(supabase)
    }
  })

  // Also sync on page visibility change (user switches back to app)
  function handleVisibility() {
    if (document.visibilityState === 'visible' && isOnline()) {
      syncQueue(supabase)
    }
  }
  document.addEventListener('visibilitychange', handleVisibility)

  return () => {
    cleanup()
    document.removeEventListener('visibilitychange', handleVisibility)
  }
}
