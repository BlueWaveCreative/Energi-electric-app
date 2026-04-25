'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import { Button } from '@/components/ui/button'
import { Card } from '@/components/ui/card'
import { Input } from '@/components/ui/input'
import { Plus, Trash2 } from 'lucide-react'
import type { LineItemPreset } from '@/lib/types/database'

interface NewInvoiceClientProps {
  customers: { id: string; name: string; email: string | null }[]
  projects: { id: string; name: string; customer_id: string | null; status: string }[]
  presets: LineItemPreset[]
}

interface LineItem {
  description: string
  quantity: string
  unit_price: string
}

export function NewInvoiceClient({ customers, projects, presets }: NewInvoiceClientProps) {
  const router = useRouter()
  const [customerId, setCustomerId] = useState('')
  const [projectId, setProjectId] = useState('')
  const [title, setTitle] = useState('')
  const [issuedDate, setIssuedDate] = useState(new Date().toISOString().split('T')[0])
  const [dueDate, setDueDate] = useState('')
  const [notes, setNotes] = useState('')
  const [taxAmount, setTaxAmount] = useState('')
  const [lineItems, setLineItems] = useState<LineItem[]>([{ description: '', quantity: '1', unit_price: '' }])
  const [saving, setSaving] = useState(false)
  const [error, setError] = useState('')

  const filteredProjects = customerId
    ? projects.filter(p => p.customer_id === customerId)
    : projects

  function addLineItem() {
    setLineItems(prev => [...prev, { description: '', quantity: '1', unit_price: '' }])
  }

  function removeLineItem(idx: number) {
    setLineItems(prev => prev.filter((_, i) => i !== idx))
  }

  function updateLineItem(idx: number, field: keyof LineItem, value: string) {
    setLineItems(prev => prev.map((item, i) => i === idx ? { ...item, [field]: value } : item))
  }

  function applyPreset(idx: number, presetId: string) {
    const preset = presets.find(p => p.id === presetId)
    if (!preset) return
    setLineItems(prev => prev.map((item, i) =>
      i === idx
        ? { ...item, description: preset.name, unit_price: preset.default_unit_price?.toString() ?? '' }
        : item
    ))
  }

  function computeSubtotal() {
    return lineItems.reduce((sum, item) => {
      const qty = parseFloat(item.quantity) || 0
      const price = parseFloat(item.unit_price) || 0
      return sum + qty * price
    }, 0)
  }

  function formatCurrency(n: number) {
    return new Intl.NumberFormat('en-US', { style: 'currency', currency: 'USD' }).format(n)
  }

  async function handleSave(status: 'draft' | 'sent') {
    setError('')
    if (!customerId) { setError('Please select a customer.'); return }
    if (!title) { setError('Please enter a title.'); return }

    const validItems = lineItems.filter(i => i.description.trim())
    setSaving(true)
    try {
      const res = await fetch('/api/invoices', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          customer_id: customerId,
          project_id: projectId || null,
          title,
          issued_date: issuedDate,
          due_date: dueDate || null,
          notes: notes || null,
          tax_amount: parseFloat(taxAmount) || 0,
          line_items: validItems.map(i => ({
            description: i.description,
            quantity: parseFloat(i.quantity) || 1,
            unit_price: parseFloat(i.unit_price) || 0,
          })),
        }),
      })

      const data = await res.json()
      if (!res.ok) { setError(data.error ?? 'Failed to save.'); return }

      if (status === 'sent') {
        await fetch(`/api/invoices/${data.invoice.id}`, {
          method: 'PATCH',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ status: 'sent' }),
        })
      }

      router.push(`/invoices/${data.invoice.id}`)
    } finally {
      setSaving(false)
    }
  }

  const subtotal = computeSubtotal()
  const tax = parseFloat(taxAmount) || 0
  const total = subtotal + tax

  return (
    <div className="max-w-2xl space-y-6">
      {error && <p className="text-sm text-red-600 bg-red-50 p-3 rounded-lg">{error}</p>}

      <Card>
        <h2 className="font-semibold text-gray-900 mb-4">Invoice Details</h2>
        <div className="space-y-4">
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Customer *</label>
            <select
              value={customerId}
              onChange={e => { setCustomerId(e.target.value); setProjectId('') }}
              className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-[#045815]"
            >
              <option value="">Select customer...</option>
              {customers.map(c => <option key={c.id} value={c.id}>{c.name}</option>)}
            </select>
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Link to Project (optional)</label>
            <select
              value={projectId}
              onChange={e => setProjectId(e.target.value)}
              className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-[#045815]"
            >
              <option value="">No project</option>
              {filteredProjects.map(p => <option key={p.id} value={p.id}>{p.name}</option>)}
            </select>
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Title *</label>
            <Input value={title} onChange={e => setTitle(e.target.value)} placeholder="e.g. Rough-in Wiring - Phase 1" />
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Issued Date *</label>
              <Input type="date" value={issuedDate} onChange={e => setIssuedDate(e.target.value)} />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Due Date</label>
              <Input type="date" value={dueDate} onChange={e => setDueDate(e.target.value)} />
            </div>
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Notes (optional)</label>
            <textarea
              value={notes}
              onChange={e => setNotes(e.target.value)}
              rows={2}
              className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-[#045815] placeholder:text-gray-400"
              placeholder="Any notes for the customer..."
            />
          </div>
        </div>
      </Card>

      <Card>
        <h2 className="font-semibold text-gray-900 mb-4">Line Items</h2>
        <div className="space-y-3">
          {lineItems.map((item, idx) => (
            <div key={idx} className="space-y-2 pb-3 border-b border-gray-100 last:border-0 last:pb-0">
              <div className="flex gap-2">
                <select
                  onChange={e => { applyPreset(idx, e.target.value); e.target.value = '' }}
                  className="flex-1 border border-gray-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-[#045815]"
                  defaultValue=""
                >
                  <option value="">Pick a preset or type below...</option>
                  {presets.map(p => <option key={p.id} value={p.id}>{p.name}</option>)}
                </select>
                {lineItems.length > 1 && (
                  <button onClick={() => removeLineItem(idx)} className="text-red-400 hover:text-red-600 shrink-0">
                    <Trash2 className="w-4 h-4" />
                  </button>
                )}
              </div>
              <Input
                value={item.description}
                onChange={e => updateLineItem(idx, 'description', e.target.value)}
                placeholder="Description"
              />
              <div className="grid grid-cols-2 gap-2">
                <Input
                  type="number"
                  value={item.quantity}
                  onChange={e => updateLineItem(idx, 'quantity', e.target.value)}
                  placeholder="Qty"
                  min="0"
                  step="0.01"
                />
                <Input
                  type="number"
                  value={item.unit_price}
                  onChange={e => updateLineItem(idx, 'unit_price', e.target.value)}
                  placeholder="Unit price ($)"
                  min="0"
                  step="0.01"
                />
              </div>
              {item.quantity && item.unit_price && (
                <p className="text-xs text-gray-400 text-right">
                  {formatCurrency((parseFloat(item.quantity) || 0) * (parseFloat(item.unit_price) || 0))}
                </p>
              )}
            </div>
          ))}
        </div>

        <button
          onClick={addLineItem}
          className="mt-3 flex items-center gap-1 text-sm text-[#045815] hover:text-green-700 font-medium"
        >
          <Plus className="w-4 h-4" /> Add line item
        </button>

        <div className="mt-4 pt-4 border-t border-gray-100 space-y-2">
          <div className="flex justify-between text-sm text-gray-600">
            <span>Subtotal</span><span>{formatCurrency(subtotal)}</span>
          </div>
          <div className="flex items-center justify-between text-sm text-gray-600">
            <span>Tax</span>
            <div className="flex items-center gap-1">
              <span>$</span>
              <input
                type="number"
                value={taxAmount}
                onChange={e => setTaxAmount(e.target.value)}
                placeholder="0.00"
                min="0"
                step="0.01"
                className="w-24 border border-gray-300 rounded px-2 py-1 text-sm text-right focus:outline-none focus:ring-1 focus:ring-[#045815]"
              />
            </div>
          </div>
          <div className="flex justify-between font-semibold text-gray-900 text-base pt-1 border-t border-gray-200">
            <span>Total</span><span>{formatCurrency(total)}</span>
          </div>
        </div>
      </Card>

      <div className="flex gap-3">
        <Button variant="secondary" onClick={() => handleSave('draft')} disabled={saving}>
          Save as Draft
        </Button>
        <Button onClick={() => handleSave('sent')} disabled={saving}>
          Mark as Sent
        </Button>
      </div>
    </div>
  )
}
