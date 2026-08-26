import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useState,
  type ReactNode,
} from 'react'
import type { VaultDocument } from '../data/types'
import { documentRepository, type UploadDocumentInput } from '../services/documentRepository'
import { useDrive } from './DriveContext'
import { useAuth } from './AuthContext'

type DocumentContextValue = {
  documents: VaultDocument[]
  isLoading: boolean
  error: string | null
  uploadDocument: (input: UploadDocumentInput) => Promise<VaultDocument>
  deleteDocument: (id: string) => Promise<void>
  downloadDocument: (doc: VaultDocument) => Promise<void>
  toggleFavorite: (doc: VaultDocument) => Promise<void>
  refreshDocuments: () => Promise<void>
}

const DocumentContext = createContext<DocumentContextValue | undefined>(undefined)

export function DocumentProvider({ children }: { children: ReactNode }) {
  const { user } = useAuth()
  const { driveStorage } = useDrive()
  const [documents, setDocuments] = useState<VaultDocument[]>([])
  const [isLoading, setIsLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  // 1. Instant local hydration on startup from IndexedDB
  useEffect(() => {
    let isMounted = true
    const hydrateLocalDocs = async () => {
      try {
        const docs = await documentRepository.getDocuments()
        if (isMounted) {
          setDocuments(docs)
          setIsLoading(false)
        }
      } catch (err: any) {
        if (isMounted) {
          setError(err.message || 'Failed to load vault documents')
          setIsLoading(false)
        }
      }
    }
    hydrateLocalDocs()
    return () => {
      isMounted = false
    }
  }, [])

  // Synchronize document repository with current Google Drive storage
  useEffect(() => {
    documentRepository.setStorage(driveStorage, user?.email)
  }, [driveStorage, user])

  // Reload / sync documents from repository
  const refreshDocuments = useCallback(async () => {
    setError(null)
    try {
      const docs = await documentRepository.getDocuments()
      setDocuments(docs)
    } catch (err: any) {
      setError(err.message || 'Failed to load documents')
    } finally {
      setIsLoading(false)
    }
  }, [])

  // Trigger sync when user or drive storage changes
  useEffect(() => {
    if (user && driveStorage?.rootFolder?.id) {
      refreshDocuments()
    }
  }, [user, driveStorage, refreshDocuments])

  // Upload Document Action
  const uploadDocument = useCallback(
    async (input: UploadDocumentInput): Promise<VaultDocument> => {
      const newDoc = await documentRepository.uploadDocument(input)
      setDocuments((prev) => [newDoc, ...prev.filter((d) => d.id !== newDoc.id)])
      return newDoc
    },
    []
  )

  // Delete Document Action
  const deleteDocument = useCallback(async (id: string): Promise<void> => {
    await documentRepository.deleteDocument(id)
    setDocuments((prev) => prev.filter((d) => d.id !== id))
  }, [])

  // Download Canonical PDF Action
  const downloadDocument = useCallback(async (doc: VaultDocument): Promise<void> => {
    const { blob, fileName } = await documentRepository.downloadDocument(doc.id)
    const blobUrl = URL.createObjectURL(blob)
    const link = document.createElement('a')
    link.href = blobUrl
    link.download = fileName
    document.body.appendChild(link)
    link.click()
    document.body.removeChild(link)
    URL.revokeObjectURL(blobUrl)
  }, [])

  // Toggle Favorite
  const toggleFavorite = useCallback(async (doc: VaultDocument): Promise<void> => {
    const updated = await documentRepository.toggleFavorite(doc.id)
    if (updated) {
      setDocuments((prev) => prev.map((d) => (d.id === doc.id ? updated : d)))
    }
  }, [])

  const value = useMemo<DocumentContextValue>(
    () => ({
      documents,
      isLoading,
      error,
      uploadDocument,
      deleteDocument,
      downloadDocument,
      toggleFavorite,
      refreshDocuments,
    }),
    [documents, isLoading, error, uploadDocument, deleteDocument, downloadDocument, toggleFavorite, refreshDocuments]
  )

  return <DocumentContext.Provider value={value}>{children}</DocumentContext.Provider>
}

export function useVaultDocuments(): DocumentContextValue {
  const context = useContext(DocumentContext)
  if (!context) {
    throw new Error('useVaultDocuments must be used within a DocumentProvider')
  }
  return context
}
