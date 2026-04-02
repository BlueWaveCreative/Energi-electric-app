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
      <a href="#main-content" className="sr-only focus:not-sr-only focus:absolute focus:z-[60] focus:bg-white focus:px-4 focus:py-2 focus:text-[#68BD45] focus:rounded-lg focus:shadow-lg focus:top-2 focus:left-2">
        Skip to content
      </a>
      <Sidebar isAdmin={isAdmin} />
      <main id="main-content" className="flex-1 pb-20 md:pb-0">
        {children}
      </main>
      <BottomNav isAdmin={isAdmin} />
    </div>
  )
}
