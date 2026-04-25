import { NextResponse } from 'next/server'
import { requireAdmin } from '@/lib/api/admin'

const VALID_STATUSES = new Set([
  'draft',
  'sent',
  'accepted',
  'declined',
  'expired',
  'converted',
])
const VALID_JOB_TYPES = new Set(['rough_in', 'trim_out', 'service'])

function parseNumber(raw: unknown, opts: { min?: number } = {}): number | null {
  if (typeof raw === 'number') {
    return Number.isFinite(raw) && (opts.min === undefined || raw >= opts.min)
      ? raw
      : null
  }
  if (typeof raw === 'string') {
    const trimmed = raw.trim()
    if (!trimmed) return null
    const n = Number(trimmed)
    return Number.isFinite(n) && (opts.min === undefined || n >= opts.min)
      ? n
      : null
  }
  return null
}

export async function PATCH(
  request: Request,
  context: { params: Promise<{ id: string }> },
) {
  const { id } = await context.params
  if (!id) return NextResponse.json({ error: 'Missing id' }, { status: 400 })

  const auth = await requireAdmin()
  if ('error' in auth) return auth.error
  const { supabase } = auth

  const body = await request.json().catch(() => null)
  if (!body || typeof body !== 'object') {
    return NextResponse.json({ error: 'Invalid JSON' }, { status: 400 })
  }

  const updates: Record<string, unknown> = {}

  // String fields
  if ('title' in body) {
    if (typeof body.title !== 'string' || !body.title.trim()) {
      return NextResponse.json({ error: 'Title must be non-empty' }, { status: 400 })
    }
    updates.title = body.title.trim()
  }
  if ('description' in body) {
    if (typeof body.description !== 'string') {
      return NextResponse.json(
        { error: 'description must be a string' },
        { status: 400 },
      )
    }
    updates.description = body.description
  }
  if ('notes' in body) {
    if (body.notes !== null && typeof body.notes !== 'string') {
      return NextResponse.json({ error: 'notes must be a string' }, { status: 400 })
    }
    updates.notes = body.notes
  }
  if ('status' in body) {
    if (typeof body.status !== 'string' || !VALID_STATUSES.has(body.status)) {
      return NextResponse.json(
        { error: `status must be one of ${[...VALID_STATUSES].join(', ')}` },
        { status: 400 },
      )
    }
    updates.status = body.status
    if (body.status === 'sent') {
      updates.sent_at = new Date().toISOString()
    }
  }
  if ('job_type' in body) {
    if (typeof body.job_type !== 'string' || !VALID_JOB_TYPES.has(body.job_type)) {
      return NextResponse.json(
        { error: `job_type must be one of ${[...VALID_JOB_TYPES].join(', ')}` },
        { status: 400 },
      )
    }
    updates.job_type = body.job_type
  }
  if ('valid_until' in body) {
    if (body.valid_until !== null && typeof body.valid_until !== 'string') {
      return NextResponse.json(
        { error: 'valid_until must be an ISO date string or null' },
        { status: 400 },
      )
    }
    updates.valid_until = body.valid_until
  }

  // Boolean toggles
  for (const flag of [
    'markup_enabled',
    'tax_enabled',
    'flat_fee_enabled',
  ] as const) {
    if (flag in body) {
      if (typeof body[flag] !== 'boolean') {
        return NextResponse.json(
          { error: `${flag} must be a boolean` },
          { status: 400 },
        )
      }
      updates[flag] = body[flag]
    }
  }

  // Numeric fields
  const numericFields: { key: string; min: number }[] = [
    { key: 'markup_percent', min: 0 },
    { key: 'tax_percent', min: 0 },
    { key: 'labor_rate', min: 0 },
    { key: 'labor_hours', min: 0 },
    { key: 'flat_fee', min: 0 },
  ]
  for (const { key, min } of numericFields) {
    if (key in body) {
      const n = parseNumber(body[key], { min })
      if (n === null) {
        return NextResponse.json(
          { error: `${key} must be a number ≥ ${min}` },
          { status: 400 },
        )
      }
      updates[key] = n
    }
  }

  if (Object.keys(updates).length === 0) {
    return NextResponse.json({ error: 'No fields to update' }, { status: 400 })
  }

  const { data, error } = await supabase
    .from('quotes')
    .update(updates)
    .eq('id', id)
    .select()
    .single()

  if (error) {
    if (error.code === 'PGRST116') {
      return NextResponse.json({ error: 'Quote not found' }, { status: 404 })
    }
    return NextResponse.json({ error: error.message }, { status: 500 })
  }
  if (!data) {
    return NextResponse.json({ error: 'Quote not found' }, { status: 404 })
  }

  return NextResponse.json({ quote: data })
}

export async function DELETE(
  _request: Request,
  context: { params: Promise<{ id: string }> },
) {
  const { id } = await context.params
  if (!id) return NextResponse.json({ error: 'Missing id' }, { status: 400 })

  const auth = await requireAdmin()
  if ('error' in auth) return auth.error
  const { supabase } = auth

  const { data, error } = await supabase
    .from('quotes')
    .delete()
    .eq('id', id)
    .select('id')
    .single()

  if (error) {
    if (error.code === 'PGRST116') {
      return NextResponse.json({ error: 'Quote not found' }, { status: 404 })
    }
    return NextResponse.json({ error: error.message }, { status: 500 })
  }
  if (!data) {
    return NextResponse.json({ error: 'Quote not found' }, { status: 404 })
  }

  return NextResponse.json({ ok: true })
}
