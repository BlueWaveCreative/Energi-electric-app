import { type SupabaseClient } from '@supabase/supabase-js'

let vapidConfigured = false

function getWebPush() {
  // eslint-disable-next-line @typescript-eslint/no-require-imports
  const webpush = require('web-push')
  if (!vapidConfigured && process.env.VAPID_EMAIL && process.env.VAPID_PRIVATE_KEY) {
    webpush.setVapidDetails(
      `mailto:${process.env.VAPID_EMAIL}`,
      process.env.NEXT_PUBLIC_VAPID_PUBLIC_KEY!,
      process.env.VAPID_PRIVATE_KEY!
    )
    vapidConfigured = true
  }
  return webpush
}

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

  const webpush = getWebPush()
  const payload = JSON.stringify({ title, body })

  const results = await Promise.allSettled(
    prefs.map((pref) =>
      webpush.sendNotification(
        pref.push_subscription as any,
        payload
      )
    )
  )

  const failed = results.filter((r) => r.status === 'rejected').length
  if (failed > 0) {
    console.error(`Push notifications: ${failed}/${results.length} failed`)
  }
}
