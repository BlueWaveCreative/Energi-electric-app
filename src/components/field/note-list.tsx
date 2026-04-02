import { formatDate } from '@/lib/utils'
import type { Note, Profile } from '@/lib/types/database'

interface NoteWithUser extends Note {
  profiles: Pick<Profile, 'name'>
}

interface NoteListProps {
  notes: NoteWithUser[]
}

export function NoteList({ notes }: NoteListProps) {
  if (notes.length === 0) {
    return <p className="text-sm text-gray-500 italic">No notes yet</p>
  }

  return (
    <div className="space-y-3">
      {notes.map((note) => (
        <div key={note.id} className="bg-gray-50 rounded-lg p-3">
          <p className="text-sm text-gray-800 whitespace-pre-wrap">{note.content}</p>
          <div className="flex items-center gap-2 mt-2 text-xs text-gray-500">
            <span className="font-medium">{note.profiles?.name ?? 'Unknown'}</span>
            <span>{formatDate(new Date(note.created_at))}</span>
          </div>
        </div>
      ))}
    </div>
  )
}
