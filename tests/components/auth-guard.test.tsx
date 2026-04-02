import { describe, it, expect } from 'vitest'
import { render, screen } from '@testing-library/react'
import { AuthGuard } from '@/components/auth/auth-guard'

describe('AuthGuard', () => {
  it('renders children when role matches', () => {
    render(
      <AuthGuard userRole="admin" allowedRoles={['admin']}>
        <div>Admin Content</div>
      </AuthGuard>
    )
    expect(screen.getByText('Admin Content')).toBeInTheDocument()
  })

  it('renders nothing when role does not match', () => {
    render(
      <AuthGuard userRole="field_worker" allowedRoles={['admin']}>
        <div>Admin Content</div>
      </AuthGuard>
    )
    expect(screen.queryByText('Admin Content')).not.toBeInTheDocument()
  })

  it('renders fallback when role does not match', () => {
    render(
      <AuthGuard
        userRole="field_worker"
        allowedRoles={['admin']}
        fallback={<div>No Access</div>}
      >
        <div>Admin Content</div>
      </AuthGuard>
    )
    expect(screen.getByText('No Access')).toBeInTheDocument()
    expect(screen.queryByText('Admin Content')).not.toBeInTheDocument()
  })

  it('allows multiple roles', () => {
    render(
      <AuthGuard userRole="field_worker" allowedRoles={['admin', 'field_worker']}>
        <div>Shared Content</div>
      </AuthGuard>
    )
    expect(screen.getByText('Shared Content')).toBeInTheDocument()
  })
})
