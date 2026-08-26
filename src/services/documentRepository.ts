import type {
  DocumentCategory,
  DocumentFormat,
  DocumentPage,
  DocumentPageMode,
  DocumentVisualType,
  MetadataSource,
  VaultDocument,
  VaultStorage,
  VaultStorageFolders,
} from '../data/types'
import { normalizePagesToCanonicalPdf } from './pdfNormalization'
import { getStoredDriveStorage, requestDriveToken, driveLog } from './googleDrive'
import { isGoogleAuthConfigured } from './googleAuth'
import { getDocumentTypeConfig } from '../data/documentTypesRegistry'
import {
  getIndexedDBDocuments,
  saveIndexedDBDocuments,
  buildVaultManifest,
} from './vaultStorageService'

export type UploadDocumentInput = {
  pages: DocumentPage[]
  pageMode: DocumentPageMode
  category: DocumentCategory
  visualType: DocumentVisualType
  documentType: string
  displayName: string
  logicalDocumentId?: string
  documentHolderName?: string
  documentHolderNameSource?: MetadataSource
  maskedIdentifier?: string
  maskedIdentifierSource?: MetadataSource
  actualIdentifier?: string
  documentIdentifier?: string
  documentIdentifierSource?: MetadataSource
  dateOfBirth?: string
  dateOfBirthSource?: MetadataSource
  gender?: string
  genderSource?: MetadataSource
  address?: string
  addressSource?: MetadataSource
  fatherOrHusbandName?: string
  fatherOrHusbandNameSource?: MetadataSource
  issueDate?: string
  issueDateSource?: MetadataSource
  issuer?: string
  issuerSource?: MetadataSource
  expiryDate?: string
  version?: number
  isCurrent?: boolean
  onProgress?: (statusText: string) => void
}

export interface DocumentRepository {
  getDocuments(): Promise<VaultDocument[]>
  getDocument(id: string): Promise<VaultDocument | null>
  getVersionHistory(logicalDocumentId: string): Promise<VaultDocument[]>
  uploadDocument(input: UploadDocumentInput): Promise<VaultDocument>
  deleteDocument(id: string): Promise<void>
  downloadDocument(id: string): Promise<{ blob: Blob; fileName: string }>
  toggleFavorite(id: string): Promise<VaultDocument | null>
  syncVault(): Promise<VaultDocument[]>
}

// In-memory runtime cache for seamless UI reactivity
let inMemoryDocs: VaultDocument[] | null = null

/**
 * Diagnostic logger for Vault lifecycle (avoids sensitive tokens or numbers).
 */
function vaultLog(stage: string, detail?: string | number) {
  if (import.meta.env.DEV) {
    if (detail !== undefined) {
      console.log(`[Vault] ${stage}:`, detail)
    } else {
      console.log(`[Vault] ${stage}`)
    }
  }
}

/**
 * Maps a raw Google Drive file object to a structured VaultDocument.
 */
