import type { DriveFolder, VaultStorage, VaultStorageFolders } from '../data/types'
import { getGoogleClientId, isGoogleAuthConfigured, loadGsiScript } from './googleAuth'

const DRIVE_STORAGE_KEY = 'id_vault_drive_storage'
const DRIVE_FILE_SCOPE = 'https://www.googleapis.com/auth/drive.file'
const IS_DEV = import.meta.env.DEV

export const REQUIRED_VAULT_CATEGORIES = [
  { key: 'identity', name: 'Identity' },
  { key: 'education', name: 'Education' },
  { key: 'certificates', name: 'Certificates' },
  { key: 'transport', name: 'Transport' },
  { key: 'financial', name: 'Financial' },
  { key: 'other', name: 'Other' },
] as const

/**
 * Log message for Drive diagnostics in development mode only.
 * Strictly avoids logging OAuth tokens, authorization codes, or client secrets.
 */
export const driveLog = (message: string, detail?: string) => {
  if (IS_DEV) {
    if (detail) {
      console.log(`[Drive] ${message}:`, detail)
    } else {
      console.log(`[Drive] ${message}`)
    }
  }
}

/**
 * Retrieves persisted Drive storage state from local storage.
 */
export const getStoredDriveStorage = (): VaultStorage | null => {
  try {
    const raw = localStorage.getItem(DRIVE_STORAGE_KEY)
    if (!raw) return null
    const parsed = JSON.parse(raw) as VaultStorage
    if (parsed && parsed.status === 'connected' && parsed.rootFolder?.id) {
      driveLog('Restored Drive storage connection from session', parsed.accountEmail)
      return parsed
    }
    return null
  } catch {
    return null
  }
}

/**
 * Persists Drive storage state to local storage.
 */
export const saveDriveStorage = (storage: VaultStorage): void => {
  try {
    localStorage.setItem(DRIVE_STORAGE_KEY, JSON.stringify(storage))
    driveLog('Saved Drive storage state')
  } catch {
    driveLog('Failed to save Drive storage state')
  }
}

const DRIVE_TOKEN_KEY = 'id_vault_drive_token_v1'

type StoredDriveToken = {
  token: string
  expiresAt: number
}

export const getCachedDriveToken = (): string | null => {
  try {
    const raw = sessionStorage.getItem(DRIVE_TOKEN_KEY)
    if (!raw) return null
    const parsed = JSON.parse(raw) as StoredDriveToken
    if (parsed && parsed.token && Date.now() < parsed.expiresAt) {
      return parsed.token
    }
    return null
  } catch {
    return null
  }
}

export const saveCachedDriveToken = (token: string, expiresInSeconds = 3500): void => {
  try {
    const data: StoredDriveToken = {
      token,
      expiresAt: Date.now() + expiresInSeconds * 1000,
    }
    sessionStorage.setItem(DRIVE_TOKEN_KEY, JSON.stringify(data))
    driveLog('Cached active Drive OAuth token in session')
  } catch {
    // Ignore storage errors
  }
}

export const clearCachedDriveToken = (): void => {
  try {
    sessionStorage.removeItem(DRIVE_TOKEN_KEY)
  } catch {
    // Ignore
  }
}

/**
 * Clears stored Drive storage metadata upon disconnection.
 * Does NOT delete the user's files or folders in Google Drive.
 */
export const clearStoredDriveStorage = (): void => {
  try {
    localStorage.removeItem(DRIVE_STORAGE_KEY)
    clearCachedDriveToken()
    driveLog('Drive storage session cleared (Drive files remain untouched in user account)')
  } catch {
    // Ignore clear errors
  }
}

/**
 * Searches for a folder by name in Google Drive v3 REST API.
 */
