import { StickyNote, Camera, Clock, CheckCircle, FolderOpen } from 'lucide-react'
import { formatDate } from '@/lib/utils'

export interface ActivityItem {
  id: string
  type: 'note' | 'photo' | 'time_entry' | 'phase_change' | 'project_created'
  user_name: string
  project_name: string
  description: string
  timestamp: string
}

interface ActivityFeedProps {
  items: ActivityItem[]
  limit?: number
}

const typeConfig = {
  note: { icon: StickyNote, color: 'text-[#68BD45]', bg: 'bg-[#68BD45]/10' },
  photo: { icon: Camera, color: 'text-purple-500', bg: 'bg-purple-100' },
  time_entry: { icon: Clock, color: 'text-green-500', bg: 'bg-green-100' },
  phase_change: { icon: CheckCircle, color: 'text-orange-500', bg: 'bg-orange-100' },
  project_created: { icon: FolderOpen, color: 'text-gray-500', bg: 'bg-gray-100' },
}

export function ActivityFeed({ items, limit }: ActivityFeedProps) {
  const displayItems = limit ? items.slice(0, limit) : items

  if (displayItems.length === 0) {
    return (
      <div className="text-center py-6 text-gray-500 text-sm">
        No recent activity
      </div>
    )
  }

  return (
    <div className="space-y-3">
      {displayItems.map((item) => {
        const config = typeConfig[item.type]
        const Icon = config.icon
        return (
          <div key={item.id} className="flex items-start gap-3">
            <div className={`p-1.5 rounded-lg ${config.bg} flex-shrink-0 mt-0.5`}>
              <Icon className={`w-4 h-4 ${config.color}`} />
            </div>
            <div className="flex-1 min-w-0">
              <p className="text-sm text-gray-800">
                <span className="font-semibold text-gray-900">{item.user_name}</span>
                {' '}{item.description}
              </p>
              <div className="flex items-center gap-2 mt-0.5">
                <span className="text-xs text-gray-500">{item.project_name}</span>
                <span className="text-xs text-gray-400">-</span>
                <span className="text-xs text-gray-500">{formatDate(new Date(item.timestamp))}</span>
              </div>
            </div>
          </div>
        )
      })}
    </div>
  )
}
