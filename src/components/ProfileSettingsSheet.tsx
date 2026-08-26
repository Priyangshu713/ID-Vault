import { useState } from 'react'
import {
  Check,
  ChevronRight,
  Cloud,
  EyeOff,
  Fingerprint,
  HardDrive,
  Info,
  KeyRound,
  Lock,
  LockKeyhole,
  LogOut,
  RefreshCw,
  RotateCcw,
  ShieldCheck,
  Smartphone,
  Timer,
  UserRound,
} from 'lucide-react'
import { BottomSheet } from './BottomSheet'
import type { Profile, SettingsState, VaultDocument } from '../data/types'
import type { AuthUser } from '../data/authTypes'
import { useDrive } from '../context/DriveContext'
import { useVault } from '../context/VaultContext'
import { useVaultDocuments } from '../context/DocumentContext'

type ProfileSettingsSheetProps = {
  user?: AuthUser | null
  profile: Profile
  settings: SettingsState
  documents: VaultDocument[]
  onClose: () => void
  onUpdateSettings: (newSettings: Partial<SettingsState>) => void
  onResetVault: () => void
  onSignOut: () => void
  onOpenConnectDrive: () => void
  onOpenDisconnectDrive: () => void
  onOpenManageDrive: () => void
}

type SubSheetType = 'none' | 'biometric_setup' | 'auto_lock_picker' | 'privacy_info'

