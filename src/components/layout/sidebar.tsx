'use client'

import Link from 'next/link'
import { usePathname } from 'next/navigation'
import { LayoutDashboard, FolderOpen, FileStack, Settings, Clock } from 'lucide-react'
import { cn } from '@/lib/utils'

interface SidebarProps {
  isAdmin: boolean
}

const navItems = [
  { href: '/dashboard', label: 'Dashboard', icon: LayoutDashboard, adminOnly: false },
  { href: '/projects', label: 'Projects', icon: FolderOpen, adminOnly: false },
  { href: '/my-time', label: 'My Time', icon: Clock, adminOnly: false },
  { href: '/templates', label: 'Templates', icon: FileStack, adminOnly: true },
  { href: '/settings', label: 'Settings', icon: Settings, adminOnly: true },
]

export function Sidebar({ isAdmin }: SidebarProps) {
  const pathname = usePathname()

  const visibleItems = navItems.filter(
    (item) => !item.adminOnly || isAdmin
  )

  return (
    <aside className="hidden md:flex md:flex-col md:w-64 bg-white border-r border-gray-200 h-screen sticky top-0">
      <div className="p-4 border-b border-gray-200">
        <h1 className="text-lg font-bold text-blue-600">Blue Shores</h1>
        <p className="text-xs text-gray-500">Project Manager</p>
      </div>

      <nav className="flex-1 p-3 space-y-1">
        {visibleItems.map((item) => {
          const isActive = pathname.startsWith(item.href)
          return (
            <Link
              key={item.href}
              href={item.href}
              className={cn(
                'flex items-center gap-3 px-3 py-2 rounded-lg text-sm font-medium transition-colors',
                isActive
                  ? 'bg-blue-50 text-blue-700'
                  : 'text-gray-600 hover:bg-gray-50 hover:text-gray-900'
              )}
            >
              <item.icon className="w-5 h-5" />
              {item.label}
            </Link>
          )
        })}
      </nav>
    </aside>
  )
}
