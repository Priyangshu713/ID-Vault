import { useEffect, useRef, useState } from 'react'
import { Eye, EyeOff, Lock, ShieldCheck, Timer } from 'lucide-react'
import { BottomSheet } from './BottomSheet'
import type { VaultDocument } from '../data/types'
import { useVault } from '../context/VaultContext'
import { formatRevealedIdentifier } from '../services/securityService'

type NumberRevealModalProps = {
  document: VaultDocument
  onClose: () => void
  timeoutSeconds?: number
}

export function NumberRevealModal({ document, onClose, timeoutSeconds = 30 }: NumberRevealModalProps) {
  const { revealDocumentNumber, hideDocumentNumber, isVaultLocked } = useVault()
  const [secondsRemaining, setSecondsRemaining] = useState<number>(timeoutSeconds)
  const [isRevealed, setIsRevealed] = useState<boolean>(true)
  const onCloseRef = useRef(onClose)
  onCloseRef.current = onClose

  // Compute full unmasked identifier for display
  const rawIdentifier =
    document.actualIdentifier ||
    document.documentIdentifier ||
    document.fullNumberMock ||
    document.maskedIdentifier ||
    document.maskedNumber

  const revealedNumber = formatRevealedIdentifier(rawIdentifier, document.visualType)

  // Countdown timer lifecycle
  useEffect(() => {
    revealDocumentNumber(document.id, timeoutSeconds)
    setIsRevealed(true)
    setSecondsRemaining(timeoutSeconds)

    const endTime = Date.now() + timeoutSeconds * 1000

    const timer = window.setInterval(() => {
      const remainingMs = endTime - Date.now()
      const remainingSecs = Math.max(0, Math.ceil(remainingMs / 1000))
      setSecondsRemaining(remainingSecs)

      if (remainingSecs <= 0) {
        clearInterval(timer)
        hideDocumentNumber(document.id)
        setIsRevealed(false)
        onCloseRef.current()
      }
    }, 250)

    return () => {
      clearInterval(timer)
      hideDocumentNumber(document.id)
    }
  }, [document.id, timeoutSeconds, revealDocumentNumber, hideDocumentNumber])

  // If vault locks, close and re-mask immediately
  useEffect(() => {
    if (isVaultLocked) {
      hideDocumentNumber(document.id)
      setIsRevealed(false)
      onCloseRef.current()
    }
  }, [isVaultLocked, document.id, hideDocumentNumber])

  const handleHideAndClose = () => {
    hideDocumentNumber(document.id)
    setIsRevealed(false)
    onClose()
  }

  const progressPercent = Math.max(0, Math.min(100, ((timeoutSeconds - secondsRemaining) / timeoutSeconds) * 100))

  return (
    <BottomSheet
      title={isRevealed ? 'Sensitive Identifier' : `Reveal ${document.name} Number?`}
      onClose={handleHideAndClose}
    >
      <div className="reveal-modal-content">
        {!isRevealed ? (
          <div className="reveal-confirmation">
            <div className="reveal-shield-icon">
              <ShieldCheck size={32} />
            </div>
            <div className="reveal-text">
              <p className="reveal-notice">
                Your full <strong>{document.name}</strong> identifier will be temporarily decrypted and displayed on screen.
              </p>
              <p className="reveal-subtext">
                For your privacy and security, the display will automatically re-mask after {timeoutSeconds} seconds or if you navigate away.
              </p>
            </div>

            <div className="reveal-current-masked">
              <small>Currently Protected</small>
              <span className="masked-display">{document.maskedIdentifier || document.maskedNumber || 'XXXX XXXX XXXX'}</span>
            </div>

            <div className="sheet-button-stack">
              <button
                type="button"
                className="primary-button primary-button--full reveal-trigger-btn"
                onClick={() => setIsRevealed(true)}
              >
                <Eye size={18} />
                <span>Reveal for {timeoutSeconds} seconds</span>
              </button>
              <button type="button" className="secondary-button secondary-button--full" onClick={onClose}>
                Cancel
              </button>
            </div>
          </div>
        ) : (
          <div className="revealed-view">
            <div className="countdown-bar-wrap">
              <div className="countdown-header">
                <span className="countdown-label">
                  <Timer size={14} />
                  <span>Auto-masking in <strong>{secondsRemaining}s</strong></span>
                </span>
                <span className="countdown-seconds">{secondsRemaining}s remaining</span>
              </div>
              <div className="countdown-bar-track">
                <div
                  className="countdown-bar-fill"
                  style={{
                    width: `${Math.max(0, 100 - progressPercent)}%`,
                    transition: 'width 0.25s linear',
                  }}
                />
              </div>
            </div>

            <div className="revealed-number-card glass-surface" role="region" aria-label="Sensitive identifier visible">
              <div className="revealed-card-header">
                <small>{document.name} Identifier</small>
                <span className="live-pill">
                  <span className="live-dot" />
                  Temporarily Visible
                </span>
              </div>
              <div className="revealed-number-string" aria-live="assertive">
                {revealedNumber}
              </div>
              <div className="revealed-holder-name">
                {document.documentHolderName || document.ownerName || 'Verified Document'}
              </div>
            </div>

            <div className="sheet-button-stack">
              <button
                type="button"
                className="primary-button primary-button--full"
                onClick={handleHideAndClose}
              >
                <span>Done</span>
              </button>
              <button
                type="button"
                className="secondary-button secondary-button--full"
                onClick={handleHideAndClose}
              >
                <EyeOff size={16} />
                <span>Hide & Re-mask now</span>
              </button>
            </div>

            <p className="privacy-footer-note">
              <Lock size={12} />
              <span>Sensitive identifiers are protected and automatically re-masked.</span>
            </p>
          </div>
        )}
      </div>
    </BottomSheet>
  )
}
