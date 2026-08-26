import { ChevronRight, Plus } from 'lucide-react'
import { generateCollections } from '../data/mockCollections'
import { DocumentVisual } from '../components/DocumentVisual'
import { TrustBadge, categoryCopy } from '../components/DocumentMeta'
import type { Collection, VaultDocument } from '../data/types'

type CollectionsPageProps = {
  documents: VaultDocument[]
  onOpen: (document: VaultDocument) => void
  onCollection: (collection: Collection) => void
  onAdd: () => void
}

export function CollectionsPage({ documents, onOpen, onCollection, onAdd }: CollectionsPageProps) {
  const collections = generateCollections(documents)

  return (
    <div className="page-frame library-page">
      <div className="page-title-row">
        <div>
          <p className="eyebrow">Your vault</p>
          <h1>Collections</h1>
          <p className="page-subtitle">A quiet place for every important record.</p>
        </div>
        <button className="icon-button" onClick={onAdd} aria-label="Add new document">
          <Plus size={20} />
        </button>
      </div>

      <div className="collections-page-list">
        {collections.map((collection) => {
          const matches = documents.filter(
            (document) =>
              document.category === collection.category ||
              document.secondaryCategories?.includes(collection.category)
          )

          return (
            <section className={`collection-page-group collection-page-group--${collection.category}`} key={collection.category}>
              <button
                className="collection-page-heading"
                onClick={() => onCollection(collection)}
                aria-label={`View ${collection.name} collection`}
              >
                <div className="collection-heading-text">
                  <span className="collection-heading-title">{collection.name}</span>
                  <span className="collection-heading-pill">
                    {matches.length} {matches.length === 1 ? 'document' : 'documents'}
                  </span>
                </div>
                <ChevronRight size={17} />
              </button>

              <div className="collection-group-items">
                {matches.slice(0, 3).map((document) => (
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
                      <small>
                        {document.documentType} · {document.maskedNumber || '•••• ••••'}
                      </small>
                    </span>
                    <TrustBadge status={document.trustStatus} compact />
                    <ChevronRight size={17} className="row-chevron" />
                  </button>
                ))}

                {matches.length === 0 && (
                  <div className="collection-empty-placeholder">
                    <p>No documents in {collection.name} yet.</p>
                  </div>
                )}
              </div>
            </section>
          )
        })}
      </div>
    </div>
  )
}
