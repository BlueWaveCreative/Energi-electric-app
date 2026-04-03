'use client'

import { useState, useRef } from 'react'
import { Camera, ImagePlus, FileText, ExternalLink, ChevronDown, ChevronUp, Check } from 'lucide-react'
import { cn, formatDuration } from '@/lib/utils'
import { formatElapsed } from '@/hooks/use-timer'
import { uploadPhoto } from '@/lib/storage'
import { createClient } from '@/lib/supabase/client'
import { QuickTaskInput } from './quick-task-input'
import { QuickNoteForm } from './quick-note-input'
import type { Task, TaskStatus } from '@/lib/types/database'

interface JobCardProps {
  scheduleEntryId: string
  project: { id: string; name: string; address: string | null }
  activePhase: { id: string; name: string } | null
  tasks: Task[]
  projectColor: string
  // Timer state
  isTimerRunning: boolean
  isActiveJob: boolean
  elapsed: number
  onClockIn: () => void
  onClockOut: () => void
  isClockingOut?: boolean
  // Completed state
  isCompleted: boolean
  loggedMinutes: number
  // User
  userId: string
  // Dimmed when another job is active
  isDimmed: boolean
}

export function JobCard({
  scheduleEntryId,
  project,
  activePhase,
  tasks,
  projectColor,
  isTimerRunning,
  isActiveJob,
  elapsed,
  onClockIn,
  onClockOut,
  isClockingOut = false,
  isCompleted,
  loggedMinutes,
  userId,
  isDimmed,
}: JobCardProps) {
  const [showTasks, setShowTasks] = useState(false)
  const [showNoteInput, setShowNoteInput] = useState(false)
  const [localTasks, setLocalTasks] = useState(tasks)
  const cameraRef = useRef<HTMLInputElement>(null)
  const fileRef = useRef<HTMLInputElement>(null)

  // Auto-expand tasks when clocked in
  const tasksExpanded = isActiveJob || showTasks

  async function handleTaskToggle(taskId: string, currentStatus: TaskStatus) {
    const newStatus = currentStatus === 'complete' ? 'pending' : 'complete'
    const supabase = createClient()
    const { error } = await supabase
      .from('tasks')
      .update({ status: newStatus })
      .eq('id', taskId)

    if (!error) {
      setLocalTasks((prev) =>
        prev.map((t) => (t.id === taskId ? { ...t, status: newStatus } : t))
      )
    }
  }

  async function handlePhotoCapture(file: File) {
    await uploadPhoto(file, project.id, 'project', project.id)
    window.location.reload()
  }

  function handleFileInput(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0]
    if (file) handlePhotoCapture(file)
    e.target.value = ''
  }

  const completedCount = localTasks.filter((t) => t.status === 'complete').length

  // --- COMPLETED STATE ---
  if (isCompleted) {
    return (
      <div className="bg-white rounded-lg border border-gray-200 shadow-sm p-4 opacity-50">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="w-1 h-10 rounded-full bg-gray-300" />
            <div>
              <p className="font-semibold text-gray-500 text-sm">{project.name}</p>
              <p className="text-xs text-gray-400">
                {activePhase?.name ?? 'Completed'} · {formatDuration(loggedMinutes)} logged
              </p>
            </div>
          </div>
          <Check className="w-5 h-5 text-[#68BD45]" />
        </div>
      </div>
    )
  }

  // --- ACTIVE STATE (clocked in) ---
  if (isActiveJob) {
    return (
      <div className="bg-[#f0faf0] rounded-lg border-2 border-[#68BD45]/30 shadow-sm p-4">
        {/* Timer banner */}
        <div className="flex items-center justify-between mb-3 px-3 py-2 bg-[#68BD45]/10 rounded-lg">
          <span className="text-xl font-bold text-[#68BD45] tabular-nums">
            {formatElapsed(elapsed)}
          </span>
          <button
            type="button"
            onClick={onClockOut}
            disabled={isClockingOut}
            className="px-4 py-1.5 text-sm font-semibold bg-red-600 text-white rounded-lg hover:bg-red-700 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
          >
            {isClockingOut ? 'Saving...' : 'Clock Out'}
          </button>
        </div>

        {/* Project info */}
        <div className="flex items-center gap-3 mb-3">
          <div className="w-1 h-10 rounded-full" style={{ backgroundColor: projectColor }} />
          <div>
            <p className="font-semibold text-gray-900 text-sm">{project.name}</p>
            {project.address && (
              <p className="text-xs text-gray-500">{project.address}</p>
            )}
            <p className="text-xs text-[#68BD45] font-medium">{activePhase?.name} · clocked in</p>
          </div>
        </div>

        {/* Task checklist */}
        {localTasks.length > 0 && (
          <div className="border-t border-[#68BD45]/20 pt-3 mb-3">
            {localTasks.map((task) => (
              <label
                key={task.id}
                className="flex items-center gap-2 py-1.5 cursor-pointer"
              >
                <input
                  type="checkbox"
                  checked={task.status === 'complete'}
                  onChange={() => handleTaskToggle(task.id, task.status)}
                  className="w-4 h-4 rounded border-gray-300 text-[#68BD45] focus:ring-[#68BD45]"
                />
                <span
                  className={cn(
                    'text-sm',
                    task.status === 'complete'
                      ? 'text-gray-400 line-through'
                      : 'text-gray-700'
                  )}
                >
                  {task.title}
                </span>
              </label>
            ))}
            <QuickTaskInput
              phaseId={activePhase!.id}
              userId={userId}
              onTaskAdded={() => window.location.reload()}
            />
          </div>
        )}

        {localTasks.length === 0 && activePhase && (
          <div className="border-t border-[#68BD45]/20 pt-3 mb-3">
            <p className="text-xs text-gray-400 mb-2">No tasks yet</p>
            <QuickTaskInput
              phaseId={activePhase.id}
              userId={userId}
              onTaskAdded={() => window.location.reload()}
            />
          </div>
        )}

        {/* Note input (toggled) */}
        {showNoteInput && (
          <QuickNoteForm
            projectId={project.id}
            userId={userId}
            onDone={() => {
              setShowNoteInput(false)
              window.location.reload()
            }}
          />
        )}

        {/* Quick actions */}
        <div className="flex gap-2 flex-wrap">
          <input
            ref={cameraRef}
            type="file"
            accept="image/*"
            capture="environment"
            onChange={handleFileInput}
            className="hidden"
          />
          <input
            ref={fileRef}
            type="file"
            accept="image/*"
            onChange={handleFileInput}
            className="hidden"
          />
          <button
            type="button"
            onClick={() => cameraRef.current?.click()}
            className="flex items-center gap-1 px-3 py-1.5 text-xs bg-gray-100 text-gray-600 rounded-lg hover:bg-gray-200 transition-colors md:hidden"
          >
            <Camera className="w-3.5 h-3.5" /> Photo
          </button>
          <button
            type="button"
            onClick={() => fileRef.current?.click()}
            className="hidden md:flex items-center gap-1 px-3 py-1.5 text-xs bg-gray-100 text-gray-600 rounded-lg hover:bg-gray-200 transition-colors"
          >
            <ImagePlus className="w-3.5 h-3.5" /> Upload
          </button>
          <button
            type="button"
            onClick={() => setShowNoteInput(!showNoteInput)}
            className="flex items-center gap-1 px-3 py-1.5 text-xs bg-gray-100 text-gray-600 rounded-lg hover:bg-gray-200 transition-colors"
          >
            <FileText className="w-3.5 h-3.5" /> Note
          </button>
          <a
            href={`/projects/${project.id}`}
            className="flex items-center gap-1 px-3 py-1.5 text-xs bg-gray-100 text-gray-600 rounded-lg hover:bg-gray-200 transition-colors"
          >
            <ExternalLink className="w-3.5 h-3.5" /> Full Project
          </a>
        </div>
      </div>
    )
  }

  // --- IDLE STATE ---
  return (
    <div className={cn(
      'bg-white rounded-lg border border-gray-200 shadow-sm p-4 transition-opacity',
      isDimmed && 'opacity-50'
    )}>
      <div className="flex items-center gap-3">
        <div className="w-1 h-10 rounded-full" style={{ backgroundColor: projectColor }} />
        <div className="flex-1 min-w-0">
          <p className="font-semibold text-gray-900 text-sm truncate">{project.name}</p>
          {project.address && (
            <p className="text-xs text-gray-500 truncate">{project.address}</p>
          )}
          <p className="text-xs text-gray-400">{activePhase?.name ?? 'All phases complete'}</p>
        </div>
      </div>

      {activePhase && !isDimmed && (
        <div className="flex gap-2 mt-3">
          <button
            type="button"
            onClick={onClockIn}
            className="flex items-center gap-1.5 px-4 py-1.5 text-sm font-semibold bg-[#68BD45] text-white rounded-lg hover:bg-[#5aa83c] transition-colors"
          >
            ▶ Clock In
          </button>
          <button
            type="button"
            onClick={() => setShowTasks(!showTasks)}
            className="flex items-center gap-1.5 px-3 py-1.5 text-sm bg-gray-100 text-gray-600 rounded-lg hover:bg-gray-200 transition-colors"
          >
            {tasksExpanded ? <ChevronUp className="w-3.5 h-3.5" /> : <ChevronDown className="w-3.5 h-3.5" />}
            {localTasks.length} tasks
          </button>
        </div>
      )}

      {/* Expandable task list in idle state */}
      {tasksExpanded && !isDimmed && localTasks.length > 0 && (
        <div className="border-t border-gray-100 mt-3 pt-3">
          {localTasks.map((task) => (
            <label
              key={task.id}
              className="flex items-center gap-2 py-1.5 cursor-pointer"
            >
              <input
                type="checkbox"
                checked={task.status === 'complete'}
                onChange={() => handleTaskToggle(task.id, task.status)}
                className="w-4 h-4 rounded border-gray-300 text-[#68BD45] focus:ring-[#68BD45]"
              />
              <span
                className={cn(
                  'text-sm',
                  task.status === 'complete'
                    ? 'text-gray-400 line-through'
                    : 'text-gray-700'
                )}
              >
                {task.title}
              </span>
            </label>
          ))}
          <p className="text-xs text-gray-400 mt-1">{completedCount}/{localTasks.length} complete</p>
        </div>
      )}
    </div>
  )
}
