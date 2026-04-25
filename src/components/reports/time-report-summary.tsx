import { Card } from '@/components/ui/card'
import { Clock, FileText, FolderOpen, Users } from 'lucide-react'
import { formatDuration } from '@/lib/utils'

interface TimeReportSummaryProps {
  totalMinutes: number
  entryCount: number
  uniqueProjects: number
  uniqueWorkers: number
}

export function TimeReportSummary({
  totalMinutes,
  entryCount,
  uniqueProjects,
  uniqueWorkers,
}: TimeReportSummaryProps) {
  const stats = [
    { label: 'Total Hours', value: formatDuration(totalMinutes), icon: Clock, color: 'text-[#045815]' },
    { label: 'Entries', value: String(entryCount), icon: FileText, color: 'text-green-500' },
    { label: 'Projects', value: String(uniqueProjects), icon: FolderOpen, color: 'text-purple-500' },
    { label: 'Workers', value: String(uniqueWorkers), icon: Users, color: 'text-orange-500' },
  ]

  return (
    <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
      {stats.map((stat) => (
        <Card key={stat.label}>
          <div className="flex items-center gap-3">
            <stat.icon className={`w-8 h-8 ${stat.color}`} />
            <div>
              <p className="text-2xl font-bold text-gray-900">{stat.value}</p>
              <p className="text-xs text-gray-500">{stat.label}</p>
            </div>
          </div>
        </Card>
      ))}
    </div>
  )
}
