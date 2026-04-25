import { NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'

const VALID_UNITS = ['ft', 'ea', 'box', 'bag', 'set'] as const

async function requireAdmin() {
  const supabase = await createClient()
  const {
    data: { user },
  } = await supabase.auth.getUser()
  if (!user) {
    return { error: NextResponse.json({ error: 'Unauthorized' }, { status: 401 }) }
  }
  const { data: profile } = await supabase
    .from('profiles')
    .select('role')
    .eq('id', user.id)
    .single()
  if (profile?.role !== 'admin') {
    return { error: NextResponse.json({ error: 'Forbidden' }, { status: 403 }) }
  }
  return { supabase }
}

export async function PATCH(
  request: Request,
  context: { params: Promise<{ id: string }> },
) {
  const { id } = await context.params
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
    const priceNum = Number(price)
    if (!Number.isFinite(priceNum) || priceNum < 0) {
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

  if (error || !data) {
    return NextResponse.json(
      { error: error?.message ?? 'Failed to update material' },
      { status: 500 },
    )
  }

  return NextResponse.json({ material: data })
}

export async function DELETE(
  _request: Request,
  context: { params: Promise<{ id: string }> },
) {
  const { id } = await context.params
  const auth = await requireAdmin()
  if ('error' in auth) return auth.error
  const { supabase } = auth

  // Soft delete — preserves snapshots on existing quote line items.
  const { error } = await supabase
    .from('materials')
    .update({ active: false })
    .eq('id', id)

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 })
  }

  return NextResponse.json({ ok: true })
}
