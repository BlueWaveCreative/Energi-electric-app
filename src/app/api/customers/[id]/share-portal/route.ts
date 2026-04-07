import { NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import { sendPortalShareEmail } from '@/lib/resend'

export async function POST(
  _request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id } = await params
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const { data: profile } = await supabase.from('profiles').select('role').eq('id', user.id).single()
  if (profile?.role !== 'admin') return NextResponse.json({ error: 'Forbidden' }, { status: 403 })

  const { data: customer } = await supabase
    .from('customers')
    .select('name, email, portal_token, portal_active')
    .eq('id', id)
    .single()

  if (!customer) return NextResponse.json({ error: 'Not found' }, { status: 404 })
  if (!customer.email) return NextResponse.json({ error: 'Customer has no email on file' }, { status: 400 })
  if (!customer.portal_active) return NextResponse.json({ error: 'Portal is not active for this customer' }, { status: 400 })

  await sendPortalShareEmail({
    to: customer.email,
    customerName: customer.name,
    portalToken: customer.portal_token,
  })

  return NextResponse.json({ success: true })
}
