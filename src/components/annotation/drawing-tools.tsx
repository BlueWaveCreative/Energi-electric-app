'use client'

import { Pencil, Type, Minus, MousePointer, Undo2, Redo2, Trash2, Save } from 'lucide-react'
import { cn } from '@/lib/utils'

export type DrawingMode = 'select' | 'freehand' | 'line' | 'text'

interface DrawingToolsProps {
  activeMode: DrawingMode
  onModeChange: (mode: DrawingMode) => void
  onUndo: () => void
  onRedo: () => void
  onDelete: () => void
  onSave: () => void
  canUndo: boolean
  canRedo: boolean
  hasSelection: boolean
  saving: boolean
}

const tools = [
  { mode: 'select' as const, icon: MousePointer, label: 'Select' },
  { mode: 'freehand' as const, icon: Pencil, label: 'Draw' },
  { mode: 'line' as const, icon: Minus, label: 'Wire' },
  { mode: 'text' as const, icon: Type, label: 'Text' },
]

export function DrawingTools({
  activeMode,
  onModeChange,
  onUndo,
  onRedo,
  onDelete,
  onSave,
  canUndo,
  canRedo,
  hasSelection,
  saving,
}: DrawingToolsProps) {
  return (
    <div className="flex items-center gap-1 bg-white border border-gray-200 rounded-lg p-1">
      {/* Drawing mode tools */}
      {tools.map(({ mode, icon: Icon, label }) => (
        <button
          key={mode}
          onClick={() => onModeChange(mode)}
          title={label}
          className={cn(
            'p-2 rounded-md transition-colors',
            activeMode === mode
              ? 'bg-blue-100 text-blue-700'
              : 'text-gray-500 hover:bg-gray-100'
          )}
        >
          <Icon className="w-5 h-5" />
        </button>
      ))}

      <div className="w-px h-6 bg-gray-200 mx-1" />

      {/* Undo/Redo */}
      <button
        onClick={onUndo}
        disabled={!canUndo}
        title="Undo"
        className="p-2 rounded-md text-gray-500 hover:bg-gray-100 disabled:opacity-30"
      >
        <Undo2 className="w-5 h-5" />
      </button>
      <button
        onClick={onRedo}
        disabled={!canRedo}
        title="Redo"
        className="p-2 rounded-md text-gray-500 hover:bg-gray-100 disabled:opacity-30"
      >
        <Redo2 className="w-5 h-5" />
      </button>

      {/* Delete selected */}
      <button
        onClick={onDelete}
        disabled={!hasSelection}
        title="Delete selected"
        className="p-2 rounded-md text-red-500 hover:bg-red-50 disabled:opacity-30"
      >
        <Trash2 className="w-5 h-5" />
      </button>

      <div className="w-px h-6 bg-gray-200 mx-1" />

      {/* Save */}
      <button
        onClick={onSave}
        disabled={saving}
        title="Save annotations"
        className="p-2 rounded-md text-green-600 hover:bg-green-50 disabled:opacity-50"
      >
        <Save className="w-5 h-5" />
      </button>
    </div>
  )
}
