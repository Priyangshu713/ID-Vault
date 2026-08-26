import { Lock, LogOut, ShieldAlert } from 'lucide-react'
import { BottomSheet } from './BottomSheet'

type SignOutSheetProps = {
  userEmail?: string
  onClose: () => void
  onConfirmSignOut: () => void
}

export function SignOutSheet({ userEmail, onClose, onConfirmSignOut }: SignOutSheetProps) {
  return (
    <BottomSheet title="Sign out of ID Vault?" onClose={onClose}>
      <div className="signout-sheet-content">
        <div className="signout-icon-wrap">
          <LogOut size={30} />
        </div>
        <p className="signout-message">
          You are currently signed in as <strong>{userEmail || 'your Google account'}</strong>.
        </p>
        <p className="signout-subtext">
          Your personal documents and preferences remain securely saved in your vault. You can sign back in at any time.
        </p>

        <div className="sheet-button-stack">
          <button
            type="button"
            className="primary-button primary-button--full signout-confirm-btn"
            onClick={onConfirmSignOut}
          >
            <LogOut size={16} />
            <span>Sign out</span>
          </button>
          <button type="button" className="secondary-button secondary-button--full" onClick={onClose}>
            Cancel
          </button>
        </div>

        <p className="privacy-footer-note" style={{ marginTop: 16 }}>
          <Lock size={12} />
          <span>Signing out closes this session on this device.</span>
        </p>
      </div>
    </BottomSheet>
  )
}
