'use client'

import { useState, useRef } from 'react'
import { useRouter } from 'next/navigation'
import { useSupabase } from '@/hooks/use-supabase'
import { uploadPhoto } from '@/lib/storage'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Camera } from 'lucide-react'

interface ExpenseFormProps {
  projectId: string
  userId: string
  onSuccess: () => void
}

const CATEGORIES = [
  { value: 'materials', label: 'Materials' },
  { value: 'rental', label: 'Rental' },
  { value: 'permit_fee', label: 'Permit Fee' },
  { value: 'other', label: 'Other' },
]

export function ExpenseForm({ projectId, userId, onSuccess }: ExpenseFormProps) {
  const supabase = useSupabase()
  const router = useRouter()
  const fileRef = useRef<HTMLInputElement>(null)
  const [amount, setAmount] = useState('')
  const [description, setDescription] = useState('')
  const [category, setCategory] = useState('materials')
  const [expenseDate, setExpenseDate] = useState(new Date().toISOString().split('T')[0])
  const [receiptFile, setReceiptFile] = useState<File | null>(null)
  const [saving, setSaving] = useState(false)

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    const parsedAmount = parseFloat(amount)
    if (!parsedAmount || parsedAmount <= 0 || !description.trim()) return

    setSaving(true)
    try {
      let receiptPath: string | null = null
      let receiptThumbnail: string | null = null

      if (receiptFile) {
        const { path, thumbnailPath } = await uploadPhoto(supabase, receiptFile, projectId)
        receiptPath = path
        receiptThumbnail = thumbnailPath
      }

      const { error } = await supabase.from('expenses').insert({
        project_id: projectId,
        user_id: userId,
        amount: parsedAmount,
        description: description.trim(),
        category,
        expense_date: expenseDate,
        receipt_path: receiptPath,
        receipt_thumbnail: receiptThumbnail,
      })

      if (error) {
        console.error('Failed to add expense:', error)
        alert('Failed to add expense. Please try again.')
        return
      }

      setAmount('')
      setDescription('')
      setCategory('materials')
      setExpenseDate(new Date().toISOString().split('T')[0])
      setReceiptFile(null)
      if (fileRef.current) fileRef.current.value = ''
      onSuccess()
      router.refresh()
    } catch {
      alert('Failed to add expense. Please try again.')
    } finally {
      setSaving(false)
    }
  }

  return (
    <form onSubmit={handleSubmit} className="space-y-3">
      <Input
        id="expense-amount"
        label="Amount ($)"
        type="number"
        min="0.01"
        step="0.01"
        value={amount}
        onChange={(e) => setAmount(e.target.value)}
        placeholder="0.00"
        required
      />

      <Input
        id="expense-description"
        label="Description"
        value={description}
        onChange={(e) => setDescription(e.target.value)}
        placeholder="What was purchased?"
        required
      />

      <div>
        <label htmlFor="expense-category" className="block text-sm font-medium text-gray-700 mb-1">
          Category
        </label>
        <select
          id="expense-category"
          value={category}
          onChange={(e) => setCategory(e.target.value)}
          className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-[#68BD45] focus:border-transparent text-sm"
        >
          {CATEGORIES.map((cat) => (
            <option key={cat.value} value={cat.value}>{cat.label}</option>
          ))}
        </select>
      </div>

      <Input
        id="expense-date"
        label="Date"
        type="date"
        value={expenseDate}
        onChange={(e) => setExpenseDate(e.target.value)}
        required
      />

      <div>
        <label className="block text-sm font-medium text-gray-700 mb-1">
          Receipt Photo (optional)
        </label>
        <button
          type="button"
          onClick={() => fileRef.current?.click()}
          className="inline-flex items-center gap-2 px-3 py-2 border border-gray-300 rounded-lg text-sm text-gray-700 hover:bg-gray-50"
        >
          <Camera className="w-4 h-4" />
          {receiptFile ? receiptFile.name : 'Attach Receipt'}
        </button>
        <input
          ref={fileRef}
          type="file"
          accept="image/*"
          capture="environment"
          aria-label="Receipt photo"
          onChange={(e) => setReceiptFile(e.target.files?.[0] ?? null)}
          className="hidden"
        />
      </div>

      <Button type="submit" disabled={saving} size="sm">
        {saving ? 'Adding...' : 'Add Expense'}
      </Button>
    </form>
  )
}
