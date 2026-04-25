export const dynamic = 'force-dynamic'

import { redirect } from 'next/navigation'
import { createClient } from '@/lib/supabase/server'
import { PageHeader } from '@/components/layout/page-header'
import { MaterialsClient } from './client'
import type { Material, MaterialCategory } from '@/lib/types/database'

export default async function MaterialsPage() {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) redirect('/login')

  const { data: profile } = await supabase
    .from('profiles')
    .select('role')
    .eq('id', user.id)
    .single()

  if (profile?.role !== 'admin') redirect('/dashboard')

  const [{ data: categories }, { data: materials }] = await Promise.all([
    supabase
      .from('material_categories')
      .select('*')
      .order('sort_order', { ascending: true }),
    supabase
      .from('materials')
      .select('*')
      .eq('active', true)
      .order('sort_order', { ascending: true }),
  ])

  return (
    <div>
      <PageHeader title="Materials" />
      <div className="p-4 md:p-6">
        <MaterialsClient
          categories={(categories ?? []) as MaterialCategory[]}
          materials={(materials ?? []) as Material[]}
        />
      </div>
    </div>
  )
}
