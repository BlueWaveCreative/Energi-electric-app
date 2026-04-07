export const dynamic = 'force-dynamic'

import { notFound, redirect } from 'next/navigation'
import { createClient } from '@/lib/supabase/server'
import { PageHeader } from '@/components/layout/page-header'
import { ProjectDetailClient } from './client'
import { MapPin } from 'lucide-react'

export default async function ProjectDetailPage({
  params,
}: {
  params: Promise<{ id: string }>
}) {
  const { id } = await params
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) redirect('/login')

  const { data: profile } = await supabase
    .from('profiles')
    .select('role')
    .eq('id', user.id)
    .single()

  const { data: project } = await supabase
    .from('projects')
    .select('*, phases(*, tasks(*))')
    .eq('id', id)
    .single()

  if (!project) notFound()

  // Fetch customer if project has one
  let customer = null
  if (project.customer_id) {
    const { data } = await supabase
      .from('customers')
      .select('*')
      .eq('id', project.customer_id)
      .single()
    customer = data
  }

  // Fetch notes, photos, time entries, plans count, expenses, inspections, and invoices in parallel
  const [notesResult, photosResult, timeResult, plansResult, expensesResult, inspectionsResult, invoicesResult] = await Promise.all([
    supabase
      .from('notes')
      .select('*, profiles(name)')
      .eq('linked_type', 'project')
      .eq('linked_id', id)
      .order('created_at', { ascending: false }),
    supabase
      .from('photos')
      .select('*, profiles(name)')
      .eq('linked_type', 'project')
      .eq('linked_id', id)
      .order('created_at', { ascending: false }),
    supabase
      .from('time_entries')
      .select('*, profiles!time_entries_user_id_fkey(name), phases(name)')
      .eq('project_id', id)
      .order('start_time', { ascending: false }),
    supabase
      .from('plans')
      .select('id')
      .eq('project_id', id)
      .limit(1),
    supabase
      .from('expenses')
      .select('*, profiles(name)')
      .eq('project_id', id)
      .order('expense_date', { ascending: false }),
    supabase
      .from('inspections')
      .select('*, profiles:created_by(name)')
      .eq('project_id', id)
      .order('created_at', { ascending: false }),
    supabase
      .from('invoices')
      .select('id, invoice_number, title, status, tax_amount, due_date, invoice_line_items(quantity, unit_price)')
      .eq('project_id', id)
      .order('created_at', { ascending: false }),
  ])

  const isAdmin = profile?.role === 'admin'

  // Mark project as viewed (for unread dot tracking)
  if (isAdmin) {
    await supabase
      .from('project_views')
      .upsert(
        { user_id: user.id, project_id: id, last_viewed_at: new Date().toISOString() },
        { onConflict: 'user_id,project_id' }
      )
  }

  return (
    <div>
      <PageHeader
        title={project.name}
        actions={
          project.address ? (
            <span className="text-sm text-gray-500 flex items-center gap-1">
              <MapPin className="w-4 h-4" />
              {project.address}
            </span>
          ) : undefined
        }
      />
      <div className="p-4 md:p-6">
        <ProjectDetailClient
          project={project}
          customer={customer}
          notes={notesResult.data ?? []}
          photos={photosResult.data ?? []}
          timeEntries={timeResult.data ?? []}
          expenses={expensesResult.data ?? []}
          inspections={inspectionsResult.data ?? []}
          invoices={isAdmin ? (invoicesResult.data ?? []) : []}
          isAdmin={isAdmin}
          userId={user.id}
          hasPlans={(plansResult.data?.length ?? 0) > 0}
        />
      </div>
    </div>
  )
}
