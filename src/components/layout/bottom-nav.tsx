'use client'

import Link from 'next/link'
import { usePathname } from 'next/navigation'
import { LayoutDashboard, FolderOpen, Clock, Settings } from 'lucide-react'
import { cn } from '@/lib/utils'

interface BottomNavProps {
  isAdmin: boolean
}

const navItems = [
  { href: '/dashboard', label: 'Home', icon: LayoutDashboard, adminOnly: false },
  { href: '/projects', label: 'Projects', icon: FolderOpen, adminOnly: false },
  { href: '/my-time', label: 'My Time', icon: Clock, adminOnly: false },
  { href: '/settings', label: 'Settings', icon: Settings, adminOnly: true },
]

export function BottomNav({ isAdmin }: BottomNavProps) {
  const pathname = usePathname()

  const visibleItems = navItems.filter(
    (item) => !item.adminOnly || isAdmin
  )

  return (
    <nav className="fixed bottom-0 left-0 right-0 bg-white border-t border-gray-200 md:hidden z-50">
      <div className="flex justify-around items-center h-16 px-2">
        {visibleItems.map((item) => {
          const isActive = pathname.startsWith(item.href)
          return (
            <Link
              key={item.href}
              href={item.href}
              className={cn(
                'flex flex-col items-center gap-1 px-3 py-1 rounded-lg text-xs font-medium transition-colors min-w-[60px]',
                isActive
                  ? 'text-blue-600'
                  : 'text-gray-400 hover:text-gray-600'
              )}
            >
              <item.icon className={cn('w-6 h-6', isActive && 'text-blue-600')} />
              {item.label}
            </Link>
          )
        })}
      </div>
    </nav>
  )
}
