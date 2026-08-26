import type {
  DocumentCategory,
  DocumentVisualType,
  VaultDocument,
} from '../../data/types'
import { getDocumentTypeConfig } from '../../data/documentTypesRegistry'
import type {
  ClassificationInput,
  ClassificationResult,
  ConfidenceLevel,
  DocumentComparisonInput,
  DocumentComparisonResult,
  DocumentInsight,
  DocumentIntelligenceProvider,
  FieldChangeComparison,
  MetadataExtractionInput,
  MetadataExtractionResult,
} from './intelligenceTypes'

/**
 * Privacy-First, 100% Local Intelligence Provider for ID Vault.
 * Operates purely on structured OCR signals and layout heuristics without external network calls.
 */
export class LocalRuleAndHeuristicIntelligenceProvider implements DocumentIntelligenceProvider {
  /**
   * Classifies an uploaded document based on observable OCR text patterns and structures.
   */
  async classifyDocument(input: ClassificationInput): Promise<ClassificationResult> {
    const rawText = input.ocrResult.rawText || ''
    const allText = rawText.toLowerCase()
    const selectedKey = input.selectedTypeKey || 'custom'
    const selectedConfig = getDocumentTypeConfig(selectedKey)

    type TypeCandidate = {
      key: string
      displayName: string
      category: DocumentCategory
      visualType: DocumentVisualType
      score: number
      reasons: string[]
    }

    const candidates: TypeCandidate[] = []

    // 1. Evaluate Aadhaar
    const aadhaarReasons: string[] = []
    let aadhaarScore = 0
    if (/\b[2-9]\d{3}\s?\d{4}\s?\d{4}\b/.test(rawText)) {
      aadhaarScore += 50
      aadhaarReasons.push('12-digit Aadhaar identifier pattern detected')
    }
    if (allText.includes('uidai') || allText.includes('unique identification')) {
      aadhaarScore += 35
      aadhaarReasons.push('UIDAI government authority header identified')
    }
    if (allText.includes('aadhaar') || allText.includes('aadhar') || allText.includes('mera aadhaar')) {
      aadhaarScore += 30
      aadhaarReasons.push('Aadhaar brand keywords found in text')
    }
    if (allText.includes('government of india') || allText.includes('bharat sarkar')) {
      aadhaarScore += 15
      aadhaarReasons.push('Government of India national crest header')
    }
    if (allText.includes('address') && (allText.includes('s/o') || allText.includes('w/o') || allText.includes('d/o') || allText.includes('c/o'))) {
      aadhaarScore += 20
      aadhaarReasons.push('Standard Indian resident address structure found')
    }
    if (aadhaarScore > 0) {
      candidates.push({
        key: 'aadhaar',
        displayName: 'Aadhaar Card',
        category: 'identity',
        visualType: 'aadhaar',
        score: aadhaarScore,
        reasons: aadhaarReasons,
      })
    }

    // 2. Evaluate PAN Card
    const panReasons: string[] = []
    let panScore = 0
    if (/\b[A-Z]{5}[0-9]{4}[A-Z]\b/.test(rawText)) {
      panScore += 60
      panReasons.push('10-character alphanumeric PAN format detected (e.g. ABCDE1234F)')
    }
    if (allText.includes('income tax') || allText.includes('incometax') || allText.includes('ayakar')) {
      panScore += 35
      panReasons.push('Income Tax Department authority header identified')
    }
    if (allText.includes('permanent account number') || allText.includes('pan card')) {
      panScore += 35
      panReasons.push('Permanent Account Number card label found')
    }
    if (panScore > 0) {
      candidates.push({
        key: 'pan',
        displayName: 'PAN Card',
        category: 'financial',
        visualType: 'pan',
        score: panScore,
        reasons: panReasons,
      })
    }

    // 3. Evaluate Driving Licence
    const dlReasons: string[] = []
    let dlScore = 0
    if (/\b[A-Z]{2}[-\s]?\d{2}[-\s]?\d{4}[-\s]?\d{7}\b/i.test(rawText) || /\b[A-Z]{2}\d{13,15}\b/i.test(rawText)) {
      dlScore += 55
      dlReasons.push('Indian Driving Licence registration number format detected')
    }
    if (allText.includes('driving licence') || allText.includes('driving license') || allText.includes('driver licence')) {
      dlScore += 40
      dlReasons.push('Driving Licence document title found')
    }
    if (allText.includes('transport department') || allText.includes('union of india') || allText.includes('motor vehicles')) {
      dlScore += 25
      dlReasons.push('State Transport Authority credentials identified')
    }
    if (dlScore > 0) {
      candidates.push({
        key: 'driving-licence',
        displayName: 'Driving Licence',
        category: 'transport',
        visualType: 'driving-licence',
        score: dlScore,
        reasons: dlReasons,
      })
    }

    // 4. Evaluate Passport
    const passportReasons: string[] = []
    let passportScore = 0
    if (/\b[A-Z][1-9]\d{6}\b/.test(rawText)) {
      passportScore += 55
      passportReasons.push('8-character Indian Passport number format detected')
    }
    if (allText.includes('republic of india') && allText.includes('passport')) {
      passportScore += 45
      passportReasons.push('Republic of India Passport title and national insignia detected')
    }
    if (allText.includes('type p') || allText.includes('code ind') || allText.includes('nationality indian')) {
      passportScore += 30
      passportReasons.push('Standard ICAO travel document metadata identified')
    }
    if (passportScore > 0) {
      candidates.push({
        key: 'passport',
        displayName: 'Passport',
        category: 'identity',
        visualType: 'passport',
        score: passportScore,
        reasons: passportReasons,
      })
    }

    // 5. Evaluate Voter ID (EPIC)
    const voterReasons: string[] = []
    let voterScore = 0
    if (/\b[A-Z]{3}\d{7}\b/.test(rawText)) {
      voterScore += 55
      voterReasons.push('10-character EPIC alphanumeric voter identifier detected')
    }
    if (allText.includes('election commission of india') || allText.includes('electoral photo')) {
      voterScore += 40
      voterReasons.push('Election Commission of India header identified')
    }
    if (voterScore > 0) {
      candidates.push({
        key: 'voter-id',
        displayName: 'Voter ID (EPIC)',
        category: 'identity',
        visualType: 'voter-id',
        score: voterScore,
        reasons: voterReasons,
      })
    }

    // 6. Evaluate Education / Degree Certificate
    const eduReasons: string[] = []
    let eduScore = 0
    if (allText.includes('university') || allText.includes('institute of technology') || allText.includes('board of secondary')) {
      eduScore += 40
      eduReasons.push('Educational institution or university header identified')
    }
    if (allText.includes('bachelor') || allText.includes('master') || allText.includes('degree') || allText.includes('diploma') || allText.includes('matriculation')) {
      eduScore += 35
      eduReasons.push('Academic degree designation detected in text')
    }
    if (allText.includes('roll no') || allText.includes('registration no') || allText.includes('cgpa') || allText.includes('marks')) {
      eduScore += 20
      eduReasons.push('Academic grading and roll number structure found')
    }
    if (eduScore > 0) {
      candidates.push({
        key: 'degree',
        displayName: 'Degree Certificate',
        category: 'education',
        visualType: 'degree',
        score: eduScore,
        reasons: eduReasons,
      })
    }

    // Sort candidates by score descending
    candidates.sort((a, b) => b.score - a.score)

    const top = candidates[0]
    if (!top || top.score < 30) {
      return {
        suggestedTypeKey: selectedKey,
        suggestedDisplayName: selectedConfig.displayName,
        suggestedCategory: selectedConfig.category || 'other',
        suggestedVisualType: selectedConfig.visualType || 'custom',
        confidence: 'unknown',
        reasons: ['No distinctive government or official document markers detected in OCR text'],
        isTypeChangeSuggested: false,
      }
    }

    const confidence: ConfidenceLevel =
      top.score >= 75 ? 'high' : top.score >= 45 ? 'medium' : 'low'

    const isTypeChangeSuggested =
      (selectedKey === 'custom' || selectedKey === 'other' || selectedKey !== top.key) &&
      (confidence === 'high' || confidence === 'medium')

    return {
      suggestedTypeKey: top.key,
      suggestedDisplayName: top.displayName,
      suggestedCategory: top.category,
      suggestedVisualType: top.visualType,
      confidence,
      reasons: top.reasons,
      isTypeChangeSuggested,
    }
  }

