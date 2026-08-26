import { ArrowRight, Cloud, FolderCheck, Lock, ShieldCheck } from 'lucide-react'
import { BottomSheet } from './BottomSheet'

type ConnectDriveSheetProps = {
  onClose: () => void
  onConfirm: () => void
}

export function ConnectDriveSheet({ onClose, onConfirm }: ConnectDriveSheetProps) {
  return (
    <BottomSheet title="Connect Google Drive" onClose={onClose}>
      <div className="drive-modal-content">
        <div className="drive-hero-icon">
          <Cloud size={32} />
        </div>

        <div className="drive-modal-text">
          <p className="drive-lead-notice">
            ID Vault will create a dedicated <strong>ID Vault</strong> folder inside your personal Google Drive for your documents.
          </p>
          <p className="drive-sub-notice">
            Your existing Google Drive files and folders will <strong>not</strong> be scanned or imported.
          </p>
        </div>

        <div className="drive-permission-callout glass-surface">
          <div className="perm-row">
            <ShieldCheck size={16} className="text-success" />
            <div>
              <strong>Minimum Drive Scope</strong>
              <small>Limited only to files created by ID Vault (drive.file)</small>
            </div>
          </div>
          <div className="perm-row">
            <FolderCheck size={16} className="text-success" />
            <div>
              <strong>6 Category Vault Hierarchy</strong>
              <small>Identity, Education, Certificates, Transport, Financial, Other</small>
            </div>
          </div>
        </div>

        <div className="sheet-button-stack">
          <button
            type="button"
            className="primary-button primary-button--full"
            onClick={onConfirm}
          >
            <span>Continue to Authorization</span>
            <ArrowRight size={16} />
          </button>
          <button
            type="button"
            className="secondary-button secondary-button--full"
            onClick={onClose}
          >
            Cancel
          </button>
        </div>

        <p className="privacy-footer-note" style={{ marginTop: 14 }}>
          <Lock size={12} />
          <span>Files remain in your own Google Drive and are never sent to external servers.</span>
        </p>
      </div>
    </BottomSheet>
  )
}
