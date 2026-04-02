import { formatDate, formatDuration } from '@/lib/utils'
import { Badge } from '@/components/ui/badge'

interface TimeReportEntry {
  id: string
  worker_name: string
  project_name: string
  phase_name: string | null
  start_time: string
  duration_minutes: number
  method: 'clock' | 'manual'
  admin_edited: boolean
  notes: string | null
}

interface TimeReportTableProps {
  entries: TimeReportEntry[]
}

export function TimeReportTable({ entries }: TimeReportTableProps) {
  if (entries.length === 0) {
    return (
      <div className="text-center py-8 text-gray-500">
        No time entries match your filters
      </div>
    )
  }

  return (
    <>
      {/* Desktop table */}
      <div className="hidden md:block overflow-x-auto">
        <table className="w-full text-sm">
          <thead>
            <tr className="border-b border-gray-200 text-left">
              <th className="py-3 px-3 font-medium text-gray-500">Date</th>
              <th className="py-3 px-3 font-medium text-gray-500">Worker</th>
              <th className="py-3 px-3 font-medium text-gray-500">Project</th>
              <th className="py-3 px-3 font-medium text-gray-500">Phase</th>
              <th className="py-3 px-3 font-medium text-gray-500">Hours</th>
              <th className="py-3 px-3 font-medium text-gray-500">Method</th>
              <th className="py-3 px-3 font-medium text-gray-500">Notes</th>
            </tr>
          </thead>
          <tbody>
            {entries.map((entry) => (
              <tr key={entry.id} className="border-b border-gray-100 hover:bg-gray-50">
                <td className="py-2 px-3">{formatDate(new Date(entry.start_time))}</td>
                <td className="py-2 px-3 font-medium">{entry.worker_name}</td>
                <td className="py-2 px-3">{entry.project_name}</td>
                <td className="py-2 px-3 text-gray-500">{entry.phase_name ?? '-'}</td>
                <td className="py-2 px-3 font-mono">{formatDuration(entry.duration_minutes)}</td>
                <td className="py-2 px-3">
                  <Badge variant={entry.method === 'clock' ? 'info' : 'default'}>
                    {entry.method}
                  </Badge>
                  {entry.admin_edited && (
                    <Badge variant="warning" className="ml-1">edited</Badge>
                  )}
                </td>
                <td className="py-2 px-3 text-gray-500 max-w-xs truncate">{entry.notes ?? '-'}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      {/* Mobile cards */}
      <div className="md:hidden space-y-2">
        {entries.map((entry) => (
          <div key={entry.id} className="bg-white border border-gray-200 rounded-lg p-3">
            <div className="flex items-center justify-between mb-1">
              <span className="font-medium text-sm">{entry.worker_name}</span>
              <span className="font-mono text-sm font-bold">{formatDuration(entry.duration_minutes)}</span>
            </div>
            <div className="text-xs text-gray-500 space-y-0.5">
              <p>{entry.project_name}{entry.phase_name ? ` — ${entry.phase_name}` : ''}</p>
              <p>{formatDate(new Date(entry.start_time))}</p>
              {entry.notes && <p className="text-gray-400 truncate">{entry.notes}</p>}
            </div>
          </div>
        ))}
      </div>
    </>
  )
}
