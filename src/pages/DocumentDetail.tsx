import { useEffect, useState } from 'react'
import {
  ArrowLeft,
  Calendar,
  Clock,
  Download,
  Eye,
  FileCheck2,
  FileText,
  History,
  Landmark,
  Layers,
  Lock,
  MoreHorizontal,
  Printer,
  Share2,
  Shield,
  ShieldCheck,
  Star,
  Trash2,
  UserRound,
} from 'lucide-react'
import { DocumentVisual } from '../components/DocumentVisual'
import { SourceIndicator, TrustBadge, categoryCopy } from '../components/DocumentMeta'
import { SensitiveField } from '../components/SensitiveField'
import { NumberRevealModal } from '../components/NumberRevealModal'
import { DocumentViewerModal } from '../components/DocumentViewerModal'
import { VersionHistoryModal } from '../components/VersionHistoryModal'
import { BottomSheet } from '../components/BottomSheet'
import type { VaultDocument } from '../data/types'
import { useVault } from '../context/VaultContext'
import { useVaultDocuments } from '../context/DocumentContext'

type DocumentDetailProps = {
  document: VaultDocument
  onBack: () => void
  onToggleFavourite: (document: VaultDocument) => void
  onDownload: (document: VaultDocument) => void
  onShare: (document: VaultDocument) => void
  onDelete: (document: VaultDocument) => void
  onOpenVersion?: (doc: VaultDocument) => void
  onActionToast: (message: string) => void
}