  /**
   * Enhances raw OCR extracted metadata with contextual disambiguation and expiry calculations.
   */
  async extractMetadata(input: MetadataExtractionInput): Promise<MetadataExtractionResult> {
    const { parsedMetadata, documentTypeKey } = input
    const config = getDocumentTypeConfig(documentTypeKey)

    // Calculate expiry insight if expiry date exists
    let expiryInsight: MetadataExtractionResult['expiryInsight'] = undefined
    if (parsedMetadata.expiryDate?.value) {
      const parts = parsedMetadata.expiryDate.value.split(/[/-]/)
      if (parts.length === 3) {
        // Assume DD/MM/YYYY or YYYY/MM/DD
        const year = parseInt(parts[2].length === 4 ? parts[2] : parts[0], 10)
        const month = parseInt(parts[1], 10) - 1
        const day = parseInt(parts[2].length === 4 ? parts[0] : parts[2], 10)

        const expDate = new Date(year, month, day)
        if (!isNaN(expDate.getTime())) {
          const diffMs = expDate.getTime() - Date.now()
          const daysRemaining = Math.ceil(diffMs / (1000 * 60 * 60 * 24))
          const isExpired = daysRemaining < 0
          const isExpiringSoon = daysRemaining >= 0 && daysRemaining <= 90

          let humanReadableLabel = ''
          if (isExpired) {
            humanReadableLabel = `Expired ${Math.abs(daysRemaining)} days ago`
          } else if (daysRemaining === 0) {
            humanReadableLabel = 'Expires today'
          } else if (daysRemaining <= 90) {
            humanReadableLabel = `Expires in ${daysRemaining} days`
          } else {
            humanReadableLabel = `Valid until ${parsedMetadata.expiryDate.value}`
          }

          expiryInsight = {
            daysRemaining,
            isExpired,
            isExpiringSoon,
            humanReadableLabel,
          }
        }
      }
    }

    // Suggested canonical title
    const holder = parsedMetadata.holderName?.value
    const suggestedTitle = holder && holder !== 'Not detected'
      ? `${config.displayName} - ${holder}`
      : config.displayName

    // Suggested description for unusual / non-standard documents
    let suggestedDescription = config.description
    if (documentTypeKey === 'residence-cert') {
      suggestedDescription = 'Government-issued residence proof and domicile certificate.'
    } else if (documentTypeKey === 'income-cert') {
      suggestedDescription = 'State-issued revenue certificate verifying annual household income.'
    }

    return {
      holderName: parsedMetadata.holderName
        ? {
            value: parsedMetadata.holderName.value,
            confidence: parsedMetadata.holderName.confidence || 'medium',
            source: 'document',
            reason: parsedMetadata.holderName.evidence,
          }
        : undefined,

      documentIdentifier: parsedMetadata.documentIdentifier
        ? {
            value: parsedMetadata.documentIdentifier.value,
            confidence: parsedMetadata.documentIdentifier.confidence || 'high',
            source: 'document',
            reason: parsedMetadata.documentIdentifier.evidence,
          }
        : undefined,

      maskedIdentifier: parsedMetadata.maskedIdentifier
        ? {
            value: parsedMetadata.maskedIdentifier.value,
            confidence: parsedMetadata.maskedIdentifier.confidence || 'high',
            source: 'document',
          }
        : undefined,

      dateOfBirth: parsedMetadata.dateOfBirth
        ? {
            value: parsedMetadata.dateOfBirth.value,
            confidence: parsedMetadata.dateOfBirth.confidence || 'medium',
            source: 'document',
            reason: parsedMetadata.dateOfBirth.evidence,
          }
        : undefined,

      gender: parsedMetadata.gender
        ? {
            value: parsedMetadata.gender.value,
            confidence: parsedMetadata.gender.confidence || 'high',
            source: 'document',
          }
        : undefined,

      address: parsedMetadata.address
        ? {
            value: parsedMetadata.address.value,
            confidence: parsedMetadata.address.confidence || 'high',
            source: 'document',
            reason: parsedMetadata.address.evidence,
          }
        : undefined,

      fatherOrHusbandName: parsedMetadata.fatherOrHusbandName
        ? {
            value: parsedMetadata.fatherOrHusbandName.value,
            confidence: parsedMetadata.fatherOrHusbandName.confidence || 'medium',
            source: 'document',
            reason: parsedMetadata.fatherOrHusbandName.evidence,
          }
        : undefined,

      issueDate: parsedMetadata.issueDate
        ? {
            value: parsedMetadata.issueDate.value,
            confidence: 'medium',
            source: 'document',
          }
        : undefined,

      expiryDate: parsedMetadata.expiryDate
        ? {
            value: parsedMetadata.expiryDate.value,
            confidence: 'medium',
            source: 'document',
          }
        : undefined,

      issuer: parsedMetadata.issuer
        ? {
            value: parsedMetadata.issuer.value,
            confidence: 'high',
            source: 'document',
          }
        : undefined,

      suggestedTitle,
      suggestedDescription,
      expiryInsight,
    }
  }

