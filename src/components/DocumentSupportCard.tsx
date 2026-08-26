import { ChevronRight, Star } from 'lucide-react'
import type { VaultDocument } from '../data/types'
import { DocumentVisual } from './DocumentVisual'
import { TrustBadge, categoryCopy } from './DocumentMeta'

type DocumentSupportCardProps = {
  document: VaultDocument
  onOpen: (document: VaultDocument) => void
  onToggleFavourite?: (document: VaultDocument) => void
}

export function DocumentSupportCard({ document, onOpen, onToggleFavourite }: DocumentSupportCardProps) {
  const identifier = document.maskedIdentifier || document.maskedNumber

  return (
    <article className={`document-support-card document-support-card--${document.category}`}>
      <button
        className="document-support-card__main"
        onClick={() => onOpen(document)}
        aria-label={`Open ${document.name}`}
      >
        <span className="document-support-card__visual" aria-hidden="true">
          <DocumentVisual type={document.visualType} decorative />
        </span>
        <span className="document-support-card__content">
          <div className="support-title-row">
            <strong className="document-support-title">{document.name}</strong>
            {document.version && document.version > 1 && (
              <span className="support-version-pill">v{document.version}</span>
            )}
          </div>
          <small className="document-support-sub">
            {categoryCopy[document.category]} · {document.storedVersion}
          </small>
          <span className="document-support-meta">
            <span className="support-number">{identifier || 'Protected'}</span>
            <TrustBadge status={document.trustStatus} compact />
          </span>
        </span>
        <ChevronRight className="support-chevron" size={17} aria-hidden="true" />
      </button>

      {onToggleFavourite && (
        <button
          className={`document-support-fav ${document.favourite ? 'document-support-fav--active' : ''}`}
          onClick={(e) => {
            e.stopPropagation()
            onToggleFavourite(document)
          }}
          aria-label={`${document.favourite ? 'Remove' : 'Add'} ${document.name} favourite`}
        >
          <Star size={14} fill={document.favourite ? 'currentColor' : 'none'} />
        </button>
      )}
    </article>
  )
}
