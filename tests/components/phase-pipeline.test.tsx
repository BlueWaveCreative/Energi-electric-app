import { describe, it, expect } from 'vitest'
import { render, screen } from '@testing-library/react'
import { PhasePipeline } from '@/components/projects/phase-pipeline'

describe('PhasePipeline', () => {
  const phases = [
    { id: '1', project_id: 'p1', name: 'Rough-in', status: 'complete' as const, sort_order: 0, description: null, created_at: '' },
    { id: '2', project_id: 'p1', name: 'Trim-out', status: 'in_progress' as const, sort_order: 1, description: null, created_at: '' },
    { id: '3', project_id: 'p1', name: 'Final', status: 'not_started' as const, sort_order: 2, description: null, created_at: '' },
  ]

  it('renders all phases', () => {
    render(<PhasePipeline phases={phases} />)
    expect(screen.getByText('Rough-in')).toBeInTheDocument()
    expect(screen.getByText('Trim-out')).toBeInTheDocument()
    expect(screen.getByText('Final')).toBeInTheDocument()
  })
})
