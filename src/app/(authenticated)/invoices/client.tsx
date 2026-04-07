'use client'

import { useState } from 'react'
import Link from 'next/link'
import { Card } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { Plus } from 'lucide-react'
import type { InvoiceStatus } from '@/lib/types/database'

type InvoiceRow = {
  id: string
  invoice_number: number
  title: string
  status: InvoiceStatus
  tax_amount: number
  issued_date: string
  due_date: string | null
  customers: { name: string } | null
  projects: { name: string } | null
  invoice_line_items: { quantity: number; unit_price: number }[]
}

interface InvoicesClientProps {
  invoices: InvoiceRow[]
}

const STATUS_TABS: { label: string; value: 'all' | InvoiceStatus }[] = [
  { label: 'All', value: 'all' },
  { label: 'Draft', value: 'draft' },
  { label: 'Sent', value: 'sent' },
  { label: 'Paid', value: 'paid' },
]

function statusBadge(status: InvoiceStatus) {
  if (status === 'draft') return <Badge variant="default">Draft</Badge>
  if (status === 'sent') return <Badge variant="warning">Payment Due</Badge>
  return <Badge variant="success">Paid</Badge>
}

function formatCurrency(amount: number) {
  return new Intl.NumberFormat('en-US', { style: 'currency', currency: 'USD' }).format(amount)
}

export function InvoicesClient({ invoices }: InvoicesClientProps) {
  const [activeTab, setActiveTab] = useState<'all' | InvoiceStatus>('all')

  const filtered = activeTab === 'all' ? invoices : invoices.filter(i => i.status === activeTab)

  return (
    <div className="space-y-4 max-w-4xl">
      <div className="flex items-center justify-between">
        <div className="flex gap-2 flex-wrap">
          {STATUS_TABS.map(tab => (
            <button
              key={tab.value}
              onClick={() => setActiveTab(tab.value)}
              className={`px-4 py-1.5 rounded-full text-sm font-medium transition-colors ${
                activeTab === tab.value
                  ? 'bg-[#68BD45] text-white'
                  : 'bg-gray-100 text-gray-600 hover:bg-gray-200'
              }`}
            >
              {tab.label}
            </button>
          ))}
        </div>
        <Link
          href="/invoices/new"
          className="inline-flex items-center px-4 py-2 text-sm font-medium rounded-xl bg-[#68BD45] text-white hover:bg-[#5aa83c] transition-colors shadow-sm hover:shadow-md"
        >
          <Plus className="w-4 h-4 mr-2" /> New Invoice
        </Link>
      </div>

      {filtered.length === 0 ? (
        <Card>
          <p className="text-gray-500 text-sm text-center py-4">No invoices yet.</p>
        </Card>
      ) : (
        <div className="space-y-2">
          {filtered.map(invoice => {
            const subtotal = invoice.invoice_line_items.reduce((s, i) => s + i.quantity * i.unit_price, 0)
            const total = subtotal + invoice.tax_amount
            return (
              <Link key={invoice.id} href={`/invoices/${invoice.id}`}>
                <Card className="hover:shadow-md transition-shadow cursor-pointer">
                  <div className="flex items-center justify-between gap-4">
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2 mb-1">
                        <span className="text-xs text-gray-400 font-mono">#{invoice.invoice_number}</span>
                        {statusBadge(invoice.status)}
                      </div>
                      <p className="font-medium text-gray-900 truncate">{invoice.title}</p>
                      <p className="text-sm text-gray-500">
                        {invoice.customers?.name}
                        {invoice.projects ? ` · ${invoice.projects.name}` : ''}
                      </p>
                    </div>
                    <div className="text-right shrink-0">
                      <p className="font-semibold text-gray-900">{formatCurrency(total)}</p>
                      <p className="text-xs text-gray-400">
                        {invoice.due_date
                          ? `Due ${new Date(invoice.due_date + 'T00:00:00').toLocaleDateString('en-US', { month: 'short', day: 'numeric' })}`
                          : new Date(invoice.issued_date + 'T00:00:00').toLocaleDateString('en-US', { month: 'short', day: 'numeric' })}
                      </p>
                    </div>
                  </div>
                </Card>
              </Link>
            )
          })}
        </div>
      )}
    </div>
  )
}
