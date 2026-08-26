import { FilePlus2, Filter, RotateCcw, SlidersHorizontal, Sparkles } from 'lucide-react'
import { DocumentCard } from '../components/DocumentCard'
import { DocumentSupportCard } from '../components/DocumentSupportCard'
import { DocumentVisual } from '../components/DocumentVisual'
import { categoryCopy } from '../components/DocumentMeta'
import type { DocumentCategory, DocumentFilters, VaultDocument } from '../data/types'

const categoryChips: Array<DocumentCategory | 'all'> = [
  'all',
  'identity',
  'education',
  'certificate',
  'transport',
  'financial',
]

const orderedPrimaryCategories: DocumentCategory[] = [
  'identity',
  'education',
  'certificate',
  'transport',
  'financial',
]

type DocumentsProps = {
  documents: VaultDocument[]
  filters: DocumentFilters
  onFiltersChange: (filters: DocumentFilters) => void
  onOpenFilters: () => void
  onOpen: (document: VaultDocument) => void
  onToggleFavourite: (document: VaultDocument) => void
  onAdd: () => void
}

const documentMatches = (document: VaultDocument, filters: DocumentFilters) => {
  const categoryMatches =
    filters.category === 'all' ||
    document.category === filters.category ||
    document.secondaryCategories?.includes(filters.category)

  const trustMatches =
    filters.trustStatus === 'all' || document.trustStatus === filters.trustStatus

  const expiryMatches =
    filters.expiry === 'all' ||
    (filters.expiry === 'no_expiry' && !document.expiryState) ||
    (filters.expiry === 'expiring_soon' && document.expiryState === 'soon') ||
    (filters.expiry === 'expired' && document.expiryState === 'expired')

  const formatMatches =
    filters.format === 'all' || document.format === filters.format

  return categoryMatches && trustMatches && expiryMatches && formatMatches
}

const emptyStateDescriptions: Record<DocumentCategory, { title: string; copy: string; visualType: any }> = {
  identity: {
    title: 'No identity documents yet',
    copy: 'Add your Aadhaar, PAN, Passport, or Voter ID to keep your essential proof of identity secure.',
    visualType: 'aadhaar',
  },
  education: {
    title: 'Your education documents will appear here',
    copy: 'Organize your degrees, marksheets, and academic certificates in one normalized digital vault.',
    visualType: 'degree',
  },
  certificate: {
    title: 'Keep your certificates in one place',
    copy: 'Domicile, income, caste, and civil certificates stay organized and ready for verification.',
    visualType: 'domicile',
  },
  transport: {
    title: 'No transport documents yet',
    copy: 'Keep your Driving Licence, Vehicle Registration (RC), and insurance policies at your fingertips.',
    visualType: 'driving-licence',
  },
  financial: {
    title: 'No financial documents yet',
    copy: 'PAN cards, Form 16 statements, and tax assessments live here safely.',
    visualType: 'tax-form',
  },
  other: {
    title: 'No documents in this collection',
    copy: 'Custom documents and miscellaneous records can be archived here.',
    visualType: 'certificate',
  },
}