  /**
   * Intelligently analyzes semantic differences between an existing document and a newly uploaded document.
   */
  async analyzeDocumentChanges(input: DocumentComparisonInput): Promise<DocumentComparisonResult> {
    const { existingDoc, incomingMetadata } = input
    const changes: FieldChangeComparison[] = []

    // Helper to clean values for comparison
    const norm = (s?: string) => (s || '').replace(/\s+/g, ' ').trim().toLowerCase()

    // 1. Compare Holder Name
    const oldName = existingDoc.documentHolderName || existingDoc.ownerName
    const newName = incomingMetadata.holderName?.value
    if (oldName || newName) {
      const isSame = norm(oldName) === norm(newName)
      changes.push({
        field: 'holderName',
        label: 'Holder Name',
        oldValue: oldName || 'Not recorded',
        newValue: newName || 'Not detected',
        status: isSame ? 'unchanged' : oldName && newName ? 'updated' : newName ? 'added' : 'removed',
        notes: isSame ? undefined : 'Holder name differs between documents',
      })
    }

    // 2. Compare Masked Identifier
    const oldId = existingDoc.maskedIdentifier || existingDoc.maskedNumber
    const newId = incomingMetadata.maskedIdentifier?.value
    if (oldId || newId) {
      const isSame = norm(oldId) === norm(newId)
      changes.push({
        field: 'identifier',
        label: 'Document Number',
        oldValue: oldId || 'Not recorded',
        newValue: newId || 'Not detected',
        status: isSame ? 'unchanged' : 'conflict',
        notes: isSame ? undefined : 'Document number differs — verify if this is the same document',
      })
    }

    // 3. Compare Address
    const oldAddr = existingDoc.address
    const newAddr = incomingMetadata.address?.value
    if (oldAddr || newAddr) {
      const isSame = norm(oldAddr) === norm(newAddr)
      changes.push({
        field: 'address',
        label: 'Address',
        oldValue: oldAddr || 'Not recorded',
        newValue: newAddr || 'Not detected',
        status: isSame ? 'unchanged' : oldAddr && newAddr ? 'updated' : newAddr ? 'added' : 'removed',
        notes: isSame ? undefined : 'Resident address has been updated',
      })
    }

    // 4. Compare Date of Birth
    const oldDob = existingDoc.dateOfBirth
    const newDob = incomingMetadata.dateOfBirth?.value
    if (oldDob || newDob) {
      const isSame = norm(oldDob) === norm(newDob)
      changes.push({
        field: 'dateOfBirth',
        label: 'Date of Birth',
        oldValue: oldDob || 'Not recorded',
        newValue: newDob || 'Not detected',
        status: isSame ? 'unchanged' : 'conflict',
      })
    }

    // 5. Evaluate overall version relationship
    const hasIdentifierConflict = changes.some((c) => c.field === 'identifier' && c.status === 'conflict')
    const hasNameConflict = changes.some((c) => c.field === 'holderName' && c.status === 'updated')
    const hasUpdates = changes.some((c) => c.status === 'updated' || c.status === 'added')
    const allUnchanged = changes.every((c) => c.status === 'unchanged')

    if (allUnchanged) {
      return {
        isLikelyNewVersion: false,
        isDuplicate: true,
        confidence: 'high',
        summary: `Identical to existing ${existingDoc.name} in your vault.`,
        changes,
        recommendedAction: 'keep_separate',
      }
    }

    if (hasIdentifierConflict) {
      return {
        isLikelyNewVersion: false,
        isDuplicate: false,
        confidence: 'medium',
        summary: 'Different document number detected. We recommend saving this as a separate document.',
        changes,
        recommendedAction: 'keep_separate',
      }
    }

    if (hasUpdates || hasNameConflict) {
      return {
        isLikelyNewVersion: true,
        isDuplicate: false,
        confidence: 'high',
        summary: 'Updated details detected (e.g. address or name). Recommended to save as a new version.',
        changes,
        recommendedAction: 'update_version',
      }
    }

    return {
      isLikelyNewVersion: true,
      isDuplicate: false,
      confidence: 'medium',
      summary: 'New document copy detected for this category.',
      changes,
      recommendedAction: 'update_version',
    }
  }

