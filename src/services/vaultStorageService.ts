import type { VaultDocument, DocumentCategory, DocumentPageMode, DocumentTrustStatus } from '../data/types'

const DB_NAME = 'id_vault_db'
const DB_VERSION = 2
const STORE_NAME = 'vault_documents'
const MANIFEST_FILE_NAME = '.idvault-manifest.json'

export type VaultManifestDocument = {
  documentId: string
  logicalDocumentId: string
  driveFileId?: string
  driveFolderId?: string
  type: string
  category: DocumentCategory
  version: number
  isCurrent: boolean
  pageMode: DocumentPageMode
  displayName: string
  documentHolderName?: string
  documentHolderNameSource?: string
  maskedIdentifier?: string
  maskedIdentifierSource?: string
  dateOfBirth?: string
  dateOfBirthSource?: string
  gender?: string
  genderSource?: string
  address?: string
  addressSource?: string
  fatherOrHusbandName?: string
  fatherOrHusbandNameSource?: string
  issueDate?: string
  expiryDate?: string
  issuer?: string
  trustStatus: DocumentTrustStatus
  createdAt: string
  updatedAt: string
}

export type VaultManifest = {
  schemaVersion: number
  updatedAt: string
  documents: VaultManifestDocument[]
}

/**
 * Initializes and opens the IndexedDB database.
 */
function openDB(): Promise<IDBDatabase> {
  return new Promise((resolve, reject) => {
    const request = indexedDB.open(DB_NAME, DB_VERSION)

    request.onupgradeneeded = (event) => {
      const db = (event.target as IDBOpenDBRequest).result
      if (!db.objectStoreNames.contains(STORE_NAME)) {
        db.createObjectStore(STORE_NAME, { keyPath: 'id' })
      }
    }

    request.onsuccess = () => resolve(request.result)
    request.onerror = () => reject(request.error)
  })
}

/**
 * Retrieves all stored documents from local persistent IndexedDB.
 */
export async function getIndexedDBDocuments(): Promise<VaultDocument[]> {
  try {
    const db = await openDB()
    return new Promise((resolve) => {
      const transaction = db.transaction(STORE_NAME, 'readonly')
      const store = transaction.objectStore(STORE_NAME)
      const request = store.getAll()

      request.onsuccess = () => {
        const docs = (request.result as VaultDocument[]) || []
        resolve(docs)
      }
      request.onerror = () => resolve([])
    })
  } catch {
    return []
  }
}

/**
 * Persists all documents into local persistent IndexedDB.
 */
export async function saveIndexedDBDocuments(docs: VaultDocument[]): Promise<void> {
  try {
    const db = await openDB()
    return new Promise((resolve) => {
      const transaction = db.transaction(STORE_NAME, 'readwrite')
      const store = transaction.objectStore(STORE_NAME)

      // Clear old entries and insert current ones
      store.clear()
      for (const doc of docs) {
        store.put(doc)
      }

      transaction.oncomplete = () => resolve()
      transaction.onerror = () => resolve()
    })
  } catch {
    // Ignore IndexedDB write errors
  }
}

/**
 * Generates a serializable VaultManifest from active documents.
 */
export function buildVaultManifest(docs: VaultDocument[]): VaultManifest {
  return {
    schemaVersion: 1,
    updatedAt: new Date().toISOString(),
    documents: docs.map((d) => ({
      documentId: d.id,
      logicalDocumentId: d.logicalDocumentId,
      driveFileId: d.driveFileId || d.id,
      driveFolderId: d.driveFolderId,
      type: d.type || d.documentType,
      category: d.category,
      version: d.version || 1,
      isCurrent: d.isCurrent !== false,
      pageMode: d.pageMode,
      displayName: d.displayName,
      documentHolderName: d.documentHolderName,
      documentHolderNameSource: d.documentHolderNameSource,
      maskedIdentifier: d.maskedIdentifier,
      maskedIdentifierSource: d.maskedIdentifierSource,
      dateOfBirth: d.dateOfBirth,
      dateOfBirthSource: d.dateOfBirthSource,
      gender: d.gender,
      genderSource: d.genderSource,
      address: d.address,
      addressSource: d.addressSource,
      fatherOrHusbandName: d.fatherOrHusbandName,
      fatherOrHusbandNameSource: d.fatherOrHusbandNameSource,
      issueDate: d.issueDate,
      expiryDate: d.expiryDate,
      issuer: d.issuer,
      trustStatus: d.trustStatus,
      createdAt: d.createdAt || new Date().toISOString(),
      updatedAt: d.updatedAt || new Date().toISOString(),
    })),
  }
}