export function ProfileSettingsSheet({
  user,
  profile,
  settings,
  documents,
  onClose,
  onUpdateSettings,
  onResetVault,
  onSignOut,
  onOpenConnectDrive,
  onOpenDisconnectDrive,
  onOpenManageDrive,
}: ProfileSettingsSheetProps) {
  const { driveStorage, connectionState } = useDrive()
  const {
    isVaultLocked,
    lockVault,
    autoLockTimeoutMinutes,
    setAutoLockTimeoutMinutes,
    isPlatformAuthAvailable,
    hasRegisteredPasskey,
    setupBiometricUnlock,
  } = useVault()
  const { refreshDocuments } = useVaultDocuments()

  const [subSheet, setSubSheet] = useState<SubSheetType>('none')
  const [isSettingUpPasskey, setIsSettingUpPasskey] = useState(false)
  const [passkeyFeedback, setPasskeyFeedback] = useState<string | null>(null)
  const [isSyncingVault, setIsSyncingVault] = useState(false)
  const [autoMaskEnabled, setAutoMaskEnabled] = useState(true)

  const isDriveConnected = connectionState === 'connected' && driveStorage !== null
  const displayName = user?.name || profile.displayName || 'Vault Holder'
  const email = user?.email || profile.email || 'personal.vault@google.com'
  const avatarUrl = user?.avatarUrl || profile.avatar

  // Biometric Setup Handler
  const handlePasskeySetup = async () => {
    setIsSettingUpPasskey(true)
    setPasskeyFeedback(null)
    try {
      const res = await setupBiometricUnlock()
      if (res.success) {
        setPasskeyFeedback('Passkey registered successfully.')
        setTimeout(() => {
          setSubSheet('none')
          setPasskeyFeedback(null)
        }, 1200)
      } else {
        setPasskeyFeedback(res.error || 'Setup cancelled or unavailable.')
      }
    } catch {
      setPasskeyFeedback('Could not complete device registration.')
    } finally {
      setIsSettingUpPasskey(false)
    }
  }

  // Vault Sync Handler
  const handleSyncVault = async () => {
    setIsSyncingVault(true)
    try {
      await refreshDocuments()
    } finally {
      setIsSyncingVault(false)
    }
  }

  const autoLockOptions = [
    { label: 'Immediately when app closes', value: 0 },
    { label: '1 minute', value: 1 },
    { label: '5 minutes', value: 5 },
    { label: '10 minutes (Recommended)', value: 10 },
    { label: '15 minutes', value: 15 },
    { label: '30 minutes', value: 30 },
    { label: 'Never (Not recommended)', value: -1 },
  ]

  const currentAutoLockLabel =
    autoLockTimeoutMinutes === 0
      ? 'Immediately'
      : autoLockTimeoutMinutes === -1
      ? 'Never'
      : `${autoLockTimeoutMinutes} min`

  return (
    <>
      <BottomSheet title="Profile & Settings" onClose={onClose}>
        <div className="settings-sheet-content">
          {/* 1. Compact Apple-Style Profile Card */}
          <div className="settings-profile-card">
            {avatarUrl ? (
              <img
                src={avatarUrl}
                alt={displayName}
                className="settings-profile-avatar"
                referrerPolicy="no-referrer"
              />
            ) : (
              <div className="settings-profile-avatar-fallback">
                {displayName.charAt(0).toUpperCase()}
              </div>
            )}
            <div className="settings-profile-info">
              <h3 className="settings-profile-name">{displayName}</h3>
              <p className="settings-profile-email">{email}</p>
              <span className="settings-profile-status">
                <ShieldCheck size={13} />
                <span>Google account · Verified session</span>
              </span>
            </div>
          </div>

          {/* 2. Storage Section */}
          <section className="settings-group" aria-labelledby="heading-storage">
            <span id="heading-storage" className="settings-group-header">
              Storage
            </span>
            <div className="settings-group-card">
              <button
                type="button"
                className="settings-row"
                onClick={isDriveConnected ? onOpenManageDrive : onOpenConnectDrive}
              >
                <div className="settings-row-left">
                  <div className="settings-row-icon settings-row-icon--blue">
                    <Cloud size={17} />
                  </div>
                  <div className="settings-row-text">
                    <span className="settings-row-title">Google Drive</span>
                    <span className="settings-row-subtitle">
                      {isDriveConnected
                        ? `ID Vault · 6 category folders (${documents.length} doc${documents.length === 1 ? '' : 's'})`
                        : 'Keep documents in your own Google Drive'}
                    </span>
                  </div>
                </div>
                <div className="settings-row-right">
                  <span
                    className={`settings-chip ${
                      isDriveConnected ? 'settings-chip--success' : 'settings-chip--neutral'
                    }`}
                  >
                    {isDriveConnected ? 'Connected' : 'Not connected'}
                  </span>
                  <ChevronRight size={16} className="settings-row-chevron" />
                </div>
              </button>
            </div>
          </section>

          {/* 3. Security Section */}
          <section className="settings-group" aria-labelledby="heading-security">
            <span id="heading-security" className="settings-group-header">
              Security & Privacy
            </span>
            <div className="settings-group-card">
              {/* Row 1: Device Authentication */}
              <button
                type="button"
                className="settings-row"
                onClick={() => setSubSheet('biometric_setup')}
              >
                <div className="settings-row-left">
                  <div className="settings-row-icon settings-row-icon--purple">
                    <Fingerprint size={17} />
                  </div>
                  <div className="settings-row-text">
                    <span className="settings-row-title">Device authentication</span>
                    <span className="settings-row-subtitle">
                      {isPlatformAuthAvailable
                        ? 'Windows Hello / Touch ID / Face ID'
                        : 'Platform biometric authenticator'}
                    </span>
                  </div>
                </div>
                <div className="settings-row-right">
                  <span
                    className={`settings-chip ${
                      hasRegisteredPasskey
                        ? 'settings-chip--success'
                        : isPlatformAuthAvailable
                        ? 'settings-chip--neutral'
                        : 'settings-chip--neutral'
                    }`}
                  >
                    {hasRegisteredPasskey
                      ? 'Ready'
                      : isPlatformAuthAvailable
                      ? 'Available'
                      : 'Not supported'}
                  </span>
                  <ChevronRight size={16} className="settings-row-chevron" />
                </div>
              </button>

              {/* Row 2: Manual Vault Lock */}
              <button
                type="button"
                className="settings-row"
                onClick={() => {
                  lockVault()
                  onClose()
                }}
              >
                <div className="settings-row-left">
                  <div className="settings-row-icon settings-row-icon--green">
                    <LockKeyhole size={17} />
                  </div>
                  <div className="settings-row-text">
                    <span className="settings-row-title">Vault lock</span>
                    <span className="settings-row-subtitle">
                      {isVaultLocked ? 'Vault is currently locked' : 'Vault currently unlocked'}
                    </span>
                  </div>
                </div>
                <div className="settings-row-right">
                  <span className="settings-row-value" style={{ color: 'var(--accent)' }}>
                    Lock now
                  </span>
                  <ChevronRight size={16} className="settings-row-chevron" />
                </div>
              </button>

              {/* Row 3: Automatic Lock */}
              <button
                type="button"
                className="settings-row"
                onClick={() => setSubSheet('auto_lock_picker')}
              >
                <div className="settings-row-left">
                  <div className="settings-row-icon settings-row-icon--amber">
                    <Timer size={17} />
                  </div>
                  <div className="settings-row-text">
                    <span className="settings-row-title">Automatic lock</span>
                    <span className="settings-row-subtitle">Lock vault after inactivity</span>
                  </div>
                </div>
                <div className="settings-row-right">
                  <span className="settings-row-value">{currentAutoLockLabel}</span>
                  <ChevronRight size={16} className="settings-row-chevron" />
                </div>
              </button>

              {/* Row 4: Sensitive Number Auto-Mask */}
              <div className="settings-row">
                <div className="settings-row-left">
                  <div className="settings-row-icon">
                    <EyeOff size={17} />
                  </div>
                  <div className="settings-row-text">
                    <span className="settings-row-title">Sensitive numbers</span>
                    <span className="settings-row-subtitle">
                      Auto-mask revealed identifiers after 30 seconds
                    </span>
                  </div>
                </div>
                <div className="settings-row-right">
                  <button
                    type="button"
                    role="switch"
                    aria-checked={autoMaskEnabled}
                    className={`ios-toggle-switch ${autoMaskEnabled ? 'ios-toggle-switch--active' : ''}`}
                    onClick={() => setAutoMaskEnabled((v) => !v)}
                  >
                    <span className="ios-toggle-knob" />
                  </button>
                </div>
              </div>
            </div>
          </section>

          {/* 4. About & Maintenance Section */}
          <section className="settings-group" aria-labelledby="heading-about">
            <span id="heading-about" className="settings-group-header">
              About & System
            </span>
            <div className="settings-group-card">
              {/* Privacy & Scopes */}
              <button
                type="button"
                className="settings-row"
                onClick={() => setSubSheet('privacy_info')}
              >
                <div className="settings-row-left">
                  <div className="settings-row-icon">
                    <Lock size={16} />
                  </div>
                  <div className="settings-row-text">
                    <span className="settings-row-title">Privacy & Permissions</span>
                    <span className="settings-row-subtitle">Local OCR and minimum OAuth scopes</span>
                  </div>
                </div>
                <div className="settings-row-right">
                  <ChevronRight size={16} className="settings-row-chevron" />
                </div>
              </button>

              {/* Sync & Reconcile */}
              <button
                type="button"
                className="settings-row"
                onClick={handleSyncVault}
                disabled={isSyncingVault}
              >
                <div className="settings-row-left">
                  <div className="settings-row-icon">
                    <RefreshCw className={isSyncingVault ? 'spin-icon' : ''} size={16} />
                  </div>
                  <div className="settings-row-text">
                    <span className="settings-row-title">Refresh & Sync Vault</span>
                    <span className="settings-row-subtitle">Reconcile Google Drive index</span>
                  </div>
                </div>
                <div className="settings-row-right">
                  <ChevronRight size={16} className="settings-row-chevron" />
                </div>
              </button>

              {/* App Version Row */}
              <div className="settings-row">
                <div className="settings-row-left">
                  <div className="settings-row-icon">
                    <Info size={16} />
                  </div>
                  <div className="settings-row-text">
                    <span className="settings-row-title">ID Vault</span>
                    <span className="settings-row-subtitle">Personal Document Vault</span>
                  </div>
                </div>
                <div className="settings-row-right">
                  <span className="settings-row-value">v0.1.0</span>
                </div>
              </div>
            </div>
          </section>

          {/* 5. Sign Out & Reset Action */}
          <div className="settings-group" style={{ marginTop: '0.2rem' }}>
            <button
              type="button"
              className="secondary-button secondary-button--full"
              onClick={onSignOut}
            >
              <LogOut size={16} />
              <span>Sign out of ID Vault</span>
            </button>

            <button
              type="button"
              className="text-button text-button--danger"
              style={{ margin: '0.2rem auto 0' }}
              onClick={onResetVault}
            >
              <RotateCcw size={13} />
              <span>Reset Demo Settings</span>
            </button>
          </div>
        </div>
      </BottomSheet>

      {/* SUB-SHEET 1: Biometric Passkey Setup */}
      {subSheet === 'biometric_setup' && (
        <BottomSheet title="Device Authentication" onClose={() => setSubSheet('none')}>
          <div className="subsheet-body" style={{ padding: '0.4rem 0 1.2rem', textAlign: 'center' }}>
            <div
              style={{
                width: '4rem',
                height: '4rem',
                margin: '0 auto 1rem',
                borderRadius: '1.2rem',
                background: 'rgba(118, 75, 162, 0.12)',
                color: '#764ba2',
                display: 'grid',
                placeItems: 'center',
              }}
            >
              <Fingerprint size={32} />
            </div>

            <h3 style={{ fontSize: '1.2rem', fontWeight: 750, letterSpacing: '-0.02em' }}>
              Unlock with your device
            </h3>
            <p style={{ color: 'var(--ink-soft)', fontSize: '0.84rem', margin: '0.45rem auto 1.2rem', maxWidth: '21rem', lineHeight: 1.45 }}>
              Use your device's built-in platform security to unlock ID Vault quickly and securely.
            </p>

            <div className="settings-info-box" style={{ textAlign: 'left' }}>
              <div className="settings-info-item">
                <ShieldCheck size={16} />
                <span>Supports Fingerprint, Face ID, Windows Hello, or device PIN.</span>
              </div>
              <div className="settings-info-item">
                <Lock size={16} />
                <span>Biometric data never leaves your device hardware.</span>
              </div>
            </div>

            {passkeyFeedback && (
              <p style={{ fontSize: '0.8rem', color: '#276274', fontWeight: 600, marginBottom: '0.8rem' }}>
                {passkeyFeedback}
              </p>
            )}

            <button
              type="button"
              className="primary-button primary-button--full"
              onClick={handlePasskeySetup}
              disabled={isSettingUpPasskey}
            >
              <Fingerprint size={16} />
              <span>{isSettingUpPasskey ? 'Setting Up...' : hasRegisteredPasskey ? 'Update Passkey' : 'Set Up Device Unlock'}</span>
            </button>

            <button
              type="button"
              className="text-button"
              style={{ margin: '0.6rem auto 0' }}
              onClick={() => setSubSheet('none')}
            >
              Not Now
            </button>
          </div>
        </BottomSheet>
      )}

      {/* SUB-SHEET 2: Automatic Lock Duration Picker */}
      {subSheet === 'auto_lock_picker' && (
        <BottomSheet title="Automatic Lock" onClose={() => setSubSheet('none')}>
          <div style={{ padding: '0.2rem 0 1rem' }}>
            <p style={{ fontSize: '0.82rem', color: 'var(--ink-soft)', marginBottom: '0.85rem' }}>
              Choose how long ID Vault remains unlocked when inactive.
            </p>
            <div className="settings-choice-list">
              {autoLockOptions.map((opt) => {
                const isSelected = autoLockTimeoutMinutes === opt.value
                return (
                  <button
                    key={opt.value}
                    type="button"
                    className={`settings-choice-item ${isSelected ? 'settings-choice-item--selected' : ''}`}
                    onClick={() => {
                      setAutoLockTimeoutMinutes(opt.value)
                      setSubSheet('none')
                    }}
                  >
                    <span className="settings-choice-label">{opt.label}</span>
                    {isSelected && <Check size={16} className="settings-choice-check" />}
                  </button>
                )
              })}
            </div>
          </div>
        </BottomSheet>
      )}

      {/* SUB-SHEET 3: Privacy & Security Details */}
      {subSheet === 'privacy_info' && (
        <BottomSheet title="Privacy & Security" onClose={() => setSubSheet('none')}>
          <div style={{ padding: '0.2rem 0 1.2rem' }}>
            <div className="settings-info-box">
              <div className="settings-info-item">
                <ShieldCheck size={17} />
                <div>
                  <strong>Local WebAssembly OCR</strong>
                  <div style={{ fontSize: '0.75rem', color: 'var(--ink-soft)' }}>
                    Text recognition runs 100% in your browser. Document files are never sent to external AI servers.
                  </div>
                </div>
              </div>
              <div className="settings-info-item">
                <Cloud size={17} />
                <div>
                  <strong>Minimum Drive Scopes</strong>
                  <div style={{ fontSize: '0.75rem', color: 'var(--ink-soft)' }}>
                    ID Vault only accesses files it creates (<code>drive.file</code>). It cannot read any other files in your Google Drive.
                  </div>
                </div>
              </div>
              <div className="settings-info-item">
                <Lock size={17} />
                <div>
                  <strong>Masked Identifiers & Vault Lock</strong>
                  <div style={{ fontSize: '0.75rem', color: 'var(--ink-soft)' }}>
                    Aadhaar, PAN, and passport numbers are masked by default and re-masked automatically after 30 seconds.
                  </div>
                </div>
              </div>
            </div>

            <button
              type="button"
              className="primary-button primary-button--full"
              onClick={() => setSubSheet('none')}
            >
              Done
            </button>
          </div>
        </BottomSheet>
      )}
    </>
  )
}
