import { useMemo, useRef, useState } from 'react'
import {
  AlertCircle,
  AlertTriangle,
  ArrowLeft,
  Camera,
  Check,
  CheckCircle2,
  ChevronRight,
  Edit3,
  Eye,
  EyeOff,
  FileCheck,
  FolderOpen,
  HelpCircle,
  RefreshCw,
  Scan,
  Sparkles,
  X,
} from 'lucide-react'
import { BottomSheet } from './BottomSheet'
import type {
  DocumentCategory,
  DocumentPage,
  ExtractedField,
  MetadataSource,
  VaultDocument,
} from '../data/types'
import { categoryCopy } from './DocumentMeta'
import { CategoryVisual } from './CategoryVisual'
import { DocumentVisual } from './DocumentVisual'
import {
  getDocumentTypeConfig,
  getDocumentTypesByCategory,
} from '../data/documentTypesRegistry'
import { validateDocumentFile } from '../services/pdfNormalization'
import { extractAndValidateDocumentPages } from '../services/documentValidation'
import { maskIdentifier } from '../services/securityService'
import { useVaultDocuments } from '../context/DocumentContext'
import { DocumentComparisonSheet } from './DocumentComparisonSheet'
import { intelligenceService } from '../services/intelligence/intelligenceService'
import type {
  ClassificationResult,
  MetadataExtractionResult,
  DocumentComparisonResult,
} from '../services/intelligence/intelligenceTypes'
import type { OCRResult } from '../services/ocr/ocrEngine'
import { parseOCRResult } from '../services/ocr/documentParsers'

type WizardStep =
  | 'category'
  | 'type'
  | 'front_file'
  | 'back_file'
  | 'multi_files'
  | 'ocr_scanning'
  | 'review'
  | 'uploading'

type ConfidenceLevel = 'high' | 'medium' | 'low' | 'unknown'

type AddDocumentWizardProps = {
  onClose: () => void
  onAddDocument: (newDoc: VaultDocument) => void
}