function mapDriveFileToVaultDocument(
  file: any,
  folderMap?: VaultStorageFolders,
  localCacheMap?: Map<string, VaultDocument>
): VaultDocument {
  const props = file.appProperties || {}
  const matchedLocal = localCacheMap?.get(file.id)

  // 1. Determine category: from appProperties or parent folder ID
  let category: DocumentCategory = (props.category as DocumentCategory) || 'identity'
  if (!props.category && folderMap && file.parents?.[0]) {
    const parentId = file.parents[0]
    for (const [catKey, folder] of Object.entries(folderMap)) {
      if (folder?.id === parentId) {
        category = catKey as DocumentCategory
        break
      }
    }
  }

  // 2. Determine document type: from appProperties or filename heuristic
  let docType = props.documentType
  if (!docType) {
    const lowerName = (file.name || '').toLowerCase()
    if (lowerName.includes('aadhaar') || lowerName.includes('aadhar')) docType = 'aadhaar'
    else if (lowerName.includes('pan')) docType = 'pan'
    else if (lowerName.includes('driving') || lowerName.includes('licence') || lowerName.includes('license')) docType = 'driving-licence'
    else if (lowerName.includes('passport')) docType = 'passport'
    else if (lowerName.includes('voter')) docType = 'voter-id'
    else if (lowerName.includes('degree')) docType = 'degree'
    else if (lowerName.includes('certificate')) docType = 'certificate'
    else docType = 'custom'
  }

  const config = getDocumentTypeConfig(docType)
  const displayName = props.displayName || file.name.replace(/\.pdf$/i, '')
  const logicalId = props.logicalDocumentId || `doc-logical-${file.id}`

  return {
    id: file.id,
    logicalDocumentId: logicalId,
    type: docType,
    name: displayName,
    displayName,
    shortName: config.shortName || displayName,
    category: category || config.category || 'identity',
    visualType: (props.visualType as DocumentVisualType) || config.visualType || 'aadhaar',
    documentType: docType,

    // Holder name & verified values
    ownerName: props.documentHolderName || matchedLocal?.documentHolderName || 'Not detected',
    documentHolderName: props.documentHolderName || matchedLocal?.documentHolderName || undefined,
    documentHolderNameSource:
      (props.documentHolderNameSource as MetadataSource) ||
      matchedLocal?.documentHolderNameSource ||
      'none',

    maskedNumber: props.maskedIdentifier || matchedLocal?.maskedIdentifier || undefined,
    maskedIdentifier: props.maskedIdentifier || matchedLocal?.maskedIdentifier || undefined,
    maskedIdentifierSource: (props.maskedIdentifierSource as MetadataSource) || matchedLocal?.maskedIdentifierSource || 'none',
    actualIdentifier: matchedLocal?.actualIdentifier || props.actualIdentifier || undefined,
    documentIdentifier: matchedLocal?.documentIdentifier || props.documentIdentifier || undefined,
    documentIdentifierSource: (props.documentIdentifierSource as MetadataSource) || matchedLocal?.documentIdentifierSource || 'none',
    fullNumberMock: matchedLocal?.actualIdentifier || matchedLocal?.documentIdentifier || props.actualIdentifier || props.maskedIdentifier || undefined,

    issuer: props.issuer || config.defaultIssuer,
    issuerSource: (props.issuerSource as MetadataSource) || 'none',

    dateOfBirth: props.dateOfBirth || matchedLocal?.dateOfBirth || undefined,
    dateOfBirthSource: (props.dateOfBirthSource as MetadataSource) || 'none',
    gender: props.gender || matchedLocal?.gender || undefined,
    genderSource: (props.genderSource as MetadataSource) || 'none',
    address: props.address || matchedLocal?.address || undefined,
    addressSource: (props.addressSource as MetadataSource) || 'none',
    fatherOrHusbandName: props.fatherOrHusbandName || matchedLocal?.fatherOrHusbandName || undefined,
    fatherOrHusbandNameSource: (props.fatherOrHusbandNameSource as MetadataSource) || 'none',
    issueDate: props.issueDate || matchedLocal?.issueDate || undefined,
    expiryDate: props.expiryDate || matchedLocal?.expiryDate || undefined,

    source: 'google_drive',
    sourceLabel: 'Google Drive',
    format: (props.originalFormat as any) || matchedLocal?.format || 'pdf',
    storedVersion: 'PDF',
    trustStatus: (props.trustStatus as any) || matchedLocal?.trustStatus || 'personal_copy',

    pages: matchedLocal?.pages || [],
    pageMode: (props.pageMode as DocumentPageMode) || matchedLocal?.pageMode || config.pageMode || 'single',

    version: props.version ? parseInt(props.version, 10) : matchedLocal?.version || 1,
    isCurrent: props.isCurrent !== 'false',

    addedAt: file.createdTime || new Date().toISOString(),
    addedLabel: 'Saved to Google Drive',
    activity: 'Uploaded to Google Drive',
    favorite: props.favorite === 'true' || matchedLocal?.favorite || false,
    favourite: props.favorite === 'true' || matchedLocal?.favourite || false,
    derivedFileName: file.name,
    fileSize: file.size ? `${(parseInt(file.size, 10) / 1024).toFixed(1)} KB` : matchedLocal?.fileSize,
    thumbnailUrl: matchedLocal?.thumbnailUrl,
    pdfBlobUrl: matchedLocal?.pdfBlobUrl,
    createdAt: file.createdTime || matchedLocal?.createdAt || new Date().toISOString(),
    updatedAt: file.modifiedTime || matchedLocal?.updatedAt || new Date().toISOString(),
  }
}

