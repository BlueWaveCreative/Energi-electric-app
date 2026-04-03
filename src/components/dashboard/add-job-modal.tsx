'use client'

import { useState, useEffect } from 'react'
import { createClient } from '@/lib/supabase/client'
import { Modal } from '@/components/ui/modal'
import { Button } from '@/components/ui/button'

interface ProjectOption {
  id: string
  name: string
  address: string | null
}

interface AddJobModalProps {
  open: boolean
  onClose: () => void
  userId: string
  /** Project IDs already scheduled for today — excluded from dropdown */
  excludeProjectIds: string[]
}

export function AddJobModal({ open, onClose, userId, excludeProjectIds }: AddJobModalProps) {
  const [projects, setProjects] = useState<ProjectOption[]>([])
  const [selectedProjectId, setSelectedProjectId] = useState('')
  const [phaseName, setPhaseName] = useState('')
  const [saving, setSaving] = useState(false)
  const [loading, setLoading] = useState(false)

  // Fetch active projects when modal opens
  useEffect(() => {
    if (!open) return
    setLoading(true)
    const supabase = createClient()
    supabase
      .from('projects')
      .select('id, name, address')
      .eq('status', 'active')
      .order('name')
      .then(({ data }: { data: ProjectOption[] | null }) => {
        const available = (data ?? []).filter(
          (p: ProjectOption) => !excludeProjectIds.includes(p.id)
        )
        setProjects(available)
        setLoading(false)
      })
  }, [open, excludeProjectIds])

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    if (!selectedProjectId || !phaseName.trim() || saving) return
    setSaving(true)

    const supabase = createClient()

    // 1. Get max sort_order for this project's phases
    const { data: existingPhases } = await supabase
      .from('phases')
      .select('sort_order')
      .eq('project_id', selectedProjectId)
      .order('sort_order', { ascending: false })
      .limit(1)

    const nextSortOrder = (existingPhases?.[0]?.sort_order ?? 0) + 1

    // 2. Create the phase
    const { error: phaseError } = await supabase.from('phases').insert({
      project_id: selectedProjectId,
      name: phaseName.trim(),
      status: 'not_started',
      sort_order: nextSortOrder,
    })

    if (phaseError) {
      console.error('Failed to create phase:', phaseError)
      alert('Failed to create job. Try again.')
      setSaving(false)
      return
    }

    // 3. Create schedule entry for today (if not already scheduled for this project)
    const today = new Date().toISOString().split('T')[0]
    await supabase.from('schedule_entries').insert({
      user_id: userId,
      project_id: selectedProjectId,
      date: today,
      created_by: userId,
    }).then(({ error }: { error: { message: string } | null }) => {
      // Ignore unique constraint violation — means entry already exists
      if (error && !error.message.includes('duplicate key')) {
        console.error('Failed to create schedule entry:', error)
      }
    })

    setSaving(false)
    setSelectedProjectId('')
    setPhaseName('')
    onClose()
    window.location.reload()
  }

  return (
    <Modal open={open} onClose={onClose} title="Add Unscheduled Job">
      <form onSubmit={handleSubmit} className="space-y-4">
        <div>
          <label htmlFor="project-select" className="block text-sm font-medium text-gray-700 mb-1">
            Project
          </label>
          {loading ? (
            <p className="text-sm text-gray-500">Loading projects...</p>
          ) : projects.length === 0 ? (
            <p className="text-sm text-gray-500">No other active projects available.</p>
          ) : (
            <select
              id="project-select"
              value={selectedProjectId}
              onChange={(e) => setSelectedProjectId(e.target.value)}
              className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm focus:ring-2 focus:ring-[#68BD45] focus:border-transparent"
            >
              <option value="">Select a project...</option>
              {projects.map((p) => (
                <option key={p.id} value={p.id}>
                  {p.name}{p.address ? ` — ${p.address}` : ''}
                </option>
              ))}
            </select>
          )}
        </div>

        <div>
          <label htmlFor="phase-name" className="block text-sm font-medium text-gray-700 mb-1">
            Job / Phase Name
          </label>
          <input
            id="phase-name"
            type="text"
            value={phaseName}
            onChange={(e) => setPhaseName(e.target.value)}
            placeholder="e.g., Emergency Service Call"
            className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm focus:ring-2 focus:ring-[#68BD45] focus:border-transparent placeholder:text-gray-400"
          />
        </div>

        <div className="flex justify-end gap-2 pt-2">
          <Button type="button" variant="secondary" size="sm" onClick={onClose}>
            Cancel
          </Button>
          <Button
            type="submit"
            size="sm"
            disabled={!selectedProjectId || !phaseName.trim() || saving}
          >
            {saving ? 'Adding...' : 'Add Job'}
          </Button>
        </div>
      </form>
    </Modal>
  )
}
