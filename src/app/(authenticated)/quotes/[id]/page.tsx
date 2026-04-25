export const dynamic = 'force-dynamic'

import { redirect, notFound } from 'next/navigation'
import { createClient } from '@/lib/supabase/server'
import { PageHeader } from '@/components/layout/page-header'
import { QuoteBuilderClient } from './client'

export default async function QuotePage({
  params,
}: {
  params: Promise<{ id: string }>
}) {
  const { id } = await params

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

  const [
    { data: quote },
    { data: lineItems },
    { data: categories },
    { data: materials },
  ] = await Promise.all([
    supabase
      .from('quotes')
      .select('*, customers(name, email), projects(name)')
      .eq('id', id)
      .maybeSingle(),
    supabase
      .from('quote_line_items')
      .select('*')
      .eq('quote_id', id)
      .order('sort_order', { ascending: true }),
    supabase
      .from('material_categories')
      .select('*')
      .order('sort_order', { ascending: true }),
    supabase
      .from('materials')
      .select('id, name, unit, price, category_id, sort_order')
      .eq('active', true)
      .order('sort_order', { ascending: true }),
  ])

  if (!quote) notFound()

  return (
    <div>
      <PageHeader title={`Quote #${quote.quote_number}`} />
      <div className="p-4 md:p-6">
        <QuoteBuilderClient
          quote={quote as unknown as Parameters<typeof QuoteBuilderClient>[0]['quote']}
          initialLineItems={lineItems ?? []}
          categories={categories ?? []}
          materials={materials ?? []}
        />
      </div>
    </div>
  )
}
