import { NextResponse } from 'next/server'
import { requireAdmin } from '@/lib/api/admin'
import { computeQuoteTotals } from '@/lib/quotes/calc'

const CONVERTIBLE_STATUSES = ['draft', 'sent', 'accepted'] as const
const CONVERTIBLE_SET = new Set<string>(CONVERTIBLE_STATUSES)

const round2 = (n: number) => Math.round(n * 100) / 100

/**
 * Convert a quote to an invoice.
 *
 * Per PRD: customers never see materials itemized. The invoice ships as a
 * single line item — "Provided material and labor for [description]" — with
 * unit_price = grandTotal - taxAmount and tax_amount = taxAmount, so
 * unit_price + tax_amount === grandTotal exactly (no penny drift from
 * compound rounding).
 *
 * Steps (single-flight via status-guarded UPDATE):
 *   1. Validate (status, line items present, totals positive)
 *   2. Atomic lock: UPDATE quotes SET status='converted', converted_at=now
 *      WHERE id=:id AND status IN ('draft','sent','accepted'). Whichever
 *      concurrent POST wins this update is the only one that proceeds; all
 *      others see the row as 'converted' and 409 out.
 *   3. Insert invoice + line item. If either fails, roll back the lock.
 *   4. Patch the quote's converted_to_invoice_id pointer.
 */
export async function POST(
  _request: Request,
  context: { params: Promise<{ id: string }> },
) {
  const { id: quoteId } = await context.params
  if (!quoteId) {
    return NextResponse.json({ error: 'Missing quote id' }, { status: 400 })
  }

  const auth = await requireAdmin()
  if ('error' in auth) return auth.error
  const { supabase, userId } = auth

  // ── 1. Validate ───────────────────────────────────────────────────────
  const { data: quote, error: quoteError } = await supabase
    .from('quotes')
    .select('*')
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
      {
        error: 'Quote already converted',
        invoice_id: quote.converted_to_invoice_id,
      },
      { status: 409 },
    )
  }
  if (!CONVERTIBLE_SET.has(quote.status)) {
    return NextResponse.json(
      {
        error: `Cannot convert a quote with status "${quote.status}"; only ${CONVERTIBLE_STATUSES.join(', ')} are convertible`,
      },
      { status: 409 },
    )
  }

  const { data: lineItems, error: lineError } = await supabase
    .from('quote_line_items')
    .select('quantity, unit_price')
    .eq('quote_id', quoteId)
  if (lineError) {
    return NextResponse.json({ error: lineError.message }, { status: 500 })
  }
  if (!lineItems || lineItems.length === 0) {
    return NextResponse.json(
      { error: 'Cannot convert a quote with no line items' },
      { status: 400 },
    )
  }

  const totals = computeQuoteTotals(lineItems, {
    markup_enabled: quote.markup_enabled,
    markup_percent: quote.markup_percent,
    tax_enabled: quote.tax_enabled,
    tax_percent: quote.tax_percent,
    labor_rate: quote.labor_rate,
    labor_hours: quote.labor_hours,
    flat_fee_enabled: quote.flat_fee_enabled,
    flat_fee: quote.flat_fee,
  })
  if (totals.grandTotal <= 0) {
    return NextResponse.json(
      { error: 'Cannot convert a $0 quote — add quantities first' },
      { status: 400 },
    )
  }

  // ── 2. Atomic lock ────────────────────────────────────────────────────
  // Status-guarded UPDATE is single-winner under concurrent calls. Postgres
  // serializes the row update; whichever transaction commits first wins.
  const { data: locked, error: lockError } = await supabase
    .from('quotes')
    .update({
      status: 'converted',
      converted_at: new Date().toISOString(),
    })
    .eq('id', quoteId)
    .in('status', CONVERTIBLE_STATUSES)
    .select('id')
    .maybeSingle()
  if (lockError) {
    return NextResponse.json({ error: lockError.message }, { status: 500 })
  }
  if (!locked) {
    // Lost the race or status changed between read and lock.
    return NextResponse.json(
      { error: 'Quote is no longer in a convertible state' },
      { status: 409 },
    )
  }

  // From here on, on any failure we must roll the quote back to its prior
  // state so the user can retry.
  async function rollbackQuoteLock() {
    const { error: rbError } = await supabase
      .from('quotes')
      .update({
        status: quote.status,
        converted_at: null,
        converted_to_invoice_id: null,
      })
      .eq('id', quoteId)
    if (rbError) {
      console.error(
        `[convert] CRITICAL: failed to roll back quote ${quoteId} after invoice creation error: ${rbError.message}. Quote is now stuck in 'converted' with no invoice.`,
      )
    }
  }

  // ── 3a. Insert invoice ────────────────────────────────────────────────
  const summaryDescription = `Provided material and labor for ${
    (quote.description ?? '').trim() || quote.title
  }`
  const customerUnitPrice = round2(totals.grandTotal - totals.taxAmount)

  const { data: invoice, error: invoiceError } = await supabase
    .from('invoices')
    .insert({
      customer_id: quote.customer_id,
      project_id: quote.project_id,
      title: quote.title,
      status: 'draft',
      tax_amount: totals.taxAmount,
      notes: quote.notes,
      issued_date: new Date().toISOString().slice(0, 10),
      created_by: userId,
    })
    .select()
    .single()
  if (invoiceError || !invoice) {
    await rollbackQuoteLock()
    // Postgres FK violation = referenced customer/project no longer exists.
    if (invoiceError?.code === '23503') {
      return NextResponse.json(
        {
          error:
            'Customer or project referenced by this quote no longer exists. Update the quote and try again.',
        },
        { status: 409 },
      )
    }
    return NextResponse.json(
      { error: invoiceError?.message ?? 'Failed to create invoice' },
      { status: 500 },
    )
  }

  // ── 3b. Insert single summary line item ───────────────────────────────
  const { error: lineItemError } = await supabase
    .from('invoice_line_items')
    .insert({
      invoice_id: invoice.id,
      description: summaryDescription,
      quantity: 1,
      unit_price: customerUnitPrice,
      sort_order: 0,
    })
  if (lineItemError) {
    // Best-effort cleanup of the orphan invoice; log if even that fails so
    // an admin can find it.
    const { error: cleanupError } = await supabase
      .from('invoices')
      .delete()
      .eq('id', invoice.id)
    if (cleanupError) {
      console.error(
        `[convert] Orphan invoice ${invoice.id} could not be cleaned up: ${cleanupError.message}`,
      )
    }
    await rollbackQuoteLock()
    return NextResponse.json(
      { error: `Failed to write invoice line item: ${lineItemError.message}` },
      { status: 500 },
    )
  }

  // ── 4. Patch the pointer ──────────────────────────────────────────────
  const { error: pointerError } = await supabase
    .from('quotes')
    .update({ converted_to_invoice_id: invoice.id })
    .eq('id', quoteId)
  if (pointerError) {
    // The invoice is real and useful at this point. The quote is locked but
    // its converted_to_invoice_id is null. Surface the invoice id so the
    // user/admin can navigate to it manually; the pointer can be backfilled.
    console.error(
      `[convert] Invoice ${invoice.id} created but quote ${quoteId} pointer update failed: ${pointerError.message}`,
    )
    return NextResponse.json(
      {
        error: `Invoice created (${invoice.id}) but quote pointer could not be set. Open the invoice directly.`,
        invoice_id: invoice.id,
      },
      { status: 500 },
    )
  }

  return NextResponse.json({ invoice_id: invoice.id }, { status: 201 })
}
