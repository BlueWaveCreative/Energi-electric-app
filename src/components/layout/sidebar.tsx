'use client'

import Link from 'next/link'
import { usePathname, useRouter } from 'next/navigation'
import { LayoutDashboard, FolderOpen, FileStack, Settings, Clock, BarChart3, Activity, CalendarDays, HelpCircle, LogOut } from 'lucide-react'
import { useSupabase } from '@/hooks/use-supabase'
import { cn } from '@/lib/utils'

interface SidebarProps {
  isAdmin: boolean
}

const navItems = [
  { href: '/dashboard', label: 'Dashboard', icon: LayoutDashboard, adminOnly: false },
  { href: '/projects', label: 'Projects', icon: FolderOpen, adminOnly: false },
  { href: '/my-time', label: 'My Time', icon: Clock, adminOnly: false },
  { href: '/schedule', label: 'Schedule', icon: CalendarDays, adminOnly: true },
  { href: '/reports', label: 'Reports', icon: BarChart3, adminOnly: true },
  { href: '/activity', label: 'Activity', icon: Activity, adminOnly: true },
  { href: '/templates', label: 'Templates', icon: FileStack, adminOnly: true },
  { href: '/settings', label: 'Settings', icon: Settings, adminOnly: true },
  { href: '/help', label: 'Help', icon: HelpCircle, adminOnly: false },
]

export function Sidebar({ isAdmin }: SidebarProps) {
  const pathname = usePathname()
  const router = useRouter()
  const supabase = useSupabase()

  const visibleItems = navItems.filter(
    (item) => !item.adminOnly || isAdmin
  )

  async function handleLogout() {
    await supabase.auth.signOut()
    router.push('/login')
    router.refresh()
  }

  return (
    <aside className="hidden md:flex md:flex-col md:w-64 bg-[#32373C] h-screen sticky top-0">
      <div className="p-4 border-b border-white/10">
        <img src="/brand/logo-horizontal.svg" alt="Blue Shores Electric" className="h-8" />
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
                  ? 'bg-[#68BD45]/15 text-[#68BD45]'
                  : 'text-gray-400 hover:bg-white/5 hover:text-white'
              )}
            >
              <item.icon className="w-5 h-5" />
              {item.label}
            </Link>
          )
        })}
      </nav>

      <div className="p-3 border-t border-white/10">
        <button
          onClick={handleLogout}
          className="flex items-center gap-3 px-3 py-2 rounded-lg text-sm font-medium text-gray-400 hover:bg-white/5 hover:text-white transition-colors w-full"
        >
          <LogOut className="w-5 h-5" />
          Log Out
        </button>
      </div>
    </aside>
  )
}
