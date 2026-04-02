export function isImageFile(filename: string): boolean {
  const ext = filename.split('.').pop()?.toLowerCase()
  return ['png', 'jpg', 'jpeg', 'webp'].includes(ext ?? '')
}

export function isPdfFile(filename: string): boolean {
  const ext = filename.split('.').pop()?.toLowerCase()
  return ext === 'pdf'
}

export function getFileType(filename: string): 'pdf' | 'image' | 'unknown' {
  if (isPdfFile(filename)) return 'pdf'
  if (isImageFile(filename)) return 'image'
  return 'unknown'
}

/**
 * Convert a PDF file to an array of PNG data URLs (one per page).
 * Runs entirely client-side using pdf.js.
 */
export async function pdfToImages(file: File, scale = 2.0): Promise<string[]> {
  const pdfjsLib = await import('pdfjs-dist')

  // Set worker source
  pdfjsLib.GlobalWorkerOptions.workerSrc = `//cdnjs.cloudflare.com/ajax/libs/pdf.js/${pdfjsLib.version}/pdf.worker.min.mjs`

  const arrayBuffer = await file.arrayBuffer()
  const pdf = await pdfjsLib.getDocument({ data: arrayBuffer }).promise
  const images: string[] = []

  for (let i = 1; i <= pdf.numPages; i++) {
    const page = await pdf.getPage(i)
    const viewport = page.getViewport({ scale })

    const canvas = document.createElement('canvas')
    canvas.width = viewport.width
    canvas.height = viewport.height

    const ctx = canvas.getContext('2d')
    if (!ctx) throw new Error('Canvas 2D context not available')

    await page.render({ canvasContext: ctx, viewport, canvas } as any).promise
    images.push(canvas.toDataURL('image/png'))
  }

  return images
}

/**
 * Convert a data URL to a Blob for upload.
 */
export function dataUrlToBlob(dataUrl: string): Blob {
  const [meta, base64] = dataUrl.split(',')
  const mime = meta.match(/:(.*?);/)?.[1] ?? 'image/png'
  const binary = atob(base64)
  const bytes = new Uint8Array(binary.length)
  for (let i = 0; i < binary.length; i++) {
    bytes[i] = binary.charCodeAt(i)
  }
  return new Blob([bytes], { type: mime })
}
