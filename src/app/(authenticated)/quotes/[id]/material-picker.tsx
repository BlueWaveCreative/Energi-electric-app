'use client'

import { useState, useMemo } from 'react'
import { Modal } from '@/components/ui/modal'
import { Button } from '@/components/ui/button'
import { Search, Plus } from 'lucide-react'
import type { MaterialCategory } from '@/lib/types/database'

export type PickerMaterial = {
  id: string
  name: string
  unit: string
  price: number
  category_id: string
  sort_order: number
}

interface MaterialPickerModalProps {
  open: boolean
  onClose: () => void
  categories: MaterialCategory[]
  materials: PickerMaterial[]
  onAdd: (materialId: string, quantity: number) => Promise<void> | void
}

function formatCurrency(amount: number) {
  return new Intl.NumberFormat('en-US', {
    style: 'currency',
    currency: 'USD',
  }).format(amount)
}

export function MaterialPickerModal({
  open,
  onClose,
  categories,
  materials,
  onAdd,
}: MaterialPickerModalProps) {
  const [search, setSearch] = useState('')
  const [selected, setSelected] = useState<PickerMaterial | null>(null)
  const [quantity, setQuantity] = useState('1')
  const [submitting, setSubmitting] = useState(false)
  const [error, setError] = useState<string | null>(null)

  const filtered = useMemo(() => {
    if (!search.trim()) return materials
    const q = search.toLowerCase()
    return materials.filter((m) => m.name.toLowerCase().includes(q))
  }, [materials, search])

  const grouped = useMemo(() => {
    const map = new Map<string, PickerMaterial[]>()
    for (const cat of categories) map.set(cat.id, [])
    for (const m of filtered) {
      const list = map.get(m.category_id)
      if (list) list.push(m)
    }
    return map
  }, [categories, filtered])

  function reset() {
    setSearch('')
    setSelected(null)
    setQuantity('1')
    setError(null)
  }

  function handleClose() {
    if (submitting) return
    reset()
    onClose()
  }

  async function handleAdd() {
    if (!selected) return
    const n = Number(quantity)
    if (!Number.isFinite(n) || n <= 0) {
      setError('Quantity must be greater than 0.')
      return
    }
    setSubmitting(true)
    setError(null)
    try {
      await onAdd(selected.id, n)
      reset()
      onClose()
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to add')
    } finally {
      setSubmitting(false)
    }
  }

  return (
    <Modal
      open={open}
      onClose={handleClose}
      title={selected ? `Add ${selected.name}` : 'Add material'}
      className="max-w-2xl"
    >
      {selected ? (
        <div className="space-y-4">
          <div className="bg-gray-50 rounded-lg px-3 py-2">
            <p className="text-sm font-medium text-gray-900">{selected.name}</p>
            <p className="text-xs text-gray-500">
              {formatCurrency(Number(selected.price))} per {selected.unit}
            </p>
          </div>
          <div>
            <label
              htmlFor="picker-qty"
              className="block text-sm font-medium text-gray-700 mb-1"
            >
              Quantity ({selected.unit})
            </label>
            <input
              id="picker-qty"
              type="number"
              step="0.01"
              min="0.01"
              value={quantity}
              onChange={(e) => setQuantity(e.target.value)}
              autoFocus
              className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-[#68BD45] focus:border-transparent text-sm tabular-nums"
            />
          </div>
          {error && (
            <p role="alert" className="text-sm text-red-600">
              {error}
            </p>
          )}
          <div className="flex justify-between gap-2 pt-2">
            <Button
              type="button"
              variant="ghost"
              onClick={() => {
                setSelected(null)
                setError(null)
              }}
            >
              ← Pick a different material
            </Button>
            <div className="flex gap-2">
              <Button type="button" variant="secondary" onClick={handleClose}>
                Cancel
              </Button>
              <Button type="button" onClick={handleAdd} disabled={submitting}>
                {submitting ? 'Adding…' : 'Add to quote'}
              </Button>
            </div>
          </div>
        </div>
      ) : (
        <div className="space-y-3">
          <div className="relative">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400 pointer-events-none" />
            <input
              type="search"
              placeholder="Search materials…"
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              autoFocus
              aria-label="Search materials"
              className="w-full pl-9 pr-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-[#68BD45] focus:border-transparent text-sm"
            />
          </div>

          <div className="border border-gray-200 rounded-lg max-h-[400px] overflow-y-auto">
            {categories.length === 0 || materials.length === 0 ? (
              <p className="text-sm text-gray-500 text-center py-8">
                No materials available. Add materials in the{' '}
                <a href="/materials" className="text-[#68BD45] hover:underline">
                  Materials
                </a>{' '}
                page first.
              </p>
            ) : (
              <ul className="divide-y divide-gray-100">
                {categories.map((cat) => {
                  const items = grouped.get(cat.id) ?? []
                  if (items.length === 0) return null
                  return (
                    <li key={cat.id}>
                      <p className="px-3 py-1.5 text-xs font-semibold uppercase tracking-wide text-gray-600 bg-gray-50 sticky top-0">
                        {cat.name}
                      </p>
                      <ul className="divide-y divide-gray-100">
                        {items.map((m) => (
                          <li key={m.id}>
                            <button
                              type="button"
                              onClick={() => setSelected(m)}
                              className="w-full flex items-center gap-3 px-3 py-2 text-left hover:bg-gray-50 focus:outline-none focus:bg-gray-100"
                            >
                              <div className="flex-1 min-w-0">
                                <p className="text-sm text-gray-900 truncate">
                                  {m.name}
                                </p>
                                <p className="text-xs text-gray-500">
                                  per {m.unit}
                                </p>
                              </div>
                              <p className="text-sm font-medium text-gray-900 tabular-nums shrink-0">
                                {formatCurrency(Number(m.price))}
                              </p>
                              <Plus className="w-4 h-4 text-gray-400 shrink-0" />
                            </button>
                          </li>
                        ))}
                      </ul>
                    </li>
                  )
                })}
                {filtered.length === 0 && (
                  <li className="text-sm text-gray-500 text-center py-6">
                    No matches for &ldquo;{search}&rdquo;.
                  </li>
                )}
              </ul>
            )}
          </div>
        </div>
      )}
    </Modal>
  )
}
