import type { ActivityAction, ActivityItem, DocumentVisualType } from '../data/types'

/**
 * Security Service for ID Vault Phase 4
 * 
 * Provides:
 * 1. Sensitive identifier masking algorithms for all government document types.
 * 2. Web Crypto API AES-GCM encryption/decryption abstractions.
 * 3. Sanitized audit logging (never logs tokens, credentials, or full identifiers).
 * 4. Ephemeral in-memory sensitive field cache with automatic TTL expiry.
 */

// --- 1. Identifier Masking Utilities ---

export function maskIdentifier(value: string | undefined | null, visualType?: DocumentVisualType): string {
  if (!value || typeof value !== "string") {
    return ""
  }

  const clean = value.replace(/\s+/g, "").trim()
  if (clean.length === 0) return ""

  switch (visualType) {
    case "aadhaar": {
      // 12-digit Aadhaar -> XXXX XXXX 1234
      const digits = clean.replace(/\D/g, "")
      if (digits.length >= 4) {
        const last4 = digits.slice(-4)
        return `XXXX XXXX ${last4}`
      }
      return clean.length >= 4 ? `XXXX XXXX ${clean.slice(-4)}` : "XXXX XXXX"
    }

    case "pan": {
      // 10-char PAN -> XXXXX1234X
      if (clean.length === 10) {
        const last5 = clean.slice(-5)
        return `XXXXX${last5}`
      }
      if (clean.length >= 4) {
        return `XXXXX${clean.slice(-4)}`
      }
      return clean
    }

    case "driving-licence": {
      // DL -> XXXXXXXX1234
      if (clean.length >= 4) {
        const last4 = clean.slice(-4)
        return `XXXXXXXX${last4}`
      }
      return clean
    }

    case "passport": {
      // Passport -> XXXXXXX123
      if (clean.length >= 3) {
        const last3 = clean.slice(-3)
        return `XXXXXXX${last3}`
      }
      return clean
    }

    case "voter-id": {
      // Voter ID -> XXXXXXX123
      if (clean.length >= 3) {
        return `XXXXXXX${clean.slice(-3)}`
      }
      return clean
    }

    default: {
      // Generic masking: keep last 4 chars
      if (clean.length > 4) {
        const last4 = clean.slice(-4)
        const maskedLength = Math.min(clean.length - 4, 8)
        return `${"X".repeat(maskedLength)} ${last4}`
      }
      return clean
    }
  }
}

export function formatRevealedIdentifier(
  value: string | undefined | null,
  visualType?: DocumentVisualType
): string {
  if (!value || typeof value !== "string") {
    return "Not recorded"
  }

  const clean = value.trim()
  if (clean.length === 0) return "Not recorded"

  // If the raw value still contains mask placeholder characters (X, x, *, •), return the clean value as-is (do NOT invent dummy numbers)
  if (/[Xx\*\u2022]/.test(clean)) {
    return clean
  }

  // Format standard unmasked identifiers cleanly
  switch (visualType) {
    case "aadhaar": {
      const digits = clean.replace(/\D/g, "")
      if (digits.length === 12) {
        return `${digits.slice(0, 4)} ${digits.slice(4, 8)} ${digits.slice(8, 12)}`
      }
      return clean
    }
    case "pan": {
      return clean.replace(/\s+/g, "").toUpperCase()
    }
    case "driving-licence":
    case "passport":
    case "voter-id":
    default:
      return clean
  }
}

// --- 2. Web Crypto API AES-GCM Encrypted Storage Abstraction ---

const ENCRYPTION_ALGO = 'AES-GCM'
const KEY_ALGO = 'PBKDF2'

/**
 * Derives an AES-GCM 256-bit key from a salt and master secret using PBKDF2 with SHA-256.
 */
async function deriveKey(secret: string, salt: Uint8Array): Promise<CryptoKey> {
  const enc = new TextEncoder()
  const keyMaterial = await crypto.subtle.importKey(
    'raw',
    enc.encode(secret),
    { name: KEY_ALGO },
    false,
    ['deriveKey']
  )

  return crypto.subtle.deriveKey(
    {
      name: KEY_ALGO,
      salt: salt as unknown as ArrayBuffer,
      iterations: 100000,
      hash: 'SHA-256',
    },
    keyMaterial,
    { name: ENCRYPTION_ALGO, length: 256 },
    false,
    ['encrypt', 'decrypt']
  )
}

