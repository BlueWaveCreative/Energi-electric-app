import { NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import { sendPushToAdmins } from '@/lib/push'

const VALID_TYPES = ['clock_events', 'phase_complete', 'new_photo'] as const
type NotificationType = (typeof VALID_TYPES)[number]

export async function POST(request: Request) {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

  const body = await request.json()
  const { type, title, body: messageBody } = body as {
    type: string
    title: string
    body: string
  }

  if (!type || !title || !messageBody) {
    return NextResponse.json({ error: 'Missing type, title, or body' }, { status: 400 })
  }

  if (!VALID_TYPES.includes(type as NotificationType)) {
    return NextResponse.json({ error: 'Invalid notification type' }, { status: 400 })
  }

  try {
    await sendPushToAdmins(supabase, type as NotificationType, title, messageBody)
    return NextResponse.json({ sent: true })
  } catch (err) {
    console.error('Failed to send push notifications:', err)
    return NextResponse.json({ error: 'Failed to send notifications' }, { status: 500 })
  }
}
