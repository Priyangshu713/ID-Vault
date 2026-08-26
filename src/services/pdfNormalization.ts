import { jsPDF } from 'jspdf'
import type { DocumentFormat, DocumentPage } from '../data/types'

export type FileValidationResult = {
  valid: boolean
  error?: string
  format?: DocumentFormat
}

export type NormalizedDocumentResult = {
  canonicalBlob: Blob
  canonicalFileName: string
  fileSizeFormatted: string
  previewUrl: string
  thumbnailUrl?: string
  pageCount: number
  originalFormat: DocumentFormat
}

const MAX_FILE_SIZE_BYTES = 35 * 1024 * 1024 // 35 MB

/**
 * Validates uploaded file MIME type, extension, and size.
 */
export const validateDocumentFile = (file: File): FileValidationResult => {
  if (!file) {
    return { valid: false, error: 'No file selected.' }
  }

  if (file.size > MAX_FILE_SIZE_BYTES) {
    return {
      valid: false,
      error: 'This file is too large. Choose a smaller document (under 35MB).',
    }
  }

  const name = file.name.toLowerCase()
  const mime = file.type.toLowerCase()

  if (mime === 'application/pdf' || name.endsWith('.pdf')) {
    return { valid: true, format: 'pdf' }
  }
  if (mime === 'image/jpeg' || name.endsWith('.jpg') || name.endsWith('.jpeg')) {
    return { valid: true, format: 'jpg' }
  }
  if (mime === 'image/png' || name.endsWith('.png')) {
    return { valid: true, format: 'png' }
  }
  if (mime === 'image/webp' || name.endsWith('.webp')) {
    return { valid: true, format: 'webp' }
  }

  return {
    valid: false,
    error: "This file format isn't supported. Use PDF, JPG, PNG or WEBP.",
  }
}

/**
 * Formats bytes to human-readable size.
 */
export const formatBytes = (bytes: number): string => {
  if (bytes === 0) return '0 KB'
  const k = 1024
  const sizes = ['Bytes', 'KB', 'MB', 'GB']
  const i = Math.floor(Math.log(bytes) / Math.log(k))
  return `${parseFloat((bytes / Math.pow(k, i)).toFixed(1))} ${sizes[i]}`
}

/**
 * Generates a clean canonical filename.
 * E.g. "Aadhaar - Priyangshu Sharma.pdf" or "Aadhaar.pdf"
 */
export const generateCanonicalFileName = (
  documentTypeLabel: string,
  holderName?: string
): string => {
  const sanitizedDoc = documentTypeLabel.replace(/[/\\?%*:|"<>]/g, '').trim()
  const sanitizedHolder = holderName && holderName !== 'Not detected' ? holderName.replace(/[/\\?%*:|"<>]/g, '').trim() : ''

  if (sanitizedHolder) {
    return `${sanitizedDoc} - ${sanitizedHolder}.pdf`
  }
  return `${sanitizedDoc}.pdf`
}

/**
 * Helper to load an image into an HTMLImageElement asynchronously.
 */
const loadImageAsync = (url: string): Promise<HTMLImageElement> => {
  return new Promise((resolve, reject) => {
    const img = new Image()
    img.crossOrigin = 'anonymous'
    img.onload = () => resolve(img)
    img.onerror = () => reject(new Error('Failed to load image for PDF normalization.'))
    img.src = url
  })
}

/**
 * Normalizes multiple DocumentPage objects (single, front/back, or multi-page) into a canonical multi-page PDF.
 * Deterministic page ordering: Page 1 = Front, Page 2 = Back, or Page 1..N.
 */
export const normalizePagesToCanonicalPdf = async (
  pages: DocumentPage[],
  documentTypeLabel: string,
  holderName?: string
): Promise<NormalizedDocumentResult> => {
  if (!pages || pages.length === 0) {
    throw new Error('No pages provided for PDF normalization.')
  }

  // Sort deterministically by page order
  const sortedPages = [...pages].sort((a, b) => a.order - b.order)
  const canonicalFileName = generateCanonicalFileName(documentTypeLabel, holderName)

  // If single PDF page provided
  if (sortedPages.length === 1 && sortedPages[0].mimeType === 'application/pdf' && sortedPages[0].file) {
    const file = sortedPages[0].file
    const arrayBuffer = await file.arrayBuffer()
    const pdfBlob = new Blob([arrayBuffer], { type: 'application/pdf' })
    const previewUrl = URL.createObjectURL(pdfBlob)
    return {
      canonicalBlob: pdfBlob,
      canonicalFileName,
      fileSizeFormatted: formatBytes(pdfBlob.size),
      previewUrl,
      pageCount: 1,
      originalFormat: 'pdf',
    }
  }

  // Multi-image or Front/Back compilation
  let pdf: jsPDF | null = null
  let firstThumbnailUrl: string | undefined = undefined

  for (let i = 0; i < sortedPages.length; i++) {
    const page = sortedPages[i]
    const pageUrl = page.dataUrl || (page.file ? URL.createObjectURL(page.file) : '')
    if (!pageUrl) continue

    const img = await loadImageAsync(pageUrl)
    const imgWidth = img.naturalWidth || img.width || 800
    const imgHeight = img.naturalHeight || img.height || 600
    const isLandscape = imgWidth > imgHeight
    const orientation = isLandscape ? 'landscape' : 'portrait'

    if (i === 0) {
      // First page initializes PDF
      pdf = new jsPDF({
        orientation,
        unit: 'pt',
        format: [imgWidth, imgHeight],
      })
      pdf.addImage(img, 'JPEG', 0, 0, imgWidth, imgHeight, undefined, 'FAST')
      firstThumbnailUrl = pageUrl
    } else if (pdf) {
      // Subsequent pages (e.g. Back side)
      pdf.addPage([imgWidth, imgHeight], orientation)
      pdf.addImage(img, 'JPEG', 0, 0, imgWidth, imgHeight, undefined, 'FAST')
    }
  }

  if (!pdf) {
    throw new Error("We couldn't compile the PDF. Please try another file.")
  }

  const pdfBlob = pdf.output('blob')
  const previewUrl = URL.createObjectURL(pdfBlob)

  return {
    canonicalBlob: pdfBlob,
    canonicalFileName,
    fileSizeFormatted: formatBytes(pdfBlob.size),
    previewUrl,
    thumbnailUrl: firstThumbnailUrl,
    pageCount: sortedPages.length,
    originalFormat: (sortedPages[0]?.mimeType.includes('pdf') ? 'pdf' : 'jpg') as DocumentFormat,
  }
}

/**
 * Normalizes a single file into a canonical PDF (backward compatible wrapper).
 */
export const normalizeToCanonicalPdf = async (
  file: File,
  documentTypeLabel: string,
  holderName?: string
): Promise<NormalizedDocumentResult> => {
  const validation = validateDocumentFile(file)
  if (!validation.valid || !validation.format) {
    throw new Error(validation.error || 'Invalid file format.')
  }

  const singlePage: DocumentPage = {
    id: `page-${Date.now()}-0`,
    side: 'front',
    order: 0,
    mimeType: validation.format === 'pdf' ? 'application/pdf' : `image/${validation.format}` as any,
    file,
    dataUrl: URL.createObjectURL(file),
  }

  return normalizePagesToCanonicalPdf([singlePage], documentTypeLabel, holderName)
}
