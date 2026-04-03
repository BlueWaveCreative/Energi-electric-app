'use client'

import { useState } from 'react'
import { Plus } from 'lucide-react'
import { createClient } from '@/lib/supabase/client'

interface QuickTaskInputProps {
  phaseId: string
  userId: string
  onTaskAdded: () => void
}

export function QuickTaskInput({ phaseId, userId, onTaskAdded }: QuickTaskInputProps) {
  const [isOpen, setIsOpen] = useState(false)
  const [title, setTitle] = useState('')
  const [saving, setSaving] = useState(false)

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    if (!title.trim() || saving) return
    setSaving(true)

    const supabase = createClient()
    const { error } = await supabase.from('tasks').insert({
      phase_id: phaseId,
      title: title.trim(),
      status: 'pending',
      assigned_to: userId,
    })

    if (error) {
      console.error('Failed to create task:', error)
      alert('Failed to add task. Try again.')
      setSaving(false)
      return
    }

    setTitle('')
    setIsOpen(false)
    setSaving(false)
    onTaskAdded()
  }

  if (!isOpen) {
    return (
      <button
        type="button"
        onClick={() => setIsOpen(true)}
        className="flex items-center gap-2 py-2 text-sm text-[#68BD45] hover:text-[#5aa83c] transition-colors w-full"
      >
        <Plus className="w-4 h-4" />
        <span>Add task...</span>
      </button>
    )
  }

  return (
    <form onSubmit={handleSubmit} className="flex gap-2 py-2">
      <input
        type="text"
        value={title}
        onChange={(e) => setTitle(e.target.value)}
        placeholder="Task title..."
        autoFocus
        disabled={saving}
        aria-label="Task title"
        className="flex-1 px-3 py-1.5 text-sm border border-gray-300 rounded-lg focus:ring-2 focus:ring-[#68BD45] focus:border-transparent placeholder:text-gray-400"
        onKeyDown={(e) => {
          if (e.key === 'Escape') {
            setTitle('')
            setIsOpen(false)
          }
        }}
      />
      <button
        type="submit"
        disabled={!title.trim() || saving}
        className="px-3 py-1.5 text-sm bg-[#68BD45] text-white rounded-lg hover:bg-[#5aa83c] disabled:opacity-50 disabled:cursor-not-allowed"
      >
        Add
      </button>
    </form>
  )
}
