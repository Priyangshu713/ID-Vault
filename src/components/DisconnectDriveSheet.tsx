import { CloudOff, Lock, LogOut } from 'lucide-react'
import { BottomSheet } from './BottomSheet'

type DisconnectDriveSheetProps = {
  accountEmail?: string
  onClose: () => void
  onConfirmDisconnect: () => void
}

export function DisconnectDriveSheet({
  accountEmail,
  onClose,
  onConfirmDisconnect,
}: DisconnectDriveSheetProps) {
  return (
    <BottomSheet title="Disconnect Google Drive?" onClose={onClose}>
      <div className="drive-modal-content">
        <div className="drive-disconnect-icon">
          <CloudOff size={30} />
        </div>

        <div className="drive-modal-text">
          <p className="drive-lead-notice">
            ID Vault will stop using your Google Drive connection ({accountEmail || 'your account'}).
          </p>
          <p className="drive-sub-notice">
            <strong>Your files and folders will remain safely in your Google Drive.</strong> Disconnecting will not delete any of your data.
          </p>
        </div>

        <div className="sheet-button-stack">
          <button
            type="button"
            className="primary-button primary-button--full drive-disconnect-btn"
            onClick={onConfirmDisconnect}
          >
            <CloudOff size={16} />
            <span>Disconnect</span>
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
          <span>You can reconnect your Google Drive at any time. Existing folders will be reused.</span>
        </p>
      </div>
    </BottomSheet>
  )
}
