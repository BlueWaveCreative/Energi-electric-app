'use client'

import { useState, useCallback } from 'react'
import { Upload, FileImage, Loader2 } from 'lucide-react'
import { useSupabase } from '@/hooks/use-supabase'
import { useRouter } from 'next/navigation'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { isPdfFile, pdfToImages, dataUrlToBlob } from '@/lib/pdf-to-image'

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
    setUploading(true)

    try {
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
        const ext = selectedFile.name.split('.').pop() ?? 'png'
        filePath = `projects/${projectId}/plans/${Date.now()}.${ext}`
      }

      setProgress('Uploading...')
      const { error: uploadError } = await supabase.storage
        .from('project-files')
        .upload(filePath, uploadFile, {
          contentType: uploadFile instanceof File ? uploadFile.type : 'image/png',
        })

      if (uploadError) throw uploadError

      setProgress('Saving...')
      const { error: dbError } = await supabase.from('plans').insert({
        project_id: projectId,
        name: name.trim(),
        file_path: filePath,
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
        className={`border-2 border-dashed rounded-lg p-8 text-center transition-colors ${
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
          onChange={(e) => {
            const file = e.target.files?.[0]
            if (file) handleFile(file)
            e.target.value = ''
          }}
          className="absolute inset-0 opacity-0 cursor-pointer"
          style={{ position: 'relative' }}
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
