import { NextResponse } from 'next/server'
import type { SupabaseClient } from '@supabase/supabase-js'
import { requireAdmin } from '@/lib/api/admin'

function parseNumber(raw: unknown): number | null {
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

async function checkQuoteEditable(
  supabase: SupabaseClient,
  quoteId: string,
): Promise<NextResponse | null> {
  const { data: quote, error } = await supabase
    .from('quotes')
    .select('id, status')
    .eq('id', quoteId)
    .maybeSingle()
  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 })
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
  return null
}

export async function PATCH(
  request: Request,
  context: { params: Promise<{ id: string; lineId: string }> },
) {
  const { id: quoteId, lineId } = await context.params
  if (!quoteId || !lineId) {
    return NextResponse.json({ error: 'Missing id' }, { status: 400 })
  }

  const auth = await requireAdmin()
  if ('error' in auth) return auth.error
  const { supabase } = auth

  const blocked = await checkQuoteEditable(supabase, quoteId)
  if (blocked) return blocked

  const body = await request.json().catch(() => null)
  if (!body || typeof body !== 'object') {
    return NextResponse.json({ error: 'Invalid JSON' }, { status: 400 })
  }

  const updates: Record<string, unknown> = {}
  if ('quantity' in body) {
    const q = parseNumber(body.quantity)
    if (q === null) {
      return NextResponse.json(
        { error: 'quantity must be a number ≥ 0' },
        { status: 400 },
      )
    }
    updates.quantity = q
  }
  if ('unit_price' in body) {
    const p = parseNumber(body.unit_price)
    if (p === null) {
      return NextResponse.json(
        { error: 'unit_price must be a number ≥ 0' },
        { status: 400 },
      )
    }
    updates.unit_price = p
  }

  if (Object.keys(updates).length === 0) {
    return NextResponse.json({ error: 'No fields to update' }, { status: 400 })
  }

  const { data, error } = await supabase
    .from('quote_line_items')
    .update(updates)
    .eq('id', lineId)
    .eq('quote_id', quoteId)
    .select()
    .single()

  if (error) {
    if (error.code === 'PGRST116') {
      return NextResponse.json({ error: 'Line item not found' }, { status: 404 })
    }
    return NextResponse.json({ error: error.message }, { status: 500 })
  }
  if (!data) {
    return NextResponse.json({ error: 'Line item not found' }, { status: 404 })
  }

  return NextResponse.json({ line_item: data })
}

export async function DELETE(
  _request: Request,
  context: { params: Promise<{ id: string; lineId: string }> },
) {
  const { id: quoteId, lineId } = await context.params
  if (!quoteId || !lineId) {
    return NextResponse.json({ error: 'Missing id' }, { status: 400 })
  }

  const auth = await requireAdmin()
  if ('error' in auth) return auth.error
  const { supabase } = auth

  const blocked = await checkQuoteEditable(supabase, quoteId)
  if (blocked) return blocked

  const { data, error } = await supabase
    .from('quote_line_items')
    .delete()
    .eq('id', lineId)
    .eq('quote_id', quoteId)
    .select('id')
    .single()

  if (error) {
    if (error.code === 'PGRST116') {
      return NextResponse.json({ error: 'Line item not found' }, { status: 404 })
    }
    return NextResponse.json({ error: error.message }, { status: 500 })
  }
  if (!data) {
    return NextResponse.json({ error: 'Line item not found' }, { status: 404 })
  }

  return NextResponse.json({ ok: true })
}
