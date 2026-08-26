import { Activity, FolderOpen, Grid2X2, Home, Plus } from 'lucide-react'

export type AppPage = 'home' | 'documents' | 'collections' | 'activity'

const navigation = [
  { id: 'home', label: 'Home', icon: Home },
  { id: 'documents', label: 'Documents', icon: FolderOpen },
  { id: 'collections', label: 'Collections', icon: Grid2X2 },
  { id: 'activity', label: 'Activity', icon: Activity },
] as const

type BottomNavigationProps = {
  active: AppPage
  onChange: (page: AppPage) => void
  onAdd: () => void
}

export function BottomNavigation({ active, onChange, onAdd }: BottomNavigationProps) {
  return (
    <div className="bottom-nav-wrap">
      <button className="add-document-fab" onClick={onAdd} aria-label="Add document"><Plus size={22} /></button>
      <nav className="bottom-navigation glass-surface" aria-label="Primary navigation">
        {navigation.map(({ id, label, icon: Icon }) => (
          <button key={id} onClick={() => onChange(id)} className={`nav-item ${active === id ? 'nav-item--active' : ''}`} aria-current={active === id ? 'page' : undefined}>
            <Icon size={19} strokeWidth={active === id ? 2.4 : 1.9} />
            <span>{label}</span>
          </button>
        ))}
      </nav>
    </div>
  )
}
