/**
 * Minimal CSV parser. Handles:
 * - Quoted fields with embedded commas, quotes (escaped as ""), and newlines
 * - Trailing newline
 * - Both \n and \r\n line endings
 * - BOM stripping
 * - Format-injection round-trip: a field that begins with `'` followed by
 *   `=+-@\t\r` (the prefix our exporter adds to neutralize Excel formulas)
 *   has the leading `'` stripped on parse
 *
 * Throws on:
 * - Unescaped `"` in the middle of a quoted field
 * - Unterminated quoted field (file ends while inside quotes)
 *
 * Returns rows as arrays of strings. Header detection is the caller's job.
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
          field += '"'
          i += 2
          continue
        }
        inQuotes = false
        i++
        const next = text[i]
        if (
          next !== undefined &&
          next !== ',' &&
          next !== '\r' &&
          next !== '\n'
        ) {
          throw new Error(
            `Unescaped quote in quoted field near offset ${i} ` +
              `(got "${next}" — use "" inside quoted fields)`,
          )
        }
        continue
      }
      field += ch
      i++
      continue
    }

    if (ch === '"') {
      if (field.length > 0) {
        // Quote in the middle of an unquoted field — append literally rather
        // than starting a new quoted region.
        field += ch
        i++
        continue
      }
      inQuotes = true
      i++
      continue
    }
    if (ch === ',') {
      row.push(unprefix(field))
      field = ''
      i++
      continue
    }
    if (ch === '\r') {
      if (text[i + 1] === '\n') {
        row.push(unprefix(field))
        rows.push(row)
        row = []
        field = ''
        i += 2
        continue
      }
      row.push(unprefix(field))
      rows.push(row)
      row = []
      field = ''
      i++
      continue
    }
    if (ch === '\n') {
      row.push(unprefix(field))
      rows.push(row)
      row = []
      field = ''
      i++
      continue
    }
    field += ch
    i++
  }

  if (inQuotes) {
    throw new Error('Unterminated quoted field at end of input')
  }

  if (field.length > 0 || row.length > 0) {
    row.push(unprefix(field))
    rows.push(row)
  }

  if (rows.length > 0) {
    const last = rows[rows.length - 1]
    if (last.length === 1 && last[0] === '') rows.pop()
  }

  return rows
}

/**
 * Reverse the formula-injection prefix our exporter adds.
 * If a field is `'=foo` / `'+foo` / `'-foo` / `'@foo` / `'\t...` / `'\r...`,
 * strip the leading `'`. This makes export → import round-trip stable.
 */
function unprefix(value: string): string {
  if (value.length >= 2 && value[0] === "'" && /[=+\-@\t\r]/.test(value[1])) {
    return value.slice(1)
  }
  return value
}
