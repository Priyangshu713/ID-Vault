import { createWorker } from 'tesseract.js'
import type { DocumentPage } from '../../data/types'

export type OCRWord = {
  text: string
  confidence: number
  bbox?: { x0: number; y0: number; x1: number; y1: number }
}

export type OCRLine = {
  text: string
  confidence: number
  words: OCRWord[]
}

export type OCRPageResult = {
  pageNumber: number
  side?: 'front' | 'back' | 'page'
  text: string
  confidence: number
  lines: string[]
  structuredLines?: OCRLine[]
}

export type OCRResult = {
  rawText: string
  pages: OCRPageResult[]
  processingTimeMs: number
}

export type OCRProgressCallback = (stage: string, progressPercent: number) => void

// Shared worker instance
let sharedWorkerPromise: ReturnType<typeof createWorker> | null = null

async function getWorker(): Promise<any> {
  if (!sharedWorkerPromise) {
    sharedWorkerPromise = (async () => {
      const worker = await createWorker('eng', 1, {
        logger: () => {}, // Suppress noisy logs
      })
      await worker.setParameters({
        preserve_interword_spaces: '1',
      })
      return worker
    })()
  }
  return sharedWorkerPromise
}

/**
 * High-fidelity temporary canvas image preprocessing.
 * Scales document for maximum character clarity and applies balanced contrast without destroying digits.
 */
async function preprocessImagePass1(dataUrl: string): Promise<string> {
  return new Promise((resolve) => {
    const img = new Image()
    img.crossOrigin = 'anonymous'
    img.onload = () => {
      try {
        const canvas = document.createElement('canvas')
        const ctx = canvas.getContext('2d', { willReadFrequently: true })
        if (!ctx) {
          resolve(dataUrl)
          return
        }

        // Upscale small card images for crisp character recognition
        let targetWidth = img.width
        let targetHeight = img.height

        if (targetWidth < 1400 && targetHeight < 1400) {
          const scale = Math.min(2.2, 1800 / Math.max(targetWidth, targetHeight))
          targetWidth = Math.round(targetWidth * scale)
          targetHeight = Math.round(targetHeight * scale)
        } else if (targetWidth > 2600 || targetHeight > 2600) {
          const maxDim = 2400
          if (targetWidth > targetHeight) {
            targetHeight = Math.round((targetHeight * maxDim) / targetWidth)
            targetWidth = maxDim
          } else {
            targetWidth = Math.round((targetWidth * maxDim) / targetHeight)
            targetHeight = maxDim
          }
        }

        canvas.width = targetWidth
        canvas.height = targetHeight

        ctx.imageSmoothingEnabled = true
        ctx.imageSmoothingQuality = 'high'
        ctx.drawImage(img, 0, 0, targetWidth, targetHeight)

        const imgData = ctx.getImageData(0, 0, targetWidth, targetHeight)
        const d = imgData.data

        // Grayscale conversion with subtle local contrast enhancement
        for (let i = 0; i < d.length; i += 4) {
          const r = d[i]
          const g = d[i + 1]
          const b = d[i + 2]
          const gray = 0.299 * r + 0.587 * g + 0.114 * b

          let finalVal = gray
          if (gray < 160) {
            finalVal = gray * 0.90
          } else {
            finalVal = Math.min(255, gray * 1.05)
          }

          d[i] = finalVal
          d[i + 1] = finalVal
          d[i + 2] = finalVal
        }

        ctx.putImageData(imgData, 0, 0)
        resolve(canvas.toDataURL('image/png'))
      } catch {
        resolve(dataUrl)
      }
    }
    img.onerror = () => resolve(dataUrl)
    img.src = dataUrl
  })
}

/**
 * Crops a targeted relative region of an image and optimizes it for OCR recognition.
 */
async function cropImageRegion(
  dataUrl: string,
  relX: number,
  relY: number,
  relW: number,
  relH: number
): Promise<string> {
  return new Promise((resolve) => {
    const img = new Image()
    img.crossOrigin = 'anonymous'
    img.onload = () => {
      try {
        const canvas = document.createElement('canvas')
        const ctx = canvas.getContext('2d', { willReadFrequently: true })
        if (!ctx) {
          resolve(dataUrl)
          return
        }

        const sx = Math.max(0, Math.floor(img.width * relX))
        const sy = Math.max(0, Math.floor(img.height * relY))
        const sw = Math.min(img.width - sx, Math.floor(img.width * relW))
        const sh = Math.min(img.height - sy, Math.floor(img.height * relH))

        const scale = Math.max(2.0, 1400 / sw)
        canvas.width = Math.round(sw * scale)
        canvas.height = Math.round(sh * scale)

        ctx.imageSmoothingEnabled = true
        ctx.imageSmoothingQuality = 'high'
        ctx.drawImage(img, sx, sy, sw, sh, 0, 0, canvas.width, canvas.height)

        const imgData = ctx.getImageData(0, 0, canvas.width, canvas.height)
        const d = imgData.data

        for (let i = 0; i < d.length; i += 4) {
          const lum = 0.299 * d[i] + 0.587 * d[i + 1] + 0.114 * d[i + 2]
          const enhanced = lum < 155 ? lum * 0.88 : Math.min(255, lum * 1.06)
          d[i] = enhanced
          d[i + 1] = enhanced
          d[i + 2] = enhanced
        }

        ctx.putImageData(imgData, 0, 0)
        resolve(canvas.toDataURL('image/png'))
      } catch {
        resolve(dataUrl)
      }
    }
    img.onerror = () => resolve(dataUrl)
    img.src = dataUrl
  })
}

