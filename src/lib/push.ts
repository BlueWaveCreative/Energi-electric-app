import webpush from 'web-push'
import { type SupabaseClient } from '@supabase/supabase-js'

webpush.setVapidDetails(
  `mailto:${process.env.VAPID_EMAIL}`,
  process.env.NEXT_PUBLIC_VAPID_PUBLIC_KEY!,
  process.env.VAPID_PRIVATE_KEY!
)

type NotificationType = 'clock_events' | 'phase_complete' | 'new_photo'

export async function sendPushToAdmins(
  supabase: SupabaseClient,
  type: NotificationType,
  title: string,
  body: string
) {
  // Get admin user IDs
  const { data: admins } = await supabase
    .from('profiles')
    .select('id')
    .eq('role', 'admin')
    .eq('status', 'active')

  if (!admins?.length) return

  const adminIds = admins.map((a) => a.id)

  // Get notification preferences for admins who have this type enabled + a push subscription
  const { data: prefs } = await supabase
    .from('notification_preferences')
    .select('push_subscription')
    .in('user_id', adminIds)
    .eq(type, true)
    .not('push_subscription', 'is', null)

  if (!prefs?.length) return

  const payload = JSON.stringify({ title, body })

  const results = await Promise.allSettled(
    prefs.map((pref) =>
      webpush.sendNotification(
        pref.push_subscription as unknown as webpush.PushSubscription,
        payload
      )
    )
  )

  const failed = results.filter((r) => r.status === 'rejected').length
  if (failed > 0) {
    console.error(`Push notifications: ${failed}/${results.length} failed`)
  }
}
