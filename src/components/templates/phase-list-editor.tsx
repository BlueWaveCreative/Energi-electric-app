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
                aria-expanded={expandedPhaseId === phase.id}
                aria-label={`${phase.name}, ${phase.tasks.length} task${phase.tasks.length !== 1 ? 's' : ''}, ${expandedPhaseId === phase.id ? 'collapse' : 'expand'}`}
                className="flex-1 text-left text-sm font-medium text-gray-900 hover:text-[#045815] transition-colors flex items-center gap-1 cursor-pointer"
              >
                {phase.name}
                <span className="text-xs text-gray-500 font-normal">
                  ({phase.tasks.length} task{phase.tasks.length !== 1 ? 's' : ''})
                </span>
                {expandedPhaseId === phase.id ? (
                  <ChevronUp className="w-3.5 h-3.5 text-gray-500 ml-auto" />
                ) : (
                  <ChevronDown className="w-3.5 h-3.5 text-gray-500 ml-auto" />
                )}
              </button>
              <div className="flex gap-1">
                <button
                  type="button"
                  onClick={() => movePhase(index, 'up')}
                  disabled={index === 0}
                  className="min-w-[44px] min-h-[44px] flex items-center justify-center text-gray-400 hover:text-gray-700 disabled:opacity-30 cursor-pointer disabled:cursor-not-allowed"
                  aria-label={`Move ${phase.name} up`}
                >
                  &uarr;
                </button>
                <button
                  type="button"
                  onClick={() => movePhase(index, 'down')}
                  disabled={index === phases.length - 1}
                  className="min-w-[44px] min-h-[44px] flex items-center justify-center text-gray-400 hover:text-gray-700 disabled:opacity-30 cursor-pointer disabled:cursor-not-allowed"
                  aria-label={`Move ${phase.name} down`}
                >
                  &darr;
                </button>
                <button
                  type="button"
                  onClick={() => removePhase(phase.id)}
                  className="min-w-[44px] min-h-[44px] flex items-center justify-center text-red-400 hover:text-red-600 cursor-pointer"
                  aria-label={`Remove phase: ${phase.name}`}
                >
                  <Trash2 className="w-4 h-4" />
                </button>
              </div>
            </div>

            {/* Expanded task list */}
            {expandedPhaseId === phase.id && (
              <div className="px-4 pb-3 pt-1 border-t border-gray-200 bg-white">
                {phase.tasks.length === 0 && (
                  <p className="text-xs text-gray-500 italic py-1">No tasks — add some below</p>
                )}
                {phase.tasks.map((task) => (
                  <div key={task.id} className="flex items-center gap-2 py-1">
                    <span className="w-4 h-4 rounded border border-gray-300 flex-shrink-0" aria-hidden="true" />
                    <span className="flex-1 text-sm text-gray-700">{task.title}</span>
                    <button
                      type="button"
                      onClick={() => removeTask(phase.id, task.id)}
                      className="min-w-[44px] min-h-[44px] flex items-center justify-center text-red-400 hover:text-red-600 cursor-pointer"
                      aria-label={`Remove task: ${task.title}`}
                    >
                      <Trash2 className="w-3.5 h-3.5" />
                    </button>
                  </div>
                ))}
                <div className="flex gap-2 mt-2">
                  <label htmlFor={`new-task-${phase.id}`} className="sr-only">
                    Add task to {phase.name}
                  </label>
                  <input
                    id={`new-task-${phase.id}`}
                    type="text"
                    value={newTaskTitles[phase.id] ?? ''}
                    onChange={(e) =>
                      setNewTaskTitles((prev) => ({ ...prev, [phase.id]: e.target.value }))
                    }
                    placeholder="Task title..."
                    className="flex-1 px-2 py-1 text-sm border border-gray-300 rounded-lg focus:ring-2 focus:ring-[#045815] focus:border-transparent placeholder:text-gray-400"
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
                    className="px-3 py-1 min-h-[44px] text-xs bg-[#045815] text-white rounded-lg hover:bg-[#023510] disabled:opacity-50 disabled:cursor-not-allowed cursor-pointer"
                    aria-label={`Add task to ${phase.name}`}
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
        <Button type="button" variant="secondary" onClick={addPhase} size="sm" aria-label="Add phase">
          <Plus className="w-4 h-4" aria-hidden="true" />
        </Button>
      </div>
    </div>
  )
}
