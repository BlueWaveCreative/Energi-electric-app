'use client'

import { Eye, EyeOff } from 'lucide-react'
import { cn } from '@/lib/utils'

export interface Layer {
  id: string
  name: string
  visible: boolean
  color: string
}

interface LayerPanelProps {
  layers: Layer[]
  onToggleLayer: (layerId: string) => void
}

export function LayerPanel({ layers, onToggleLayer }: LayerPanelProps) {
  if (layers.length === 0) return null

  return (
    <div className="bg-white border border-gray-200 rounded-lg p-3">
      <p className="text-xs font-medium text-gray-500 uppercase tracking-wide mb-2">Layers</p>
      <div className="space-y-1">
        {layers.map((layer) => (
          <button
            key={layer.id}
            onClick={() => onToggleLayer(layer.id)}
            className={cn(
              'flex items-center gap-2 w-full px-2 py-1.5 rounded-md text-sm transition-colors',
              layer.visible
                ? 'text-gray-700 hover:bg-gray-50'
                : 'text-gray-400 hover:bg-gray-50'
            )}
          >
            {layer.visible ? (
              <Eye className="w-4 h-4 flex-shrink-0" />
            ) : (
              <EyeOff className="w-4 h-4 flex-shrink-0" />
            )}
            <span
              className="w-3 h-3 rounded-full flex-shrink-0"
              style={{ backgroundColor: layer.color }}
            />
            <span className="truncate">{layer.name}</span>
          </button>
        ))}
      </div>
    </div>
  )
}
