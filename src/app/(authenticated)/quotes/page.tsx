export const dynamic = 'force-dynamic'

import { redirect } from 'next/navigation'
import { createClient } from '@/lib/supabase/server'
import { PageHeader } from '@/components/layout/page-header'
import { QuotesClient } from './client'

export default async function QuotesPage() {
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

  const { data: quotes } = await supabase
    .from('quotes')
    .select(
      'id, quote_number, title, status, job_type, issued_date, valid_until, customers(name), projects(name), quote_line_items(quantity, unit_price), markup_enabled, markup_percent, tax_enabled, tax_percent, labor_rate, labor_hours, flat_fee_enabled, flat_fee',
    )
    .order('created_at', { ascending: false })

  return (
    <div>
      <PageHeader title="Quotes" />
      <div className="p-4 md:p-6">
        <QuotesClient quotes={(quotes ?? []) as unknown as Parameters<typeof QuotesClient>[0]['quotes']} />
      </div>
    </div>
  )
}