export function Documents({
  documents,
  filters,
  onFiltersChange,
  onOpenFilters,
  onOpen,
  onToggleFavourite,
  onAdd,
}: DocumentsProps) {
  // Main document library displays only current versions (archived versions accessible via Version History)
  const currentDocs = documents.filter((doc) => doc.isCurrent !== false)
  const filteredMatches = currentDocs.filter((doc) => documentMatches(doc, filters))
  const distinctCategoriesCount = new Set(currentDocs.map((doc) => doc.category)).size

  const activeFiltersCount =
    (filters.trustStatus !== 'all' ? 1 : 0) +
    (filters.expiry !== 'all' ? 1 : 0) +
    (filters.format !== 'all' ? 1 : 0)

  const sections =
    filters.category === 'all'
      ? orderedPrimaryCategories
          .map((cat) => ({
            category: cat,
            documents: filteredMatches.filter(
              (doc) => doc.category === cat || doc.secondaryCategories?.includes(cat)
            ),
          }))
          .filter((section) => section.documents.length > 0)
      : [
          {
            category: filters.category as DocumentCategory,
            documents: filteredMatches,
          },
        ]

  const currentCategoryEmpty =
    filters.category !== 'all' ? emptyStateDescriptions[filters.category] : null

  return (
    <div className="page-frame library-page">
      {/* Page Title Row */}
      <div className="page-title-row">
        <div>
          <p className="eyebrow">Your vault</p>
          <h1>Documents</h1>
          <p className="page-subtitle">
            {documents.length} documents across {distinctCategoriesCount} collections
          </p>
        </div>
        <button
          className={`icon-button ${activeFiltersCount > 0 ? 'icon-button--active-badge' : ''}`}
          onClick={onOpenFilters}
          aria-label="Filter and sort documents"
        >
          <SlidersHorizontal size={19} />
          {activeFiltersCount > 0 && <span className="filter-count-dot">{activeFiltersCount}</span>}
        </button>
      </div>

      {/* Horizontally Scrollable Liquid Glass Category Chips */}
      <div className="category-chip-rail glass-surface" role="tablist" aria-label="Document categories">
        {categoryChips.map((category) => (
          <button
            key={category}
            role="tab"
            aria-selected={filters.category === category}
            className={`category-chip ${filters.category === category ? 'category-chip--active' : ''}`}
            onClick={() => onFiltersChange({ ...filters, category })}
          >
            {category === 'all' ? 'All' : categoryCopy[category]}
          </button>
        ))}
      </div>

      {/* Document Category Sections */}
      {filteredMatches.length > 0 ? (
        <div className="document-category-sections">
          {sections.map((section) => (
            <section
              className={`document-category-section document-category-section--${section.category}`}
              key={section.category}
            >
              <div className="document-category-section__heading">
                <h2>{categoryCopy[section.category]}</h2>
                <span className="section-doc-count">{section.documents.length}</span>
              </div>

              {section.category === 'identity' ? (
                /* Identity cards rail with hero cards */
                <div className="document-section-rail" aria-label="Identity documents">
                  {section.documents.map((doc, idx) => (
                    <div key={doc.id} className="rail-card-wrap">
                      <DocumentCard
                        document={doc}
                        onOpen={onOpen}
                        onToggleFavourite={onToggleFavourite}
                        index={idx}
                      />
                    </div>
                  ))}
                </div>
              ) : (
                /* Supporting documents grid */
                <div className="document-support-grid">
                  {section.documents.map((doc) => (
                    <DocumentSupportCard
                      document={doc}
                      onOpen={onOpen}
                      onToggleFavourite={onToggleFavourite}
                      key={doc.id}
                    />
                  ))}
                </div>
              )}
            </section>
          ))}
        </div>
      ) : (
        /* Empty State */
        <section className="category-empty-state glass-surface">
          <div className="empty-state-visual">
            <DocumentVisual
              type={currentCategoryEmpty?.visualType || 'aadhaar'}
              decorative
            />
          </div>
          <h3>{currentCategoryEmpty?.title || 'No documents match the active filters'}</h3>
          <p>{currentCategoryEmpty?.copy || 'Try choosing another category or resetting filter options.'}</p>
          <div className="empty-state-actions">
            {activeFiltersCount > 0 && (
              <button
                className="secondary-button"
                onClick={() =>
                  onFiltersChange({
                    category: filters.category,
                    trustStatus: 'all',
                    expiry: 'all',
                    format: 'all',
                  })
                }
              >
                <RotateCcw size={15} />
                <span>Reset Filters</span>
              </button>
            )}
            <button className="primary-button" onClick={onAdd}>
              <FilePlus2 size={16} />
              <span>Add Document</span>
            </button>
          </div>
        </section>
      )}

      {/* Floating Add Document Button */}
      <button className="inline-add-button" onClick={onAdd}>
        <FilePlus2 size={18} />
        <span>Add document to vault</span>
      </button>
    </div>
  )
}
