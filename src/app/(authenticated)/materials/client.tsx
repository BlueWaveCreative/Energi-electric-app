'use client'

import { useState, useMemo } from 'react'
import { useRouter } from 'next/navigation'
import { Card } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Modal } from '@/components/ui/modal'
import { Plus, Pencil, Trash2, Search, AlertCircle, Download, Upload } from 'lucide-react'
import type { Material, MaterialCategory, MaterialUnit } from '@/lib/types/database'
import { generateCSV, downloadCSV } from '@/lib/csv'
import { ImportModal } from './import-modal'

const UNIT_OPTIONS: MaterialUnit[] = ['ft', 'ea', 'box', 'bag', 'set']

interface MaterialsClientProps {
  categories: MaterialCategory[]
  materials: Material[]
}

interface MaterialFormState {
  id?: string
  name: string
  unit: MaterialUnit
  price: string
  category_id: string
}

const blankForm = (categoryId: string): MaterialFormState => ({
  name: '',
  unit: 'ea',
  price: '',
  category_id: categoryId,
})

function formatCurrency(amount: number) {
  return new Intl.NumberFormat('en-US', {
    style: 'currency',
    currency: 'USD',
  }).format(amount)
}

const ICON_BUTTON_BASE =
  'inline-flex items-center justify-center w-11 h-11 rounded-lg transition-colors focus:outline-none focus:ring-2 focus:ring-offset-1 focus:ring-[#045815]'

