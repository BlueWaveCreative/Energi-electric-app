import { NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'

const VALID_UNITS = ['ft', 'ea', 'box', 'bag', 'set'] as const

export async function POST(request: Request) {
  const supabase = await createClient()
  const {
    data: { user },
  } = await supabase.auth.getUser()
  if (!user) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

  const { data: profile } = await supabase
    .from('profiles')
    .select('role')
    .eq('id', user.id)
    .single()
  if (profile?.role !== 'admin') {
    return NextResponse.json({ error: 'Forbidden' }, { status: 403 })
  }

  const body = await request.json().catch(() => null)
  if (!body) {
    return NextResponse.json({ error: 'Invalid JSON' }, { status: 400 })
  }
  const { name, unit, price, category_id } = body as Record<string, unknown>

  if (typeof name !== 'string' || !name.trim()) {
    return NextResponse.json({ error: 'Name is required' }, { status: 400 })
  }
  if (typeof unit !== 'string' || !VALID_UNITS.includes(unit as (typeof VALID_UNITS)[number])) {
    return NextResponse.json(
      { error: `Unit must be one of ${VALID_UNITS.join(', ')}` },
      { status: 400 },
    )
  }
  const priceNum = Number(price)
  if (!Number.isFinite(priceNum) || priceNum < 0) {
    return NextResponse.json({ error: 'Price must be a number ≥ 0' }, { status: 400 })
  }
  if (typeof category_id !== 'string' || !category_id) {
    return NextResponse.json({ error: 'category_id is required' }, { status: 400 })
  }

  const { data, error } = await supabase
    .from('materials')
    .insert({
      name: name.trim(),
      unit,
      price: priceNum,
      category_id,
      created_by: user.id,
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
