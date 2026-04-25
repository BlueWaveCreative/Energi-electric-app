import { createClient } from '@/lib/supabase/server'
import { TodayClient, type ScheduleItem, type CompletedJob } from '@/components/dashboard/today-client'

const PROJECT_COLORS = [
  '#045815', '#3B82F6', '#F59E0B', '#EF4444',
  '#8B5CF6', '#EC4899', '#14B8A6', '#F97316',
]

interface TodayViewProps {
  userId: string
  userName: string
}

export async function TodayView({ userId, userName }: TodayViewProps) {
  const supabase = await createClient()
  const today = new Date().toISOString().split('T')[0]

  // Parallel queries
  const [scheduleResult, timeResult, projectsResult] = await Promise.all([
    // 1. Today's schedule entries with project info
    supabase
      .from('schedule_entries')
      .select('id, project_id, date, projects(id, name, address, status)')
      .eq('user_id', userId)
      .eq('date', today),

    // 2. Today's time entries (for daily total + completed jobs)
    supabase
      .from('time_entries')
      .select('id, project_id, phase_id, duration_minutes, phases(id, name)')
      .eq('user_id', userId)
      .gte('start_time', `${today}T00:00:00`)
      .lte('start_time', `${today}T23:59:59`),

    // 3. All active projects (for color mapping consistency with schedule board)
    supabase
      .from('projects')
      .select('id, name')
      .eq('status', 'active')
      .order('name'),
  ])

  const scheduleEntries = scheduleResult.data ?? []
  const timeEntries = timeResult.data ?? []
  const allProjects = projectsResult.data ?? []

  // Build project color map (same order as schedule board)
  const projectColorMap = new Map<string, string>()
  allProjects.forEach((p, i) => {
    projectColorMap.set(p.id, PROJECT_COLORS[i % PROJECT_COLORS.length])
  })

  // Calculate daily total
  const totalMinutes = timeEntries.reduce(
    (sum, e) => sum + (e.duration_minutes ?? 0), 0
  )

  // Identify completed jobs (have time entries today, grouped by project+phase)
  const completedJobMap = new Map<string, CompletedJob>()
  for (const entry of timeEntries) {
    const key = `${entry.project_id}|${entry.phase_id}`
    const existing = completedJobMap.get(key)
    const projectInfo = allProjects.find((p) => p.id === entry.project_id)
    const phaseName = (entry.phases as any)?.name ?? 'Unknown'

    if (existing) {
      existing.durationMinutes += entry.duration_minutes ?? 0
    } else {
      completedJobMap.set(key, {
        projectId: entry.project_id,
        phaseId: entry.phase_id ?? '',
        projectName: projectInfo?.name ?? 'Unknown',
        phaseName,
        durationMinutes: entry.duration_minutes ?? 0,
      })
    }
  }

  // Get all phases and tasks for scheduled projects in bulk (avoid N+1)
  const scheduledProjectIds = scheduleEntries
    .map((e) => (e.projects as any)?.id)
    .filter(Boolean) as string[]

  const [allPhasesRes, allTasksRes] = scheduledProjectIds.length > 0
    ? await Promise.all([
        supabase
          .from('phases')
          .select('id, name, status, sort_order, project_id')
          .in('project_id', scheduledProjectIds)
          .order('sort_order'),
        supabase
          .from('tasks')
          .select('*')
          .order('created_at'),
      ])
    : [{ data: [] }, { data: [] }]

  const phasesByProject = new Map<string, any[]>()
  for (const phase of allPhasesRes.data ?? []) {
    const existing = phasesByProject.get(phase.project_id) ?? []
    existing.push(phase)
    phasesByProject.set(phase.project_id, existing)
  }

  // Get all phase IDs to fetch tasks
  const allPhaseIds = (allPhasesRes.data ?? []).map((p) => p.id)

  // If we got tasks in bulk, filter. Otherwise the allTasksRes above didn't filter by phase.
  // Let's re-query tasks scoped to these phase IDs
  let tasksByPhase = new Map<string, any[]>()
  if (allPhaseIds.length > 0) {
    const { data: tasksData } = await supabase
      .from('tasks')
      .select('*')
      .in('phase_id', allPhaseIds)
      .order('created_at')

    for (const task of tasksData ?? []) {
      const existing = tasksByPhase.get(task.phase_id) ?? []
      existing.push(task)
      tasksByPhase.set(task.phase_id, existing)
    }
  }

  // Build schedule items
  const scheduleItems: ScheduleItem[] = []
  for (const entry of scheduleEntries) {
    const project = entry.projects as any
    if (!project || project.status !== 'active') continue

    const phases = phasesByProject.get(project.id) ?? []
    const activePhase = phases.find((p) => p.status !== 'complete')

    // Skip if all phases complete AND we have time logged (it's a completed job)
    if (!activePhase) {
      const hasTimeToday = timeEntries.some((t) => t.project_id === project.id)
      if (hasTimeToday) continue
    }

    const phaseTasks = activePhase ? (tasksByPhase.get(activePhase.id) ?? []) : []

    scheduleItems.push({
      scheduleEntryId: entry.id,
      project: {
        id: project.id,
        name: project.name,
        address: project.address,
      },
      activePhase: activePhase
        ? { id: activePhase.id, name: activePhase.name }
        : null,
      tasks: phaseTasks,
      projectColor: projectColorMap.get(project.id) ?? '#9CA3AF',
    })
  }

  // Filter completedJobs to only those NOT still in schedule (avoid dupes)
  const activeProjectPhaseKeys = new Set(
    scheduleItems
      .filter((s) => s.activePhase)
      .map((s) => `${s.project.id}|${s.activePhase!.id}`)
  )
  const completedJobs = Array.from(completedJobMap.values()).filter(
    (j) => !activeProjectPhaseKeys.has(`${j.projectId}|${j.phaseId}`)
  )

  return (
    <TodayClient
      user={{ id: userId, name: userName }}
      schedule={scheduleItems}
      totalMinutes={totalMinutes}
      completedJobs={completedJobs}
    />
  )
}
