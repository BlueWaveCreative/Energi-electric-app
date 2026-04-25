import type { Quote, QuoteLineItem, QuoteTotals } from '@/lib/types/database'

type QuoteSettings = Pick<
  Quote,
  | 'markup_enabled'
  | 'markup_percent'
  | 'tax_enabled'
  | 'tax_percent'
  | 'labor_rate'
  | 'labor_hours'
  | 'flat_fee_enabled'
  | 'flat_fee'
>

type QuoteLineForCalc = Pick<QuoteLineItem, 'unit_price' | 'quantity'>

const round2 = (n: number) => Math.round(n * 100) / 100

/**
 * Compute quote totals from line items + pricing knobs.
 * Formula source: docs/joe-materials-prototype.tsx
 *   materialsTotal       = sum(unit_price * quantity)
 *   markupAmount         = materialsTotal * markup_percent / 100  (only if markup_enabled)
 *   laborAmount          = labor_rate * labor_hours               (NOT marked up)
 *   flatFeeAmount        = flat_fee                               (only if flat_fee_enabled)
 *   subtotalBeforeTax    = materialsTotal + markupAmount + laborAmount + flatFeeAmount
 *   taxAmount            = subtotalBeforeTax * tax_percent / 100  (only if tax_enabled)
 *   grandTotal           = subtotalBeforeTax + taxAmount
 */
export function computeQuoteTotals(
  lines: QuoteLineForCalc[],
  settings: QuoteSettings,
): QuoteTotals {
  const materialsTotal = lines.reduce(
    (sum, l) => sum + Number(l.unit_price) * Number(l.quantity),
    0,
  )

  const markupAmount = settings.markup_enabled
    ? materialsTotal * (Number(settings.markup_percent) / 100)
    : 0

  const laborAmount = Number(settings.labor_rate) * Number(settings.labor_hours)

  const flatFeeAmount = settings.flat_fee_enabled ? Number(settings.flat_fee) : 0

  const subtotalBeforeTax =
    materialsTotal + markupAmount + laborAmount + flatFeeAmount

  const taxAmount = settings.tax_enabled
    ? subtotalBeforeTax * (Number(settings.tax_percent) / 100)
    : 0

  const grandTotal = subtotalBeforeTax + taxAmount

  return {
    materialsTotal: round2(materialsTotal),
    markupAmount: round2(markupAmount),
    laborAmount: round2(laborAmount),
    flatFeeAmount: round2(flatFeeAmount),
    subtotalBeforeTax: round2(subtotalBeforeTax),
    taxAmount: round2(taxAmount),
    grandTotal: round2(grandTotal),
  }
}
