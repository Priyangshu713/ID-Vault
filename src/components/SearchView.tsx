import { useEffect, useMemo, useRef, useState } from 'react'
import { useGSAP } from '@gsap/react'
import { gsap } from 'gsap'
import { ArrowLeft, Clock3, Search, Sparkles, X } from 'lucide-react'
import { DocumentVisual } from './DocumentVisual'
import { TrustBadge, categoryCopy } from './DocumentMeta'
import type { VaultDocument } from '../data/types'

gsap.registerPlugin(useGSAP)

type SearchViewProps = {
  documents: VaultDocument[]
  onClose: () => void
  onOpen: (document: VaultDocument) => void
}

const recentSearches = ['Aadhaar', 'Driving Licence', 'Degree', 'Identity', 'Certificates', 'PAN']

export function SearchView({ documents, onClose, onOpen }: SearchViewProps) {
  const scopeRef = useRef<HTMLElement>(null)
  const inputRef = useRef<HTMLInputElement>(null)
  const [query, setQuery] = useState('')

  const matches = useMemo(() => {
    const normalized = query.trim().toLowerCase()
    if (!normalized) return []

    return documents.filter((document) => {
      const fields = [
        document.name,
        document.shortName,
        document.category,
        categoryCopy[document.category],
        document.documentType,
        document.ownerName,
        document.maskedNumber || '',
        document.issuer || '',
        document.derivedFileName,
        document.trustStatus,
      ].map((f) => f.toLowerCase())

      // Category shortcuts
      if (normalized === 'identity' || normalized === 'id') {
        return document.category === 'identity' || document.secondaryCategories?.includes('identity')
      }
      if (normalized === 'education' || normalized === 'academic' || normalized === 'study') {
        return document.category === 'education' || document.secondaryCategories?.includes('education')
      }
      if (normalized === 'certificates' || normalized === 'certificate') {
        return document.category === 'certificate' || document.secondaryCategories?.includes('certificate')
      }
      if (normalized === 'transport' || normalized === 'vehicle' || normalized === 'car') {
        return document.category === 'transport' || document.secondaryCategories?.includes('transport')
      }
      if (normalized === 'financial' || normalized === 'tax' || normalized === 'income') {
        return document.category === 'financial' || document.secondaryCategories?.includes('financial')
      }

      return fields.some((value) => value.includes(normalized))
    })
  }, [documents, query])

  const { contextSafe } = useGSAP(
    () => {
      gsap.fromTo(
        '.search-view',
        { yPercent: 6, autoAlpha: 0 },
        { yPercent: 0, autoAlpha: 1, duration: 0.32, ease: 'power3.out' }
      )
    },
    { scope: scopeRef }
  )

  useEffect(() => {
    inputRef.current?.focus()
    const previousOverflow = document.body.style.overflow
    document.body.style.overflow = 'hidden'

    const onKeyDown = (event: KeyboardEvent) => {
      if (event.key === 'Escape') onClose()
    }
    window.addEventListener('keydown', onKeyDown)

    return () => {
      document.body.style.overflow = previousOverflow
      window.removeEventListener('keydown', onKeyDown)
    }
  }, [onClose])

  const dismiss = contextSafe(() => {
    gsap.to(scopeRef.current, {
      yPercent: 6,
      autoAlpha: 0,
      duration: 0.2,
      ease: 'power2.in',
      onComplete: onClose,
    })
  })

  const selectDocument = (document: VaultDocument) => {
    onOpen(document)
    onClose()
  }

  return (
    <section
      ref={scopeRef}
      className="search-view"
      role="dialog"
      aria-modal="true"
      aria-label="Search documents"
    >
      <div className="search-view__top">
        <button
          className="icon-button icon-button--quiet"
          onClick={dismiss}
          aria-label="Close search"
        >
          <ArrowLeft size={21} />
        </button>
        <h1>Search Vault</h1>
        <span aria-hidden="true" />
      </div>

      <div className="search-field glass-surface">
        <Search size={19} className="search-field-icon" aria-hidden="true" />
        <input
          ref={inputRef}
          value={query}
          onChange={(event) => setQuery(event.target.value)}
          placeholder="Search by name, category, number, or issuer"
          aria-label="Search by name, category, number, or issuer"
        />
        {query && (
          <button
            className="clear-search-btn"
            onClick={() => setQuery('')}
            aria-label="Clear search"
          >
            <X size={17} />
          </button>
        )}
      </div>

      {query ? (
        <div className="search-results" aria-live="polite">
          <p className="search-results__label">
            {matches.length
              ? `${matches.length} result${matches.length === 1 ? '' : 's'} found`
              : 'No matching documents'}
          </p>
          <div className="search-results-list">
            {matches.map((document) => (
              <button
                className="search-result-row glass-surface"
                onClick={() => selectDocument(document)}
                key={document.id}
              >
                <span className={`search-result-visual search-result-visual--${document.visualType}`}>
                  <DocumentVisual type={document.visualType} decorative />
                </span>
                <span className="search-result-info">
                  <strong>{document.name}</strong>
                  <small>
                    {document.documentType} · {document.maskedNumber || '•••• ••••'}
                  </small>
                </span>
                <TrustBadge status={document.trustStatus} compact />
              </button>
            ))}
          </div>

          {matches.length === 0 && (
            <div className="search-empty-state">
              <Sparkles size={28} className="search-empty-icon" />
              <p>No documents found matching "{query}".</p>
              <small>Try searching by category like "Identity", "Transport", or the document type.</small>
            </div>
          )}
        </div>
      ) : (
        <div className="recent-searches">
          <p className="recent-searches-label">Suggested searches</p>
          <div className="recent-search-chips">
            {recentSearches.map((term) => (
              <button
                key={term}
                className="recent-search-chip"
                onClick={() => setQuery(term)}
              >
                <Clock3 size={14} />
                <span>{term}</span>
              </button>
            ))}
          </div>
        </div>
      )}
    </section>
  )
}
