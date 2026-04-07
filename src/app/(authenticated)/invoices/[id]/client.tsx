'use client'

import { useState } from 'react'
import { Card } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { CheckCircle, Send, Bell } from 'lucide-react'
import type { InvoiceStatus, InvoiceLineItem } from '@/lib/types/database'

interface InvoiceDetailClientProps {
  invoice: {
    id: string
    invoice_number: number
    title: string
    status: InvoiceStatus
    tax_amount: number
    notes: string | null
    issued_date: string
    due_date: string | null
    notified_at: string | null
    invoice_line_items: InvoiceLineItem[]
    customers: { name: string; email: string | null; portal_token: string } | null
    projects: { name: string } | null
  }
}

function formatCurrency(n: number) {
  return new Intl.NumberFormat('en-US', { style: 'currency', currency: 'USD' }).format(n)
}

function formatDate(d: string) {
  return new Date(d + 'T00:00:00').toLocaleDateString('en-US', { month: 'long', day: 'numeric', year: 'numeric' })
}

function statusLabel(status: InvoiceStatus) {
  if (status === 'draft') return 'Draft'
  if (status === 'sent') return 'Payment Due'
  return 'Paid'
}

function statusClass(status: InvoiceStatus) {
  if (status === 'draft') return 'bg-gray-100 text-gray-600'
  if (status === 'sent') return 'bg-yellow-100 text-yellow-700'
  return 'bg-green-100 text-green-700'
}

export function InvoiceDetailClient({ invoice }: InvoiceDetailClientProps) {
  const [status, setStatus] = useState<InvoiceStatus>(invoice.status)
  const [notifiedAt, setNotifiedAt] = useState(invoice.notified_at)
  const [loading, setLoading] = useState(false)
  const [notifyPrompt, setNotifyPrompt] = useState(false)

  const subtotal = invoice.invoice_line_items.reduce(
    (sum, item) => sum + item.quantity * item.unit_price, 0
  )
  const total = subtotal + invoice.tax_amount

  async function markSent() {
    setLoading(true)
    await fetch(`/api/invoices/${invoice.id}`, {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ status: 'sent' }),
    })
    setStatus('sent')
    setLoading(false)
    setNotifyPrompt(true)
  }

  async function markPaid() {
    setLoading(true)
    await fetch(`/api/invoices/${invoice.id}`, {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ status: 'paid' }),
    })
    setStatus('paid')
    setLoading(false)
  }

  async function sendNotification() {
    setLoading(true)
    const res = await fetch(`/api/invoices/${invoice.id}/notify`, { method: 'POST' })
    if (res.ok) {
      setNotifiedAt(new Date().toISOString())
    }
    setNotifyPrompt(false)
    setLoading(false)
  }

  return (
    <div className="max-w-2xl space-y-4">
      {notifyPrompt && invoice.customers?.email && (
        <Card>
          <p className="text-sm text-gray-700 mb-3">
            Send <strong>{invoice.customers.name}</strong> an email notification about this invoice?
          </p>
          <div className="flex gap-2">
            <Button onClick={sendNotification} disabled={loading}>
              <Bell className="w-4 h-4 mr-1" /> Send Email
            </Button>
            <Button variant="secondary" onClick={() => setNotifyPrompt(false)}>Skip</Button>
          </div>
        </Card>
      )}

      <Card>
        <div className="flex items-start justify-between mb-4">
          <div>
            <div className="flex items-center gap-2 mb-1">
              <span className="font-mono text-sm text-gray-400">#{invoice.invoice_number}</span>
              <span className={`text-xs font-medium px-2.5 py-1 rounded-full ${statusClass(status)}`}>
                {statusLabel(status)}
              </span>
            </div>
            <h2 className="text-xl font-semibold text-gray-900">{invoice.title}</h2>
            <p className="text-sm text-gray-500">
              {invoice.customers?.name}
              {invoice.projects ? ` · ${invoice.projects.name}` : ''}
            </p>
          </div>
          <div className="text-right">
            <p className="text-2xl font-bold text-gray-900">{formatCurrency(total)}</p>
            {invoice.due_date && (
              <p className="text-xs text-gray-500">Due {formatDate(invoice.due_date)}</p>
            )}
          </div>
        </div>

        <div className="text-sm text-gray-500 mb-4">
          Issued {formatDate(invoice.issued_date)}
          {notifiedAt && (
            <span className="ml-3 text-[#68BD45]">
              · Notified {new Date(notifiedAt).toLocaleDateString()}
            </span>
          )}
        </div>

        {invoice.notes && (
          <p className="text-sm text-gray-600 bg-gray-50 rounded-lg p-3 mb-4">{invoice.notes}</p>
        )}

        <div className="space-y-2 border-t border-gray-100 pt-4">
          {invoice.invoice_line_items.map(item => (
            <div key={item.id} className="flex justify-between text-sm">
              <span className="text-gray-700">
                {item.description}
                {item.quantity !== 1 && <span className="text-gray-400"> × {item.quantity}</span>}
              </span>
              <span className="text-gray-900 font-medium">
                {formatCurrency(item.quantity * item.unit_price)}
              </span>
            </div>
          ))}
          <div className="pt-2 border-t border-gray-100 space-y-1">
            <div className="flex justify-between text-sm text-gray-500">
              <span>Subtotal</span><span>{formatCurrency(subtotal)}</span>
            </div>
            {invoice.tax_amount > 0 && (
              <div className="flex justify-between text-sm text-gray-500">
                <span>Tax</span><span>{formatCurrency(invoice.tax_amount)}</span>
              </div>
            )}
            <div className="flex justify-between font-semibold text-gray-900 text-base">
              <span>Total</span><span>{formatCurrency(total)}</span>
            </div>
          </div>
        </div>
      </Card>

      <div className="flex gap-3 flex-wrap">
        {status === 'draft' && (
          <Button onClick={markSent} disabled={loading}>
            <Send className="w-4 h-4 mr-2" /> Mark as Sent
          </Button>
        )}
        {status === 'sent' && (
          <Button onClick={markPaid} disabled={loading}>
            <CheckCircle className="w-4 h-4 mr-2" /> Mark as Paid
          </Button>
        )}
        <a
          href={`/api/portal/invoice/${invoice.id}/pdf?token=${invoice.customers?.portal_token ?? ''}`}
          target="_blank"
          rel="noopener noreferrer"
          className="inline-flex items-center px-4 py-2 border border-gray-300 rounded-lg text-sm font-medium text-gray-700 hover:bg-gray-50 transition-colors"
        >
          Download PDF
        </a>
      </div>
    </div>
  )
}
