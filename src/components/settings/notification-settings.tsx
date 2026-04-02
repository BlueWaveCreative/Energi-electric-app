'use client'

import { useState, useCallback } from 'react'
import { useRouter } from 'next/navigation'
import { useSupabase } from '@/hooks/use-supabase'
import { Card } from '@/components/ui/card'
import { Bell } from 'lucide-react'
import type { NotificationPreference } from '@/lib/types/database'

interface NotificationSettingsProps {
  preferences: NotificationPreference | null
  userId: string
}

type ToggleKey = 'clock_events' | 'phase_complete' | 'new_photo'

const TOGGLE_OPTIONS: { key: ToggleKey; label: string; description: string }[] = [
  { key: 'clock_events', label: 'Clock In/Out', description: 'When crew clocks in or out' },
  { key: 'phase_complete', label: 'Phase Complete', description: 'When a project phase is marked complete' },
  { key: 'new_photo', label: 'New Photo Added', description: 'When crew uploads a project photo' },
]

export function NotificationSettings({ preferences, userId }: NotificationSettingsProps) {
  const supabase = useSupabase()
  const router = useRouter()
  const [prefs, setPrefs] = useState<NotificationPreference | null>(preferences)
  const [subscribing, setSubscribing] = useState(false)

  const hasSubscription = !!prefs?.push_subscription

  const ensurePrefsExist = useCallback(async (): Promise<NotificationPreference> => {
    if (prefs) return prefs

    const newPrefs: Partial<NotificationPreference> = {
      user_id: userId,
      clock_events: true,
      phase_complete: true,
      new_photo: true,
      push_subscription: null,
    }

    const { data } = await supabase
      .from('notification_preferences')
      .upsert(newPrefs, { onConflict: 'user_id' })
      .select()
      .single()

    if (data) {
      setPrefs(data as NotificationPreference)
      return data as NotificationPreference
    }

    return newPrefs as NotificationPreference
  }, [prefs, userId, supabase])

  async function handleToggle(key: ToggleKey) {
    const current = await ensurePrefsExist()
    const newValue = !current[key]

    await supabase
      .from('notification_preferences')
      .update({ [key]: newValue, updated_at: new Date().toISOString() })
      .eq('user_id', userId)

    setPrefs((prev) => prev ? { ...prev, [key]: newValue } : prev)
    router.refresh()
  }

  async function handleEnablePush() {
    setSubscribing(true)
    try {
      const permission = await Notification.requestPermission()
      if (permission !== 'granted') {
        alert('Please allow notifications in your browser settings.')
        return
      }

      const registration = await navigator.serviceWorker.register('/sw.js')
      await navigator.serviceWorker.ready

      const subscription = await registration.pushManager.subscribe({
        userVisibleOnly: true,
        applicationServerKey: process.env.NEXT_PUBLIC_VAPID_PUBLIC_KEY,
      })

      const res = await fetch('/api/notifications/subscribe', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ subscription: subscription.toJSON() }),
      })

      if (res.ok) {
        const data = await res.json()
        setPrefs(data.preferences)
        router.refresh()
      }
    } catch (err) {
      console.error('Push subscription failed:', err)
      alert('Failed to enable push notifications. Please try again.')
    } finally {
      setSubscribing(false)
    }
  }

  return (
    <Card>
      <div className="flex items-center gap-2 mb-4">
        <Bell className="w-5 h-5 text-[#68BD45]" />
        <h2 className="font-semibold">Notifications</h2>
      </div>

      {!hasSubscription && (
        <div className="mb-4 p-3 bg-gray-50 rounded-lg">
          <p className="text-sm text-gray-600 mb-2">
            Enable push notifications to get alerts on your phone or desktop.
          </p>
          <button
            onClick={handleEnablePush}
            disabled={subscribing}
            className="px-4 py-2 text-sm font-medium text-white bg-[#68BD45] rounded-lg hover:bg-[#5aa93d] transition-colors disabled:opacity-50"
          >
            {subscribing ? 'Enabling...' : 'Enable Push Notifications'}
          </button>
        </div>
      )}

      <div className="space-y-3">
        {TOGGLE_OPTIONS.map(({ key, label, description }) => (
          <div key={key} className="flex items-center justify-between">
            <div>
              <p className="text-sm font-medium text-gray-900">{label}</p>
              <p className="text-xs text-gray-500">{description}</p>
            </div>
            <button
              onClick={() => handleToggle(key)}
              className={`relative inline-flex h-6 w-11 items-center rounded-full transition-colors ${
                prefs?.[key] !== false ? 'bg-[#68BD45]' : 'bg-gray-300'
              }`}
              role="switch"
              aria-checked={prefs?.[key] !== false}
              aria-label={`${label} notifications`}
            >
              <span
                className={`inline-block h-4 w-4 transform rounded-full bg-white transition-transform ${
                  prefs?.[key] !== false ? 'translate-x-6' : 'translate-x-1'
                }`}
              />
            </button>
          </div>
        ))}
      </div>

      {hasSubscription && (
        <p className="mt-3 text-xs text-gray-500">
          Push notifications are active on this device.
        </p>
      )}
    </Card>
  )
}
