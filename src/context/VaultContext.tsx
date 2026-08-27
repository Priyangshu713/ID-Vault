import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useRef,
  useState,
} from 'react'
import type { ActivityAction, ActivityItem, VaultState } from '../data/types'
import {
  authenticateWithWebAuthn,
  getRegisteredCredentials,
  isPlatformAuthenticatorAvailable,
  isWebAuthnSupported,
  registerPlatformPasskey,
} from '../services/webAuthnService'
import { createSanitizedActivityItem, getStoredAuditTrail, saveAuditTrail } from '../services/securityService'
import { useAuth } from './AuthContext'

type VaultContextType = {
  vaultState: VaultState
  isVaultLocked: boolean
  autoLockTimeoutMinutes: number
  activities: ActivityItem[]
  isPlatformAuthAvailable: boolean
  hasRegisteredPasskey: boolean
  lockVault: () => void
  unlockVault: (method?: 'biometric' | 'google_fallback') => Promise<{ success: boolean; error?: string }>
  setupBiometricUnlock: () => Promise<{ success: boolean; error?: string }>
  setAutoLockTimeoutMinutes: (mins: number) => void
  recordActivity: (actionType: ActivityAction, docName?: string, docId?: string) => void
  isDocumentRevealed: (docId: string) => boolean
  getRevealTimeRemaining: (docId: string) => number
  revealDocumentNumber: (docId: string, ttlSeconds?: number) => void
  hideDocumentNumber: (docId: string) => void
  hideAllRevealedNumbers: () => void
}

const VaultContext = createContext<VaultContextType | undefined>(undefined)

const DEFAULT_INACTIVITY_MINUTES = 10
const VAULT_STATE_SESSION_KEY = 'id_vault_session_lock_v1'

