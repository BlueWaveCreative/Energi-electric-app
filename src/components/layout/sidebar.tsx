'use client'

import Link from 'next/link'
import { usePathname, useRouter } from 'next/navigation'
import { LogOut } from 'lucide-react'
import { useSupabase } from '@/hooks/use-supabase'
import { cn } from '@/lib/utils'
import { visibleNavItems } from './nav-items'

interface SidebarProps {
  isAdmin: boolean
}

export function Sidebar({ isAdmin }: SidebarProps) {
  const pathname = usePathname()
  const router = useRouter()
  const supabase = useSupabase()

  const items = visibleNavItems(isAdmin)

  async function handleLogout() {
    await supabase.auth.signOut()
    router.push('/login')
    router.refresh()
  }

  return (
    <aside className="hidden md:flex md:flex-col md:w-64 bg-[#32373C] h-screen sticky top-0">
      <div className="p-4 bg-white border-b border-white/10">
        <img
          src="/brand/energi-logo-horizontal.png"
          alt="Energi Electric"
          className="h-8"
        />
      </div>

      <nav aria-label="Main navigation" className="flex-1 p-3 space-y-1">
        {items.map((item) => {
          const isActive = pathname.startsWith(item.href)
          return (
            <Link
              key={item.href}
              href={item.href}
              aria-current={isActive ? 'page' : undefined}
              className={cn(
                'flex items-center gap-3 px-3 py-2 rounded-lg text-sm font-medium transition-colors focus:outline-none focus:ring-2 focus:ring-white/40',
                isActive
                  ? 'bg-[#045815] text-white shadow-sm'
                  : 'text-gray-300 hover:bg-white/5 hover:text-white',
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
          className="flex items-center gap-3 px-3 py-2 rounded-lg text-sm font-medium text-gray-300 hover:bg-white/5 hover:text-white transition-colors w-full focus:outline-none focus:ring-2 focus:ring-white/40"
        >
          <LogOut className="w-5 h-5" />
          Log Out
        </button>
      </div>
    </aside>
  )
}
