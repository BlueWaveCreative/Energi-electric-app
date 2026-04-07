export const dynamic = 'force-dynamic'

import { notFound } from 'next/navigation'
import { createServiceClient } from '@/lib/supabase/service'
import { PortalClient } from './client'

export default async function PortalPage({
  params,
}: {
  params: Promise<{ token: string }>
}) {
  const { token } = await params
  const supabase = createServiceClient()

  const { data: customer } = await supabase
    .from('customers')
    .select('id, name, portal_active')
    .eq('portal_token', token)
    .single()

  if (!customer || !customer.portal_active) notFound()

  const [{ data: projects }, { data: invoices }] = await Promise.all([
    supabase
      .from('projects')
      .select('id, name, address, status, phases(name, status, sort_order)')
      .eq('customer_id', customer.id)
      .order('created_at', { ascending: false }),
    supabase
      .from('invoices')
      .select('id, invoice_number, title, status, tax_amount, issued_date, due_date, invoice_line_items(description, quantity, unit_price, sort_order)')
      .eq('customer_id', customer.id)
      .in('status', ['sent', 'paid'])
      .order('created_at', { ascending: false }),
  ])

  return (
    <PortalClient
      customerName={customer.name}
      portalToken={token}
      projects={projects ?? []}
      invoices={invoices ?? []}
    />
  )
}
