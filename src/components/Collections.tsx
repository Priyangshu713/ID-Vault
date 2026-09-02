import type { Collection, VaultDocument } from '../data/types'
import { CategoryVisual } from './CategoryVisual'

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
        <button type="button" className="text-button" onClick={onSeeAll}>
          Browse all
        </button>
      </div>
      <div className="collection-grid collection-grid--visual">
        {collections.map((collection) => {
          const matchingDocs = documents.filter(
            (d) => d.category === collection.category || d.secondaryCategories?.includes(collection.category)
          )

          return (
            <button
              type="button"
              className={`collection-item collection-item--${collection.category}`}
              onClick={() => onOpen(collection)}
              key={collection.category}
              aria-label={`Open ${collection.name} collection containing ${matchingDocs.length} documents`}
            >
              <div className="collection-item__heading">
                <span className="collection-item__name">{collection.name}</span>
                <span className="collection-item__count">{matchingDocs.length}</span>
              </div>

              {/* Clean Category Visual (No overlapping card mess) */}
              <div className="collection-item__visual" aria-hidden="true">
                <CategoryVisual category={collection.category} size={36} />
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
