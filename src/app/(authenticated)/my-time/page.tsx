export const dynamic = 'force-dynamic'

import { redirect } from 'next/navigation'
import { createClient } from '@/lib/supabase/server'
import { PageHeader } from '@/components/layout/page-header'
import { TimeEntryList } from '@/components/field/time-entry-list'
import { Card } from '@/components/ui/card'
import { formatDuration } from '@/lib/utils'

export default async function MyTimePage() {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) redirect('/login')

  // This week
  const weekStart = new Date()
  weekStart.setDate(weekStart.getDate() - weekStart.getDay())
  weekStart.setHours(0, 0, 0, 0)

  const { data: entries } = await supabase
    .from('time_entries')
    .select('*, profiles!time_entries_user_id_fkey(name), phases(name)')
    .eq('user_id', user.id)
    .gte('start_time', weekStart.toISOString())
    .order('start_time', { ascending: false })

  const totalMinutes = entries?.reduce(
    (sum, e) => sum + (e.duration_minutes ?? 0),
    0
  ) ?? 0

  return (
    <div>
      <PageHeader title="My Time" />
      <div className="p-4 md:p-6 space-y-6">
        <Card>
          <div className="text-center py-4">
            <p className="text-3xl font-bold text-gray-900">{formatDuration(totalMinutes)}</p>
            <p className="text-sm text-gray-500 mt-1">This week</p>
          </div>
        </Card>

        <div>
          <h2 className="text-lg font-semibold text-gray-900 mb-3">Recent Entries</h2>
          <TimeEntryList entries={entries ?? []} showUser={false} />
        </div>
      </div>
    </div>
  )
}
