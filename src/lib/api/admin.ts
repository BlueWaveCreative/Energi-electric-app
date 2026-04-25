import { NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import type { SupabaseClient } from '@supabase/supabase-js'

type RequireAdminOk = {
  supabase: SupabaseClient
  userId: string
}

type RequireAdminFail = { error: NextResponse }

/**
 * Server-side admin gate for API route handlers.
 * Defense in depth — RLS already restricts admin tables, but the route
 * shouldn't trust the request to make it to the DB layer.
 */
export async function requireAdmin(): Promise<RequireAdminOk | RequireAdminFail> {
  const supabase = await createClient()
  const {
    data: { user },
  } = await supabase.auth.getUser()
  if (!user) {
    return { error: NextResponse.json({ error: 'Unauthorized' }, { status: 401 }) }
  }
  const { data: profile } = await supabase
    .from('profiles')
    .select('role')
    .eq('id', user.id)
    .single()
  if (profile?.role !== 'admin') {
    return { error: NextResponse.json({ error: 'Forbidden' }, { status: 403 }) }
  }
  return { supabase, userId: user.id }
}
