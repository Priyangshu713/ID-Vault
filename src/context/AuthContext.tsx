import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useState,
  type ReactNode,
} from 'react'
import type { AuthError, AuthStatus, AuthUser, GoogleJwtPayload } from '../data/authTypes'
import {
  authLog,
  clearStoredSession,
  createAuthUserFromPayload,
  getGoogleClientId,
  getStoredSession,
  isGoogleAuthConfigured,
  loadGsiScript,
  parseGoogleCredential,
  saveSession,
} from '../services/googleAuth'

type AuthContextValue = {
  user: AuthUser | null
  status: AuthStatus
  isAuthenticated: boolean
  isLoading: boolean
  error: AuthError | null
  isConfigured: boolean
  signIn: () => Promise<void>
  signOut: () => Promise<void>
  clearError: () => void
  devSignIn: (customUser?: Partial<AuthUser>) => void
}

const AuthContext = createContext<AuthContextValue | undefined>(undefined)

export function AuthProvider({ children }: { children: ReactNode }) {
  const [user, setUser] = useState<AuthUser | null>(() => getStoredSession())
  const [status, setStatus] = useState<AuthStatus>(() =>
    getStoredSession() ? 'authenticated' : 'unauthenticated'
  )
  const [error, setError] = useState<AuthError | null>(null)
  const [isGsiReady, setIsGsiReady] = useState(false)

  const isConfigured = useMemo(() => isGoogleAuthConfigured(), [])

  // Callback from Google Identity Services Credential Response
  const handleCredentialResponse = useCallback((response: { credential?: string }) => {
    authLog('Received Google credential response')
    if (!response.credential) {
      setError({
        code: 'unknown',
        message: 'No credential received from Google. Please try again.',
      })
      setStatus('authentication_error')
      return
    }

    const payload: GoogleJwtPayload | null = parseGoogleCredential(response.credential)
    if (!payload || !payload.email) {
      setError({
        code: 'unknown',
        message: 'Failed to parse user profile from Google. Please try again.',
      })
      setStatus('authentication_error')
      return
    }

    const authenticatedUser = createAuthUserFromPayload(payload)
    setUser(authenticatedUser)
    saveSession(authenticatedUser)
    setStatus('authenticated')
    setError(null)
    authLog('User signed in successfully', authenticatedUser.email)
  }, [])

  // Initialize Google Identity Services
  useEffect(() => {
    authLog('Initializing Google authentication provider')
    let isMounted = true

    loadGsiScript()
      .then(() => {
        if (!isMounted) return
        const clientId = getGoogleClientId()

        if (typeof window !== 'undefined' && (window as any).google?.accounts?.id) {
          if (clientId && isGoogleAuthConfigured()) {
            ;(window as any).google.accounts.id.initialize({
              client_id: clientId,
              callback: handleCredentialResponse,
              auto_select: false,
              cancel_on_tap_outside: true,
              itp_support: true,
            })
            setIsGsiReady(true)
            authLog('Google Identity Services initialized with Client ID')
          } else {
            setIsGsiReady(true)
            authLog('Google Identity Services ready (Client ID not configured in .env)')
          }
        }
      })
      .catch((err) => {
        authLog('Failed to load Google Identity script', err.message)
      })

    return () => {
      isMounted = false
    }
  }, [handleCredentialResponse])

  // Clear Error
  const clearError = useCallback(() => {
    setError(null)
    if (status === 'authentication_error') {
      setStatus(user ? 'authenticated' : 'unauthenticated')
    }
  }, [status, user])

  // Sign In Trigger
  const signIn = useCallback(async () => {
    setError(null)
    setStatus('authenticating')
    authLog('Starting Google Sign-In flow')

    if (!isGoogleAuthConfigured()) {
      authLog('Google Client ID is missing in environment variables')
      setError({
        code: 'config_missing',
        message: 'Google Client ID is not configured in .env. Please set VITE_GOOGLE_CLIENT_ID or use Developer Test Mode.',
      })
      setStatus('authentication_error')
      return
    }

    try {
      await loadGsiScript()

      if (typeof window !== 'undefined' && (window as any).google?.accounts?.id) {
        const clientId = getGoogleClientId()
        ;(window as any).google.accounts.id.initialize({
          client_id: clientId,
          callback: handleCredentialResponse,
          auto_select: false,
          cancel_on_tap_outside: true,
        })

        // Prompt Google One Tap / Account Picker
        ;(window as any).google.accounts.id.prompt((notification: any) => {
          if (notification.isNotDisplayed()) {
            authLog('Google One Tap not displayed', notification.getNotDisplayedReason())
            // Fallback: render hidden button and click or show user guidance
          } else if (notification.isSkippedMoment()) {
            authLog('Google prompt skipped', notification.getSkippedReason())
            setStatus((prev) => (prev === 'authenticating' ? 'unauthenticated' : prev))
          } else if (notification.isDismissedMoment()) {
            authLog('Google prompt dismissed', notification.getDismissedReason())
            setStatus((prev) => (prev === 'authenticating' ? 'unauthenticated' : prev))
          }
        })
      } else {
        throw new Error('Google Identity Services library unavailable')
      }
    } catch (err: any) {
      authLog('Sign-in error', err.message)
      setError({
        code: 'script_load_failed',
        message: "We couldn't reach Google authentication services. Please check your network connection.",
      })
      setStatus('authentication_error')
    }
  }, [handleCredentialResponse])

  // Sign Out Trigger
  const signOut = useCallback(async () => {
    setStatus('signing_out')
    authLog('User signing out')

    try {
      if (typeof window !== 'undefined' && (window as any).google?.accounts?.id) {
        ;(window as any).google.accounts.id.disableAutoSelect()
      }
    } catch (e) {
      // Ignore cleanup error
    }

    clearStoredSession()
    setUser(null)
    setError(null)
    setStatus('unauthenticated')
    authLog('User signed out cleanly')
  }, [])

  // Developer Test Sign-In (Safe local development mock when Client ID is not yet provided)
  const devSignIn = useCallback((customUser?: Partial<AuthUser>) => {
    authLog('Developer Test Sign-In triggered')
    const devUser: AuthUser = {
      id: 'google-dev-user-9182',
      email: customUser?.email || 'priyangshu.sharma@gmail.com',
      name: customUser?.name || 'Priyangshu Sharma',
      givenName: customUser?.givenName || 'Priyangshu',
      familyName: customUser?.familyName || 'Sharma',
      avatarUrl: customUser?.avatarUrl || undefined,
      lastLoginAt: new Date().toISOString(),
    }
    setUser(devUser)
    saveSession(devUser)
    setStatus('authenticated')
    setError(null)
    authLog('Developer session activated', devUser.email)
  }, [])

  const value = useMemo<AuthContextValue>(
    () => ({
      user,
      status,
      isAuthenticated: status === 'authenticated' && user !== null,
      isLoading: status === 'authenticating' || status === 'signing_out',
      error,
      isConfigured,
      signIn,
      signOut,
      clearError,
      devSignIn,
    }),
    [user, status, error, isConfigured, signIn, signOut, clearError, devSignIn]
  )

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>
}

export function useAuth(): AuthContextValue {
  const context = useContext(AuthContext)
  if (!context) {
    throw new Error('useAuth must be used within an AuthProvider')
  }
  return context
}
