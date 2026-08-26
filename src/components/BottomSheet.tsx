import { useEffect, useRef } from 'react'
import { useGSAP } from '@gsap/react'
import { gsap } from 'gsap'
import { X } from 'lucide-react'
import type { ReactNode, PointerEvent } from 'react'

gsap.registerPlugin(useGSAP)

type BottomSheetProps = {
  title: string
  children: ReactNode
  onClose: () => void
}

export function BottomSheet({ title, children, onClose }: BottomSheetProps) {
  const scopeRef = useRef<HTMLDivElement>(null)
  const panelRef = useRef<HTMLElement>(null)
  const dragStart = useRef<number | null>(null)

  const { contextSafe } = useGSAP(() => {
    gsap.fromTo('.sheet-backdrop', { autoAlpha: 0 }, { autoAlpha: 1, duration: 0.2, ease: 'power1.out' })
    gsap.fromTo('.bottom-sheet', { yPercent: 105 }, { yPercent: 0, duration: 0.48, ease: 'power3.out' })
  }, { scope: scopeRef })

  useEffect(() => {
    const onKeyDown = (event: KeyboardEvent) => event.key === 'Escape' && onClose()
    window.addEventListener('keydown', onKeyDown)
    return () => window.removeEventListener('keydown', onKeyDown)
  }, [onClose])

  const dismiss = contextSafe(() => {
    const panel = panelRef.current
    if (!panel) return onClose()
    const backdrop = scopeRef.current?.querySelector('.sheet-backdrop')
    gsap.to(panel, { yPercent: 105, duration: 0.3, ease: 'power2.in' })
    if (backdrop) gsap.to(backdrop, { autoAlpha: 0, duration: 0.2, onComplete: onClose })
    else gsap.delayedCall(0.3, onClose)
  })

  const onDragStart = (event: PointerEvent<HTMLButtonElement>) => { dragStart.current = event.clientY }
  const onDragMove = (event: PointerEvent<HTMLButtonElement>) => {
    if (dragStart.current === null || !panelRef.current) return
    const offset = Math.max(0, event.clientY - dragStart.current)
    gsap.set(panelRef.current, { y: offset })
  }
  const onDragEnd = (event: PointerEvent<HTMLButtonElement>) => {
    if (dragStart.current === null || !panelRef.current) return
    const offset = event.clientY - dragStart.current
    dragStart.current = null
    if (offset > 95) dismiss()
    else gsap.to(panelRef.current, { y: 0, duration: 0.32, ease: 'power3.out' })
  }

  return (
    <div className="sheet-layer" ref={scopeRef} role="presentation">
      <button className="sheet-backdrop" aria-label="Close sheet" onClick={dismiss} />
      <section ref={panelRef} className="bottom-sheet glass-surface" role="dialog" aria-modal="true" aria-labelledby="sheet-title">
        <button className="sheet-handle" aria-label="Drag to close" onPointerDown={onDragStart} onPointerMove={onDragMove} onPointerUp={onDragEnd} onPointerCancel={onDragEnd}><span /></button>
        <div className="sheet-heading"><h2 id="sheet-title">{title}</h2><button className="icon-button icon-button--quiet" onClick={dismiss} aria-label="Close"><X size={19} /></button></div>
        <div className="sheet-content">{children}</div>
      </section>
    </div>
  )
}
