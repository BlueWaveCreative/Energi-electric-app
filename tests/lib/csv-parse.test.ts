import { describe, it, expect } from 'vitest'
import { parseCSV } from '@/lib/csv-parse'

describe('parseCSV', () => {
  it('parses a simple CSV', () => {
    expect(parseCSV('a,b,c\n1,2,3')).toEqual([
      ['a', 'b', 'c'],
      ['1', '2', '3'],
    ])
  })

  it('handles quoted fields with commas', () => {
    expect(parseCSV('name,price\n"Wire, 12/2",0.65')).toEqual([
      ['name', 'price'],
      ['Wire, 12/2', '0.65'],
    ])
  })

  it('handles escaped quotes', () => {
    expect(parseCSV('a\n"He said ""hi"""')).toEqual([['a'], ['He said "hi"']])
  })

  it('handles \\r\\n line endings', () => {
    expect(parseCSV('a,b\r\n1,2\r\n')).toEqual([
      ['a', 'b'],
      ['1', '2'],
    ])
  })

  it('handles trailing newline', () => {
    expect(parseCSV('a,b\n1,2\n')).toEqual([
      ['a', 'b'],
      ['1', '2'],
    ])
  })

  it('strips BOM', () => {
    expect(parseCSV('﻿a,b\n1,2')).toEqual([
      ['a', 'b'],
      ['1', '2'],
    ])
  })

  it('handles embedded newlines in quoted field', () => {
    expect(parseCSV('a\n"line1\nline2"')).toEqual([['a'], ['line1\nline2']])
  })

  it('handles empty fields', () => {
    expect(parseCSV('a,b,c\n,,')).toEqual([
      ['a', 'b', 'c'],
      ['', '', ''],
    ])
  })

  it('returns empty array for empty input', () => {
    expect(parseCSV('')).toEqual([])
  })
})
