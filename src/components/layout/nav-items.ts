import {
  LayoutDashboard,
  FolderOpen,
  FileStack,
  Settings,
  Clock,
  BarChart3,
  Activity,
  CalendarDays,
  HelpCircle,
  Receipt,
  Package,
  FileText,
  type LucideIcon,
} from 'lucide-react'

export interface NavItem {
  href: string
  label: string
  icon: LucideIcon
  adminOnly: boolean
}

export const NAV_ITEMS: NavItem[] = [
  { href: '/dashboard', label: 'Dashboard', icon: LayoutDashboard, adminOnly: false },
  { href: '/projects', label: 'Projects', icon: FolderOpen, adminOnly: false },
  { href: '/my-time', label: 'My Time', icon: Clock, adminOnly: false },
  { href: '/schedule', label: 'Schedule', icon: CalendarDays, adminOnly: false },
  { href: '/reports', label: 'Reports', icon: BarChart3, adminOnly: true },
  { href: '/quotes', label: 'Quotes', icon: FileText, adminOnly: true },
  { href: '/invoices', label: 'Invoices', icon: Receipt, adminOnly: true },
  { href: '/materials', label: 'Materials', icon: Package, adminOnly: true },
  { href: '/activity', label: 'Activity', icon: Activity, adminOnly: false },
  { href: '/templates', label: 'Templates', icon: FileStack, adminOnly: true },
  { href: '/settings', label: 'Settings', icon: Settings, adminOnly: true },
  { href: '/help', label: 'Help', icon: HelpCircle, adminOnly: false },
]

export function visibleNavItems(isAdmin: boolean): NavItem[] {
  return NAV_ITEMS.filter((i) => !i.adminOnly || isAdmin)
}
