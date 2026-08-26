import { getDocumentTypeConfig } from '../../data/documentTypesRegistry'
import type { VaultDocument } from '../../data/types'
import type {
  ClassificationInput,
  ClassificationResult,
  DocumentComparisonInput,
  DocumentComparisonResult,
  DocumentInsight,
  DocumentIntelligenceProvider,
  MetadataExtractionInput,
  MetadataExtractionResult,
} from './intelligenceTypes'
import { LocalRuleAndHeuristicIntelligenceProvider } from './localIntelligenceProvider'

class DocumentIntelligenceService {
  private provider: DocumentIntelligenceProvider

  constructor(provider?: DocumentIntelligenceProvider) {
    this.provider = provider || new LocalRuleAndHeuristicIntelligenceProvider()
  }

  /**
   * Set or swap the underlying intelligence provider.
   */
  public setProvider(provider: DocumentIntelligenceProvider) {
    this.provider = provider
  }

  /**
   * Classifies an uploaded document using privacy-first OCR signals.
   */
  async classifyDocument(input: ClassificationInput): Promise<ClassificationResult> {
    if (import.meta.env.DEV) {
      console.log('[Intelligence] classification started')
    }

    try {
      const result = await this.provider.classifyDocument(input)
      if (import.meta.env.DEV) {
        console.log(`[Intelligence] classification completed: ${result.suggestedTypeKey} (${result.confidence})`)
      }
      return result
    } catch {
      const fallbackKey = input.selectedTypeKey || 'custom'
      const cfg = getDocumentTypeConfig(fallbackKey)
      return {
        suggestedTypeKey: fallbackKey,
        suggestedDisplayName: cfg.displayName,
        suggestedCategory: cfg.category || 'other',
        suggestedVisualType: cfg.visualType || 'custom',
        confidence: 'unknown',
        reasons: ['Classification unavailable'],
        isTypeChangeSuggested: false,
      }
    }
  }

  /**
   * Enhances extracted metadata with context, descriptions, and expiry calculations.
   */
  async enhanceMetadata(input: MetadataExtractionInput): Promise<MetadataExtractionResult> {
    if (import.meta.env.DEV) {
      console.log('[Intelligence] metadata enhancement started')
    }

    try {
      const result = await this.provider.extractMetadata(input)
      if (import.meta.env.DEV) {
        console.log('[Intelligence] metadata enhancement generated')
      }
      return result
    } catch {
      const cfg = getDocumentTypeConfig(input.documentTypeKey)
      return {
        suggestedTitle: cfg.displayName,
        suggestedDescription: cfg.description,
      }
    }
  }

  /**
   * Compares an incoming document against an existing document to detect updates or duplicates.
   */
  async analyzeDocumentChanges(input: DocumentComparisonInput): Promise<DocumentComparisonResult> {
    if (import.meta.env.DEV) {
      console.log('[Intelligence] version comparison started')
    }

    try {
      const result = await this.provider.analyzeDocumentChanges(input)
      if (import.meta.env.DEV) {
        console.log(`[Intelligence] version comparison completed: newVersion=${result.isLikelyNewVersion}, duplicate=${result.isDuplicate}`)
      }
      return result
    } catch {
      return {
        isLikelyNewVersion: true,
        isDuplicate: false,
        confidence: 'medium',
        summary: 'Comparison unavailable',
        changes: [],
        recommendedAction: 'update_version',
      }
    }
  }

  /**
   * Generates internal non-intrusive insights for vault health, expiry, and organization.
   */
  async generateVaultInsights(documents: VaultDocument[]): Promise<DocumentInsight[]> {
    try {
      return await this.provider.generateVaultInsights(documents)
    } catch {
      return []
    }
  }
}

// Singleton export
export const intelligenceService = new DocumentIntelligenceService()
