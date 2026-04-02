import { describe, it, expect } from 'vitest'
import { SYMBOLS, getSymbolByName, SYMBOL_CATEGORIES } from '@/components/annotation/symbol-definitions'

describe('Symbol Definitions', () => {
  it('has all required categories', () => {
    const categoryNames = SYMBOL_CATEGORIES.map((c) => c.name)
    expect(categoryNames).toContain('Outlets')
    expect(categoryNames).toContain('Switches')
    expect(categoryNames).toContain('Panels')
    expect(categoryNames).toContain('Boxes')
    expect(categoryNames).toContain('Lighting')
    expect(categoryNames).toContain('Wiring')
  })

  it('every symbol has required fields', () => {
    for (const symbol of SYMBOLS) {
      expect(symbol.name).toBeTruthy()
      expect(symbol.category).toBeTruthy()
      expect(symbol.svgPath).toBeTruthy()
      expect(symbol.width).toBeGreaterThan(0)
      expect(symbol.height).toBeGreaterThan(0)
    }
  })

  it('getSymbolByName returns correct symbol', () => {
    const outlet = getSymbolByName('standard-outlet')
    expect(outlet).toBeDefined()
    expect(outlet?.category).toBe('Outlets')
  })

  it('getSymbolByName returns undefined for unknown symbol', () => {
    expect(getSymbolByName('nonexistent')).toBeUndefined()
  })
})
