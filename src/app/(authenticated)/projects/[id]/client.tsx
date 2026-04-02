'use client'

import { useState, useRef } from 'react'
import { useRouter } from 'next/navigation'
import { useSupabase } from '@/hooks/use-supabase'
import { useTimer } from '@/hooks/use-timer'
import { uploadPhoto } from '@/lib/storage'
import { PhasePipeline } from '@/components/projects/phase-pipeline'
import { PhaseCard } from '@/components/projects/phase-card'
import { TimeTracker } from '@/components/field/time-tracker'
import { NoteForm } from '@/components/field/note-form'
import { NoteList } from '@/components/field/note-list'
import { PhotoCapture } from '@/components/field/photo-capture'
import { PhotoGallery } from '@/components/field/photo-gallery'
import { TimeEntryList } from '@/components/field/time-entry-list'
import { ManualTimeForm } from '@/components/field/manual-time-form'
import { ActionBar } from '@/components/field/action-bar'
import { Modal } from '@/components/ui/modal'
import { Button } from '@/components/ui/button'
import type { Project, Phase, Task, Note, Photo, TimeEntry, Profile, PhaseStatus } from '@/lib/types/database'

interface ProjectDetailClientProps {
  project: Project & {
    phases: (Phase & { tasks: Task[] })[]
  }
  notes: (Note & { profiles: Pick<Profile, 'name'> })[]
  photos: (Photo & { profiles: Pick<Profile, 'name'> })[]
  timeEntries: (TimeEntry & { profiles: Pick<Profile, 'name'>; phases?: Pick<Phase, 'name'> | null })[]
  isAdmin: boolean
  userId: string
  hasPlans: boolean
}

