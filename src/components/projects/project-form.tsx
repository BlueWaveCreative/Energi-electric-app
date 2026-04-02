'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import { useSupabase } from '@/hooks/use-supabase'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import type { TemplateWithPhases } from '@/lib/types/database'

interface ProjectFormProps {
  templates: TemplateWithPhases[]
}

export function ProjectForm({ templates }: ProjectFormProps) {
  const supabase = useSupabase()
  const router = useRouter()
  const [name, setName] = useState('')
  const [address, setAddress] = useState('')
  const [templateId, setTemplateId] = useState('')
  const [saving, setSaving] = useState(false)
  const [error, setError] = useState('')

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    if (!name.trim()) return
    setSaving(true)
    setError('')

    try {
      const { data: { user } } = await supabase.auth.getUser()

      const { data: project, error: createError } = await supabase
        .from('projects')
        .insert({
          name: name.trim(),
          address: address.trim() || null,
          template_id: templateId || null,
          created_by: user!.id,
        })
        .select()
        .single()

      if (createError) throw createError

      if (templateId) {
        const selectedTemplate = templates.find((t) => t.id === templateId)
        if (selectedTemplate?.template_phases?.length) {
          const { error: phaseError } = await supabase.from('phases').insert(
            selectedTemplate.template_phases.map((tp) => ({
              project_id: project.id,
              name: tp.name,
              description: tp.description,
              sort_order: tp.sort_order,
            }))
          )
          if (phaseError) throw phaseError
        }
      }

      router.push(`/projects/${project.id}`)
      router.refresh()
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to create project')
      setSaving(false)
    }
  }

  return (
    <form onSubmit={handleSubmit} className="space-y-6 max-w-xl">
      {error && (
        <div className="bg-red-50 text-red-600 text-sm p-3 rounded-lg" role="alert">{error}</div>
      )}

      <Input
        id="name"
        label="Project Name"
        value={name}
        onChange={(e) => setName(e.target.value)}
        placeholder="e.g., Smith Residence Panel Upgrade"
        required
      />

      <Input
        id="address"
        label="Address"
        value={address}
        onChange={(e) => setAddress(e.target.value)}
        placeholder="123 Main St, Wilmington, NC"
      />

      <div>
        <label htmlFor="template" className="block text-sm font-medium text-gray-700 mb-1">
          Template (optional)
        </label>
        <select
          id="template"
          value={templateId}
          onChange={(e) => setTemplateId(e.target.value)}
          className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent text-sm"
        >
          <option value="">No template — start blank</option>
          {templates.map((t) => (
            <option key={t.id} value={t.id}>
              {t.name} ({t.template_phases?.length ?? 0} phases)
            </option>
          ))}
        </select>
      </div>

      {templateId && (
        <div className="bg-blue-50 rounded-lg p-3">
          <p className="text-sm font-medium text-blue-700 mb-2">Phases from template:</p>
          <div className="flex flex-wrap gap-1">
            {templates
              .find((t) => t.id === templateId)
              ?.template_phases?.sort((a, b) => a.sort_order - b.sort_order)
              .map((phase) => (
                <span
                  key={phase.id}
                  className="px-2 py-0.5 bg-blue-100 text-blue-700 text-xs rounded-full"
                >
                  {phase.name}
                </span>
              ))}
          </div>
        </div>
      )}

      <div className="flex gap-3">
        <Button type="submit" disabled={saving}>
          {saving ? 'Creating...' : 'Create Project'}
        </Button>
        <Button type="button" variant="secondary" onClick={() => router.back()}>
          Cancel
        </Button>
      </div>
    </form>
  )
}
