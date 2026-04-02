'use client'

import { useState, useEffect } from 'react'
import { X } from 'lucide-react'
import { useSupabase } from '@/hooks/use-supabase'
import { getSignedUrl } from '@/lib/storage'
import { formatDate } from '@/lib/utils'
import type { Photo, Profile } from '@/lib/types/database'

interface PhotoWithUser extends Photo {
  profiles: Pick<Profile, 'name'>
}

interface PhotoGalleryProps {
  photos: PhotoWithUser[]
}

export function PhotoGallery({ photos }: PhotoGalleryProps) {
  const supabase = useSupabase()
  const [selectedPhoto, setSelectedPhoto] = useState<PhotoWithUser | null>(null)
  const [urls, setUrls] = useState<Record<string, string>>({})

  useEffect(() => {
    async function loadUrls() {
      const urlMap: Record<string, string> = {}
      for (const photo of photos) {
        const path = photo.thumbnail_path ?? photo.file_path
        urlMap[photo.id] = await getSignedUrl(supabase, path)
      }
      setUrls(urlMap)
    }
    if (photos.length > 0) loadUrls()
  }, [photos, supabase])

  if (photos.length === 0) {
    return <p className="text-sm text-gray-400 italic">No photos yet</p>
  }

  return (
    <>
      <div className="grid grid-cols-3 md:grid-cols-4 gap-2">
        {photos.map((photo) => (
          <button
            key={photo.id}
            onClick={() => setSelectedPhoto(photo)}
            className="aspect-square rounded-lg overflow-hidden bg-gray-100 hover:opacity-80 transition-opacity"
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
          </button>
        ))}
      </div>

      {selectedPhoto && (
        <LightBox photo={selectedPhoto} onClose={() => setSelectedPhoto(null)} />
      )}
    </>
  )
}

function LightBox({
  photo,
  onClose,
}: {
  photo: PhotoWithUser
  onClose: () => void
}) {
  const supabase = useSupabase()
  const [fullUrl, setFullUrl] = useState<string>('')

  useEffect(() => {
    getSignedUrl(supabase, photo.file_path).then(setFullUrl)
  }, [photo, supabase])

  return (
    <div
      className="fixed inset-0 bg-black/90 z-50 flex items-center justify-center p-4"
      onClick={onClose}
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
        </div>
      </div>
    </div>
  )
}
