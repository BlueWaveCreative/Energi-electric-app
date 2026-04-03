export const dynamic = 'force-dynamic'

import Link from 'next/link'
import { createClient } from '@/lib/supabase/server'
import { redirect } from 'next/navigation'
import { PageHeader } from '@/components/layout/page-header'
import { Button } from '@/components/ui/button'
import { ProjectCard } from '@/components/projects/project-card'
import { Plus, FolderOpen } from 'lucide-react'

export default async function ProjectsPage() {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) redirect('/login')

  const { data: profile } = await supabase
    .from('profiles')
    .select('role')
    .eq('id', user.id)
    .single()

  const isAdmin = profile?.role === 'admin'

  const { data: projects } = await supabase
    .from('projects')
    .select('*, phases(id, status)')
    .order('created_at', { ascending: false })

  // Unread detection for admin
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

  return (
    <div>
      <PageHeader
        title="Projects"
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

      <div className="p-4 md:p-6 space-y-3">
        {!projects?.length ? (
          <div className="text-center py-12">
            <FolderOpen className="w-12 h-12 text-gray-500 mx-auto mb-3" />
            <p className="text-gray-500">No projects yet</p>
          </div>
        ) : (
          projects.map((project) => {
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
          })
        )}
      </div>
    </div>
  )
}