/**
 * Authoritative Google Drive Document Repository.
 */
export class GoogleDriveDocumentRepository implements DocumentRepository {
  private driveStorage: VaultStorage | null
  private userEmail?: string
  private isSyncing = false

  constructor(driveStorage?: VaultStorage | null, userEmail?: string) {
    this.driveStorage = driveStorage || getStoredDriveStorage()
    this.userEmail = userEmail
  }

  public setStorage(storage: VaultStorage | null, userEmail?: string) {
    this.driveStorage = storage
    this.userEmail = userEmail
    vaultLog('Storage reference updated', storage?.rootFolder?.id || 'none')
  }

  private async getValidAccessToken(): Promise<string> {
    if (isGoogleAuthConfigured()) {
      return await requestDriveToken(this.userEmail)
    }
    return 'dev-mock-token'
  }

  private getCategoryFolderId(category: DocumentCategory): string {
    const folder = this.driveStorage?.folders?.[category as keyof typeof this.driveStorage.folders]
    if (folder?.id) {
      return folder.id
    }
    if (this.driveStorage?.rootFolder?.id) {
      return this.driveStorage.rootFolder.id
    }
    return 'root'
  }

  /**
   * Retrieves all documents, loading immediately from IndexedDB and syncing with Google Drive.
   */
  async getDocuments(): Promise<VaultDocument[]> {
    // 1. If in-memory cache is populated, return it immediately
    if (inMemoryDocs !== null && inMemoryDocs.length > 0) {
      return inMemoryDocs
    }

    // 2. Load from IndexedDB cache
    const cachedDocs = await getIndexedDBDocuments()
    if (cachedDocs.length > 0) {
      inMemoryDocs = cachedDocs
      vaultLog('Hydrated from local cache', cachedDocs.length)
    }

    // 3. If Google Drive is configured and connected, trigger background sync
    if (isGoogleAuthConfigured() && this.driveStorage?.rootFolder?.id && !this.isSyncing) {
      this.syncFromGoogleDrive().catch(() => {})
    }

    return inMemoryDocs || cachedDocs || []
  }

  /**
   * Public sync action.
   */
  async syncVault(): Promise<VaultDocument[]> {
    return await this.syncFromGoogleDrive()
  }

