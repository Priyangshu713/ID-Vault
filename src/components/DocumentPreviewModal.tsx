import { useState } from 'react'
import { Download, FileCheck2, Lock, Printer, Share2, Shield, X, ZoomIn, ZoomOut } from 'lucide-react'
import { DocumentVisual } from './DocumentVisual'
import { TrustBadge } from './DocumentMeta'
import type { VaultDocument } from '../data/types'

type DocumentPreviewModalProps = {
  document: VaultDocument
  onClose: () => void
  onDownload: (document: VaultDocument) => void
  onShare: (document: VaultDocument) => void
}

export function DocumentPreviewModal({ document, onClose, onDownload, onShare }: DocumentPreviewModalProps) {
  const [zoom, setZoom] = useState(100)

  return (
    <div className="preview-modal-layer" role="dialog" aria-modal="true" aria-label={`Preview of ${document.name}`}>
      <div className="preview-modal-backdrop" onClick={onClose} />
      <div className="preview-modal-window glass-surface">
        {/* Top bar */}
        <div className="preview-modal-header">
          <div className="preview-header-info">
            <span className="preview-format-pill">PDF</span>
            <div>
              <h3>{document.derivedFileName}</h3>
              <small>{document.fileSize || '1.8 MB'} · Stored in vault as encrypted PDF</small>
            </div>
          </div>
          <div className="preview-header-actions">
            <div className="zoom-controls">
              <button
                onClick={() => setZoom((z) => Math.max(75, z - 15))}
                disabled={zoom <= 75}
                aria-label="Zoom out"
              >
                <ZoomOut size={16} />
              </button>
              <span>{zoom}%</span>
              <button
                onClick={() => setZoom((z) => Math.min(150, z + 15))}
                disabled={zoom >= 150}
                aria-label="Zoom in"
              >
                <ZoomIn size={16} />
              </button>
            </div>
            <button className="icon-button icon-button--quiet" onClick={onClose} aria-label="Close preview">
              <X size={20} />
            </button>
          </div>
        </div>

        {/* Document Canvas Display */}
        <div className="preview-canvas-viewport">
          <div
            className="preview-document-sheet"
            style={{ transform: `scale(${zoom / 100})`, transformOrigin: 'top center' }}
          >
            {/* Security Watermark Header */}
            <div className="preview-sheet-watermark">
              <Shield size={12} />
              <span>ID VAULT SECURE LOCAL PREVIEW · NOT AN OFFICIAL REPRODUCTION</span>
              <Lock size={12} />
            </div>

            {/* Document Artwork */}
            <div className="preview-sheet-body">
              <div className="preview-sheet-top">
                <span className="sheet-gov-text">{document.issuer || 'GOVERNMENT IDENTITY VAULT'}</span>
                <TrustBadge status={document.trustStatus} compact />
              </div>

              <div className="preview-sheet-visual">
                <DocumentVisual type={document.visualType} decorative />
              </div>

              <div className="preview-sheet-meta-grid">
                <div className="meta-cell">
                  <span className="meta-label">DOCUMENT NAME</span>
                  <span className="meta-val">{document.name}</span>
                </div>
                <div className="meta-cell">
                  <span className="meta-label">DOCUMENT TYPE</span>
                  <span className="meta-val">{document.documentType}</span>
                </div>
                <div className="meta-cell">
                  <span className="meta-label">DOCUMENT HOLDER</span>
                  <span className="meta-val">{document.ownerName}</span>
                </div>
                <div className="meta-cell">
                  <span className="meta-label">IDENTIFIER / NUMBER</span>
                  <span className="meta-val">{document.maskedNumber || '•••• •••• ••••'}</span>
                </div>
                {document.issueDate && (
                  <div className="meta-cell">
                    <span className="meta-label">ISSUE DATE</span>
                    <span className="meta-val">{document.issueDate}</span>
                  </div>
                )}
                {document.expiryLabel && (
                  <div className="meta-cell">
                    <span className="meta-label">VALIDITY</span>
                    <span className="meta-val">{document.expiryLabel}</span>
                  </div>
                )}
              </div>

              {/* Digital Certificate Stamp */}
              <div className="preview-sheet-stamp">
                <FileCheck2 size={24} />
                <div>
                  <strong>Normalized Cryptographic PDF Container</strong>
                  <small>Original format: {document.format.toUpperCase()} · Vault Sealed</small>
                </div>
              </div>
            </div>

            {/* Page number */}
            <div className="preview-sheet-footer">
              <span>Page 1 of 1</span>
              <span>Normalized Document Hash: SHA-256 Validated</span>
            </div>
          </div>
        </div>

        {/* Bottom Actions Bar */}
        <div className="preview-modal-footer">
          <div className="footer-left">
            <span className="footer-status-dot" />
            <span>Format: <strong>PDF only</strong> (Industry standard)</span>
          </div>
          <div className="footer-buttons">
            <button className="secondary-button" onClick={() => onShare(document)}>
              <Share2 size={16} />
              <span>Share</span>
            </button>
            <button className="secondary-button" onClick={() => window.print()}>
              <Printer size={16} />
              <span>Print</span>
            </button>
            <button className="primary-button" onClick={() => onDownload(document)}>
              <Download size={16} />
              <span>Download PDF</span>
            </button>
          </div>
        </div>
      </div>
    </div>
  )
}
