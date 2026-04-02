import { getDB } from './db'

export interface QueuedOperation {
  id: string
  type: string
  table: string
  data: Record<string, unknown>
  timestamp: string
  retries: number
}

export async function addToQueue(op: {
  type: string
  table: string
  data: Record<string, unknown>
}): Promise<string> {
  const db = await getDB()
  const id = crypto.randomUUID()
  const operation: QueuedOperation = {
    id,
    type: op.type,
    table: op.table,
    data: op.data,
    timestamp: new Date().toISOString(),
    retries: 0,
  }
  await db.add('queue', operation)
  return id
}

export async function getQueuedOperations(): Promise<QueuedOperation[]> {
  const db = await getDB()
  const ops = await db.getAll('queue')
  return ops.sort((a, b) => a.timestamp.localeCompare(b.timestamp))
}

export async function removeFromQueue(id: string): Promise<void> {
  const db = await getDB()
  await db.delete('queue', id)
}

export async function incrementRetry(id: string): Promise<void> {
  const db = await getDB()
  const op = await db.get('queue', id)
  if (op) {
    op.retries += 1
    await db.put('queue', op)
  }
}

export async function clearQueue(): Promise<void> {
  const db = await getDB()
  await db.clear('queue')
}

export async function getQueueSize(): Promise<number> {
  const ops = await getQueuedOperations()
  return ops.length
}
