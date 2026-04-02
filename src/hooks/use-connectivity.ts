'use client'

import { useState, useEffect } from 'react'
import { isOnline, onConnectivityChange } from '@/lib/connectivity'
import { getQueueSize } from '@/lib/offline/queue'

export type SyncStatus = 'synced' | 'pending' | 'offline'

export function useConnectivity() {
  const [online, setOnline] = useState(true)
  const [queueSize, setQueueSize] = useState(0)

  useEffect(() => {
    setOnline(isOnline())
    const cleanup = onConnectivityChange(setOnline)
    return cleanup
  }, [])

  useEffect(() => {
    async function checkQueue() {
      const size = await getQueueSize()
      setQueueSize(size)
    }
    checkQueue()
    const interval = setInterval(checkQueue, 5000)
    return () => clearInterval(interval)
  }, [])

  const status: SyncStatus = !online ? 'offline' : queueSize > 0 ? 'pending' : 'synced'

  return { online, queueSize, status }
}
