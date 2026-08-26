import type {
  DocumentCategory,
  DocumentPage,
  DocumentValidationResult,
  ExtractedField,
  MetadataSource,
} from '../data/types'
import { getDocumentTypeConfig } from '../data/documentTypesRegistry'
import { runDocumentOCR, type OCRProgressCallback, type OCRResult } from './ocr/ocrEngine'
import { parseOCRResult, type ParsedDocumentMetadata } from './ocr/documentParsers'

export type ExtractedDocumentMetadata = ParsedDocumentMetadata & {
  rawOcrResult?: OCRResult
}

/**
 * Performs local client-side OCR and document-specific parsing across all uploaded pages.
 */
export async function extractAndValidateDocumentPages(
  pages: DocumentPage[],
  documentTypeKey: string,
  onProgress?: OCRProgressCallback
): Promise<ExtractedDocumentMetadata> {
  const config = getDocumentTypeConfig(documentTypeKey)

  if (pages.length === 0) {
    return {
      overallPlausibility: 'not_plausible',
      plausibilityReason: 'No document pages provided.',
      detectedKeywords: [],
    }
  }

  // 1. Run local client-side OCR
  const ocr = await runDocumentOCR(pages, onProgress)

  // 2. Parse OCR text using document-specific parsing strategy
  onProgress?.('Extracting document-specific fields...', 90)
  const parsed = parseOCRResult(ocr, documentTypeKey)

  // If OCR text was completely empty or failed to extract any meaningful characters
  if (!ocr.rawText || ocr.rawText.trim().length === 0) {
    parsed.overallPlausibility = 'unknown'
    parsed.plausibilityReason = 'Could not clearly read text from this image. You can still confirm details manually.'
  }

  return {
    ...parsed,
    rawOcrResult: ocr,
  }
}

/**
 * Backward-compatible single file validation.
 */
export async function validateUploadedDocument(
  file: File,
  documentTypeKey: string,
  onProgress?: OCRProgressCallback
): Promise<ExtractedDocumentMetadata> {
  const singlePage: DocumentPage = {
    id: `page-${Date.now()}`,
    side: 'front',
    order: 0,
    mimeType: file.type.includes('pdf') ? 'application/pdf' : 'image/jpeg',
    file,
    dataUrl: URL.createObjectURL(file),
  }

  return extractAndValidateDocumentPages([singlePage], documentTypeKey, onProgress)
}
