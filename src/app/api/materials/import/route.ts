import { NextResponse } from 'next/server'
import { requireAdmin } from '@/lib/api/admin'

const VALID_UNITS = new Set(['ft', 'ea', 'box', 'bag', 'set'])
const MAX_ROWS = 5000
const MAX_BODY_BYTES = 2_000_000 // ~2 MB ceiling — prevents OOM before MAX_ROWS check

interface ImportRow {
  name?: unknown
  unit?: unknown
  price?: unknown
  category?: unknown
}

interface ImportResult {
  created: number
  reactivated: number
  skipped: number
  errors: { row: number; message: string }[]
}

export async function POST(request: Request) {
  const auth = await requireAdmin()
  if ('error' in auth) return auth.error
  const { supabase, userId } = auth

  const contentLength = Number(request.headers.get('content-length') ?? '0')
  if (contentLength > MAX_BODY_BYTES) {
    return NextResponse.json(
      { error: `Payload too large (max ${MAX_BODY_BYTES} bytes)` },
      { status: 413 },
    )
  }

  const body = await request.json().catch(() => null)
  const rows = body?.rows
  if (!Array.isArray(rows)) {
    return NextResponse.json({ error: 'Body must be { rows: [...] }' }, { status: 400 })
  }
  if (rows.length === 0) {
    return NextResponse.json({ error: 'No rows to import' }, { status: 400 })
  }
  if (rows.length > MAX_ROWS) {
    return NextResponse.json(
      { error: `Too many rows (max ${MAX_ROWS})` },
      { status: 400 },
    )
  }

  // Build category name → id map (case-insensitive)
  const { data: categories, error: catError } = await supabase
    .from('material_categories')
    .select('id, name')
  if (catError) {
    return NextResponse.json({ error: catError.message }, { status: 500 })
  }
  const categoryByName = new Map<string, string>()
  for (const c of categories ?? []) {
    categoryByName.set(c.name.toLowerCase(), c.id)
  }

  const result: ImportResult = {
    created: 0,
    reactivated: 0,
    skipped: 0,
    errors: [],
  }

  // Pass 1 — validate + dedupe within the payload itself. Two rows with the
  // same (lowercased name, category) would both miss the existing-row lookup
  // and create duplicates / double-count reactivations. Keep the first valid
  // occurrence; report the rest as errors.
  type ValidatedRow = {
    rowNumber: number
    name: string
    unit: string
    priceNum: number
    categoryId: string
  }
  const validated: ValidatedRow[] = []
  const seenKeys = new Map<string, number>()

  for (let i = 0; i < rows.length; i++) {
    const raw = rows[i] as ImportRow
    const rowNumber = i + 1

    const name = typeof raw.name === 'string' ? raw.name.trim() : ''
    const unit = typeof raw.unit === 'string' ? raw.unit.trim().toLowerCase() : ''
    const categoryName = typeof raw.category === 'string' ? raw.category.trim() : ''

    if (!name) {
      result.errors.push({ row: rowNumber, message: 'Name is required' })
      continue
    }
    if (!VALID_UNITS.has(unit)) {
      result.errors.push({
        row: rowNumber,
        message: `Unit ${JSON.stringify(raw.unit ?? '')} must be one of ${[...VALID_UNITS].join(', ')}`,
      })
      continue
    }
    const priceNum =
      typeof raw.price === 'number'
        ? raw.price
        : typeof raw.price === 'string'
          ? Number(raw.price.replace(/^\$/, '').replace(/,/g, '').trim())
          : NaN
    if (!Number.isFinite(priceNum) || priceNum < 0) {
      result.errors.push({ row: rowNumber, message: 'Price must be a number ≥ 0' })
      continue
    }
    const categoryId = categoryByName.get(categoryName.toLowerCase())
    if (!categoryId) {
      result.errors.push({
        row: rowNumber,
        message: `Unknown category "${categoryName}"`,
      })
      continue
    }

    const dedupeKey = `${name.toLowerCase()}|${categoryId}`
    const firstRow = seenKeys.get(dedupeKey)
    if (firstRow !== undefined) {
      result.errors.push({
        row: rowNumber,
        message: `Duplicate of row ${firstRow} (same name + category)`,
      })
      continue
    }
    seenKeys.set(dedupeKey, rowNumber)
    validated.push({ rowNumber, name, unit, priceNum, categoryId })
  }

  // Pass 2 — for each validated row, lookup existing then insert/skip/reactivate.
  // The DB trigger trg_materials_updated_at handles updated_at on UPDATE.
  for (const v of validated) {
    const { data: existing, error: lookupError } = await supabase
      .from('materials')
      .select('id, active')
      .eq('name', v.name)
      .eq('category_id', v.categoryId)
      .maybeSingle()
    if (lookupError) {
      result.errors.push({ row: v.rowNumber, message: lookupError.message })
      continue
    }

    if (existing) {
      if (existing.active) {
        result.skipped += 1
      } else {
        const { error: updateError } = await supabase
          .from('materials')
          .update({ active: true, unit: v.unit, price: v.priceNum })
          .eq('id', existing.id)
        if (updateError) {
          result.errors.push({ row: v.rowNumber, message: updateError.message })
          continue
        }
        result.reactivated += 1
      }
      continue
    }

    const { error: insertError } = await supabase.from('materials').insert({
      name: v.name,
      unit: v.unit,
      price: v.priceNum,
      category_id: v.categoryId,
      created_by: userId,
    })
    if (insertError) {
      result.errors.push({ row: v.rowNumber, message: insertError.message })
      continue
    }
    result.created += 1
  }

  return NextResponse.json(result)
}