export function VaultProvider({ children }: { children: React.ReactNode }) {
  const { user, isAuthenticated } = useAuth()

  // Vault state is independent of Google Auth
  const [vaultState, setVaultState] = useState<VaultState>(() => {
    const stored = sessionStorage.getItem(VAULT_STATE_SESSION_KEY)
    return stored === 'locked' ? 'locked' : 'unlocked'
  })

  const [autoLockTimeoutMinutes, setAutoLockTimeoutMinutes] = useState<number>(DEFAULT_INACTIVITY_MINUTES)
  const [activities, setActivities] = useState<ActivityItem[]>(() => getStoredAuditTrail())
  const [isPlatformAuthAvailable, setIsPlatformAuthAvailable] = useState<boolean>(false)
  const [hasRegisteredPasskey, setHasRegisteredPasskey] = useState<boolean>(false)

  // Ephemeral revealed document map: docId -> expiresAt timestamp (ms)
  const [revealedExpiryMap, setRevealedExpiryMap] = useState<Record<string, number>>({})
  const lastInteractionTimeRef = useRef<number>(Date.now())

  // Check platform authenticator support
  useEffect(() => {
    let isMounted = true
    isPlatformAuthenticatorAvailable().then((avail) => {
      if (isMounted) setIsPlatformAuthAvailable(avail)
    })
    return () => {
      isMounted = false
    }
  }, [])

  // Check if current user has a registered passkey
  useEffect(() => {
    if (user?.email) {
      const creds = getRegisteredCredentials(user.email)
      setHasRegisteredPasskey(creds.length > 0)
    }
  }, [user])

  // Sync vault state to sessionStorage
  useEffect(() => {
    sessionStorage.setItem(VAULT_STATE_SESSION_KEY, vaultState)
  }, [vaultState])

  // Record sanitized audit activity
  const recordActivity = useCallback((actionType: ActivityAction, docName?: string, docId?: string) => {
    const newItem = createSanitizedActivityItem(actionType, docName, docId)
    setActivities((prev) => {
      const updated = [newItem, ...prev.filter((item) => item.id !== newItem.id)].slice(0, 50)
      saveAuditTrail(updated)
      return updated
    })
  }, [])

  // Lock Vault
  const lockVault = useCallback(() => {
    setVaultState('locked')
    setRevealedExpiryMap({})
    recordActivity('vault_locked')
  }, [recordActivity])

  // Unlock Vault with WebAuthn / Platform Authenticator or Google Account Fallback
  const unlockVault = useCallback(async (
    method: 'biometric' | 'google_fallback' = 'biometric'
  ): Promise<{ success: boolean; error?: string }> => {
    if (method === 'biometric' && isWebAuthnSupported() && isPlatformAuthAvailable) {
      const res = await authenticateWithWebAuthn(user?.email)
      if (res.success) {
        lastInteractionTimeRef.current = Date.now()
        setVaultState('unlocked')
        recordActivity('vault_unlocked')
        return { success: true }
      }
      return { success: false, error: res.error || 'Biometric verification failed.' }
    }

    // Google Session / Direct Verification fallback
    lastInteractionTimeRef.current = Date.now()
    setVaultState('unlocked')
    recordActivity('vault_unlocked')
    return { success: true }
  }, [isPlatformAuthAvailable, recordActivity, user?.email])

  // Setup / Register Biometric Passkey
  const setupBiometricUnlock = useCallback(async (): Promise<{ success: boolean; error?: string }> => {
    if (!user) {
      return { success: false, error: 'User is not authenticated.' }
    }
    const res = await registerPlatformPasskey({
      id: user.id || user.email,
      email: user.email,
      name: user.name || user.email,
    })
    if (res.success) {
      setHasRegisteredPasskey(true)
      return { success: true }
    }
    return { success: false, error: res.error }
  }, [user])

  // Temporary number reveal management
  const revealDocumentNumber = useCallback((docId: string, ttlSeconds = 30) => {
    const expiresAt = Date.now() + ttlSeconds * 1000
    setRevealedExpiryMap((prev) => ({
      ...prev,
      [docId]: expiresAt,
    }))
  }, [])

  const hideDocumentNumber = useCallback((docId: string) => {
    setRevealedExpiryMap((prev) => {
      if (!(docId in prev)) return prev
      const copy = { ...prev }
      delete copy[docId]
      return copy
    })
  }, [])

  const hideAllRevealedNumbers = useCallback(() => {
    setRevealedExpiryMap((prev) => {
      if (Object.keys(prev).length === 0) return prev
      return {}
    })
  }, [])

  const isDocumentRevealed = useCallback((docId: string): boolean => {
    if (vaultState === 'locked') return false
    const expiresAt = revealedExpiryMap[docId]
    if (!expiresAt) return false
    return Date.now() < expiresAt
  }, [revealedExpiryMap, vaultState])

  const getRevealTimeRemaining = useCallback((docId: string): number => {
    if (vaultState === 'locked') return 0
    const expiresAt = revealedExpiryMap[docId]
    if (!expiresAt) return 0
    const remainingMs = expiresAt - Date.now()
    return remainingMs > 0 ? Math.ceil(remainingMs / 1000) : 0
  }, [revealedExpiryMap, vaultState])

  // Periodic expiration tick
  const hasRevealedEntries = Object.keys(revealedExpiryMap).length > 0
  useEffect(() => {
    if (!hasRevealedEntries) return

    const interval = window.setInterval(() => {
      const now = Date.now()
      setRevealedExpiryMap((prev) => {
        let changed = false
        const next: Record<string, number> = {}
        for (const [id, expiresAt] of Object.entries(prev)) {
          if (now < expiresAt) {
            next[id] = expiresAt
          } else {
            changed = true
          }
        }
        return changed ? next : prev
      })
    }, 1000)

    return () => clearInterval(interval)
  }, [hasRevealedEntries])

  // Inactivity auto-lock listener
  useEffect(() => {
    if (!isAuthenticated || vaultState === 'locked') return

    const resetInactivityTimer = () => {
      lastInteractionTimeRef.current = Date.now()
    }

    const events = ['mousedown', 'mousemove', 'keydown', 'touchstart', 'scroll', 'pointerdown']
    events.forEach((ev) => window.addEventListener(ev, resetInactivityTimer, { passive: true }))

    const checkInterval = window.setInterval(() => {
      if (autoLockTimeoutMinutes <= 0) return
      const idleTime = Date.now() - lastInteractionTimeRef.current
      const maxIdleMs = autoLockTimeoutMinutes * 60 * 1000
      if (idleTime >= maxIdleMs) {
        lockVault()
      }
    }, 5000)

    return () => {
      events.forEach((ev) => window.removeEventListener(ev, resetInactivityTimer))
      clearInterval(checkInterval)
    }
  }, [isAuthenticated, vaultState, autoLockTimeoutMinutes, lockVault])

  // Screen Visibility & Tab Switching Protection
  useEffect(() => {
    const handleVisibilityChange = () => {
      if (document.visibilityState === 'hidden') {
        hideAllRevealedNumbers()
      }
    }

    document.addEventListener('visibilitychange', handleVisibilityChange)
    return () => document.removeEventListener('visibilitychange', handleVisibilityChange)
  }, [hideAllRevealedNumbers])

  const value: VaultContextType = useMemo(
    () => ({
      vaultState,
      isVaultLocked: vaultState === 'locked',
      autoLockTimeoutMinutes,
      activities,
      isPlatformAuthAvailable,
      hasRegisteredPasskey,
      lockVault,
      unlockVault,
      setupBiometricUnlock,
      setAutoLockTimeoutMinutes,
      recordActivity,
      isDocumentRevealed,
      getRevealTimeRemaining,
      revealDocumentNumber,
      hideDocumentNumber,
      hideAllRevealedNumbers,
    }),
    [
      vaultState,
      autoLockTimeoutMinutes,
      activities,
      isPlatformAuthAvailable,
      hasRegisteredPasskey,
      lockVault,
      unlockVault,
      setupBiometricUnlock,
      recordActivity,
      isDocumentRevealed,
      getRevealTimeRemaining,
      revealDocumentNumber,
      hideDocumentNumber,
      hideAllRevealedNumbers,
    ]
  )

  return <VaultContext.Provider value={value}>{children}</VaultContext.Provider>
}

export function useVault(): VaultContextType {
  const context = useContext(VaultContext)
  if (!context) {
    throw new Error('useVault must be used within a VaultProvider')
  }
  return context
}
