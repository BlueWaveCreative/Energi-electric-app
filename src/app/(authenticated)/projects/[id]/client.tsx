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
import { ExpenseForm } from '@/components/field/expense-form'
import { ExpenseList } from '@/components/field/expense-list'
import { InspectionForm } from '@/components/field/inspection-form'
import { InspectionList } from '@/components/field/inspection-list'
import { ActionBar } from '@/components/field/action-bar'
import { Modal } from '@/components/ui/modal'
import { Button } from '@/components/ui/button'
import { Card } from '@/components/ui/card'
import type { Project, Phase, Task, Note, Photo, TimeEntry, Expense, Inspection, Profile, PhaseStatus, Customer } from '@/lib/types/database'

interface ProjectDetailClientProps {
  project: Project & {
    phases: (Phase & { tasks: Task[] })[]
  }
  customer: Customer | null
  notes: (Note & { profiles: Pick<Profile, 'name'> })[]
  photos: (Photo & { profiles: Pick<Profile, 'name'> })[]
  timeEntries: (TimeEntry & { profiles: Pick<Profile, 'name'>; phases?: Pick<Phase, 'name'> | null })[]
  expenses: (Expense & { profiles: Pick<Profile, 'name'> })[]
  inspections: (Inspection & { profiles: Pick<Profile, 'name'> })[]
  isAdmin: boolean
  userId: string
  hasPlans: boolean
}

