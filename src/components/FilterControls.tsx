import { Check, RotateCcw } from 'lucide-react'
import { useState } from 'react'
import type { DocumentCategory, DocumentFilters, DocumentFormat, DocumentTrustStatus } from '../data/types'
import { categoryCopy, trustCopy } from './DocumentMeta'

type FilterControlsProps = {
  filters: DocumentFilters
  onApply: (filters: DocumentFilters) => void
  onClose?: () => void
}

const categories: Array<DocumentCategory | 'all'> = [
  'all',
  'identity',
  'education',
  'certificate',
  'transport',
  'financial',
]

const statuses: Array<DocumentTrustStatus | 'all'> = [
  'all',
  'personal_copy',
  'ocr_processed',
  'digilocker_matched',
  'official_digital',
]

const formats: Array<DocumentFormat | 'all'> = ['all', 'pdf', 'jpg', 'png', 'webp']

const statusLabel = (status: DocumentTrustStatus | 'all') =>
  status === 'all' ? 'All statuses' : trustCopy[status]

const categoryLabel = (category: DocumentCategory | 'all') =>
  category === 'all' ? 'All categories' : categoryCopy[category]

export function FilterControls({ filters, onApply }: FilterControlsProps) {
  const [draft, setDraft] = useState(filters)

  const select = <K extends keyof DocumentFilters>(key: K, value: DocumentFilters[K]) =>
    setDraft((current) => ({ ...current, [key]: value }))

  const option = <T extends string>(
    value: T,
    selected: boolean,
    label: string,
    onSelect: () => void
  ) => (
    <button
      type="button"
      key={value}
      className={`filter-option ${selected ? 'filter-option--selected' : ''}`}
      onClick={onSelect}
    >
      {selected && <Check size={14} className="filter-check-icon" />}
      <span>{label}</span>
    </button>
  )

  const handleReset = () => {
    setDraft({
      category: 'all',
      trustStatus: 'all',
      expiry: 'all',
      format: 'all',
    })
  }

  return (
    <div className="filter-controls">
      <div className="filter-group">
        <h3>Category</h3>
        <div className="filter-options">
          {categories.map((cat) =>
            option(cat, draft.category === cat, categoryLabel(cat), () => select('category', cat))
          )}
        </div>
      </div>

      <div className="filter-group">
        <h3>Trust & Verification</h3>
        <div className="filter-options">
          {statuses.map((status) =>
            option(status, draft.trustStatus === status, statusLabel(status), () =>
              select('trustStatus', status)
            )
          )}
        </div>
      </div>

      <div className="filter-group">
        <h3>Validity & Expiry</h3>
        <div className="filter-options">
          {option('all', draft.expiry === 'all', 'All', () => select('expiry', 'all'))}
          {option('no_expiry', draft.expiry === 'no_expiry', 'No expiry date', () =>
            select('expiry', 'no_expiry')
          )}
          {option('expiring_soon', draft.expiry === 'expiring_soon', 'Expiring soon', () =>
            select('expiry', 'expiring_soon')
          )}
          {option('expired', draft.expiry === 'expired', 'Expired', () => select('expiry', 'expired'))}
        </div>
      </div>

      <div className="filter-group">
        <h3>Original File Format</h3>
        <div className="filter-options">
          {formats.map((format) =>
            option(
              format,
              draft.format === format,
              format === 'all' ? 'All formats' : format.toUpperCase(),
              () => select('format', format)
            )
          )}
        </div>
      </div>

      <div className="filter-actions">
        <button className="filter-reset" onClick={handleReset}>
          <RotateCcw size={15} />
          <span>Reset</span>
        </button>
        <button className="primary-button" onClick={() => onApply(draft)}>
          Apply Filters
        </button>
      </div>
    </div>
  )
}
