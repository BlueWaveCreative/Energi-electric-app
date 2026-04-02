'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import { useSupabase } from '@/hooks/use-supabase'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { PhaseListEditor, type PhaseItem } from './phase-list-editor'
import type { ProjectTemplate, TemplatePhase } from '@/lib/types/database'

interface TemplateFormProps {
  template?: ProjectTemplate & { template_phases: TemplatePhase[] }
}

export function TemplateForm({ template }: TemplateFormProps) {
  const supabase = useSupabase()
  const router = useRouter()
  const [name, setName] = useState(template?.name ?? '')
  const [description, setDescription] = useState(template?.description ?? '')
  const [phases, setPhases] = useState<PhaseItem[]>(
    template?.template_phases?.map((p) => ({
      id: p.id,
      name: p.name,
      description: p.description ?? '',
      sort_order: p.sort_order,
    })) ?? []
  )
  const [saving, setSaving] = useState(false)
  const [error, setError] = useState('')

  const isEditing = !!template

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    if (!name.trim()) return
    setSaving(true)
    setError('')

    try {
      if (isEditing) {
        const { error: updateError } = await supabase
          .from('project_templates')
          .update({ name: name.trim(), description: description.trim() || null })
          .eq('id', template.id)

        if (updateError) throw updateError

        await supabase.from('template_phases').delete().eq('template_id', template.id)

        if (phases.length > 0) {
          const { error: phaseError } = await supabase.from('template_phases').insert(
            phases.map((p) => ({
              template_id: template.id,
              name: p.name,
              description: p.description || null,
              sort_order: p.sort_order,
            }))
          )
          if (phaseError) throw phaseError
        }
      } else {
        const { data: newTemplate, error: createError } = await supabase
          .from('project_templates')
          .insert({ name: name.trim(), description: description.trim() || null })
          .select()
          .single()

        if (createError) throw createError

        if (phases.length > 0) {
          const { error: phaseError } = await supabase.from('template_phases').insert(
            phases.map((p) => ({
              template_id: newTemplate.id,
              name: p.name,
              description: p.description || null,
              sort_order: p.sort_order,
            }))
          )
          if (phaseError) throw phaseError
        }
      }

      router.push('/templates')
      router.refresh()
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to save template')
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
        label="Template Name"
        value={name}
        onChange={(e) => setName(e.target.value)}
        placeholder="e.g., Residential New Build"
        required
      />

      <div>
        <label htmlFor="description" className="block text-sm font-medium text-gray-700 mb-1">
          Description
        </label>
        <textarea
          id="description"
          value={description}
          onChange={(e) => setDescription(e.target.value)}
          placeholder="What type of project is this template for?"
          rows={2}
          className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent text-sm"
        />
      </div>

      <PhaseListEditor phases={phases} onChange={setPhases} />

      <div className="flex gap-3">
        <Button type="submit" disabled={saving}>
          {saving ? 'Saving...' : isEditing ? 'Update Template' : 'Create Template'}
        </Button>
        <Button type="button" variant="secondary" onClick={() => router.back()}>
          Cancel
        </Button>
      </div>
    </form>
  )
}