export function MaterialsClient({ categories, materials }: MaterialsClientProps) {
  const router = useRouter()
  const [search, setSearch] = useState('')

  const [formOpen, setFormOpen] = useState(false)
  const [form, setForm] = useState<MaterialFormState | null>(null)
  const [submitting, setSubmitting] = useState(false)
  const [formError, setFormError] = useState<string | null>(null)

  const [deleteTarget, setDeleteTarget] = useState<Material | null>(null)
  const [deleting, setDeleting] = useState(false)

  const [pageError, setPageError] = useState<string | null>(null)
  const [importOpen, setImportOpen] = useState(false)

  const filtered = useMemo(() => {
    if (!search.trim()) return materials
    const q = search.toLowerCase()
    return materials.filter((m) => m.name.toLowerCase().includes(q))
  }, [materials, search])

  const grouped = useMemo(() => {
    const map = new Map<string, Material[]>()
    for (const cat of categories) map.set(cat.id, [])
    for (const m of filtered) {
      const list = map.get(m.category_id)
      if (list) list.push(m)
    }
    return map
  }, [categories, filtered])

  const noSearchMatches = search.trim().length > 0 && filtered.length === 0

  function openNew(categoryId: string) {
    setForm(blankForm(categoryId))
    setFormError(null)
    setFormOpen(true)
  }

  function openEdit(material: Material) {
    setForm({
      id: material.id,
      name: material.name,
      unit: material.unit,
      price: material.price.toString(),
      category_id: material.category_id,
    })
    setFormError(null)
    setFormOpen(true)
  }

  function closeForm() {
    setFormOpen(false)
    setForm(null)
    setFormError(null)
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    if (!form) return
    if (!form.name.trim()) {
      setFormError('Name is required.')
      return
    }
    const priceNum = Number(form.price)
    if (Number.isNaN(priceNum) || priceNum < 0) {
      setFormError('Price must be 0 or greater.')
      return
    }

    setSubmitting(true)
    setFormError(null)

    const payload = {
      name: form.name.trim(),
      unit: form.unit,
      price: priceNum,
      category_id: form.category_id,
    }

    const url = form.id ? `/api/materials/${form.id}` : '/api/materials'
    const method = form.id ? 'PATCH' : 'POST'

    try {
      const res = await fetch(url, {
        method,
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload),
      })
      if (!res.ok) {
        const data = await res.json().catch(() => ({}))
        throw new Error(data.error ?? 'Save failed.')
      }
      closeForm()
      router.refresh()
    } catch (err) {
      setFormError(err instanceof Error ? err.message : 'Save failed.')
    } finally {
      setSubmitting(false)
    }
  }

  async function confirmDelete() {
    if (!deleteTarget) return
    setDeleting(true)
    setPageError(null)
    try {
      const res = await fetch(`/api/materials/${deleteTarget.id}`, {
        method: 'DELETE',
      })
      if (!res.ok) {
        const data = await res.json().catch(() => ({}))
        throw new Error(data.error ?? 'Delete failed.')
      }
      setDeleteTarget(null)
      router.refresh()
    } catch (err) {
      setPageError(err instanceof Error ? err.message : 'Delete failed.')
      setDeleteTarget(null)
    } finally {
      setDeleting(false)
    }
  }

  function handleExport() {
    const categoryById = new Map(categories.map((c) => [c.id, c.name]))
    const headers = ['name', 'unit', 'price', 'category']
    const rows = materials.map((m) => [
      m.name,
      m.unit,
      m.price.toString(),
      categoryById.get(m.category_id) ?? '',
    ])
    const csv = generateCSV(headers, rows)
    const date = new Date().toISOString().slice(0, 10)
    downloadCSV(csv, `energi-materials-${date}.csv`)
  }

  if (categories.length === 0) {
    return (
      <Card>
        <p className="text-sm text-gray-600 text-center py-8">
          No material categories configured. Run migration{' '}
          <code className="font-mono text-xs bg-gray-100 px-1 py-0.5 rounded">
            010_materials_quotes.sql
          </code>{' '}
          to seed the defaults.
        </p>
      </Card>
    )
  }

  return (
    <div className="space-y-6 max-w-5xl">
      {pageError && (
        <div
          role="alert"
          className="flex items-start gap-2 px-3 py-2 rounded-lg bg-red-50 border border-red-200 text-sm text-red-700"
        >
          <AlertCircle className="w-4 h-4 mt-0.5 shrink-0" />
          <span className="flex-1">{pageError}</span>
          <button
            onClick={() => setPageError(null)}
            className="text-red-500 hover:text-red-700 text-xs font-medium"
          >
            Dismiss
          </button>
        </div>
      )}

      <div className="flex items-center gap-3 flex-wrap">
        <div className="relative flex-1 min-w-[200px] max-w-sm">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400 pointer-events-none" />
          <input
            type="search"
            placeholder="Search materials…"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            aria-label="Search materials"
            className="w-full pl-9 pr-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-[#045815] focus:border-transparent text-sm"
          />
        </div>
        <p className="text-sm text-gray-500" aria-live="polite">
          {filtered.length} of {materials.length}
        </p>
        <div className="flex gap-2 w-full sm:w-auto sm:ml-auto">
          <Button
            size="sm"
            variant="secondary"
            onClick={handleExport}
            disabled={materials.length === 0}
            className="flex-1 sm:flex-none"
          >
            <Download className="w-4 h-4 mr-1" /> Export
          </Button>
          <Button
            size="sm"
            variant="secondary"
            onClick={() => setImportOpen(true)}
            className="flex-1 sm:flex-none"
          >
            <Upload className="w-4 h-4 mr-1" /> Import
          </Button>
        </div>
      </div>

      {noSearchMatches && (
        <Card>
          <p className="text-sm text-gray-600 text-center py-4">
            No materials match &ldquo;{search}&rdquo;.
          </p>
        </Card>
      )}

      <div className="space-y-6">
        {categories.map((cat) => {
          const items = grouped.get(cat.id) ?? []
          // Hide empty categories during a search to reduce noise.
          if (search.trim() && items.length === 0) return null
          return (
            <Card key={cat.id} className="p-0 overflow-hidden">
              <div className="flex items-center justify-between px-4 py-3 border-b border-gray-200 bg-gray-50">
                <div>
                  <h2 className="text-base font-semibold text-gray-900">{cat.name}</h2>
                  <p className="text-xs text-gray-500">
                    {items.length} {items.length === 1 ? 'material' : 'materials'}
                  </p>
                </div>
                <Button size="sm" variant="secondary" onClick={() => openNew(cat.id)}>
                  <Plus className="w-4 h-4 mr-1" /> Add
                </Button>
              </div>

              {items.length === 0 ? (
                <p className="text-sm text-gray-500 px-4 py-6 text-center">
                  No materials yet.
                </p>
              ) : (
                <ul className="divide-y divide-gray-100">
                  {items.map((m) => (
                    <li
                      key={m.id}
                      className="flex items-center gap-2 sm:gap-3 px-3 sm:px-4 py-2.5 hover:bg-gray-50"
                    >
                      <div className="flex-1 min-w-0">
                        <p className="text-sm font-medium text-gray-900 truncate">
                          {m.name}
                        </p>
                        <p className="text-xs text-gray-500">per {m.unit}</p>
                      </div>
                      <p className="text-sm font-semibold text-gray-900 tabular-nums w-24 text-right shrink-0">
                        {formatCurrency(m.price)}
                      </p>
                      <div className="flex items-center gap-1 shrink-0">
                        <button
                          type="button"
                          onClick={() => openEdit(m)}
                          className={`${ICON_BUTTON_BASE} text-gray-500 hover:bg-gray-200 hover:text-gray-700`}
                          aria-label={`Edit ${m.name}`}
                        >
                          <Pencil className="w-4 h-4" />
                        </button>
                        <button
                          type="button"
                          onClick={() => setDeleteTarget(m)}
                          className={`${ICON_BUTTON_BASE} text-gray-500 hover:bg-red-50 hover:text-red-600`}
                          aria-label={`Delete ${m.name}`}
                        >
                          <Trash2 className="w-4 h-4" />
                        </button>
                      </div>
                    </li>
                  ))}
                </ul>
              )}
            </Card>
          )
        })}
      </div>

      <Modal
        open={formOpen}
        onClose={() => !submitting && closeForm()}
        title={form?.id ? 'Edit material' : 'New material'}
      >
        {form && (
          <form onSubmit={handleSubmit} className="space-y-4">
            <Input
              id="material-name"
              label="Name"
              value={form.name}
              onChange={(e) => setForm({ ...form, name: e.target.value })}
              autoFocus
              required
            />
            <div className="grid grid-cols-2 gap-3">
              <div>
                <label
                  htmlFor="material-unit"
                  className="block text-sm font-medium text-gray-700 mb-1"
                >
                  Unit
                </label>
                <select
                  id="material-unit"
                  value={form.unit}
                  onChange={(e) =>
                    setForm({ ...form, unit: e.target.value as MaterialUnit })
                  }
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-[#045815] focus:border-transparent text-sm"
                >
                  {UNIT_OPTIONS.map((u) => (
                    <option key={u} value={u}>
                      {u}
                    </option>
                  ))}
                </select>
              </div>
              <Input
                id="material-price"
                label="Price (USD)"
                type="number"
                step="0.01"
                min="0"
                value={form.price}
                onChange={(e) => setForm({ ...form, price: e.target.value })}
                required
              />
            </div>
            <div>
              <label
                htmlFor="material-category"
                className="block text-sm font-medium text-gray-700 mb-1"
              >
                Category
              </label>
              <select
                id="material-category"
                value={form.category_id}
                onChange={(e) =>
                  setForm({ ...form, category_id: e.target.value })
                }
                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-[#045815] focus:border-transparent text-sm"
              >
                {categories.map((c) => (
                  <option key={c.id} value={c.id}>
                    {c.name}
                  </option>
                ))}
              </select>
            </div>
            {formError && (
              <p role="alert" className="text-sm text-red-600">
                {formError}
              </p>
            )}
            <div className="flex justify-end gap-2 pt-2">
              <Button type="button" variant="secondary" onClick={closeForm}>
                Cancel
              </Button>
              <Button type="submit" disabled={submitting}>
                {submitting ? 'Saving…' : 'Save'}
              </Button>
            </div>
          </form>
        )}
      </Modal>

      <ImportModal
        open={importOpen}
        onClose={() => setImportOpen(false)}
        onSuccess={() => router.refresh()}
        validCategoryNames={categories.map((c) => c.name)}
      />

      <Modal
        open={deleteTarget !== null}
        onClose={() => !deleting && setDeleteTarget(null)}
        title="Delete material?"
      >
        {deleteTarget && (
          <div className="space-y-4">
            <p className="text-sm text-gray-700">
              Remove <span className="font-semibold">{deleteTarget.name}</span> from your
              materials list? Existing quotes that used this item are unaffected.
            </p>
            <div className="flex justify-end gap-2">
              <Button
                type="button"
                variant="secondary"
                onClick={() => setDeleteTarget(null)}
                disabled={deleting}
              >
                Cancel
              </Button>
              <Button
                type="button"
                variant="danger"
                onClick={confirmDelete}
                disabled={deleting}
              >
                {deleting ? 'Deleting…' : 'Delete'}
              </Button>
            </div>
          </div>
        )}
      </Modal>
    </div>
  )
}
