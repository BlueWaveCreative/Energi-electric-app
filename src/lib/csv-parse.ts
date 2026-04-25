/**
 * Minimal CSV parser. Handles:
 * - Quoted fields with embedded commas, quotes (escaped as ""), and newlines
 * - Trailing newline
 * - Both \n and \r\n line endings
 *
 * Returns rows as arrays of strings. Header detection is the caller's job.
 *
 * NOT a full RFC 4180 implementation — sufficient for materials import where
 * the source is Joe's Excel/Google Sheets export, not arbitrary CSV.
 */
export function parseCSV(text: string): string[][] {
  const rows: string[][] = []
  let row: string[] = []
  let field = ''
  let inQuotes = false
  let i = 0

  // Strip BOM if present
  if (text.charCodeAt(0) === 0xfeff) i = 1

  while (i < text.length) {
    const ch = text[i]

    if (inQuotes) {
      if (ch === '"') {
        if (text[i + 1] === '"') {
          // Escaped quote
          field += '"'
          i += 2
          continue
        }
        inQuotes = false
        i++
        continue
      }
      field += ch
      i++
      continue
    }

    if (ch === '"') {
      inQuotes = true
      i++
      continue
    }
    if (ch === ',') {
      row.push(field)
      field = ''
      i++
      continue
    }
    if (ch === '\r') {
      // Swallow \r in \r\n
      if (text[i + 1] === '\n') {
        row.push(field)
        rows.push(row)
        row = []
        field = ''
        i += 2
        continue
      }
      row.push(field)
      rows.push(row)
      row = []
      field = ''
      i++
      continue
    }
    if (ch === '\n') {
      row.push(field)
      rows.push(row)
      row = []
      field = ''
      i++
      continue
    }
    field += ch
    i++
  }

  // Flush trailing field/row if non-empty
  if (field.length > 0 || row.length > 0) {
    row.push(field)
    rows.push(row)
  }

  // Drop a trailing fully-empty row (typical when file ends with newline)
  if (rows.length > 0) {
    const last = rows[rows.length - 1]
    if (last.length === 1 && last[0] === '') rows.pop()
  }

  return rows
}
