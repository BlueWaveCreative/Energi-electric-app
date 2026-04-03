'use client'

import { useState } from 'react'
import { createClient } from '@/lib/supabase/client'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Plus, User } from 'lucide-react'
import type { Customer } from '@/lib/types/database'

interface CustomerSelectProps {
  customers: Customer[]
  selectedId: string | null
  onChange: (customerId: string | null) => void
  userId: string
}

export function CustomerSelect({ customers: initialCustomers, selectedId, onChange, userId }: CustomerSelectProps) {
  const [customers, setCustomers] = useState(initialCustomers)
  const [showNewForm, setShowNewForm] = useState(false)
  const [saving, setSaving] = useState(false)
  const [error, setError] = useState('')
  const [newName, setNewName] = useState('')
  const [newEmail, setNewEmail] = useState('')
  const [newPhone, setNewPhone] = useState('')
  const [newAddress, setNewAddress] = useState('')

  async function handleCreateCustomer(e: React.FormEvent) {
    e.preventDefault()
    if (!newName.trim() || saving) return
    setSaving(true)

    const supabase = createClient()
    const { data, error } = await supabase
      .from('customers')
      .insert({
        name: newName.trim(),
        email: newEmail.trim() || null,
        phone: newPhone.trim() || null,
        address: newAddress.trim() || null,
        created_by: userId,
      })
      .select()
      .single()

    if (error) {
      console.error('Failed to create customer:', error)
      setError('Failed to create customer. Try again.')
      setSaving(false)
      return
    }

    // Add new customer to local list and select it (no page reload — preserves form state)
    setCustomers((prev) => [...prev, data as Customer])
    onChange(data.id)
    setShowNewForm(false)
    setNewName('')
    setNewEmail('')
    setNewPhone('')
    setNewAddress('')
    setError('')
    setSaving(false)
  }

  return (
    <div>
      <label htmlFor="customer" className="block text-sm font-medium text-gray-700 mb-1">
        Customer (optional)
      </label>
      <select
        id="customer"
        value={selectedId ?? ''}
        onChange={(e) => onChange(e.target.value || null)}
        className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-[#68BD45] focus:border-transparent text-sm"
      >
        <option value="">No customer</option>
        {customers.map((c) => (
          <option key={c.id} value={c.id}>
            {c.name}{c.email ? ` (${c.email})` : ''}
          </option>
        ))}
      </select>

      {!showNewForm ? (
        <button
          type="button"
          onClick={() => setShowNewForm(true)}
          className="flex items-center gap-1 mt-2 text-sm text-[#68BD45] hover:text-[#5aa83c] transition-colors"
        >
          <Plus className="w-3.5 h-3.5" /> Add new customer
        </button>
      ) : (
        <div className="mt-3 p-3 bg-gray-50 rounded-lg border border-gray-200 space-y-3">
          <p className="text-sm font-medium text-gray-700 flex items-center gap-1">
            <User className="w-4 h-4" aria-hidden="true" /> New Customer
          </p>
          {error && (
            <div className="bg-red-50 text-red-600 text-sm p-2 rounded-lg" role="alert">{error}</div>
          )}
          <Input
            id="new-customer-name"
            label="Name"
            value={newName}
            onChange={(e) => setNewName(e.target.value)}
            placeholder="John Smith"
            required
          />
          <Input
            id="new-customer-email"
            label="Email"
            type="email"
            value={newEmail}
            onChange={(e) => setNewEmail(e.target.value)}
            placeholder="john@example.com"
          />
          <Input
            id="new-customer-phone"
            label="Phone"
            type="tel"
            value={newPhone}
            onChange={(e) => setNewPhone(e.target.value)}
            placeholder="(910) 555-1234"
          />
          <Input
            id="new-customer-address"
            label="Address"
            value={newAddress}
            onChange={(e) => setNewAddress(e.target.value)}
            placeholder="123 Main St, Wilmington, NC"
          />
          <div className="flex gap-2">
            <Button type="button" size="sm" onClick={handleCreateCustomer} disabled={!newName.trim() || saving}>
              {saving ? 'Creating...' : 'Create Customer'}
            </Button>
            <Button type="button" variant="secondary" size="sm" onClick={() => setShowNewForm(false)}>
              Cancel
            </Button>
          </div>
        </div>
      )}
    </div>
  )
}