export function DocumentDetail({
  document,
  onBack,
  onToggleFavourite,
  onDownload,
  onShare,
  onDelete,
  onOpenVersion,
  onActionToast,
}: DocumentDetailProps) {
  const { isVaultLocked, unlockVault, recordActivity, hideDocumentNumber } = useVault()
  const { documents } = useVaultDocuments()

  const [showRevealModal, setShowRevealModal] = useState(false)
  const [showViewerModal, setShowViewerModal] = useState(false)
  const [showVersionModal, setShowVersionModal] = useState(false)
  const [showMoreMenu, setShowMoreMenu] = useState(false)
  const [showDeleteModal, setShowDeleteModal] = useState(false)

  // Find all versions of this logical document
  const logicalVersions = documents.filter(
    (d) => d.logicalDocumentId === document.logicalDocumentId || d.type === document.type
  )
  const previousVersionsCount = logicalVersions.length - 1

  // Record audit trail event on viewing
  useEffect(() => {
    recordActivity('document_viewed', document.name, document.id)
    return () => {
      // Re-mask upon navigating away
      hideDocumentNumber(document.id)
    }
  }, [document.id, document.name])

  const handleConfirmDelete = () => {
    setShowDeleteModal(false)
    onDelete(document)
  }

  const handleSecureDownload = async () => {
    if (isVaultLocked) {
      await unlockVault()
    }
    recordActivity('document_downloaded', document.name, document.id)
    onDownload(document)
  }

  const handleSecureView = async () => {
    if (isVaultLocked) {
      await unlockVault()
    }
    setShowViewerModal(true)
  }

  const handleSecureReveal = async () => {
    if (isVaultLocked) {
      await unlockVault()
    }
    setShowRevealModal(true)
  }

  return (
    <main className="detail-page page-frame">
      {/* Header */}
      <header className="detail-top-nav">
        <button className="back-button" onClick={onBack} aria-label="Back to documents">
          <ArrowLeft size={19} />
          <span>Documents</span>
        </button>
        <div className="detail-header-actions">
          <button
            className={`icon-button ${document.favourite ? 'icon-button--favourite-active' : ''}`}
            onClick={() => onToggleFavourite(document)}
            aria-label={document.favourite ? 'Remove from favourites' : 'Add to favourites'}
          >
            <Star size={19} fill={document.favourite ? 'currentColor' : 'none'} />
          </button>
          <button
            className="icon-button"
            onClick={() => setShowMoreMenu((v) => !v)}
            aria-label="More options"
          >
            <MoreHorizontal size={19} />
          </button>
        </div>
      </header>

      {/* More Options Dropdown */}
      {showMoreMenu && (
        <div className="detail-more-dropdown glass-surface">
          <button
            onClick={() => {
              setShowMoreMenu(false)
              handleSecureView()
            }}
          >
            <Eye size={15} />
            <span>Open PDF Viewer</span>
          </button>
          {previousVersionsCount > 0 && (
            <button
              onClick={() => {
                setShowMoreMenu(false)
                setShowVersionModal(true)
              }}
            >
              <History size={15} />
              <span>Version History ({logicalVersions.length})</span>
            </button>
          )}
          <button
            onClick={() => {
              setShowMoreMenu(false)
              handleSecureDownload()
            }}
          >
            <Download size={15} />
            <span>Export Normalized PDF</span>
          </button>
          <button
            onClick={() => {
              setShowMoreMenu(false)
              navigator.clipboard?.writeText(document.derivedFileName)
              onActionToast('File name copied to clipboard')
            }}
          >
            <FileText size={15} />
            <span>Copy Derived File Name</span>
          </button>
          <button
            className="dropdown-item--danger"
            onClick={() => {
              setShowMoreMenu(false)
              setShowDeleteModal(true)
            }}
          >
            <Trash2 size={15} />
            <span>Delete Document</span>
          </button>
        </div>
      )}

      {/* Document Hero Presentation */}
      <div className="detail-hero-section">
        <div
          className={`detail-hero-card document-card--${document.visualType}`}
          onClick={handleSecureView}
          role="button"
          tabIndex={0}
          aria-label={`Inspect ${document.name} real document`}
        >
          <div className="detail-hero-shine" />
          <div className="detail-hero-topline">
            <span className="hero-doc-code">{document.shortName}</span>
            <span className="hero-category-label">{categoryCopy[document.category]}</span>
          </div>

          <div className="detail-hero-visual">
            <DocumentVisual type={document.visualType} decorative />
          </div>

          <div className="detail-hero-info">
            <span className="detail-hero-name">
              {document.documentHolderName || document.ownerName || 'Not detected'}
            </span>
            <span className="detail-hero-number">{document.maskedNumber || '•••• •••• ••••'}</span>
          </div>

          <div className="detail-hero-footer">
            <span className="detail-hero-type">{document.documentType}</span>
            <TrustBadge status={document.trustStatus} compact />
          </div>
        </div>

        <button className="preview-tap-hint" onClick={handleSecureView}>
          <Eye size={14} />
          <span>Tap to inspect actual document pages</span>
        </button>
      </div>

      {/* Version History Banner (if versioned) */}
      {previousVersionsCount > 0 && (
        <section className="version-banner glass-surface">
          <div className="version-banner-info">
            <Layers size={18} />
            <div>
              <strong>
                Version {document.version || 1} {document.isCurrent !== false ? '(Current)' : '(Archived)'}
              </strong>
              <small>{previousVersionsCount} previous version(s) in vault</small>
            </div>
          </div>
          <button
            type="button"
            className="secondary-button"
            style={{ padding: '0.4rem 0.8rem', fontSize: '0.75rem' }}
            onClick={() => setShowVersionModal(true)}
          >
            <History size={13} />
            <span>History</span>
          </button>
        </section>
      )}

      {/* Document Identity Section with SensitiveField */}
      <section className="detail-section glass-surface" aria-labelledby="identity-heading">
        <h2 id="identity-heading" className="detail-section-title">
          <UserRound size={16} />
          <span>Identity Details</span>
        </h2>
        <dl className="detail-meta-list">
          <div className="meta-row">
            <dt>Document</dt>
            <dd className="meta-strong">{document.name}</dd>
          </div>
          <div className="meta-row">
            <dt>Holder name</dt>
            <dd className="meta-strong">
              {document.documentHolderName || document.ownerName || 'Not detected'}
            </dd>
          </div>

          {/* Sensitive Identifier with Masking & 30s Reveal */}
          <div className="meta-row meta-row--full">
            <SensitiveField
              label="Document Number"
              value={document.actualIdentifier || document.documentIdentifier || document.fullNumberMock || document.maskedIdentifier}
              maskedValue={document.maskedIdentifier || document.maskedNumber || 'Not detected'}
              visualType={document.visualType}
              documentId={document.id}
              onRevealRequest={handleSecureReveal}
            />
          </div>

          <div className="meta-row">
            <dt>Category</dt>
            <dd>{categoryCopy[document.category]}</dd>
          </div>
          {document.dateOfBirth && (
            <div className="meta-row">
              <dt>Date of birth</dt>
              <dd>{document.dateOfBirth}</dd>
            </div>
          )}
          {document.gender && (
            <div className="meta-row">
              <dt>Gender</dt>
              <dd>{document.gender}</dd>
            </div>
          )}
          {document.fatherOrHusbandName && (
            <div className="meta-row">
              <dt>Father / Relative</dt>
              <dd>{document.fatherOrHusbandName}</dd>
            </div>
          )}
          {document.address && (
            <div className="meta-row meta-row--full">
              <dt>Address</dt>
              <dd className="meta-address">{document.address}</dd>
            </div>
          )}
          {document.issueDate && (
            <div className="meta-row">
              <dt>Issue date</dt>
              <dd>{document.issueDate}</dd>
            </div>
          )}
          {document.expiryLabel && (
            <div className="meta-row">
              <dt>Validity</dt>
              <dd className={document.expiryState === 'soon' ? 'text-warning' : ''}>
                {document.expiryLabel}
              </dd>
            </div>
          )}
        </dl>
      </section>

      {/* Provenance & Storage Information */}
      <section className="detail-section glass-surface" aria-labelledby="provenance-heading">
        <h2 id="provenance-heading" className="detail-section-title">
          <Landmark size={16} />
          <span>Provenance & Storage</span>
        </h2>
        <dl className="detail-meta-list">
          <div className="meta-row">
            <dt>Issuing Authority</dt>
            <dd className="meta-strong">{document.issuer || 'Official Issuer'}</dd>
          </div>
          <div className="meta-row">
            <dt>Source</dt>
            <dd>
              <SourceIndicator source={document.source} label={document.sourceLabel} />
            </dd>
          </div>
          <div className="meta-row">
            <dt>Trust status</dt>
            <dd>
              <TrustBadge status={document.trustStatus} />
            </dd>
          </div>
          <div className="meta-row">
            <dt>Added to vault</dt>
            <dd>{document.addedLabel}</dd>
          </div>
          {document.notes && (
            <div className="meta-row meta-row--full">
              <dt>Notes</dt>
              <dd className="meta-notes">{document.notes}</dd>
            </div>
          )}
        </dl>
      </section>

      {/* Storage & Format Specifications */}
      <section className="detail-section glass-surface" aria-labelledby="format-heading">
        <h2 id="format-heading" className="detail-section-title">
          <FileCheck2 size={16} />
          <span>Storage & Format</span>
        </h2>
        <dl className="detail-meta-list">
          <div className="meta-row">
            <dt>Original format</dt>
            <dd className="meta-format-tag">{document.format.toUpperCase()}</dd>
          </div>
          <div className="meta-row">
            <dt>Pages</dt>
            <dd className="meta-strong">
              {document.pageMode === 'front_back'
                ? 'Front + Back (2 pages)'
                : `${document.pages?.length || 1} page(s)`}
            </dd>
          </div>
          <div className="meta-row">
            <dt>Stored version</dt>
            <dd className="meta-format-tag meta-format-tag--pdf">PDF (Normalized)</dd>
          </div>
          <div className="meta-row">
            <dt>File name</dt>
            <dd className="meta-filename">{document.derivedFileName}</dd>
          </div>
          <div className="meta-row">
            <dt>Download format</dt>
            <dd className="meta-strong">PDF only (Enforced)</dd>
          </div>
        </dl>
      </section>

      {/* Floating Glass Bottom Action Bar */}
      <div className="detail-floating-actions glass-surface">
        <button
          className="detail-action-btn"
          onClick={handleSecureView}
          aria-label="View actual document"
        >
          <Eye size={18} />
          <span>View</span>
        </button>
        <button
          className="detail-action-btn"
          onClick={handleSecureReveal}
          aria-label="Show full number"
        >
          <Lock size={18} />
          <span>Show number</span>
        </button>
        <button
          className="detail-action-btn detail-action-btn--primary"
          onClick={handleSecureDownload}
          aria-label="Download PDF"
        >
          <Download size={18} />
          <span>Download PDF</span>
        </button>
        <button
          className="detail-action-btn"
          onClick={() => onShare(document)}
          aria-label="Share document"
        >
          <Share2 size={18} />
          <span>Share</span>
        </button>
      </div>

      {/* Sensitive Number Reveal Modal */}
      {showRevealModal && (
        <NumberRevealModal
          document={document}
          onClose={() => setShowRevealModal(false)}
        />
      )}

      {/* Real Document Viewer Modal (Displays Actual Canonical PDF Pages) */}
      {showViewerModal && (
        <DocumentViewerModal
          document={document}
          onClose={() => setShowViewerModal(false)}
          onDownload={onDownload}
        />
      )}

      {/* Version History Modal */}
      {showVersionModal && (
        <VersionHistoryModal
          document={document}
          versions={logicalVersions}
          onClose={() => setShowVersionModal(false)}
          onOpenVersion={(vDoc) => {
            setShowVersionModal(false)
            onOpenVersion?.(vDoc)
          }}
          onDownloadVersion={(vDoc) => onDownload(vDoc)}
        />
      )}

      {/* Delete Document Confirmation Bottom Sheet */}
      {showDeleteModal && (
        <BottomSheet title="Delete this document?" onClose={() => setShowDeleteModal(false)}>
          <div className="drive-modal-content">
            <div className="drive-disconnect-icon">
              <Trash2 size={30} />
            </div>

            <p className="drive-lead-notice">
              Are you sure you want to remove <strong>{document.name}</strong> from your ID Vault?
            </p>
            <p className="drive-sub-notice">
              This will remove the document and its corresponding canonical PDF file from your Google Drive ({document.derivedFileName}).
            </p>

            <div className="sheet-button-stack" style={{ marginTop: 20 }}>
              <button
                type="button"
                className="primary-button primary-button--full drive-disconnect-btn"
                onClick={handleConfirmDelete}
              >
                <Trash2 size={16} />
                <span>Delete from Vault & Drive</span>
              </button>
              <button
                type="button"
                className="secondary-button secondary-button--full"
                onClick={() => setShowDeleteModal(false)}
              >
                Cancel
              </button>
            </div>
          </div>
        </BottomSheet>
      )}
    </main>
  )
}