  /**
   * Generates actionable, non-intrusive internal vault insights across the user's document set.
   */
  async generateVaultInsights(documents: VaultDocument[]): Promise<DocumentInsight[]> {
    const insights: DocumentInsight[] = []

    for (const doc of documents) {
      if (doc.isCurrent === false) continue

      // Expiry Insights
      if (doc.expiryDate) {
        const parts = doc.expiryDate.split(/[/-]/)
        if (parts.length === 3) {
          const year = parseInt(parts[2].length === 4 ? parts[2] : parts[0], 10)
          const month = parseInt(parts[1], 10) - 1
          const day = parseInt(parts[2].length === 4 ? parts[0] : parts[2], 10)

          const expDate = new Date(year, month, day)
          if (!isNaN(expDate.getTime())) {
            const diffMs = expDate.getTime() - Date.now()
            const daysRemaining = Math.ceil(diffMs / (1000 * 60 * 60 * 24))

            if (daysRemaining < 0) {
              insights.push({
                id: `insight-exp-${doc.id}`,
                type: 'expiry',
                severity: 'attention',
                title: `${doc.name} has expired`,
                description: `Expired ${Math.abs(daysRemaining)} days ago on ${doc.expiryDate}. Consider uploading a renewed version.`,
                documentId: doc.id,
                documentName: doc.name,
                actionLabel: 'Update Document',
                createdAt: new Date().toISOString(),
              })
            } else if (daysRemaining <= 90) {
              insights.push({
                id: `insight-exp-${doc.id}`,
                type: 'expiry',
                severity: 'attention',
                title: `${doc.name} expires soon`,
                description: `Validity expires in ${daysRemaining} days (${doc.expiryDate}).`,
                documentId: doc.id,
                documentName: doc.name,
                actionLabel: 'View Details',
                createdAt: new Date().toISOString(),
              })
            }
          }
        }
      }

      // Metadata Attention Insights
      if (
        (doc.documentHolderName === 'Not detected' || !doc.documentHolderName) &&
        (doc.maskedIdentifier === 'Not detected' || !doc.maskedIdentifier)
      ) {
        insights.push({
          id: `insight-meta-${doc.id}`,
          type: 'metadata',
          severity: 'info',
          title: `Incomplete details for ${doc.name}`,
          description: 'Holder name and identifier were not detected. Tap to review and confirm metadata.',
          documentId: doc.id,
          documentName: doc.name,
          actionLabel: 'Review Metadata',
          createdAt: new Date().toISOString(),
        })
      }
    }

    return insights
  }
}
