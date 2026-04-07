import { NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import { sendInvoiceNotificationEmail } from '@/lib/email'

export async function POST(
  _request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id } = await params
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const { data: profile } = await supabase.from('profiles').select('role').eq('id', user.id).single()
  if (profile?.role !== 'admin') return NextResponse.json({ error: 'Forbidden' }, { status: 403 })

  const { data: invoice } = await supabase
    .from('invoices')
    .select('*, invoice_line_items(*), customers(name, email, portal_token)')
    .eq('id', id)
    .single()

  if (!invoice) return NextResponse.json({ error: 'Not found' }, { status: 404 })
  if (invoice.status === 'draft') return NextResponse.json({ error: 'Cannot notify on draft invoice' }, { status: 400 })

  const customer = invoice.customers as { name: string; email: string | null; portal_token: string }
  if (!customer.email) return NextResponse.json({ error: 'Customer has no email' }, { status: 400 })

  const subtotal = (invoice.invoice_line_items as { quantity: number; unit_price: number }[])
    .reduce((sum, i) => sum + i.quantity * i.unit_price, 0)
  const total = subtotal + invoice.tax_amount

  await sendInvoiceNotificationEmail({
    to: customer.email,
    customerName: customer.name,
    portalToken: customer.portal_token,
    invoiceTitle: invoice.title,
    invoiceNumber: invoice.invoice_number,
    totalAmount: total,
    dueDate: invoice.due_date,
  })

  await supabase
    .from('invoices')
    .update({ notified_at: new Date().toISOString() })
    .eq('id', id)

  return NextResponse.json({ success: true })
}
