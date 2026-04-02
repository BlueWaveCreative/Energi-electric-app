function escapeCSVValue(value: string): string {
  // Neutralize formula injection (=, +, -, @, tab, carriage return)
  if (/^[=+\-@\t\r]/.test(value)) {
    value = `'${value}`
  }
  if (value.includes(',') || value.includes('"') || value.includes('\n') || value.includes("'")) {
    return `"${value.replace(/"/g, '""')}"`
  }
  return value
}

export function generateCSV(headers: string[], rows: string[][]): string {
  const headerLine = headers.map(escapeCSVValue).join(',')
  const dataLines = rows.map((row) => row.map(escapeCSVValue).join(','))
  return [headerLine, ...dataLines].join('\n')
}

export function downloadCSV(csv: string, filename: string): void {
  const blob = new Blob([csv], { type: 'text/csv;charset=utf-8;' })
  const url = URL.createObjectURL(blob)
  const link = document.createElement('a')
  link.href = url
  link.download = filename
  link.click()
  URL.revokeObjectURL(url)
}
