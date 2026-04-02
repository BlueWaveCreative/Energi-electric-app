'use client'

import { useState } from 'react'
import { PlanCanvas } from './plan-canvas'
import { LayerPanel, type Layer } from './layer-panel'
import type { Annotation } from '@/lib/types/database'

interface PlanViewerPageProps {
  planId: string
  planName: string
  filePath: string
  annotations: Annotation[]
  userId: string
}

export function PlanViewerPage({
  planId,
  planName,
  filePath,
  annotations,
  userId,
}: PlanViewerPageProps) {
  const [layers, setLayers] = useState<Layer[]>([
    { id: 'electrical', name: 'Electrical', visible: true, color: '#000000' },
    { id: 'notes', name: 'Notes', visible: true, color: '#0066cc' },
  ])

  function handleToggleLayer(layerId: string) {
    setLayers((prev) =>
      prev.map((l) => (l.id === layerId ? { ...l, visible: !l.visible } : l))
    )
  }

  return (
    <div className="flex flex-col h-full">
      <div className="flex-1 p-3">
        <div className="flex gap-3 h-full">
          <div className="flex-1">
            <PlanCanvas
              planId={planId}
              filePath={filePath}
              annotations={annotations}
              userId={userId}
            />
          </div>
          <div className="hidden md:block w-48 flex-shrink-0">
            <LayerPanel layers={layers} onToggleLayer={handleToggleLayer} />
          </div>
        </div>
      </div>
    </div>
  )
}
