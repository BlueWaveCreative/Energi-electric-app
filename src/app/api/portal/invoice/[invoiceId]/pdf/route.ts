import { NextResponse } from 'next/server'
import { createServiceClient } from '@/lib/supabase/service'
import { renderToBuffer } from '@react-pdf/renderer'
import { InvoicePDF } from '@/lib/pdf'
import React from 'react'

export async function GET(
  request: Request,
  { params }: { params: Promise<{ invoiceId: string }> }
) {
  const { invoiceId } = await params
  const { searchParams } = new URL(request.url)
  const token = searchParams.get('token')

  if (!token) return NextResponse.json({ error: 'Missing token' }, { status: 400 })

  const supabase = createServiceClient()

  const { data: customer } = await supabase
    .from('customers')
    .select('id, name, portal_active')
    .eq('portal_token', token)
    .single()

  if (!customer || !customer.portal_active) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

  const { data: invoice } = await supabase
    .from('invoices')
    .select('*, invoice_line_items(description, quantity, unit_price, sort_order), projects(name)')
    .eq('id', invoiceId)
    .eq('customer_id', customer.id)
    .in('status', ['sent', 'paid'])
    .single()

  if (!invoice) return NextResponse.json({ error: 'Invoice not found' }, { status: 404 })

  const sortedItems = [...(invoice.invoice_line_items as { description: string; quantity: number; unit_price: number; sort_order: number }[])]
    .sort((a, b) => a.sort_order - b.sort_order)

  const buffer = await renderToBuffer(
    React.createElement(InvoicePDF, {
      invoiceNumber: invoice.invoice_number,
      title: invoice.title,
      status: invoice.status as 'sent' | 'paid',
      issuedDate: invoice.issued_date,
      dueDate: invoice.due_date,
      customerName: customer.name,
      projectName: (invoice.projects as { name: string } | null)?.name ?? null,
      notes: invoice.notes,
      taxAmount: invoice.tax_amount,
      lineItems: sortedItems,
    })
  )

  return new NextResponse(new Uint8Array(buffer), {
    headers: {
      'Content-Type': 'application/pdf',
      'Content-Disposition': `attachment; filename="invoice-${invoice.invoice_number}.pdf"`,
    },
  })
}
