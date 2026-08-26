import { gsap } from 'gsap'

export function liftCard(element: HTMLElement) {
  return gsap.to(element, { y: -4, scale: 1.012, duration: 0.28, ease: 'power3.out', overwrite: 'auto' })
}

export function settleCard(element: HTMLElement) {
  return gsap.to(element, { x: 0, y: 0, rotation: 0, scale: 1, duration: 0.42, ease: 'power3.out', overwrite: 'auto' })
}
