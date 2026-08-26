import { useRef } from 'react'
import { useGSAP } from '@gsap/react'
import { gsap } from 'gsap'
import { FilePlus2, ShieldCheck, Sparkles } from 'lucide-react'
import { createHomeEntrance } from '../animations/pageTransitions'
import { Greeting } from '../components/Greeting'
import { VaultStatus } from '../components/VaultStatus'
import { QuickAccess } from '../components/QuickAccess'
import { Collections } from '../components/Collections'
import { NeedsAttention } from '../components/NeedsAttention'
import { RecentDocuments } from '../components/RecentDocuments'
import { generateCollections } from '../data/mockCollections'
import type { Collection, SettingsState, VaultDocument } from '../data/types'
import type { AuthUser } from '../data/authTypes'

gsap.registerPlugin(useGSAP)

type HomeProps = {
  user?: AuthUser | null
  documents: VaultDocument[]
  isLoading?: boolean
  settings: SettingsState
  onOpen: (document: VaultDocument) => void
  onToggleFavourite: (document: VaultDocument) => void
  onNavigate: (page: 'documents' | 'collections') => void
  onCollection: (collection: Collection) => void
  onOpenSettings: () => void
  onAddDocument: () => void
}

export function Home({
  user,
  documents,
  isLoading,
  settings,
  onOpen,
  onToggleFavourite,
  onNavigate,
  onCollection,
  onOpenSettings,
  onAddDocument,
}: HomeProps) {
  const pageRef = useRef<HTMLDivElement>(null)

  useGSAP(
    () => {
      const media = gsap.matchMedia()
      media.add('(prefers-reduced-motion: no-preference)', () => {
        if (pageRef.current) createHomeEntrance(pageRef.current)
      })
      return () => media.revert()
    },
    { scope: pageRef }
  )

  const currentDocs = documents.filter((doc) => doc.isCurrent !== false)
  const quickAccessDocs = currentDocs.filter((doc) => doc.favourite)
  const collections = generateCollections(documents)
  const attentionDoc = currentDocs.find((doc) => doc.expiryState === 'soon' || doc.expiryState === 'expired')
  const recentDocs = currentDocs.slice(0, 3)

  return (
    <div ref={pageRef} className="home-page page-frame">
      <Greeting user={user} />
      <VaultStatus settings={settings} onOpenSettings={onOpenSettings} />

      {isLoading ? (
        <section className="vault-empty-hero glass-surface" data-entrance="section" style={{ padding: '2.5rem 1rem' }}>
          <div className="empty-hero-icon">
            <Sparkles size={28} className="spin-icon text-accent" />
          </div>
          <h3>Loading your vault...</h3>
          <p>Restoring your documents and verified metadata</p>
        </section>
      ) : documents.length === 0 ? (
        /* Empty Vault State with clean spacing */
        <section className="vault-empty-hero glass-surface" data-entrance="section">
          <div className="empty-hero-icon">
            <ShieldCheck size={32} />
          </div>
          <h3>Your vault is empty</h3>
          <p>Add your first identity, education, or transport document to get started.</p>
          <button type="button" className="primary-button empty-add-btn" onClick={onAddDocument}>
            <FilePlus2 size={16} />
            <span>Add document</span>
          </button>
        </section>
      ) : (
        <>
          {quickAccessDocs.length > 0 && (
            <QuickAccess
              documents={quickAccessDocs}
              onOpen={onOpen}
              onToggleFavourite={onToggleFavourite}
              onSeeAll={() => onNavigate('documents')}
            />
          )}

          {attentionDoc && <NeedsAttention document={attentionDoc} onOpen={onOpen} />}

          {recentDocs.length > 0 && <RecentDocuments documents={recentDocs} onOpen={onOpen} />}
        </>
      )}

      <Collections
        collections={collections}
        documents={documents}
        onOpen={onCollection}
        onSeeAll={() => onNavigate('collections')}
      />
    </div>
  )
}
