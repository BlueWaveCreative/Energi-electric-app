'use client'

import { useEffect, useRef, useState } from 'react'
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
 * Hamburger is fixed top-left; visible only below md.
 */
export function MobileMenuDrawer({ isAdmin }: MobileMenuDrawerProps) {
  const pathname = usePathname()
  const router = useRouter()
  const supabase = useSupabase()
  const [open, setOpen] = useState(false)
  const hamburgerRef = useRef<HTMLButtonElement>(null)
  const closeBtnRef = useRef<HTMLButtonElement>(null)
  const drawerRef = useRef<HTMLElement>(null)

  const items = visibleNavItems(isAdmin)

  // Close on route change so the drawer doesn't linger after navigation
  useEffect(() => {
    setOpen(false)
  }, [pathname])

  // Open: lock body scroll, focus the close button, trap Tab inside drawer
  useEffect(() => {
    if (!open) return
    const previousOverflow = document.body.style.overflow
    document.body.style.overflow = 'hidden'

    // Initial focus on close button
    closeBtnRef.current?.focus()

    function focusableElements(): HTMLElement[] {
      const root = drawerRef.current
      if (!root) return []
      return Array.from(
        root.querySelectorAll<HTMLElement>(
          'a[href], button:not([disabled]), [tabindex]:not([tabindex="-1"])',
        ),
      ).filter((el) => !el.hasAttribute('inert') && el.offsetParent !== null)
    }

    function onKey(e: KeyboardEvent) {
      if (e.key === 'Escape') {
        e.preventDefault()
        setOpen(false)
        return
      }
      if (e.key !== 'Tab') return
      const elements = focusableElements()
      if (elements.length === 0) return
      const first = elements[0]
      const last = elements[elements.length - 1]
      const active = document.activeElement as HTMLElement | null
      if (e.shiftKey) {
        if (active === first || !drawerRef.current?.contains(active)) {
          e.preventDefault()
          last.focus()
        }
      } else {
        if (active === last) {
          e.preventDefault()
          first.focus()
        }
      }
    }

    document.addEventListener('keydown', onKey)
    return () => {
      document.body.style.overflow = previousOverflow
      document.removeEventListener('keydown', onKey)
    }
  }, [open])

  // Restore focus to hamburger when the drawer closes
  useEffect(() => {
    if (!open && hamburgerRef.current && document.activeElement !== hamburgerRef.current) {
      // Only restore if focus was inside the drawer (don't yank focus away
      // from a content link the user just clicked)
      const active = document.activeElement
      const wasInsideDrawer = drawerRef.current?.contains(active as Node)
      if (wasInsideDrawer) hamburgerRef.current.focus()
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
        ref={hamburgerRef}
        type="button"
        onClick={() => setOpen(true)}
        aria-label="Open menu"
        aria-expanded={open}
        aria-controls="mobile-menu-drawer"
        className="md:hidden fixed top-3 left-3 z-40 inline-flex items-center justify-center w-11 h-11 rounded-lg bg-[#32373C] text-white shadow-md hover:bg-[#3f454c] focus:outline-none focus:ring-2 focus:ring-[#045815] focus:ring-offset-2"
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
        ref={drawerRef}
        id="mobile-menu-drawer"
        // @ts-expect-error - inert is valid HTML5 but not in @types/react yet on this version
        inert={open ? undefined : ''}
        className={cn(
          'md:hidden fixed top-0 left-0 z-50 h-full w-[85vw] max-w-xs bg-[#32373C] flex flex-col transition-transform duration-200 ease-out',
          open ? 'translate-x-0' : '-translate-x-full',
        )}
        role="dialog"
        aria-modal="true"
        aria-label="Main menu"
      >
        <div className="flex items-center justify-between p-4 bg-white border-b border-gray-200">
          <img
            src="/brand/energi-logo-horizontal.png"
            alt="Energi Electric"
            className="h-7"
          />
          <button
            ref={closeBtnRef}
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
                  'flex items-center gap-3 px-3 py-3 rounded-lg text-sm font-medium transition-colors focus:outline-none focus:ring-2 focus:ring-white/70',
                  isActive
                    ? 'bg-[#045815] text-white shadow-sm'
                    : 'text-gray-300 hover:bg-white/10 hover:text-white',
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
            className="flex items-center gap-3 px-3 py-3 rounded-lg text-sm font-medium text-gray-300 hover:bg-white/10 hover:text-white transition-colors w-full focus:outline-none focus:ring-2 focus:ring-white/70"
          >
            <LogOut className="w-5 h-5" />
            Log Out
          </button>
        </div>
      </aside>
    </>
  )
}
