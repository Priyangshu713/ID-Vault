import { Award, Car, ChevronRight, CreditCard, FileText, GraduationCap, Landmark, ShieldCheck } from 'lucide-react'
import type { VaultDocument } from '../data/types'
import { TrustBadge } from './DocumentMeta'

type RecentDocumentsProps = {
  documents: VaultDocument[]
  onOpen: (document: VaultDocument) => void
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
