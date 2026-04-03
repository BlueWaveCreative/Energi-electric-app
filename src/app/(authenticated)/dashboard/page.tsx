export const dynamic = 'force-dynamic'

import Link from 'next/link'
import { createClient } from '@/lib/supabase/server'
import { redirect } from 'next/navigation'
import { PageHeader } from '@/components/layout/page-header'
import { ProjectCard } from '@/components/projects/project-card'
import { Button } from '@/components/ui/button'
import { Card } from '@/components/ui/card'
import { Plus, FolderOpen, Clock } from 'lucide-react'
import { formatDuration } from '@/lib/utils'
import { ActivityFeed, type ActivityItem } from '@/components/activity/activity-feed'
import { getWeatherForecast } from '@/lib/weather'
import { WeatherCard } from '@/components/dashboard/weather-card'

export default async function DashboardPage() {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) redirect('/login')

  const { data: profile } = await supabase
    .from('profiles')
    .select('*')
    .eq('id', user.id)
    .single()

  const isAdmin = profile?.role === 'admin'

  // Field workers see the Today view instead of the admin dashboard
  if (profile?.role === 'field_worker') {
    const { TodayView } = await import('./today-view')
    return <TodayView userId={user.id} userName={profile.name ?? 'there'} />
  }

  const { data: projects } = await supabase
    .from('projects')
    .select('*, phases(id, status)')
    .eq('status', 'active')
    .order('created_at', { ascending: false })
    .limit(10)

  // Unread detection for admin: compare last activity per project vs last view
  let unreadProjectIds = new Set<string>()
  if (isAdmin && projects?.length) {
    const projectIds = projects.map((p) => p.id)

    const [viewsRes, notesRes, photosRes, timeRes] = await Promise.all([
      supabase
        .from('project_views')
        .select('project_id, last_viewed_at')
        .eq('user_id', user.id)
        .in('project_id', projectIds),
      supabase
        .from('notes')
        .select('linked_id, created_at')
        .eq('linked_type', 'project')
        .in('linked_id', projectIds)
        .order('created_at', { ascending: false }),
      supabase
        .from('photos')
        .select('linked_id, created_at')
        .eq('linked_type', 'project')
        .in('linked_id', projectIds)
        .order('created_at', { ascending: false }),
      supabase
        .from('time_entries')
        .select('project_id, start_time')
        .in('project_id', projectIds)
        .order('start_time', { ascending: false }),
    ])

    const viewMap = new Map<string, string>()
    for (const v of viewsRes.data ?? []) {
      viewMap.set(v.project_id, v.last_viewed_at)
    }

    for (const p of projects) {
      const lastViewed = viewMap.get(p.id) ?? '1970-01-01T00:00:00Z'
      const hasNewNote = (notesRes.data ?? []).some((n) => n.linked_id === p.id && n.created_at > lastViewed)
      const hasNewPhoto = (photosRes.data ?? []).some((ph) => ph.linked_id === p.id && ph.created_at > lastViewed)
      const hasNewTime = (timeRes.data ?? []).some((t) => t.project_id === p.id && t.start_time > lastViewed)
      if (hasNewNote || hasNewPhoto || hasNewTime) {
        unreadProjectIds.add(p.id)
      }
    }
  }

  const weekStart = new Date()
  weekStart.setDate(weekStart.getDate() - weekStart.getDay())
  weekStart.setHours(0, 0, 0, 0)

  const { data: timeEntries } = await supabase
    .from('time_entries')
    .select('duration_minutes')
    .eq('user_id', user.id)
    .gte('start_time', weekStart.toISOString())

  const totalMinutes = timeEntries?.reduce(
    (sum, entry) => sum + (entry.duration_minutes ?? 0),
    0
  ) ?? 0

  const { data: recentNotes } = await supabase
    .from('notes')
    .select('id, created_at, content, profiles(name)')
    .order('created_at', { ascending: false })
    .limit(5)

  const { data: recentTimeEntries } = await supabase
    .from('time_entries')
    .select('id, start_time, duration_minutes, method, profiles!time_entries_user_id_fkey(name), projects(name)')
    .order('start_time', { ascending: false })
    .limit(5)

  let forecast = null
  try {
    forecast = await getWeatherForecast()
  } catch {
    // Weather API failure should not break the dashboard
  }

  const recentActivity: ActivityItem[] = [
    ...(recentNotes ?? []).map((n) => ({
      id: `note-${n.id}`,
      type: 'note' as const,
      user_name: (n.profiles as any)?.name ?? 'Unknown',
      project_name: '',
      description: `added a note: "${(n.content as string).slice(0, 40)}..."`,
      timestamp: n.created_at,
    })),
    ...(recentTimeEntries ?? []).map((e) => ({
      id: `time-${e.id}`,
      type: 'time_entry' as const,
      user_name: (e.profiles as any)?.name ?? 'Unknown',
      project_name: (e.projects as any)?.name ?? '',
      description: `logged ${formatDuration(e.duration_minutes ?? 0)}`,
      timestamp: e.start_time,
    })),
  ].sort((a, b) => new Date(b.timestamp).getTime() - new Date(a.timestamp).getTime())

  return (
    <div>
      <PageHeader
        title={`Hey, ${profile?.name?.split(' ')[0] ?? 'there'}`}
        actions={
          isAdmin ? (
            <Link href="/projects/new">
              <Button size="sm">
                <Plus className="w-4 h-4 mr-1" /> New Project
              </Button>
            </Link>
          ) : undefined
        }
      />

      <div className="p-4 md:p-6 space-y-6">
        <div className="grid grid-cols-2 md:grid-cols-3 gap-3">
          <Card>
            <div className="flex items-center gap-3">
              <FolderOpen className="w-8 h-8 text-[#68BD45]" />
              <div>
                <p className="text-2xl font-bold text-gray-900">{projects?.length ?? 0}</p>
                <p className="text-xs text-gray-600">Active Projects</p>
              </div>
            </div>
          </Card>
          <Card>
            <div className="flex items-center gap-3">
              <Clock className="w-8 h-8 text-green-500" />
              <div>
                <p className="text-2xl font-bold text-gray-900">{formatDuration(totalMinutes)}</p>
                <p className="text-xs text-gray-600">This Week</p>
              </div>
            </div>
          </Card>
        </div>

        {forecast && <WeatherCard forecast={forecast} />}

        <div>
          <div className="flex items-center justify-between mb-3">
            <h2 className="text-lg font-semibold text-gray-900">Active Projects</h2>
            <Link href="/projects" className="text-sm text-[#68BD45] hover:underline">
              View all
            </Link>
          </div>

          {!projects?.length ? (
            <Card>
              <p className="text-gray-500 text-center py-4">No active projects</p>
            </Card>
          ) : (
            <div className="space-y-3">
              {projects.map((project) => {
                const phases = project.phases ?? []
                const completedPhases = phases.filter(
                  (p: { status: string }) => p.status === 'complete'
                ).length
                return (
                  <Link key={project.id} href={`/projects/${project.id}`}>
                    <ProjectCard
                      project={project}
                      phaseCount={phases.length}
                      completedPhases={completedPhases}
                      hasUnread={unreadProjectIds.has(project.id)}
                    />
                  </Link>
                )
              })}
            </div>
          )}
        </div>

        <div>
          <div className="flex items-center justify-between mb-3">
            <h2 className="text-lg font-semibold text-gray-900">Recent Activity</h2>
            {isAdmin && (
              <Link href="/activity" className="text-sm text-[#68BD45] hover:underline">
                View all
              </Link>
            )}
          </div>
          <Card>
            <ActivityFeed items={recentActivity} limit={5} />
          </Card>
        </div>
      </div>
    </div>
  )
}
