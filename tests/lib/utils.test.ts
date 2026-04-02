import { describe, it, expect } from 'vitest'
import { cn, formatDate, formatDuration } from '@/lib/utils'

describe('cn', () => {
  it('merges class names', () => {
    expect(cn('foo', 'bar')).toBe('foo bar')
  })

  it('handles conditional classes', () => {
    expect(cn('base', false && 'hidden', 'visible')).toBe('base visible')
  })

  it('deduplicates tailwind conflicts', () => {
    expect(cn('p-4', 'p-2')).toBe('p-2')
  })
})

describe('formatDate', () => {
  it('formats date as readable string', () => {
    const result = formatDate(new Date('2026-04-01T12:00:00Z'))
    expect(result).toContain('Apr')
    expect(result).toContain('2026')
  })
})

describe('formatDuration', () => {
  it('formats minutes into hours and minutes', () => {
    expect(formatDuration(90)).toBe('1h 30m')
  })

  it('handles zero', () => {
    expect(formatDuration(0)).toBe('0m')
  })

  it('handles hours only', () => {
    expect(formatDuration(120)).toBe('2h 0m')
  })

  it('handles minutes only', () => {
    expect(formatDuration(45)).toBe('45m')
  })
})
