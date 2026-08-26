import type { Collection, VaultDocument } from '../data/types'
import { DocumentVisual } from './DocumentVisual'

type CollectionsProps = {
  collections: Collection[]
  documents: VaultDocument[]
  onOpen: (collection: Collection) => void
  onSeeAll: () => void
}

export function Collections({ collections, documents, onOpen, onSeeAll }: CollectionsProps) {
  return (
    <section className="content-section" data-entrance="section" aria-labelledby="collections-title">
      <div className="section-heading">
        <div>
          <h2 id="collections-title">Collections</h2>
          <p>Organised around your life</p>
        </div>
        <button className="text-button" onClick={onSeeAll}>
          Browse all
        </button>
      </div>
      <div className="collection-grid collection-grid--visual">
        {collections.map((collection) => {
          const matchingDocs = documents.filter(
            (d) => d.category === collection.category || d.secondaryCategories?.includes(collection.category)
          )
          const previewDocs = matchingDocs.slice(0, 3)

          return (
            <button
              className={`collection-item collection-item--${collection.category}`}
              onClick={() => onOpen(collection)}
              key={collection.category}
              aria-label={`Open ${collection.name} collection containing ${matchingDocs.length} documents`}
            >
              <div className="collection-item__heading">
                <span className="collection-item__name">{collection.name}</span>
                <span className="collection-item__count">{matchingDocs.length}</span>
              </div>

              {/* Overlapping mini SVG card previews */}
              <div className="collection-item__previews" aria-hidden="true">
                {previewDocs.map((doc, idx) => (
                  <span
                    key={doc.id}
                    className={`preview-card-layer preview-card-layer--${idx}`}
                    style={{ zIndex: 3 - idx }}
                  >
                    <DocumentVisual type={doc.visualType} decorative />
                  </span>
                ))}
                {previewDocs.length === 0 && (
                  <span className="preview-card-placeholder">Empty</span>
                )}
              </div>

              <div className="collection-item__footer">
                <small>
                  {matchingDocs.length} {matchingDocs.length === 1 ? 'document' : 'documents'}
                </small>
              </div>
            </button>
          )
        })}
      </div>
    </section>
  )
}
