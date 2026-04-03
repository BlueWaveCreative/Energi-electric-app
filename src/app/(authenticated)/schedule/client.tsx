'use client'

import { useState, useRef, useEffect, useCallback } from 'react'
import { createClient } from '@/lib/supabase/client'
import { cn } from '@/lib/utils'

interface CrewMember {
  id: string
  name: string
}

interface ProjectOption {
  id: string
  name: string
}

interface ScheduleEntryData {
  id: string
  user_id: string
  project_id: string
  date: string
  notes: string | null
  created_by: string
  created_at: string
  project_name: string
}

interface ScheduleBoardProps {
  crew: CrewMember[]
  projects: ProjectOption[]
  initialEntries: ScheduleEntryData[]
  rangeStart: string
  isAdmin: boolean
  currentUserId: string
}

const PROJECT_COLORS = [
  '#68BD45', // brand green
  '#3B82F6', // blue
  '#F59E0B', // amber
  '#EF4444', // red
  '#8B5CF6', // violet
  '#EC4899', // pink
  '#14B8A6', // teal
  '#F97316', // orange
]

const DAY_LABELS = ['Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat', 'Sun']

function getDays(rangeStart: string): string[] {
  const days: string[] = []
  const start = new Date(rangeStart + 'T00:00:00')
  for (let i = 0; i < 14; i++) {
    const d = new Date(start)
    d.setDate(start.getDate() + i)
    days.push(d.toISOString().split('T')[0])
  }
  return days
}

function formatDayHeader(dateStr: string): string {
  const d = new Date(dateStr + 'T00:00:00')
  const dayIndex = (d.getDay() + 6) % 7
  const month = d.getMonth() + 1
  const day = d.getDate()
  return `${DAY_LABELS[dayIndex]} ${month}/${day}`
}

function formatWeekHeader(weekStart: string, weekEnd: string): string {
  const s = new Date(weekStart + 'T00:00:00')
  const e = new Date(weekEnd + 'T00:00:00')
  const sMonth = s.toLocaleString('en-US', { month: 'short' })
  const eMonth = e.toLocaleString('en-US', { month: 'short' })
  const sDay = s.getDate()
  const eDay = e.getDate()
  if (sMonth === eMonth) {
    return `${sMonth} ${sDay}-${eDay}`
  }
  return `${sMonth} ${sDay} - ${eMonth} ${eDay}`
}

function getTodayStr(): string {
  const now = new Date()
  return now.toISOString().split('T')[0]
}

function isWeekend(dateStr: string): boolean {
  const d = new Date(dateStr + 'T00:00:00')
  const day = d.getDay()
  return day === 0 || day === 6
}

