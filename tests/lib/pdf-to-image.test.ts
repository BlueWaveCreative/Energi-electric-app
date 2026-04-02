import { describe, it, expect } from 'vitest'
import { getFileType, isImageFile, isPdfFile } from '@/lib/pdf-to-image'

describe('pdf-to-image utils', () => {
  it('detects image file types', () => {
    expect(isImageFile('plan.png')).toBe(true)
    expect(isImageFile('plan.jpg')).toBe(true)
    expect(isImageFile('plan.jpeg')).toBe(true)
    expect(isImageFile('plan.webp')).toBe(true)
    expect(isImageFile('plan.pdf')).toBe(false)
  })

  it('detects PDF file types', () => {
    expect(isPdfFile('plan.pdf')).toBe(true)
    expect(isPdfFile('plan.PDF')).toBe(true)
    expect(isPdfFile('plan.png')).toBe(false)
  })

  it('returns correct file type', () => {
    expect(getFileType('plan.pdf')).toBe('pdf')
    expect(getFileType('plan.png')).toBe('image')
    expect(getFileType('plan.txt')).toBe('unknown')
  })
})
