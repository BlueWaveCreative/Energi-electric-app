'use client'

import { useRouter } from 'next/navigation'
import { useSupabase } from '@/hooks/use-supabase'
import { PhasePipeline } from '@/components/projects/phase-pipeline'
import { PhaseCard } from '@/components/projects/phase-card'
import type { Project, Phase, Task, PhaseStatus } from '@/lib/types/database'

interface ProjectDetailClientProps {
  project: Project & { phases: (Phase & { tasks: Task[] })[] }
  isAdmin: boolean
}

export function ProjectDetailClient({ project, isAdmin }: ProjectDetailClientProps) {
  const supabase = useSupabase()
  const router = useRouter()
  const sortedPhases = [...project.phases].sort((a, b) => a.sort_order - b.sort_order)

  async function handlePhaseStatusChange(phaseId: string, status: PhaseStatus) {
    await supabase.from('phases').update({ status }).eq('id', phaseId)
    router.refresh()
  }

  return (
    <div className="space-y-6">
      <PhasePipeline phases={project.phases} />

      <div className="space-y-3">
        {sortedPhases.map((phase) => {
          const completedTasks = phase.tasks.filter((t) => t.status === 'complete').length
          return (
            <PhaseCard
              key={phase.id}
              phase={phase}
              taskCount={phase.tasks.length}
              completedTasks={completedTasks}
              onStatusChange={isAdmin ? handlePhaseStatusChange : undefined}
            >
              {phase.tasks.length > 0 ? (
                <div className="space-y-2">
                  {phase.tasks.map((task) => (
                    <div
                      key={task.id}
                      className="flex items-center gap-2 text-sm"
                    >
                      <input
                        type="checkbox"
                        checked={task.status === 'complete'}
                        onChange={async () => {
                          const newStatus = task.status === 'complete' ? 'pending' : 'complete'
                          await supabase.from('tasks').update({ status: newStatus }).eq('id', task.id)
                          router.refresh()
                        }}
                        className="rounded border-gray-300 text-blue-600 focus:ring-blue-500"
                      />
                      <span className={task.status === 'complete' ? 'line-through text-gray-400' : 'text-gray-700'}>
                        {task.title}
                      </span>
                    </div>
                  ))}
                </div>
              ) : (
                <p className="text-sm text-gray-400 italic">No tasks in this phase</p>
              )}
            </PhaseCard>
          )
        })}
      </div>
    </div>
  )
}