  /**
   * Authoritative synchronization from Google Drive folders and application properties.
   */
  private async syncFromGoogleDrive(): Promise<VaultDocument[]> {
    if (!isGoogleAuthConfigured() || !this.driveStorage?.rootFolder?.id) {
      return inMemoryDocs || (await getIndexedDBDocuments())
    }

    this.isSyncing = true
    vaultLog('Starting Google Drive discovery')

    try {
      const token = await this.getValidAccessToken()
      const rootId = this.driveStorage.rootFolder.id
      const folderMap = this.driveStorage.folders || {}

      // Build folder parent query
      const folderIds = Object.values(folderMap)
        .map((f) => f?.id)
        .filter(Boolean) as string[]

      const parentClause =
        folderIds.length > 0
          ? `(${folderIds.map((id) => `'${id}' in parents`).join(' or ')} or '${rootId}' in parents)`
          : `'${rootId}' in parents`

      const query = `mimeType = 'application/pdf' and trashed = false and (${parentClause} or appProperties has { key='app' and value='id_vault' })`

      let allFiles: any[] = []
      let pageToken: string | null = null

      do {
        const url: string = `https://www.googleapis.com/drive/v3/files?q=${encodeURIComponent(
          query
        )}&fields=nextPageToken,files(id,name,parents,size,createdTime,modifiedTime,appProperties)&pageSize=100${
          pageToken ? `&pageToken=${pageToken}` : ''
        }`

        const response = await fetch(url, {
          headers: {
            Authorization: `Bearer ${token}`,
          },
        })

        if (!response.ok) {
          vaultLog('Drive query failed with status', response.status)
          break
        }

        const data = await response.json()
        const files = data.files || []
        allFiles = allFiles.concat(files)
        pageToken = data.nextPageToken || null
      } while (pageToken)

      vaultLog('Files discovered in ID Vault', allFiles.length)

      // Existing local documents map for thumbnail and blob preservation
      const existingLocal = inMemoryDocs || (await getIndexedDBDocuments())
      const localMap = new Map(existingLocal.map((d) => [d.id, d]))

      const cloudDocs: VaultDocument[] = allFiles.map((file) =>
        mapDriveFileToVaultDocument(file, folderMap, localMap)
      )

      vaultLog('Valid ID Vault documents', cloudDocs.length)
      vaultLog('Skipped files', 0)

      // Keep local-only unsynced docs if any
      const cloudIds = new Set(cloudDocs.map((d) => d.id))
      const localOnly = existingLocal.filter((d) => !cloudIds.has(d.id) && d.id.startsWith('doc-local-'))
      const merged = [...cloudDocs, ...localOnly]

      inMemoryDocs = merged
      await saveIndexedDBDocuments(merged)
      vaultLog('Documents hydrated', merged.length)

      return merged
    } catch (err: any) {
      vaultLog('Sync failed', err.message)
      return inMemoryDocs || (await getIndexedDBDocuments())
    } finally {
      this.isSyncing = false
    }
  }

  async getDocument(id: string): Promise<VaultDocument | null> {
    const docs = await this.getDocuments()
    return docs.find((d) => d.id === id) || null
  }

  async getVersionHistory(logicalDocumentId: string): Promise<VaultDocument[]> {
    const docs = await this.getDocuments()
    return docs
      .filter((d) => d.logicalDocumentId === logicalDocumentId)
      .sort((a, b) => (b.version || 1) - (a.version || 1))
  }

