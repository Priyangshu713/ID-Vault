import { CheckCircle2, ChevronRight, FileCheck, Layers, Sparkles, X } from 'lucide-react'
import { BottomSheet } from './BottomSheet'
import type { DocumentPage, VaultDocument } from '../data/types'
import type { DocumentComparisonResult } from '../services/intelligence/intelligenceTypes'

type DocumentComparisonSheetProps = {
  currentDocument: VaultDocument
  newDocumentTypeLabel: string
  newPages: DocumentPage[]
  newHolderName?: string
  newMaskedIdentifier?: string
  comparisonResult?: DocumentComparisonResult | null
  onConfirmNewVersion: () => void
  onCancel: () => void
}

export function DocumentComparisonSheet({
  currentDocument,
  newDocumentTypeLabel,
  newPages,
  newHolderName,
  newMaskedIdentifier,
  comparisonResult,
  onConfirmNewVersion,
  onCancel,
}: DocumentComparisonSheetProps) {
  const currentFront = currentDocument.pages?.find((p) => p.side === 'front') || currentDocument.pages?.[0]
  const currentBack = currentDocument.pages?.find((p) => p.side === 'back') || currentDocument.pages?.[1]

  const newFront = newPages.find((p) => p.side === 'front') || newPages[0]
  const newBack = newPages.find((p) => p.side === 'back') || newPages[1]

  const isHolderChanged = Boolean(newHolderName && newHolderName !== currentDocument.documentHolderName)
  const isIdentifierChanged = Boolean(
    newMaskedIdentifier && newMaskedIdentifier !== currentDocument.maskedIdentifier
  )
  const isBackChanged = Boolean(newBack)

  const changesCount =
    (isHolderChanged ? 1 : 0) + (isIdentifierChanged ? 1 : 0) + (isBackChanged ? 1 : 0) || 1

  return (
    <BottomSheet title={`${newDocumentTypeLabel} Version Update`} onClose={onCancel}>
      <div className="comparison-sheet-content">
        <div className="comparison-lead-callout glass-surface">
          <div className="comparison-callout-icon">
            <Layers size={20} />
          </div>
          <div>
            <strong>Existing {newDocumentTypeLabel} found</strong>
            <p>
              You already have a current version in your vault. Compare differences below before saving version{' '}
              {(currentDocument.version || 1) + 1}.
            </p>
          </div>
        </div>

        {/* Side-by-side / Stacked Version Comparison */}
        <div className="comparison-grid">
          {/* CURRENT VERSION CARD */}
          <div className="comparison-card glass-surface">
            <div className="comparison-card-badge">
              <span>CURRENT</span>
              <small>Version {currentDocument.version || 1}</small>
            </div>

            <div className="comparison-media-preview">
              {currentFront?.dataUrl ? (
                <img
                  src={currentFront.dataUrl}
                  alt="Current Front"
                  className="comparison-thumb"
                />
              ) : (
                <div className="comparison-thumb-placeholder">
                  <FileCheck size={28} />
                  <span>Current Document</span>
                </div>
              )}
            </div>

            <dl className="comparison-meta-list">
              <div className="comparison-meta-row">
                <dt>Holder Name</dt>
                <dd>{currentDocument.documentHolderName || 'Not detected'}</dd>
              </div>
              <div className="comparison-meta-row">
                <dt>Identifier</dt>
                <dd>{currentDocument.maskedIdentifier || 'Not detected'}</dd>
              </div>
              <div className="comparison-meta-row">
                <dt>Pages</dt>
                <dd>{currentDocument.pages?.length || 1} page(s)</dd>
              </div>
            </dl>
          </div>

          <div className="comparison-arrow-indicator">
            <ChevronRight size={22} />
          </div>

          {/* NEW VERSION CARD */}
          <div className="comparison-card comparison-card--new glass-surface">
            <div className="comparison-card-badge comparison-card-badge--new">
              <Sparkles size={12} />
              <span>NEW (v{(currentDocument.version || 1) + 1})</span>
            </div>

            <div className="comparison-media-preview">
              {newFront?.dataUrl ? (
                <img
                  src={newFront.dataUrl}
                  alt="New Front"
                  className="comparison-thumb"
                />
              ) : (
                <div className="comparison-thumb-placeholder">
                  <FileCheck size={28} />
                  <span>New Document</span>
                </div>
              )}
            </div>

            <dl className="comparison-meta-list">
              <div className="comparison-meta-row">
                <dt>Holder Name</dt>
                <dd>
                  <span>{newHolderName || 'Not detected'}</span>
                  {isHolderChanged && <span className="change-chip change-chip--updated">UPDATED</span>}
                </dd>
              </div>
              <div className="comparison-meta-row">
                <dt>Identifier</dt>
                <dd>
                  <span>{newMaskedIdentifier || 'Not detected'}</span>
                  {isIdentifierChanged && <span className="change-chip change-chip--updated">UPDATED</span>}
                </dd>
              </div>
              <div className="comparison-meta-row">
                <dt>Pages</dt>
                <dd>
                  <span>{newPages.length} page(s)</span>
                  {isBackChanged && <span className="change-chip change-chip--new">BACK INCLUDED</span>}
                </dd>
              </div>
            </dl>
          </div>
        </div>

        {/* Smart Changes Breakdown (Phase 6A) */}
        {comparisonResult && comparisonResult.changes.length > 0 && (
          <div
            className="ai-suggestion-card"
            style={{ margin: '0.4rem 0 0.8rem', padding: '0.85rem 1rem' }}
          >
            <div className="ai-suggestion-header">
              <span className="ai-suggestion-tag">
                <Sparkles size={13} />
                <span>AI Change Detection</span>
              </span>
              <span
                className={`conf-badge conf-badge--${comparisonResult.confidence}`}
              >
                {comparisonResult.confidence === 'high' ? 'High Confidence' : 'Detected'}
              </span>
            </div>
            <p style={{ fontSize: '0.78rem', color: 'var(--ink-soft)', margin: '0.2rem 0 0.4rem', lineHeight: 1.4 }}>
              {comparisonResult.summary}
            </p>
            <div style={{ display: 'grid', gap: '0.35rem' }}>
              {comparisonResult.changes.map((c, i) => (
                <div
                  key={i}
                  style={{
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'space-between',
                    fontSize: '0.75rem',
                    padding: '0.25rem 0',
                    borderBottom: i < comparisonResult.changes.length - 1 ? '1px solid rgba(0,0,0,0.04)' : 'none',
                  }}
                >
                  <span style={{ color: 'var(--ink)' }}>{c.label}</span>
                  <span className={`change-status-pill change-status-pill--${c.status}`}>
                    {c.status.toUpperCase()}
                  </span>
                </div>
              ))}
            </div>
          </div>
        )}

        <div className="comparison-summary-row">
          <span className="changes-count-pill">{changesCount} update(s) detected</span>
          <small>Previous version will be archived in Version History without deleting the file.</small>
        </div>

        <div className="sheet-button-stack" style={{ marginTop: 18 }}>
          <button
            type="button"
            className="primary-button primary-button--full"
            onClick={onConfirmNewVersion}
          >
            <CheckCircle2 size={16} />
            <span>Keep New Version (v{(currentDocument.version || 1) + 1})</span>
          </button>
          <button
            type="button"
            className="secondary-button secondary-button--full"
            onClick={onCancel}
          >
            Cancel and Keep Current Version
          </button>
        </div>
      </div>
    </BottomSheet>
  )
}
