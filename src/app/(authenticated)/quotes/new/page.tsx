export const dynamic = 'force-dynamic'

import { redirect } from 'next/navigation'
import { createClient } from '@/lib/supabase/server'
import { PageHeader } from '@/components/layout/page-header'
import { NewQuoteClient } from './client'

export default async function NewQuotePage() {
  const supabase = await createClient()
  const {
    data: { user },
  } = await supabase.auth.getUser()
  if (!user) redirect('/login')

  const { data: profile } = await supabase
    .from('profiles')
    .select('role')
    .eq('id', user.id)
    .single()
  if (profile?.role !== 'admin') redirect('/dashboard')

  const [{ data: customers }, { data: projects }] = await Promise.all([
    supabase.from('customers').select('id, name').order('name'),
    supabase
      .from('projects')
      .select('id, name, customer_id, status')
      .eq('status', 'active')
      .order('name'),
  ])

  return (
    <div>
      <PageHeader title="New Quote" />
      <div className="p-4 md:p-6">
        <NewQuoteClient
          customers={customers ?? []}
          projects={projects ?? []}
        />
      </div>
    </div>
  )
}
