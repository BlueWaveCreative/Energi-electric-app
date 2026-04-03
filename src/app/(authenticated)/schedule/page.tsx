export const dynamic = 'force-dynamic'

import { redirect } from 'next/navigation'
import { createClient } from '@/lib/supabase/server'
import { PageHeader } from '@/components/layout/page-header'
import { ScheduleBoard } from './client'

export default async function SchedulePage() {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) redirect('/login')

  const { data: profile } = await supabase
    .from('profiles')
    .select('role')
    .eq('id', user.id)
    .single()

  const isAdmin = profile?.role === 'admin'

  const now = new Date()
  const dayOfWeek = now.getDay()
  const mondayOffset = dayOfWeek === 0 ? -6 : 1 - dayOfWeek
  const rangeStart = new Date(now)
  rangeStart.setDate(now.getDate() + mondayOffset)
  rangeStart.setHours(0, 0, 0, 0)

  const rangeEnd = new Date(rangeStart)
  rangeEnd.setDate(rangeStart.getDate() + 13)
  rangeEnd.setHours(23, 59, 59, 999)

  const startStr = rangeStart.toISOString().split('T')[0]
  const endStr = rangeEnd.toISOString().split('T')[0]

  const [crewResult, projectsResult, entriesResult] = await Promise.all([
    supabase
      .from('profiles')
      .select('id, name')
      .eq('status', 'active')
      .order('name'),
    supabase
      .from('projects')
      .select('id, name')
      .eq('status', 'active')
      .order('name'),
    supabase
      .from('schedule_entries')
      .select('id, user_id, project_id, date, notes, created_by, created_at, projects(name)')
      .gte('date', startStr)
      .lte('date', endStr),
  ])

  const crew = (crewResult.data ?? []).map((c) => ({ id: c.id, name: c.name }))
  const projects = (projectsResult.data ?? []).map((p) => ({ id: p.id, name: p.name }))
  const entries = (entriesResult.data ?? []).map((e) => ({
    id: e.id,
    user_id: e.user_id,
    project_id: e.project_id,
    date: e.date,
    notes: e.notes,
    created_by: e.created_by,
    created_at: e.created_at,
    project_name: (e.projects as any)?.name ?? 'Unknown',
  }))

  return (
    <div>
      <PageHeader title="Schedule" />
      <div className="p-4 md:p-6">
        <ScheduleBoard
          crew={crew}
          projects={projects}
          initialEntries={entries}
          rangeStart={startStr}
          isAdmin={isAdmin}
          currentUserId={user.id}
        />
      </div>
    </div>
  )
}
