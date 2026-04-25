'use client'

import { useState, useMemo } from 'react'
import { useRouter } from 'next/navigation'
import Link from 'next/link'
import { Card } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import {
  Plus,
  Trash2,
  AlertCircle,
  Send,
  ArrowLeft,
} from 'lucide-react'
import { computeQuoteTotals } from '@/lib/quotes/calc'
import type {
  Quote,
  QuoteLineItem,
  QuoteStatus,
  MaterialCategory,
} from '@/lib/types/database'
import { MaterialPickerModal, type PickerMaterial } from './material-picker'

type QuoteWithJoins = Quote & {
  customers: { name: string; email: string | null } | null
  projects: { name: string } | null
}

interface QuoteBuilderClientProps {
  quote: QuoteWithJoins
  initialLineItems: QuoteLineItem[]
  categories: MaterialCategory[]
  materials: PickerMaterial[]
}

function formatCurrency(amount: number) {
  return new Intl.NumberFormat('en-US', {
    style: 'currency',
    currency: 'USD',
  }).format(amount)
}

function statusBadge(status: QuoteStatus) {
  switch (status) {
    case 'draft':
      return <Badge variant="default">Draft</Badge>
    case 'sent':
      return <Badge variant="warning">Sent</Badge>
    case 'accepted':
      return <Badge variant="success">Accepted</Badge>
    case 'declined':
      return <Badge variant="default">Declined</Badge>
    case 'expired':
      return <Badge variant="default">Expired</Badge>
    case 'converted':
      return <Badge variant="success">Converted</Badge>
  }
}

