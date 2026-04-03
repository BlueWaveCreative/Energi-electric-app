export const dynamic = 'force-dynamic'

import { notFound, redirect } from 'next/navigation'
import Link from 'next/link'
import { createClient } from '@/lib/supabase/server'
import { PlanCanvas } from '@/components/annotation/plan-canvas'
import { ArrowLeft } from 'lucide-react'

export default async function PlanAnnotationPage({
  params,
}: {
  params: Promise<{ id: string; planId: string }>
}) {
  const { id, planId } = await params
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) redirect('/login')

  const { data: plan } = await supabase
    .from('plans')
    .select('*, annotations(*)')
    .eq('id', planId)
    .single()

  if (!plan) notFound()

  return (
    <div className="h-screen flex flex-col">
      {/* Minimal header */}
      <div className="flex items-center justify-between px-4 py-2 bg-white border-b border-gray-200">
        <div className="flex items-center gap-3">
          <Link
            href={`/projects/${id}/plans`}
            className="p-1 rounded-lg hover:bg-gray-100"
          >
            <ArrowLeft className="w-5 h-5 text-gray-600" />
          </Link>
          <h1 className="font-semibold text-gray-900">{plan.name}</h1>
          <span className="text-xs text-gray-500">v{plan.version}</span>
        </div>
      </div>

      {/* Canvas area */}
      <div className="flex-1 p-3">
        <PlanCanvas
          planId={planId}
          filePath={plan.file_path}
          annotations={plan.annotations ?? []}
          userId={user.id}
        />
      </div>
    </div>
  )
}
