'use client'

import { Play, Square } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { formatElapsed } from '@/hooks/use-timer'

interface TimeTrackerProps {
  projectId: string
  isRunning: boolean
  elapsed: number
  activeProjectId: string | null
  onClockIn: () => void
  onClockOut: () => void
}

export function TimeTracker({
  projectId,
  isRunning,
  elapsed,
  activeProjectId,
  onClockIn,
  onClockOut,
}: TimeTrackerProps) {
  const isThisProject = activeProjectId === projectId
  const isOtherProject = isRunning && !isThisProject

  if (isOtherProject) {
    return (
      <div className="flex items-center gap-2 px-4 py-3 bg-yellow-50 rounded-lg border border-yellow-200">
        <span className="text-sm text-yellow-700">Clocked in on another project</span>
      </div>
    )
  }

  if (isRunning && isThisProject) {
    return (
      <div className="flex items-center justify-between px-4 py-3 bg-green-50 rounded-lg border border-green-200">
        <div className="flex items-center gap-3">
          <div className="w-2 h-2 bg-green-500 rounded-full animate-pulse" />
          <span className="text-lg font-mono font-bold text-green-700">
            {formatElapsed(elapsed)}
          </span>
        </div>
        <Button variant="danger" size="sm" onClick={onClockOut}>
          <Square className="w-4 h-4 mr-1" /> Clock Out
        </Button>
      </div>
    )
  }

  return (
    <Button size="lg" onClick={onClockIn} className="w-full md:w-auto">
      <Play className="w-5 h-5 mr-2" /> Clock In
    </Button>
  )
}
