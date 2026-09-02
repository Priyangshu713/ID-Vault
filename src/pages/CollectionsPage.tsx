import { Award, Car, ChevronRight, CreditCard, FileText, GraduationCap, Landmark, Plus, ShieldCheck } from 'lucide-react'
import { generateCollections } from '../data/mockCollections'
import { TrustBadge } from '../components/DocumentMeta'
import type { Collection, VaultDocument } from '../data/types'

type CollectionsPageProps = {
  documents: VaultDocument[]
  onOpen: (document: VaultDocument) => void
  onCollection: (collection: Collection) => void
  onAdd: () => void
}

function getDocumentRoundIcon(visualType: string, category: string) {
  switch (visualType) {
    case 'aadhaar':
      return <ShieldCheck size={18} strokeWidth={2.1} />
    case 'pan':
      return <CreditCard size={18} strokeWidth={2.1} />
    case 'driving-licence':
      return <Car size={18} strokeWidth={2.1} />
    case 'degree':
    case 'marksheet':
      return <GraduationCap size={18} strokeWidth={2.1} />
    case 'tax-form':
      return <Landmark size={18} strokeWidth={2.1} />
    case 'domicile':
    case 'certificate':
      return <Award size={18} strokeWidth={2.1} />
    default:
      if (category === 'transport') return <Car size={18} strokeWidth={2.1} />
      if (category === 'education') return <GraduationCap size={18} strokeWidth={2.1} />
      if (category === 'financial') return <Landmark size={18} strokeWidth={2.1} />
      if (category === 'certificate') return <Award size={18} strokeWidth={2.1} />
      return <FileText size={18} strokeWidth={2.1} />
  }
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
                type="button"
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
                    type="button"
                    className="document-list-row"
                    onClick={() => onOpen(document)}
                    key={document.id}
                    aria-label={`Open ${document.name}`}
                  >
                    <span className={`list-round-icon list-round-icon--${document.visualType}`}>
                      {getDocumentRoundIcon(document.visualType, document.category)}
                    </span>
                    <span className="document-list-row__text">
                      <strong>{document.name}</strong>
                      <small>
                        {document.documentType} • {document.maskedNumber || 'Protected'}
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
