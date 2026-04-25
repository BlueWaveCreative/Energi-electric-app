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

export async function POST(request: Request) {
  const auth = await requireAdmin()
  if ('error' in auth) return auth.error
  const { supabase, userId } = auth

  const body = await request.json().catch(() => null)
  if (!body) {
    return NextResponse.json({ error: 'Invalid JSON' }, { status: 400 })
  }
  const { name, unit, price, category_id } = body as Record<string, unknown>

  if (typeof name !== 'string' || !name.trim()) {
    return NextResponse.json({ error: 'Name is required' }, { status: 400 })
  }
  if (
    typeof unit !== 'string' ||
    !VALID_UNITS.includes(unit as (typeof VALID_UNITS)[number])
  ) {
    return NextResponse.json(
      { error: `Unit must be one of ${VALID_UNITS.join(', ')}` },
      { status: 400 },
    )
  }
  const priceNum = parsePrice(price)
  if (priceNum === null) {
    return NextResponse.json({ error: 'Price must be a number ≥ 0' }, { status: 400 })
  }
  if (typeof category_id !== 'string' || !category_id) {
    return NextResponse.json({ error: 'category_id is required' }, { status: 400 })
  }

  const trimmedName = name.trim()

  // Look up any existing material with the same name + category. If active,
  // reject as a duplicate (so user gets a clear message instead of a 500).
  // If soft-deleted, reactivate it. Same pattern as the import route.
  const { data: existing } = await supabase
    .from('materials')
    .select('id, active')
    .eq('name', trimmedName)
    .eq('category_id', category_id)
    .maybeSingle()

  if (existing) {
    if (existing.active) {
      return NextResponse.json(
        { error: 'A material with this name already exists in that category' },
        { status: 409 },
      )
    }
    const { data, error } = await supabase
      .from('materials')
      .update({ active: true, unit, price: priceNum })
      .eq('id', existing.id)
      .select()
      .single()
    if (error || !data) {
      return NextResponse.json(
        { error: error?.message ?? 'Failed to reactivate material' },
        { status: 500 },
      )
    }
    return NextResponse.json({ material: data, reactivated: true })
  }

  const { data, error } = await supabase
    .from('materials')
    .insert({
      name: trimmedName,
      unit,
      price: priceNum,
      category_id,
      created_by: userId,
    })
    .select()
    .single()

  if (error || !data) {
    return NextResponse.json(
      { error: error?.message ?? 'Failed to create material' },
      { status: 500 },
    )
  }

  return NextResponse.json({ material: data }, { status: 201 })
}
