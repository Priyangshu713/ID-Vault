import type { Profile, SettingsState } from './types'

export const mockProfile: Profile = {
  displayName: 'Priyangshu Sharma',
  identityName: 'Priyangshu Sharma',
  email: 'priyangshu.sharma@example.com',
}

export const initialSettings: SettingsState = {
  storageStatus: 'not_connected',
  storageAccount: 'priyangshu.sharma@gmail.com',
  storageDocumentCount: 13,
  storageLastSynced: 'Just now',
  digiLockerStatus: 'connected',
  digiLockerLastVerified: 'Today, 11:42 AM',
  vaultLocked: true,
  autoLockTimeout: '5m',
  sensitiveRevealTimeout: 30,
  totalStorageUsed: '19.8 MB',
}
