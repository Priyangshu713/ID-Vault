/**
 * WebAuthn Biometric & Platform Authenticator Service for ID Vault.
 * Uses W3C Web Authentication standard with user-verifying platform authenticators
 * (Windows Hello, Touch ID, Face ID, Android Biometrics).
 */

const WEBAUTHN_STORAGE_KEY = 'id_vault_webauthn_credentials_v1'

export type StoredWebAuthnCredential = {
  id: string // base64url encoded credential ID
  rawId: string
  userEmail: string
  createdAt: string
  authenticatorAttachment?: string
  transports?: string[]
}

// Convert ArrayBuffer / Uint8Array to base64url string
function bufferToBase64Url(buffer: ArrayBuffer | Uint8Array): string {
  const bytes = buffer instanceof Uint8Array ? buffer : new Uint8Array(buffer)
  let binary = ''
  for (let i = 0; i < bytes.byteLength; i++) {
    binary += String.fromCharCode(bytes[i])
  }
  return btoa(binary)
    .replace(/\+/g, '-')
    .replace(/\//g, '_')
    .replace(/=+$/, '')
}

// Convert base64url string to ArrayBuffer
function base64UrlToBuffer(base64url: string): ArrayBuffer {
  const padding = '='.repeat((4 - (base64url.length % 4)) % 4)
  const base64 = (base64url + padding).replace(/-/g, '+').replace(/_/g, '/')
  const rawData = atob(base64)
  const buffer = new ArrayBuffer(rawData.length)
  const view = new Uint8Array(buffer)
  for (let i = 0; i < rawData.length; ++i) {
    view[i] = rawData.charCodeAt(i)
  }
  return buffer
}

/**
 * Checks if WebAuthn API is supported in current browser environment.
 */
export function isWebAuthnSupported(): boolean {
  return typeof window !== 'undefined' && Boolean(window.PublicKeyCredential)
}

/**
 * Checks if a user-verifying platform authenticator (Touch ID, Windows Hello, Face ID) is available.
 */
export async function isPlatformAuthenticatorAvailable(): Promise<boolean> {
  if (!isWebAuthnSupported()) return false
  try {
    return await PublicKeyCredential.isUserVerifyingPlatformAuthenticatorAvailable()
  } catch {
    return false
  }
}

/**
 * Retrieves registered WebAuthn credentials for a user from secure local storage.
 */
export function getRegisteredCredentials(userEmail?: string): StoredWebAuthnCredential[] {
  try {
    const raw = localStorage.getItem(WEBAUTHN_STORAGE_KEY)
    if (!raw) return []
    const all: StoredWebAuthnCredential[] = JSON.parse(raw)
    if (userEmail) {
      return all.filter((c) => c.userEmail.toLowerCase() === userEmail.toLowerCase())
    }
    return all
  } catch {
    return []
  }
}

/**
 * Persists a registered WebAuthn credential.
 */
function saveRegisteredCredential(cred: StoredWebAuthnCredential): void {
  try {
    const existing = getRegisteredCredentials()
    const updated = [cred, ...existing.filter((c) => c.id !== cred.id)]
    localStorage.setItem(WEBAUTHN_STORAGE_KEY, JSON.stringify(updated))
  } catch {
    // Ignore storage errors
  }
}

/**
 * Registers a new WebAuthn platform credential for the user (Windows Hello / Touch ID / Face ID).
 */
export async function registerPlatformPasskey(user: {
  id: string
  email: string
  name: string
}): Promise<{ success: boolean; credentialId?: string; error?: string }> {
  if (!isWebAuthnSupported()) {
    return { success: false, error: 'WebAuthn is not supported in this browser.' }
  }

  const isPlatformAvail = await isPlatformAuthenticatorAvailable()
  if (!isPlatformAvail) {
    return {
      success: false,
      error: "Your device or browser doesn't support biometric or platform authentication.",
    }
  }

  try {
    // Generate cryptographically random 32-byte registration challenge
    const challengeBytes = new Uint8Array(32)
    crypto.getRandomValues(challengeBytes)
    const challenge = challengeBytes.buffer as ArrayBuffer

    const userIdBytes = new TextEncoder().encode(user.id || user.email)
    const userIdBuffer = userIdBytes.buffer as ArrayBuffer

    const createOptions: PublicKeyCredentialCreationOptions = {
      challenge,
      rp: {
        name: 'ID Vault',
        id: window.location.hostname,
      },
      user: {
        id: userIdBuffer,
        name: user.email,
        displayName: user.name || user.email,
      },
      pubKeyCredParams: [
        { alg: -7, type: 'public-key' }, // ES256
        { alg: -257, type: 'public-key' }, // RS256
      ],
      authenticatorSelection: {
        authenticatorAttachment: 'platform',
        userVerification: 'required',
        residentKey: 'preferred',
      },
      timeout: 60000,
      attestation: 'none',
    }

    const credential = (await navigator.credentials.create({
      publicKey: createOptions,
    })) as PublicKeyCredential | null

    if (!credential) {
      return { success: false, error: 'Failed to create platform credential.' }
    }

    const credentialId = bufferToBase64Url(credential.rawId)
    const storedCred: StoredWebAuthnCredential = {
      id: credentialId,
      rawId: credentialId,
      userEmail: user.email,
      createdAt: new Date().toISOString(),
      authenticatorAttachment: 'platform',
    }

    saveRegisteredCredential(storedCred)

    return { success: true, credentialId }
  } catch (err: any) {
    if (err.name === 'NotAllowedError') {
      return { success: false, error: 'Setup was cancelled.' }
    }
    return { success: false, error: err.message || 'Could not complete biometric setup.' }
  }
}

/**
 * Authenticates the user with their registered platform authenticator (Touch ID, Windows Hello, Face ID).
 */
export async function authenticateWithWebAuthn(
  userEmail?: string
): Promise<{ success: boolean; error?: string }> {
  if (!isWebAuthnSupported()) {
    return { success: false, error: 'Device authentication is not supported in this browser.' }
  }

  const credentials = getRegisteredCredentials(userEmail)

  try {
    // Generate cryptographically random 32-byte authentication challenge
    const challengeBytes = new Uint8Array(32)
    crypto.getRandomValues(challengeBytes)
    const challenge = challengeBytes.buffer as ArrayBuffer

    const allowCredentials: PublicKeyCredentialDescriptor[] = credentials.map((c) => ({
      id: base64UrlToBuffer(c.id),
      type: 'public-key' as const,
      transports: ['internal' as AuthenticatorTransport],
    }))

    const getOptions: PublicKeyCredentialRequestOptions = {
      challenge,
      rpId: window.location.hostname,
      userVerification: 'required',
      timeout: 60000,
      ...(allowCredentials.length > 0 ? { allowCredentials } : {}),
    }

    const assertion = (await navigator.credentials.get({
      publicKey: getOptions,
    })) as PublicKeyCredential | null

    if (!assertion) {
      return { success: false, error: 'Authentication could not be completed.' }
    }

    // Verify response
    const authResponse = assertion.response as AuthenticatorAssertionResponse
    if (!authResponse.clientDataJSON || !authResponse.signature) {
      return { success: false, error: 'Invalid authentication response.' }
    }

    return { success: true }
  } catch (err: any) {
    if (err.name === 'NotAllowedError') {
      return { success: false, error: 'Unlock cancelled.' }
    }
    if (err.name === 'InvalidStateError') {
      return { success: false, error: 'This device is not registered for vault unlock.' }
    }
    return { success: false, error: err.message || 'Authentication failed.' }
  }
}
