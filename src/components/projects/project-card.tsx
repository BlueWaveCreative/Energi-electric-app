import { MapPin } from 'lucide-react'
import { Badge } from '@/components/ui/badge'
import { Card } from '@/components/ui/card'
import type { Project } from '@/lib/types/database'

interface ProjectCardProps {
  project: Project
  phaseCount: number
  completedPhases: number
}

const statusVariant = {
  active: 'info' as const,
  completed: 'success' as const,
  archived: 'default' as const,
}

const statusLabel = {
  active: 'Active',
  completed: 'Completed',
  archived: 'Archived',
}

export function ProjectCard({ project, phaseCount, completedPhases }: ProjectCardProps) {
  const progress = phaseCount > 0 ? (completedPhases / phaseCount) * 100 : 0

  return (
    <Card hoverable>
      <div className="flex items-start justify-between">
        <div className="flex-1 min-w-0">
          <h3 className="font-semibold text-gray-900 truncate">{project.name}</h3>
          {project.address && (
            <p className="text-sm text-gray-500 flex items-center gap-1 mt-1">
              <MapPin className="w-3 h-3 flex-shrink-0" />
              <span className="truncate">{project.address}</span>
            </p>
          )}
        </div>
        <Badge variant={statusVariant[project.status]}>
          {statusLabel[project.status]}
        </Badge>
      </div>

      {phaseCount > 0 && (
        <div className="mt-3">
          <div className="flex items-center justify-between text-xs text-gray-500 mb-1">
            <span>{completedPhases}/{phaseCount} phases</span>
            <span>{Math.round(progress)}%</span>
          </div>
          <div className="w-full bg-gray-200 rounded-full h-1.5">
            <div
              className="bg-blue-600 h-1.5 rounded-full transition-all"
              style={{ width: `${progress}%` }}
            />
          </div>
        </div>
      )}
    </Card>
  )
}
