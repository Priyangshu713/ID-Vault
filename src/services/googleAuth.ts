import type { AuthUser, GoogleJwtPayload } from '../data/authTypes'

const SESSION_STORAGE_KEY = 'id_vault_auth_session'
const IS_DEV = import.meta.env.DEV

/**
 * Log message for authentication diagnostics in development mode only.
 * Strictly avoids logging tokens, secrets, or sensitive document data.
 */
export const authLog = (message: string, detail?: string) => {
  if (IS_DEV) {
    if (detail) {
      console.log(`[Auth] ${message}:`, detail)
    } else {
      console.log(`[Auth] ${message}`)
    }
  }
}

/**
 * Returns the Google Client ID configured in the environment.
 */
export const getGoogleClientId = (): string => {
  return (import.meta.env.VITE_GOOGLE_CLIENT_ID || '').trim()
}

/**
 * Checks whether a valid Google Client ID is configured.
 */
export const isGoogleAuthConfigured = (): boolean => {
  const clientId = getGoogleClientId()
  return Boolean(clientId && clientId !== 'your-client-id-here.apps.googleusercontent.com' && clientId.length > 5)
}

/**
 * Safely decodes a Google ID Token (JWT) on the client without third-party dependencies.
 */
export const parseGoogleCredential = (credential: string): GoogleJwtPayload | null => {
  try {
    const parts = credential.split('.')
    if (parts.length !== 3) {
      throw new Error('Invalid JWT format')
    }
    const payloadBase64 = parts[1].replace(/-/g, '+').replace(/_/g, '/')
    const decodedJson = decodeURIComponent(
      atob(payloadBase64)
        .split('')
        .map((c) => '%' + ('00' + c.charCodeAt(0).toString(16)).slice(-2))
        .join('')
    )
    return JSON.parse(decodedJson) as GoogleJwtPayload
  } catch (error) {
    authLog('Error decoding Google ID token payload')
    return null
  }
}

/**
 * Converts a decoded Google JWT payload to the internal AuthUser model.
 */
export const createAuthUserFromPayload = (payload: GoogleJwtPayload): AuthUser => {
  return {
    id: payload.sub,
    email: payload.email,
    name: payload.name || payload.email.split('@')[0],
    givenName: payload.given_name || (payload.name ? payload.name.split(' ')[0] : payload.email.split('@')[0]),
    familyName: payload.family_name,
    avatarUrl: payload.picture,
    lastLoginAt: new Date().toISOString(),
  }
}

/**
 * Retrieves the saved authenticated session from safe client storage.
 */
export const getStoredSession = (): AuthUser | null => {
  try {
    const raw = localStorage.getItem(SESSION_STORAGE_KEY)
    if (!raw) return null
    const parsed = JSON.parse(raw) as AuthUser
    if (parsed && parsed.id && parsed.email) {
      authLog('Session restored from storage', parsed.email)
      return parsed
    }
    return null
  } catch {
    return null
  }
}

/**
 * Persists the authenticated user session to storage.
 */
export const saveSession = (user: AuthUser): void => {
  try {
    localStorage.setItem(SESSION_STORAGE_KEY, JSON.stringify(user))
    authLog('Session saved for user', user.email)
  } catch (e) {
    authLog('Failed to persist session to storage')
  }
}

/**
 * Clears the authenticated session from storage upon sign-out.
 */
export const clearStoredSession = (): void => {
  try {
    localStorage.removeItem(SESSION_STORAGE_KEY)
    authLog('Session storage cleared')
  } catch {
    // Ignore storage clear errors
  }
}

/**
 * Ensures the Google Identity Services script is loaded.
 */
export const loadGsiScript = (): Promise<void> => {
  return new Promise((resolve, reject) => {
    if (typeof window !== 'undefined' && (window as any).google?.accounts?.id) {
      resolve()
      return
    }

    const existingScript = document.querySelector('script[src="https://accounts.google.com/gsi/client"]')
    if (existingScript) {
      existingScript.addEventListener('load', () => resolve())
      existingScript.addEventListener('error', () => reject(new Error('Failed to load Google script')))
      return
    }

    const script = document.createElement('script')
    script.src = 'https://accounts.google.com/gsi/client'
    script.async = true
    script.defer = true
    script.onload = () => resolve()
    script.onerror = () => reject(new Error('Failed to load Google Identity Services'))
    document.head.appendChild(script)
  })
}
