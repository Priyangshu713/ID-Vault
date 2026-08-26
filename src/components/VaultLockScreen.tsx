import { useState } from 'react'
import {
  Fingerprint,
  KeyRound,
  Lock,
  LockKeyhole,
  ShieldAlert,
  ShieldCheck,
  Sparkles,
  UserRound,
} from 'lucide-react'
import { useAuth } from '../context/AuthContext'
import { useVault } from '../context/VaultContext'

export function VaultLockScreen() {
  const { user } = useAuth()
  const { unlockVault, isPlatformAuthAvailable } = useVault()
  const [unlocking, setUnlocking] = useState(false)
  const [errorMessage, setErrorMessage] = useState<string | null>(null)

  const displayName = user?.name || 'Vault Holder'
  const email = user?.email || ''
  const avatarUrl = user?.avatarUrl

  const handleDeviceUnlock = async () => {
    setUnlocking(true)
    setErrorMessage(null)
    try {
      const res = await unlockVault('biometric')
      if (!res.success) {
        setErrorMessage(res.error || 'Authentication could not be completed.')
      }
    } catch {
      setErrorMessage('Could not verify device credentials.')
    } finally {
      setUnlocking(false)
    }
  }

  const handleGoogleFallbackUnlock = async () => {
    setUnlocking(true)
    setErrorMessage(null)
    try {
      await unlockVault('google_fallback')
    } finally {
      setUnlocking(false)
    }
  }

  return (
    <div className="vault-lock-overlay">
      <div className="vault-lock-backdrop" />
      <div className="vault-lock-modal glass-surface">
        <div className="vault-lock-icon-wrap">
          <LockKeyhole size={36} className="lock-hero-icon" />
        </div>

        <div className="vault-lock-badge">
          <ShieldCheck size={13} />
          <span>ID Vault Protection</span>
        </div>

        <h2>Vault locked</h2>

        <p className="vault-lock-desc">
          Your Google session is still active, but sensitive documents and identifiers are protected.
        </p>

        {user && (
          <div className="vault-lock-user-pill glass-surface">
            {avatarUrl ? (
              <img
                src={avatarUrl}
                alt={displayName}
                className="lock-user-avatar"
                referrerPolicy="no-referrer"
              />
            ) : (
              <UserRound size={16} />
            )}
            <div className="lock-user-text">
              <strong>{displayName}</strong>
              <small>{email}</small>
            </div>
          </div>
        )}

        {errorMessage && (
          <div className="vault-lock-error-alert" role="alert">
            <ShieldAlert size={15} />
            <span>{errorMessage}</span>
          </div>
        )}

        <div className="vault-lock-actions">
          <button
            type="button"
            className="primary-button primary-button--full unlock-trigger-btn"
            onClick={handleDeviceUnlock}
            disabled={unlocking}
          >
            {unlocking ? (
              <Sparkles className="spin-icon" size={17} />
            ) : isPlatformAuthAvailable ? (
              <Fingerprint size={18} />
            ) : (
              <KeyRound size={17} />
            )}
            <span>
              {unlocking
                ? 'Authorizing Vault...'
                : isPlatformAuthAvailable
                ? 'Unlock with device / biometrics'
                : 'Unlock Vault'}
            </span>
          </button>

          {isPlatformAuthAvailable && (
            <button
              type="button"
              className="ghost-button unlock-fallback-btn"
              onClick={handleGoogleFallbackUnlock}
              disabled={unlocking}
            >
              <KeyRound size={14} />
              <span>Unlock with Google account</span>
            </button>
          )}
        </div>

        <p className="vault-lock-footer-note">
          <Lock size={12} />
          <span>Automatic lock triggered after inactivity.</span>
        </p>
      </div>
    </div>
  )
}
