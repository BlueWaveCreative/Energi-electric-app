import { describe, it, expect } from 'vitest'
import { render, screen } from '@testing-library/react'
import { TimeReportSummary } from '@/components/reports/time-report-summary'

describe('TimeReportSummary', () => {
  it('displays total hours', () => {
    render(
      <TimeReportSummary
        totalMinutes={480}
        entryCount={3}
        uniqueProjects={2}
        uniqueWorkers={2}
      />
    )
    expect(screen.getByText('8h 0m')).toBeInTheDocument()
    expect(screen.getByText('3')).toBeInTheDocument()
  })

  it('displays zero state', () => {
    render(
      <TimeReportSummary
        totalMinutes={0}
        entryCount={0}
        uniqueProjects={0}
        uniqueWorkers={0}
      />
    )
    expect(screen.getByText('0m')).toBeInTheDocument()
  })
})
