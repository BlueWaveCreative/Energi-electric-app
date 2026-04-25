'use client'

import { useState } from 'react'
import { ChevronDown, ChevronUp } from 'lucide-react'

type PhaseStatus = 'not_started' | 'in_progress' | 'complete'
type ProjectStatus = 'active' | 'completed' | 'archived'
type InvoiceStatus = 'sent' | 'paid'

interface PortalProject {
  id: string
  name: string
  address: string | null
  status: ProjectStatus
  phases: { name: string; status: PhaseStatus; sort_order: number }[]
}

interface PortalInvoice {
  id: string
  invoice_number: number
  title: string
  status: InvoiceStatus
  tax_amount: number
  issued_date: string
  due_date: string | null
  invoice_line_items: { description: string; quantity: number; unit_price: number; sort_order: number }[]
}

interface PortalClientProps {
  customerName: string
  portalToken: string
  projects: PortalProject[]
  invoices: PortalInvoice[]
}

function formatCurrency(n: number) {
  return new Intl.NumberFormat('en-US', { style: 'currency', currency: 'USD' }).format(n)
}

function formatDate(d: string) {
  return new Date(d + 'T00:00:00').toLocaleDateString('en-US', { month: 'long', day: 'numeric', year: 'numeric' })
}

function getCurrentPhase(phases: PortalProject['phases']) {
  const sorted = [...phases].sort((a, b) => a.sort_order - b.sort_order)
  return sorted.find(p => p.status === 'in_progress') ?? sorted.find(p => p.status === 'not_started') ?? sorted[sorted.length - 1]
}