export const searchDriveFolder = async (
  accessToken: string,
  name: string,
  parentId?: string
): Promise<DriveFolder | null> => {
  try {
    let query = `name = '${name.replace(/'/g, "\\'")}' and mimeType = 'application/vnd.google-apps.folder' and trashed = false`
    if (parentId) {
      query += ` and '${parentId}' in parents`
    }

    const url = `https://www.googleapis.com/drive/v3/files?q=${encodeURIComponent(
      query
    )}&fields=files(id,name,parents,createdTime,webViewLink)&pageSize=1`

    const response = await fetch(url, {
      headers: {
        Authorization: `Bearer ${accessToken}`,
      },
    })

    if (!response.ok) {
      driveLog('Search folder response not OK', `${response.status}`)
      return null
    }

    const data = await response.json()
    if (data.files && data.files.length > 0) {
      const file = data.files[0]
      return {
        id: file.id,
        name: file.name,
        parentId: file.parents?.[0],
        createdTime: file.createdTime,
        webViewLink: file.webViewLink,
      }
    }
    return null
  } catch (error: any) {
    driveLog('Error searching Drive folder', error.message)
    return null
  }
}

/**
 * Creates a new folder in Google Drive v3 REST API.
 */
export const createDriveFolder = async (
  accessToken: string,
  name: string,
  parentId?: string
): Promise<DriveFolder> => {
  const metadata: { name: string; mimeType: string; parents?: string[] } = {
    name,
    mimeType: 'application/vnd.google-apps.folder',
  }

  if (parentId) {
    metadata.parents = [parentId]
  }

  const response = await fetch('https://www.googleapis.com/drive/v3/files?fields=id,name,parents,createdTime,webViewLink', {
    method: 'POST',
    headers: {
      Authorization: `Bearer ${accessToken}`,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify(metadata),
  })

  if (!response.ok) {
    const errorText = await response.text()
    driveLog('Failed to create Drive folder', errorText)
    throw new Error(`Failed to create folder '${name}' in Google Drive`)
  }

  const file = await response.json()
  return {
    id: file.id,
    name: file.name,
    parentId: file.parents?.[0] || parentId,
    createdTime: file.createdTime,
    webViewLink: file.webViewLink,
  }
}

/**
 * Idempotently ensures the full ID Vault hierarchy exists in the user's My Drive.
 * Reuses existing folders and never creates duplicates.
 */
export const ensureVaultFolderStructure = async (
  accessToken: string,
  accountEmail?: string,
  onProgress?: (stage: string) => void
): Promise<VaultStorage> => {
  onProgress?.('Searching for ID Vault root folder...')
  driveLog('Searching for ID Vault')

  // 1. Locate or create root 'ID Vault' folder
  let rootFolder = await searchDriveFolder(accessToken, 'ID Vault')
  if (rootFolder) {
    driveLog('ID Vault found', rootFolder.id)
  } else {
    onProgress?.('Creating ID Vault root folder in your Drive...')
    driveLog('Creating ID Vault root folder')
    rootFolder = await createDriveFolder(accessToken, 'ID Vault')
    driveLog('ID Vault root created', rootFolder.id)
  }

  // 2. Locate or create all 6 category subfolders
  const folderMap: VaultStorageFolders = {}

  for (const category of REQUIRED_VAULT_CATEGORIES) {
    onProgress?.(`Checking ${category.name} folder...`)
    driveLog(`Checking ${category.name} folder`)

    let subFolder = await searchDriveFolder(accessToken, category.name, rootFolder.id)
    if (subFolder) {
      driveLog(`${category.name} folder found`, subFolder.id)
    } else {
      onProgress?.(`Creating ${category.name} folder...`)
      driveLog(`Creating ${category.name} folder`)
      subFolder = await createDriveFolder(accessToken, category.name, rootFolder.id)
      driveLog(`${category.name} folder created`, subFolder.id)
    }

    folderMap[category.key as keyof VaultStorageFolders] = subFolder
  }

  onProgress?.('Google Drive vault structure ready')
  driveLog('Vault structure ready')

  const vaultStorage: VaultStorage = {
    provider: 'google_drive',
    status: 'connected',
    accountEmail: accountEmail || 'Google Drive User',
    rootFolder,
    folders: folderMap,
    totalFoldersCount: 6,
    lastChecked: 'Just now',
  }

  saveDriveStorage(vaultStorage)
  return vaultStorage
}

/**
 * Initiates the Google Identity Services OAuth 2.0 Token Client for incremental 'drive.file' scope.
 */
export const requestDriveToken = async (userEmail?: string): Promise<string> => {
  const cached = getCachedDriveToken()
  if (cached) {
    driveLog('Using active cached Drive OAuth token from session')
    return cached
  }

  await loadGsiScript()

  const clientId = getGoogleClientId()
  if (!clientId || !isGoogleAuthConfigured()) {
    throw new Error('CONFIG_MISSING')
  }

  if (typeof window === 'undefined' || !(window as any).google?.accounts?.oauth2) {
    throw new Error('GIS_UNAVAILABLE')
  }

  driveLog('Authorization started for scope', DRIVE_FILE_SCOPE)

  return new Promise((resolve, reject) => {
    try {
      const tokenClient = (window as any).google.accounts.oauth2.initTokenClient({
        client_id: clientId,
        scope: DRIVE_FILE_SCOPE,
        hint: userEmail,
        prompt: '',
        callback: (tokenResponse: any) => {
          if (tokenResponse.error) {
            driveLog('OAuth authorization failed', tokenResponse.error)
            if (tokenResponse.error === 'access_denied') {
              reject(new Error('PERMISSION_DENIED'))
            } else if (tokenResponse.error === 'popup_closed_by_user') {
              reject(new Error('POPUP_CLOSED'))
            } else {
              reject(new Error(tokenResponse.error || 'OAUTH_ERROR'))
            }
            return
          }

          if (tokenResponse.access_token) {
            const expiresIn = tokenResponse.expires_in ? parseInt(tokenResponse.expires_in, 10) : 3500
            saveCachedDriveToken(tokenResponse.access_token, expiresIn)
            driveLog('Authorization successful')
            resolve(tokenResponse.access_token)
          } else {
            reject(new Error('NO_TOKEN_RECEIVED'))
          }
        },
      })

      tokenClient.requestAccessToken({ prompt: '' })
    } catch (err: any) {
      driveLog('Failed to initialize token client', err.message)
      reject(err)
    }
  })
}

/**
 * Local simulation for testing Drive folder hierarchy creation in developer mode.
 */
export const simulateDriveSetup = async (
  accountEmail: string,
  onProgress?: (stage: string) => void
): Promise<VaultStorage> => {
  driveLog('Authorization started (Dev Simulation Mode)')
  onProgress?.('Connecting Google Drive...')
  await new Promise((r) => setTimeout(r, 600))

  driveLog('Searching for ID Vault')
  onProgress?.('Searching for ID Vault in your Drive...')
  await new Promise((r) => setTimeout(r, 500))

  driveLog('ID Vault root folder verified')
  onProgress?.('Setting up your vault structure...')
  await new Promise((r) => setTimeout(r, 600))

  const rootFolder: DriveFolder = {
    id: `gdrive-root-${Date.now()}`,
    name: 'ID Vault',
    createdTime: new Date().toISOString(),
  }

  const folderMap: VaultStorageFolders = {}
  for (const category of REQUIRED_VAULT_CATEGORIES) {
    onProgress?.(`Verifying ${category.name} folder...`)
    driveLog(`Creating/verifying ${category.name} folder`)
    await new Promise((r) => setTimeout(r, 180))

    folderMap[category.key as keyof VaultStorageFolders] = {
      id: `gdrive-${category.key}-${Date.now()}`,
      name: category.name,
      parentId: rootFolder.id,
      createdTime: new Date().toISOString(),
    }
  }

  driveLog('Vault structure ready')
  onProgress?.('Google Drive vault ready')

  const vaultStorage: VaultStorage = {
    provider: 'google_drive',
    status: 'connected',
    accountEmail,
    rootFolder,
    folders: folderMap,
    totalFoldersCount: 6,
    lastChecked: 'Just now',
  }

  saveDriveStorage(vaultStorage)
  return vaultStorage
}
