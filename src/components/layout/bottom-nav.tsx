'use client'

import Link from 'next/link'
import { usePathname, useRouter } from 'next/navigation'
import { LayoutDashboard, FolderOpen, Clock, LogOut } from 'lucide-react'
import { cn } from '@/lib/utils'
import { useSupabase } from '@/hooks/use-supabase'

interface BottomNavProps {
  isAdmin: boolean
}

const navItems = [
  { href: '/dashboard', label: 'Home', icon: LayoutDashboard, adminOnly: false },
  { href: '/projects', label: 'Projects', icon: FolderOpen, adminOnly: false },
  { href: '/my-time', label: 'My Time', icon: Clock, adminOnly: false },
]

export function BottomNav({ isAdmin }: BottomNavProps) {
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
    <nav className="fixed bottom-0 left-0 right-0 bg-white border-t border-gray-200 md:hidden z-50">
      <div className="flex justify-around items-center h-16 px-2">
        {visibleItems.map((item) => {
          const isActive = pathname.startsWith(item.href)
          return (
            <Link
              key={item.href}
              href={item.href}
              className={cn(
                'flex flex-col items-center gap-1 px-3 py-2 rounded-lg text-xs font-medium transition-colors min-w-[60px]',
                isActive
                  ? 'text-[#68BD45]'
                  : 'text-gray-400 hover:text-gray-600'
              )}
            >
              <item.icon className={cn('w-6 h-6', isActive && 'text-[#68BD45]')} />
              {item.label}
            </Link>
          )
        })}
        <button
          onClick={handleLogout}
          className="flex flex-col items-center gap-1 px-3 py-2 rounded-lg text-xs font-medium text-gray-400 hover:text-gray-600 transition-colors min-w-[60px]"
        >
          <LogOut className="w-6 h-6" />
          Log Out
        </button>
      </div>
    </nav>
  )
}
