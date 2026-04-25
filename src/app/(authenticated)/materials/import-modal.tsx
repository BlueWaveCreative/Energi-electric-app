'use client'

import { useState, useRef, Fragment } from 'react'
import { Modal } from '@/components/ui/modal'
import { Button } from '@/components/ui/button'
import { AlertCircle, CheckCircle2, FileText, Info } from 'lucide-react'
import { parseCSV } from '@/lib/csv-parse'

const REQUIRED_HEADERS = ['name', 'unit', 'price', 'category']
const VALID_UNITS = new Set(['ft', 'ea', 'box', 'bag', 'set'])
const MAX_FILE_BYTES = 2_000_000 // ~2 MB
const MAX_ROWS = 1000

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

    if (file.size === 0) {
      setParseError('File is empty.')
      return
    }
    if (file.size > MAX_FILE_BYTES) {
      setParseError(
        `File is too large (${Math.round(file.size / 1024)}KB, max ${Math.round(MAX_FILE_BYTES / 1024)}KB). Split it and try again.`,
      )
      return
    }

    let text: string
    try {
      text = await file.text()
    } catch (err) {
      setParseError(err instanceof Error ? err.message : 'Failed to read file')
      return
    }

    let rows: string[][]
    try {
      rows = parseCSV(text)
    } catch (err) {
      setParseError(err instanceof Error ? err.message : 'CSV parse error')
      return
    }

    if (rows.length === 0) {
      setParseError('File is empty.')
      return
    }
    if (rows.length === 1) {
      setParseError('No data rows found below the header.')
      return
    }
    if (rows.length - 1 > MAX_ROWS) {
      setParseError(
        `Too many rows (${rows.length - 1}, max ${MAX_ROWS}). Split the file and try again.`,
      )
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
      const priceStr = (row[headerMap.price] ?? '')
        .trim()
        .replace(/^\$/, '')
        .replace(/,/g, '')
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
  const allSkipped =
    result !== null && result.created === 0 && result.reactivated === 0

  return (
    <Modal open={open} onClose={handleClose} title="Import materials" className="max-w-2xl">
      {phase === 'idle' && (
        <div className="space-y-4">
          <p id="csv-help" className="text-sm text-gray-600">
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
              aria-describedby="csv-help"
              className="inline-flex items-center gap-2 px-4 py-2 text-sm font-medium rounded-xl bg-[#045815] text-white hover:bg-[#023510] cursor-pointer focus-within:ring-2 focus-within:ring-[#045815] focus-within:ring-offset-2"
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
            <span
              className="text-gray-500 shrink-0 ml-2"
              role="status"
              aria-live="polite"
            >
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
          <div className="border border-gray-200 rounded-lg max-h-72 overflow-auto">
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
                  <Fragment key={row.rowNumber}>
                    <tr
                      className={row.error ? 'bg-red-50' : ''}
                      title={row.error ?? undefined}
                    >
                      <td className="px-2 py-1 text-xs text-gray-400 tabular-nums align-top">
                        {row.rowNumber}
                      </td>
                      <td className="px-2 py-1 truncate max-w-[120px] sm:max-w-[200px] align-top">
                        {row.name}
                      </td>
                      <td className="px-2 py-1 text-xs text-gray-600 align-top">
                        {row.unit}
                      </td>
                      <td className="px-2 py-1 tabular-nums align-top">{row.price}</td>
                      <td className="px-2 py-1 text-xs text-gray-600 align-top">
                        {row.category}
                      </td>
                    </tr>
                    {row.error && (
                      <tr className="bg-red-50">
                        <td colSpan={5} className="px-2 py-1 text-xs text-red-700">
                          <AlertCircle
                            className="inline w-3 h-3 mr-1 -mt-0.5"
                            aria-hidden="true"
                          />
                          Row {row.rowNumber}: {row.error}
                        </td>
                      </tr>
                    )}
                  </Fragment>
                ))}
              </tbody>
            </table>
          </div>
          {validCount === 0 && (
            <p className="text-xs text-red-700">
              No valid rows. Fix the errors or choose a different file.
            </p>
          )}
          <div className="flex flex-wrap justify-between gap-2 pt-2">
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
        <p
          role="status"
          aria-live="polite"
          aria-busy="true"
          className="text-sm text-gray-600 py-6 text-center"
        >
          Importing…
        </p>
      )}

      {phase === 'done' && result && (
        <div className="space-y-4" role="status" aria-live="polite">
          <div
            className={`flex items-start gap-3 px-3 py-3 rounded-lg border ${
              allSkipped
                ? 'bg-blue-50 border-blue-200'
                : 'bg-green-50 border-green-200'
            }`}
          >
            {allSkipped ? (
              <Info className="w-5 h-5 text-blue-600 shrink-0 mt-0.5" />
            ) : (
              <CheckCircle2 className="w-5 h-5 text-green-600 shrink-0 mt-0.5" />
            )}
            <div
              className={`text-sm space-y-0.5 ${
                allSkipped ? 'text-blue-800' : 'text-green-800'
              }`}
            >
              {allSkipped ? (
                <p>
                  Nothing new — all {result.skipped}{' '}
                  {result.skipped === 1 ? 'row was' : 'rows were'} already in your list.
                </p>
              ) : (
                <>
                  <p>
                    <span className="font-semibold">{result.created}</span> created
                  </p>
                  {result.reactivated > 0 && (
                    <p>
                      <span className="font-semibold">{result.reactivated}</span>{' '}
                      reactivated
                    </p>
                  )}
                  {result.skipped > 0 && (
                    <p>
                      <span className="font-semibold">{result.skipped}</span> skipped
                      (already in list)
                    </p>
                  )}
                </>
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
