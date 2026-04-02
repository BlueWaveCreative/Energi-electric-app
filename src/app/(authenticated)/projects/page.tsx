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
            <FolderOpen className="w-12 h-12 text-gray-300 mx-auto mb-3" />
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
                />
              </Link>
            )
          })
        )}
      </div>
    </div>
  )
}
