'use client'

import { useRouter, useSearchParams } from 'next/navigation'
import { Input } from '@/components/ui/input'
import { Button } from '@/components/ui/button'

interface FilterOption {
  id: string
  name: string
}

interface TimeReportFiltersProps {
  projects: FilterOption[]
  workers: FilterOption[]
}

export function TimeReportFilters({ projects, workers }: TimeReportFiltersProps) {
  const router = useRouter()
  const searchParams = useSearchParams()

  const currentStartDate = searchParams.get('start') ?? ''
  const currentEndDate = searchParams.get('end') ?? ''
  const currentProject = searchParams.get('project') ?? ''
  const currentWorker = searchParams.get('worker') ?? ''

  function updateFilter(key: string, value: string) {
    const params = new URLSearchParams(searchParams.toString())
    if (value) {
      params.set(key, value)
    } else {
      params.delete(key)
    }
    router.push(`/reports?${params.toString()}`)
  }

  function clearFilters() {
    router.push('/reports')
  }

  const hasFilters = currentStartDate || currentEndDate || currentProject || currentWorker

  return (
    <div className="bg-white border border-gray-200 rounded-lg p-4">
      <div className="grid grid-cols-1 md:grid-cols-4 gap-3">
        <Input
          id="start-date"
          label="From"
          type="date"
          value={currentStartDate}
          onChange={(e) => updateFilter('start', e.target.value)}
        />
        <Input
          id="end-date"
          label="To"
          type="date"
          value={currentEndDate}
          onChange={(e) => updateFilter('end', e.target.value)}
        />

        <div>
          <label htmlFor="project-filter" className="block text-sm font-medium text-gray-700 mb-1">
            Project
          </label>
          <select
            id="project-filter"
            value={currentProject}
            onChange={(e) => updateFilter('project', e.target.value)}
            className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-[#68BD45] focus:border-transparent text-sm"
          >
            <option value="">All Projects</option>
            {projects.map((p) => (
              <option key={p.id} value={p.id}>{p.name}</option>
            ))}
          </select>
        </div>

        <div>
          <label htmlFor="worker-filter" className="block text-sm font-medium text-gray-700 mb-1">
            Worker
          </label>
          <select
            id="worker-filter"
            value={currentWorker}
            onChange={(e) => updateFilter('worker', e.target.value)}
            className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-[#68BD45] focus:border-transparent text-sm"
          >
            <option value="">All Workers</option>
            {workers.map((w) => (
              <option key={w.id} value={w.id}>{w.name}</option>
            ))}
          </select>
        </div>
      </div>

      {hasFilters && (
        <div className="mt-3 flex justify-end">
          <Button variant="ghost" size="sm" onClick={clearFilters}>
            Clear Filters
          </Button>
        </div>
      )}
    </div>
  )
}