export function ProjectDetailClient({
  project,
  notes,
  photos,
  timeEntries,
  isAdmin,
  userId,
  hasPlans,
}: ProjectDetailClientProps) {
  const supabase = useSupabase()
  const router = useRouter()
  const { isRunning, activeProjectId, elapsed, startTimer, stopTimer } = useTimer()
  const [showNoteModal, setShowNoteModal] = useState(false)
  const [showTimeModal, setShowTimeModal] = useState(false)
  const cameraRef = useRef<HTMLInputElement>(null)

  const sortedPhases = [...project.phases].sort((a, b) => a.sort_order - b.sort_order)

  async function handlePhaseStatusChange(phaseId: string, status: PhaseStatus) {
    await supabase.from('phases').update({ status }).eq('id', phaseId)
    router.refresh()
  }

  async function handleClockIn() {
    startTimer(project.id, null)
  }

  async function handleClockOut() {
    const result = stopTimer()
    if (!result) return

    // Ensure at least 1 minute is logged
    const duration = Math.max(1, result.durationMinutes)

    const { error } = await supabase.from('time_entries').insert({
      user_id: userId,
      project_id: result.projectId,
      phase_id: result.phaseId,
      start_time: result.startTime,
      end_time: result.endTime,
      duration_minutes: duration,
      method: 'clock',
    })

    if (error) {
      console.error('Failed to save time entry:', error)
      alert('Failed to save time entry. Please try again.')
    }
    router.refresh()
  }

  async function handleAddNote(content: string) {
    await supabase.from('notes').insert({
      user_id: userId,
      content,
      linked_type: 'project',
      linked_id: project.id,
    })
    setShowNoteModal(false)
    router.refresh()
  }

  async function handleDeletePhoto(photoId: string) {
    if (!confirm('Delete this photo?')) return
    await supabase.from('photos').delete().eq('id', photoId)
    router.refresh()
  }

  async function handleDeleteMultiplePhotos(photoIds: string[]) {
    await supabase.from('photos').delete().in('id', photoIds)
    router.refresh()
  }

  async function handlePhotoCapture(file: File) {
    const { path, thumbnailPath } = await uploadPhoto(supabase, file, project.id)
    await supabase.from('photos').insert({
      user_id: userId,
      file_path: path,
      thumbnail_path: thumbnailPath,
      linked_type: 'project',
      linked_id: project.id,
    })
    router.refresh()
  }

  async function handleManualTime(entry: {
    date: string
    hours: number
    minutes: number
    notes: string
    phaseId: string | null
  }) {
    const startTime = new Date(`${entry.date}T09:00:00`)
    const totalMinutes = entry.hours * 60 + entry.minutes
    const endTime = new Date(startTime.getTime() + totalMinutes * 60000)

    await supabase.from('time_entries').insert({
      user_id: userId,
      project_id: project.id,
      phase_id: entry.phaseId,
      start_time: startTime.toISOString(),
      end_time: endTime.toISOString(),
      duration_minutes: totalMinutes,
      method: 'manual',
      notes: entry.notes || null,
    })
    setShowTimeModal(false)
    router.refresh()
  }

  return (
    <div className="space-y-6 pb-40 md:pb-6">
      {/* Timer — desktop */}
      <div className="hidden md:block">
        <TimeTracker
          projectId={project.id}
          isRunning={isRunning}
          elapsed={elapsed}
          activeProjectId={activeProjectId}
          onClockIn={handleClockIn}
          onClockOut={handleClockOut}
        />
      </div>

      {/* Pipeline overview */}
      <PhasePipeline phases={project.phases} />

      {/* Desktop actions */}
      <div className="hidden md:flex gap-2">
        <Button variant="secondary" size="sm" onClick={() => setShowNoteModal(true)}>
          Add Note
        </Button>
        <PhotoCapture onCapture={handlePhotoCapture} />
        <Button variant="secondary" size="sm" onClick={() => setShowTimeModal(true)}>
          Log Time
        </Button>
      </div>

      {/* Phase details */}
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
                    <div key={task.id} className="flex items-center gap-2 text-sm">
                      <input
                        type="checkbox"
                        checked={task.status === 'complete'}
                        onChange={async () => {
                          const newStatus = task.status === 'complete' ? 'pending' : 'complete'
                          await supabase.from('tasks').update({ status: newStatus }).eq('id', task.id)
                          router.refresh()
                        }}
                        className="w-5 h-5 rounded border-gray-300 text-[#68BD45] focus:ring-[#68BD45]"
                        aria-label={`Mark "${task.title}" as ${task.status === 'complete' ? 'incomplete' : 'complete'}`}
                      />
                      <span className={task.status === 'complete' ? 'line-through text-gray-500' : 'text-gray-700'}>
                        {task.title}
                      </span>
                    </div>
                  ))}
                </div>
              ) : (
                <p className="text-sm text-gray-500 italic">No tasks in this phase</p>
              )}
            </PhaseCard>
          )
        })}
      </div>

      {/* Notes section */}
      <div>
        <h2 className="text-lg font-semibold mb-3">Notes</h2>
        <NoteList notes={notes} />
        <div className="mt-3 hidden md:block">
          <NoteForm onSubmit={handleAddNote} />
        </div>
      </div>

      {/* Photos section */}
      <div>
        <h2 className="text-lg font-semibold mb-3">Photos</h2>
        <PhotoGallery
          photos={photos}
          onDelete={isAdmin ? handleDeletePhoto : undefined}
          onDeleteMultiple={isAdmin ? handleDeleteMultiplePhotos : undefined}
        />
      </div>

      {/* Time entries section */}
      <div>
        <div className="flex items-center justify-between mb-3">
          <h2 className="text-lg font-semibold">Time Log</h2>
          <Button variant="ghost" size="sm" onClick={() => setShowTimeModal(true)} className="hidden md:inline-flex">
            + Manual Entry
          </Button>
        </div>
        <TimeEntryList entries={timeEntries} />
      </div>

      {/* Mobile action bar */}
      <ActionBar
        isTimerRunning={isRunning}
        isThisProject={activeProjectId === project.id}
        elapsed={elapsed}
        onClockIn={handleClockIn}
        onClockOut={handleClockOut}
        onAddNote={() => setShowNoteModal(true)}
        onTakePhoto={() => cameraRef.current?.click()}
        onViewPlans={() => router.push(`/projects/${project.id}/plans`)}
        hasPlans={hasPlans}
      />

      {/* Hidden camera input for mobile action bar */}
      <input
        ref={cameraRef}
        type="file"
        accept="image/*"
        capture="environment"
        aria-label="Take a project photo"
        onChange={async (e) => {
          const file = e.target.files?.[0]
          if (file) {
            try {
              await handlePhotoCapture(file)
            } catch {
              // error handled by uploadPhoto
            }
          }
          e.target.value = ''
        }}
        className="hidden"
      />

      {/* Note modal */}
      <Modal open={showNoteModal} onClose={() => setShowNoteModal(false)} title="Add Note">
        <NoteForm onSubmit={handleAddNote} />
      </Modal>

      {/* Manual time modal */}
      <Modal open={showTimeModal} onClose={() => setShowTimeModal(false)} title="Log Time">
        <ManualTimeForm
          projectId={project.id}
          phases={sortedPhases.map((p) => ({ id: p.id, name: p.name }))}
          onSubmit={handleManualTime}
        />
      </Modal>
    </div>
  )
}
