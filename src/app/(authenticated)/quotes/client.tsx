'use client'

import { useState } from 'react'
import Link from 'next/link'
import { Card } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { Plus } from 'lucide-react'
import { computeQuoteTotals } from '@/lib/quotes/calc'
import type { QuoteStatus, QuoteJobType } from '@/lib/types/database'

type QuoteRow = {
  id: string
  quote_number: number
  title: string
  status: QuoteStatus
  job_type: QuoteJobType
  issued_date: string
  valid_until: string | null
  markup_enabled: boolean
  markup_percent: number
  tax_enabled: boolean
  tax_percent: number
  labor_rate: number
  labor_hours: number
  flat_fee_enabled: boolean
  flat_fee: number
  customers: { name: string } | null
  projects: { name: string } | null
  quote_line_items: { quantity: number; unit_price: number }[]
}

interface QuotesClientProps {
  quotes: QuoteRow[]
}

const STATUS_TABS: { label: string; value: 'all' | QuoteStatus }[] = [
  { label: 'All', value: 'all' },
  { label: 'Draft', value: 'draft' },
  { label: 'Sent', value: 'sent' },
  { label: 'Accepted', value: 'accepted' },
  { label: 'Converted', value: 'converted' },
]

const JOB_TYPE_LABEL: Record<QuoteJobType, string> = {
  rough_in: 'Rough-In',
  trim_out: 'Trim-Out',
  service: 'Service',
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
      return <Badge variant="danger">Declined</Badge>
    case 'expired':
      return (
        <Badge variant="default" className="line-through">
          Expired
        </Badge>
      )
    case 'converted':
      return <Badge variant="info">Converted</Badge>
  }
}

function formatCurrency(amount: number) {
  return new Intl.NumberFormat('en-US', {
    style: 'currency',
    currency: 'USD',
  }).format(amount)
}

export function QuotesClient({ quotes }: QuotesClientProps) {
  const [activeTab, setActiveTab] = useState<'all' | QuoteStatus>('all')

  const filtered =
    activeTab === 'all' ? quotes : quotes.filter((q) => q.status === activeTab)

  return (
    <div className="space-y-4 max-w-4xl">
      <div className="flex items-center justify-between gap-3 flex-wrap">
        <div className="flex gap-2 flex-wrap">
          {STATUS_TABS.map((tab) => (
            <button
              key={tab.value}
              onClick={() => setActiveTab(tab.value)}
              className={`px-4 py-1.5 rounded-full text-sm font-medium transition-colors ${
                activeTab === tab.value
                  ? 'bg-[#045815] text-white'
                  : 'bg-gray-100 text-gray-600 hover:bg-gray-200'
              }`}
            >
              {tab.label}
            </button>
          ))}
        </div>
        <Link
          href="/quotes/new"
          className="inline-flex items-center px-4 py-2 text-sm font-medium rounded-xl bg-[#045815] text-white hover:bg-[#023510] transition-colors shadow-sm hover:shadow-md focus:outline-none focus:ring-2 focus:ring-[#045815] focus:ring-offset-2"
        >
          <Plus className="w-4 h-4 mr-2" /> New Quote
        </Link>
      </div>

      {filtered.length === 0 ? (
        <Card>
          <div className="text-center py-6 space-y-3">
            <p className="text-gray-500 text-sm">
              {quotes.length === 0
                ? 'No quotes yet. Create one to get started.'
                : `No ${activeTab} quotes.`}
            </p>
            {quotes.length === 0 && (
              <Link
                href="/quotes/new"
                className="inline-flex items-center px-4 py-2 text-sm font-medium rounded-xl bg-[#045815] text-white hover:bg-[#023510] focus:outline-none focus:ring-2 focus:ring-[#045815] focus:ring-offset-2"
              >
                <Plus className="w-4 h-4 mr-1" /> New quote
              </Link>
            )}
          </div>
        </Card>
      ) : (
        <div className="space-y-2">
          {filtered.map((q) => {
            const totals = computeQuoteTotals(q.quote_line_items, {
              markup_enabled: q.markup_enabled,
              markup_percent: q.markup_percent,
              tax_enabled: q.tax_enabled,
              tax_percent: q.tax_percent,
              labor_rate: q.labor_rate,
              labor_hours: q.labor_hours,
              flat_fee_enabled: q.flat_fee_enabled,
              flat_fee: q.flat_fee,
            })
            return (
              <Link
                key={q.id}
                href={`/quotes/${q.id}`}
                aria-label={`Open quote #${q.quote_number}: ${q.title}`}
                className="block focus:outline-none focus:ring-2 focus:ring-[#045815] focus:ring-offset-2 rounded-xl"
              >
                <Card className="hover:shadow-md transition-shadow cursor-pointer">
                  <div className="flex items-center justify-between gap-4">
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2 mb-1 flex-wrap">
                        <span className="text-xs text-gray-400 font-mono">
                          #{q.quote_number}
                        </span>
                        {statusBadge(q.status)}
                        <span className="text-xs text-gray-500">
                          {JOB_TYPE_LABEL[q.job_type]}
                        </span>
                      </div>
                      <p className="font-medium text-gray-900 truncate">{q.title}</p>
                      <p className="text-sm text-gray-500 truncate">
                        {q.customers?.name ?? 'Unknown customer'}
                        {q.projects ? ` · ${q.projects.name}` : ''}
                      </p>
                    </div>
                    <div className="text-right shrink-0">
                      <p className="font-semibold text-gray-900 tabular-nums">
                        {formatCurrency(totals.grandTotal)}
                      </p>
                      <p className="text-xs text-gray-400">
                        {new Date(q.issued_date + 'T00:00:00').toLocaleDateString(
                          'en-US',
                          { month: 'short', day: 'numeric' },
                        )}
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