  /**
   * Uploads and persists a new document to Google Drive and IndexedDB.
   */
  async uploadDocument(input: UploadDocumentInput): Promise<VaultDocument> {
    input.onProgress?.('Preparing document pages...')

    const config = getDocumentTypeConfig(input.documentType)
    const logicalId = input.logicalDocumentId || `logical-${input.documentType}-${Date.now()}`
    const versionNum = input.version || 1

    // 1. Normalize pages into canonical PDF
    input.onProgress?.('Compiling canonical PDF...')
    const normalized = await normalizePagesToCanonicalPdf(
      input.pages,
      input.displayName,
      input.documentHolderName
    )

    let driveFileId = `doc-local-${Date.now()}`
    const folderId = this.getCategoryFolderId(input.category)

    // 2. Upload to Google Drive if configured
    if (isGoogleAuthConfigured() && this.driveStorage?.rootFolder?.id) {
      input.onProgress?.('Saving to Google Drive category folder...')
      const token = await this.getValidAccessToken()

      const metadata = {
        name: normalized.canonicalFileName,
        mimeType: 'application/pdf',
        parents: [folderId],
        appProperties: {
          app: 'id_vault',
          logicalDocumentId: logicalId,
          version: String(versionNum),
          isCurrent: String(input.isCurrent ?? true),
          category: input.category,
          documentType: input.documentType,
          displayName: input.displayName,
          visualType: input.visualType,
          documentHolderName: input.documentHolderName || '',
          documentHolderNameSource: input.documentHolderNameSource || 'none',
          maskedIdentifier: input.maskedIdentifier || '',
          maskedIdentifierSource: input.maskedIdentifierSource || 'none',
          dateOfBirth: input.dateOfBirth || '',
          dateOfBirthSource: input.dateOfBirthSource || 'none',
          gender: input.gender || '',
          genderSource: input.genderSource || 'none',
          address: input.address || '',
          addressSource: input.addressSource || 'none',
          fatherOrHusbandName: input.fatherOrHusbandName || '',
          fatherOrHusbandNameSource: input.fatherOrHusbandNameSource || 'none',
          issueDate: input.issueDate || '',
          expiryDate: input.expiryDate || '',
          issuer: input.issuer || config.defaultIssuer,
          issuerSource: input.issuerSource || 'none',
          originalFormat: normalized.originalFormat,
          pageMode: input.pageMode,
          pageCount: String(normalized.pageCount),
          trustStatus: 'personal_copy',
          favorite: 'false',
          createdAt: new Date().toISOString(),
        },
      }

      const boundary = '-------314159265358979323846'
      const delimiter = `\r\n--${boundary}\r\n`
      const closeDelimiter = `\r\n--${boundary}--`

      const metadataPart = `${delimiter}Content-Type: application/json; charset=UTF-8\r\n\r\n${JSON.stringify(
        metadata
      )}`

      const body = new Blob(
        [
          metadataPart,
          `${delimiter}Content-Type: application/pdf\r\n\r\n`,
          normalized.canonicalBlob,
          closeDelimiter,
        ],
        { type: `multipart/related; boundary=${boundary}` }
      )

      try {
        const uploadResponse = await fetch(
          'https://www.googleapis.com/upload/drive/v3/files?uploadType=multipart',
          {
            method: 'POST',
            headers: {
              Authorization: `Bearer ${token}`,
              'Content-Type': `multipart/related; boundary=${boundary}`,
            },
            body,
          }
        )

        if (uploadResponse.ok) {
          const uploadData = await uploadResponse.json()
          driveFileId = uploadData.id || driveFileId
          vaultLog('Uploaded PDF to Google Drive with ID', driveFileId)
        }
      } catch {
        // Fall back to local storage if network upload has an issue
      }
    }

    // 3. Assemble newly created VaultDocument
    input.onProgress?.('Saving to your vault...')

    const newDoc: VaultDocument = {
      id: driveFileId,
      logicalDocumentId: logicalId,
      type: input.documentType,
      name: input.displayName,
      displayName: input.displayName,
      shortName: config.shortName || input.displayName,
      category: input.category,
      visualType: input.visualType,
      documentType: input.documentType,

      // Extracted Metadata
      ownerName: input.documentHolderName || 'Not detected',
      documentHolderName: input.documentHolderName,
      documentHolderNameSource: input.documentHolderNameSource || 'none',

      maskedNumber: input.maskedIdentifier,
      maskedIdentifier: input.maskedIdentifier,
      maskedIdentifierSource: input.maskedIdentifierSource || 'none',
      actualIdentifier: input.actualIdentifier || input.documentIdentifier,
      documentIdentifier: input.actualIdentifier || input.documentIdentifier,
      documentIdentifierSource: input.documentIdentifierSource || 'none',
      fullNumberMock: input.actualIdentifier || input.documentIdentifier || input.maskedIdentifier,

      dateOfBirth: input.dateOfBirth,
      dateOfBirthSource: input.dateOfBirthSource || 'none',
      gender: input.gender,
      genderSource: input.genderSource || 'none',
      address: input.address,
      addressSource: input.addressSource || 'none',
      fatherOrHusbandName: input.fatherOrHusbandName,
      fatherOrHusbandNameSource: input.fatherOrHusbandNameSource || 'none',
      issueDate: input.issueDate,
      expiryDate: input.expiryDate,

      issuer: input.issuer || config.defaultIssuer,
      issuerSource: input.issuerSource || 'none',

      source: isGoogleAuthConfigured() ? 'google_drive' : 'personal_upload',
      sourceLabel: isGoogleAuthConfigured() ? 'Google Drive' : 'Local Vault',
      format: normalized.originalFormat,
      storedVersion: 'PDF',
      trustStatus: 'personal_copy',

      pages: input.pages,
      pageMode: input.pageMode,

      version: versionNum,
      isCurrent: input.isCurrent ?? true,

      addedAt: new Date().toISOString(),
      addedLabel: 'Saved to Google Drive',
      activity: 'Uploaded to Google Drive',
      favorite: false,
      favourite: false,
      derivedFileName: normalized.canonicalFileName,
      fileSize: normalized.fileSizeFormatted,
      thumbnailUrl: normalized.thumbnailUrl,
      pdfBlobUrl: normalized.previewUrl,
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
    }

    // 4. Update in-memory cache & IndexedDB store
    const current = inMemoryDocs || (await getIndexedDBDocuments())
    const updated = [
      newDoc,
      ...current.map((doc) => {
        if (doc.logicalDocumentId === logicalId && doc.id !== newDoc.id) {
          return { ...doc, isCurrent: false }
        }
        return doc
      }),
    ]

    inMemoryDocs = updated
    await saveIndexedDBDocuments(updated)

    return newDoc
  }

