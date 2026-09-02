import { useRef } from 'react'
import { Star } from 'lucide-react'
import type { PointerEvent } from 'react'
import type { VaultDocument } from '../data/types'
import { liftCard, settleCard } from '../animations/cardAnimations'
import { gsap } from 'gsap'
import { DocumentVisual } from './DocumentVisual'
import { TrustBadge, categoryCopy } from './DocumentMeta'

type DocumentCardProps = {
  document: VaultDocument
  onOpen: (document: VaultDocument) => void
  onToggleFavourite?: (document: VaultDocument) => void
  index?: number
  large?: boolean
}

export function DocumentCard({
  document,
  onOpen,
  onToggleFavourite,
  index = 0,
  large = false,
}: DocumentCardProps) {
  const cardRef = useRef<HTMLElement>(null)

  const handlePointerMove = (event: PointerEvent<HTMLElement>) => {
    if (event.pointerType !== 'mouse' || !cardRef.current) return
    const rect = cardRef.current.getBoundingClientRect()
    const x = (event.clientX - rect.left) / rect.width - 0.5
    const y = (event.clientY - rect.top) / rect.height - 0.5
    gsap.to(cardRef.current, {
      rotation: x * 1.5,
      y: -5 + y * -2,
      duration: 0.35,
      ease: 'power2.out',
      overwrite: 'auto',
    })
    gsap.to(cardRef.current.querySelector('.document-card__shine'), {
      xPercent: x * 65,
      yPercent: y * 35,
      opacity: 0.45,
      duration: 0.45,
      ease: 'power2.out',
      overwrite: 'auto',
    })
    gsap.to(cardRef.current.querySelector('.document-card__visual'), {
      x: x * 5,
      y: y * 3.5,
      duration: 0.38,
      ease: 'power2.out',
      overwrite: 'auto',
    })
  }

  const holderName = document.documentHolderName || document.ownerName || 'Not detected'
  const identifier = document.maskedIdentifier || document.maskedNumber

  return (
    <article
      ref={cardRef}
      className={`document-card document-card--${document.visualType} ${large ? 'document-card--large' : ''}`}
      onPointerEnter={(e) => e.pointerType === 'mouse' && cardRef.current && liftCard(cardRef.current)}
      onPointerMove={handlePointerMove}
      onPointerLeave={(e) => e.pointerType === 'mouse' && cardRef.current && settleCard(cardRef.current)}
      style={{ '--card-index': index } as React.CSSProperties}
    >
      <button
        type="button"
        className="document-card__open"
        onClick={() => onOpen(document)}
        aria-label={`Open ${document.name}`}
      >
        <span className="document-card__shine" aria-hidden="true" />
        <span className="document-card__topline">
          <span>{document.shortName}</span>
          <span className="card-topline-right">
            {document.version && document.version > 1 && (
              <span className="card-version-pill">v{document.version}</span>
            )}
            <span>{categoryCopy[document.category]}</span>
          </span>
        </span>
        <span className="document-card__visual" aria-hidden="true">
          <DocumentVisual type={document.visualType} decorative />
        </span>
        <span className="document-card__holder">{holderName}</span>
        {identifier && (
          <span className="document-card__number">{identifier}</span>
        )}
        <span className="document-card__footer">
          <span className="document-card__type-label">{document.documentType}</span>
          <TrustBadge status={document.trustStatus} compact />
        </span>
        {document.expiryLabel && (
          <span className={`document-card__expiry ${document.expiryState === 'soon' ? 'document-card__expiry--soon' : ''}`}>
            {document.expiryLabel}
          </span>
        )}
      </button>
      {onToggleFavourite && (
        <button
          type="button"
          className={`document-card__favourite ${document.favourite ? 'document-card__favourite--active' : ''}`}
          onClick={(e) => {
            e.stopPropagation()
            onToggleFavourite(document)
          }}
          aria-label={`${document.favourite ? 'Remove' : 'Add'} ${document.name} ${document.favourite ? 'from' : 'to'} favourites`}
        >
          <Star size={15} fill={document.favourite ? 'currentColor' : 'none'} />
        </button>
      )}
    </article>
  )
}
