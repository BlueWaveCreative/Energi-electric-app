'use client'

import { type ReactNode } from 'react'
import { type UserRole } from '@/lib/types/database'

interface AuthGuardProps {
  userRole: UserRole | null
  allowedRoles: UserRole[]
  children: ReactNode
  fallback?: ReactNode
}

export function AuthGuard({
  userRole,
  allowedRoles,
  children,
  fallback = null,
}: AuthGuardProps) {
  if (!userRole || !allowedRoles.includes(userRole)) {
    return <>{fallback}</>
  }
  return <>{children}</>
}
