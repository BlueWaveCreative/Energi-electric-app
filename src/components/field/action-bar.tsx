'use client'

import { Play, Square, StickyNote, Camera, Map, Clock } from 'lucide-react'
import { cn } from '@/lib/utils'
import { formatElapsed } from '@/hooks/use-timer'

interface ActionBarProps {
  isTimerRunning: boolean
  isThisProject: boolean
  elapsed: number
  onClockIn: () => void
  onClockOut: () => void
  onAddNote: () => void
  onTakePhoto: () => void
  onLogTime: () => void
  onViewPlans: () => void
  hasPlans: boolean
}

export function ActionBar({
  isTimerRunning,
  isThisProject,
  elapsed,
  onClockIn,
  onClockOut,
  onAddNote,
  onTakePhoto,
  onLogTime,
  onViewPlans,
  hasPlans,
}: ActionBarProps) {
  return (
    <div className="fixed bottom-16 left-0 right-0 bg-white border-t border-gray-200 px-4 py-2 md:hidden z-40">
      {/* Timer bar when running */}
      {isTimerRunning && isThisProject && (
        <div className="flex items-center justify-between mb-2 px-2 py-1 bg-green-50 rounded-lg">
          <div className="flex items-center gap-2">
            <div className="w-2 h-2 bg-green-500 rounded-full animate-pulse" />
            <span className="text-sm font-mono font-bold text-green-700">
              {formatElapsed(elapsed)}
            </span>
          </div>
        </div>
      )}

      <div className="flex justify-around items-center">
        {/* Clock In/Out */}
        <button
          onClick={isTimerRunning && isThisProject ? onClockOut : onClockIn}
          disabled={isTimerRunning && !isThisProject}
          className={cn(
            'flex flex-col items-center gap-1 px-3 py-2 rounded-lg text-xs font-medium',
            isTimerRunning && isThisProject
              ? 'text-red-600'
              : isTimerRunning
                ? 'text-gray-500'
                : 'text-green-600'
          )}
        >
          {isTimerRunning && isThisProject ? (
            <Square className="w-6 h-6" />
          ) : (
            <Play className="w-6 h-6" />
          )}
          {isTimerRunning && isThisProject ? 'Clock Out' : 'Clock In'}
        </button>

        {/* Add Note */}
        <button
          onClick={onAddNote}
          className="flex flex-col items-center gap-1 px-3 py-2 rounded-lg text-xs font-medium text-[#68BD45]"
        >
          <StickyNote className="w-6 h-6" />
          Note
        </button>

        {/* Take Photo */}
        <button
          onClick={onTakePhoto}
          className="flex flex-col items-center gap-1 px-3 py-2 rounded-lg text-xs font-medium text-[#68BD45]"
        >
          <Camera className="w-6 h-6" />
          Photo
        </button>

        {/* Log Time */}
        <button
          onClick={onLogTime}
          className="flex flex-col items-center gap-1 px-3 py-2 rounded-lg text-xs font-medium text-[#68BD45]"
        >
          <Clock className="w-6 h-6" />
          Log Time
        </button>

        {/* View Plans */}
        {hasPlans && (
          <button
            onClick={onViewPlans}
            className="flex flex-col items-center gap-1 px-3 py-2 rounded-lg text-xs font-medium text-[#68BD45]"
          >
            <Map className="w-6 h-6" />
            Plans
          </button>
        )}
      </div>
    </div>
  )
}
