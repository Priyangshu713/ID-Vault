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
      return worker
    })()
  }
  return sharedWorkerPromise
}

/**
 * High-fidelity temporary canvas image preprocessing.
 * Applies mild contrast stretch and luminance normalization without destroying thin fonts.
 */
async function preprocessImagePass1(dataUrl: string): Promise<string> {
  return new Promise((resolve) => {
    const img = new Image()
    img.crossOrigin = 'anonymous'
    img.onload = () => {
      try {
        const canvas = document.createElement('canvas')
        const ctx = canvas.getContext('2d')
        if (!ctx) {
          resolve(dataUrl)
          return
        }

        // Limit maximum dimension to 1800px for sharpness
        const maxDim = 1800
        let { width, height } = img
        if (width > maxDim || height > maxDim) {
          if (width > height) {
            height = Math.round((height * maxDim) / width)
            width = maxDim
          } else {
            width = Math.round((width * maxDim) / height)
            height = maxDim
          }
        }

        canvas.width = width
        canvas.height = height
        ctx.drawImage(img, 0, 0, width, height)

        const imgData = ctx.getImageData(0, 0, width, height)
        const d = imgData.data

        // Mild adaptive contrast stretch
        for (let i = 0; i < d.length; i += 4) {
          const lum = 0.299 * d[i] + 0.587 * d[i + 1] + 0.114 * d[i + 2]
          // Boost clarity of dark text on light backgrounds
          const enhanced = lum < 140 ? Math.max(0, lum * 0.85) : Math.min(255, lum * 1.08)
          d[i] = enhanced
          d[i + 1] = enhanced
          d[i + 2] = enhanced
        }

        ctx.putImageData(imgData, 0, 0)
        resolve(canvas.toDataURL('image/jpeg', 0.9))
      } catch {
        resolve(dataUrl)
      }
    }
    img.onerror = () => resolve(dataUrl)
    img.src = dataUrl
  })
}

/**
 * Secondary high-contrast binarization pass for blurry or low-light documents.
 */
async function preprocessImagePass2(dataUrl: string): Promise<string> {
  return new Promise((resolve) => {
    const img = new Image()
    img.crossOrigin = 'anonymous'
    img.onload = () => {
      try {
        const canvas = document.createElement('canvas')
        const ctx = canvas.getContext('2d')
        if (!ctx) {
          resolve(dataUrl)
          return
        }

        canvas.width = img.width
        canvas.height = img.height
        ctx.drawImage(img, 0, 0)

        const imgData = ctx.getImageData(0, 0, canvas.width, canvas.height)
        const d = imgData.data

        for (let i = 0; i < d.length; i += 4) {
          const lum = 0.299 * d[i] + 0.587 * d[i + 1] + 0.114 * d[i + 2]
          const val = lum < 125 ? 0 : 255
          d[i] = val
          d[i + 1] = val
          d[i + 2] = val
        }

        ctx.putImageData(imgData, 0, 0)
        resolve(canvas.toDataURL('image/jpeg', 0.9))
      } catch {
        resolve(dataUrl)
      }
    }
    img.onerror = () => resolve(dataUrl)
    img.src = dataUrl
  })
}

/**
 * Executes local OCR with automatic two-pass fallback.
 */
export async function runLocalOCR(
  imageDataUrl: string,
  onProgress?: OCRProgressCallback
): Promise<{ text: string; confidence: number; lines: string[]; structuredLines: OCRLine[] }> {
  onProgress?.('Preparing image for analysis...', 20)

  const pass1Url = await preprocessImagePass1(imageDataUrl)
  onProgress?.('Scanning document text...', 50)

  try {
    const worker = await getWorker()
    let ret = await worker.recognize(pass1Url)
    let text = ret.data.text || ''
    let confidence = ret.data.confidence || 0

    // If Pass 1 yielded weak text (e.g. confidence < 60 or less than 20 chars), run Pass 2
    if (confidence < 60 || text.trim().length < 25) {
      onProgress?.('Enhancing image contrast for pass 2...', 70)
      const pass2Url = await preprocessImagePass2(imageDataUrl)
      const ret2 = await worker.recognize(pass2Url)
      if ((ret2.data.text || '').trim().length > text.trim().length) {
        ret = ret2
        text = ret.data.text || ''
        confidence = ret.data.confidence || 0
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

    const lines = text
      .split('\n')
      .map((l: string) => l.trim())
      .filter((l: string) => l.length > 0)

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
    })

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
