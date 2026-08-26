import { useEffect, useState } from 'react'
import {
  ChevronLeft,
  ChevronRight,
  Download,
  FileText,
  Maximize2,
  Minimize2,
  Printer,
  RotateCw,
  Sparkles,
  X,
  ZoomIn,
  ZoomOut,
} from 'lucide-react'
import type { VaultDocument } from '../data/types'
import { categoryCopy, TrustBadge } from './DocumentMeta'
import { documentRepository } from '../services/documentRepository'

type DocumentViewerModalProps = {
  document: VaultDocument
  onClose: () => void
  onDownload: (document: VaultDocument) => void
}

export function DocumentViewerModal({
  document,
  onClose,
  onDownload,
}: DocumentViewerModalProps) {
  const [currentPageIndex, setCurrentPageIndex] = useState(0)
  const [zoomLevel, setZoomLevel] = useState(1)
  const [rotation, setRotation] = useState(0)
  const [liveBlobUrl, setLiveBlobUrl] = useState<string | null>(null)
  const [isPdfDocument, setIsPdfDocument] = useState<boolean>(false)
  const [isLoading, setIsLoading] = useState<boolean>(false)
  const [imageError, setImageError] = useState<boolean>(false)

  const pages = document.pages || []
  const isFrontBack = document.pageMode === 'front_back' || pages.length === 2
  const totalPages = Math.max(pages.length, 1)

  // Get active page URL
  const activePage = pages[currentPageIndex]
  const rawPageUrl = activePage?.dataUrl || document.pdfBlobUrl || document.thumbnailUrl

  // Check if rawPageUrl is a permanent dataUrl (starts with data:)
  const isPermanentDataUrl = Boolean(rawPageUrl && rawPageUrl.startsWith('data:'))

  // Dynamically load fresh live Blob from Google Drive / Repository across reloads
  useEffect(() => {
    let active = true
    let createdUrl: string | null = null

    const loadLiveDocument = async () => {
      // If we already have a permanent base64 data URL, we don't need a network fetch
      if (isPermanentDataUrl && !imageError) {
        return
      }

      setIsLoading(true)
      setImageError(false)
      try {
        const { blob } = await documentRepository.downloadDocument(document.id)
        if (!active) return

        const isPdf =
          blob.type === 'application/pdf' ||
          document.format === 'pdf' ||
          document.derivedFileName.toLowerCase().endsWith('.pdf')

        createdUrl = URL.createObjectURL(blob)
        setLiveBlobUrl(createdUrl)
        setIsPdfDocument(isPdf)
      } catch {
        if (active) setImageError(true)
      } finally {
        if (active) setIsLoading(false)
      }
    }

    loadLiveDocument()

    return () => {
      active = false
      if (createdUrl) {
        URL.revokeObjectURL(createdUrl)
      }
    }
  }, [document.id, isPermanentDataUrl, imageError, document.format, document.derivedFileName])

  // Keyboard shortcut to close or navigate
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape') onClose()
      if (e.key === 'ArrowRight') setCurrentPageIndex((p) => Math.min(p + 1, totalPages - 1))
      if (e.key === 'ArrowLeft') setCurrentPageIndex((p) => Math.max(p - 1, 0))
    }
    window.addEventListener('keydown', handleKeyDown)
    return () => window.removeEventListener('keydown', handleKeyDown)
  }, [totalPages, onClose])

  const handlePrint = () => {
    const printUrl = liveBlobUrl || rawPageUrl
    if (!printUrl) return

    const printWindow = window.open(printUrl, '_blank')
    if (printWindow) {
      printWindow.focus()
    }
  }

  // Active display URL
  const displayUrl = liveBlobUrl || (isPermanentDataUrl ? rawPageUrl : null)

  return (
    <div className="viewer-overlay" role="dialog" aria-modal="true" aria-label={`View ${document.name}`}>
      <div className="viewer-backdrop" onClick={onClose} />

      <div className="viewer-window glass-surface">
        {/* Top Navigation Bar */}
        <header className="viewer-header">
          <div className="viewer-title-block">
            <div className="viewer-title-row">
              <h3>{document.name}</h3>
              <TrustBadge status={document.trustStatus} compact />
            </div>
            <p className="viewer-subtitle">
              <span>{categoryCopy[document.category]}</span>
              <span>·</span>
              <span>Canonical PDF</span>
              <span>·</span>
              <span>{document.derivedFileName}</span>
            </p>
          </div>

          <div className="viewer-header-actions">
            <button
              type="button"
              className="icon-button"
              onClick={() => setZoomLevel((z) => Math.max(z - 0.25, 0.5))}
              aria-label="Zoom out"
              title="Zoom out"
            >
              <ZoomOut size={17} />
            </button>
            <span className="zoom-label">{Math.round(zoomLevel * 100)}%</span>
            <button
              type="button"
              className="icon-button"
              onClick={() => setZoomLevel((z) => Math.min(z + 0.25, 2.5))}
              aria-label="Zoom in"
              title="Zoom in"
            >
              <ZoomIn size={17} />
            </button>
            <button
              type="button"
              className="icon-button"
              onClick={() => setRotation((r) => (r + 90) % 360)}
              aria-label="Rotate"
              title="Rotate 90°"
            >
              <RotateCw size={17} />
            </button>
            <button
              type="button"
              className="icon-button"
              onClick={handlePrint}
              aria-label="Print document"
              title="Print document"
            >
              <Printer size={17} />
            </button>
            <button
              type="button"
              className="icon-button icon-button--primary"
              onClick={() => onDownload(document)}
              aria-label="Download PDF"
              title="Download PDF"
            >
              <Download size={17} />
            </button>
            <button
              type="button"
              className="icon-button close-viewer-btn"
              onClick={onClose}
              aria-label="Close viewer"
            >
              <X size={19} />
            </button>
          </div>
        </header>

        {/* Front / Back Switcher Tabs (for identity cards) */}
        {isFrontBack && pages.length >= 2 && (
          <div className="viewer-side-tabs">
            <button
              type="button"
              className={`viewer-side-tab ${currentPageIndex === 0 ? 'viewer-side-tab--active' : ''}`}
              onClick={() => setCurrentPageIndex(0)}
            >
              <span>Front Side</span>
              <small>Page 1</small>
            </button>
            <button
              type="button"
              className={`viewer-side-tab ${currentPageIndex === 1 ? 'viewer-side-tab--active' : ''}`}
              onClick={() => setCurrentPageIndex(1)}
            >
              <span>Back Side</span>
              <small>Page 2</small>
            </button>
          </div>
        )}

        {/* Real Document Viewport Canvas / Image Preview */}
        <main className="viewer-viewport">
          {isLoading ? (
            <div className="viewer-empty-canvas">
              <Sparkles size={36} className="spin-icon text-accent" />
              <h4>Loading document...</h4>
              <p>Fetching canonical PDF from your secure storage</p>
            </div>
          ) : displayUrl ? (
            <div
              className="viewer-canvas-wrap"
              style={{
                transform: `scale(${zoomLevel}) rotate(${rotation}deg)`,
                transition: 'transform 0.18s ease-out',
                width: '100%',
                height: '100%',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
              }}
            >
              {isPdfDocument && liveBlobUrl ? (
                <iframe
                  src={`${liveBlobUrl}#toolbar=0&navpanes=0`}
                  title={document.name}
                  className="viewer-pdf-embed"
                  style={{
                    width: '100%',
                    height: '100%',
                    border: 0,
                    borderRadius: '0.8rem',
                    background: 'white',
                  }}
                />
              ) : (
                <img
                  src={displayUrl}
                  alt={`${document.name} Page ${currentPageIndex + 1}`}
                  className="viewer-actual-document-image"
                  onError={() => setImageError(true)}
                  style={{
                    maxWidth: '100%',
                    maxHeight: '100%',
                    objectFit: 'contain',
                    borderRadius: '0.6rem',
                  }}
                />
              )}
            </div>
          ) : (
            <div className="viewer-empty-canvas">
              <FileText size={48} className="viewer-pdf-icon" />
              <h4>{document.name}</h4>
              <p>Canonical PDF Stored in Google Drive ({document.derivedFileName})</p>
              <button
                type="button"
                className="primary-button"
                style={{ marginTop: 12 }}
                onClick={() => onDownload(document)}
              >
                <Download size={16} />
                <span>Download & View PDF</span>
              </button>
            </div>
          )}
        </main>

        {/* Multi-Page Navigation Footer */}
        {totalPages > 1 && (
          <footer className="viewer-footer">
            <button
              type="button"
              className="viewer-nav-btn"
              onClick={() => setCurrentPageIndex((p) => Math.max(p - 1, 0))}
              disabled={currentPageIndex === 0}
            >
              <ChevronLeft size={16} />
              <span>Previous</span>
            </button>

            <span className="viewer-page-indicator">
              Page {currentPageIndex + 1} of {totalPages}
            </span>

            <button
              type="button"
              className="viewer-nav-btn"
              onClick={() => setCurrentPageIndex((p) => Math.min(p + 1, totalPages - 1))}
              disabled={currentPageIndex === totalPages - 1}
            >
              <span>Next</span>
              <ChevronRight size={16} />
            </button>
          </footer>
        )}
      </div>
    </div>
  )
}
