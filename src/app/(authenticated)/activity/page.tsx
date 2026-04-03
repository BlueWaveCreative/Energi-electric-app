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

  const isAdmin = profile?.role === 'admin'

  // Build queries — non-admins only see their own activity
  let notesQuery = supabase
    .from('notes')
    .select('id, created_at, content, user_id, profiles(name), linked_type, linked_id')
    .order('created_at', { ascending: false })
    .limit(20)

  let photosQuery = supabase
    .from('photos')
    .select('id, created_at, caption, user_id, profiles(name), linked_type, linked_id')
    .order('created_at', { ascending: false })
    .limit(20)

  let timeQuery = supabase
    .from('time_entries')
    .select('id, start_time, duration_minutes, method, user_id, profiles!time_entries_user_id_fkey(name), projects(name)')
    .order('start_time', { ascending: false })
    .limit(20)

  if (!isAdmin) {
    notesQuery = notesQuery.eq('user_id', user.id)
    photosQuery = photosQuery.eq('user_id', user.id)
    timeQuery = timeQuery.eq('user_id', user.id)
  }

  const [notesResult, photosResult, timeResult] = await Promise.all([
    notesQuery,
    photosQuery,
    timeQuery,
  ])

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

  activities.sort((a, b) => new Date(b.timestamp).getTime() - new Date(a.timestamp).getTime())

  return (
    <div>
      <PageHeader title={isAdmin ? 'Activity' : 'My Activity'} />
      <div className="p-4 md:p-6">
        <ActivityFeed items={activities} />
      </div>
    </div>
  )
}
