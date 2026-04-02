'use client'

import { type ReactNode } from 'react'
import { Sidebar } from './sidebar'
import { BottomNav } from './bottom-nav'

interface NavShellProps {
  isAdmin: boolean
  children: ReactNode
}

export function NavShell({ isAdmin, children }: NavShellProps) {
  return (
    <div className="flex min-h-screen bg-gray-50">
      <Sidebar isAdmin={isAdmin} />
      <main className="flex-1 pb-20 md:pb-0">
        {children}
      </main>
      <BottomNav isAdmin={isAdmin} />
    </div>
  )
}
