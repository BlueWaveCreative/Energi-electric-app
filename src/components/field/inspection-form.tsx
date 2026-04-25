'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import { useSupabase } from '@/hooks/use-supabase'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'

interface InspectionFormProps {
  projectId: string
  userId: string
  onSuccess: () => void
}

const TYPES = [
  { value: 'rough_in_inspection', label: 'Rough-In Inspection' },
  { value: 'final_inspection', label: 'Final Inspection' },
  { value: 'permit_application', label: 'Permit Application' },
  { value: 'other', label: 'Other' },
]

const STATUSES = [
  { value: 'pending', label: 'Pending' },
  { value: 'scheduled', label: 'Scheduled' },
  { value: 'passed', label: 'Passed' },
  { value: 'failed', label: 'Failed' },
]

export function InspectionForm({ projectId, userId, onSuccess }: InspectionFormProps) {
  const supabase = useSupabase()
  const router = useRouter()
  const [type, setType] = useState('rough_in_inspection')
  const [status, setStatus] = useState('pending')
  const [scheduledDate, setScheduledDate] = useState('')
  const [notes, setNotes] = useState('')
  const [saving, setSaving] = useState(false)

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault()

    setSaving(true)
    try {
      const { error } = await supabase.from('inspections').insert({
        project_id: projectId,
        type,
        status,
        scheduled_date: scheduledDate || null,
        notes: notes.trim() || null,
        created_by: userId,
      })

      if (error) {
        console.error('Failed to add inspection:', error)
        alert('Failed to add inspection. Please try again.')
        return
      }

      setType('rough_in_inspection')
      setStatus('pending')
      setScheduledDate('')
      setNotes('')
      onSuccess()
      router.refresh()
    } catch {
      alert('Failed to add inspection. Please try again.')
    } finally {
      setSaving(false)
    }
  }

  return (
    <form onSubmit={handleSubmit} className="space-y-3">
      <div>
        <label htmlFor="inspection-type" className="block text-sm font-medium text-gray-700 mb-1">
          Type
        </label>
        <select
          id="inspection-type"
          value={type}
          onChange={(e) => setType(e.target.value)}
          className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-[#045815] focus:border-transparent text-sm"
        >
          {TYPES.map((t) => (
            <option key={t.value} value={t.value}>{t.label}</option>
          ))}
        </select>
      </div>

      <div>
        <label htmlFor="inspection-status" className="block text-sm font-medium text-gray-700 mb-1">
          Status
        </label>
        <select
          id="inspection-status"
          value={status}
          onChange={(e) => setStatus(e.target.value)}
          className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-[#045815] focus:border-transparent text-sm"
        >
          {STATUSES.map((s) => (
            <option key={s.value} value={s.value}>{s.label}</option>
          ))}
        </select>
      </div>

      <Input
        id="inspection-date"
        label="Scheduled Date (optional)"
        type="date"
        value={scheduledDate}
        onChange={(e) => setScheduledDate(e.target.value)}
      />

      <div>
        <label htmlFor="inspection-notes" className="block text-sm font-medium text-gray-700 mb-1">
          Notes (optional)
        </label>
        <textarea
          id="inspection-notes"
          value={notes}
          onChange={(e) => setNotes(e.target.value)}
          placeholder="Any details about this inspection..."
          rows={3}
          className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-[#045815] focus:border-transparent text-sm resize-none placeholder:text-gray-400"
        />
      </div>

      <Button type="submit" disabled={saving} size="sm">
        {saving ? 'Adding...' : 'Add Inspection'}
      </Button>
    </form>
  )
}
