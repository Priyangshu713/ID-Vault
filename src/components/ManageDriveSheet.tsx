import { Check, Cloud, ExternalLink, Folder, FolderCheck, FolderSync, RefreshCw } from 'lucide-react'
import { BottomSheet } from './BottomSheet'
import type { VaultStorage } from '../data/types'
import { REQUIRED_VAULT_CATEGORIES } from '../services/googleDrive'

type ManageDriveSheetProps = {
  storage: VaultStorage
  onClose: () => void
  onRefresh: () => void
  onOpenDisconnect: () => void
}

export function ManageDriveSheet({
  storage,
  onClose,
  onRefresh,
  onOpenDisconnect,
}: ManageDriveSheetProps) {
  return (
    <BottomSheet title="Google Drive Storage" onClose={onClose}>
      <div className="manage-drive-content">
        {/* Drive Account Overview Card */}
        <div className="drive-overview-card glass-surface">
          <div className="drive-overview-header">
            <span className="drive-cloud-icon">
              <Cloud size={20} />
            </span>
            <div className="drive-overview-info">
              <strong>{storage.accountEmail}</strong>
              <small>Scope: drive.file · Encrypted storage destination</small>
            </div>
            <span className="status-pill status-pill--connected">Connected</span>
          </div>

          <div className="drive-root-folder-row">
            <FolderCheck size={16} className="text-success" />
            <span>Root Folder: <strong>ID Vault</strong></span>
          </div>
        </div>

        {/* Folder Hierarchy Tree */}
        <div className="drive-tree-section">
          <div className="drive-tree-header">
            <h4>Vault Folder Structure</h4>
            <span className="folder-count-badge">6 folders ready</span>
          </div>

          <div className="drive-folder-tree glass-surface">
            <div className="tree-root-item">
              <span className="tree-branch" />
              <Folder size={17} className="tree-folder-icon tree-folder-icon--root" />
              <span className="tree-name">ID Vault/</span>
            </div>

            <div className="tree-children-list">
              {REQUIRED_VAULT_CATEGORIES.map(({ key, name }) => {
                const subFolder = storage.folders?.[key as keyof typeof storage.folders]
                return (
                  <div key={key} className="tree-child-item">
                    <span className="tree-connector" />
                    <Folder size={15} className={`tree-folder-icon tree-folder-icon--${key}`} />
                    <span className="tree-child-name">{name}</span>
                    <span className="tree-status-check">
                      <Check size={12} />
                      <span>Ready</span>
                    </span>
                  </div>
                )
              })}
            </div>
          </div>
        </div>

        {/* Sync Info & Actions */}
        <div className="drive-manage-footer">
          <small className="drive-last-checked">Last checked: {storage.lastChecked || 'Just now'}</small>

          <div className="drive-manage-buttons">
            <button type="button" className="secondary-button" onClick={onRefresh}>
              <RefreshCw size={14} />
              <span>Check Structure</span>
            </button>
            <button
              type="button"
              className="text-button text-button--danger"
              onClick={() => {
                onClose()
                onOpenDisconnect()
              }}
            >
              Disconnect Drive
            </button>
          </div>
        </div>
      </div>
    </BottomSheet>
  )
}
