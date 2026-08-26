import { ChevronRight } from 'lucide-react'
import type { VaultDocument } from '../data/types'
import { DocumentVisual } from './DocumentVisual'
import { TrustBadge } from './DocumentMeta'

type RecentDocumentsProps = {
  documents: VaultDocument[]
  onOpen: (document: VaultDocument) => void
}

export function RecentDocuments({ documents, onOpen }: RecentDocumentsProps) {
  return (
    <section className="content-section recent-section" data-entrance="section" aria-labelledby="recent-title">
      <div className="section-heading section-heading--compact">
        <div>
          <h2 id="recent-title">Recent Activity</h2>
        </div>
      </div>
      <div className="list-surface glass-surface">
        {documents.map((document) => (
          <button
            className="document-list-row"
            onClick={() => onOpen(document)}
            key={document.id}
            aria-label={`Open ${document.name}`}
          >
            <span className={`list-document-icon list-document-icon--${document.visualType}`}>
              <DocumentVisual type={document.visualType} decorative />
            </span>
            <span className="document-list-row__text">
              <strong>{document.name}</strong>
              <small>{document.activity}</small>
            </span>
            <TrustBadge status={document.trustStatus} compact />
            <ChevronRight size={17} className="row-chevron" aria-hidden="true" />
          </button>
        ))}
      </div>
    </section>
  )
}
