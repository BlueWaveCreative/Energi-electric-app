import { formatDate } from '@/lib/utils'
import { Badge } from '@/components/ui/badge'
import type { Inspection, Profile } from '@/lib/types/database'

interface InspectionWithUser extends Inspection {
  profiles: Pick<Profile, 'name'>
}

interface InspectionListProps {
  inspections: InspectionWithUser[]
}

const TYPE_LABELS: Record<string, string> = {
  rough_in_inspection: 'Rough-In Inspection',
  final_inspection: 'Final Inspection',
  permit_application: 'Permit Application',
  other: 'Other',
}

const STATUS_VARIANTS: Record<string, 'default' | 'info' | 'success' | 'danger'> = {
  pending: 'default',
  scheduled: 'info',
  passed: 'success',
  failed: 'danger',
}

const STATUS_LABELS: Record<string, string> = {
  pending: 'Pending',
  scheduled: 'Scheduled',
  passed: 'Passed',
  failed: 'Failed',
}

export function InspectionList({ inspections }: InspectionListProps) {
  if (inspections.length === 0) {
    return <p className="text-sm text-gray-500 italic">No inspections yet</p>
  }

  return (
    <div className="space-y-2">
      <span className="text-sm text-gray-500">{inspections.length} inspection{inspections.length !== 1 ? 's' : ''}</span>

      {inspections.map((inspection) => (
        <div key={inspection.id} className="flex items-start justify-between py-2 border-b border-gray-100 last:border-0">
          <div className="flex-1 min-w-0">
            <div className="flex items-center gap-2 text-sm">
              <span className="font-medium text-gray-700">
                {TYPE_LABELS[inspection.type] ?? inspection.type}
              </span>
              <Badge variant={STATUS_VARIANTS[inspection.status] ?? 'default'}>
                {STATUS_LABELS[inspection.status] ?? inspection.status}
              </Badge>
            </div>
            {inspection.notes && (
              <p className="text-xs text-gray-500 mt-0.5">{inspection.notes}</p>
            )}
            <div className="flex items-center gap-2 mt-0.5 text-xs text-gray-500">
              <span>{inspection.profiles?.name ?? 'Unknown'}</span>
              {inspection.scheduled_date && (
                <span>Scheduled: {formatDate(new Date(inspection.scheduled_date))}</span>
              )}
            </div>
          </div>
          <div className="text-right ml-3 flex-shrink-0">
            <p className="text-xs text-gray-500">{formatDate(new Date(inspection.created_at))}</p>
          </div>
        </div>
      ))}
    </div>
  )
}
