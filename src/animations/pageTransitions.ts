import { gsap } from 'gsap'

export function createHomeEntrance(scope: HTMLElement) {
  const timeline = gsap.timeline({ defaults: { ease: 'power3.out' } })
  timeline
    .from(scope.querySelectorAll('[data-entrance="header"]'), { autoAlpha: 0, y: -10, duration: 0.32 })
    .from(scope.querySelectorAll('[data-entrance="greeting"]'), { autoAlpha: 0, y: 14, duration: 0.42 }, '-=0.12')
    .from(scope.querySelectorAll('[data-entrance="status"]'), { autoAlpha: 0, y: 10, scale: 0.985, duration: 0.38 }, '-=0.2')
    .from(scope.querySelectorAll('[data-entrance="quick-card"]'), { autoAlpha: 0, x: 18, duration: 0.38, stagger: 0.055 }, '-=0.08')
    .from(scope.querySelectorAll('[data-entrance="section"]'), { autoAlpha: 0, y: 12, duration: 0.38, stagger: 0.07 }, '-=0.14')
  return timeline
}
