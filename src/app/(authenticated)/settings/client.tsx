'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import { useSupabase } from '@/hooks/use-supabase'
import { Button } from '@/components/ui/button'
import { Card } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { Copy } from 'lucide-react'
import { NotificationSettings } from '@/components/settings/notification-settings'
import type { Profile, UserStatus, NotificationPreference, LineItemPreset } from '@/lib/types/database'

interface SettingsClientProps {
  users: Profile[]
  notificationPreferences: NotificationPreference | null
  userId: string
  customers: { id: string; name: string; email: string | null; phone: string | null; portal_token: string; portal_active: boolean }[]
  presets: LineItemPreset[]
}

function CustomerPortalRow({
  customer,
  onToggle,
  onSendEmail,
}: {
  customer: { id: string; name: string; email: string | null; phone: string | null; portal_token: string; portal_active: boolean }
  onToggle: (id: string, active: boolean) => Promise<void>
  onSendEmail: (id: string) => Promise<void>
}) {
  const [active, setActive] = useState(customer.portal_active)
  const [copying, setCopying] = useState(false)
  const [toggling, setToggling] = useState(false)

  const baseUrl = typeof window !== 'undefined' ? window.location.origin : 'https://blue-shores-pm.vercel.app'
  const portalUrl = `${baseUrl}/portal/${customer.portal_token}`

  async function handleToggle() {
    setToggling(true)
    await onToggle(customer.id, !active)
    setActive(prev => !prev)
    setToggling(false)
  }

  async function copyLink() {
    await navigator.clipboard.writeText(portalUrl)
    setCopying(true)
    setTimeout(() => setCopying(false), 2000)
  }

  const phone = customer.phone?.replace(/\D/g, '') ?? ''
  const smsBody = encodeURIComponent(`Hi ${customer.name}, here's your Blue Shores Electric project portal: ${portalUrl}`)
  const smsHref = phone ? `sms:${phone}?&body=${smsBody}` : null

  return (
    <Card>
      <div className="flex items-start justify-between gap-4">
        <div>
          <p className="font-medium text-gray-900">{customer.name}</p>
          <p className="text-sm text-gray-500">{customer.email ?? 'No email'}</p>
        </div>
        <button
          onClick={handleToggle}
          disabled={toggling}
          className={`relative inline-flex h-6 w-11 shrink-0 items-center rounded-full transition-colors ${
            active ? 'bg-[#68BD45]' : 'bg-gray-300'
          }`}
          role="switch"
          aria-checked={active}
          aria-label={`Portal ${active ? 'active' : 'inactive'} for ${customer.name}`}
        >
          <span className={`inline-block h-4 w-4 transform rounded-full bg-white transition-transform ${active ? 'translate-x-6' : 'translate-x-1'}`} />
        </button>
      </div>
      {active && (
        <div className="mt-3 flex flex-wrap gap-2">
          <button
            onClick={copyLink}
            className="text-xs px-3 py-1.5 rounded-full border border-gray-300 text-gray-600 hover:bg-gray-50"
          >
            {copying ? 'Copied!' : 'Copy Link'}
          </button>
          {customer.email && (
            <button
              onClick={() => onSendEmail(customer.id)}
              className="text-xs px-3 py-1.5 rounded-full border border-[#68BD45] text-[#68BD45] hover:bg-green-50"
            >
              Send Email
            </button>
          )}
          {smsHref && (
            <a
              href={smsHref}
              className="text-xs px-3 py-1.5 rounded-full border border-gray-300 text-gray-600 hover:bg-gray-50"
            >
              Share via Text
            </a>
          )}
        </div>
      )}
    </Card>
  )
}

function LineItemPresetsSection({
  presets: initialPresets,
  onRefresh,
}: {
  presets: LineItemPreset[]
  onRefresh: () => void
}) {
  const supabase = useSupabase()
  const [presets, setPresets] = useState(initialPresets)
  const [newName, setNewName] = useState('')
  const [newPrice, setNewPrice] = useState('')
  const [saving, setSaving] = useState(false)

  async function addPreset() {
    if (!newName.trim()) return
    setSaving(true)
    const { data: { user } } = await supabase.auth.getUser()
    if (!user) { setSaving(false); return }
    const { data: newPreset } = await supabase.from('line_item_presets').insert({
      name: newName.trim(),
      default_unit_price: newPrice ? parseFloat(newPrice) : null,
      sort_order: presets.length,
      created_by: user.id,
    }).select().single()
    if (newPreset) setPresets(prev => [...prev, newPreset as LineItemPreset])
    setNewName('')
    setNewPrice('')
    setSaving(false)
    onRefresh()
  }

  async function deletePreset(id: string) {
    await supabase.from('line_item_presets').delete().eq('id', id)
    setPresets(prev => prev.filter(p => p.id !== id))
    onRefresh()
  }

  return (
    <div>
      <h2 className="font-semibold text-gray-900 mb-3">Invoice Line Item Presets</h2>
      <div className="space-y-2 mb-3">
        {presets.map(preset => (
          <Card key={preset.id}>
            <div className="flex items-center justify-between">
              <div>
                <p className="font-medium text-gray-900 text-sm">{preset.name}</p>
                {preset.default_unit_price != null && (
                  <p className="text-xs text-gray-500">
                    Default: {new Intl.NumberFormat('en-US', { style: 'currency', currency: 'USD' }).format(preset.default_unit_price)}
                  </p>
                )}
              </div>
              <button
                onClick={() => deletePreset(preset.id)}
                className="text-red-400 hover:text-red-600 text-xs"
              >
                Remove
              </button>
            </div>
          </Card>
        ))}
        {presets.length === 0 && (
          <p className="text-sm text-gray-500">No presets yet.</p>
        )}
      </div>
      <div className="flex gap-2">
        <input
          value={newName}
          onChange={e => setNewName(e.target.value)}
          placeholder="Preset name (e.g. Labor)"
          className="flex-1 border border-gray-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-[#68BD45] placeholder:text-gray-400"
        />
        <input
          type="number"
          value={newPrice}
          onChange={e => setNewPrice(e.target.value)}
          placeholder="Default price"
          className="w-32 border border-gray-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-[#68BD45] placeholder:text-gray-400"
          min="0"
          step="0.01"
        />
        <button
          onClick={addPreset}
          disabled={saving || !newName.trim()}
          className="px-4 py-2 bg-[#68BD45] text-white rounded-lg text-sm font-medium disabled:opacity-50 hover:bg-green-600 transition-colors"
        >
          Add
        </button>
      </div>
    </div>
  )
}

