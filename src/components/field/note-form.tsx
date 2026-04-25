'use client'

import { useState } from 'react'
import { Send } from 'lucide-react'

interface NoteFormProps {
  onSubmit: (content: string) => Promise<void>
  placeholder?: string
}

export function NoteForm({ onSubmit, placeholder = 'Add a note...' }: NoteFormProps) {
  const [content, setContent] = useState('')
  const [saving, setSaving] = useState(false)

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    if (!content.trim() || saving) return
    setSaving(true)
    try {
      await onSubmit(content.trim())
      setContent('')
    } catch {
      // Keep content so user can retry
    } finally {
      setSaving(false)
    }
  }

  return (
    <form onSubmit={handleSubmit} className="flex gap-2">
      <textarea
        value={content}
        onChange={(e) => setContent(e.target.value)}
        placeholder={placeholder}
        aria-label="Note content"
        rows={2}
        className="flex-1 px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-[#045815] focus:border-transparent text-sm resize-none placeholder:text-gray-400"
      />
      <button
        type="submit"
        disabled={!content.trim() || saving}
        aria-label="Add Note"
        className="self-end p-2 bg-[#045815] text-white rounded-lg hover:bg-[#023510] disabled:opacity-50 disabled:cursor-not-allowed"
      >
        <Send className="w-4 h-4" />
      </button>
    </form>
  )
}
