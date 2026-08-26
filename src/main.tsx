import { StrictMode } from 'react'
import { createRoot } from 'react-dom/client'
import App from './App'
import { AuthProvider } from './context/AuthContext'
import { VaultProvider } from './context/VaultContext'
import { DriveProvider } from './context/DriveContext'
import { DocumentProvider } from './context/DocumentContext'
import './styles/index.css'

createRoot(document.getElementById('root')!).render(
  <StrictMode>
    <AuthProvider>
      <VaultProvider>
        <DriveProvider>
          <DocumentProvider>
            <App />
          </DocumentProvider>
        </DriveProvider>
      </VaultProvider>
    </AuthProvider>
  </StrictMode>,
)
