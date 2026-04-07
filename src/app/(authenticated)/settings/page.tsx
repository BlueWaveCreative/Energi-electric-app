export const dynamic = 'force-dynamic'

import { redirect } from 'next/navigation'
import { createClient } from '@/lib/supabase/server'
import { PageHeader } from '@/components/layout/page-header'
import { SettingsClient } from './client'
import type { NotificationPreference, LineItemPreset } from '@/lib/types/database'

export default async function SettingsPage() {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) redirect('/login')

  const { data: profile } = await supabase
    .from('profiles')
    .select('role')
    .eq('id', user.id)
    .single()

  if (profile?.role !== 'admin') redirect('/dashboard')

  const { data: users } = await supabase
    .from('profiles')
    .select('*')
    .order('created_at', { ascending: true })

  const { data: notificationPrefs } = await supabase
    .from('notification_preferences')
    .select('*')
    .eq('user_id', user.id)
    .single()

  const { data: customers } = await supabase
    .from('customers')
    .select('id, name, email, phone, portal_token, portal_active')
    .order('name')

  const { data: presets } = await supabase
    .from('line_item_presets')
    .select('*')
    .order('sort_order')

  return (
    <div>
      <PageHeader title="Settings" />
      <div className="p-4 md:p-6">
        <SettingsClient
          users={users ?? []}
          notificationPreferences={(notificationPrefs as NotificationPreference) ?? null}
          userId={user.id}
          customers={customers ?? []}
          presets={(presets as LineItemPreset[]) ?? []}
        />
      </div>
    </div>
  )
}