export function AddDocumentWizard({ onClose, onAddDocument }: AddDocumentWizardProps) {
  const { documents, uploadDocument } = useVaultDocuments()

  const [step, setStep] = useState<WizardStep>('category')
  const [selectedCategory, setSelectedCategory] = useState<DocumentCategory>('identity')
  const [selectedTypeKey, setSelectedTypeKey] = useState<string>('aadhaar')

  // Document Pages State (Front & Back or Multi-page)
  const [pages, setPages] = useState<DocumentPage[]>([])

  // Extracted Metadata State (Field-level confidence + source tracking)
  const [holderName, setHolderName] = useState<string>('')
  const [holderNameSource, setHolderNameSource] = useState<MetadataSource>('none')
  const [holderNameConf, setHolderNameConf] = useState<ConfidenceLevel>('unknown')

  const [maskedIdentifier, setMaskedIdentifier] = useState<string>('')
  const [actualIdentifier, setActualIdentifier] = useState<string>('')
  const [isIdentifierRevealedInReview, setIsIdentifierRevealedInReview] = useState<boolean>(false)
  const [maskedIdentifierSource, setMaskedIdentifierSource] = useState<MetadataSource>('none')
  const [maskedIdentifierConf, setMaskedIdentifierConf] = useState<ConfidenceLevel>('unknown')

  const [dateOfBirth, setDateOfBirth] = useState<string>('')
  const [dateOfBirthSource, setDateOfBirthSource] = useState<MetadataSource>('none')
  const [dateOfBirthConf, setDateOfBirthConf] = useState<ConfidenceLevel>('unknown')

  const [gender, setGender] = useState<string>('')
  const [genderSource, setGenderSource] = useState<MetadataSource>('none')
  const [genderConf, setGenderConf] = useState<ConfidenceLevel>('unknown')

  const [address, setAddress] = useState<string>('')
  const [addressSource, setAddressSource] = useState<MetadataSource>('none')
  const [addressConf, setAddressConf] = useState<ConfidenceLevel>('unknown')

  const [fatherOrHusbandName, setFatherOrHusbandName] = useState<string>('')
  const [fatherOrHusbandNameSource, setFatherOrHusbandNameSource] = useState<MetadataSource>('none')
  const [fatherOrHusbandNameConf, setFatherOrHusbandNameConf] = useState<ConfidenceLevel>('unknown')

  const [issueDate, setIssueDate] = useState<string>('')
  const [expiryDate, setExpiryDate] = useState<string>('')
  const [issuer, setIssuer] = useState<string>('')

  // Plausibility & Validation
  const [plausibility, setPlausibility] = useState<'plausible' | 'not_plausible' | 'unknown'>('unknown')
  const [plausibilityWarning, setPlausibilityWarning] = useState<string | null>(null)
  const [fileError, setFileError] = useState<string | null>(null)

  // OCR Live Progress
  const [ocrStageText, setOcrStageText] = useState('Reading document...')
  const [ocrStageIndex, setOcrStageIndex] = useState(1)

  // Image Replacement Reprocessing Prompt
  const [showReReadModal, setShowReReadModal] = useState(false)
  const [pendingReplacedPage, setPendingReplacedPage] = useState<DocumentPage | null>(null)

  // Comparison Sheet State for Duplicates/Versioning
  const [duplicateExistingDoc, setDuplicateExistingDoc] = useState<VaultDocument | null>(null)

  // Upload Progress
  const [uploadStatus, setUploadStatus] = useState('Preparing document...')
  const [uploadError, setUploadError] = useState<string | null>(null)

  // AI Document Intelligence States (Phase 6A)
  const [rawOcrCache, setRawOcrCache] = useState<OCRResult | null>(null)
  const [classificationResult, setClassificationResult] = useState<ClassificationResult | null>(null)
  const [metadataEnhancement, setMetadataEnhancement] = useState<MetadataExtractionResult | null>(null)
  const [versionComparison, setVersionComparison] = useState<DocumentComparisonResult | null>(null)
  const [dismissedTypeSuggestion, setDismissedTypeSuggestion] = useState(false)

  // Persistent File Input Refs (always mounted at root)
  const frontFileInputRef = useRef<HTMLInputElement>(null)
  const frontCameraInputRef = useRef<HTMLInputElement>(null)
  const backFileInputRef = useRef<HTMLInputElement>(null)
  const backCameraInputRef = useRef<HTMLInputElement>(null)
  const multiFileInputRef = useRef<HTMLInputElement>(null)

  const config = useMemo(() => getDocumentTypeConfig(selectedTypeKey), [selectedTypeKey])
  const categoryTypes = useMemo(
    () => getDocumentTypesByCategory(selectedCategory),
    [selectedCategory]
  )

  // Calculate actual document counts per category
  const categoryCounts = useMemo(() => {
    const counts: Record<DocumentCategory, number> = {
      identity: 0,
      education: 0,
      certificate: 0,
      transport: 0,
      financial: 0,
      other: 0,
    }
    documents.forEach((d) => {
      if (d.isCurrent !== false && counts[d.category] !== undefined) {
        counts[d.category]++
      }
    })
    return counts
  }, [documents])

  // Handle Category Selection
  const handleSelectCategory = (category: DocumentCategory) => {
    setSelectedCategory(category)
    const typesInCat = getDocumentTypesByCategory(category)
    if (typesInCat.length > 0) {
      setSelectedTypeKey(typesInCat[0].type)
    }
    setStep('type')
  }

  // Handle Type Selection
  const handleSelectType = (typeKey: string) => {
    setSelectedTypeKey(typeKey)
    setPages([])
    resetMetadata()
    setPlausibilityWarning(null)
    setFileError(null)

    const cfg = getDocumentTypeConfig(typeKey)
    if (cfg.supportsBackSide) {
      setStep('front_file')
    } else if (cfg.pageMode === 'multi_page') {
      setStep('multi_files')
    } else {
      setStep('front_file')
    }
  }

  const resetMetadata = () => {
    setHolderName('')
    setHolderNameSource('none')
    setHolderNameConf('unknown')

    setMaskedIdentifier('')
    setMaskedIdentifierSource('none')
    setMaskedIdentifierConf('unknown')

    setDateOfBirth('')
    setDateOfBirthSource('none')
    setDateOfBirthConf('unknown')

    setGender('')
    setGenderSource('none')
    setGenderConf('unknown')

    setAddress('')
    setAddressSource('none')
    setAddressConf('unknown')

    setFatherOrHusbandName('')
    setFatherOrHusbandNameSource('none')
    setFatherOrHusbandNameConf('unknown')

    setIssueDate('')
    setExpiryDate('')
    setIssuer(config.defaultIssuer)
    setPlausibility('unknown')
  }

  // Execute OCR and Metadata Extraction Pipeline
  const executeOCRAndGoToReview = async (pagesToAnalyze: DocumentPage[]) => {
    setStep('ocr_scanning')
    setOcrStageIndex(1)
    setOcrStageText('Reading document...')

    try {
      setOcrStageIndex(2)
      setOcrStageText('Extracting text locally...')

      const result = await extractAndValidateDocumentPages(
        pagesToAnalyze,
        selectedTypeKey,
        (stage) => {
          setOcrStageText(stage)
        }
      )

      setOcrStageIndex(3)
      setOcrStageText('Finding document details...')

      // Apply Extracted Values (only if not already edited by user)
      if (result.holderName?.value && holderNameSource !== 'user') {
        setHolderName(result.holderName.value)
        setHolderNameSource('document')
        setHolderNameConf(result.holderName.confidence || 'medium')
      }
      if (result.documentIdentifier?.value && maskedIdentifierSource !== 'user') {
        setActualIdentifier(result.documentIdentifier.value)
      }
      if (result.maskedIdentifier?.value && maskedIdentifierSource !== 'user') {
        setMaskedIdentifier(result.maskedIdentifier.value)
        setMaskedIdentifierSource('document')
        setMaskedIdentifierConf(result.maskedIdentifier.confidence || 'high')
      }
      if (result.dateOfBirth?.value && dateOfBirthSource !== 'user') {
        setDateOfBirth(result.dateOfBirth.value)
        setDateOfBirthSource('document')
        setDateOfBirthConf(result.dateOfBirth.confidence || 'medium')
      }
      if (result.gender?.value && genderSource !== 'user') {
        setGender(result.gender.value)
        setGenderSource('document')
        setGenderConf(result.gender.confidence || 'high')
      }
      if (result.address?.value && addressSource !== 'user') {
        setAddress(result.address.value)
        setAddressSource('document')
        setAddressConf(result.address.confidence || 'high')
      }
      if (result.fatherOrHusbandName?.value && fatherOrHusbandNameSource !== 'user') {
        setFatherOrHusbandName(result.fatherOrHusbandName.value)
        setFatherOrHusbandNameSource('document')
        setFatherOrHusbandNameConf(result.fatherOrHusbandName.confidence || 'medium')
      }
      if (result.issueDate?.value) {
        setIssueDate(result.issueDate.value)
      }
      if (result.expiryDate?.value) {
        setExpiryDate(result.expiryDate.value)
      }
      if (result.issuer?.value) {
        setIssuer(result.issuer.value)
      }

      setPlausibility(result.overallPlausibility)
      if (result.plausibilityReason) {
        setPlausibilityWarning(result.plausibilityReason)
      } else {
        setPlausibilityWarning(null)
      }

      setOcrStageIndex(4)
      setOcrStageText('Ready for review.')

      if (result.rawOcrResult) {
        setRawOcrCache(result.rawOcrResult)
        setDismissedTypeSuggestion(false)

        try {
          const cls = await intelligenceService.classifyDocument({
            ocrResult: result.rawOcrResult,
            pages: pagesToAnalyze,
            selectedTypeKey,
            selectedCategory,
          })
          setClassificationResult(cls)

          const enh = await intelligenceService.enhanceMetadata({
            ocrResult: result.rawOcrResult,
            parsedMetadata: result,
            documentTypeKey: selectedTypeKey,
            pages: pagesToAnalyze,
          })
          setMetadataEnhancement(enh)
        } catch {
          // Graceful fallback
        }
      }

      setStep('review')
    } catch {
      setStep('review')
    }
  }

  // Handle Smart Suggestion Apply
  const handleApplySmartSuggestion = (suggestedKey: string, suggestedCategory: DocumentCategory) => {
    setSelectedTypeKey(suggestedKey)
    setSelectedCategory(suggestedCategory)
    setDismissedTypeSuggestion(true)

    if (rawOcrCache) {
      const newParsed = parseOCRResult(rawOcrCache, suggestedKey)
      if (newParsed.holderName?.value) {
        setHolderName(newParsed.holderName.value)
        setHolderNameSource('document')
        setHolderNameConf(newParsed.holderName.confidence || 'high')
      }
      if (newParsed.maskedIdentifier?.value) {
        setMaskedIdentifier(newParsed.maskedIdentifier.value)
        setMaskedIdentifierSource('document')
        setMaskedIdentifierConf(newParsed.maskedIdentifier.confidence || 'high')
      }
      if (newParsed.documentIdentifier?.value) {
        setActualIdentifier(newParsed.documentIdentifier.value)
      }
      if (newParsed.dateOfBirth?.value) {
        setDateOfBirth(newParsed.dateOfBirth.value)
        setDateOfBirthSource('document')
        setDateOfBirthConf(newParsed.dateOfBirth.confidence || 'medium')
      }
      if (newParsed.gender?.value) {
        setGender(newParsed.gender.value)
        setGenderSource('document')
        setGenderConf(newParsed.gender.confidence || 'high')
      }
      if (newParsed.address?.value) {
        setAddress(newParsed.address.value)
        setAddressSource('document')
        setAddressConf(newParsed.address.confidence || 'high')
      }
      if (newParsed.issuer?.value) {
        setIssuer(newParsed.issuer.value)
      }
    }
  }

  // Handle Front File Selection
  const handleFrontFileSelected = async (file: File) => {
    setFileError(null)
    const val = validateDocumentFile(file)
    if (!val.valid || !val.format) {
      setFileError(val.error || 'Invalid file.')
      return
    }

    const dataUrl = URL.createObjectURL(file)
    const frontPage: DocumentPage = {
      id: `page-${Date.now()}-front`,
      side: 'front',
      order: 0,
      mimeType: file.type === 'application/pdf' ? 'application/pdf' : (`image/${val.format}` as any),
      dataUrl,
      file,
    }

    const nextPages = [frontPage]
    setPages(nextPages)

    if (config.supportsBackSide && step !== 'review') {
      setStep('back_file')
    } else {
      executeOCRAndGoToReview(nextPages)
    }
  }

  // Handle Back File Selection
  const handleBackFileSelected = async (file: File) => {
    setFileError(null)
    const val = validateDocumentFile(file)
    if (!val.valid || !val.format) {
      setFileError(val.error || 'Invalid file.')
      return
    }

    const dataUrl = URL.createObjectURL(file)
    const backPage: DocumentPage = {
      id: `page-${Date.now()}-back`,
      side: 'back',
      order: 1,
      mimeType: file.type === 'application/pdf' ? 'application/pdf' : (`image/${val.format}` as any),
      dataUrl,
      file,
    }

    const front = pages.find((p) => p.side === 'front') || pages[0]
    const nextPages = front ? [front, backPage] : [backPage]
    setPages(nextPages)

    executeOCRAndGoToReview(nextPages)
  }

  // Handle Multi-page files
  const handleMultiFilesSelected = async (files: FileList | File[]) => {
    setFileError(null)
    const newPages: DocumentPage[] = []

    for (let i = 0; i < files.length; i++) {
      const file = files[i]
      const val = validateDocumentFile(file)
      if (val.valid && val.format) {
        newPages.push({
          id: `page-${Date.now()}-${i}`,
          side: 'page',
          order: i,
          mimeType: file.type === 'application/pdf' ? 'application/pdf' : (`image/${val.format}` as any),
          dataUrl: URL.createObjectURL(file),
          file,
        })
      }
    }

    if (newPages.length === 0) {
      setFileError('No valid files selected.')
      return
    }

    setPages(newPages)
    executeOCRAndGoToReview(newPages)
  }

  // Handle Image Replacement trigger during Review
  const handleTriggerReplacePage = (side: 'front' | 'back') => {
    if (side === 'front') {
      frontFileInputRef.current?.click()
    } else {
      backFileInputRef.current?.click()
    }
  }

  // Check for existing duplicate / versioned document
  const handleStartSaveFlow = async () => {
    const existing = documents.find(
      (d) => (d.type === config.type || d.documentType === config.displayName) && d.isCurrent !== false
    )

    if (existing && (config.multiplicity === 'versioned' || config.multiplicity === 'singleton')) {
      setDuplicateExistingDoc(existing)
      if (rawOcrCache) {
        try {
          const comp = await intelligenceService.analyzeDocumentChanges({
            existingDoc: existing,
            incomingMetadata: {
              holderName: holderName ? { value: holderName, source: holderNameSource, confidence: holderNameConf } : undefined,
              maskedIdentifier: maskedIdentifier ? { value: maskedIdentifier, source: maskedIdentifierSource, confidence: maskedIdentifierConf } : undefined,
              documentIdentifier: actualIdentifier ? { value: actualIdentifier, source: maskedIdentifierSource, confidence: maskedIdentifierConf } : undefined,
              dateOfBirth: dateOfBirth ? { value: dateOfBirth, source: dateOfBirthSource, confidence: dateOfBirthConf } : undefined,
              address: address ? { value: address, source: addressSource, confidence: addressConf } : undefined,
              overallPlausibility: plausibility,
              detectedKeywords: [],
            },
            incomingOcr: rawOcrCache,
          })
          setVersionComparison(comp)
        } catch {
          // Graceful fallback
        }
      }
    } else {
      executeUpload(false)
    }
  }

  // Execute Upload
  const executeUpload = async (isNewVersion: boolean, existingDoc?: VaultDocument) => {
    setDuplicateExistingDoc(null)
    setStep('uploading')
    setUploadError(null)

    try {
      const versionNum = isNewVersion && existingDoc ? (existingDoc.version || 1) + 1 : 1
      const logicalId = existingDoc ? existingDoc.logicalDocumentId : `logical-${config.type}-${Date.now()}`

      // Always ensure maskedIdentifier is safely masked and actualIdentifier holds the full number
        const resolvedActual =
          actualIdentifier.trim() ||
          (maskedIdentifier && !/[Xx\*\u2022]/.test(maskedIdentifier) ? maskedIdentifier.trim() : undefined)
        const resolvedMasked =
          maskIdentifier(resolvedActual || maskedIdentifier, config.visualType) ||
          maskedIdentifier.trim() ||
          undefined

        const newDoc = await uploadDocument({
          pages,
          pageMode: config.pageMode,
          category: selectedCategory,
          visualType: config.visualType,
          documentType: config.displayName,
          displayName: config.displayName,
          logicalDocumentId: logicalId,
          documentHolderName: holderName.trim() || undefined,
          documentHolderNameSource: holderNameSource,
          maskedIdentifier: resolvedMasked,
          maskedIdentifierSource: maskedIdentifierSource,
          actualIdentifier: resolvedActual,
          documentIdentifier: resolvedActual || resolvedMasked,
          documentIdentifierSource: maskedIdentifierSource,
        dateOfBirth: dateOfBirth.trim() || undefined,
        dateOfBirthSource: dateOfBirthSource,
        gender: gender.trim() || undefined,
        genderSource: genderSource,
        address: address.trim() || undefined,
        addressSource: addressSource,
        fatherOrHusbandName: fatherOrHusbandName.trim() || undefined,
        fatherOrHusbandNameSource: fatherOrHusbandNameSource,
        issueDate: issueDate.trim() || undefined,
        expiryDate: expiryDate.trim() || undefined,
        issuer: issuer.trim() || config.defaultIssuer,
        issuerSource: 'document',
        version: versionNum,
        isCurrent: true,
        onProgress: (status) => setUploadStatus(status),
      })

      onAddDocument(newDoc)
      onClose()
    } catch (err: any) {
      setUploadError(err.message || 'Failed to save document.')
      setStep('review')
    }
  }

  const frontPage = pages.find((p) => p.side === 'front') || pages[0]
  const backPage = pages.find((p) => p.side === 'back') || pages[1]

  const categoriesList: DocumentCategory[] = [
    'identity',
    'education',
    'certificate',
    'transport',
    'financial',
    'other',
  ]

  // Count fields needing attention
  const needsAttentionCount = useMemo(() => {
    let count = 0
    if (holderNameConf === 'low' || holderNameConf === 'unknown' || !holderName.trim()) count++
    if (maskedIdentifierConf === 'low' || maskedIdentifierConf === 'unknown' || !maskedIdentifier.trim()) count++
    return count
  }, [holderName, holderNameConf, maskedIdentifier, maskedIdentifierConf])

  const renderConfidenceBadge = (conf: ConfidenceLevel, hasVal: boolean) => {
    if (!hasVal || conf === 'unknown') {
      return <span className="conf-badge conf-badge--none">Not detected</span>
    }
    switch (conf) {
      case 'high':
        return (
          <span className="conf-badge conf-badge--high">
            <Check size={11} /> Looks good
          </span>
        )
      case 'medium':
        return <span className="conf-badge conf-badge--medium">Please check</span>
      case 'low':
        return (
          <span className="conf-badge conf-badge--low">
            <AlertCircle size={11} /> Needs review
          </span>
        )
      default:
        return <span className="conf-badge conf-badge--none">Not detected</span>
    }
  }

  return (
    <BottomSheet title="Add Document" onClose={onClose}>
      <div className="add-sheet-container">
        {/* Persistent Hidden File Inputs at Component Root */}
        <input
          ref={frontFileInputRef}
          type="file"
          accept=".pdf,.jpg,.jpeg,.png,.webp"
          style={{ display: 'none' }}
          onChange={(e) => {
            if (e.target.files && e.target.files[0]) {
              handleFrontFileSelected(e.target.files[0])
              e.target.value = ''
            }
          }}
        />
        <input
          ref={frontCameraInputRef}
          type="file"
          accept="image/*"
          capture="environment"
          style={{ display: 'none' }}
          onChange={(e) => {
            if (e.target.files && e.target.files[0]) {
              handleFrontFileSelected(e.target.files[0])
              e.target.value = ''
            }
          }}
        />
        <input
          ref={backFileInputRef}
          type="file"
          accept=".pdf,.jpg,.jpeg,.png,.webp"
          style={{ display: 'none' }}
          onChange={(e) => {
            if (e.target.files && e.target.files[0]) {
              handleBackFileSelected(e.target.files[0])
              e.target.value = ''
            }
          }}
        />
        <input
          ref={backCameraInputRef}
          type="file"
          accept="image/*"
          capture="environment"
          style={{ display: 'none' }}
          onChange={(e) => {
            if (e.target.files && e.target.files[0]) {
              handleBackFileSelected(e.target.files[0])
              e.target.value = ''
            }
          }}
        />
        <input
          ref={multiFileInputRef}
          type="file"
          multiple
          accept=".pdf,.jpg,.jpeg,.png,.webp"
          style={{ display: 'none' }}
          onChange={(e) => {
            if (e.target.files && e.target.files.length > 0) {
              handleMultiFilesSelected(e.target.files)
              e.target.value = ''
            }
          }}
        />

        {/* Subtle Step Dots */}
        <div className="sheet-step-dots" aria-hidden="true">
          <span className={`step-dot ${step === 'category' ? 'step-dot--active' : ''}`} />
          <span className={`step-dot ${step === 'type' ? 'step-dot--active' : ''}`} />
          <span
            className={`step-dot ${
              step === 'front_file' || step === 'back_file' || step === 'multi_files'
                ? 'step-dot--active'
                : ''
            }`}
          />
          <span className={`step-dot ${step === 'review' || step === 'ocr_scanning' ? 'step-dot--active' : ''}`} />
        </div>

        {/* STEP 1: CATEGORY SELECTION TILES (2-COLUMN GRID) */}
        {step === 'category' && (
          <div className="add-step-flow">
            <header className="add-step-header">
              <h2>Add Document</h2>
              <p>Choose a collection</p>
            </header>

            <div className="category-tile-grid">
              {categoriesList.map((cat) => {
                const count = categoryCounts[cat]
                const countLabel =
                  count === 0 ? 'No documents yet' : `${count} document${count > 1 ? 's' : ''}`

                return (
                  <button
                    key={cat}
                    type="button"
                    className={`category-tile category-tile--${cat} glass-surface`}
                    onClick={() => handleSelectCategory(cat)}
                    aria-label={`Select ${categoryCopy[cat]} collection`}
                  >
                    <div className="category-tile-top">
                      <CategoryVisual category={cat} size={34} />
                      <ChevronRight size={15} className="category-tile-chevron" />
                    </div>

                    <div className="category-tile-info">
                      <strong className="category-tile-title">{categoryCopy[cat]}</strong>
                      <span className="category-tile-count">{countLabel}</span>
                    </div>
                  </button>
                )
              })}
            </div>
          </div>
        )}

        {/* STEP 2: DOCUMENT TYPE SELECTION LIST */}
        {step === 'type' && (
          <div className="add-step-flow">
            <header className="add-step-header">
              <button
                type="button"
                className="step-back-btn"
                onClick={() => setStep('category')}
              >
                <ArrowLeft size={16} />
                <span>Collections</span>
              </button>
              <h2>{categoryCopy[selectedCategory]}</h2>
              <p>Choose document type</p>
            </header>

            <div className="doctype-list">
              {categoryTypes.map((typeCfg) => (
                <button
                  key={typeCfg.type}
                  type="button"
                  className="doctype-row glass-surface"
                  onClick={() => handleSelectType(typeCfg.type)}
                >
                  <div className="doctype-visual-wrap">
                    <DocumentVisual type={typeCfg.visualType} decorative />
                  </div>

                  <div className="doctype-info">
                    <div className="doctype-title-row">
                      <strong className="doctype-title">{typeCfg.displayName}</strong>
                      {typeCfg.supportsBackSide && (
                        <span className="doctype-side-tag">Front + Back</span>
                      )}
                    </div>
                    <span className="doctype-sub">{typeCfg.description}</span>
                  </div>

                  <ChevronRight size={18} className="doctype-chevron" />
                </button>
              ))}
            </div>
          </div>
        )}

        {/* STEP 3: FRONT SIDE / SINGLE FILE UPLOAD CARDS */}
        {step === 'front_file' && (
          <div className="add-step-flow">
            <header className="add-step-header">
              <button
                type="button"
                className="step-back-btn"
                onClick={() => setStep('type')}
              >
                <ArrowLeft size={16} />
                <span>{categoryCopy[selectedCategory]}</span>
              </button>
              <h2>{config.displayName}</h2>
              <p>{config.supportsBackSide ? 'Step 1 · Front side' : 'Upload document'}</p>
            </header>

            {fileError && (
              <div className="upload-error-callout" role="alert">
                <AlertCircle size={15} />
                <span>{fileError}</span>
              </div>
            )}

            {/* Action Cards */}
            <div className="upload-action-grid">
              <button
                type="button"
                className="upload-action-card glass-surface"
                onClick={() => frontCameraInputRef.current?.click()}
              >
                <div className="action-card-icon action-card-icon--camera">
                  <Camera size={26} />
                </div>
                <strong className="action-card-title">Take Photo</strong>
                <span className="action-card-desc">Scan or photograph physical card</span>
              </button>

              <button
                type="button"
                className="upload-action-card glass-surface"
                onClick={() => frontFileInputRef.current?.click()}
              >
                <div className="action-card-icon action-card-icon--file">
                  <FolderOpen size={26} />
                </div>
                <strong className="action-card-title">Choose File</strong>
                <span className="action-card-desc">PDF, JPG, PNG, WEBP up to 35MB</span>
              </button>
            </div>
          </div>
        )}

        {/* STEP 4: BACK SIDE UPLOAD (FOR FRONT/BACK DOCUMENTS) */}
        {step === 'back_file' && (
          <div className="add-step-flow">
            <header className="add-step-header">
              <button
                type="button"
                className="step-back-btn"
                onClick={() => setStep('front_file')}
              >
                <ArrowLeft size={16} />
                <span>Replace Front</span>
              </button>
              <h2>{config.displayName}</h2>
              <p>Step 2 · Back side (Optional)</p>
            </header>

            {/* Front Added Summary Card */}
            <div
              className="side-status-card glass-surface"
              onClick={() => frontFileInputRef.current?.click()}
              role="button"
              tabIndex={0}
              title="Click to replace front side"
            >
              <div className="side-status-thumb">
                {frontPage?.dataUrl ? (
                  <img src={frontPage.dataUrl} alt="Front preview" />
                ) : (
                  <FileCheck size={24} />
                )}
              </div>
              <div className="side-status-text">
                <div className="side-status-badge">
                  <CheckCircle2 size={13} className="text-success" />
                  <span>Front side added</span>
                </div>
                <small>Tap to replace, or add back side below</small>
              </div>
            </div>

            {/* Action Cards for Back Side */}
            <div className="upload-action-grid">
              <button
                type="button"
                className="upload-action-card glass-surface"
                onClick={() => backCameraInputRef.current?.click()}
              >
                <div className="action-card-icon action-card-icon--camera">
                  <Camera size={26} />
                </div>
                <strong className="action-card-title">Photograph Back</strong>
                <span className="action-card-desc">Scan address & details on reverse</span>
              </button>

              <button
                type="button"
                className="upload-action-card glass-surface"
                onClick={() => backFileInputRef.current?.click()}
              >
                <div className="action-card-icon action-card-icon--file">
                  <FolderOpen size={26} />
                </div>
                <strong className="action-card-title">Choose Back File</strong>
                <span className="action-card-desc">PDF, JPG, PNG or WEBP</span>
              </button>
            </div>

            <div className="skip-back-row">
              <button
                type="button"
                className="skip-back-btn"
                onClick={() => executeOCRAndGoToReview(pages)}
              >
                <span>Continue with Front side only</span>
                <ChevronRight size={15} />
              </button>
            </div>
          </div>
        )}

        {/* STEP 4B: MULTI-PAGE UPLOAD */}
        {step === 'multi_files' && (
          <div className="add-step-flow">
            <header className="add-step-header">
              <button
                type="button"
                className="step-back-btn"
                onClick={() => setStep('type')}
              >
                <ArrowLeft size={16} />
                <span>{categoryCopy[selectedCategory]}</span>
              </button>
              <h2>{config.displayName}</h2>
              <p>Multi-page document</p>
            </header>

            <div className="upload-action-grid">
              <button
                type="button"
                className="upload-action-card upload-action-card--wide glass-surface"
                onClick={() => multiFileInputRef.current?.click()}
              >
                <div className="action-card-icon action-card-icon--file">
                  <FolderOpen size={28} />
                </div>
                <strong className="action-card-title">Select All Pages / PDF</strong>
                <span className="action-card-desc">
                  Select multi-page PDF or multiple images in order (up to 35MB)
                </span>
              </button>
            </div>
          </div>
        )}

        {/* STEP 4C: OCR SCANNING LIVE PROGRESS */}
        {step === 'ocr_scanning' && (
          <div className="add-step-flow ocr-scanning-flow">
            <div className="ocr-scanning-card glass-surface">
              <div className="ocr-scanning-icon-wrap">
                <Scan size={36} className="ocr-scan-pulse-icon" />
              </div>
              <h3>Reading your document</h3>
              <p className="ocr-sub-status">{ocrStageText}</p>

              {/* Progress Steps Indicator */}
              <div className="ocr-stepper">
                <div className={`ocr-step-item ${ocrStageIndex >= 1 ? 'ocr-step-item--done' : ''}`}>
                  <div className="ocr-step-check">{ocrStageIndex > 1 ? '✓' : '1'}</div>
                  <span>Reading document</span>
                </div>
                <div className={`ocr-step-item ${ocrStageIndex >= 2 ? 'ocr-step-item--done' : ''}`}>
                  <div className="ocr-step-check">{ocrStageIndex > 2 ? '✓' : '2'}</div>
                  <span>Extracting text</span>
                </div>
                <div className={`ocr-step-item ${ocrStageIndex >= 3 ? 'ocr-step-item--done' : ''}`}>
                  <div className="ocr-step-check">{ocrStageIndex > 3 ? '✓' : '3'}</div>
                  <span>Finding details</span>
                </div>
                <div className={`ocr-step-item ${ocrStageIndex >= 4 ? 'ocr-step-item--done' : ''}`}>
                  <div className="ocr-step-check">4</div>
                  <span>Review</span>
                </div>
              </div>
            </div>
          </div>
        )}

        {/* STEP 5: REVIEW & CONFIRMATION */}
        {step === 'review' && (
          <div className="add-step-flow">
            <header className="add-step-header">
              <button
                type="button"
                className="step-back-btn"
                onClick={() => setStep(config.supportsBackSide ? 'front_file' : 'type')}
              >
                <ArrowLeft size={16} />
                <span>Change file</span>
              </button>
              <h2>We found these details</h2>
              <p>Please check them before saving to Google Drive</p>
            </header>

            {/* AI Document Intelligence Smart Suggestion (Phase 6A) */}
            {classificationResult &&
              classificationResult.isTypeChangeSuggested &&
              !dismissedTypeSuggestion && (
                <div
                  className="ai-suggestion-card"
                  role="region"
                  aria-label="Smart Document Type Suggestion"
                >
                  <div className="ai-suggestion-header">
                    <span className="ai-suggestion-tag">
                      <Sparkles size={13} />
                      <span>Smart suggestion</span>
                    </span>
                    <span
                      className={`conf-badge conf-badge--${classificationResult.confidence}`}
                    >
                      {classificationResult.confidence === 'high'
                        ? 'High Confidence'
                        : 'Suggested'}
                    </span>
                  </div>
                  <h4 className="ai-suggestion-title">
                    Looks like {classificationResult.suggestedDisplayName}
                  </h4>
                  {classificationResult.reasons.length > 0 && (
                    <div className="ai-suggestion-reasons">
                      {classificationResult.reasons.slice(0, 3).map((reason, idx) => (
                        <div key={idx} className="ai-reason-item">
                          <span className="ai-reason-bullet" />
                          <span>{reason}</span>
                        </div>
                      ))}
                    </div>
                  )}
                  <div className="ai-suggestion-actions">
                    <button
                      type="button"
                      className="ai-suggestion-apply-btn"
                      onClick={() =>
                        handleApplySmartSuggestion(
                          classificationResult.suggestedTypeKey,
                          classificationResult.suggestedCategory
                        )
                      }
                    >
                      <Check size={14} />
                      <span>Use {classificationResult.suggestedDisplayName}</span>
                    </button>
                    <button
                      type="button"
                      className="ai-suggestion-dismiss-btn"
                      onClick={() => setDismissedTypeSuggestion(true)}
                    >
                      Keep {config.displayName}
                    </button>
                  </div>
                </div>
              )}

            {/* Plausibility / Quality Alert */}
            {plausibility === 'not_plausible' && (
              <div className="ocr-alert-card ocr-alert-card--warning glass-surface" role="alert">
                <AlertTriangle size={17} className="text-warning" />
                <div className="ocr-alert-content">
                  <strong>Document Mismatch Notice</strong>
                  <p>
                    {plausibilityWarning ||
                      `This file doesn't appear to match the selected ${config.displayName}. We couldn't find enough document evidence.`}
                  </p>
                </div>
              </div>
            )}

            {/* Attention Chip */}
            {needsAttentionCount > 0 ? (
              <div className="ocr-attention-bar glass-surface">
                <span className="attention-dot" />
                <span>
                  {needsAttentionCount} detail{needsAttentionCount > 1 ? 's' : ''} need your attention
                </span>
              </div>
            ) : (
              <div className="ocr-attention-bar ocr-attention-bar--good glass-surface">
                <CheckCircle2 size={14} className="text-success" />
                <span>All detected details look good</span>
              </div>
            )}

            {/* Physical Document Sides Preview with Click-to-Replace */}
            <div className="review-sides-container">
              {frontPage && (
                <div className="review-side-item glass-surface">
                  <div className="review-side-head">
                    <span>{config.supportsBackSide ? 'FRONT' : 'PAGE 1'}</span>
                    <button
                      type="button"
                      className="replace-side-btn"
                      onClick={() => handleTriggerReplacePage('front')}
                    >
                      Replace
                    </button>
                  </div>
                  <div
                    className="review-side-img"
                    onClick={() => handleTriggerReplacePage('front')}
                    role="button"
                    tabIndex={0}
                    title="Click to replace front side"
                  >
                    {frontPage.dataUrl ? (
                      <img src={frontPage.dataUrl} alt="Front preview" />
                    ) : (
                      <FileCheck size={28} />
                    )}
                  </div>
                </div>
              )}

              {backPage ? (
                <div className="review-side-item glass-surface">
                  <div className="review-side-head">
                    <span>BACK</span>
                    <button
                      type="button"
                      className="replace-side-btn"
                      onClick={() => handleTriggerReplacePage('back')}
                    >
                      Replace
                    </button>
                  </div>
                  <div
                    className="review-side-img"
                    onClick={() => handleTriggerReplacePage('back')}
                    role="button"
                    tabIndex={0}
                    title="Click to replace back side"
                  >
                    {backPage.dataUrl ? (
                      <img src={backPage.dataUrl} alt="Back preview" />
                    ) : (
                      <FileCheck size={28} />
                    )}
                  </div>
                </div>
              ) : config.supportsBackSide ? (
                <div
                  className="review-side-item review-side-item--add glass-surface"
                  onClick={() => backFileInputRef.current?.click()}
                  role="button"
                  tabIndex={0}
                >
                  <div className="review-side-head">
                    <span>BACK</span>
                    <span className="add-side-badge">+ Add</span>
                  </div>
                  <div className="review-side-img review-side-img--empty">
                    <FolderOpen size={24} />
                    <small>Add reverse side</small>
                  </div>
                </div>
              ) : null}
            </div>

            {/* Structured Editable Fields */}
            <div className="review-fields-card glass-surface">
              {/* Holder Name Field */}
              <div className="review-field-group">
                <div className="field-head-row">
                  <label htmlFor="holderNameInput">Holder Name</label>
                  {renderConfidenceBadge(holderNameConf, Boolean(holderName.trim()))}
                </div>
                <div className="field-input-wrap">
                  <input
                    id="holderNameInput"
                    type="text"
                    className="review-text-input"
                    value={holderName}
                    placeholder="Enter full name"
                    onChange={(e) => {
                      setHolderName(e.target.value)
                      setHolderNameSource('user')
                    }}
                  />
                  <Edit3 size={13} className="field-edit-icon" />
                </div>
              </div>

              {/* Document Number / Identifier Field */}
              <div className="review-field-group">
                <div className="field-head-row">
                  <label htmlFor="identifierInput">Document Number</label>
                  {renderConfidenceBadge(maskedIdentifierConf, Boolean((actualIdentifier || maskedIdentifier).trim()))}
                </div>
                <div className="field-input-wrap">
                  <input
                    id="identifierInput"
                    type="text"
                    className="review-text-input"
                    value={
                      isIdentifierRevealedInReview
                        ? actualIdentifier || maskedIdentifier
                        : maskedIdentifier || maskIdentifier(actualIdentifier, config.visualType)
                    }
                    placeholder="e.g. XXXX XXXX 2486"
                    onChange={(e) => {
                      const val = e.target.value
                      const clean = val.trim()
                      setMaskedIdentifierSource('user')
                      if (!/[Xx\*\u2022]/.test(clean) && clean.length > 0) {
                        let formattedActual = clean
                        if (config.visualType === 'aadhaar') {
                          const digits = clean.replace(/\D/g, '')
                          if (digits.length === 12) {
                            formattedActual = `${digits.slice(0, 4)} ${digits.slice(4, 8)} ${digits.slice(8, 12)}`
                          } else {
                            formattedActual = digits
                          }
                        } else if (config.visualType === 'pan') {
                          formattedActual = clean.replace(/\s+/g, '').toUpperCase()
                        }
                        setActualIdentifier(formattedActual)
                        const computedMask = maskIdentifier(formattedActual, config.visualType)
                        setMaskedIdentifier(computedMask)
                        setMaskedIdentifierConf('high')
                      } else {
                        setMaskedIdentifier(val)
                        const lastDigits = clean.replace(/\D/g, '')
                        if (lastDigits.length >= 4 && actualIdentifier) {
                          const actualDigits = actualIdentifier.replace(/\D/g, '')
                          if (!actualDigits.endsWith(lastDigits.slice(-4))) {
                            setActualIdentifier('')
                          }
                        }
                        setMaskedIdentifierConf(clean.length > 0 ? 'high' : 'unknown')
                      }
                    }}
                  />
                  <button
                    type="button"
                    onClick={() => setIsIdentifierRevealedInReview(!isIdentifierRevealedInReview)}
                    title={isIdentifierRevealedInReview ? 'Mask number' : 'Show full number'}
                    style={{
                      background: 'none',
                      border: 'none',
                      padding: '0 6px',
                      cursor: 'pointer',
                      color: 'var(--ink-soft, #64748b)',
                      display: 'flex',
                      alignItems: 'center',
                    }}
                  >
                    {isIdentifierRevealedInReview ? <EyeOff size={14} /> : <Eye size={14} />}
                  </button>
                  <Edit3 size={13} className="field-edit-icon" />
                </div>
                <span style={{ fontSize: '0.72rem', color: 'var(--ink-muted, #94a3b8)', marginTop: '0.25rem', display: 'block' }}>
                  🔒 Card displays masked ({maskIdentifier(actualIdentifier || maskedIdentifier, config.visualType) || 'XXXX XXXX 1234'}). Full number is protected and revealable anytime.
                </span>
              </div>

              {/* Date of Birth Field (if detected or identity/transport) */}
              {(dateOfBirth || selectedCategory === 'identity' || selectedCategory === 'transport') && (
                <div className="review-field-group">
                  <div className="field-head-row">
                    <label htmlFor="dobInput">Date of Birth</label>
                    {renderConfidenceBadge(dateOfBirthConf, Boolean(dateOfBirth.trim()))}
                  </div>
                  <div className="field-input-wrap">
                    <input
                      id="dobInput"
                      type="text"
                      className="review-text-input"
                      value={dateOfBirth}
                      placeholder="DD/MM/YYYY"
                      onChange={(e) => {
                        setDateOfBirth(e.target.value)
                        setDateOfBirthSource('user')
                      }}
                    />
                    <Edit3 size={13} className="field-edit-icon" />
                  </div>
                </div>
              )}

              {/* Address Field (if detected or Aadhaar/DL) */}
              {(address || selectedTypeKey === 'aadhaar' || selectedTypeKey === 'driving-licence') && (
                <div className="review-field-group">
                  <div className="field-head-row">
                    <label htmlFor="addressInput">Address</label>
                    {renderConfidenceBadge(addressConf, Boolean(address.trim()))}
                  </div>
                  <div className="field-input-wrap">
                    <textarea
                      id="addressInput"
                      rows={2}
                      className="review-text-input review-textarea"
                      value={address}
                      placeholder="Enter registered address"
                      onChange={(e) => {
                        setAddress(e.target.value)
                        setAddressSource('user')
                      }}
                    />
                    <Edit3 size={13} className="field-edit-icon" />
                  </div>
                </div>
              )}

              {/* Father / Husband Name (if detected or PAN/Voter) */}
              {fatherOrHusbandName && (
                <div className="review-field-group">
                  <div className="field-head-row">
                    <label htmlFor="relativeInput">Father / Relative Name</label>
                    {renderConfidenceBadge(fatherOrHusbandNameConf, true)}
                  </div>
                  <div className="field-input-wrap">
                    <input
                      id="relativeInput"
                      type="text"
                      className="review-text-input"
                      value={fatherOrHusbandName}
                      onChange={(e) => {
                        setFatherOrHusbandName(e.target.value)
                        setFatherOrHusbandNameSource('user')
                      }}
                    />
                    <Edit3 size={13} className="field-edit-icon" />
                  </div>
                </div>
              )}

              {/* Summary Footer */}
              <div className="review-fields-footer">
                <span className="summary-canonical-tag">Canonical PDF · {pages.length} page(s)</span>
                <span className="summary-drive-tag">Google Drive · {categoryCopy[selectedCategory]}</span>
              </div>
            </div>

            {/* Action Buttons */}
            <div className="sheet-button-stack" style={{ marginTop: 14 }}>
              <button
                type="button"
                className="primary-button primary-button--full"
                onClick={handleStartSaveFlow}
              >
                <Check size={16} />
                <span>Confirm & Save to Google Drive</span>
              </button>
              <button
                type="button"
                className="secondary-button secondary-button--full"
                onClick={() => setStep(config.supportsBackSide ? 'front_file' : 'type')}
              >
                Choose Another Document
              </button>
            </div>
          </div>
        )}

        {/* STEP 6: UPLOADING LIVE STATUS */}
        {step === 'uploading' && (
          <div className="wizard-step wizard-step--uploading">
            <div className="upload-spinner-wrap">
              <Sparkles className="spin-icon" size={34} />
            </div>
            <h3>Saving to Vault</h3>
            <p className="upload-status-text">{uploadStatus}</p>
            <small className="upload-sub-text">
              Compiling {pages.length}-page canonical PDF to Google Drive ({categoryCopy[selectedCategory]})
            </small>
          </div>
        )}

        {/* DUPLICATE / VERSION COMPARISON SHEET */}
        {duplicateExistingDoc && (
          <DocumentComparisonSheet
            currentDocument={duplicateExistingDoc}
            newDocumentTypeLabel={config.displayName}
            newPages={pages}
            newHolderName={holderName.trim() || undefined}
            newMaskedIdentifier={maskedIdentifier.trim() || undefined}
            comparisonResult={versionComparison}
            onConfirmNewVersion={() => executeUpload(true, duplicateExistingDoc)}
            onCancel={() => setDuplicateExistingDoc(null)}
          />
        )}
      </div>
    </BottomSheet>
  )
}
