'use client'

import { Wifi, WifiOff, RefreshCw } from 'lucide-react'
import { useConnectivity, type SyncStatus } from '@/hooks/use-connectivity'

const statusConfig: Record<SyncStatus, { color: string; bg: string; icon: typeof Wifi; label: string }> = {
  synced: { color: 'text-green-600', bg: 'bg-green-100', icon: Wifi, label: 'Synced' },
  pending: { color: 'text-yellow-600', bg: 'bg-yellow-100', icon: RefreshCw, label: 'Syncing...' },
  offline: { color: 'text-red-600', bg: 'bg-red-100', icon: WifiOff, label: 'Offline' },
}

export function SyncIndicator() {
  const { status, queueSize } = useConnectivity()
  const config = statusConfig[status]
  const Icon = config.icon

  return (
    <div className={`inline-flex items-center gap-1.5 px-2 py-1 rounded-full text-xs font-medium ${config.bg} ${config.color}`}>
      <Icon className={`w-3 h-3 ${status === 'pending' ? 'animate-spin' : ''}`} />
      <span>{config.label}</span>
      {queueSize > 0 && <span>({queueSize})</span>}
    </div>
  )
}
