import { formatDate, formatDuration } from '@/lib/utils'
import { Badge } from '@/components/ui/badge'
import type { TimeEntry, Profile, Phase } from '@/lib/types/database'

interface TimeEntryWithRelations extends TimeEntry {
  profiles: Pick<Profile, 'name'>
  phases?: Pick<Phase, 'name'> | null
}

interface TimeEntryListProps {
  entries: TimeEntryWithRelations[]
  showUser?: boolean
}

export function TimeEntryList({ entries, showUser = true }: TimeEntryListProps) {
  if (entries.length === 0) {
    return <p className="text-sm text-gray-400 italic">No time entries</p>
  }

  const totalMinutes = entries.reduce((sum, e) => sum + (e.duration_minutes ?? 0), 0)

  return (
    <div className="space-y-2">
      <div className="flex items-center justify-between text-sm">
        <span className="text-gray-500">{entries.length} entries</span>
        <span className="font-medium text-gray-700">Total: {formatDuration(totalMinutes)}</span>
      </div>

      {entries.map((entry) => (
        <div key={entry.id} className="flex items-center justify-between py-2 border-b border-gray-100 last:border-0">
          <div className="flex-1 min-w-0">
            <div className="flex items-center gap-2 text-sm">
              {showUser && (
                <span className="font-medium text-gray-700">{entry.profiles?.name}</span>
              )}
              {entry.phases?.name && (
                <Badge variant="default">{entry.phases.name}</Badge>
              )}
              <Badge variant={entry.method === 'clock' ? 'info' : 'default'}>
                {entry.method === 'clock' ? 'Clock' : 'Manual'}
              </Badge>
              {entry.admin_edited && (
                <Badge variant="warning">Edited</Badge>
              )}
            </div>
            {entry.notes && (
              <p className="text-xs text-gray-500 mt-0.5 truncate">{entry.notes}</p>
            )}
          </div>
          <div className="text-right ml-3 flex-shrink-0">
            <p className="text-sm font-medium">{formatDuration(entry.duration_minutes ?? 0)}</p>
            <p className="text-xs text-gray-400">{formatDate(new Date(entry.start_time))}</p>
          </div>
        </div>
      ))}
    </div>
  )
}
