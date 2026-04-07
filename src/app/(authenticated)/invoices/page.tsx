export const dynamic = 'force-dynamic'

import { redirect } from 'next/navigation'
import { createClient } from '@/lib/supabase/server'
import { PageHeader } from '@/components/layout/page-header'
import { InvoicesClient } from './client'

export default async function InvoicesPage() {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) redirect('/login')

  const { data: profile } = await supabase
    .from('profiles')
    .select('role')
    .eq('id', user.id)
    .single()

  if (profile?.role !== 'admin') redirect('/dashboard')

  const { data: invoices } = await supabase
    .from('invoices')
    .select('*, customers(name), projects(name), invoice_line_items(quantity, unit_price)')
    .order('created_at', { ascending: false })

  return (
    <div>
      <PageHeader title="Invoices" />
      <div className="p-4 md:p-6">
        <InvoicesClient invoices={invoices ?? []} />
      </div>
    </div>
  )
}
