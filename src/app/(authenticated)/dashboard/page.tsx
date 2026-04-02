import Link from 'next/link'
import { createClient } from '@/lib/supabase/server'
import { redirect } from 'next/navigation'
import { PageHeader } from '@/components/layout/page-header'
import { ProjectCard } from '@/components/projects/project-card'
import { Button } from '@/components/ui/button'
import { Card } from '@/components/ui/card'
import { Plus, FolderOpen, Clock } from 'lucide-react'
import { formatDuration } from '@/lib/utils'

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

  const { data: projects } = await supabase
    .from('projects')
    .select('*, phases(id, status)')
    .eq('status', 'active')
    .order('created_at', { ascending: false })
    .limit(10)

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
              <FolderOpen className="w-8 h-8 text-blue-500" />
              <div>
                <p className="text-2xl font-bold">{projects?.length ?? 0}</p>
                <p className="text-xs text-gray-500">Active Projects</p>
              </div>
            </div>
          </Card>
          <Card>
            <div className="flex items-center gap-3">
              <Clock className="w-8 h-8 text-green-500" />
              <div>
                <p className="text-2xl font-bold">{formatDuration(totalMinutes)}</p>
                <p className="text-xs text-gray-500">This Week</p>
              </div>
            </div>
          </Card>
        </div>

        <div>
          <div className="flex items-center justify-between mb-3">
            <h2 className="text-lg font-semibold">Active Projects</h2>
            <Link href="/projects" className="text-sm text-blue-600 hover:underline">
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
                    />
                  </Link>
                )
              })}
            </div>
          )}
        </div>
      </div>
    </div>
  )
}