export function QuoteBuilderClient({
  quote: initialQuote,
  initialLineItems,
  categories,
  materials,
}: QuoteBuilderClientProps) {
  const router = useRouter()
  const [quote, setQuote] = useState<QuoteWithJoins>(initialQuote)
  const [lineItems, setLineItems] = useState<QuoteLineItem[]>(initialLineItems)
  const [error, setError] = useState<string | null>(null)
  const [busy, setBusy] = useState(false)
  const [pickerOpen, setPickerOpen] = useState(false)

  const readOnly = quote.status === 'converted'

  const totals = useMemo(
    () =>
      computeQuoteTotals(lineItems, {
        markup_enabled: quote.markup_enabled,
        markup_percent: quote.markup_percent,
        tax_enabled: quote.tax_enabled,
        tax_percent: quote.tax_percent,
        labor_rate: quote.labor_rate,
        labor_hours: quote.labor_hours,
        flat_fee_enabled: quote.flat_fee_enabled,
        flat_fee: quote.flat_fee,
      }),
    [lineItems, quote],
  )

  // Group line items by phase, in the order phases first appear in `categories`
  const groupedItems = useMemo(() => {
    const map = new Map<string, QuoteLineItem[]>()
    for (const cat of categories) map.set(cat.name, [])
    for (const item of lineItems) {
      if (!map.has(item.phase)) map.set(item.phase, [])
      map.get(item.phase)!.push(item)
    }
    return [...map.entries()].filter(([, items]) => items.length > 0)
  }, [lineItems, categories])

  async function patchQuote(updates: Partial<Quote>) {
    setBusy(true)
    setError(null)
    try {
      const res = await fetch(`/api/quotes/${quote.id}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(updates),
      })
      const data = await res.json()
      if (!res.ok) throw new Error(data.error ?? 'Save failed')
      setQuote({ ...quote, ...data.quote })
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Save failed')
    } finally {
      setBusy(false)
    }
  }

  async function addLineItem(materialId: string, quantity: number) {
    setBusy(true)
    setError(null)
    try {
      const res = await fetch(`/api/quotes/${quote.id}/line-items`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ material_id: materialId, quantity }),
      })
      const data = await res.json()
      if (!res.ok) throw new Error(data.error ?? 'Add failed')
      setLineItems([...lineItems, data.line_item])
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Add failed')
    } finally {
      setBusy(false)
    }
  }

  async function updateLineItemQuantity(lineId: string, quantity: number) {
    setBusy(true)
    setError(null)
    // Optimistic
    setLineItems((prev) =>
      prev.map((l) => (l.id === lineId ? { ...l, quantity } : l)),
    )
    try {
      const res = await fetch(
        `/api/quotes/${quote.id}/line-items/${lineId}`,
        {
          method: 'PATCH',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ quantity }),
        },
      )
      const data = await res.json()
      if (!res.ok) throw new Error(data.error ?? 'Update failed')
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Update failed')
      // Refresh from server on failure
      router.refresh()
    } finally {
      setBusy(false)
    }
  }

  async function deleteLineItem(lineId: string) {
    setBusy(true)
    setError(null)
    try {
      const res = await fetch(
        `/api/quotes/${quote.id}/line-items/${lineId}`,
        { method: 'DELETE' },
      )
      if (!res.ok) {
        const data = await res.json().catch(() => ({}))
        throw new Error(data.error ?? 'Delete failed')
      }
      setLineItems((prev) => prev.filter((l) => l.id !== lineId))
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Delete failed')
    } finally {
      setBusy(false)
    }
  }

  async function handleSend() {
    if (!confirm('Mark this quote as Sent?')) return
    await patchQuote({ status: 'sent' })
  }

  return (
    <div className="space-y-6 max-w-4xl">
      <div className="flex items-center justify-between flex-wrap gap-3">
        <Link
          href="/quotes"
          className="inline-flex items-center text-sm text-gray-600 hover:text-gray-900"
        >
          <ArrowLeft className="w-4 h-4 mr-1" /> All quotes
        </Link>
        {!readOnly && quote.status === 'draft' && (
          <Button onClick={handleSend} disabled={busy || lineItems.length === 0}>
            <Send className="w-4 h-4 mr-1" /> Mark as sent
          </Button>
        )}
      </div>

      {error && (
        <div
          role="alert"
          className="flex items-start gap-2 px-3 py-2 rounded-lg bg-red-50 border border-red-200 text-sm text-red-700"
        >
          <AlertCircle className="w-4 h-4 mt-0.5 shrink-0" />
          <span className="flex-1">{error}</span>
          <button
            onClick={() => setError(null)}
            className="text-red-500 hover:text-red-700 text-xs font-medium"
          >
            Dismiss
          </button>
        </div>
      )}

      <Card>
        <div className="flex items-center justify-between gap-3 flex-wrap">
          <div className="flex-1 min-w-0">
            <div className="flex items-center gap-2 mb-1 flex-wrap">
              <span className="text-xs text-gray-400 font-mono">
                #{quote.quote_number}
              </span>
              {statusBadge(quote.status)}
            </div>
            <h2 className="text-lg font-semibold text-gray-900 truncate">
              {quote.title}
            </h2>
            <p className="text-sm text-gray-500 truncate">
              {quote.customers?.name ?? 'Unknown customer'}
              {quote.projects ? ` · ${quote.projects.name}` : ''}
            </p>
          </div>
          <div className="text-right">
            <p className="text-xs text-gray-500">Grand total</p>
            <p className="text-2xl font-bold text-gray-900 tabular-nums">
              {formatCurrency(totals.grandTotal)}
            </p>
          </div>
        </div>
        {quote.description && (
          <p className="mt-3 text-sm text-gray-600 border-t border-gray-100 pt-3">
            <span className="font-medium">Customer-facing description:</span>{' '}
            {quote.description}
          </p>
        )}
      </Card>

      {/* Line items */}
      <Card className="p-0 overflow-hidden">
        <div className="flex items-center justify-between px-4 py-3 border-b border-gray-200 bg-gray-50">
          <h3 className="text-base font-semibold text-gray-900">Line items</h3>
          {!readOnly && (
            <Button
              size="sm"
              variant="secondary"
              onClick={() => setPickerOpen(true)}
              disabled={busy}
            >
              <Plus className="w-4 h-4 mr-1" /> Add material
            </Button>
          )}
        </div>

        {lineItems.length === 0 ? (
          <p className="text-sm text-gray-500 px-4 py-8 text-center">
            No line items yet. Add a material to start building this quote.
          </p>
        ) : (
          <div className="divide-y divide-gray-200">
            {groupedItems.map(([phase, items]) => {
              const phaseSubtotal = items.reduce(
                (sum, l) => sum + Number(l.unit_price) * Number(l.quantity),
                0,
              )
              return (
                <div key={phase}>
                  <div className="flex items-center justify-between px-4 py-2 bg-gray-50">
                    <p className="text-xs font-semibold uppercase tracking-wide text-gray-600">
                      {phase}
                    </p>
                    <p className="text-xs text-gray-500 tabular-nums">
                      {formatCurrency(phaseSubtotal)}
                    </p>
                  </div>
                  <ul className="divide-y divide-gray-100">
                    {items.map((item) => (
                      <LineItemRow
                        key={item.id}
                        item={item}
                        readOnly={readOnly}
                        onQuantityChange={(qty) =>
                          updateLineItemQuantity(item.id, qty)
                        }
                        onDelete={() => deleteLineItem(item.id)}
                      />
                    ))}
                  </ul>
                </div>
              )
            })}
          </div>
        )}
      </Card>

      {/* Pricing knobs */}
      <Card>
        <h3 className="text-base font-semibold text-gray-900 mb-3">Pricing</h3>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <ToggleNumber
            label="Markup (materials only)"
            suffix="%"
            enabled={quote.markup_enabled}
            value={quote.markup_percent}
            disabled={readOnly}
            onChange={(enabled, value) =>
              patchQuote({ markup_enabled: enabled, markup_percent: value })
            }
          />
          <ToggleNumber
            label="Sales tax"
            suffix="%"
            enabled={quote.tax_enabled}
            value={quote.tax_percent}
            disabled={readOnly}
            onChange={(enabled, value) =>
              patchQuote({ tax_enabled: enabled, tax_percent: value })
            }
          />
          <NumberInput
            label="Labor rate"
            prefix="$"
            suffix="/ hr"
            value={quote.labor_rate}
            disabled={readOnly}
            onChange={(value) => patchQuote({ labor_rate: value })}
          />
          <NumberInput
            label="Labor hours"
            value={quote.labor_hours}
            disabled={readOnly}
            onChange={(value) => patchQuote({ labor_hours: value })}
          />
          <ToggleNumber
            label="Flat fee (trip / call-out)"
            prefix="$"
            enabled={quote.flat_fee_enabled}
            value={quote.flat_fee}
            disabled={readOnly}
            onChange={(enabled, value) =>
              patchQuote({ flat_fee_enabled: enabled, flat_fee: value })
            }
          />
        </div>
      </Card>

      {/* Totals breakdown */}
      <Card>
        <h3 className="text-base font-semibold text-gray-900 mb-3">Totals</h3>
        <dl className="space-y-1.5 text-sm">
          <TotalsRow label="Materials" value={totals.materialsTotal} />
          {quote.markup_enabled && totals.markupAmount > 0 && (
            <TotalsRow
              label={`Markup (${quote.markup_percent}%)`}
              value={totals.markupAmount}
            />
          )}
          {totals.laborAmount > 0 && (
            <TotalsRow label="Labor" value={totals.laborAmount} />
          )}
          {quote.flat_fee_enabled && totals.flatFeeAmount > 0 && (
            <TotalsRow label="Flat fee" value={totals.flatFeeAmount} />
          )}
          <TotalsRow
            label="Subtotal"
            value={totals.subtotalBeforeTax}
            bold
          />
          {quote.tax_enabled && totals.taxAmount > 0 && (
            <TotalsRow
              label={`Tax (${quote.tax_percent}%)`}
              value={totals.taxAmount}
            />
          )}
          <div className="border-t border-gray-200 pt-2 mt-2">
            <TotalsRow label="Grand total" value={totals.grandTotal} large />
          </div>
        </dl>
      </Card>

      <MaterialPickerModal
        open={pickerOpen}
        onClose={() => setPickerOpen(false)}
        categories={categories}
        materials={materials}
        onAdd={addLineItem}
      />
    </div>
  )
}

function LineItemRow({
  item,
  readOnly,
  onQuantityChange,
  onDelete,
}: {
  item: QuoteLineItem
  readOnly: boolean
  onQuantityChange: (qty: number) => void
  onDelete: () => void
}) {
  const [draft, setDraft] = useState(String(item.quantity))

  return (
    <li className="flex items-center gap-3 px-4 py-2.5">
      <div className="flex-1 min-w-0">
        <p className="text-sm font-medium text-gray-900 truncate">
          {item.material_name}
        </p>
        <p className="text-xs text-gray-500">
          {formatCurrency(Number(item.unit_price))} per {item.unit}
        </p>
      </div>
      <div className="flex items-center gap-1">
        <input
          id={`qty-${item.id}`}
          type="number"
          step="0.01"
          min="0"
          value={draft}
          onChange={(e) => setDraft(e.target.value)}
          onBlur={() => {
            const n = Number(draft)
            if (!Number.isFinite(n) || n < 0) {
              setDraft(String(item.quantity))
              return
            }
            if (n !== Number(item.quantity)) onQuantityChange(n)
          }}
          disabled={readOnly}
          aria-label={`Quantity for ${item.material_name}`}
          className="w-20 px-2 py-1 border border-gray-300 rounded text-sm text-right tabular-nums focus:outline-none focus:ring-2 focus:ring-[#68BD45] focus:border-transparent disabled:bg-gray-50 disabled:text-gray-500"
        />
      </div>
      <p className="text-sm font-semibold text-gray-900 tabular-nums w-24 text-right shrink-0">
        {formatCurrency(Number(item.unit_price) * Number(item.quantity))}
      </p>
      {!readOnly && (
        <button
          type="button"
          onClick={onDelete}
          className="inline-flex items-center justify-center w-11 h-11 rounded-lg text-gray-500 hover:bg-red-50 hover:text-red-600 transition-colors focus:outline-none focus:ring-2 focus:ring-offset-1 focus:ring-[#68BD45]"
          aria-label={`Remove ${item.material_name}`}
        >
          <Trash2 className="w-4 h-4" />
        </button>
      )}
    </li>
  )
}

function ToggleNumber({
  label,
  enabled,
  value,
  disabled,
  prefix,
  suffix,
  onChange,
}: {
  label: string
  enabled: boolean
  value: number
  disabled: boolean
  prefix?: string
  suffix?: string
  onChange: (enabled: boolean, value: number) => void
}) {
  const [draft, setDraft] = useState(String(value))
  return (
    <div>
      <label className="flex items-center gap-2 text-sm font-medium text-gray-700 mb-1">
        <input
          type="checkbox"
          checked={enabled}
          disabled={disabled}
          onChange={(e) => onChange(e.target.checked, value)}
          className="rounded border-gray-300 text-[#68BD45] focus:ring-[#68BD45]"
        />
        {label}
      </label>
      <div className="flex items-center gap-1 text-sm">
        {prefix && <span className="text-gray-500">{prefix}</span>}
        <input
          type="number"
          step="0.01"
          min="0"
          value={draft}
          onChange={(e) => setDraft(e.target.value)}
          onBlur={() => {
            const n = Number(draft)
            if (!Number.isFinite(n) || n < 0) {
              setDraft(String(value))
              return
            }
            if (n !== Number(value)) onChange(enabled, n)
          }}
          disabled={disabled || !enabled}
          className="flex-1 px-2 py-1 border border-gray-300 rounded text-sm text-right tabular-nums focus:outline-none focus:ring-2 focus:ring-[#68BD45] focus:border-transparent disabled:bg-gray-50 disabled:text-gray-400"
        />
        {suffix && <span className="text-gray-500">{suffix}</span>}
      </div>
    </div>
  )
}

function NumberInput({
  label,
  value,
  disabled,
  prefix,
  suffix,
  onChange,
}: {
  label: string
  value: number
  disabled: boolean
  prefix?: string
  suffix?: string
  onChange: (value: number) => void
}) {
  const [draft, setDraft] = useState(String(value))
  return (
    <div>
      <p className="text-sm font-medium text-gray-700 mb-1">{label}</p>
      <div className="flex items-center gap-1 text-sm">
        {prefix && <span className="text-gray-500">{prefix}</span>}
        <input
          type="number"
          step="0.01"
          min="0"
          value={draft}
          onChange={(e) => setDraft(e.target.value)}
          onBlur={() => {
            const n = Number(draft)
            if (!Number.isFinite(n) || n < 0) {
              setDraft(String(value))
              return
            }
            if (n !== Number(value)) onChange(n)
          }}
          disabled={disabled}
          aria-label={label}
          className="flex-1 px-2 py-1 border border-gray-300 rounded text-sm text-right tabular-nums focus:outline-none focus:ring-2 focus:ring-[#68BD45] focus:border-transparent disabled:bg-gray-50 disabled:text-gray-400"
        />
        {suffix && <span className="text-gray-500">{suffix}</span>}
      </div>
    </div>
  )
}

function TotalsRow({
  label,
  value,
  bold,
  large,
}: {
  label: string
  value: number
  bold?: boolean
  large?: boolean
}) {
  return (
    <div
      className={`flex items-center justify-between ${
        large ? 'text-base' : ''
      }`}
    >
      <dt
        className={`text-gray-${bold || large ? '900' : '600'} ${
          bold || large ? 'font-semibold' : ''
        }`}
      >
        {label}
      </dt>
      <dd
        className={`tabular-nums text-gray-${bold || large ? '900' : '700'} ${
          bold || large ? 'font-semibold' : ''
        }`}
      >
        {formatCurrency(value)}
      </dd>
    </div>
  )
}
