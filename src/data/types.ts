export type DocumentCategory =
  | 'identity'
  | 'education'
  | 'certificate'
  | 'transport'
  | 'financial'
  | 'other'

export type DocumentTrustStatus =
  | 'personal_copy'
  | 'processed'
  | 'verified'
  | 'official_digital'
  | 'ocr_processed'
  | 'digilocker_matched'

export type DocumentFormat = 'pdf' | 'jpg' | 'jpeg' | 'png' | 'webp'

export type DocumentSource = 'personal_upload' | 'digilocker' | 'issuer_digital' | 'google_drive'

export type DocumentVisualType =
  | 'aadhaar'
  | 'pan'
  | 'driving-licence'
  | 'passport'
  | 'voter-id'
  | 'degree'
  | 'marksheet'
  | 'diploma'
  | 'certificate'
  | 'domicile'
  | 'income-certificate'
  | 'caste-certificate'
  | 'birth-certificate'
  | 'vehicle-rc'
  | 'insurance'
  | 'tax-form'
  | 'class-10-certificate'

export type StorageStatus = 'not_connected' | 'connecting' | 'connected' | 'error'

export type DriveConnectionState = 'not_connected' | 'connecting' | 'connected' | 'error'

export type VaultState = 'locked' | 'unlocked'

export type ActivityAction =
  | 'document_added'
  | 'document_viewed'
  | 'document_downloaded'
  | 'document_deleted'
  | 'vault_locked'
  | 'vault_unlocked'
  | 'drive_connected'
  | 'drive_disconnected'

// --- Document Page Architecture ---

export type DocumentPageSide = 'front' | 'back' | 'page'

export type DocumentPage = {
  id: string
  side: DocumentPageSide
  order: number
  driveFileId?: string
  mimeType: 'application/pdf' | 'image/jpeg' | 'image/png' | 'image/webp'
  dataUrl?: string
  width?: number
  height?: number
  file?: File
}

export type DocumentPageMode = 'single' | 'front_back' | 'multi_page'

export type DocumentMultiplicity = 'singleton' | 'multiple' | 'versioned'

export type MetadataSource = 'document' | 'user' | 'system' | 'none'
export type FieldConfidence = 'high' | 'medium' | 'low' | 'unknown'

export type ExtractedField<T> = {
  value?: T
  source: MetadataSource
  confidence?: FieldConfidence
  evidence?: string
}

export type DocumentValidationResult = 'plausible' | 'not_plausible' | 'unknown'

export type DriveFolder = {
  id: string
  name: string
  parentId?: string
  createdTime?: string
  webViewLink?: string
}

export type VaultStorageFolders = {
  identity?: DriveFolder
  education?: DriveFolder
  certificates?: DriveFolder
  transport?: DriveFolder
  financial?: DriveFolder
  other?: DriveFolder
}

export type VaultStorage = {
  provider: 'google_drive'
  status: DriveConnectionState
  accountEmail?: string
  rootFolder?: DriveFolder
  folders?: VaultStorageFolders
  totalFoldersCount: number
  lastChecked?: string
  errorMessage?: string
}

/**
 * Dormant Future Verification Types.
 * Prepared for future Phase without exposing to active UI or making API calls.
 */
export type VerificationSource = 'none' | 'digilocker' | 'other_official'

export type VerificationStatus = 'not_verified' | 'pending' | 'verified' | 'failed'

export type VaultDocument = {
  id: string
  logicalDocumentId: string

  type: string
  name: string
  shortName: string
  category: DocumentCategory
  secondaryCategories?: DocumentCategory[]

  displayName: string
  ownerName: string
  documentHolderName?: string
  documentHolderNameSource?: MetadataSource

  pages: DocumentPage[]
  pageMode: DocumentPageMode

  driveFileId?: string
  driveFolderId?: string

  originalFormat?: DocumentFormat
  canonicalFormat?: 'pdf'

  maskedNumber?: string
  maskedIdentifier?: string
  maskedIdentifierSource?: MetadataSource
  actualIdentifier?: string
  documentIdentifier?: string
  documentIdentifierSource?: MetadataSource
  encryptedIdentifier?: string
  fullNumberMock?: string

  issuer?: string
  issuerSource?: MetadataSource

  trustStatus: DocumentTrustStatus

  issueDate?: string
  expiryDate?: string
  expiryLabel?: string
  expiryState?: 'soon' | 'expired'

  dateOfBirth?: string
  dateOfBirthSource?: MetadataSource
  gender?: string
  genderSource?: MetadataSource
  address?: string
  addressSource?: MetadataSource
  fatherOrHusbandName?: string
  fatherOrHusbandNameSource?: MetadataSource

  version?: number
  isCurrent?: boolean

  favorite?: boolean
  favourite?: boolean

  createdAt: string
  updatedAt: string

  // UI Presentation Fields
  visualType: DocumentVisualType
  documentType: string
  source: DocumentSource
  sourceLabel: string
  format: DocumentFormat
  storedVersion: 'PDF'
  addedAt: string
  addedLabel: string
  activity: string
  derivedFileName: string
  fileSize?: string
  notes?: string
  thumbnailUrl?: string
  pdfBlobUrl?: string

  // Dormant verification fields
  verificationSource?: VerificationSource
  verificationStatus?: VerificationStatus
  verifiedAt?: string
  issuerReference?: string
}

export type Collection = {
  category: DocumentCategory
  name: string
  count: number
  previewDocumentIds: string[]
}

export type ActivityItem = {
  id: string
  actionType?: ActivityAction
  documentId?: string
  documentName?: string
  action: string
  time: string
  timestamp?: string
  badge?: string
}

export type DocumentFilters = {
  category: DocumentCategory | 'all'
  trustStatus: DocumentTrustStatus | 'all'
  expiry: 'all' | 'no_expiry' | 'expiring_soon' | 'expired'
  format: DocumentFormat | 'all'
}

export type Profile = {
  displayName: string
  identityName: string
  avatar?: string
  email?: string
}

export type SettingsState = {
  storageStatus: StorageStatus
  storageAccount: string
  storageDocumentCount: number
  storageLastSynced: string
  vaultLocked: boolean
  autoLockTimeout: 'immediate' | '1m' | '5m' | '10m' | '15m'
  sensitiveRevealTimeout: number // in seconds, default 30
  totalStorageUsed: string
  driveStorage?: VaultStorage
  // Dormant verification state
  digiLockerStatus?: string
  digiLockerLastVerified?: string
}
