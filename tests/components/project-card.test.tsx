import { describe, it, expect } from 'vitest'
import { render, screen } from '@testing-library/react'
import { ProjectCard } from '@/components/projects/project-card'

describe('ProjectCard', () => {
  const project = {
    id: '1',
    name: 'Smith Residence',
    address: '123 Main St',
    status: 'active' as const,
    template_id: null,
    customer_id: null,
    created_by: 'user-1',
    created_at: '2026-04-01T00:00:00Z',
  }

  it('renders project name and address', () => {
    render(<ProjectCard project={project} phaseCount={4} completedPhases={1} />)
    expect(screen.getByText('Smith Residence')).toBeInTheDocument()
    expect(screen.getByText('123 Main St')).toBeInTheDocument()
  })

  it('shows phase progress', () => {
    render(<ProjectCard project={project} phaseCount={4} completedPhases={2} />)
    expect(screen.getByText('2/4 phases')).toBeInTheDocument()
  })

  it('shows active badge', () => {
    render(<ProjectCard project={project} phaseCount={4} completedPhases={0} />)
    expect(screen.getByText('Active')).toBeInTheDocument()
  })
})