export function PortalClient({ customerName, portalToken, projects, invoices }: PortalClientProps) {
  const [showCompleted, setShowCompleted] = useState(false)

  const activeProjects = projects.filter(p => p.status === 'active')
  const completedProjects = projects.filter(p => p.status === 'completed' || p.status === 'archived')

  return (
    <div className="min-h-screen bg-gray-50">
      {/* Header */}
      <header className="bg-[#32373C] text-white px-4 py-4">
        <div className="max-w-xl mx-auto flex items-center justify-between">
          <img src="/brand/energi-logo-horizontal.png" alt="Energi Electric" className="h-8" />
          <a href="tel:9106192000" className="text-sm text-[#045815] font-medium">(910) 619-2000</a>
        </div>
      </header>

      <main className="max-w-xl mx-auto px-4 py-6 space-y-8">
        <p className="text-gray-500 text-sm">
          Hi <strong className="text-gray-900">{customerName}</strong> — here&apos;s your project status and invoices.
        </p>

        {/* Active Projects */}
        <section>
          <h2 className="font-semibold text-gray-900 mb-3">Active Projects</h2>
          {activeProjects.length === 0 ? (
            <p className="text-sm text-gray-500">No active projects at this time.</p>
          ) : (
            <div className="space-y-3">
              {activeProjects.map(project => {
                const currentPhase = getCurrentPhase(project.phases)
                return (
                  <div key={project.id} className="bg-white rounded-xl border border-gray-200 p-4">
                    <div className="flex items-start justify-between gap-2">
                      <div>
                        <p className="font-semibold text-gray-900">{project.name}</p>
                        {project.address && <p className="text-sm text-gray-500 mt-0.5">{project.address}</p>}
                        {currentPhase && (
                          <p className="text-sm text-gray-600 mt-1">
                            Current phase: <span className="font-medium">{currentPhase.name}</span>
                          </p>
                        )}
                      </div>
                      <span className="shrink-0 text-xs font-medium px-2.5 py-1 rounded-full bg-green-100 text-green-700">
                        In Progress
                      </span>
                    </div>
                  </div>
                )
              })}
            </div>
          )}
        </section>

        {/* Completed Projects */}
        {completedProjects.length > 0 && (
          <section>
            <button
              onClick={() => setShowCompleted(prev => !prev)}
              className="flex items-center gap-1 text-sm text-gray-500 font-medium hover:text-gray-700"
            >
              {showCompleted ? <ChevronUp className="w-4 h-4" /> : <ChevronDown className="w-4 h-4" />}
              {showCompleted ? 'Hide' : 'Show'} completed projects ({completedProjects.length})
            </button>
            {showCompleted && (
              <div className="space-y-3 mt-3">
                {completedProjects.map(project => (
                  <div key={project.id} className="bg-white rounded-xl border border-gray-200 p-4">
                    <div className="flex items-start justify-between gap-2">
                      <div>
                        <p className="font-semibold text-gray-900">{project.name}</p>
                        {project.address && <p className="text-sm text-gray-500 mt-0.5">{project.address}</p>}
                      </div>
                      <span className="shrink-0 text-xs font-medium px-2.5 py-1 rounded-full bg-gray-100 text-gray-500">
                        Completed
                      </span>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </section>
        )}

        {/* Invoices */}
        <section>
          <h2 className="font-semibold text-gray-900 mb-3">Invoices</h2>
          {invoices.length === 0 ? (
            <p className="text-sm text-gray-500">No invoices yet.</p>
          ) : (
            <div className="space-y-4">
              {invoices.map(invoice => {
                const sortedItems = [...invoice.invoice_line_items].sort((a, b) => a.sort_order - b.sort_order)
                const subtotal = sortedItems.reduce((s, i) => s + i.quantity * i.unit_price, 0)
                const total = subtotal + invoice.tax_amount
                const isPaid = invoice.status === 'paid'

                return (
                  <div key={invoice.id} className="bg-white rounded-xl border border-gray-200 p-4">
                    <div className="flex items-start justify-between gap-2 mb-3">
                      <div>
                        <p className="text-xs text-gray-400 font-mono mb-0.5">Invoice #{invoice.invoice_number}</p>
                        <p className="font-semibold text-gray-900">{invoice.title}</p>
                        <p className="text-xs text-gray-500 mt-0.5">Issued {formatDate(invoice.issued_date)}</p>
                        {invoice.due_date && !isPaid && (
                          <p className="text-xs text-gray-500">Due {formatDate(invoice.due_date)}</p>
                        )}
                      </div>
                      <span className={`shrink-0 text-xs font-medium px-2.5 py-1 rounded-full ${
                        isPaid ? 'bg-green-100 text-green-700' : 'bg-yellow-100 text-yellow-700'
                      }`}>
                        {isPaid ? 'Paid' : 'Payment Due'}
                      </span>
                    </div>

                    <div className="space-y-1 border-t border-gray-100 pt-3">
                      {sortedItems.map((item, idx) => (
                        <div key={idx} className="flex justify-between text-sm">
                          <span className="text-gray-600">
                            {item.description}
                            {item.quantity !== 1 && <span className="text-gray-400"> × {item.quantity}</span>}
                          </span>
                          <span className="text-gray-900">{formatCurrency(item.quantity * item.unit_price)}</span>
                        </div>
                      ))}
                      {invoice.tax_amount > 0 && (
                        <div className="flex justify-between text-sm text-gray-500">
                          <span>Tax</span><span>{formatCurrency(invoice.tax_amount)}</span>
                        </div>
                      )}
                      <div className="flex justify-between font-semibold text-gray-900 pt-1 border-t border-gray-100">
                        <span>Total</span><span>{formatCurrency(total)}</span>
                      </div>
                    </div>

                    <a
                      href={`/api/portal/invoice/${invoice.id}/pdf?token=${portalToken}`}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="mt-3 inline-block text-sm text-[#045815] hover:text-green-700 font-medium"
                    >
                      Download PDF →
                    </a>
                  </div>
                )
              })}
            </div>
          )}
        </section>
      </main>

      <footer className="text-center py-8">
        <a
          href="https://bluewavecreativedesign.com"
          target="_blank"
          rel="noopener noreferrer"
          className="text-xs text-gray-400 hover:text-gray-500"
        >
          Powered by Blue Wave Creative Design
        </a>
      </footer>
    </div>
  )
}
