import { redirect } from 'next/navigation'
import { createClient } from '@/lib/supabase/server'
import { NavShell } from '@/components/layout/nav-shell'
import type { UserRole } from '@/lib/types/database'

export default async function AuthenticatedLayout({
  children,
}: {
  children: React.ReactNode
}) {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()

  if (!user) {
    redirect('/login')
  }

  const { data: profile } = await supabase
    .from('profiles')
    .select('role')
    .eq('id', user.id)
    .single()

  const isAdmin = (profile?.role as UserRole) === 'admin'

  return <NavShell isAdmin={isAdmin}>{children}</NavShell>
}
