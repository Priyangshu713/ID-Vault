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

      const soften = () =>
        gsap.to(header, {
          backgroundColor: 'rgba(247, 246, 243, 0.78)',
          backdropFilter: 'blur(18px) saturate(135%)',
          borderColor: 'rgba(29, 33, 36, 0.08)',
          boxShadow: '0 8px 22px rgba(30, 31, 30, 0.045)',
          duration: 0.26,
          ease: 'power2.out',
          overwrite: 'auto',
        })
      const clear = () =>
        gsap.to(header, {
          backgroundColor: 'rgba(247, 246, 243, 0)',
          backdropFilter: 'blur(0px) saturate(100%)',
          borderColor: 'rgba(29, 33, 36, 0)',
          boxShadow: '0 0 0 rgba(30, 31, 30, 0)',
          duration: 0.24,
          ease: 'power2.out',
          overwrite: 'auto',
        })

      ScrollTrigger.create({
        start: 12,
        end: 'max',
        onEnter: soften,
        onLeaveBack: clear,
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
