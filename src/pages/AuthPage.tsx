import { useEffect, useRef, useState } from 'react'
import { AlertCircle, ArrowRight, Code, KeyRound, Lock, ShieldCheck, Sparkles, UserCheck } from 'lucide-react'
import { useAuth } from '../context/AuthContext'
import { getGoogleClientId, isGoogleAuthConfigured } from '../services/googleAuth'

export function AuthPage() {
  const { signIn, status, error, clearError, devSignIn, isConfigured } = useAuth()
  const googleBtnContainerRef = useRef<HTMLDivElement>(null)
  const [showDevModal, setShowDevModal] = useState(false)
  const [devEmail, setDevEmail] = useState('priyangshu.sharma@gmail.com')
  const [devName, setDevName] = useState('Priyangshu Sharma')

  const isAuthenticating = status === 'authenticating'

  // Render official Google button if GIS client is loaded and configured
  useEffect(() => {
    if (
      typeof window !== 'undefined' &&
      (window as any).google?.accounts?.id &&
      googleBtnContainerRef.current &&
      isGoogleAuthConfigured()
    ) {
      try {
        ;(window as any).google.accounts.id.renderButton(googleBtnContainerRef.current, {
          type: 'standard',
          theme: 'outline',
          size: 'large',
          text: 'continue_with',
          shape: 'pill',
          logo_alignment: 'left',
          width: 320,
        })
      } catch {
        // Ignore render error if custom button is used
      }
    }
  }, [isConfigured])

  const handleCustomGoogleClick = () => {
    clearError()
    if (isGoogleAuthConfigured()) {
      signIn()
    } else {
      setShowDevModal(true)
    }
  }

  const handleDevSubmit = (e: React.FormEvent) => {
    e.preventDefault()
    devSignIn({
      email: devEmail,
      name: devName,
      givenName: devName.split(' ')[0],
    })
  }

  return (
    <main className="auth-page app-background">
      <div className="auth-card-container">
        {/* ID Vault Brand Header */}
        <div className="auth-brand-badge">
          <span className="brand-mark">
            <ShieldCheck size={18} strokeWidth={2.2} />
          </span>
          <span className="brand-name">ID Vault</span>
        </div>

        {/* Main Hero Copy */}
        <div className="auth-hero-copy">
          <h1 className="auth-title">
            Your documents,<br />
            private and close at hand.
          </h1>
          <p className="auth-subtitle">
            Sign in to create your personal government identity vault.
          </p>
        </div>

        {/* Error Alert Banner */}
        {error && (
          <div className="auth-error-banner glass-surface" role="alert">
            <AlertCircle size={17} className="error-icon" />
            <div className="error-text">
              <strong>Authentication issue</strong>
              <p>{error.message}</p>
            </div>
            <button className="error-dismiss-btn" onClick={clearError} aria-label="Dismiss error">
              ✕
            </button>
          </div>
        )}

        {/* Primary Authentication Action */}
        <div className="auth-actions-card glass-surface">
          {/* Official Google G-Button Container (hidden/fallback for GIS) */}
          <div ref={googleBtnContainerRef} className="google-gis-rendered-btn" />

          {/* Premium Custom Google Button */}
          <button
            type="button"
            className="google-signin-button"
            onClick={handleCustomGoogleClick}
            disabled={isAuthenticating}
            aria-label="Continue with Google"
          >
            {isAuthenticating ? (
              <div className="auth-loading-spinner">
                <span className="spinner-dot" />
                <span className="spinner-dot" />
                <span className="spinner-dot" />
              </div>
            ) : (
              <svg className="google-g-logo" viewBox="0 0 24 24" width="20" height="20">
                <path
                  fill="#4285F4"
                  d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z"
                />
                <path
                  fill="#34A853"
                  d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z"
                />
                <path
                  fill="#FBBC05"
                  d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.06H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.94l2.85-2.22.81-.63z"
                />
                <path
                  fill="#EA4335"
                  d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.06l3.66 2.84c.87-2.6 3.3-4.52 6.16-4.52z"
                />
              </svg>
            )}
            <span className="google-btn-text">
              {isAuthenticating ? 'Signing you in...' : 'Continue with Google'}
            </span>
          </button>

          <p className="auth-disclaimer">
            <Lock size={12} />
            <span>Your account is used only to identify your personal vault.</span>
          </p>

          {/* Developer Quick-Start helper when Client ID is empty */}
          {!isConfigured && (
            <div className="dev-setup-helper">
              <div className="dev-setup-header">
                <Code size={14} />
                <span>Developer Mode</span>
              </div>
              <p>
                To enable live Google OAuth, set <code>VITE_GOOGLE_CLIENT_ID</code> in <code>.env</code>.
              </p>
              <button
                type="button"
                className="dev-quick-login-btn"
                onClick={() => setShowDevModal(true)}
              >
                <Sparkles size={14} />
                <span>Test with Developer Profile</span>
              </button>
            </div>
          )}
        </div>

        {/* Footer Legal / Privacy Note */}
        <p className="auth-footer-legal">
          By continuing, you agree to use ID Vault with your Google account.
        </p>
      </div>

      {/* Developer Demo Sign-In Sheet */}
      {showDevModal && (
        <div className="dev-modal-overlay" role="dialog" aria-modal="true">
          <div className="dev-modal-card glass-surface">
            <div className="dev-modal-header">
              <span className="dev-badge">Local Developer Simulation</span>
              <button className="icon-button icon-button--quiet" onClick={() => setShowDevModal(false)}>
                ✕
              </button>
            </div>
            <h3>Sign in with Test Profile</h3>
            <p className="dev-modal-desc">
              Simulate an authenticated Google session to test the full ID Vault experience without configuring Google Cloud Console credentials.
            </p>

            <form onSubmit={handleDevSubmit} className="dev-login-form">
              <div className="field-group">
                <label>Display Name</label>
                <input
                  type="text"
                  value={devName}
                  onChange={(e) => setDevName(e.target.value)}
                  placeholder="e.g. Priyangshu Sharma"
                  required
                />
              </div>
              <div className="field-group">
                <label>Google Email</label>
                <input
                  type="email"
                  value={devEmail}
                  onChange={(e) => setDevEmail(e.target.value)}
                  placeholder="e.g. priyangshu.sharma@gmail.com"
                  required
                />
              </div>

              <div className="sheet-button-stack">
                <button type="submit" className="primary-button primary-button--full">
                  <UserCheck size={16} />
                  <span>Enter Vault as {devName.split(' ')[0]}</span>
                </button>
                <button
                  type="button"
                  className="secondary-button secondary-button--full"
                  onClick={() => setShowDevModal(false)}
                >
                  Cancel
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </main>
  )
}
