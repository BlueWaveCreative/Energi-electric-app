'use client'

import { useEffect, useState } from 'react'
import Link from 'next/link'
import { usePathname, useRouter } from 'next/navigation'
import { Menu, X, LogOut } from 'lucide-react'
import { useSupabase } from '@/hooks/use-supabase'
import { cn } from '@/lib/utils'
import { visibleNavItems } from './nav-items'

interface MobileMenuDrawerProps {
  isAdmin: boolean
}

/**
 * Mobile-only hamburger + slide-in drawer that mirrors the desktop sidebar.
 * Solves the problem where admins on phones could not reach Quotes / Materials /
 * Invoices / Settings / Reports / Activity / Templates from the bottom nav.
 *
 * Hamburger button is fixed top-right; visible only below md.
 */
export function MobileMenuDrawer({ isAdmin }: MobileMenuDrawerProps) {
  const pathname = usePathname()
  const router = useRouter()
  const supabase = useSupabase()
  const [open, setOpen] = useState(false)

  const items = visibleNavItems(isAdmin)

  // Close on route change so the drawer doesn't linger after navigation
  useEffect(() => {
    setOpen(false)
  }, [pathname])

  // Lock body scroll while open + close on Esc
  useEffect(() => {
    if (!open) return
    const previousOverflow = document.body.style.overflow
    document.body.style.overflow = 'hidden'
    function onKey(e: KeyboardEvent) {
      if (e.key === 'Escape') setOpen(false)
    }
    document.addEventListener('keydown', onKey)
    return () => {
      document.body.style.overflow = previousOverflow
      document.removeEventListener('keydown', onKey)
    }
  }, [open])

  async function handleLogout() {
    setOpen(false)
    await supabase.auth.signOut()
    router.push('/login')
    router.refresh()
  }

  return (
    <>
      <button
        type="button"
        onClick={() => setOpen(true)}
        aria-label="Open menu"
        aria-expanded={open}
        className="md:hidden fixed top-3 left-3 z-40 inline-flex items-center justify-center w-11 h-11 rounded-lg bg-white border border-gray-200 shadow-sm text-gray-700 hover:bg-gray-50 focus:outline-none focus:ring-2 focus:ring-[#045815]"
      >
        <Menu className="w-5 h-5" />
      </button>

      {open && (
        <div
          className="md:hidden fixed inset-0 z-50 bg-black/50"
          onClick={() => setOpen(false)}
          aria-hidden="true"
        />
      )}

      <aside
        className={cn(
          'md:hidden fixed top-0 left-0 z-50 h-full w-72 bg-[#32373C] flex flex-col transition-transform duration-200 ease-out',
          open ? 'translate-x-0' : '-translate-x-full',
        )}
        role="dialog"
        aria-label="Main menu"
        aria-hidden={!open}
      >
        <div className="flex items-center justify-between p-4 bg-white border-b border-white/10">
          <img
            src="/brand/energi-logo-horizontal.png"
            alt="Energi Electric"
            className="h-7"
          />
          <button
            type="button"
            onClick={() => setOpen(false)}
            aria-label="Close menu"
            className="inline-flex items-center justify-center w-11 h-11 -mr-2 rounded-lg text-gray-600 hover:bg-gray-100 focus:outline-none focus:ring-2 focus:ring-[#045815]"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        <nav aria-label="Main navigation" className="flex-1 p-3 space-y-1 overflow-y-auto">
          {items.map((item) => {
            const isActive = pathname.startsWith(item.href)
            return (
              <Link
                key={item.href}
                href={item.href}
                aria-current={isActive ? 'page' : undefined}
                className={cn(
                  'flex items-center gap-3 px-3 py-3 rounded-lg text-sm font-medium transition-colors focus:outline-none focus:ring-2 focus:ring-white/40',
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
            type="button"
            onClick={handleLogout}
            className="flex items-center gap-3 px-3 py-3 rounded-lg text-sm font-medium text-gray-300 hover:bg-white/5 hover:text-white transition-colors w-full focus:outline-none focus:ring-2 focus:ring-white/40"
          >
            <LogOut className="w-5 h-5" />
            Log Out
          </button>
        </div>
      </aside>
    </>
  )
}
