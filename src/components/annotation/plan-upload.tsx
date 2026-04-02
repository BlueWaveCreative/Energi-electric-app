'use client'

import { useState, useCallback } from 'react'
import { Upload, FileImage, Loader2 } from 'lucide-react'
import { useSupabase } from '@/hooks/use-supabase'
import { useRouter } from 'next/navigation'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { isPdfFile, pdfToImages, dataUrlToBlob } from '@/lib/pdf-to-image'
import { uploadPlanFile } from '@/lib/storage'

interface PlanUploadProps {
  projectId: string
}

export function PlanUpload({ projectId }: PlanUploadProps) {
  const supabase = useSupabase()
  const router = useRouter()
  const [uploading, setUploading] = useState(false)
  const [name, setName] = useState('')
  const [dragOver, setDragOver] = useState(false)
  const [selectedFile, setSelectedFile] = useState<File | null>(null)
  const [progress, setProgress] = useState('')

  const handleFile = useCallback((file: File) => {
    setSelectedFile(file)
    if (!name) setName(file.name.replace(/\.[^/.]+$/, ''))
  }, [name])

  async function handleUpload() {
    if (!selectedFile || !name.trim()) return

    const ALLOWED_PLAN_MIMES = ['image/png', 'image/jpeg', 'image/webp', 'application/pdf']
    const MAX_PLAN_SIZE = 50 * 1024 * 1024

    if (!ALLOWED_PLAN_MIMES.includes(selectedFile.type)) {
      setProgress('Error: Only PDF, PNG, JPG, or WebP files are accepted.')
      return
    }
    if (selectedFile.size > MAX_PLAN_SIZE) {
      setProgress(`Error: File size exceeds the 50 MB limit.`)
      return
    }

    setUploading(true)

    try {
      const { data: { user } } = await supabase.auth.getUser()

      if (!user) {
        setProgress('Error: Session expired. Please log in again.')
        setUploading(false)
        return
      }

      let uploadFile: File | Blob = selectedFile
      let filePath: string

      if (isPdfFile(selectedFile.name)) {
        setProgress('Converting PDF...')
        const images = await pdfToImages(selectedFile)
        if (images.length === 0) throw new Error('PDF has no pages')

        // Upload first page as the plan image
        uploadFile = dataUrlToBlob(images[0])
        filePath = `projects/${projectId}/plans/${Date.now()}.png`
      } else {
        const PLAN_MIME_TO_EXT: Record<string, string> = {
          'image/png': 'png',
          'image/jpeg': 'jpg',
          'image/webp': 'webp',
        }
        const ext = PLAN_MIME_TO_EXT[selectedFile.type] ?? 'png'
        filePath = `projects/${projectId}/plans/${Date.now()}.${ext}`
      }

      setProgress('Uploading...')
      await uploadPlanFile(uploadFile, filePath)

      setProgress('Saving...')

      const { error: dbError } = await supabase.from('plans').insert({
        project_id: projectId,
        name: name.trim(),
        file_path: filePath,
        uploaded_by: user.id,
      })

      if (dbError) throw dbError

      router.refresh()
      setSelectedFile(null)
      setName('')
      setProgress('')
    } catch (err) {
      setProgress(`Error: ${err instanceof Error ? err.message : 'Upload failed'}`)
    } finally {
      setUploading(false)
    }
  }

  return (
    <div className="space-y-4">
      {/* Drop zone */}
      <div
        onDragOver={(e) => { e.preventDefault(); setDragOver(true) }}
        onDragLeave={() => setDragOver(false)}
        onDrop={(e) => {
          e.preventDefault()
          setDragOver(false)
          const file = e.dataTransfer.files[0]
          if (file) handleFile(file)
        }}
        className={`relative border-2 border-dashed rounded-lg p-8 text-center transition-colors ${
          dragOver ? 'border-blue-500 bg-blue-50' : 'border-gray-300'
        }`}
      >
        {selectedFile ? (
          <div className="flex items-center justify-center gap-3">
            <FileImage className="w-8 h-8 text-blue-500" />
            <div className="text-left">
              <p className="font-medium">{selectedFile.name}</p>
              <p className="text-sm text-gray-500">
                {(selectedFile.size / (1024 * 1024)).toFixed(1)} MB
              </p>
            </div>
          </div>
        ) : (
          <>
            <Upload className="w-10 h-10 text-gray-400 mx-auto mb-2" />
            <p className="text-gray-600">Drop a blueprint here or click to browse</p>
            <p className="text-sm text-gray-400 mt-1">PDF, PNG, or JPG</p>
          </>
        )}

        <input
          type="file"
          accept=".pdf,.png,.jpg,.jpeg,.webp"
          aria-label="Choose a blueprint file to upload"
          onChange={(e) => {
            const file = e.target.files?.[0]
            if (file) handleFile(file)
            e.target.value = ''
          }}
          className="absolute inset-0 opacity-0 cursor-pointer"
        />
      </div>

      {selectedFile && (
        <>
          <Input
            id="plan-name"
            label="Plan Name"
            value={name}
            onChange={(e) => setName(e.target.value)}
            placeholder="e.g., First Floor Electrical"
            required
          />

          <div className="flex items-center gap-3">
            <Button onClick={handleUpload} disabled={uploading || !name.trim()}>
              {uploading ? (
                <>
                  <Loader2 className="w-4 h-4 mr-2 animate-spin" /> {progress}
                </>
              ) : (
                'Upload Plan'
              )}
            </Button>
            <Button
              variant="secondary"
              onClick={() => {
                setSelectedFile(null)
                setName('')
              }}
            >
              Cancel
            </Button>
          </div>
        </>
      )}
    </div>
  )
}