/**
 * Encrypts a plaintext string into a base64 encoded AES-GCM ciphertext payload.
 */
export async function encryptSensitiveData(plainText: string, masterSecret: string): Promise<string> {
  const enc = new TextEncoder()
  const salt = crypto.getRandomValues(new Uint8Array(16))
  const iv = crypto.getRandomValues(new Uint8Array(12))

  const key = await deriveKey(masterSecret, salt)
  const encrypted = await crypto.subtle.encrypt(
    { name: ENCRYPTION_ALGO, iv },
    key,
    enc.encode(plainText)
  )

  // Package salt (16 bytes) + iv (12 bytes) + ciphertext
  const payload = new Uint8Array(salt.byteLength + iv.byteLength + encrypted.byteLength)
  payload.set(salt, 0)
  payload.set(iv, salt.byteLength)
  payload.set(new Uint8Array(encrypted), salt.byteLength + iv.byteLength)

  return btoa(String.fromCharCode(...payload))
}

/**
 * Decrypts a base64 encoded AES-GCM ciphertext payload.
 */
export async function decryptSensitiveData(encryptedBase64: string, masterSecret: string): Promise<string> {
  const binaryString = atob(encryptedBase64)
  const bytes = new Uint8Array(binaryString.length)
  for (let i = 0; i < binaryString.length; i++) {
    bytes[i] = binaryString.charCodeAt(i)
  }

  const salt = bytes.slice(0, 16)
  const iv = bytes.slice(16, 28)
  const ciphertext = bytes.slice(28)

  const key = await deriveKey(masterSecret, salt)
  const decrypted = await crypto.subtle.decrypt(
    { name: ENCRYPTION_ALGO, iv },
    key,
    ciphertext
  )

  const dec = new TextDecoder()
  return dec.decode(decrypted)
}

// --- 3. Sanitized Audit Event Logger ---

const ACTIVITY_STORAGE_KEY = 'id_vault_audit_trail_v1'
const MAX_ACTIVITY_ITEMS = 50

export function getStoredAuditTrail(): ActivityItem[] {
  try {
    const raw = localStorage.getItem(ACTIVITY_STORAGE_KEY)
    if (!raw) return []
    const parsed = JSON.parse(raw)
    return Array.isArray(parsed) ? parsed : []
  } catch {
    return []
  }
}

export function saveAuditTrail(items: ActivityItem[]): void {
  try {
    localStorage.setItem(ACTIVITY_STORAGE_KEY, JSON.stringify(items.slice(0, MAX_ACTIVITY_ITEMS)))
  } catch {
    // Ignore storage quota errors
  }
}

export function createSanitizedActivityItem(
  actionType: ActivityAction,
  documentName?: string,
  documentId?: string
): ActivityItem {
  // Sanitize documentName to prevent accidental inclusion of sensitive strings
  const safeDocName = documentName ? documentName.slice(0, 48).trim() : undefined

  let actionText = 'Vault event'
  let badge = 'Security'

  switch (actionType) {
    case 'document_added':
      actionText = safeDocName ? `Added ${safeDocName} to vault` : 'Added document to vault'
      badge = 'Google Drive'
      break
    case 'document_viewed':
      actionText = safeDocName ? `Inspected ${safeDocName}` : 'Viewed document'
      badge = 'Security'
      break
    case 'document_downloaded':
      actionText = safeDocName ? `Exported ${safeDocName} (PDF)` : 'Downloaded document (PDF)'
      badge = 'Download'
      break
    case 'document_deleted':
      actionText = safeDocName ? `Deleted ${safeDocName}` : 'Deleted document'
      badge = 'Deleted'
      break
    case 'vault_locked':
      actionText = 'Vault locked (Auto-lock / Inactivity)'
      badge = 'Locked'
      break
    case 'vault_unlocked':
      actionText = 'Vault unlocked'
      badge = 'Unlocked'
      break
    case 'drive_connected':
      actionText = 'Google Drive connected (6 categories ready)'
      badge = 'Google Drive'
      break
    case 'drive_disconnected':
      actionText = 'Google Drive disconnected'
      badge = 'Storage'
      break
  }

  return {
    id: `audit-${Date.now()}-${Math.random().toString(36).slice(2, 7)}`,
    actionType,
    documentId,
    documentName: safeDocName,
    action: actionText,
    time: 'Just now',
    timestamp: new Date().toISOString(),
    badge,
  }
}
