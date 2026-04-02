import { Check, Circle, Loader2 } from 'lucide-react'
import { cn } from '@/lib/utils'
import type { Phase } from '@/lib/types/database'

interface PhasePipelineProps {
  phases: Phase[]
  onPhaseClick?: (phase: Phase) => void
}

const statusIcon = {
  not_started: Circle,
  in_progress: Loader2,
  complete: Check,
}

const statusColor = {
  not_started: 'text-gray-400 border-gray-300',
  in_progress: 'text-[#68BD45] border-[#68BD45] bg-[#68BD45]/10',
  complete: 'text-green-600 border-green-600 bg-green-50',
}

export function PhasePipeline({ phases, onPhaseClick }: PhasePipelineProps) {
  const sorted = [...phases].sort((a, b) => a.sort_order - b.sort_order)

  return (
    <div className="flex overflow-x-auto gap-2 pb-2 -mx-4 px-4 md:mx-0 md:px-0">
      {sorted.map((phase, index) => {
        const Icon = statusIcon[phase.status]
        return (
          <div key={phase.id} className="flex items-center flex-shrink-0">
            <button
              onClick={() => onPhaseClick?.(phase)}
              className={cn(
                'flex items-center gap-2 px-3 py-2 rounded-lg border text-sm font-medium transition-colors',
                statusColor[phase.status],
                onPhaseClick && 'hover:shadow-sm cursor-pointer'
              )}
            >
              <Icon className={cn('w-4 h-4', phase.status === 'in_progress' && 'animate-spin')} />
              {phase.name}
            </button>
            {index < sorted.length - 1 && (
              <div className="w-6 h-px bg-gray-300 mx-1 flex-shrink-0" />
            )}
          </div>
        )
      })}
    </div>
  )
}
