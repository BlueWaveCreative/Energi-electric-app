import { type ReactNode } from 'react'

interface PageHeaderProps {
  title: string
  actions?: ReactNode
}

export function PageHeader({ title, actions }: PageHeaderProps) {
  return (
    <div className="flex items-center justify-between gap-3 pl-16 pr-4 py-4 md:pl-6 md:pr-6 md:py-6 border-b border-gray-200 bg-white shadow-sm">
      <h1 className="text-xl md:text-2xl font-bold text-gray-900 truncate">{title}</h1>
      {actions && <div className="flex items-center gap-2 shrink-0">{actions}</div>}
    </div>
  )
}
