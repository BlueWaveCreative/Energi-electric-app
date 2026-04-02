import { Suspense } from 'react'
import { redirect } from 'next/navigation'
import { createClient } from '@/lib/supabase/server'
import { PageHeader } from '@/components/layout/page-header'
import { TimeReportFilters } from '@/components/reports/time-report-filters'
import { TimeReportSummary } from '@/components/reports/time-report-summary'
import { TimeReportTable } from '@/components/reports/time-report-table'
import { CSVExport } from '@/components/reports/csv-export'

export default async function ReportsPage({
  searchParams,
}: {
  searchParams: Promise<{ start?: string; end?: string; project?: string; worker?: string }>
}) {
  const params = await searchParams
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) redirect('/login')

  const { data: profile } = await supabase
    .from('profiles')
    .select('role')
    .eq('id', user.id)
    .single()

  if (profile?.role !== 'admin') redirect('/dashboard')

  // Fetch filter options
  const [projectsResult, workersResult] = await Promise.all([
    supabase.from('projects').select('id, name').order('name'),
    supabase.from('profiles').select('id, name').eq('status', 'active').order('name'),
  ])

  // Build query with filters
  let query = supabase
    .from('time_entries')
    .select('*, profiles(name), projects(name), phases(name)')
    .order('start_time', { ascending: false })

  if (params.start) {
    query = query.gte('start_time', `${params.start}T00:00:00`)
  }
  if (params.end) {
    query = query.lte('start_time', `${params.end}T23:59:59`)
  }
  if (params.project) {
    query = query.eq('project_id', params.project)
  }
  if (params.worker) {
    query = query.eq('user_id', params.worker)
  }

  const { data: entries } = await query

  // Transform for display
  const displayEntries = (entries ?? []).map((e) => ({
    id: e.id,
    worker_name: (e.profiles as any)?.name ?? 'Unknown',
    project_name: (e.projects as any)?.name ?? 'Unknown',
    phase_name: (e.phases as any)?.name ?? null,
    start_time: e.start_time,
    duration_minutes: e.duration_minutes ?? 0,
    method: e.method as 'clock' | 'manual',
    admin_edited: e.admin_edited,
    notes: e.notes,
  }))

  // Calculate summary stats
  const totalMinutes = displayEntries.reduce((sum, e) => sum + e.duration_minutes, 0)
  const uniqueProjects = new Set(entries?.map((e) => e.project_id)).size
  const uniqueWorkers = new Set(entries?.map((e) => e.user_id)).size

  return (
    <div>
      <PageHeader
        title="Time Reports"
        actions={<CSVExport entries={displayEntries} />}
      />

      <div className="p-4 md:p-6 space-y-6">
        <Suspense fallback={<div className="bg-white border border-gray-200 rounded-lg p-4 h-24 animate-pulse" />}>
          <TimeReportFilters
            projects={(projectsResult.data ?? []).map((p) => ({ id: p.id, name: p.name }))}
            workers={(workersResult.data ?? []).map((w) => ({ id: w.id, name: w.name }))}
          />
        </Suspense>

        <TimeReportSummary
          totalMinutes={totalMinutes}
          entryCount={displayEntries.length}
          uniqueProjects={uniqueProjects}
          uniqueWorkers={uniqueWorkers}
        />

        <TimeReportTable entries={displayEntries} />
      </div>
    </div>
  )
}
