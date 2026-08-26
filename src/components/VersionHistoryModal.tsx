import { CheckCircle2, Clock, Download, Eye, FileText, History } from 'lucide-react'
import { BottomSheet } from './BottomSheet'
import type { VaultDocument } from '../data/types'

type VersionHistoryModalProps = {
  document: VaultDocument
  versions: VaultDocument[]
  onClose: () => void
  onOpenVersion: (versionDoc: VaultDocument) => void
  onDownloadVersion: (versionDoc: VaultDocument) => void
}

export function VersionHistoryModal({
  document,
  versions,
  onClose,
  onOpenVersion,
  onDownloadVersion,
}: VersionHistoryModalProps) {
  // Sort descending by version number
  const sortedVersions = [...versions].sort((a, b) => (b.version || 1) - (a.version || 1))

  return (
    <BottomSheet title={`${document.name} Version History`} onClose={onClose}>
      <div className="version-history-content">
        <p className="version-history-subtitle">
          All versions of this logical document are securely archived in your Google Drive.
        </p>

        <div className="version-list">
          {sortedVersions.map((verDoc) => {
            const isCurrent = verDoc.isCurrent !== false && verDoc.id === document.id

            return (
              <div
                key={verDoc.id}
                className={`version-item glass-surface ${isCurrent ? 'version-item--current' : ''}`}
              >
                <div className="version-item-header">
                  <div className="version-item-title">
                    <span className="version-num-pill">v{verDoc.version || 1}</span>
                    <strong>{verDoc.derivedFileName}</strong>
                  </div>
                  {isCurrent ? (
                    <span className="current-version-tag">
                      <CheckCircle2 size={13} />
                      Current
                    </span>
                  ) : (
                    <span className="archived-version-tag">Archived</span>
                  )}
                </div>

                <div className="version-item-meta">
                  <span>
                    <Clock size={12} />
                    {verDoc.addedLabel || 'Added earlier'}
                  </span>
                  <span>·</span>
                  <span>{verDoc.pages?.length || 1} page(s)</span>
                  {verDoc.fileSize && (
                    <>
                      <span>·</span>
                      <span>{verDoc.fileSize}</span>
                    </>
                  )}
                </div>

                <div className="version-item-actions">
                  <button
                    type="button"
                    className="secondary-button"
                    style={{ padding: '0.35rem 0.75rem', fontSize: '0.76rem' }}
                    onClick={() => {
                      onClose()
                      onOpenVersion(verDoc)
                    }}
                  >
                    <Eye size={13} />
                    <span>View v{verDoc.version || 1}</span>
                  </button>
                  <button
                    type="button"
                    className="secondary-button"
                    style={{ padding: '0.35rem 0.75rem', fontSize: '0.76rem' }}
                    onClick={() => onDownloadVersion(verDoc)}
                  >
                    <Download size={13} />
                    <span>Download PDF</span>
                  </button>
                </div>
              </div>
            )
          })}
        </div>
      </div>
    </BottomSheet>
  )
}
