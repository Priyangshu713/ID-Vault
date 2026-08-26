import { CheckCircle2, Clock3, Lock, ShieldCheck } from 'lucide-react'
import { DocumentVisual } from '../components/DocumentVisual'
import type { VaultDocument } from '../data/types'
import { useVault } from '../context/VaultContext'

type ActivityProps = {
  documents: VaultDocument[]
  onOpen: (document: VaultDocument) => void
}

export function Activity({ documents, onOpen }: ActivityProps) {
  const { activities } = useVault()

  return (
    <div className="page-frame activity-page">
      <div className="page-title-row">
        <div>
          <p className="eyebrow">Audit log</p>
          <h1>Activity</h1>
          <p className="page-subtitle">A private record of your ID Vault operations and security events.</p>
        </div>
      </div>

      <div className="activity-timeline">
        {activities.map((activity) => {
          const doc = activity.documentId ? documents.find((item) => item.id === activity.documentId) : undefined
          return (
            <button
              className="activity-row glass-surface"
              onClick={() => doc && onOpen(doc)}
              key={activity.id}
              aria-label={`Open ${activity.documentName || 'vault'} activity details`}
              disabled={!doc}
            >
              <span className="activity-row__visual">
                {doc ? (
                  <DocumentVisual type={doc.visualType} decorative />
                ) : (
                  <ShieldCheck size={20} className="activity-fallback-icon" />
                )}
              </span>
              <span className="activity-row__text">
                <span className="activity-row__title">
                  <strong>{activity.documentName || 'ID Vault'}</strong>
                  {activity.badge && (
                    <span className="activity-badge-pill">{activity.badge}</span>
                  )}
                </span>
                <span className="activity-row__action">{activity.action}</span>
                <small className="activity-row__time">
                  <Clock3 size={12} />
                  <span>{activity.time}</span>
                </small>
              </span>
            </button>
          )
        })}

        {activities.length === 0 && (
          <div className="empty-activity-card glass-surface">
            <ShieldCheck size={28} style={{ color: '#276274', margin: '0 auto 0.4rem' }} />
            <p>No activity recorded yet.</p>
            <small style={{ color: 'var(--ink-soft)' }}>
              Events such as document uploads, exports, and vault locks will appear here securely.
            </small>
          </div>
        )}
      </div>
    </div>
  )
}
