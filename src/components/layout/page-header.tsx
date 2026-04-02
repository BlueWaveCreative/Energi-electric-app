import { type ReactNode } from 'react'

interface PageHeaderProps {
  title: string
  actions?: ReactNode
}

export function PageHeader({ title, actions }: PageHeaderProps) {
  return (
    <div className="flex items-center justify-between px-4 py-4 md:px-6 md:py-6 border-b border-gray-200 bg-white shadow-sm">
      <h1 className="text-xl md:text-2xl font-bold text-gray-900">{title}</h1>
      {actions && <div className="flex items-center gap-2">{actions}</div>}
    </div>
  )
}
