'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import { useSupabase } from '@/hooks/use-supabase'
import { Button } from '@/components/ui/button'
import { Card } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { Copy } from 'lucide-react'
import { NotificationSettings } from '@/components/settings/notification-settings'
import type { Profile, UserStatus, NotificationPreference } from '@/lib/types/database'

interface SettingsClientProps {
  users: Profile[]
  notificationPreferences: NotificationPreference | null
  userId: string
}

export function SettingsClient({ users, notificationPreferences, userId }: SettingsClientProps) {
  const supabase = useSupabase()
  const router = useRouter()
  const [copied, setCopied] = useState(false)

  function getInviteLink() {
    const baseUrl = window.location.origin
    return `${baseUrl}/signup?role=field_worker`
  }

  async function copyInviteLink() {
    await navigator.clipboard.writeText(getInviteLink())
    setCopied(true)
    setTimeout(() => setCopied(false), 2000)
  }

  async function toggleUserStatus(userId: string, currentStatus: UserStatus) {
    const newStatus = currentStatus === 'active' ? 'inactive' : 'active'
    await supabase.from('profiles').update({ status: newStatus }).eq('id', userId)
    router.refresh()
  }

  return (
    <div className="space-y-6 max-w-xl">
      <NotificationSettings preferences={notificationPreferences} userId={userId} />

      <Card>
        <h2 className="font-semibold text-gray-900 mb-3">Invite Crew Members</h2>
        <p className="text-sm text-gray-500 mb-3">
          Share this link with crew members to let them create an account.
        </p>
        <Button variant="secondary" onClick={copyInviteLink}>
          {copied ? (
            'Copied!'
          ) : (
            <>
              <Copy className="w-4 h-4 mr-2" /> Copy Invite Link
            </>
          )}
        </Button>
      </Card>

      <div>
        <h2 className="font-semibold text-gray-900 mb-3">Team ({users.length})</h2>
        <div className="space-y-2">
          {users.map((u) => (
            <Card key={u.id}>
              <div className="flex items-center justify-between">
                <div>
                  <p className="font-medium text-gray-900">{u.name}</p>
                  <p className="text-sm text-gray-500">{u.email}</p>
                </div>
                <div className="flex items-center gap-3">
                  <Badge variant={u.role === 'admin' ? 'info' : 'default'}>
                    {u.role === 'admin' ? 'Admin' : 'Field'}
                  </Badge>
                  <button
                    onClick={() => toggleUserStatus(u.id, u.status)}
                    className={`relative inline-flex h-6 w-11 items-center rounded-full transition-colors ${
                      u.status === 'active' ? 'bg-[#68BD45]' : 'bg-gray-300'
                    }`}
                    role="switch"
                    aria-checked={u.status === 'active'}
                    aria-label={`${u.name} is ${u.status}`}
                  >
                    <span
                      className={`inline-block h-4 w-4 transform rounded-full bg-white transition-transform ${
                        u.status === 'active' ? 'translate-x-6' : 'translate-x-1'
                      }`}
                    />
                  </button>
                </div>
              </div>
            </Card>
          ))}
        </div>
      </div>
    </div>
  )
}