export function SettingsClient({ users, notificationPreferences, userId, customers, presets }: SettingsClientProps) {
  const supabase = useSupabase()
  const router = useRouter()
  const [copied, setCopied] = useState(false)

  function getInviteLink() {
    const baseUrl = window.location.origin
    return `${baseUrl}/signup?role=field_worker`
  }

  async function copyInviteLink() {
    await navigator.clipboard.writeText(getInviteLink())
    setCopied(true)
    setTimeout(() => setCopied(false), 2000)
  }

  async function toggleUserStatus(userId: string, currentStatus: UserStatus) {
    const newStatus = currentStatus === 'active' ? 'inactive' : 'active'
    await supabase.from('profiles').update({ status: newStatus }).eq('id', userId)
    router.refresh()
  }

  return (
    <div className="space-y-6 max-w-xl">
      <NotificationSettings preferences={notificationPreferences} userId={userId} />

      <Card>
        <h2 className="font-semibold text-gray-900 mb-3">Invite Crew Members</h2>
        <p className="text-sm text-gray-500 mb-3">
          Share this link with crew members to let them create an account.
        </p>
        <Button variant="secondary" onClick={copyInviteLink}>
          {copied ? (
            'Copied!'
          ) : (
            <>
              <Copy className="w-4 h-4 mr-2" /> Copy Invite Link
            </>
          )}
        </Button>
      </Card>

      <div>
        <h2 className="font-semibold text-gray-900 mb-3">Team ({users.length})</h2>
        <div className="space-y-2">
          {users.map((u) => (
            <Card key={u.id}>
              <div className="flex items-center justify-between">
                <div>
                  <p className="font-medium text-gray-900">{u.name}</p>
                  <p className="text-sm text-gray-500">{u.email}</p>
                </div>
                <div className="flex items-center gap-3">
                  <Badge variant={u.role === 'admin' ? 'info' : 'default'}>
                    {u.role === 'admin' ? 'Admin' : 'Field'}
                  </Badge>
                  <button
                    onClick={() => toggleUserStatus(u.id, u.status)}
                    className={`relative inline-flex h-6 w-11 items-center rounded-full transition-colors ${
                      u.status === 'active' ? 'bg-[#68BD45]' : 'bg-gray-300'
                    }`}
                    role="switch"
                    aria-checked={u.status === 'active'}
                    aria-label={`${u.name} is ${u.status}`}
                  >
                    <span
                      className={`inline-block h-4 w-4 transform rounded-full bg-white transition-transform ${
                        u.status === 'active' ? 'translate-x-6' : 'translate-x-1'
                      }`}
                    />
                  </button>
                </div>
              </div>
            </Card>
          ))}
        </div>
      </div>

      {/* Client Portals */}
      <div>
        <h2 className="font-semibold text-gray-900 mb-3">Client Portals</h2>
        <div className="space-y-2">
          {customers.map(customer => (
            <CustomerPortalRow
              key={customer.id}
              customer={customer}
              onToggle={async (id, active) => {
                await fetch(`/api/customers/${id}/portal`, {
                  method: 'POST',
                  headers: { 'Content-Type': 'application/json' },
                  body: JSON.stringify({ active }),
                })
                router.refresh()
              }}
              onSendEmail={async (id) => {
                const res = await fetch(`/api/customers/${id}/share-portal`, { method: 'POST' })
                if (!res.ok) {
                  const d = await res.json()
                  alert(d.error ?? 'Failed to send')
                } else {
                  alert('Portal link sent!')
                }
              }}
            />
          ))}
          {customers.length === 0 && (
            <p className="text-sm text-gray-500">No customers yet. Add customers when creating projects.</p>
          )}
        </div>
      </div>

      {/* Line Item Presets */}
      <LineItemPresetsSection presets={presets} onRefresh={() => router.refresh()} />
    </div>
  )
}
