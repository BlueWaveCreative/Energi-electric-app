import { NextResponse } from 'next/server'
import { requireAdmin } from '@/lib/api/admin'
import { computeQuoteTotals } from '@/lib/quotes/calc'

const CONVERTIBLE_STATUSES = new Set(['draft', 'sent', 'accepted'])

/**
 * Convert a quote to an invoice.
 *
 * Per PRD: customers never see materials itemized. The invoice ships as a
 * single line item — "Provided material and labor for [description]" — with
 * the quote's subtotalBeforeTax as unit_price and the quote's taxAmount as
 * the invoice's tax_amount field.
 *
 * On success the quote is locked into status='converted' and points at the
 * new invoice via converted_to_invoice_id. Re-conversion is rejected (would
 * orphan the prior invoice).
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

  // 1. Load quote + line items
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
      { error: 'Quote already converted', invoice_id: quote.converted_to_invoice_id },
      { status: 409 },
    )
  }
  if (!CONVERTIBLE_STATUSES.has(quote.status)) {
    return NextResponse.json(
      {
        error: `Cannot convert a quote with status "${quote.status}"; only ${[...CONVERTIBLE_STATUSES].join(', ')} are convertible`,
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

  // 2. Compute totals
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

  // 3. Build the customer-facing description
  const desc = (quote.description ?? '').trim() || quote.title
  const summaryDescription = `Provided material and labor for ${desc}`

  // 4. Insert invoice
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
    return NextResponse.json(
      { error: invoiceError?.message ?? 'Failed to create invoice' },
      { status: 500 },
    )
  }

  // 5. Insert the single summary line item
  const { error: lineItemError } = await supabase
    .from('invoice_line_items')
    .insert({
      invoice_id: invoice.id,
      description: summaryDescription,
      quantity: 1,
      unit_price: totals.subtotalBeforeTax,
      sort_order: 0,
    })
  if (lineItemError) {
    // Best-effort cleanup so we don't leave an empty invoice behind.
    await supabase.from('invoices').delete().eq('id', invoice.id)
    return NextResponse.json(
      { error: `Failed to write invoice line item: ${lineItemError.message}` },
      { status: 500 },
    )
  }

  // 6. Lock the quote — point it at the invoice we just created.
  const { error: quoteUpdateError } = await supabase
    .from('quotes')
    .update({
      status: 'converted',
      converted_at: new Date().toISOString(),
      converted_to_invoice_id: invoice.id,
    })
    .eq('id', quoteId)
  if (quoteUpdateError) {
    // The invoice is real and useful at this point; leave it alone, surface
    // the error so an admin can manually fix the quote pointer.
    return NextResponse.json(
      {
        error: `Invoice created (${invoice.id}) but quote could not be locked: ${quoteUpdateError.message}`,
        invoice_id: invoice.id,
      },
      { status: 500 },
    )
  }

  return NextResponse.json({ invoice_id: invoice.id }, { status: 201 })
}