/**
 * Executes local OCR with targeted multi-region scanning for ID cards.
 */
export async function runLocalOCR(
  imageDataUrl: string,
  onProgress?: OCRProgressCallback,
  side?: 'front' | 'back' | 'page'
): Promise<{ text: string; confidence: number; lines: string[]; structuredLines: OCRLine[] }> {
  onProgress?.('Preparing image for analysis...', 20)

  const pass1Url = await preprocessImagePass1(imageDataUrl)
  onProgress?.('Scanning document text...', 50)

  try {
    const worker = await getWorker()
    let ret = await worker.recognize(pass1Url)
    let text = ret.data.text || ''
    let confidence = ret.data.confidence || 0

    let lines = text
      .split('\n')
      .map((l: string) => l.trim())
      .filter((l: string) => l.length > 0)

    // For Front Side of ID documents, perform targeted crops:
    if (side === 'front' || !side) {
      // Crop 1: Personal Details Block (Name, DOB, Gender)
      try {
        const detailsCropUrl = await cropImageRegion(imageDataUrl, 0.18, 0.10, 0.80, 0.50)
        const retCrop = await worker.recognize(detailsCropUrl)
        const cropText = retCrop.data.text || ''
        const cropLines = cropText
          .split('\n')
          .map((l: string) => l.trim())
          .filter((l: string) => l.length > 0)

        if (cropLines.length > 0) {
          lines = [...cropLines, ...lines]
          text = `${cropText}\n\n${text}`
        }
      } catch {
        // Continue
      }

      // Crop 2: Bottom Number Block (Aadhaar 12-digit UID)
      try {
        const numberCropUrl = await cropImageRegion(imageDataUrl, 0.08, 0.65, 0.84, 0.32)
        const retNum = await worker.recognize(numberCropUrl)
        const numText = retNum.data.text || ''
        const numLines = numText
          .split('\n')
          .map((l: string) => l.trim())
          .filter((l: string) => l.length > 0)

        if (numLines.length > 0) {
          lines = [...lines, ...numLines]
          text = `${text}\n\n${numText}`
        }
      } catch {
        // Continue
      }
    }

    const structuredLines: OCRLine[] = (ret.data.lines || []).map((l: any) => ({
      text: (l.text || '').trim(),
      confidence: l.confidence || 0,
      words: (l.words || []).map((w: any) => ({
        text: (w.text || '').trim(),
        confidence: w.confidence || 0,
        bbox: w.bbox,
      })),
    }))

    onProgress?.('Text extracted successfully.', 100)

    return {
      text,
      confidence,
      lines,
      structuredLines,
    }
  } catch {
    onProgress?.('OCR could not read document.', 100)
    return {
      text: '',
      confidence: 0,
      lines: [],
      structuredLines: [],
    }
  }
}

/**
 * Runs local OCR across all pages of a document.
 */
export async function runDocumentOCR(
  pages: DocumentPage[],
  onProgress?: OCRProgressCallback
): Promise<OCRResult> {
  const startTime = Date.now()
  const pageResults: OCRPageResult[] = []

  if (pages.length === 0) {
    return {
      rawText: '',
      pages: [],
      processingTimeMs: 0,
    }
  }

  for (let i = 0; i < pages.length; i++) {
    const page = pages[i]
    const pageUrl = page.dataUrl || (page.file ? URL.createObjectURL(page.file) : '')
    if (!pageUrl) continue

    const pageLabel = page.side === 'front' ? 'Front Side' : page.side === 'back' ? 'Back Side' : `Page ${i + 1}`
    onProgress?.(`Reading ${pageLabel}...`, Math.round(((i + 0.2) / pages.length) * 100))

    const ocr = await runLocalOCR(pageUrl, (stage, p) => {
      const overall = Math.round(((i + p / 100) / pages.length) * 100)
      onProgress?.(`${pageLabel}: ${stage}`, overall)
    }, page.side)

    pageResults.push({
      pageNumber: page.order + 1,
      side: page.side,
      text: ocr.text,
      confidence: ocr.confidence,
      lines: ocr.lines,
      structuredLines: ocr.structuredLines,
    })
  }

  const combinedRawText = pageResults.map((p) => p.text).join('\n\n--- PAGE BREAK ---\n\n')

  return {
    rawText: combinedRawText,
    pages: pageResults,
    processingTimeMs: Date.now() - startTime,
  }
}
