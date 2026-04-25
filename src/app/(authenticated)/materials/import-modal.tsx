'use client'

import { useState, useRef } from 'react'
import { Modal } from '@/components/ui/modal'
import { Button } from '@/components/ui/button'
import { AlertCircle, CheckCircle2, FileText } from 'lucide-react'
import { parseCSV } from '@/lib/csv-parse'

const REQUIRED_HEADERS = ['name', 'unit', 'price', 'category']
const VALID_UNITS = new Set(['ft', 'ea', 'box', 'bag', 'set'])

interface ImportModalProps {
  open: boolean
  onClose: () => void
  onSuccess: () => void
  validCategoryNames: string[]
}

interface PreviewRow {
  rowNumber: number
  name: string
  unit: string
  price: string
  category: string
  error: string | null
}

interface ImportResult {
  created: number
  reactivated: number
  skipped: number
  errors: { row: number; message: string }[]
}

type Phase = 'idle' | 'preview' | 'submitting' | 'done'

export function ImportModal({
  open,
  onClose,
  onSuccess,
  validCategoryNames,
}: ImportModalProps) {
  const fileInputRef = useRef<HTMLInputElement>(null)
  const [phase, setPhase] = useState<Phase>('idle')
  const [filename, setFilename] = useState<string>('')
  const [preview, setPreview] = useState<PreviewRow[]>([])
  const [parseError, setParseError] = useState<string | null>(null)
  const [result, setResult] = useState<ImportResult | null>(null)
  const [submitError, setSubmitError] = useState<string | null>(null)

  const validCategorySet = new Set(validCategoryNames.map((n) => n.toLowerCase()))

  function reset() {
    setPhase('idle')
    setFilename('')
    setPreview([])
    setParseError(null)
    setResult(null)
    setSubmitError(null)
    if (fileInputRef.current) fileInputRef.current.value = ''
  }

  function handleClose() {
    if (phase === 'submitting') return
    reset()
    onClose()
  }

  async function handleFile(file: File) {
    setFilename(file.name)
    setParseError(null)
    let text: string
    try {
      text = await file.text()
    } catch (err) {
      setParseError(err instanceof Error ? err.message : 'Failed to read file')
      return
    }

    const rows = parseCSV(text)
    if (rows.length < 2) {
      setParseError('CSV must have a header row and at least one data row.')
      return
    }

    const header = rows[0].map((h) => h.trim().toLowerCase())
    const headerMap: Record<string, number> = {}
    for (const required of REQUIRED_HEADERS) {
      const idx = header.indexOf(required)
      if (idx === -1) {
        setParseError(
          `Missing required column "${required}". Headers must include: ${REQUIRED_HEADERS.join(', ')}`,
        )
        return
      }
      headerMap[required] = idx
    }

    const parsed: PreviewRow[] = rows.slice(1).map((row, i) => {
      const name = (row[headerMap.name] ?? '').trim()
      const unit = (row[headerMap.unit] ?? '').trim().toLowerCase()
      const priceStr = (row[headerMap.price] ?? '').trim().replace(/^\$/, '')
      const category = (row[headerMap.category] ?? '').trim()

      let error: string | null = null
      if (!name) error = 'Name is required'
      else if (!VALID_UNITS.has(unit))
        error = `Unit must be one of ${[...VALID_UNITS].join(', ')}`
      else {
        const priceNum = Number(priceStr)
        if (!Number.isFinite(priceNum) || priceNum < 0)
          error = 'Price must be a number ≥ 0'
        else if (!validCategorySet.has(category.toLowerCase()))
          error = `Unknown category "${category}"`
      }

      return {
        rowNumber: i + 1,
        name,
        unit,
        price: priceStr,
        category,
        error,
      }
    })

    setPreview(parsed)
    setPhase('preview')
  }

  async function handleSubmit() {
    setPhase('submitting')
    setSubmitError(null)

    const validRows = preview
      .filter((r) => !r.error)
      .map((r) => ({
        name: r.name,
        unit: r.unit,
        price: Number(r.price),
        category: r.category,
      }))

    if (validRows.length === 0) {
      setSubmitError('No valid rows to import.')
      setPhase('preview')
      return
    }

    try {
      const res = await fetch('/api/materials/import', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ rows: validRows }),
      })
      const data = await res.json()
      if (!res.ok) {
        throw new Error(data.error ?? 'Import failed')
      }
      setResult(data as ImportResult)
      setPhase('done')
    } catch (err) {
      setSubmitError(err instanceof Error ? err.message : 'Import failed')
      setPhase('preview')
    }
  }

  function handleDone() {
    onSuccess()
    reset()
    onClose()
  }

  const validCount = preview.filter((r) => !r.error).length
  const errorCount = preview.length - validCount

  return (
    <Modal open={open} onClose={handleClose} title="Import materials" className="max-w-2xl">
      {phase === 'idle' && (
        <div className="space-y-4">
          <p className="text-sm text-gray-600">
            Upload a CSV with columns:{' '}
            <code className="font-mono text-xs bg-gray-100 px-1.5 py-0.5 rounded">
              {REQUIRED_HEADERS.join(', ')}
            </code>
            . Categories must match an existing category name (
            {validCategoryNames.join(', ')}).
          </p>
          <p className="text-sm text-gray-600">
            Existing materials with the same name + category are skipped. Soft-deleted
            materials with a match are reactivated with the new price/unit.
          </p>
          <div>
            <label
              htmlFor="csv-file"
              className="inline-flex items-center gap-2 px-4 py-2 text-sm font-medium rounded-xl bg-[#68BD45] text-white hover:bg-[#5aa83c] cursor-pointer focus-within:ring-2 focus-within:ring-[#68BD45] focus-within:ring-offset-2"
            >
              <FileText className="w-4 h-4" />
              Choose CSV file
            </label>
            <input
              ref={fileInputRef}
              id="csv-file"
              type="file"
              accept=".csv,text/csv"
              className="sr-only"
              onChange={(e) => {
                const file = e.target.files?.[0]
                if (file) handleFile(file)
              }}
            />
          </div>
          {parseError && (
            <div
              role="alert"
              className="flex items-start gap-2 px-3 py-2 rounded-lg bg-red-50 border border-red-200 text-sm text-red-700"
            >
              <AlertCircle className="w-4 h-4 mt-0.5 shrink-0" />
              <span>{parseError}</span>
            </div>
          )}
        </div>
      )}

      {phase === 'preview' && (
        <div className="space-y-4">
          <div className="flex items-center justify-between text-sm">
            <span className="text-gray-700 truncate" title={filename}>
              {filename}
            </span>
            <span className="text-gray-500 shrink-0 ml-2">
              <span className="text-green-700 font-medium">{validCount}</span> ready,{' '}
              <span className={errorCount ? 'text-red-700 font-medium' : ''}>
                {errorCount}
              </span>{' '}
              with errors
            </span>
          </div>
          {submitError && (
            <div
              role="alert"
              className="flex items-start gap-2 px-3 py-2 rounded-lg bg-red-50 border border-red-200 text-sm text-red-700"
            >
              <AlertCircle className="w-4 h-4 mt-0.5 shrink-0" />
              <span>{submitError}</span>
            </div>
          )}
          <div className="border border-gray-200 rounded-lg overflow-hidden max-h-72 overflow-y-auto">
            <table className="w-full text-sm">
              <thead className="bg-gray-50 sticky top-0">
                <tr>
                  <th className="px-2 py-1.5 text-left text-xs font-medium text-gray-500">
                    #
                  </th>
                  <th className="px-2 py-1.5 text-left text-xs font-medium text-gray-500">
                    Name
                  </th>
                  <th className="px-2 py-1.5 text-left text-xs font-medium text-gray-500">
                    Unit
                  </th>
                  <th className="px-2 py-1.5 text-left text-xs font-medium text-gray-500">
                    Price
                  </th>
                  <th className="px-2 py-1.5 text-left text-xs font-medium text-gray-500">
                    Category
                  </th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-100">
                {preview.map((row) => (
                  <tr
                    key={row.rowNumber}
                    className={row.error ? 'bg-red-50' : ''}
                    title={row.error ?? ''}
                  >
                    <td className="px-2 py-1 text-xs text-gray-400 tabular-nums">
                      {row.rowNumber}
                    </td>
                    <td className="px-2 py-1 truncate max-w-[200px]">{row.name}</td>
                    <td className="px-2 py-1 text-xs text-gray-600">{row.unit}</td>
                    <td className="px-2 py-1 tabular-nums">{row.price}</td>
                    <td className="px-2 py-1 text-xs text-gray-600">{row.category}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
          {errorCount > 0 && (
            <p className="text-xs text-gray-500">
              Rows with errors will be skipped. Hover an error row for details.
            </p>
          )}
          <div className="flex justify-between gap-2 pt-2">
            <Button type="button" variant="ghost" onClick={reset}>
              Choose a different file
            </Button>
            <div className="flex gap-2">
              <Button type="button" variant="secondary" onClick={handleClose}>
                Cancel
              </Button>
              <Button
                type="button"
                onClick={handleSubmit}
                disabled={validCount === 0}
              >
                Import {validCount} {validCount === 1 ? 'row' : 'rows'}
              </Button>
            </div>
          </div>
        </div>
      )}

      {phase === 'submitting' && (
        <p className="text-sm text-gray-600 py-6 text-center">Importing…</p>
      )}

      {phase === 'done' && result && (
        <div className="space-y-4">
          <div className="flex items-start gap-3 px-3 py-3 rounded-lg bg-green-50 border border-green-200">
            <CheckCircle2 className="w-5 h-5 text-green-600 shrink-0 mt-0.5" />
            <div className="text-sm text-green-800 space-y-0.5">
              <p>
                <span className="font-semibold">{result.created}</span> created
              </p>
              {result.reactivated > 0 && (
                <p>
                  <span className="font-semibold">{result.reactivated}</span> reactivated
                </p>
              )}
              {result.skipped > 0 && (
                <p>
                  <span className="font-semibold">{result.skipped}</span> skipped
                  (already in list)
                </p>
              )}
            </div>
          </div>
          {result.errors.length > 0 && (
            <div>
              <p className="text-sm font-medium text-gray-700 mb-1">
                {result.errors.length} {result.errors.length === 1 ? 'error' : 'errors'}
              </p>
              <ul className="text-xs text-red-700 space-y-0.5 max-h-32 overflow-y-auto border border-red-200 rounded p-2 bg-red-50">
                {result.errors.map((e) => (
                  <li key={`${e.row}-${e.message}`}>
                    Row {e.row}: {e.message}
                  </li>
                ))}
              </ul>
            </div>
          )}
          <div className="flex justify-end pt-2">
            <Button type="button" onClick={handleDone}>
              Done
            </Button>
          </div>
        </div>
      )}
    </Modal>
  )
}
