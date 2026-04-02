'use client'

import { useRef } from 'react'
import { Camera, ImagePlus } from 'lucide-react'
import { Button } from '@/components/ui/button'

interface PhotoCaptureProps {
  onCapture: (file: File) => Promise<void>
  disabled?: boolean
}

export function PhotoCapture({ onCapture, disabled }: PhotoCaptureProps) {
  const cameraRef = useRef<HTMLInputElement>(null)
  const fileRef = useRef<HTMLInputElement>(null)

  async function handleFile(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0]
    if (!file) return
    await onCapture(file)
    e.target.value = ''
  }

  return (
    <div className="flex gap-2">
      {/* Camera capture (mobile) */}
      <input
        ref={cameraRef}
        type="file"
        accept="image/*"
        capture="environment"
        onChange={handleFile}
        className="hidden"
      />
      <Button
        type="button"
        variant="secondary"
        size="sm"
        disabled={disabled}
        onClick={() => cameraRef.current?.click()}
        className="md:hidden"
      >
        <Camera className="w-4 h-4 mr-1" /> Camera
      </Button>

      {/* File upload (desktop + mobile fallback) */}
      <input
        ref={fileRef}
        type="file"
        accept="image/*"
        onChange={handleFile}
        className="hidden"
      />
      <Button
        type="button"
        variant="secondary"
        size="sm"
        disabled={disabled}
        onClick={() => fileRef.current?.click()}
      >
        <ImagePlus className="w-4 h-4 mr-1" /> Upload
      </Button>
    </div>
  )
}
