import { useEffect, useMemo, useState } from 'react'
import { CheckCircle2 } from 'lucide-react'
import { useAuth } from './context/AuthContext'
import { useDrive } from './context/DriveContext'
import { useVault } from './context/VaultContext'
import { useVaultDocuments } from './context/DocumentContext'
import { AppShell } from './components/AppShell'
import { BottomSheet } from './components/BottomSheet'
import type { AppPage } from './components/BottomNavigation'
import { SearchView } from './components/SearchView'
import { AddDocumentWizard } from './components/AddDocumentWizard'
import { ProfileSettingsSheet } from './components/ProfileSettingsSheet'
import { SignOutSheet } from './components/SignOutSheet'
import { ConnectDriveSheet } from './components/ConnectDriveSheet'
import { DisconnectDriveSheet } from './components/DisconnectDriveSheet'
import { ManageDriveSheet } from './components/ManageDriveSheet'
import { VaultLockScreen } from './components/VaultLockScreen'
import { FilterControls } from './components/FilterControls'
import { AuthPage } from './pages/AuthPage'
import { mockProfile as initialMockProfile, initialSettings } from './data/mockProfile'
import { Home } from './pages/Home'
import { Documents } from './pages/Documents'
import { CollectionsPage } from './pages/CollectionsPage'
import { Activity } from './pages/Activity'
import { DocumentDetail } from './pages/DocumentDetail'
import type { Collection, DocumentFilters, Profile, SettingsState, VaultDocument } from './data/types'

type Sheet =
  | 'add'
  | 'profile'
  | 'filters'
  | 'collection'
  | 'signout'
  | 'connect_drive'
  | 'disconnect_drive'
  | 'manage_drive'
  | null

type Toast = {
  id: string
  message: string
  type?: 'info' | 'success' | 'warning'
}

function parseLocation(): { page: AppPage; documentId?: string } {
  const segments = window.location.pathname.split('/').filter(Boolean)
  if (segments[0] === 'documents' && segments[1]) return { page: 'documents', documentId: segments[1] }
  if (segments[0] === 'documents') return { page: 'documents' }
  if (segments[0] === 'collections') return { page: 'collections' }
  if (segments[0] === 'activity') return { page: 'activity' }
  return { page: 'home' }
}

