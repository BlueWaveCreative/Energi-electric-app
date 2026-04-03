'use client'

import { useEffect, useRef, useState, useCallback } from 'react'
import { Canvas, FabricImage, PencilBrush, Line, IText, Path, Point } from 'fabric'
import { useSupabase } from '@/hooks/use-supabase'
import { getSignedUrl } from '@/lib/storage'
import { SymbolToolbar } from './symbol-toolbar'
import { DrawingTools, type DrawingMode } from './drawing-tools'
import type { ElectricalSymbol } from './symbol-definitions'
import type { Annotation } from '@/lib/types/database'

interface PlanCanvasProps {
  planId: string
  filePath: string
  annotations: Annotation[]
  userId: string
}

export function PlanCanvas({ planId, filePath, annotations, userId }: PlanCanvasProps) {
  const supabase = useSupabase()
  const canvasRef = useRef<HTMLCanvasElement>(null)
  const fabricRef = useRef<Canvas | null>(null)
  const containerRef = useRef<HTMLDivElement>(null)
  const [drawingMode, setDrawingMode] = useState<DrawingMode>('select')
  const [activeColor, setActiveColor] = useState('#000000')
  const [hasSelection, setHasSelection] = useState(false)
  const [saving, setSaving] = useState(false)
  const [undoStack, setUndoStack] = useState<string[]>([])
  const [redoStack, setRedoStack] = useState<string[]>([])
  const bgImgRef = useRef<FabricImage | null>(null)
  const [annotationId, setAnnotationId] = useState<string | null>(
    annotations.find((a) => a.user_id === userId)?.id ?? null
  )

  // Initialize canvas
  useEffect(() => {
    if (!canvasRef.current || !containerRef.current) return

    const container = containerRef.current
    const canvas = new Canvas(canvasRef.current, {
      width: container.clientWidth,
      height: container.clientHeight,
      selection: true,
    })

    fabricRef.current = canvas

    // Load background image first, then annotations
    async function loadBackgroundAndAnnotations() {
      const url = await getSignedUrl(filePath)
      const bgImg = await FabricImage.fromURL(url, { crossOrigin: 'anonymous' })

      // Scale image to fit canvas
      const scale = Math.min(
        canvas.width! / bgImg.width!,
        canvas.height! / bgImg.height!
      )
      bgImg.scale(scale)
      bgImg.set({
        selectable: false,
        evented: false,
        originX: 'left',
        originY: 'top',
      })

      canvas.backgroundImage = bgImg
      bgImgRef.current = bgImg
      canvas.renderAll()

      // Load existing annotations after background is set — prefer current user's annotation
      if (annotations.length > 0) {
        const myAnnotation = annotations.find((a) => a.user_id === userId)
        if (myAnnotation?.canvas_data && Object.keys(myAnnotation.canvas_data).length > 0) {
          await canvas.loadFromJSON(myAnnotation.canvas_data)
          canvas.backgroundImage = bgImg
          canvas.renderAll()
        }
      }
    }

    loadBackgroundAndAnnotations()

    // Track selection
    canvas.on('selection:created', () => setHasSelection(true))
    canvas.on('selection:cleared', () => setHasSelection(false))

    // Save undo state on object changes
    canvas.on('object:modified', () => {
      saveUndoState(canvas)
    })
    canvas.on('object:added', () => {
      saveUndoState(canvas)
    })

    // Handle resize
    function handleResize() {
      canvas.setDimensions({
        width: container.clientWidth,
        height: container.clientHeight,
      })
      canvas.renderAll()
    }
    window.addEventListener('resize', handleResize)

    // Pinch zoom for mobile
    let lastDistance = 0
    // @ts-expect-error — Fabric.js supports touch:gesture but types don't include it
    canvas.on('touch:gesture', (e: any) => {
      if (e.e.touches?.length === 2) {
        const touch1 = e.e.touches[0]
        const touch2 = e.e.touches[1]
        const distance = Math.hypot(
          touch2.clientX - touch1.clientX,
          touch2.clientY - touch1.clientY
        )
        if (lastDistance) {
          const zoom = canvas.getZoom() * (distance / lastDistance)
          canvas.zoomToPoint(
            new Point(canvas.width! / 2, canvas.height! / 2),
            Math.max(0.5, Math.min(5, zoom))
          )
        }
        lastDistance = distance
      }
    })
    // @ts-expect-error — Fabric.js supports touch:end but types don't include it
    canvas.on('touch:end', () => { lastDistance = 0 })

    // Scroll zoom for desktop
    canvas.on('mouse:wheel', (opt) => {
      const delta = opt.e.deltaY
      let zoom = canvas.getZoom()
      zoom *= 0.999 ** delta
      zoom = Math.max(0.5, Math.min(5, zoom))
      canvas.zoomToPoint(new Point(opt.e.offsetX, opt.e.offsetY), zoom)
      opt.e.preventDefault()
      opt.e.stopPropagation()
    })

    return () => {
      window.removeEventListener('resize', handleResize)
      canvas.dispose()
    }
  }, [filePath, annotations])

  function saveUndoState(canvas: Canvas) {
    const json = JSON.stringify(canvas.toJSON())
    setUndoStack((prev) => [...prev.slice(-20), json])
    setRedoStack([])
  }

  // Update drawing mode
  useEffect(() => {
    const canvas = fabricRef.current
    if (!canvas) return

    canvas.isDrawingMode = drawingMode === 'freehand'
    canvas.selection = drawingMode === 'select'

    if (drawingMode === 'freehand') {
      const brush = new PencilBrush(canvas)
      brush.color = activeColor
      brush.width = 3
      canvas.freeDrawingBrush = brush
    }
  }, [drawingMode, activeColor])

  const handleSelectSymbol = useCallback((symbol: ElectricalSymbol) => {
    const canvas = fabricRef.current
    if (!canvas) return

    const path = new Path(symbol.svgPath, {
      fill: 'transparent',
      stroke: activeColor,
      strokeWidth: 2,
      left: canvas.width! / 2 - symbol.width / 2,
      top: canvas.height! / 2 - symbol.height / 2,
      scaleX: 1,
      scaleY: 1,
    })

    canvas.add(path)
    canvas.setActiveObject(path)
    canvas.renderAll()
    setDrawingMode('select')
  }, [activeColor])

  function handleModeChange(mode: DrawingMode) {
    const canvas = fabricRef.current
    if (!canvas) return

    if (mode === 'text') {
      const text = new IText('Label', {
        left: canvas.width! / 2 - 30,
        top: canvas.height! / 2 - 10,
        fontSize: 16,
        fill: activeColor,
        fontFamily: 'Arial',
      })
      canvas.add(text)
      canvas.setActiveObject(text)
      canvas.renderAll()
      setDrawingMode('select')
    } else if (mode === 'line') {
      const line = new Line([100, 100, 300, 100], {
        stroke: activeColor,
        strokeWidth: 2,
        strokeDashArray: undefined,
      })
      canvas.add(line)
      canvas.setActiveObject(line)
      canvas.renderAll()
      setDrawingMode('select')
    } else {
      setDrawingMode(mode)
    }
  }

  function handleUndo() {
    const canvas = fabricRef.current
    if (!canvas || undoStack.length === 0) return

    const currentState = JSON.stringify(canvas.toJSON())
    setRedoStack((prev) => [...prev, currentState])

    const previousState = undoStack[undoStack.length - 1]
    setUndoStack((prev) => prev.slice(0, -1))

    canvas.loadFromJSON(JSON.parse(previousState)).then(() => {
      if (bgImgRef.current) canvas.backgroundImage = bgImgRef.current
      canvas.renderAll()
    })
  }

  function handleRedo() {
    const canvas = fabricRef.current
    if (!canvas || redoStack.length === 0) return

    const currentState = JSON.stringify(canvas.toJSON())
    setUndoStack((prev) => [...prev, currentState])

    const nextState = redoStack[redoStack.length - 1]
    setRedoStack((prev) => prev.slice(0, -1))

    canvas.loadFromJSON(JSON.parse(nextState)).then(() => {
      if (bgImgRef.current) canvas.backgroundImage = bgImgRef.current
      canvas.renderAll()
    })
  }

  function handleDelete() {
    const canvas = fabricRef.current
    if (!canvas) return

    const active = canvas.getActiveObjects()
    active.forEach((obj) => canvas.remove(obj))
    canvas.discardActiveObject()
    canvas.renderAll()
  }

  async function handleSave() {
    const canvas = fabricRef.current
    if (!canvas) return

    setSaving(true)
    const canvasData = canvas.toJSON()

    // Upsert annotation for this user on this plan
    if (annotationId) {
      await supabase
        .from('annotations')
        .update({
          canvas_data: canvasData,
          updated_at: new Date().toISOString(),
        })
        .eq('id', annotationId)
    } else {
      const { data } = await supabase.from('annotations').insert({
        plan_id: planId,
        user_id: userId,
        canvas_data: canvasData,
      }).select('id').single()

      if (data) setAnnotationId(data.id)
    }

    setSaving(false)
  }

  return (
    <div className="flex flex-col h-[calc(100vh-120px)] md:flex-row gap-3">
      {/* Tools */}
      <div className="flex md:flex-col gap-2 overflow-x-auto md:overflow-visible md:w-64 flex-shrink-0">
        <DrawingTools
          activeMode={drawingMode}
          onModeChange={handleModeChange}
          onUndo={handleUndo}
          onRedo={handleRedo}
          onDelete={handleDelete}
          onSave={handleSave}
          canUndo={undoStack.length > 0}
          canRedo={redoStack.length > 0}
          hasSelection={hasSelection}
          saving={saving}
        />
        <SymbolToolbar
          onSelectSymbol={handleSelectSymbol}
          activeColor={activeColor}
          onColorChange={setActiveColor}
        />
      </div>

      {/* Canvas */}
      <div ref={containerRef} className="flex-1 bg-gray-100 rounded-lg overflow-hidden relative">
        <canvas ref={canvasRef} />
      </div>
    </div>
  )
}
