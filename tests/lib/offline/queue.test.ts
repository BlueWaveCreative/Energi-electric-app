import { describe, it, expect, beforeEach, vi } from 'vitest'

// Mock idb for unit tests
const mockStore: any[] = []
vi.mock('idb', () => ({
  openDB: vi.fn().mockResolvedValue({
    add: vi.fn((_store: string, item: any) => { mockStore.push(item); return item.id }),
    getAll: vi.fn(() => [...mockStore]),
    delete: vi.fn((_store: string, id: string) => {
      const idx = mockStore.findIndex((i) => i.id === id)
      if (idx >= 0) mockStore.splice(idx, 1)
    }),
    clear: vi.fn(() => { mockStore.length = 0 }),
  }),
}))

import { addToQueue, getQueuedOperations, removeFromQueue, clearQueue, type QueuedOperation } from '@/lib/offline/queue'

describe('Offline Queue', () => {
  beforeEach(() => {
    mockStore.length = 0
  })

  it('adds an operation to the queue', async () => {
    await addToQueue({
      type: 'create_note',
      table: 'notes',
      data: { content: 'Test note', linked_type: 'project', linked_id: 'p1' },
    })
    const ops = await getQueuedOperations()
    expect(ops).toHaveLength(1)
    expect(ops[0].type).toBe('create_note')
  })

  it('removes an operation from the queue', async () => {
    await addToQueue({
      type: 'create_note',
      table: 'notes',
      data: { content: 'Test' },
    })
    const ops = await getQueuedOperations()
    await removeFromQueue(ops[0].id)
    const remaining = await getQueuedOperations()
    expect(remaining).toHaveLength(0)
  })

  it('clears the entire queue', async () => {
    await addToQueue({ type: 'create_note', table: 'notes', data: {} })
    await addToQueue({ type: 'create_time_entry', table: 'time_entries', data: {} })
    await clearQueue()
    const ops = await getQueuedOperations()
    expect(ops).toHaveLength(0)
  })
})
