import { useRef } from 'react'
import { useGSAP } from '@gsap/react'
import { gsap } from 'gsap'
import { Cloud, CloudOff, LockKeyhole, ShieldCheck } from 'lucide-react'
import type { SettingsState } from '../data/types'
import { useDrive } from '../context/DriveContext'

gsap.registerPlugin(useGSAP)

type VaultStatusProps = {
  settings?: SettingsState
  onOpenSettings?: () => void
}

export function VaultStatus({ settings, onOpenSettings }: VaultStatusProps) {
  const { connectionState } = useDrive()
  const statusRef = useRef<HTMLElement>(null)

  useGSAP(
    () => {
      const indicator = statusRef.current?.querySelector('.status-indicator')
      if (!indicator) return
      const media = gsap.matchMedia()
      media.add('(prefers-reduced-motion: no-preference)', () => {
        gsap.to(indicator, {
          scale: 1.12,
          opacity: 0.75,
          duration: 1.8,
          repeat: -1,
          yoyo: true,
          ease: 'sine.inOut',
        })
      })
      return () => media.revert()
    },
    { scope: statusRef }
  )

  const isDriveConnected = connectionState === 'connected' || settings?.storageStatus === 'connected'

  return (
    <section
      ref={statusRef}
      className="vault-status glass-surface"
      data-entrance="status"
      aria-label="Vault protection status"
      onClick={onOpenSettings}
      role="button"
      tabIndex={0}
    >
      <span className="status-indicator" aria-hidden="true">
        <ShieldCheck size={18} />
      </span>
      <div className="vault-status__text">
        <strong>Vault Encrypted & Protected</strong>
        <div className="vault-status__subline">
          <span>Private Document Vault</span>
          <span className="status-divider">·</span>
          {isDriveConnected ? (
            <span className="status-sub-item text-success">
              <Cloud size={11} /> Storage Connected
            </span>
          ) : (
            <span className="status-sub-item">
              <CloudOff size={11} /> Local Only
            </span>
          )}
        </div>
      </div>
      <LockKeyhole className="vault-status__lock" size={17} aria-hidden="true" />
    </section>
  )
}
