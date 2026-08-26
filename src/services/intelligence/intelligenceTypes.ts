import type {
  DocumentCategory,
  DocumentPage,
  DocumentVisualType,
  MetadataSource,
  VaultDocument,
} from '../../data/types'
import type { OCRResult } from '../ocr/ocrEngine'
import type { ParsedDocumentMetadata } from '../ocr/documentParsers'

export type ConfidenceLevel = 'high' | 'medium' | 'low' | 'unknown'

export type IntelligenceStatus =
  | 'not_run'
  | 'processing'
  | 'suggestions_ready'
  | 'confirmed'
  | 'failed'

export type ClassificationInput = {
  ocrResult: OCRResult
  pages: DocumentPage[]
  selectedTypeKey?: string
  selectedCategory?: DocumentCategory
}

export type ClassificationResult = {
  suggestedTypeKey: string
  suggestedDisplayName: string
  suggestedCategory: DocumentCategory
  suggestedVisualType: DocumentVisualType
  confidence: ConfidenceLevel
  reasons: string[]
  isTypeChangeSuggested: boolean
}

export type AIFieldSuggestion<T> = {
  value?: T
  confidence: ConfidenceLevel
  reason?: string
  source: MetadataSource
}

export type MetadataExtractionInput = {
  ocrResult: OCRResult
  parsedMetadata: ParsedDocumentMetadata
  documentTypeKey: string
  pages: DocumentPage[]
}

export type MetadataExtractionResult = {
  holderName?: AIFieldSuggestion<string>
  documentIdentifier?: AIFieldSuggestion<string>
  maskedIdentifier?: AIFieldSuggestion<string>
  dateOfBirth?: AIFieldSuggestion<string>
  gender?: AIFieldSuggestion<string>
  address?: AIFieldSuggestion<string>
  fatherOrHusbandName?: AIFieldSuggestion<string>
  issueDate?: AIFieldSuggestion<string>
  expiryDate?: AIFieldSuggestion<string>
  issuer?: AIFieldSuggestion<string>
  suggestedTitle?: string
  suggestedDescription?: string
  expiryInsight?: {
    daysRemaining?: number
    isExpired: boolean
    isExpiringSoon: boolean
    humanReadableLabel?: string
  }
}

export type DocumentComparisonInput = {
  existingDoc: VaultDocument
  incomingMetadata: ParsedDocumentMetadata
  incomingOcr: OCRResult
}

export type FieldChangeComparison = {
  field: string
  label: string
  oldValue?: string
  newValue?: string
  status: 'unchanged' | 'updated' | 'added' | 'removed' | 'conflict'
  notes?: string
}

export type DocumentComparisonResult = {
  isLikelyNewVersion: boolean
  isDuplicate: boolean
  confidence: ConfidenceLevel
  summary: string
  changes: FieldChangeComparison[]
  recommendedAction: 'update_version' | 'keep_separate' | 'review_conflict'
}

export type DocumentInsightType =
  | 'classification'
  | 'metadata'
  | 'change'
  | 'expiry'
  | 'duplicate'
  | 'organization'

export type DocumentInsight = {
  id: string
  type: DocumentInsightType
  severity: 'info' | 'attention'
  title: string
  description: string
  documentId?: string
  documentName?: string
  actionLabel?: string
  createdAt: string
}

export interface DocumentIntelligenceProvider {
  classifyDocument(input: ClassificationInput): Promise<ClassificationResult>
  extractMetadata(input: MetadataExtractionInput): Promise<MetadataExtractionResult>
  analyzeDocumentChanges(input: DocumentComparisonInput): Promise<DocumentComparisonResult>
  generateVaultInsights(documents: VaultDocument[]): Promise<DocumentInsight[]>
}
