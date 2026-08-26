import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useState,
  type ReactNode,
} from 'react'
import type { DriveConnectionState, VaultStorage } from '../data/types'
import { useAuth } from './AuthContext'
import {
  clearStoredDriveStorage,
  driveLog,
  ensureVaultFolderStructure,
  getStoredDriveStorage,
  requestDriveToken,
  simulateDriveSetup,
} from '../services/googleDrive'
import { isGoogleAuthConfigured } from '../services/googleAuth'

type DriveContextValue = {
  driveStorage: VaultStorage | null
  connectionState: DriveConnectionState
  isConnecting: boolean
  progressStage: string | null
  error: string | null
  connectDrive: () => Promise<void>
  disconnectDrive: () => void
  refreshDrive: () => Promise<void>
  clearError: () => void
}

const DriveContext = createContext<DriveContextValue | undefined>(undefined)

export function DriveProvider({ children }: { children: ReactNode }) {
  const { user } = useAuth()
  const [driveStorage, setDriveStorage] = useState<VaultStorage | null>(() => getStoredDriveStorage())
  const [connectionState, setConnectionState] = useState<DriveConnectionState>(() =>
    getStoredDriveStorage() ? 'connected' : 'not_connected'
  )
  const [progressStage, setProgressStage] = useState<string | null>(null)
  const [error, setError] = useState<string | null>(null)

  // Clear Drive state when user logs out
  useEffect(() => {
    if (!user) {
      setDriveStorage(null)
      setConnectionState('not_connected')
      setProgressStage(null)
      setError(null)
    }
  }, [user])

  const clearError = useCallback(() => {
    setError(null)
    if (connectionState === 'error') {
      setConnectionState(driveStorage ? 'connected' : 'not_connected')
    }
  }, [connectionState, driveStorage])

  // Connect Google Drive Flow
  const connectDrive = useCallback(async () => {
    setError(null)
    setConnectionState('connecting')
    setProgressStage('Requesting Google Drive permission...')
    driveLog('Connect Google Drive initiated')

    const userEmail = user?.email || 'priyangshu.sharma@gmail.com'

    // If Google Client ID is configured, use real Google Identity Services OAuth
    if (isGoogleAuthConfigured()) {
      try {
        const accessToken = await requestDriveToken(userEmail)
        setProgressStage('Connecting to your Google Drive...')
        
        const storageResult = await ensureVaultFolderStructure(
          accessToken,
          userEmail,
          (stage) => setProgressStage(stage)
        )

        setDriveStorage(storageResult)
        setConnectionState('connected')
        setProgressStage(null)
        driveLog('Google Drive successfully connected and folders created')
      } catch (err: any) {
        driveLog('Drive connection error', err.message)
        if (err.message === 'PERMISSION_DENIED') {
          setError('Google Drive access was not granted.')
        } else if (err.message === 'POPUP_CLOSED') {
          setError('Google Drive connection cancelled.')
        } else {
          setError("We couldn't connect to Google Drive. Please try again.")
        }
        setConnectionState('error')
        setProgressStage(null)
      }
    } else {
      // Developer Mode simulation fallback
      try {
        const storageResult = await simulateDriveSetup(userEmail, (stage) =>
          setProgressStage(stage)
        )
        setDriveStorage(storageResult)
        setConnectionState('connected')
        setProgressStage(null)
        driveLog('Google Drive simulation connected')
      } catch (err: any) {
        setError('Failed to setup vault structure.')
        setConnectionState('error')
        setProgressStage(null)
      }
    }
  }, [user])

  // Disconnect Google Drive Flow (does NOT delete Drive files)
  const disconnectDrive = useCallback(() => {
    clearStoredDriveStorage()
    setDriveStorage(null)
    setConnectionState('not_connected')
    setProgressStage(null)
    setError(null)
    driveLog('Google Drive disconnected')
  }, [])

  // Refresh / Recheck Drive status
  const refreshDrive = useCallback(async () => {
    if (!driveStorage) return
    driveLog('Refreshing Drive storage status')
    setDriveStorage((prev) => (prev ? { ...prev, lastChecked: 'Just now' } : null))
  }, [driveStorage])

  const value = useMemo<DriveContextValue>(
    () => ({
      driveStorage,
      connectionState,
      isConnecting: connectionState === 'connecting',
      progressStage,
      error,
      connectDrive,
      disconnectDrive,
      refreshDrive,
      clearError,
    }),
    [driveStorage, connectionState, progressStage, error, connectDrive, disconnectDrive, refreshDrive, clearError]
  )

  return <DriveContext.Provider value={value}>{children}</DriveContext.Provider>
}

export function useDrive(): DriveContextValue {
  const context = useContext(DriveContext)
  if (!context) {
    throw new Error('useDrive must be used within a DriveProvider')
  }
  return context
}
