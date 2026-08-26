import { ArrowUpRight } from 'lucide-react'
import type { VaultDocument } from '../data/types'
import { DocumentCard } from './DocumentCard'

type QuickAccessProps = {
  documents: VaultDocument[]
  onOpen: (document: VaultDocument) => void
  onToggleFavourite: (document: VaultDocument) => void
  onSeeAll: () => void
}

export function QuickAccess({ documents, onOpen, onToggleFavourite, onSeeAll }: QuickAccessProps) {
  return (
    <section className="content-section quick-access" data-entrance="section" aria-labelledby="quick-access-title">
      <div className="section-heading">
        <div>
          <h2 id="quick-access-title">Quick Access</h2>
          <p>Your pinned & most-used documents</p>
        </div>
        <button className="text-button" onClick={onSeeAll}>
          View all <ArrowUpRight size={15} />
        </button>
      </div>
      <div className="document-rail" aria-label="Quick access documents">
        {documents.map((document, index) => (
          <div data-entrance="quick-card" key={document.id} className="rail-card-wrap">
            <DocumentCard
              document={document}
              index={index}
              onOpen={onOpen}
              onToggleFavourite={onToggleFavourite}
            />
          </div>
        ))}
        {documents.length === 0 && (
          <div className="quick-access-empty glass-surface">
            <p>Star any document to keep it in Quick Access for instant reach.</p>
          </div>
        )}
      </div>
    </section>
  )
}
