export const dynamic = 'force-dynamic'

import { notFound, redirect } from 'next/navigation'
import { createClient } from '@/lib/supabase/server'
import { PageHeader } from '@/components/layout/page-header'
import { InvoiceDetailClient } from './client'

export default async function InvoiceDetailPage({
  params,
}: {
  params: Promise<{ id: string }>
}) {
  const { id } = await params
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) redirect('/login')

  const { data: profile } = await supabase.from('profiles').select('role').eq('id', user.id).single()
  if (profile?.role !== 'admin') redirect('/dashboard')

  const { data: invoice } = await supabase
    .from('invoices')
    .select('*, invoice_line_items(*), customers(name, email, portal_token), projects(name)')
    .eq('id', id)
    .single()

  if (!invoice) notFound()

  return (
    <div>
      <PageHeader title={`Invoice #${invoice.invoice_number}`} />
      <div className="p-4 md:p-6">
        <InvoiceDetailClient invoice={invoice} />
      </div>
    </div>
  )
}
