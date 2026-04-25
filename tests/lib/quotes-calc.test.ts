import { describe, it, expect } from 'vitest'
import { computeQuoteTotals } from '@/lib/quotes/calc'

const baseSettings = {
  markup_enabled: true,
  markup_percent: 20,
  tax_enabled: true,
  tax_percent: 8.5,
  labor_rate: 85,
  labor_hours: 0,
  flat_fee_enabled: false,
  flat_fee: 0,
}

describe('computeQuoteTotals', () => {
  it('returns zeros for empty quote', () => {
    const t = computeQuoteTotals([], baseSettings)
    expect(t.materialsTotal).toBe(0)
    expect(t.grandTotal).toBe(0)
  })

  it('sums materials × quantities', () => {
    const t = computeQuoteTotals(
      [
        { unit_price: 10, quantity: 3 },
        { unit_price: 2.5, quantity: 4 },
      ],
      { ...baseSettings, markup_enabled: false, tax_enabled: false },
    )
    expect(t.materialsTotal).toBe(40)
    expect(t.markupAmount).toBe(0)
    expect(t.taxAmount).toBe(0)
    expect(t.grandTotal).toBe(40)
  })

  it('applies markup to materials only, not labor', () => {
    const t = computeQuoteTotals(
      [{ unit_price: 100, quantity: 1 }],
      { ...baseSettings, labor_hours: 1, tax_enabled: false },
    )
    // materials 100 + markup 20 + labor 85 = 205
    expect(t.materialsTotal).toBe(100)
    expect(t.markupAmount).toBe(20)
    expect(t.laborAmount).toBe(85)
    expect(t.subtotalBeforeTax).toBe(205)
    expect(t.grandTotal).toBe(205)
  })

  it('applies tax to everything (materials + markup + labor + flat fee)', () => {
    const t = computeQuoteTotals(
      [{ unit_price: 100, quantity: 1 }],
      {
        ...baseSettings,
        labor_hours: 1,
        flat_fee_enabled: true,
        flat_fee: 50,
      },
    )
    // materials 100 + markup 20 + labor 85 + flat 50 = 255 subtotal
    // tax = 255 * 0.085 = 21.675 → 21.68
    // grand = 255 + 21.68 = 276.68
    expect(t.subtotalBeforeTax).toBe(255)
    expect(t.taxAmount).toBe(21.68)
    expect(t.grandTotal).toBe(276.68)
  })

  it('skips markup when disabled', () => {
    const t = computeQuoteTotals(
      [{ unit_price: 100, quantity: 1 }],
      { ...baseSettings, markup_enabled: false, tax_enabled: false },
    )
    expect(t.markupAmount).toBe(0)
    expect(t.grandTotal).toBe(100)
  })

  it('skips flat fee when disabled', () => {
    const t = computeQuoteTotals(
      [],
      {
        ...baseSettings,
        markup_enabled: false,
        tax_enabled: false,
        flat_fee_enabled: false,
        flat_fee: 75,
      },
    )
    expect(t.flatFeeAmount).toBe(0)
    expect(t.grandTotal).toBe(0)
  })

  it('handles string-coerced numeric inputs (Postgres NUMERIC)', () => {
    const t = computeQuoteTotals(
      [{ unit_price: '12.50' as unknown as number, quantity: '4' as unknown as number }],
      { ...baseSettings, markup_enabled: false, tax_enabled: false },
    )
    expect(t.materialsTotal).toBe(50)
  })
})
