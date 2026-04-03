export const dynamic = 'force-dynamic'

import { notFound, redirect } from 'next/navigation'
import Link from 'next/link'
import { createClient } from '@/lib/supabase/server'
import { PageHeader } from '@/components/layout/page-header'
import { PlanUpload } from '@/components/annotation/plan-upload'
import { Card } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { FileImage, ArrowLeft } from 'lucide-react'
import { formatDate } from '@/lib/utils'

export default async function PlansPage({
  params,
}: {
  params: Promise<{ id: string }>
}) {
  const { id } = await params
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) redirect('/login')

  const { data: project } = await supabase
    .from('projects')
    .select('id, name')
    .eq('id', id)
    .single()

  if (!project) notFound()

  const { data: profile } = await supabase
    .from('profiles')
    .select('role')
    .eq('id', user.id)
    .single()

  const isAdmin = profile?.role === 'admin'

  const { data: plans } = await supabase
    .from('plans')
    .select('*, annotations(id)')
    .eq('project_id', id)
    .order('created_at', { ascending: false })

  return (
    <div>
      <PageHeader
        title="Plans"
        actions={
          <Link
            href={`/projects/${id}`}
            className="flex items-center gap-1 text-sm text-gray-500 hover:text-gray-700"
          >
            <ArrowLeft className="w-4 h-4" /> Back to project
          </Link>
        }
      />

      <div className="p-4 md:p-6 space-y-6">
        {/* Upload (admin only) */}
        {isAdmin && <PlanUpload projectId={id} userId={user.id} />}

        {/* Plans list */}
        <div className="space-y-3">
          {!plans?.length ? (
            <div className="text-center py-8">
              <FileImage className="w-12 h-12 text-gray-500 mx-auto mb-3" />
              <p className="text-gray-500">No plans uploaded yet</p>
            </div>
          ) : (
            plans.map((plan) => (
              <Link key={plan.id} href={`/projects/${id}/plans/${plan.id}`}>
                <Card hoverable className="mb-3">
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-3">
                      <FileImage className="w-8 h-8 text-[#68BD45]" />
                      <div>
                        <h3 className="font-medium text-gray-900">{plan.name}</h3>
                        <p className="text-xs text-gray-500">
                          v{plan.version} — {formatDate(new Date(plan.created_at))}
                        </p>
                      </div>
                    </div>
                    <Badge variant="default">
                      {plan.annotations?.length ?? 0} annotations
                    </Badge>
                  </div>
                </Card>
              </Link>
            ))
          )}
        </div>
      </div>
    </div>
  )
}