  async deleteDocument(id: string): Promise<void> {
    if (isGoogleAuthConfigured() && !id.startsWith('doc-local-')) {
      try {
        const token = await this.getValidAccessToken()
        await fetch(`https://www.googleapis.com/drive/v3/files/${id}`, {
          method: 'DELETE',
          headers: {
            Authorization: `Bearer ${token}`,
          },
        })
      } catch {
        // Continue to remove locally
      }
    }

    const current = inMemoryDocs || (await getIndexedDBDocuments())
    const updated = current.filter((d) => d.id !== id)
    inMemoryDocs = updated
    await saveIndexedDBDocuments(updated)
  }

  async downloadDocument(id: string): Promise<{ blob: Blob; fileName: string }> {
    const doc = await this.getDocument(id)
    if (!doc) {
      throw new Error('Document not found in vault.')
    }

    // If PDF blob url is active in memory
    if (doc.pdfBlobUrl) {
      try {
        const res = await fetch(doc.pdfBlobUrl)
        if (res.ok) {
          const blob = await res.blob()
          return { blob, fileName: doc.derivedFileName }
        }
      } catch {
        // Fall back to Drive / recompile
      }
    }

    if (isGoogleAuthConfigured() && !id.startsWith('doc-local-')) {
      const token = await this.getValidAccessToken()
      const res = await fetch(`https://www.googleapis.com/drive/v3/files/${id}?alt=media`, {
        headers: {
          Authorization: `Bearer ${token}`,
        },
      })
      if (res.ok) {
        const blob = await res.blob()
        return { blob, fileName: doc.derivedFileName }
      }
    }

    if (doc.pages && doc.pages.length > 0) {
      const normalized = await normalizePagesToCanonicalPdf(doc.pages, doc.displayName, doc.documentHolderName)
      return { blob: normalized.canonicalBlob, fileName: normalized.canonicalFileName }
    }

    throw new Error('Unable to download document. File not accessible.')
  }

  async toggleFavorite(id: string): Promise<VaultDocument | null> {
    const current = inMemoryDocs || (await getIndexedDBDocuments())
    let updatedDoc: VaultDocument | null = null

    const updated = current.map((d) => {
      if (d.id === id) {
        const nextFav = !d.favorite
        updatedDoc = { ...d, favorite: nextFav, favourite: nextFav }
        return updatedDoc
      }
      return d
    })

    inMemoryDocs = updated
    await saveIndexedDBDocuments(updated)
    return updatedDoc
  }
}

// Singleton repository
export const documentRepository = new GoogleDriveDocumentRepository()
