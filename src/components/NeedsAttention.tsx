import { AlertTriangle, ArrowUpRight, BadgeAlert, CalendarClock } from 'lucide-react'
import type { VaultDocument } from '../data/types'
import { DocumentVisual } from './DocumentVisual'
import { TrustBadge } from './DocumentMeta'

type NeedsAttentionProps = {
  document?: VaultDocument
  onOpen: (document: VaultDocument) => void
}

export function NeedsAttention({ document, onOpen }: NeedsAttentionProps) {
  return (
    <section className="content-section" data-entrance="section" aria-labelledby="attention-title">
      <div className="section-heading section-heading--compact">
        <div>
          <h2 id="attention-title">Needs attention</h2>
        </div>
      </div>
      {document ? (
        <button
          className="attention-row glass-surface"
          onClick={() => onOpen(document)}
          aria-label={`Action required for ${document.name}`}
        >
          <span className={`attention-row__visual attention-row__visual--${document.visualType}`}>
            <DocumentVisual type={document.visualType} decorative />
          </span>
          <span className="attention-row__text">
            <strong>{document.name}</strong>
            <small className="attention-reason">
              {document.expiryState === 'soon' ? (
                <>
                  <CalendarClock size={13} />
                  <span>{document.expiryLabel || 'Expiring soon'}</span>
                </>
              ) : document.trustStatus === 'personal_copy' ? (
                <>
                  <BadgeAlert size={13} />
                  <span>Unverified personal copy · Tap to verify</span>
                </>
              ) : (
                <span>Review document details</span>
              )}
            </small>
          </span>
          <ArrowUpRight size={17} className="attention-arrow" aria-hidden="true" />
        </button>
      ) : (
        <div className="quiet-note glass-surface">
          <p>Everything in your vault looks verified and up to date.</p>
        </div>
      )}
    </section>
  )
}
