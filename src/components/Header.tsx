import { useRef } from 'react'
import { useGSAP } from '@gsap/react'
import { gsap } from 'gsap'
import { ScrollTrigger } from 'gsap/ScrollTrigger'
import { CircleUserRound, Search, ShieldCheck } from 'lucide-react'
import type { AuthUser } from '../data/authTypes'

gsap.registerPlugin(useGSAP, ScrollTrigger)

type HeaderProps = {
  user?: AuthUser | null
  onSearch: () => void
  onProfile: () => void
  onHome: () => void
}

export function Header({ user, onSearch, onProfile, onHome }: HeaderProps) {
  const headerRef = useRef<HTMLElement>(null)

  useGSAP(
    () => {
      const header = headerRef.current
      if (!header) return

      ScrollTrigger.create({
        start: 12,
        end: 'max',
        onEnter: () => header.classList.add('top-bar--scrolled'),
        onLeaveBack: () => header.classList.remove('top-bar--scrolled'),
      })
    },
    { scope: headerRef }
  )

  const initials = user?.name
    ? user.name
        .split(' ')
        .map((p) => p[0])
        .join('')
        .slice(0, 2)
        .toUpperCase()
    : null

  return (
    <header ref={headerRef} className="top-bar" data-entrance="header">
      <div className="top-bar__inner">
        <button className="brand" onClick={onHome} aria-label="Go to ID Vault home">
          <span className="brand-mark">
            <ShieldCheck size={16} strokeWidth={2.1} />
          </span>
          <span>ID Vault</span>
        </button>
        <div className="top-bar__actions">
          <button className="icon-button" onClick={onSearch} aria-label="Search documents">
            <Search size={20} />
          </button>
          <button className="avatar-button" onClick={onProfile} aria-label="Open profile">
            {user?.avatarUrl ? (
              <img
                src={user.avatarUrl}
                alt={user.name || 'User avatar'}
                className="header-avatar-img"
                referrerPolicy="no-referrer"
              />
            ) : initials ? (
              <span className="header-avatar-initials">{initials}</span>
            ) : (
              <CircleUserRound size={20} />
            )}
          </button>
        </div>
      </div>
    </header>
  )
}
