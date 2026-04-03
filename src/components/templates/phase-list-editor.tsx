'use client'

import { useState } from 'react'
import { Plus, GripVertical, Trash2, ChevronDown, ChevronUp } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'

export interface TaskItem {
  id: string
  title: string
  sort_order: number
}

export interface PhaseItem {
  id: string
  name: string
  description: string
  sort_order: number
  tasks: TaskItem[]
}

interface PhaseListEditorProps {
  phases: PhaseItem[]
  onChange: (phases: PhaseItem[]) => void
}

export function PhaseListEditor({ phases, onChange }: PhaseListEditorProps) {
  const [newPhaseName, setNewPhaseName] = useState('')
  const [expandedPhaseId, setExpandedPhaseId] = useState<string | null>(null)
  const [newTaskTitles, setNewTaskTitles] = useState<Record<string, string>>({})

  function addPhase() {
    if (!newPhaseName.trim()) return
    const newPhase: PhaseItem = {
      id: crypto.randomUUID(),
      name: newPhaseName.trim(),
      description: '',
      sort_order: phases.length,
      tasks: [],
    }
    onChange([...phases, newPhase])
    setNewPhaseName('')
    setExpandedPhaseId(newPhase.id)
  }

  function removePhase(id: string) {
    onChange(
      phases
        .filter((p) => p.id !== id)
        .map((p, i) => ({ ...p, sort_order: i }))
    )
    if (expandedPhaseId === id) setExpandedPhaseId(null)
  }

  function movePhase(index: number, direction: 'up' | 'down') {
    const newPhases = [...phases]
    const targetIndex = direction === 'up' ? index - 1 : index + 1
    if (targetIndex < 0 || targetIndex >= newPhases.length) return
    ;[newPhases[index], newPhases[targetIndex]] = [newPhases[targetIndex], newPhases[index]]
    onChange(newPhases.map((p, i) => ({ ...p, sort_order: i })))
  }

  function addTask(phaseId: string) {
    const title = newTaskTitles[phaseId]?.trim()
    if (!title) return
    onChange(
      phases.map((p) =>
        p.id === phaseId
          ? {
              ...p,
              tasks: [
                ...p.tasks,
                { id: crypto.randomUUID(), title, sort_order: p.tasks.length },
              ],
            }
          : p
      )
    )
    setNewTaskTitles((prev) => ({ ...prev, [phaseId]: '' }))
  }

  function removeTask(phaseId: string, taskId: string) {
    onChange(
      phases.map((p) =>
        p.id === phaseId
          ? {
              ...p,
              tasks: p.tasks
                .filter((t) => t.id !== taskId)
                .map((t, i) => ({ ...t, sort_order: i })),
            }
          : p
      )
    )
  }

  return (
    <div className="space-y-3">
      <label className="block text-sm font-medium text-gray-700">Phases & Tasks</label>

      {phases.length === 0 && (
        <p className="text-sm text-gray-500 italic">No phases added yet</p>
      )}

      <div className="space-y-2">
        {phases.map((phase, index) => (
          <div key={phase.id} className="bg-gray-50 rounded-lg overflow-hidden">
            {/* Phase row */}
            <div className="flex items-center gap-2 p-2">
              <GripVertical className="w-4 h-4 text-gray-400 flex-shrink-0" aria-hidden="true" />
              <span className="text-sm text-gray-500 w-6">{index + 1}.</span>
              <button
                type="button"
                onClick={() => setExpandedPhaseId(expandedPhaseId === phase.id ? null : phase.id)}
                className="flex-1 text-left text-sm font-medium text-gray-900 hover:text-[#68BD45] transition-colors flex items-center gap-1"
              >
                {phase.name}
                <span className="text-xs text-gray-400 font-normal">
                  ({phase.tasks.length} task{phase.tasks.length !== 1 ? 's' : ''})
                </span>
                {expandedPhaseId === phase.id ? (
                  <ChevronUp className="w-3.5 h-3.5 text-gray-400 ml-auto" />
                ) : (
                  <ChevronDown className="w-3.5 h-3.5 text-gray-400 ml-auto" />
                )}
              </button>
              <div className="flex gap-1">
                <button
                  type="button"
                  onClick={() => movePhase(index, 'up')}
                  disabled={index === 0}
                  className="p-1 text-gray-400 hover:text-gray-700 disabled:opacity-30"
                  aria-label="Move up"
                >
                  &uarr;
                </button>
                <button
                  type="button"
                  onClick={() => movePhase(index, 'down')}
                  disabled={index === phases.length - 1}
                  className="p-1 text-gray-400 hover:text-gray-700 disabled:opacity-30"
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

            {/* Expanded task list */}
            {expandedPhaseId === phase.id && (
              <div className="px-4 pb-3 pt-1 border-t border-gray-200 bg-white">
                {phase.tasks.length === 0 && (
                  <p className="text-xs text-gray-400 italic py-1">No tasks — add some below</p>
                )}
                {phase.tasks.map((task) => (
                  <div key={task.id} className="flex items-center gap-2 py-1">
                    <span className="w-4 h-4 rounded border border-gray-300 flex-shrink-0" />
                    <span className="flex-1 text-sm text-gray-700">{task.title}</span>
                    <button
                      type="button"
                      onClick={() => removeTask(phase.id, task.id)}
                      className="p-0.5 text-red-400 hover:text-red-600"
                      aria-label={`Remove task: ${task.title}`}
                    >
                      <Trash2 className="w-3.5 h-3.5" />
                    </button>
                  </div>
                ))}
                <div className="flex gap-2 mt-2">
                  <input
                    type="text"
                    value={newTaskTitles[phase.id] ?? ''}
                    onChange={(e) =>
                      setNewTaskTitles((prev) => ({ ...prev, [phase.id]: e.target.value }))
                    }
                    placeholder="Task title..."
                    className="flex-1 px-2 py-1 text-sm border border-gray-300 rounded-lg focus:ring-2 focus:ring-[#68BD45] focus:border-transparent placeholder:text-gray-400"
                    onKeyDown={(e) => {
                      if (e.key === 'Enter') {
                        e.preventDefault()
                        addTask(phase.id)
                      }
                    }}
                  />
                  <button
                    type="button"
                    onClick={() => addTask(phase.id)}
                    disabled={!newTaskTitles[phase.id]?.trim()}
                    className="px-2 py-1 text-xs bg-[#68BD45] text-white rounded-lg hover:bg-[#5aa83c] disabled:opacity-50 disabled:cursor-not-allowed"
                  >
                    Add
                  </button>
                </div>
              </div>
            )}
          </div>
        ))}
      </div>

      <div className="flex gap-2">
        <Input
          id="new-phase"
          label="New phase name"
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
