'use client'

import { useState } from 'react'
import { useTimer } from '@/hooks/use-timer'
import { useSupabase } from '@/hooks/use-supabase'
import { formatDuration } from '@/lib/utils'
import { CalendarDays, Plus } from 'lucide-react'
import { JobCard } from './job-card'
import { AddJobModal } from './add-job-modal'
import type { Task } from '@/lib/types/database'

export interface ScheduleItem {
  scheduleEntryId: string
  project: { id: string; name: string; address: string | null }
  activePhase: { id: string; name: string } | null
  tasks: Task[]
  projectColor: string
}

export interface CompletedJob {
  projectId: string
  phaseId: string
  projectName: string
  phaseName: string
  durationMinutes: number
}

interface TodayClientProps {
  user: { id: string; name: string }
  schedule: ScheduleItem[]
  totalMinutes: number
  completedJobs: CompletedJob[]
}

const PROJECT_COLORS = [
  '#045815', '#3B82F6', '#F59E0B', '#EF4444',
  '#8B5CF6', '#EC4899', '#14B8A6', '#F97316',
]

export function TodayClient({ user, schedule, totalMinutes, completedJobs }: TodayClientProps) {
  const { isRunning, activeProjectId, activePhaseId, elapsed, startTimer, stopTimer, clearTimer } = useTimer()
  const supabase = useSupabase()
  const [showAddJobModal, setShowAddJobModal] = useState(false)
  const [isClockingOut, setIsClockingOut] = useState(false)

  const firstName = user.name?.split(' ')[0] ?? 'there'
  const today = new Date()
  const dateStr = today.toLocaleDateString('en-US', {
    weekday: 'long',
    month: 'long',
    day: 'numeric',
  })
  const jobCount = schedule.length + completedJobs.length

  function sendNotification(type: string, title: string, body: string) {
    fetch('/api/notifications/send', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ type, title, body }),
    }).catch(() => {})
  }

  function handleClockIn(projectId: string, phaseId: string, projectName: string, phaseName: string) {
    startTimer(projectId, phaseId)
    sendNotification(
      'clock_events',
      'Clock In',
      `${user.name} clocked in on ${projectName} — ${phaseName}`
    )
  }

  async function handleClockOut() {
    if (isClockingOut) return
    setIsClockingOut(true)

    const result = stopTimer()
    if (!result) { setIsClockingOut(false); return }

    const duration = Math.max(1, result.durationMinutes)

    const { error } = await supabase.from('time_entries').insert({
      user_id: user.id,
      project_id: result.projectId,
      phase_id: result.phaseId,
      start_time: result.startTime,
      end_time: result.endTime,
      duration_minutes: duration,
      method: 'clock',
    })

    if (error) {
      console.error('Failed to save time entry:', error)
      alert('Failed to save time entry. Your timer is still running — try again.')
      setIsClockingOut(false)
      return
    }

    clearTimer()

    // Find project/phase names for notification
    const item = schedule.find((s) => s.project.id === result.projectId)
    const projectName = item?.project.name ?? 'Unknown'
    const phaseName = item?.activePhase?.name ?? 'Unknown'

    sendNotification(
      'clock_events',
      'Clock Out',
      `${user.name} clocked out of ${projectName} — ${phaseName} (${formatDuration(duration)})`
    )

    window.location.reload()
  }

  const scheduledProjectIds = schedule.map((s) => s.project.id)
  const allProjectIds = [
    ...scheduledProjectIds,
    ...completedJobs.map((j) => j.projectId),
  ]

  return (
    <div className="p-4 md:p-6 space-y-4">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-xl font-bold text-gray-900">Hey, {firstName}</h1>
          <p className="text-sm text-gray-600">
            {dateStr} · {jobCount} job{jobCount !== 1 ? 's' : ''} today
          </p>
        </div>
        <div className={`px-3 py-1 rounded-full text-sm font-semibold ${
          totalMinutes > 0 || isRunning
            ? 'bg-[#045815] text-white'
            : 'bg-gray-200 text-gray-500'
        }`}>
          {formatDuration(totalMinutes + (isRunning ? Math.round(elapsed / 60) : 0))} today
        </div>
      </div>

      {/* Active / idle job cards (shown first — worker's current focus) */}
      {schedule.map((item, index) => {
        const isActiveJob = isRunning
          && activeProjectId === item.project.id
          && activePhaseId === item.activePhase?.id
        const isDimmed = isRunning && !isActiveJob

        return (
          <JobCard
            key={item.scheduleEntryId}
            scheduleEntryId={item.scheduleEntryId}
            project={item.project}
            activePhase={item.activePhase}
            tasks={item.tasks}
            projectColor={item.projectColor || PROJECT_COLORS[index % PROJECT_COLORS.length]}
            isTimerRunning={isRunning}
            isActiveJob={isActiveJob}
            elapsed={elapsed}
            onClockIn={() => {
              if (item.activePhase) {
                handleClockIn(
                  item.project.id,
                  item.activePhase.id,
                  item.project.name,
                  item.activePhase.name
                )
              }
            }}
            onClockOut={handleClockOut}
            isClockingOut={isClockingOut}
            isCompleted={false}
            loggedMinutes={0}
            userId={user.id}
            isDimmed={isDimmed}
          />
        )
      })}

      {/* Completed jobs (shown after active/idle) */}
      {completedJobs.map((job) => (
        <JobCard
          key={`done-${job.projectId}-${job.phaseId}`}
          scheduleEntryId=""
          project={{ id: job.projectId, name: job.projectName, address: null }}
          activePhase={{ id: job.phaseId, name: job.phaseName }}
          tasks={[]}
          projectColor="#9CA3AF"
          isTimerRunning={false}
          isActiveJob={false}
          elapsed={0}
          onClockIn={() => {}}
          onClockOut={() => {}}
          isCompleted={true}
          loggedMinutes={job.durationMinutes}
          userId={user.id}
          isDimmed={false}
        />
      ))}

      {/* Empty state */}
      {schedule.length === 0 && completedJobs.length === 0 && (
        <div className="bg-white rounded-lg border border-gray-200 shadow-sm p-8 text-center">
          <CalendarDays className="w-10 h-10 text-gray-300 mx-auto mb-3" aria-hidden="true" />
          <p className="text-gray-600 text-sm">No jobs scheduled for today.</p>
          <p className="text-gray-500 text-xs mt-1">
            Check with your admin or{' '}
            <a href="/schedule" className="text-[#045815] underline hover:text-[#023510]">view the full schedule</a>.
          </p>
        </div>
      )}

      {/* Add unscheduled job */}
      <button
        type="button"
        onClick={() => setShowAddJobModal(true)}
        className="w-full flex items-center justify-center gap-2 py-3 text-sm text-[#045815] border border-dashed border-[#045815]/50 rounded-lg hover:bg-[#045815]/5 transition-colors focus:outline-none focus:ring-2 focus:ring-[#045815]/50"
      >
        <Plus className="w-4 h-4" aria-hidden="true" />
        Add unscheduled job
      </button>

      <AddJobModal
        open={showAddJobModal}
        onClose={() => setShowAddJobModal(false)}
        userId={user.id}
        excludeProjectIds={allProjectIds}
      />
    </div>
  )
}
