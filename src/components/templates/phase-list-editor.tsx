'use client'

import { useState } from 'react'
import { Plus, GripVertical, Trash2 } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'

export interface PhaseItem {
  id: string
  name: string
  description: string
  sort_order: number
}

interface PhaseListEditorProps {
  phases: PhaseItem[]
  onChange: (phases: PhaseItem[]) => void
}

export function PhaseListEditor({ phases, onChange }: PhaseListEditorProps) {
  const [newPhaseName, setNewPhaseName] = useState('')

  function addPhase() {
    if (!newPhaseName.trim()) return
    const newPhase: PhaseItem = {
      id: crypto.randomUUID(),
      name: newPhaseName.trim(),
      description: '',
      sort_order: phases.length,
    }
    onChange([...phases, newPhase])
    setNewPhaseName('')
  }

  function removePhase(id: string) {
    onChange(
      phases
        .filter((p) => p.id !== id)
        .map((p, i) => ({ ...p, sort_order: i }))
    )
  }

  function movePhase(index: number, direction: 'up' | 'down') {
    const newPhases = [...phases]
    const targetIndex = direction === 'up' ? index - 1 : index + 1
    if (targetIndex < 0 || targetIndex >= newPhases.length) return
    ;[newPhases[index], newPhases[targetIndex]] = [newPhases[targetIndex], newPhases[index]]
    onChange(newPhases.map((p, i) => ({ ...p, sort_order: i })))
  }

  return (
    <div className="space-y-3">
      <label className="block text-sm font-medium text-gray-700">Phases</label>

      {phases.length === 0 && (
        <p className="text-sm text-gray-400 italic">No phases added yet</p>
      )}

      <div className="space-y-2">
        {phases.map((phase, index) => (
          <div
            key={phase.id}
            className="flex items-center gap-2 bg-gray-50 rounded-lg p-2"
          >
            <GripVertical className="w-4 h-4 text-gray-400 flex-shrink-0" />
            <span className="text-sm text-gray-500 w-6">{index + 1}.</span>
            <span className="flex-1 text-sm font-medium">{phase.name}</span>
            <div className="flex gap-1">
              <button
                type="button"
                onClick={() => movePhase(index, 'up')}
                disabled={index === 0}
                className="p-1 text-gray-400 hover:text-gray-600 disabled:opacity-30"
                aria-label="Move up"
              >
                &uarr;
              </button>
              <button
                type="button"
                onClick={() => movePhase(index, 'down')}
                disabled={index === phases.length - 1}
                className="p-1 text-gray-400 hover:text-gray-600 disabled:opacity-30"
                aria-label="Move down"
              >
                &darr;
              </button>
              <button
                type="button"
                onClick={() => removePhase(phase.id)}
                className="p-1 text-red-400 hover:text-red-600"
                aria-label="Remove phase"
              >
                <Trash2 className="w-4 h-4" />
              </button>
            </div>
          </div>
        ))}
      </div>

      <div className="flex gap-2">
        <Input
          value={newPhaseName}
          onChange={(e) => setNewPhaseName(e.target.value)}
          placeholder="Phase name (e.g., Rough-in)"
          onKeyDown={(e) => e.key === 'Enter' && (e.preventDefault(), addPhase())}
        />
        <Button type="button" variant="secondary" onClick={addPhase} size="sm">
          <Plus className="w-4 h-4" />
        </Button>
      </div>
    </div>
  )
}
