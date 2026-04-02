export const dynamic = 'force-dynamic'

import { redirect } from 'next/navigation'
import { createClient } from '@/lib/supabase/server'
import { PageHeader } from '@/components/layout/page-header'
import { ActivityFeed, type ActivityItem } from '@/components/activity/activity-feed'
import { formatDuration } from '@/lib/utils'

export default async function ActivityPage() {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) redirect('/login')

  const { data: profile } = await supabase
    .from('profiles')
    .select('role')
    .eq('id', user.id)
    .single()

  if (profile?.role !== 'admin') redirect('/dashboard')

  // Fetch recent activity from multiple tables
  const [notesResult, photosResult, timeResult] = await Promise.all([
    supabase
      .from('notes')
      .select('id, created_at, content, profiles(name), linked_type, linked_id')
      .order('created_at', { ascending: false })
      .limit(20),
    supabase
      .from('photos')
      .select('id, created_at, caption, profiles(name), linked_type, linked_id')
      .order('created_at', { ascending: false })
      .limit(20),
    supabase
      .from('time_entries')
      .select('id, start_time, duration_minutes, method, profiles(name), projects(name)')
      .order('start_time', { ascending: false })
      .limit(20),
  ])

  // Merge and sort by timestamp
  const activities: ActivityItem[] = []

  for (const note of notesResult.data ?? []) {
    activities.push({
      id: `note-${note.id}`,
      type: 'note',
      user_name: (note.profiles as any)?.name ?? 'Unknown',
      project_name: 'Project',
      description: `added a note: "${(note.content as string).slice(0, 50)}${(note.content as string).length > 50 ? '...' : ''}"`,
      timestamp: note.created_at,
    })
  }

  for (const photo of photosResult.data ?? []) {
    activities.push({
      id: `photo-${photo.id}`,
      type: 'photo',
      user_name: (photo.profiles as any)?.name ?? 'Unknown',
      project_name: 'Project',
      description: photo.caption ? `uploaded a photo: "${photo.caption}"` : 'uploaded a photo',
      timestamp: photo.created_at,
    })
  }

  for (const entry of timeResult.data ?? []) {
    activities.push({
      id: `time-${entry.id}`,
      type: 'time_entry',
      user_name: (entry.profiles as any)?.name ?? 'Unknown',
      project_name: (entry.projects as any)?.name ?? 'Unknown',
      description: `logged ${formatDuration(entry.duration_minutes ?? 0)} (${entry.method})`,
      timestamp: entry.start_time,
    })
  }

  // Sort by most recent
  activities.sort((a, b) => new Date(b.timestamp).getTime() - new Date(a.timestamp).getTime())

  return (
    <div>
      <PageHeader title="Activity" />
      <div className="p-4 md:p-6">
        <ActivityFeed items={activities} />
      </div>
    </div>
  )
}