export function ProjectDetailClient({
  project,
  customer,
  notes,
  photos,
  timeEntries,
  expenses,
  inspections,
  isAdmin,
  userId,
  hasPlans,
}: ProjectDetailClientProps) {
  const supabase = useSupabase()
  const router = useRouter()
  const { isRunning, activeProjectId, elapsed, startTimer, stopTimer, clearTimer } = useTimer()
  const [showNoteModal, setShowNoteModal] = useState(false)
  const [showTimeModal, setShowTimeModal] = useState(false)
  const [showExpenseModal, setShowExpenseModal] = useState(false)
  const [showInspectionModal, setShowInspectionModal] = useState(false)
  const cameraRef = useRef<HTMLInputElement>(null)

  const sortedPhases = [...project.phases].sort((a, b) => a.sort_order - b.sort_order)

  function sendNotification(type: string, title: string, body: string) {
    fetch('/api/notifications/send', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ type, title, body }),
    }).catch(() => {})
  }

  async function handlePhaseStatusChange(phaseId: string, status: PhaseStatus) {
    await supabase.from('phases').update({ status }).eq('id', phaseId)
    if (status === 'complete') {
      const phase = project.phases.find((p) => p.id === phaseId)
      sendNotification(
        'phase_complete',
        'Phase Complete',
        `${phase?.name ?? 'A phase'} is complete on ${project.name}`
      )
    }
    window.location.reload()
  }

  async function handleClockIn() {
    startTimer(project.id, null)
    sendNotification('clock_events', 'Clock In', `Crew member clocked in at ${project.name}`)
  }

  async function handleClockOut() {
    const result = stopTimer()
    if (!result) return

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
      alert('Failed to save time entry. Your timer is still running — try again.')
      return
    }

    clearTimer()
    sendNotification('clock_events', 'Clock Out', `Crew member clocked out at ${project.name}`)
    window.location.reload()
  }

  async function handleAddNote(content: string) {
    await supabase.from('notes').insert({
      user_id: userId,
      content,
      linked_type: 'project',
      linked_id: project.id,
    })
    setShowNoteModal(false)
    window.location.reload()
  }

  async function handleDeleteNote(noteId: string) {
    if (!confirm('Delete this note?')) return
    await supabase.from('notes').delete().eq('id', noteId)
    window.location.reload()
  }

  async function handleDeleteTimeEntry(entryId: string) {
    if (!confirm('Delete this time entry?')) return
    await supabase.from('time_entries').delete().eq('id', entryId)
    window.location.reload()
  }

  async function handleDeletePhoto(photoId: string) {
    if (!confirm('Delete this photo?')) return
    await supabase.from('photos').delete().eq('id', photoId)
    window.location.reload()
  }

  async function handleDeleteMultiplePhotos(photoIds: string[]) {
    await supabase.from('photos').delete().in('id', photoIds)
    window.location.reload()
  }

  async function handlePhotoCapture(file: File) {
    try {
      // Server handles both R2 upload AND DB insert (avoids iOS cookie bug)
      await uploadPhoto(file, project.id, 'project', project.id)
      sendNotification('new_photo', 'New Photo', `New photo added to ${project.name}`)
      window.location.reload()
    } catch (err) {
      console.error('Photo upload failed:', err)
      alert(`Photo upload failed: ${err instanceof Error ? err.message : 'Unknown error'}`)
    }
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

    const { error } = await supabase.from('time_entries').insert({
      user_id: userId,
      project_id: project.id,
      phase_id: entry.phaseId || null,
      start_time: startTime.toISOString(),
      end_time: endTime.toISOString(),
      duration_minutes: totalMinutes,
      method: 'manual',
      notes: entry.notes || null,
    })

    if (error) {
      console.error('Failed to save time entry:', error)
      alert('Failed to save time entry. Please try again.')
      return
    }

    setShowTimeModal(false)
    window.location.reload()
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
                          window.location.reload()
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
        <h2 className="text-lg font-semibold text-gray-900 mb-3">Notes</h2>
        <NoteList notes={notes} onDelete={isAdmin ? handleDeleteNote : undefined} />
        <div className="mt-3 hidden md:block">
          <NoteForm onSubmit={handleAddNote} />
        </div>
      </div>

      {/* Customer section (admin only) */}
      {isAdmin && (
        <div>
          <h2 className="text-lg font-semibold text-gray-900 mb-3">Customer</h2>
          {customer ? (
            <Card>
              <div className="space-y-1">
                <p className="font-medium text-gray-900">{customer.name}</p>
                {customer.email && (
                  <p className="text-sm text-gray-600">
                    <a href={`mailto:${customer.email}`} className="text-[#68BD45] hover:underline">{customer.email}</a>
                  </p>
                )}
                {customer.phone && (
                  <p className="text-sm text-gray-600">
                    <a href={`tel:${customer.phone}`} className="text-[#68BD45] hover:underline">{customer.phone}</a>
                  </p>
                )}
                {customer.address && <p className="text-sm text-gray-500">{customer.address}</p>}
                {customer.notes && <p className="text-sm text-gray-400 italic">{customer.notes}</p>}
              </div>
            </Card>
          ) : (
            <Card>
              <p className="text-sm text-gray-500">No customer assigned to this project.</p>
            </Card>
          )}
        </div>
      )}

      {/* Blueprints section */}
      <div>
        <div className="flex items-center justify-between mb-3">
          <h2 className="text-lg font-semibold text-gray-900">Blueprints</h2>
          <a
            href={`/projects/${project.id}/plans`}
            className="text-sm text-[#68BD45] hover:underline"
          >
            {hasPlans ? 'View Plans' : 'Upload Blueprint'}
          </a>
        </div>
        {!hasPlans && (
          <div className="bg-gray-50 rounded-lg border border-gray-200 p-4 text-center">
            <p className="text-gray-500 text-sm">No blueprints uploaded yet.</p>
            <a
              href={`/projects/${project.id}/plans`}
              className="text-[#68BD45] text-sm hover:underline mt-1 inline-block"
            >
              Upload one now
            </a>
          </div>
        )}
      </div>

      {/* Photos section */}
      <div>
        <h2 className="text-lg font-semibold text-gray-900 mb-3">Photos</h2>
        <PhotoGallery
          photos={photos}
          onDelete={isAdmin ? handleDeletePhoto : undefined}
          onDeleteMultiple={isAdmin ? handleDeleteMultiplePhotos : undefined}
        />
      </div>

      {/* Expenses section */}
      <div>
        <div className="flex items-center justify-between mb-3">
          <h2 className="text-lg font-semibold text-gray-900">Expenses</h2>
          <Button variant="ghost" size="sm" onClick={() => setShowExpenseModal(true)} className="hidden md:inline-flex">
            + Add Expense
          </Button>
        </div>
        <ExpenseList expenses={expenses} />
        <div className="mt-3 md:hidden">
          <Button variant="secondary" size="sm" onClick={() => setShowExpenseModal(true)}>
            Add Expense
          </Button>
        </div>
      </div>

      {/* Inspections section */}
      <div>
        <div className="flex items-center justify-between mb-3">
          <h2 className="text-lg font-semibold text-gray-900">Inspections</h2>
          {isAdmin && (
            <Button variant="ghost" size="sm" onClick={() => setShowInspectionModal(true)} className="hidden md:inline-flex">
              + Add Inspection
            </Button>
          )}
        </div>
        <InspectionList inspections={inspections} />
        {isAdmin && (
          <div className="mt-3 md:hidden">
            <Button variant="secondary" size="sm" onClick={() => setShowInspectionModal(true)}>
              Add Inspection
            </Button>
          </div>
        )}
      </div>

      {/* Time entries section */}
      <div>
        <div className="flex items-center justify-between mb-3">
          <h2 className="text-lg font-semibold text-gray-900">Time Log</h2>
          <Button variant="ghost" size="sm" onClick={() => setShowTimeModal(true)} className="hidden md:inline-flex">
            + Manual Entry
          </Button>
        </div>
        <TimeEntryList entries={timeEntries} onDelete={isAdmin ? handleDeleteTimeEntry : undefined} />
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
        onLogTime={() => setShowTimeModal(true)}
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

      {/* Expense modal */}
      <Modal open={showExpenseModal} onClose={() => setShowExpenseModal(false)} title="Add Expense">
        <ExpenseForm
          projectId={project.id}
          userId={userId}
          onSuccess={() => setShowExpenseModal(false)}
        />
      </Modal>

      {/* Inspection modal */}
      <Modal open={showInspectionModal} onClose={() => setShowInspectionModal(false)} title="Add Inspection">
        <InspectionForm
          projectId={project.id}
          userId={userId}
          onSuccess={() => setShowInspectionModal(false)}
        />
      </Modal>
    </div>
  )
}
