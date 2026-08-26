import { useEffect } from 'react'
import { Eye, EyeOff, Lock, Timer } from 'lucide-react'
import type { DocumentVisualType } from '../data/types'
import { maskIdentifier, formatRevealedIdentifier } from '../services/securityService'
import { useVault } from '../context/VaultContext'

type SensitiveFieldProps = {
  label: string
  value?: string
  maskedValue?: string
  visualType?: DocumentVisualType
  documentId: string
  onRevealRequest: () => void
}

export function SensitiveField({
  label,
  value,
  maskedValue,
  visualType,
  documentId,
  onRevealRequest,
}: SensitiveFieldProps) {
  const { isVaultLocked, isDocumentRevealed, getRevealTimeRemaining, hideDocumentNumber } = useVault()

  const isRevealed = !isVaultLocked && isDocumentRevealed(documentId)
  const timeRemaining = getRevealTimeRemaining(documentId)

  // Masked vs. Revealed formatted representations
  const displayMasked = maskedValue || maskIdentifier(value, visualType)
  const displayRevealed = formatRevealedIdentifier(value || maskedValue, visualType)
  const displayedIdentifier = isRevealed ? displayRevealed : displayMasked

  // Development state transition logger (without logging the value)
  useEffect(() => {
    if (import.meta.env.DEV) {
      if (isRevealed) {
        console.log('[SensitiveField] reveal started')
      } else {
        console.log('[SensitiveField] remasked')
      }
    }
  }, [isRevealed])

  // Vault lock transition
  useEffect(() => {
    if (isVaultLocked && import.meta.env.DEV) {
      console.log('[SensitiveField] vault lock detected')
    }
  }, [isVaultLocked])

  return (
    <div
      className="sensitive-field-container"
      role="region"
      aria-label={isRevealed ? `${label} temporarily visible` : `${label} hidden`}
    >
      <div className="sensitive-field-header">
        <dt className="sensitive-field-label">{label}</dt>
        {isRevealed ? (
          <span className="sensitive-reveal-badge" role="status">
            <Timer size={12} className="spin-icon-slow" />
            <span>{timeRemaining}s remaining</span>
          </span>
        ) : (
          <span className="sensitive-protected-tag">
            <Lock size={11} />
            <span>Protected</span>
          </span>
        )}
      </div>

      <dd className="sensitive-field-value-row">
        <div className={`sensitive-id-box ${isRevealed ? 'sensitive-id-box--revealed' : ''}`}>
          <span className="sensitive-id-text" aria-live="polite">
            {displayedIdentifier}
          </span>
        </div>

        {isRevealed ? (
          <button
            type="button"
            className="sensitive-action-btn sensitive-action-btn--hide"
            onClick={() => hideDocumentNumber(documentId)}
            aria-label="Hide and re-mask document number now"
          >
            <EyeOff size={14} />
            <span>Hide</span>
          </button>
        ) : (
          <button
            type="button"
            className="sensitive-action-btn sensitive-action-btn--reveal"
            onClick={onRevealRequest}
            aria-label="Reveal full document number for 30 seconds"
          >
            <Eye size={14} />
            <span>Show full number</span>
          </button>
        )}
      </dd>

      {isRevealed && (
        <div className="reveal-progress-rail" aria-hidden="true">
          <div
            className="reveal-progress-bar"
            style={{ width: `${(timeRemaining / 30) * 100}%` }}
          />
        </div>
      )}
    </div>
  )
}
