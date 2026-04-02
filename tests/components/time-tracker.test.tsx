import { describe, it, expect, vi } from 'vitest'
import { render, screen, fireEvent } from '@testing-library/react'
import { TimeTracker } from '@/components/field/time-tracker'

describe('TimeTracker', () => {
  it('shows Clock In button when not running', () => {
    render(
      <TimeTracker
        projectId="p1"
        isRunning={false}
        elapsed={0}
        activeProjectId={null}
        onClockIn={vi.fn()}
        onClockOut={vi.fn()}
      />
    )
    expect(screen.getByText('Clock In')).toBeInTheDocument()
  })

  it('shows Clock Out button and timer when running on this project', () => {
    render(
      <TimeTracker
        projectId="p1"
        isRunning={true}
        elapsed={3661}
        activeProjectId="p1"
        onClockIn={vi.fn()}
        onClockOut={vi.fn()}
      />
    )
    expect(screen.getByText('Clock Out')).toBeInTheDocument()
    expect(screen.getByText('1:01:01')).toBeInTheDocument()
  })

  it('shows disabled state when running on different project', () => {
    render(
      <TimeTracker
        projectId="p1"
        isRunning={true}
        elapsed={100}
        activeProjectId="p2"
        onClockIn={vi.fn()}
        onClockOut={vi.fn()}
      />
    )
    expect(screen.getByText(/Clocked in on another project/)).toBeInTheDocument()
  })

  it('calls onClockIn when Clock In clicked', () => {
    const onClockIn = vi.fn()
    render(
      <TimeTracker
        projectId="p1"
        isRunning={false}
        elapsed={0}
        activeProjectId={null}
        onClockIn={onClockIn}
        onClockOut={vi.fn()}
      />
    )
    fireEvent.click(screen.getByText('Clock In'))
    expect(onClockIn).toHaveBeenCalled()
  })
})