export function ScheduleBoard({ crew, projects, initialEntries, rangeStart, isAdmin, currentUserId }: ScheduleBoardProps) {
  const [entries, setEntries] = useState<ScheduleEntryData[]>(initialEntries)
  const [activeCell, setActiveCell] = useState<{ userId: string; date: string } | null>(null)
  const [saving, setSaving] = useState(false)
  const popoverRef = useRef<HTMLDivElement>(null)

  const days = getDays(rangeStart)
  const today = getTodayStr()
  const week1Days = days.slice(0, 7)
  const week2Days = days.slice(7, 14)

  // Build project color map
  const projectColorMap = new Map<string, string>()
  projects.forEach((p, i) => {
    projectColorMap.set(p.id, PROJECT_COLORS[i % PROJECT_COLORS.length])
  })

  // Build entry lookup: "userId|date" -> entry
  const entryMap = new Map<string, ScheduleEntryData>()
  for (const e of entries) {
    entryMap.set(`${e.user_id}|${e.date}`, e)
  }

  const getEntry = (userId: string, date: string) => entryMap.get(`${userId}|${date}`)

  // Close popover on click outside
  useEffect(() => {
    function handleClickOutside(e: MouseEvent) {
      if (popoverRef.current && !popoverRef.current.contains(e.target as Node)) {
        setActiveCell(null)
      }
    }
    if (activeCell) {
      document.addEventListener('mousedown', handleClickOutside)
      return () => document.removeEventListener('mousedown', handleClickOutside)
    }
  }, [activeCell])

  const handleAssign = useCallback(async (userId: string, date: string, projectId: string) => {
    setSaving(true)
    const supabase = createClient()
    const { data: { user } } = await supabase.auth.getUser()
    if (!user) { setSaving(false); return }

    const existing = entryMap.get(`${userId}|${date}`)
    const projectName = projects.find((p) => p.id === projectId)?.name ?? 'Unknown'

    if (existing) {
      const { error } = await supabase
        .from('schedule_entries')
        .update({ project_id: projectId })
        .eq('id', existing.id)

      if (!error) {
        setEntries((prev) =>
          prev.map((e) =>
            e.id === existing.id
              ? { ...e, project_id: projectId, project_name: projectName }
              : e
          )
        )
      }
    } else {
      const { data, error } = await supabase
        .from('schedule_entries')
        .insert({
          user_id: userId,
          project_id: projectId,
          date,
          created_by: user.id,
        })
        .select('id, user_id, project_id, date, notes, created_by, created_at')
        .single()

      if (!error && data) {
        setEntries((prev) => [
          ...prev,
          { ...data, project_name: projectName },
        ])
      }
    }

    setActiveCell(null)
    setSaving(false)
  }, [entries, projects]) // eslint-disable-line react-hooks/exhaustive-deps

  const handleClear = useCallback(async (userId: string, date: string) => {
    const existing = entryMap.get(`${userId}|${date}`)
    if (!existing) return

    setSaving(true)
    const supabase = createClient()
    const { error } = await supabase
      .from('schedule_entries')
      .delete()
      .eq('id', existing.id)

    if (!error) {
      setEntries((prev) => prev.filter((e) => e.id !== existing.id))
    }
    setActiveCell(null)
    setSaving(false)
  }, [entries]) // eslint-disable-line react-hooks/exhaustive-deps

  const renderCell = (userId: string, date: string, extraClassName?: string) => {
    const entry = getEntry(userId, date)
    const isToday = date === today
    const weekend = isWeekend(date)
    const canEdit = isAdmin || userId === currentUserId
    const isActive = canEdit && activeCell?.userId === userId && activeCell?.date === date
    const color = entry ? projectColorMap.get(entry.project_id) ?? '#9CA3AF' : undefined

    return (
      <td
        key={date}
        className={cn(
          'relative px-1 py-1 border-t border-gray-100 text-center min-w-[90px]',
          isToday && 'bg-[#68BD45]/5',
          weekend && 'bg-gray-50/50',
          extraClassName
        )}
      >
        <button
          type="button"
          onClick={() => canEdit && setActiveCell(isActive ? null : { userId, date })}
          disabled={saving || !canEdit}
          className={cn(
            'w-full rounded-md px-1.5 py-1 text-xs font-medium transition-colors min-h-[32px] focus:outline-none focus:ring-2 focus:ring-[#68BD45]/50',
            entry
              ? 'bg-gray-50 hover:bg-gray-100 text-gray-700'
              : 'hover:bg-gray-50 text-gray-500 hover:text-gray-600 group'
          )}
          aria-label={
            entry
              ? `${entry.project_name} assigned to crew on ${date}. Click to change.`
              : `Assign project for ${date}. Click to select.`
          }
        >
          {entry ? (
            <span className="flex items-center justify-center gap-1">
              <span
                className="inline-block w-2 h-2 rounded-full flex-shrink-0"
                style={{ backgroundColor: color }}
                aria-hidden="true"
              />
              <span className="truncate max-w-[70px]">{entry.project_name}</span>
            </span>
          ) : (
            <span className="opacity-0 group-hover:opacity-100 transition-opacity" aria-hidden="true">+</span>
          )}
        </button>

        {isActive && (
          <div
            ref={popoverRef}
            className="absolute z-20 top-full left-1/2 -translate-x-1/2 mt-1 w-52 bg-white rounded-lg border border-gray-200 shadow-lg py-1 max-h-64 overflow-y-auto"
            role="listbox"
            aria-label="Select a project"
          >
            {entry && (
              <button
                type="button"
                onClick={() => handleClear(userId, date)}
                className="w-full text-left px-3 py-2 text-xs text-red-600 hover:bg-red-50 transition-colors font-medium"
                role="option"
                aria-selected={false}
              >
                Clear assignment
              </button>
            )}
            {projects.map((p) => {
              const pColor = projectColorMap.get(p.id) ?? '#9CA3AF'
              const isSelected = entry?.project_id === p.id
              return (
                <button
                  key={p.id}
                  type="button"
                  onClick={() => handleAssign(userId, date, p.id)}
                  className={cn(
                    'w-full text-left px-3 py-2 text-xs hover:bg-gray-50 transition-colors flex items-center gap-2',
                    isSelected && 'bg-[#68BD45]/5 font-medium'
                  )}
                  role="option"
                  aria-selected={isSelected}
                >
                  <span
                    className="inline-block w-2.5 h-2.5 rounded-full flex-shrink-0"
                    style={{ backgroundColor: pColor }}
                    aria-hidden="true"
                  />
                  <span className="text-gray-700">{p.name}</span>
                </button>
              )
            })}
            {projects.length === 0 && (
              <p className="px-3 py-2 text-xs text-gray-500">No active projects</p>
            )}
          </div>
        )}
      </td>
    )
  }

  // Color legend for active projects that have at least one entry
  const usedProjectIds = new Set(entries.map((e) => e.project_id))
  const legendProjects = projects.filter((p) => usedProjectIds.has(p.id))

  return (
    <div className="space-y-4">
      {legendProjects.length > 0 && (
        <div className="flex flex-wrap gap-3 text-xs text-gray-600">
          {legendProjects.map((p) => (
            <span key={p.id} className="flex items-center gap-1.5">
              <span
                className="inline-block w-2.5 h-2.5 rounded-full"
                style={{ backgroundColor: projectColorMap.get(p.id) }}
                aria-hidden="true"
              />
              {p.name}
            </span>
          ))}
        </div>
      )}

      <div className="bg-white rounded-lg border border-gray-200 shadow-sm overflow-x-auto">
        <table className="w-full border-collapse">
          <thead>
            <tr>
              <th
                className="sticky left-0 z-10 bg-white px-3 py-2 text-left text-xs font-semibold text-gray-500 uppercase tracking-wide border-b border-gray-200 min-w-[140px]"
                rowSpan={2}
              >
                Crew
              </th>
              <th
                className="text-center text-xs font-semibold text-gray-700 px-2 py-1.5 border-b border-gray-200"
                colSpan={7}
              >
                {formatWeekHeader(week1Days[0], week1Days[6])}
              </th>
              <th
                className="text-center text-xs font-semibold text-gray-700 px-2 py-1.5 border-b border-gray-200 border-l border-gray-200"
                colSpan={7}
              >
                {formatWeekHeader(week2Days[0], week2Days[6])}
              </th>
            </tr>
            <tr className="border-b border-gray-200">
              {week1Days.map((date) => (
                <th
                  key={date}
                  className={cn(
                    'px-1 py-2 text-xs font-medium text-center whitespace-nowrap min-w-[90px]',
                    date === today && 'bg-[#68BD45]/5',
                    isWeekend(date) ? 'text-gray-500' : 'text-gray-600'
                  )}
                >
                  {formatDayHeader(date)}
                </th>
              ))}
              {week2Days.map((date, i) => (
                <th
                  key={date}
                  className={cn(
                    'px-1 py-2 text-xs font-medium text-center whitespace-nowrap min-w-[90px]',
                    i === 0 && 'border-l border-gray-200',
                    date === today && 'bg-[#68BD45]/5',
                    isWeekend(date) ? 'text-gray-500' : 'text-gray-600'
                  )}
                >
                  {formatDayHeader(date)}
                </th>
              ))}
            </tr>
          </thead>
          <tbody>
            {crew.map((member) => (
              <tr key={member.id} className="hover:bg-gray-50/50">
                <td className="sticky left-0 z-10 bg-white px-3 py-2 text-sm font-medium text-gray-700 whitespace-nowrap border-r border-gray-100 min-w-[140px]">
                  {member.name}
                </td>
                {week1Days.map((date) => renderCell(member.id, date))}
                {week2Days.map((date, i) =>
                  renderCell(member.id, date, i === 0 ? 'border-l border-gray-200' : undefined)
                )}
              </tr>
            ))}
            {crew.length === 0 && (
              <tr>
                <td colSpan={15} className="px-4 py-8 text-center text-sm text-gray-500">
                  No active crew members found.
                </td>
              </tr>
            )}
          </tbody>
        </table>
      </div>
    </div>
  )
}
