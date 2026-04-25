import { NextResponse } from 'next/server'
import { requireAdmin } from '@/lib/api/admin'

function parseQuantity(raw: unknown): number | null {
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

/**
 * Add a line item to a quote. Two paths:
 *   1) { material_id, quantity } — server snapshots material name/unit/price/phase
 *      from the materials + material_categories tables.
 *   2) { material_name, unit, unit_price, quantity, phase } — custom item; not
 *      linked back to any material row. Useful for one-off items the user
 *      doesn't want to add to the main materials list.
 */
export async function POST(
  request: Request,
  context: { params: Promise<{ id: string }> },
) {
  const { id: quoteId } = await context.params
  if (!quoteId) {
    return NextResponse.json({ error: 'Missing quote id' }, { status: 400 })
  }

  const auth = await requireAdmin()
  if ('error' in auth) return auth.error
  const { supabase } = auth

  const body = await request.json().catch(() => null)
  if (!body || typeof body !== 'object') {
    return NextResponse.json({ error: 'Invalid JSON' }, { status: 400 })
  }

  const quantity = parseQuantity(body.quantity ?? 1)
  if (quantity === null) {
    return NextResponse.json(
      { error: 'quantity must be a number ≥ 0' },
      { status: 400 },
    )
  }

  // Confirm the quote exists and is editable (not converted)
  const { data: quote, error: quoteError } = await supabase
    .from('quotes')
    .select('id, status')
    .eq('id', quoteId)
    .maybeSingle()
  if (quoteError) {
    return NextResponse.json({ error: quoteError.message }, { status: 500 })
  }
  if (!quote) {
    return NextResponse.json({ error: 'Quote not found' }, { status: 404 })
  }
  if (quote.status === 'converted') {
    return NextResponse.json(
      { error: 'Cannot edit line items on a converted quote' },
      { status: 409 },
    )
  }

  // Determine snapshot fields
  let snapshot: {
    material_id: string | null
    material_name: string
    unit: string
    unit_price: number
    phase: string
  }

  if ('material_id' in body && body.material_id) {
    if (typeof body.material_id !== 'string') {
      return NextResponse.json(
        { error: 'material_id must be a string' },
        { status: 400 },
      )
    }
    const { data: material, error: matError } = await supabase
      .from('materials')
      .select('id, name, unit, price, category_id, material_categories(name)')
      .eq('id', body.material_id)
      .maybeSingle()
    if (matError) {
      return NextResponse.json({ error: matError.message }, { status: 500 })
    }
    if (!material) {
      return NextResponse.json({ error: 'Material not found' }, { status: 404 })
    }
    const cat = material.material_categories as { name: string } | { name: string }[] | null
    const phaseName = Array.isArray(cat) ? cat[0]?.name : cat?.name
    snapshot = {
      material_id: material.id,
      material_name: material.name,
      unit: material.unit,
      unit_price: Number(material.price),
      phase: phaseName ?? 'Misc/Other',
    }
  } else {
    if (typeof body.material_name !== 'string' || !body.material_name.trim()) {
      return NextResponse.json(
        { error: 'material_name is required for a custom item' },
        { status: 400 },
      )
    }
    if (typeof body.unit !== 'string' || !body.unit.trim()) {
      return NextResponse.json({ error: 'unit is required' }, { status: 400 })
    }
    const unitPrice = parseQuantity(body.unit_price)
    if (unitPrice === null) {
      return NextResponse.json(
        { error: 'unit_price must be a number ≥ 0' },
        { status: 400 },
      )
    }
    if (typeof body.phase !== 'string' || !body.phase.trim()) {
      return NextResponse.json({ error: 'phase is required' }, { status: 400 })
    }
    snapshot = {
      material_id: null,
      material_name: body.material_name.trim(),
      unit: body.unit.trim(),
      unit_price: unitPrice,
      phase: body.phase.trim(),
    }
  }

  // Compute next sort_order within this quote
  const { data: existing } = await supabase
    .from('quote_line_items')
    .select('sort_order')
    .eq('quote_id', quoteId)
    .order('sort_order', { ascending: false })
    .limit(1)
  const nextSortOrder = existing && existing.length > 0 ? existing[0].sort_order + 1 : 0

  const { data, error } = await supabase
    .from('quote_line_items')
    .insert({
      quote_id: quoteId,
      ...snapshot,
      quantity,
      sort_order: nextSortOrder,
    })
    .select()
    .single()

  if (error || !data) {
    return NextResponse.json(
      { error: error?.message ?? 'Failed to add line item' },
      { status: 500 },
    )
  }

  return NextResponse.json({ line_item: data }, { status: 201 })
}
