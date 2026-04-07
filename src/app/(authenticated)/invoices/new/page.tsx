export const dynamic = 'force-dynamic'

import { redirect } from 'next/navigation'
import { createClient } from '@/lib/supabase/server'
import { PageHeader } from '@/components/layout/page-header'
import { NewInvoiceClient } from './client'

export default async function NewInvoicePage() {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) redirect('/login')

  const { data: profile } = await supabase.from('profiles').select('role').eq('id', user.id).single()
  if (profile?.role !== 'admin') redirect('/dashboard')

  const [{ data: customers }, { data: projects }, { data: presets }] = await Promise.all([
    supabase.from('customers').select('id, name, email').order('name'),
    supabase.from('projects').select('id, name, customer_id, status').eq('status', 'active').order('name'),
    supabase.from('line_item_presets').select('*').order('sort_order'),
  ])

  return (
    <div>
      <PageHeader title="New Invoice" />
      <div className="p-4 md:p-6">
        <NewInvoiceClient
          customers={customers ?? []}
          projects={projects ?? []}
          presets={presets ?? []}
        />
      </div>
    </div>
  )
}