export default function App() {
  const { user, isAuthenticated, signOut } = useAuth()
  const { isVaultLocked, recordActivity } = useVault()
  const { driveStorage, connectionState, connectDrive, disconnectDrive, refreshDrive } = useDrive()
  const { documents, deleteDocument, downloadDocument, toggleFavorite, isLoading: isDocsLoading } = useVaultDocuments()
  const initial = useMemo(parseLocation, [])

  // Reactive State
  const [profile, setProfile] = useState<Profile>(initialMockProfile)
  const [settings, setSettings] = useState<SettingsState>(initialSettings)

  const [page, setPage] = useState<AppPage>(initial.page)
  const [selectedDocId, setSelectedDocId] = useState<string | null>(initial.documentId || null)
  const [sheet, setSheet] = useState<Sheet>(null)
  const [selectedCollection, setSelectedCollection] = useState<Collection | null>(null)
  const [searchOpen, setSearchOpen] = useState(false)
  const [toast, setToast] = useState<Toast | null>(null)

  const [filters, setFilters] = useState<DocumentFilters>({
    category: 'all',
    trustStatus: 'all',
    expiry: 'all',
    format: 'all',
  })

  // Synchronize driveStorage state into settings.storageStatus
  useEffect(() => {
    if (connectionState === 'connected' && driveStorage) {
      setSettings((prev) => ({
        ...prev,
        storageStatus: 'connected',
        storageAccount: driveStorage.accountEmail || user?.email || 'Google Drive',
        storageLastSynced: driveStorage.lastChecked || 'Just now',
        driveStorage,
      }))
    } else if (connectionState === 'not_connected') {
      setSettings((prev) => ({
        ...prev,
        storageStatus: 'not_connected',
        driveStorage: undefined,
      }))
    }
  }, [connectionState, driveStorage, user])

  // Selected document derived from real documents array
  const selectedDocument = useMemo(() => {
    if (!selectedDocId) return null
    return documents.find((doc) => doc.id === selectedDocId) || null
  }, [documents, selectedDocId])

  // Route Synchronization & Protection
  useEffect(() => {
    if (!isAuthenticated) {
      if (window.location.pathname !== '/auth') {
        window.history.replaceState({}, '', '/auth')
      }
    } else {
      if (window.location.pathname === '/auth') {
        window.history.replaceState({}, '', '/')
        setPage('home')
      }
    }
  }, [isAuthenticated])

  // Browser History Sync
  useEffect(() => {
    const onPopState = () => {
      const location = parseLocation()
      setPage(location.page)
      setSelectedDocId(location.documentId || null)
      setSearchOpen(false)
      setSheet(null)
    }
    window.addEventListener('popstate', onPopState)
    return () => window.removeEventListener('popstate', onPopState)
  }, [])

  // Toast Auto-Dismiss
  useEffect(() => {
    if (!toast) return
    const timer = window.setTimeout(() => setToast(null), 3400)
    return () => window.clearTimeout(timer)
  }, [toast])

  const showToast = (message: string, type: 'info' | 'success' | 'warning' = 'success') => {
    setToast({ id: `${Date.now()}`, message, type })
  }

  const navigate = (nextPage: AppPage) => {
    const url = nextPage === 'home' ? '/' : `/${nextPage}`
    window.history.pushState({}, '', url)
    setPage(nextPage)
    setSelectedDocId(null)
  }

  const openDocument = (doc: VaultDocument) => {
    window.history.pushState({}, '', `/documents/${doc.id}`)
    setPage('documents')
    setSelectedDocId(doc.id)
  }

  const goBackFromDetail = () => {
    window.history.pushState({}, '', '/documents')
    setPage('documents')
    setSelectedDocId(null)
  }

  const openCollection = (col: Collection) => {
    setSelectedCollection(col)
    setFilters((f) => ({ ...f, category: col.category }))
    navigate('documents')
  }

  // Toggle Favourite
  const handleToggleFavourite = async (doc: VaultDocument) => {
    await toggleFavorite(doc)
    showToast(
      !doc.favourite ? `Added ${doc.name} to Quick Access.` : `Removed ${doc.name} from Quick Access.`,
      'info'
    )
  }

  // Add Document via Wizard
  const handleAddDocument = (newDoc: VaultDocument) => {
    recordActivity('document_added', newDoc.name, newDoc.id)
    showToast(`Added & saved ${newDoc.name} to your vault.`, 'success')
  }

  // Delete Document
  const handleDeleteDocument = async (doc: VaultDocument) => {
    await deleteDocument(doc.id)
    goBackFromDetail()
    recordActivity('document_deleted', doc.name, doc.id)
    showToast(`Removed ${doc.name} from your vault.`, 'info')
  }

  // Download PDF
  const handleDownloadPDF = async (doc: VaultDocument) => {
    showToast(`Downloading canonical PDF: ${doc.derivedFileName}`, 'success')
    try {
      await downloadDocument(doc)
    } catch {
      showToast('Failed to download PDF.', 'warning')
    }
  }

  // Share simulation
  const handleShare = (doc: VaultDocument) => {
    if (navigator.share) {
      navigator
        .share({
          title: doc.name,
          text: `ID Vault Document: ${doc.derivedFileName}`,
          url: window.location.href,
        })
        .catch(() => undefined)
    } else {
      showToast(`Generated secure share link for ${doc.name}.`, 'info')
    }
  }

  // Update Settings
  const handleUpdateSettings = (newSettings: Partial<SettingsState>) => {
    setSettings((prev) => ({ ...prev, ...newSettings }))
  }

  // Google Drive Connect Confirmation Flow
  const handleConfirmConnectDrive = async () => {
    setSheet(null)
    try {
      await connectDrive()
      recordActivity('drive_connected')
      showToast('Google Drive connected · 6 vault folders ready.', 'success')
    } catch {
      showToast("Couldn't connect to Google Drive. Please try again.", 'warning')
    }
  }

  // Google Drive Disconnect Flow
  const handleConfirmDisconnectDrive = () => {
    setSheet(null)
    disconnectDrive()
    recordActivity('drive_disconnected')
    showToast('Google Drive storage disconnected.', 'info')
  }

  // Reset Vault
  const handleResetVault = () => {
    setProfile(initialMockProfile)
    setSettings(initialSettings)
    setFilters({ category: 'all', trustStatus: 'all', expiry: 'all', format: 'all' })
    setSheet(null)
    showToast('Settings reset to default.', 'info')
  }

  // Sign out confirmation handler
  const handleSignOutConfirm = async () => {
    setSheet(null)
    disconnectDrive()
    await signOut()
    showToast('Signed out of ID Vault.', 'info')
  }

  // 1. Unauthenticated Route Protection -> Show AuthPage
  if (!isAuthenticated) {
    return (
      <>
        <AuthPage />
        {toast && (
          <div className={`toast toast--${toast.type || 'info'}`} role="status">
            <CheckCircle2 size={16} />
            <span>{toast.message}</span>
          </div>
        )}
      </>
    )
  }

  // 2. Authenticated Document Detail View
  if (selectedDocument) {
    return (
      <>
        <DocumentDetail
          document={selectedDocument}
          onBack={goBackFromDetail}
          onToggleFavourite={handleToggleFavourite}
          onDownload={handleDownloadPDF}
          onShare={handleShare}
          onDelete={handleDeleteDocument}
          onActionToast={(msg) => showToast(msg, 'info')}
        />
        {isVaultLocked && <VaultLockScreen />}
        {toast && (
          <div className={`toast toast--${toast.type || 'info'}`} role="status">
            <CheckCircle2 size={16} />
            <span>{toast.message}</span>
          </div>
        )}
      </>
    )
  }

  // 3. Main Authenticated App Shell
  return (
    <>
      <AppShell
        page={page}
        user={user}
        onNavigate={navigate}
        onSearch={() => setSearchOpen(true)}
        onProfile={() => setSheet('profile')}
        onAdd={() => setSheet('add')}
      >
        {page === 'home' && (
          <Home
            user={user}
            documents={documents}
            isLoading={isDocsLoading}
            settings={settings}
            onOpen={openDocument}
            onToggleFavourite={handleToggleFavourite}
            onNavigate={navigate}
            onCollection={openCollection}
            onOpenSettings={() => setSheet('profile')}
            onAddDocument={() => setSheet('add')}
          />
        )}
        {page === 'documents' && (
          <Documents
            documents={documents}
            filters={filters}
            onFiltersChange={setFilters}
            onOpenFilters={() => setSheet('filters')}
            onOpen={openDocument}
            onToggleFavourite={handleToggleFavourite}
            onAdd={() => setSheet('add')}
          />
        )}
        {page === 'collections' && (
          <CollectionsPage
            documents={documents}
            onOpen={openDocument}
            onCollection={openCollection}
            onAdd={() => setSheet('add')}
          />
        )}
        {page === 'activity' && (
          <Activity
            documents={documents}
            onOpen={openDocument}
          />
        )}
      </AppShell>

      {/* Vault Lock Screen when Vault is Locked */}
      {isVaultLocked && <VaultLockScreen />}

      {/* Global Search Modal */}
      {searchOpen && (
        <SearchView
          documents={documents}
          onClose={() => setSearchOpen(false)}
          onOpen={openDocument}
        />
      )}

      {/* Real Add Document Ingestion Wizard */}
      {sheet === 'add' && (
        <AddDocumentWizard
          onClose={() => setSheet(null)}
          onAddDocument={handleAddDocument}
        />
      )}

      {/* Profile & Settings Bottom Sheet */}
      {sheet === 'profile' && (
        <ProfileSettingsSheet
          user={user}
          profile={profile}
          settings={settings}
          documents={documents}
          onClose={() => setSheet(null)}
          onUpdateSettings={handleUpdateSettings}
          onResetVault={handleResetVault}
          onSignOut={() => setSheet('signout')}
          onOpenConnectDrive={() => setSheet('connect_drive')}
          onOpenDisconnectDrive={() => setSheet('disconnect_drive')}
          onOpenManageDrive={() => setSheet('manage_drive')}
        />
      )}

      {/* Connect Google Drive Confirmation Sheet */}
      {sheet === 'connect_drive' && (
        <ConnectDriveSheet
          onClose={() => setSheet(null)}
          onConfirm={handleConfirmConnectDrive}
        />
      )}

      {/* Disconnect Google Drive Confirmation Sheet */}
      {sheet === 'disconnect_drive' && (
        <DisconnectDriveSheet
          accountEmail={driveStorage?.accountEmail || user?.email}
          onClose={() => setSheet(null)}
          onConfirmDisconnect={handleConfirmDisconnectDrive}
        />
      )}

      {/* Manage Google Drive Vault Structure Sheet */}
      {sheet === 'manage_drive' && driveStorage && (
        <ManageDriveSheet
          storage={driveStorage}
          onClose={() => setSheet(null)}
          onRefresh={async () => {
            await refreshDrive()
            showToast('Google Drive vault structure verified.', 'info')
          }}
          onOpenDisconnect={() => setSheet('disconnect_drive')}
        />
      )}

      {/* Sign Out Confirmation Sheet */}
      {sheet === 'signout' && (
        <SignOutSheet
          userEmail={user?.email}
          onClose={() => setSheet(null)}
          onConfirmSignOut={handleSignOutConfirm}
        />
      )}

      {/* Filter Bottom Sheet */}
      {sheet === 'filters' && (
        <BottomSheet title="Filter & Sort Documents" onClose={() => setSheet(null)}>
          <FilterControls
            filters={filters}
            onApply={(newFilters) => {
              setFilters(newFilters)
              setSheet(null)
            }}
          />
        </BottomSheet>
      )}

      {/* Toast Notification */}
      {toast && (
        <div className={`toast toast--${toast.type || 'info'}`} role="status">
          <CheckCircle2 size={16} />
          <span>{toast.message}</span>
        </div>
      )}
    </>
  )
}
