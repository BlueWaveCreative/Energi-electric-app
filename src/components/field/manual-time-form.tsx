'use client'

import { useState } from 'react'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'

interface ManualTimeFormProps {
  projectId: string
  onSubmit: (entry: {
    date: string
    hours: number
    minutes: number
    notes: string
    phaseId: string | null
  }) => Promise<void>
  phases?: { id: string; name: string }[]
}

export function ManualTimeForm({ projectId, onSubmit, phases }: ManualTimeFormProps) {
  const [date, setDate] = useState(new Date().toISOString().split('T')[0])
  const [hours, setHours] = useState('')
  const [minutes, setMinutes] = useState('')
  const [notes, setNotes] = useState('')
  const [phaseId, setPhaseId] = useState('')
  const [saving, setSaving] = useState(false)

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    const h = parseInt(hours) || 0
    const m = parseInt(minutes) || 0
    if (h === 0 && m === 0) return

    setSaving(true)
    try {
      await onSubmit({
        date,
        hours: h,
        minutes: m,
        notes: notes.trim(),
        phaseId: phaseId || null,
      })
      setHours('')
      setMinutes('')
      setNotes('')
    } catch {
      // caller handles display
    } finally {
      setSaving(false)
    }
  }

  return (
    <form onSubmit={handleSubmit} className="space-y-3">
      <Input
        id="date"
        label="Date"
        type="date"
        value={date}
        onChange={(e) => setDate(e.target.value)}
        required
      />

      <div className="grid grid-cols-2 gap-3">
        <Input
          id="hours"
          label="Hours"
          type="number"
          min="0"
          max="24"
          value={hours}
          onChange={(e) => setHours(e.target.value)}
          placeholder="0"
        />
        <Input
          id="minutes"
          label="Minutes"
          type="number"
          min="0"
          max="59"
          value={minutes}
          onChange={(e) => setMinutes(e.target.value)}
          placeholder="0"
        />
      </div>

      {phases && phases.length > 0 && (
        <div>
          <label htmlFor="phase" className="block text-sm font-medium text-gray-700 mb-1">
            Phase (optional)
          </label>
          <select
            id="phase"
            value={phaseId}
            onChange={(e) => setPhaseId(e.target.value)}
            className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent text-sm"
          >
            <option value="">General</option>
            {phases.map((p) => (
              <option key={p.id} value={p.id}>{p.name}</option>
            ))}
          </select>
        </div>
      )}

      <Input
        id="notes"
        label="Notes (optional)"
        value={notes}
        onChange={(e) => setNotes(e.target.value)}
        placeholder="What did you work on?"
      />

      <Button type="submit" disabled={saving} size="sm">
        {saving ? 'Adding...' : 'Add Time Entry'}
      </Button>
    </form>
  )
}
