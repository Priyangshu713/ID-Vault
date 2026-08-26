import type { ReactNode } from 'react'
import { Header } from './Header'
import { BottomNavigation, type AppPage } from './BottomNavigation'
import type { AuthUser } from '../data/authTypes'

type AppShellProps = {
  page: AppPage
  user?: AuthUser | null
  children: ReactNode
  onNavigate: (page: AppPage) => void
  onSearch: () => void
  onProfile: () => void
  onAdd: () => void
}

export function AppShell({
  page,
  user,
  children,
  onNavigate,
  onSearch,
  onProfile,
  onAdd,
}: AppShellProps) {
  return (
    <div className="app-background">
      <div className="app-shell">
        <Header user={user} onSearch={onSearch} onProfile={onProfile} onHome={() => onNavigate('home')} />
        <main className="app-content">{children}</main>
        <BottomNavigation active={page} onChange={onNavigate} onAdd={onAdd} />
      </div>
    </div>
  )
}
