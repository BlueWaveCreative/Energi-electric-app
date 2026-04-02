'use client'

import { Download } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { generateCSV, downloadCSV } from '@/lib/csv'
import { formatDate, formatDuration } from '@/lib/utils'

interface CSVExportProps {
  entries: {
    worker_name: string
    project_name: string
    phase_name: string | null
    start_time: string
    duration_minutes: number
    method: string
    notes: string | null
  }[]
}

export function CSVExport({ entries }: CSVExportProps) {
  function handleExport() {
    const headers = ['Date', 'Worker', 'Project', 'Phase', 'Hours', 'Minutes', 'Method', 'Notes']
    const rows = entries.map((e) => [
      formatDate(new Date(e.start_time)),
      e.worker_name,
      e.project_name,
      e.phase_name ?? '',
      String(Math.floor(e.duration_minutes / 60)),
      String(e.duration_minutes % 60),
      e.method,
      e.notes ?? '',
    ])

    const csv = generateCSV(headers, rows)
    const date = new Date().toISOString().split('T')[0]
    downloadCSV(csv, `blue-shores-time-report-${date}.csv`)
  }

  return (
    <Button variant="secondary" size="sm" onClick={handleExport} disabled={entries.length === 0}>
      <Download className="w-4 h-4 mr-1" /> Export CSV
    </Button>
  )
}
