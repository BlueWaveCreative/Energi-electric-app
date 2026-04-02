'use client'

import { useState } from 'react'
import { ChevronDown, ChevronUp } from 'lucide-react'
import { Badge } from '@/components/ui/badge'
import { cn } from '@/lib/utils'
import type { Phase, PhaseStatus } from '@/lib/types/database'

interface PhaseCardProps {
  phase: Phase
  taskCount: number
  completedTasks: number
  onStatusChange?: (phaseId: string, status: PhaseStatus) => void
  children?: React.ReactNode
}

const statusVariant = {
  not_started: 'default' as const,
  in_progress: 'info' as const,
  complete: 'success' as const,
}

const statusLabel = {
  not_started: 'Not Started',
  in_progress: 'In Progress',
  complete: 'Complete',
}

export function PhaseCard({
  phase,
  taskCount,
  completedTasks,
  onStatusChange,
  children,
}: PhaseCardProps) {
  const [expanded, setExpanded] = useState(phase.status === 'in_progress')

  return (
    <div className={cn(
      'border rounded-lg overflow-hidden',
      phase.status === 'in_progress' ? 'border-blue-200 bg-blue-50/30' : 'border-gray-200 bg-white'
    )}>
      <button
        onClick={() => setExpanded(!expanded)}
        className="w-full flex items-center justify-between p-4 text-left"
      >
        <div className="flex items-center gap-3">
          <h3 className="font-medium text-gray-900">{phase.name}</h3>
          <Badge variant={statusVariant[phase.status]}>
            {statusLabel[phase.status]}
          </Badge>
          {taskCount > 0 && (
            <span className="text-xs text-gray-500">
              {completedTasks}/{taskCount} tasks
            </span>
          )}
        </div>
        {expanded ? (
          <ChevronUp className="w-5 h-5 text-gray-400" />
        ) : (
          <ChevronDown className="w-5 h-5 text-gray-400" />
        )}
      </button>

      {expanded && (
        <div className="border-t border-gray-200 p-4 space-y-3">
          {onStatusChange && (
            <div className="flex gap-2">
              {(['not_started', 'in_progress', 'complete'] as PhaseStatus[]).map((status) => (
                <button
                  key={status}
                  onClick={() => onStatusChange(phase.id, status)}
                  className={cn(
                    'px-2 py-1 text-xs rounded-md border transition-colors',
                    phase.status === status
                      ? 'border-blue-500 bg-blue-50 text-blue-700'
                      : 'border-gray-200 text-gray-500 hover:border-gray-300'
                  )}
                >
                  {statusLabel[status]}
                </button>
              ))}
            </div>
          )}
          {children}
        </div>
      )}
    </div>
  )
}
