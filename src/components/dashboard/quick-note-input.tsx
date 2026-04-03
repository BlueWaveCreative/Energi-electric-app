'use client'

import { useState } from 'react'
import { Send } from 'lucide-react'
import { createClient } from '@/lib/supabase/client'

// Parent controls visibility — renders this component when "Note" button is tapped
export function QuickNoteForm({ projectId, userId, onDone }: {
  projectId: string
  userId: string
  onDone: () => void
}) {
  const [content, setContent] = useState('')
  const [saving, setSaving] = useState(false)

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    if (!content.trim() || saving) return
    setSaving(true)

    const supabase = createClient()
    const { error } = await supabase.from('notes').insert({
      user_id: userId,
      content: content.trim(),
      linked_type: 'project',
      linked_id: projectId,
    })

    if (error) {
      console.error('Failed to add note:', error)
      alert('Failed to add note. Try again.')
      setSaving(false)
      return
    }

    setContent('')
    setSaving(false)
    onDone()
  }

  return (
    <form onSubmit={handleSubmit} className="flex gap-2 mt-2">
      <input
        type="text"
        value={content}
        onChange={(e) => setContent(e.target.value)}
        placeholder="Quick note..."
        autoFocus
        disabled={saving}
        className="flex-1 px-3 py-1.5 text-sm border border-gray-300 rounded-lg focus:ring-2 focus:ring-[#68BD45] focus:border-transparent placeholder:text-gray-400"
        onKeyDown={(e) => {
          if (e.key === 'Escape') onDone()
        }}
      />
      <button
        type="submit"
        disabled={!content.trim() || saving}
        className="p-1.5 bg-[#68BD45] text-white rounded-lg hover:bg-[#5aa83c] disabled:opacity-50 disabled:cursor-not-allowed"
      >
        <Send className="w-4 h-4" />
      </button>
    </form>
  )
}
