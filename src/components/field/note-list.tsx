import { Trash2 } from 'lucide-react'
import { formatDate } from '@/lib/utils'
import type { Note, Profile } from '@/lib/types/database'

interface NoteWithUser extends Note {
  profiles: Pick<Profile, 'name'>
}

interface NoteListProps {
  notes: NoteWithUser[]
  onDelete?: (noteId: string) => void
}

export function NoteList({ notes, onDelete }: NoteListProps) {
  if (notes.length === 0) {
    return <p className="text-sm text-gray-500 italic">No notes yet</p>
  }

  return (
    <div className="space-y-3">
      {notes.map((note) => (
        <div key={note.id} className="bg-gray-50 rounded-lg p-3">
          <p className="text-sm text-gray-800 whitespace-pre-wrap">{note.content}</p>
          <div className="flex items-center justify-between mt-2">
            <div className="flex items-center gap-2 text-xs text-gray-500">
              <span className="font-medium text-gray-700">{note.profiles?.name ?? 'Unknown'}</span>
              <span>{formatDate(new Date(note.created_at))}</span>
            </div>
            {onDelete && (
              <button
                onClick={() => onDelete(note.id)}
                className="text-gray-400 hover:text-red-500 transition-colors p-1"
                aria-label="Delete note"
              >
                <Trash2 className="w-4 h-4" />
              </button>
            )}
          </div>
        </div>
      ))}
    </div>
  )
}
