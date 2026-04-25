import { NextResponse } from 'next/server'
import { requireAdmin } from '@/lib/api/admin'

const VALID_UNITS = ['ft', 'ea', 'box', 'bag', 'set'] as const

function parsePrice(raw: unknown): number | null {
  if (typeof raw === 'number') {
    return Number.isFinite(raw) && raw >= 0 ? raw : null
  }
  if (typeof raw === 'string') {
    const trimmed = raw.trim()
    if (!trimmed) return null
    const n = Number(trimmed)
    return Number.isFinite(n) && n >= 0 ? n : null
  }
  return null
}

export async function PATCH(
  request: Request,
  context: { params: Promise<{ id: string }> },
) {
  const { id } = await context.params
  if (!id) {
    return NextResponse.json({ error: 'Missing id' }, { status: 400 })
  }

  const auth = await requireAdmin()
  if ('error' in auth) return auth.error
  const { supabase } = auth

  const body = await request.json().catch(() => null)
  if (!body || typeof body !== 'object') {
    return NextResponse.json({ error: 'Invalid JSON' }, { status: 400 })
  }
  const { name, unit, price, category_id } = body as Record<string, unknown>

  const updates: Record<string, unknown> = {}

  if (name !== undefined) {
    if (typeof name !== 'string' || !name.trim()) {
      return NextResponse.json({ error: 'Name must be non-empty' }, { status: 400 })
    }
    updates.name = name.trim()
  }
  if (unit !== undefined) {
    if (
      typeof unit !== 'string' ||
      !VALID_UNITS.includes(unit as (typeof VALID_UNITS)[number])
    ) {
      return NextResponse.json(
        { error: `Unit must be one of ${VALID_UNITS.join(', ')}` },
        { status: 400 },
      )
    }
    updates.unit = unit
  }
  if (price !== undefined) {
    const priceNum = parsePrice(price)
    if (priceNum === null) {
      return NextResponse.json({ error: 'Price must be a number ≥ 0' }, { status: 400 })
    }
    updates.price = priceNum
  }
  if (category_id !== undefined) {
    if (typeof category_id !== 'string' || !category_id) {
      return NextResponse.json({ error: 'category_id must be non-empty' }, { status: 400 })
    }
    updates.category_id = category_id
  }

  if (Object.keys(updates).length === 0) {
    return NextResponse.json({ error: 'No fields to update' }, { status: 400 })
  }

  const { data, error } = await supabase
    .from('materials')
    .update(updates)
    .eq('id', id)
    .select()
    .single()

  if (error) {
    // PostgREST returns PGRST116 when .single() finds zero rows.
    if (error.code === 'PGRST116') {
      return NextResponse.json({ error: 'Material not found' }, { status: 404 })
    }
    return NextResponse.json({ error: error.message }, { status: 500 })
  }
  if (!data) {
    return NextResponse.json({ error: 'Material not found' }, { status: 404 })
  }

  return NextResponse.json({ material: data })
}

export async function DELETE(
  _request: Request,
  context: { params: Promise<{ id: string }> },
) {
  const { id } = await context.params
  if (!id) {
    return NextResponse.json({ error: 'Missing id' }, { status: 400 })
  }

  const auth = await requireAdmin()
  if ('error' in auth) return auth.error
  const { supabase } = auth

  // Soft delete — preserves snapshots on existing quote line items.
  // Use .select().single() so an unknown id returns 404 instead of silent 200.
  const { data, error } = await supabase
    .from('materials')
    .update({ active: false })
    .eq('id', id)
    .select('id')
    .single()

  if (error) {
    if (error.code === 'PGRST116') {
      return NextResponse.json({ error: 'Material not found' }, { status: 404 })
    }
    return NextResponse.json({ error: error.message }, { status: 500 })
  }
  if (!data) {
    return NextResponse.json({ error: 'Material not found' }, { status: 404 })
  }

  return NextResponse.json({ ok: true })
}
