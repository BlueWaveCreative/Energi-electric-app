import { describe, it, expect } from 'vitest'
import { generateCSV, downloadCSV } from '@/lib/csv'

describe('generateCSV', () => {
  it('generates CSV with headers and rows', () => {
    const csv = generateCSV(
      ['Name', 'Hours', 'Date'],
      [
        ['John Smith', '8.0', '2026-04-01'],
        ['Jane Doe', '6.5', '2026-04-01'],
      ]
    )
    expect(csv).toBe('Name,Hours,Date\nJohn Smith,8.0,2026-04-01\nJane Doe,6.5,2026-04-01')
  })

  it('escapes commas in values', () => {
    const csv = generateCSV(
      ['Name', 'Notes'],
      [['John Smith', 'Rough-in, trim-out']]
    )
    expect(csv).toBe('Name,Notes\nJohn Smith,"Rough-in, trim-out"')
  })

  it('escapes quotes in values', () => {
    const csv = generateCSV(
      ['Name', 'Notes'],
      [['John', 'Used 2" conduit']]
    )
    expect(csv).toBe('Name,Notes\nJohn,"Used 2"" conduit"')
  })

  it('handles empty data', () => {
    const csv = generateCSV(['Name', 'Hours'], [])
    expect(csv).toBe('Name,Hours')
  })
})
