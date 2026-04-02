import { describe, it, expect, vi } from 'vitest'
import { processOperation } from '@/lib/offline/sync'

// Mock Supabase client
const mockSupabase = {
  from: vi.fn().mockReturnValue({
    insert: vi.fn().mockResolvedValue({ data: null, error: null }),
    update: vi.fn().mockReturnValue({
      eq: vi.fn().mockResolvedValue({ data: null, error: null }),
    }),
  }),
  storage: {
    from: vi.fn().mockReturnValue({
      upload: vi.fn().mockResolvedValue({ error: null }),
    }),
  },
}

describe('Sync Manager', () => {
  it('processes a create_note operation', async () => {
    const result = await processOperation(mockSupabase as any, {
      id: '1',
      type: 'create_note',
      table: 'notes',
      data: { content: 'Test', linked_type: 'project', linked_id: 'p1', user_id: 'u1' },
      timestamp: new Date().toISOString(),
      retries: 0,
    })
    expect(result.success).toBe(true)
  })

  it('processes a create_time_entry operation', async () => {
    const result = await processOperation(mockSupabase as any, {
      id: '2',
      type: 'create_time_entry',
      table: 'time_entries',
      data: {
        user_id: 'u1',
        project_id: 'p1',
        start_time: '2026-04-01T09:00:00Z',
        end_time: '2026-04-01T17:00:00Z',
        duration_minutes: 480,
        method: 'clock',
      },
      timestamp: new Date().toISOString(),
      retries: 0,
    })
    expect(result.success).toBe(true)
  })
})
