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

  // Fetch notes, photos, time entries, plans count, expenses, and inspections in parallel
  const [notesResult, photosResult, timeResult, plansResult, expensesResult, inspectionsResult] = await Promise.all([
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
      .select('*, profiles(name), phases(name)')
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
  ])

  const isAdmin = profile?.role === 'admin'

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
          notes={notesResult.data ?? []}
          photos={photosResult.data ?? []}
          timeEntries={timeResult.data ?? []}
          expenses={expensesResult.data ?? []}
          inspections={inspectionsResult.data ?? []}
          isAdmin={isAdmin}
          userId={user.id}
          hasPlans={(plansResult.data?.length ?? 0) > 0}
        />
      </div>
    </div>
  )
}
