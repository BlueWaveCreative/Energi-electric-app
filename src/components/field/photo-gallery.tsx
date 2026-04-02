'use client'

import { useState, useEffect, useRef } from 'react'
import { X, Trash2, CheckSquare, Square } from 'lucide-react'
import { useSupabase } from '@/hooks/use-supabase'
import { getSignedUrl } from '@/lib/storage'
import { formatDate } from '@/lib/utils'
import { Button } from '@/components/ui/button'
import type { Photo, Profile } from '@/lib/types/database'

interface PhotoWithUser extends Photo {
  profiles: Pick<Profile, 'name'>
}

interface PhotoGalleryProps {
  photos: PhotoWithUser[]
  onDelete?: (photoId: string) => void
  onDeleteMultiple?: (photoIds: string[]) => void
}

export function PhotoGallery({ photos, onDelete, onDeleteMultiple }: PhotoGalleryProps) {
  const supabase = useSupabase()
  const [selectedPhoto, setSelectedPhoto] = useState<PhotoWithUser | null>(null)
  const [urls, setUrls] = useState<Record<string, string>>({})
  const [selectMode, setSelectMode] = useState(false)
  const [selectedIds, setSelectedIds] = useState<Set<string>>(new Set())

  useEffect(() => {
    async function loadUrls() {
      const entries = await Promise.all(
        photos.map(async (photo) => {
          try {
            const path = photo.thumbnail_path ?? photo.file_path
            const url = await getSignedUrl(supabase, path)
            return [photo.id, url] as const
          } catch {
            return [photo.id, ''] as const
          }
        })
      )
      setUrls(Object.fromEntries(entries))
    }
    if (photos.length > 0) loadUrls()
  }, [photos, supabase])

  function toggleSelect(id: string) {
    const next = new Set(selectedIds)
    if (next.has(id)) next.delete(id)
    else next.add(id)
    setSelectedIds(next)
  }

  function handleBulkDelete() {
    if (selectedIds.size === 0) return
    if (!confirm(`Delete ${selectedIds.size} photo${selectedIds.size > 1 ? 's' : ''}?`)) return
    onDeleteMultiple?.(Array.from(selectedIds))
    setSelectedIds(new Set())
    setSelectMode(false)
  }

  if (photos.length === 0) {
    return <p className="text-sm text-gray-500 italic">No photos yet</p>
  }

  const canDelete = !!onDelete || !!onDeleteMultiple

  return (
    <>
      {/* Bulk actions bar */}
      {canDelete && (
        <div className="flex items-center gap-2 mb-2">
          {selectMode ? (
            <>
              <Button
                variant="danger"
                size="sm"
                onClick={handleBulkDelete}
                disabled={selectedIds.size === 0}
              >
                <Trash2 className="w-4 h-4 mr-1" />
                Delete {selectedIds.size > 0 ? `(${selectedIds.size})` : ''}
              </Button>
              <Button variant="secondary" size="sm" onClick={() => {
                setSelectMode(false)
                setSelectedIds(new Set())
              }}>
                Cancel
              </Button>
              <Button variant="ghost" size="sm" onClick={() => {
                if (selectedIds.size === photos.length) {
                  setSelectedIds(new Set())
                } else {
                  setSelectedIds(new Set(photos.map(p => p.id)))
                }
              }}>
                {selectedIds.size === photos.length ? 'Deselect All' : 'Select All'}
              </Button>
            </>
          ) : (
            <Button variant="ghost" size="sm" onClick={() => setSelectMode(true)}>
              <CheckSquare className="w-4 h-4 mr-1" /> Select
            </Button>
          )}
        </div>
      )}

      <div className="grid grid-cols-3 md:grid-cols-4 gap-2">
        {photos.map((photo) => (
          <button
            key={photo.id}
            onClick={() => {
              if (selectMode) {
                toggleSelect(photo.id)
              } else {
                setSelectedPhoto(photo)
              }
            }}
            className="relative aspect-square rounded-lg overflow-hidden bg-gray-100 hover:opacity-80 transition-opacity"
          >
            {urls[photo.id] ? (
              <img
                src={urls[photo.id]}
                alt={photo.caption ?? 'Project photo'}
                className="w-full h-full object-cover"
              />
            ) : (
              <div className="w-full h-full animate-pulse bg-gray-200" />
            )}
            {/* Selection checkbox overlay */}
            {selectMode && (
              <div className="absolute top-1 left-1">
                {selectedIds.has(photo.id) ? (
                  <CheckSquare className="w-6 h-6 text-[#68BD45] drop-shadow-md" />
                ) : (
                  <Square className="w-6 h-6 text-white drop-shadow-md" />
                )}
              </div>
            )}
          </button>
        ))}
      </div>

      {selectedPhoto && (
        <LightBox
          photo={selectedPhoto}
          onClose={() => setSelectedPhoto(null)}
          onDelete={onDelete ? () => {
            onDelete(selectedPhoto.id)
            setSelectedPhoto(null)
          } : undefined}
        />
      )}
    </>
  )
}

function LightBox({
  photo,
  onClose,
  onDelete,
}: {
  photo: PhotoWithUser
  onClose: () => void
  onDelete?: () => void
}) {
  const supabase = useSupabase()
  const [fullUrl, setFullUrl] = useState<string>('')
  const overlayRef = useRef<HTMLDivElement>(null)

  useEffect(() => {
    getSignedUrl(supabase, photo.file_path).then(setFullUrl)
  }, [photo, supabase])

  useEffect(() => {
    overlayRef.current?.focus()
  }, [])

  return (
    <div
      ref={overlayRef}
      className="fixed inset-0 bg-black/90 z-50 flex items-center justify-center p-4"
      onClick={onClose}
      onKeyDown={(e) => e.key === 'Escape' && onClose()}
      role="dialog"
      aria-modal="true"
      aria-label="Photo viewer"
      tabIndex={-1}
    >
      <button
        onClick={onClose}
        className="absolute top-4 right-4 p-2 text-white hover:bg-white/20 rounded-full"
        aria-label="Close"
      >
        <X className="w-6 h-6" />
      </button>

      <div className="max-w-full max-h-full" onClick={(e) => e.stopPropagation()}>
        {fullUrl ? (
          <img
            src={fullUrl}
            alt={photo.caption ?? 'Project photo'}
            className="max-w-full max-h-[80vh] object-contain rounded-lg"
          />
        ) : (
          <div className="w-64 h-64 animate-pulse bg-gray-700 rounded-lg" />
        )}
        <div className="text-center mt-3">
          {photo.caption && <p className="text-white text-sm">{photo.caption}</p>}
          <p className="text-gray-400 text-xs mt-1">
            {photo.profiles?.name} — {formatDate(new Date(photo.created_at))}
          </p>
          {onDelete && (
            <button
              onClick={onDelete}
              className="mt-3 inline-flex items-center gap-1 px-3 py-2 text-sm text-red-400 hover:text-red-300 hover:bg-red-900/30 rounded-lg transition-colors"
              aria-label="Delete photo"
            >
              <Trash2 className="w-4 h-4" /> Delete
            </button>
          )}
        </div>
      </div>
    </div>
  )
}
