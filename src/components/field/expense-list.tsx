'use client'

import { useState, useEffect } from 'react'
import { getSignedUrl } from '@/lib/storage'
import { formatDate } from '@/lib/utils'
import { Badge } from '@/components/ui/badge'
import type { Expense, Profile } from '@/lib/types/database'

interface ExpenseWithUser extends Expense {
  profiles: Pick<Profile, 'name'>
}

interface ExpenseListProps {
  expenses: ExpenseWithUser[]
}

const CATEGORY_LABELS: Record<string, string> = {
  materials: 'Materials',
  rental: 'Rental',
  permit_fee: 'Permit Fee',
  other: 'Other',
}

const CATEGORY_VARIANTS: Record<string, 'default' | 'success' | 'warning' | 'info'> = {
  materials: 'info',
  rental: 'warning',
  permit_fee: 'default',
  other: 'default',
}

function formatCurrency(amount: number): string {
  return `$${amount.toFixed(2)}`
}

export function ExpenseList({ expenses }: ExpenseListProps) {
  const [thumbnailUrls, setThumbnailUrls] = useState<Record<string, string>>({})

  useEffect(() => {
    async function loadThumbnails() {
      const expensesWithReceipts = expenses.filter((e) => e.receipt_thumbnail || e.receipt_path)
      if (expensesWithReceipts.length === 0) return

      const entries = await Promise.all(
        expensesWithReceipts.map(async (expense) => {
          try {
            const path = expense.receipt_thumbnail ?? expense.receipt_path!
            const url = await getSignedUrl(path)
            return [expense.id, url] as const
          } catch {
            return [expense.id, ''] as const
          }
        })
      )
      setThumbnailUrls(Object.fromEntries(entries))
    }
    loadThumbnails()
  }, [expenses])

  if (expenses.length === 0) {
    return <p className="text-sm text-gray-500 italic">No expenses yet</p>
  }

  const total = expenses.reduce((sum, e) => sum + Number(e.amount), 0)

  return (
    <div className="space-y-2">
      <div className="flex items-center justify-between text-sm">
        <span className="text-gray-500">{expenses.length} expense{expenses.length !== 1 ? 's' : ''}</span>
        <span className="font-semibold text-gray-700">Total: {formatCurrency(total)}</span>
      </div>

      {expenses.map((expense) => (
        <div key={expense.id} className="flex items-center justify-between py-2 border-b border-gray-100 last:border-0">
          <div className="flex items-start gap-3 flex-1 min-w-0">
            {thumbnailUrls[expense.id] ? (
              <img
                src={thumbnailUrls[expense.id]}
                alt="Receipt"
                className="w-10 h-10 rounded-md object-cover flex-shrink-0"
              />
            ) : expense.receipt_path ? (
              <div className="w-10 h-10 rounded-md animate-pulse bg-gray-200 flex-shrink-0" />
            ) : null}
            <div className="flex-1 min-w-0">
              <div className="flex items-center gap-2 text-sm">
                <span className="font-medium text-gray-700 truncate">{expense.description}</span>
                <Badge variant={CATEGORY_VARIANTS[expense.category] ?? 'default'}>
                  {CATEGORY_LABELS[expense.category] ?? expense.category}
                </Badge>
              </div>
              <div className="flex items-center gap-2 mt-0.5 text-xs text-gray-500">
                <span>{expense.profiles?.name ?? 'Unknown'}</span>
                <span>{formatDate(new Date(expense.expense_date))}</span>
              </div>
            </div>
          </div>
          <div className="text-right ml-3 flex-shrink-0">
            <p className="text-sm font-semibold text-gray-700">{formatCurrency(Number(expense.amount))}</p>
          </div>
        </div>
      ))}
    </div>
  )
}
