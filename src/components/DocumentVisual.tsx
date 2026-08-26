import type { JSX, SVGProps } from 'react'
import type { DocumentVisualType } from '../data/types'

type VisualProps = SVGProps<SVGSVGElement> & {
  title?: string
  decorative?: boolean
  large?: boolean
}

function Canvas({ title, decorative, children, className = '', ...props }: VisualProps) {
  return (
    <svg
      viewBox="0 0 160 108"
      fill="none"
      xmlns="http://www.w3.org/2000/svg"
      role={decorative ? undefined : 'img'}
      aria-label={decorative ? undefined : title}
      aria-hidden={decorative || undefined}
      className={`document-svg-visual ${className}`}
      {...props}
    >
      {!decorative && title && <title>{title}</title>}
      {children}
    </svg>
  )
}

// 1. AADHAAR VISUAL - Terracotta / Red theme, abstract portrait, fingerprint motifs, micro ID
export function AadhaarVisual(props: VisualProps) {
  return (
    <Canvas {...props}>
      <defs>
        <linearGradient id="aadhaarBg" x1="0%" y1="0%" x2="100%" y2="100%">
          <stop offset="0%" stopColor="currentColor" stopOpacity="0.18" />
          <stop offset="100%" stopColor="currentColor" stopOpacity="0.06" />
        </linearGradient>
        <radialGradient id="aadhaarSun" cx="80%" cy="20%" r="50%">
          <stop offset="0%" stopColor="currentColor" stopOpacity="0.25" />
          <stop offset="100%" stopColor="currentColor" stopOpacity="0" />
        </radialGradient>
      </defs>
      {/* Card Base */}
      <rect x="8" y="10" width="144" height="88" rx="16" fill="url(#aadhaarBg)" stroke="currentColor" strokeOpacity="0.45" strokeWidth="1.2" />
      <rect x="8" y="10" width="144" height="88" rx="16" fill="url(#aadhaarSun)" />
      
      {/* Header bar */}
      <path d="M8 26h144" stroke="currentColor" strokeOpacity="0.25" strokeWidth="1" />
      <rect x="18" y="17" width="28" height="4" rx="2" fill="currentColor" fillOpacity="0.75" />
      <circle cx="140" cy="19" r="3.5" fill="currentColor" fillOpacity="0.65" />
      
      {/* Abstract Portrait Area */}
      <rect x="20" y="34" width="34" height="42" rx="7" fill="currentColor" fillOpacity="0.12" stroke="currentColor" strokeOpacity="0.5" strokeWidth="1.2" />
      <circle cx="37" cy="48" r="7" fill="currentColor" fillOpacity="0.75" />
      <path d="M25 69c1.5-6.5 11-6.5 12.5-6.5s11 0 12.5 6.5" stroke="currentColor" strokeOpacity="0.8" strokeWidth="1.5" strokeLinecap="round" />
      
      {/* Fingerprint / Identity Curves (Right side) */}
      <path d="M96 35c16 0 24 10 24 23 0 14-8 23-22 24" stroke="currentColor" strokeOpacity="0.85" strokeWidth="1.7" strokeLinecap="round" />
      <path d="M91 40c12-1 20 7 20 18 0 8-6 16-15 17" stroke="currentColor" strokeOpacity="0.7" strokeWidth="1.5" strokeLinecap="round" />
      <path d="M87 46c8-1 14 4 14 11 0 6-4 10-10 11" stroke="currentColor" strokeOpacity="0.55" strokeWidth="1.5" strokeLinecap="round" />
      <path d="M83 52c4 0 7 3 7 7 0 4-3 7-7 7" stroke="currentColor" strokeOpacity="0.45" strokeWidth="1.5" strokeLinecap="round" />
      
      {/* Abstract masked number indicators */}
      <path d="M20 84h18M42 84h18M64 84h18M86 84h18" stroke="currentColor" strokeOpacity="0.6" strokeWidth="2.2" strokeLinecap="round" />
      <rect x="62" y="36" width="20" height="3" rx="1.5" fill="currentColor" fillOpacity="0.5" />
      <rect x="62" y="43" width="14" height="2.5" rx="1" fill="currentColor" fillOpacity="0.35" />
    </Canvas>
  )
}

// 2. PAN CARD VISUAL - Muted Blue / Cyan theme, tax emblem, geometry
export function PanVisual(props: VisualProps) {
  return (
    <Canvas {...props}>
      <defs>
        <linearGradient id="panBg" x1="0%" y1="0%" x2="100%" y2="100%">
          <stop offset="0%" stopColor="currentColor" stopOpacity="0.18" />
          <stop offset="100%" stopColor="currentColor" stopOpacity="0.06" />
        </linearGradient>
      </defs>
      <rect x="8" y="10" width="144" height="88" rx="16" fill="url(#panBg)" stroke="currentColor" strokeOpacity="0.45" strokeWidth="1.2" />
      
      {/* Header security band */}
      <path d="M8 26h144" stroke="currentColor" strokeOpacity="0.3" strokeWidth="1" />
      <rect x="18" y="16" width="36" height="4.5" rx="2" fill="currentColor" fillOpacity="0.75" />
      <rect x="110" y="16" width="30" height="4.5" rx="2" fill="currentColor" fillOpacity="0.6" />
      
      {/* Abstract Tax Crest / Government Building Motif */}
      <path d="M24 64V44l14-10 14 10v20H24Z" fill="currentColor" fillOpacity="0.1" stroke="currentColor" strokeOpacity="0.8" strokeWidth="1.5" strokeLinejoin="round" />
      <path d="M33 64V49h10v15M28 44h20M29 48h3m12 0h3" stroke="currentColor" strokeOpacity="0.65" strokeWidth="1.3" strokeLinecap="round" />
      
      {/* Financial Security Hologram / Lattice */}
      <circle cx="114" cy="48" r="17" stroke="currentColor" strokeOpacity="0.75" strokeWidth="1.3" strokeDasharray="3 3" />
      <circle cx="114" cy="48" r="11" fill="currentColor" fillOpacity="0.12" stroke="currentColor" strokeOpacity="0.9" strokeWidth="1.4" />
      <path d="M119 42c-6-4-12 6-5 9 7 3 1 10-6 6M114 39v18" stroke="currentColor" strokeOpacity="0.85" strokeWidth="1.6" strokeLinecap="round" />
      
      {/* Number lines & Signature bar */}
      <rect x="60" y="38" width="32" height="3" rx="1.5" fill="currentColor" fillOpacity="0.55" />
      <rect x="60" y="46" width="24" height="2.5" rx="1" fill="currentColor" fillOpacity="0.4" />
      <path d="M60 62h32" stroke="currentColor" strokeOpacity="0.45" strokeWidth="1.5" strokeLinecap="round" />
      <path d="M20 83h120" stroke="currentColor" strokeOpacity="0.55" strokeWidth="2.5" strokeDasharray="9 4" strokeLinecap="round" />
    </Canvas>
  )
}

// 3. DRIVING LICENCE VISUAL - Emerald / Teal theme, vehicle & road motifs
export function DrivingLicenceVisual(props: VisualProps) {
  return (
    <Canvas {...props}>
      <defs>
        <linearGradient id="dlBg" x1="0%" y1="0%" x2="100%" y2="100%">
          <stop offset="0%" stopColor="currentColor" stopOpacity="0.18" />
          <stop offset="100%" stopColor="currentColor" stopOpacity="0.06" />
        </linearGradient>
      </defs>
      <rect x="8" y="10" width="144" height="88" rx="16" fill="url(#dlBg)" stroke="currentColor" strokeOpacity="0.45" strokeWidth="1.2" />
      
      {/* Header */}
      <path d="M8 25h144" stroke="currentColor" strokeOpacity="0.25" strokeWidth="1" />
      <rect x="18" y="16" width="42" height="4" rx="2" fill="currentColor" fillOpacity="0.75" />
      
      {/* Road / Perspective Highway Lines */}
      <path d="M18 78h124" stroke="currentColor" strokeOpacity="0.35" strokeWidth="2" strokeDasharray="7 6" strokeLinecap="round" />
      
      {/* Stylized Vehicle Silhouette */}
      <path
        d="M26 62h28l8 9H20l6-9Zm5 0 3.5-7h15l4.5 7M27 71a4 4 0 1 0 0-8 4 4 0 0 0 0 8Zm26 0a4 4 0 1 0 0-8 4 4 0 0 0 0 8Z"
        fill="currentColor"
        fillOpacity="0.15"
        stroke="currentColor"
        strokeOpacity="0.85"
        strokeWidth="1.6"
        strokeLinejoin="round"
      />
      
      {/* Smart Chip & Licence Info */}
      <rect x="88" y="32" width="22" height="18" rx="4" fill="currentColor" fillOpacity="0.15" stroke="currentColor" strokeOpacity="0.7" strokeWidth="1.3" />
      <path d="M88 41h22M99 32v18M93 37h3m6 0h3M93 45h3m6 0h3" stroke="currentColor" strokeOpacity="0.6" strokeWidth="1" />
      
      {/* Photo Frame Right */}
      <rect x="116" y="32" width="26" height="32" rx="5" fill="currentColor" fillOpacity="0.1" stroke="currentColor" strokeOpacity="0.65" strokeWidth="1.2" />
      <circle cx="129" cy="43" r="5" fill="currentColor" fillOpacity="0.75" />
      <path d="M120 60c1.5-4 7-4 8.5-4s7 0 8.5 4" stroke="currentColor" strokeOpacity="0.75" strokeWidth="1.3" strokeLinecap="round" />
      
      {/* Licence Number Line */}
      <path d="M20 85h80" stroke="currentColor" strokeOpacity="0.7" strokeWidth="2.2" strokeLinecap="round" />
    </Canvas>
  )
}

// 4. PASSPORT VISUAL - Deep Navy / Travel globe motif
export function PassportVisual(props: VisualProps) {
  return (
    <Canvas {...props}>
      <defs>
        <linearGradient id="passBg" x1="0%" y1="0%" x2="100%" y2="100%">
          <stop offset="0%" stopColor="currentColor" stopOpacity="0.22" />
          <stop offset="100%" stopColor="currentColor" stopOpacity="0.08" />
        </linearGradient>
      </defs>
      {/* Passport Booklet with Stitch Spine */}
      <rect x="22" y="8" width="102" height="92" rx="12" fill="url(#passBg)" stroke="currentColor" strokeOpacity="0.5" strokeWidth="1.4" />
      <path d="M30 8v92" stroke="currentColor" strokeOpacity="0.35" strokeWidth="1.2" strokeDasharray="3 4" />
      
      {/* Globe Longitude & Latitude Coordinates */}
      <circle cx="76" cy="46" r="22" stroke="currentColor" strokeOpacity="0.8" strokeWidth="1.4" />
      <path d="M54 46h44" stroke="currentColor" strokeOpacity="0.6" strokeWidth="1.2" />
      <path d="M76 24c7 6 10 14 10 22s-3 16-10 22c-7-6-10-14-10-22s3-16 10-22Z" stroke="currentColor" strokeOpacity="0.7" strokeWidth="1.2" />
      <path d="M58 35c8 3 18 3 36 0M58 57c8-3 18-3 36 0" stroke="currentColor" strokeOpacity="0.45" strokeWidth="1" />
      
      {/* Gold Emblem Header & Flight Marks */}
      <rect x="62" y="16" width="28" height="4" rx="2" fill="currentColor" fillOpacity="0.8" />
      <circle cx="76" cy="76" r="3" fill="currentColor" fillOpacity="0.65" />
      <path d="M48 84h56M56 89h40" stroke="currentColor" strokeOpacity="0.55" strokeWidth="1.8" strokeLinecap="round" />
      <path d="M132 26v56" stroke="currentColor" strokeOpacity="0.25" strokeWidth="1.5" strokeDasharray="4 4" />
    </Canvas>
  )
}

// 5. VOTER ID VISUAL - Indigo / Ballot Checkmark motif
export function VoterIdVisual(props: VisualProps) {
  return (
    <Canvas {...props}>
      <defs>
        <linearGradient id="voterBg" x1="0%" y1="0%" x2="100%" y2="100%">
          <stop offset="0%" stopColor="currentColor" stopOpacity="0.18" />
          <stop offset="100%" stopColor="currentColor" stopOpacity="0.06" />
        </linearGradient>
      </defs>
      <rect x="8" y="10" width="144" height="88" rx="16" fill="url(#voterBg)" stroke="currentColor" strokeOpacity="0.45" strokeWidth="1.2" />
      <path d="M8 26h144" stroke="currentColor" strokeOpacity="0.25" strokeWidth="1" />
      <rect x="18" y="16" width="38" height="4" rx="2" fill="currentColor" fillOpacity="0.75" />
      
      {/* Voter Photo Frame */}
      <rect x="22" y="34" width="36" height="42" rx="7" fill="currentColor" fillOpacity="0.12" stroke="currentColor" strokeOpacity="0.75" strokeWidth="1.3" />
      <circle cx="40" cy="48" r="6" fill="currentColor" fillOpacity="0.8" />
      <path d="M29 69c1.5-5 8.5-5 11-5s9.5 0 11 5" stroke="currentColor" strokeOpacity="0.8" strokeWidth="1.4" strokeLinecap="round" />
      
      {/* Electoral Details & Checkmark Stamp */}
      <rect x="66" y="36" width="32" height="3" rx="1.5" fill="currentColor" fillOpacity="0.6" />
      <rect x="66" y="44" width="24" height="2.5" rx="1" fill="currentColor" fillOpacity="0.4" />
      <rect x="66" y="52" width="28" height="2.5" rx="1" fill="currentColor" fillOpacity="0.4" />
      
      {/* Official Ballot Check Seal */}
      <circle cx="118" cy="55" r="19" stroke="currentColor" strokeOpacity="0.4" strokeWidth="1.2" strokeDasharray="3 3" />
      <circle cx="118" cy="55" r="14" fill="currentColor" fillOpacity="0.12" stroke="currentColor" strokeOpacity="0.8" strokeWidth="1.4" />
      <path d="m111 55 5 5 10-12" stroke="currentColor" strokeOpacity="0.95" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round" />
      
      <path d="M22 84h80" stroke="currentColor" strokeOpacity="0.65" strokeWidth="2.2" strokeLinecap="round" />
    </Canvas>
  )
}

// 6. DEGREE VISUAL - Academic Gold / Mortarboard / Rosette Seal
export function DegreeVisual(props: VisualProps) {
  return (
    <Canvas {...props}>
      <defs>
        <linearGradient id="degreeBg" x1="0%" y1="0%" x2="100%" y2="100%">
          <stop offset="0%" stopColor="currentColor" stopOpacity="0.16" />
          <stop offset="100%" stopColor="currentColor" stopOpacity="0.05" />
        </linearGradient>
      </defs>
      {/* Parchment with folded corner */}
      <path d="M22 12h88l26 26v58H22V12Z" fill="url(#degreeBg)" stroke="currentColor" strokeOpacity="0.5" strokeWidth="1.3" strokeLinejoin="round" />
      <path d="M110 12v26h26" fill="currentColor" fillOpacity="0.1" stroke="currentColor" strokeOpacity="0.5" strokeWidth="1.3" strokeLinejoin="round" />
      
      {/* Border Inset */}
      <rect x="28" y="18" width="76" height="72" rx="4" stroke="currentColor" strokeOpacity="0.25" strokeWidth="1" strokeDasharray="4 3" />
      
      {/* Mortarboard Cap Motif */}
      <path d="m48 40 18-9 18 9-18 9-18-9Zm8 4.5v11m20-11v11M56 59c6 3.5 14 3.5 20 0" stroke="currentColor" strokeOpacity="0.85" strokeWidth="1.6" strokeLinecap="round" strokeLinejoin="round" />
      <path d="M66 49v11" stroke="currentColor" strokeOpacity="0.75" strokeWidth="1.3" />
      <circle cx="66" cy="61" r="1.5" fill="currentColor" />
      
      {/* Text lines */}
      <path d="M38 68h36M38 74h28" stroke="currentColor" strokeOpacity="0.5" strokeWidth="1.8" strokeLinecap="round" />
      
      {/* Wax Rosette Seal with Ribbon */}
      <circle cx="112" cy="74" r="12" fill="currentColor" fillOpacity="0.15" stroke="currentColor" strokeOpacity="0.8" strokeWidth="1.4" />
      <path d="m107 74 3.5 3.5 7-8" stroke="currentColor" strokeOpacity="0.9" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" />
      <path d="m106 85-3 10 7-4 7 4-3-10" fill="currentColor" fillOpacity="0.7" stroke="currentColor" strokeOpacity="0.8" strokeWidth="1.2" strokeLinejoin="round" />
    </Canvas>
  )
}

// 7. MARKSHEET VISUAL - Academic Scores / Columnar Layout
export function MarksheetVisual(props: VisualProps) {
  return (
    <Canvas {...props}>
      <defs>
        <linearGradient id="markBg" x1="0%" y1="0%" x2="100%" y2="100%">
          <stop offset="0%" stopColor="currentColor" stopOpacity="0.16" />
          <stop offset="100%" stopColor="currentColor" stopOpacity="0.05" />
        </linearGradient>
      </defs>
      <path d="M22 10h88l26 26v62H22V10Z" fill="url(#markBg)" stroke="currentColor" strokeOpacity="0.5" strokeWidth="1.3" strokeLinejoin="round" />
      <path d="M110 10v26h26" fill="currentColor" fillOpacity="0.1" stroke="currentColor" strokeOpacity="0.5" strokeWidth="1.3" />
      
      {/* Header mark */}
      <rect x="32" y="20" width="36" height="4" rx="2" fill="currentColor" fillOpacity="0.75" />
      <path d="M32 30h72" stroke="currentColor" strokeOpacity="0.3" strokeWidth="1" />
      
      {/* Table Score Rows */}
      <path d="M32 42h54M32 51h54M32 60h40M32 69h40" stroke="currentColor" strokeOpacity="0.6" strokeWidth="2" strokeLinecap="round" />
      
      {/* Score Bars */}
      <rect x="94" y="56" width="8" height="17" rx="2" fill="currentColor" fillOpacity="0.7" />
      <rect x="106" y="47" width="8" height="26" rx="2" fill="currentColor" fillOpacity="0.85" />
      <rect x="118" y="52" width="8" height="21" rx="2" fill="currentColor" fillOpacity="0.75" />
      
      {/* Bottom Pass Stamp */}
      <rect x="32" y="78" width="28" height="11" rx="3" stroke="currentColor" strokeOpacity="0.7" strokeWidth="1.2" strokeDasharray="3 2" />
      <rect x="36" y="82" width="20" height="3" rx="1.5" fill="currentColor" fillOpacity="0.7" />
    </Canvas>
  )
}

// 8. CLASS 10 CERTIFICATE VISUAL
export function Class10CertificateVisual(props: VisualProps) {
  return (
    <Canvas {...props}>
      <defs>
        <linearGradient id="c10Bg" x1="0%" y1="0%" x2="100%" y2="100%">
          <stop offset="0%" stopColor="currentColor" stopOpacity="0.16" />
          <stop offset="100%" stopColor="currentColor" stopOpacity="0.05" />
        </linearGradient>
      </defs>
      <path d="M22 10h88l26 26v62H22V10Z" fill="url(#c10Bg)" stroke="currentColor" strokeOpacity="0.5" strokeWidth="1.3" strokeLinejoin="round" />
      <path d="M110 10v26h26" fill="currentColor" fillOpacity="0.1" stroke="currentColor" strokeOpacity="0.5" strokeWidth="1.3" />
      
      <circle cx="56" cy="38" r="14" stroke="currentColor" strokeOpacity="0.7" strokeWidth="1.3" />
      <circle cx="56" cy="38" r="8" fill="currentColor" fillOpacity="0.15" stroke="currentColor" strokeOpacity="0.8" strokeWidth="1.2" />
      <path d="M48 62h60M48 70h45M48 78h35" stroke="currentColor" strokeOpacity="0.55" strokeWidth="2" strokeLinecap="round" />
      
      {/* Stamp badge */}
      <circle cx="112" cy="74" r="11" fill="currentColor" fillOpacity="0.15" stroke="currentColor" strokeOpacity="0.8" strokeWidth="1.3" />
      <path d="m107 74 3 3 6-7" stroke="currentColor" strokeOpacity="0.9" strokeWidth="1.6" strokeLinecap="round" strokeLinejoin="round" />
    </Canvas>
  )
}

// 9. DIPLOMA VISUAL - Certificate Scroll / Ribbon
export function DiplomaVisual(props: VisualProps) {
  return (
    <Canvas {...props}>
      <defs>
        <linearGradient id="diplomaBg" x1="0%" y1="0%" x2="100%" y2="100%">
          <stop offset="0%" stopColor="currentColor" stopOpacity="0.16" />
          <stop offset="100%" stopColor="currentColor" stopOpacity="0.05" />
        </linearGradient>
      </defs>
      <path d="M26 24c0-7 6-12 14-12h80c8 0 14 5 14 12v60c0 7-6 12-14 12H40c-8 0-14-5-14-12V24Z" fill="url(#diplomaBg)" stroke="currentColor" strokeOpacity="0.5" strokeWidth="1.4" />
      <path d="M38 12v84M122 12v84" stroke="currentColor" strokeOpacity="0.25" strokeWidth="1" strokeDasharray="3 3" />
      
      {/* Academic Crest */}
      <circle cx="80" cy="36" r="13" stroke="currentColor" strokeOpacity="0.75" strokeWidth="1.3" />
      <path d="m73 36 4 4 9-8" stroke="currentColor" strokeOpacity="0.85" strokeWidth="1.6" strokeLinecap="round" strokeLinejoin="round" />
      
      {/* Text lines */}
      <path d="M50 58h60M56 66h48M62 74h36" stroke="currentColor" strokeOpacity="0.55" strokeWidth="1.8" strokeLinecap="round" />
      
      {/* Ribbon Knot */}
      <path d="M74 84v12l6-4 6 4V84" fill="currentColor" fillOpacity="0.75" stroke="currentColor" strokeOpacity="0.9" strokeWidth="1.2" />
    </Canvas>
  )
}

// 10. BASE CERTIFICATE ARTWORK (Used by Domicile, Birth, Caste, etc.)
function CertificateArtwork({ titleOverlay }: { titleOverlay?: React.ReactNode }) {
  return (
    <>
      <defs>
        <linearGradient id="certBg" x1="0%" y1="0%" x2="100%" y2="100%">
          <stop offset="0%" stopColor="currentColor" stopOpacity="0.16" />
          <stop offset="100%" stopColor="currentColor" stopOpacity="0.05" />
        </linearGradient>
      </defs>
      <path d="M22 10h88l26 26v62H22V10Z" fill="url(#certBg)" stroke="currentColor" strokeOpacity="0.5" strokeWidth="1.3" strokeLinejoin="round" />
      <path d="M110 10v26h26" fill="currentColor" fillOpacity="0.1" stroke="currentColor" strokeOpacity="0.5" strokeWidth="1.3" />
      <rect x="28" y="16" width="76" height="74" rx="4" stroke="currentColor" strokeOpacity="0.22" strokeWidth="1" />
      
      {/* Header Seal */}
      <rect x="36" y="24" width="38" height="4" rx="2" fill="currentColor" fillOpacity="0.75" />
      <path d="M36 34h54M36 42h44M36 50h36" stroke="currentColor" strokeOpacity="0.55" strokeWidth="1.8" strokeLinecap="round" />
      
      {/* Official Government Seal */}
      <circle cx="112" cy="72" r="13" fill="currentColor" fillOpacity="0.14" stroke="currentColor" strokeOpacity="0.8" strokeWidth="1.4" />
      <path d="m106 72 4 4 8-9" stroke="currentColor" strokeOpacity="0.9" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" />
      <path d="m107 83-3 10 8-4 8 4-3-10" fill="currentColor" fillOpacity="0.7" stroke="currentColor" strokeOpacity="0.8" strokeWidth="1.2" strokeLinejoin="round" />
      {titleOverlay}
    </>
  )
}

// 11. GENERAL CERTIFICATE
export function CertificateVisual(props: VisualProps) {
  return <Canvas {...props}><CertificateArtwork /></Canvas>
}

// 12. DOMICILE CERTIFICATE VISUAL
export function DomicileVisual(props: VisualProps) {
  return (
    <Canvas {...props}>
      <CertificateArtwork
        titleOverlay={
          <g>
            <circle cx="54" cy="68" r="9" stroke="currentColor" strokeOpacity="0.6" strokeWidth="1.2" strokeDasharray="3 2" />
            <path d="M50 68h8M54 64v8" stroke="currentColor" strokeOpacity="0.7" strokeWidth="1.4" />
          </g>
        }
      />
    </Canvas>
  )
}

// 13. INCOME CERTIFICATE VISUAL - Wealth / Assessment Emblem
export function IncomeCertificateVisual(props: VisualProps) {
  return (
    <Canvas {...props}>
      <CertificateArtwork
        titleOverlay={
          <g>
            <circle cx="56" cy="68" r="10" fill="currentColor" fillOpacity="0.1" stroke="currentColor" strokeOpacity="0.75" strokeWidth="1.3" />
            <path d="M59 64c-4-2-8 3-4 6 5 2 1 7-4 4M56 61v14" stroke="currentColor" strokeOpacity="0.85" strokeWidth="1.5" strokeLinecap="round" />
          </g>
        }
      />
    </Canvas>
  )
}

// 14. CASTE CERTIFICATE VISUAL
export function CasteCertificateVisual(props: VisualProps) {
  return (
    <Canvas {...props}>
      <CertificateArtwork
        titleOverlay={
          <g>
            <rect x="46" y="62" width="20" height="14" rx="3" stroke="currentColor" strokeOpacity="0.65" strokeWidth="1.2" />
            <path d="M49 69h14M56 62v14" stroke="currentColor" strokeOpacity="0.65" strokeWidth="1.2" />
          </g>
        }
      />
    </Canvas>
  )
}

// 15. BIRTH CERTIFICATE VISUAL - Cradle / Vitality emblem
export function BirthCertificateVisual(props: VisualProps) {
  return (
    <Canvas {...props}>
      <CertificateArtwork
        titleOverlay={
          <g>
            <path d="M56 61c3-4 9-2 8 3-2 5-8 9-8 9s-6-4-8-9c-1-5 5-7 8-3Z" fill="currentColor" fillOpacity="0.75" />
          </g>
        }
      />
    </Canvas>
  )
}

// 16. VEHICLE REGISTRATION (RC) VISUAL - Transport smartcard & car silhouette
export function VehicleRcVisual(props: VisualProps) {
  return (
    <Canvas {...props}>
      <defs>
        <linearGradient id="rcBg" x1="0%" y1="0%" x2="100%" y2="100%">
          <stop offset="0%" stopColor="currentColor" stopOpacity="0.18" />
          <stop offset="100%" stopColor="currentColor" stopOpacity="0.06" />
        </linearGradient>
      </defs>
      <rect x="8" y="10" width="144" height="88" rx="16" fill="url(#rcBg)" stroke="currentColor" strokeOpacity="0.45" strokeWidth="1.2" />
      <path d="M8 26h144" stroke="currentColor" strokeOpacity="0.25" strokeWidth="1" />
      <rect x="18" y="16" width="36" height="4" rx="2" fill="currentColor" fillOpacity="0.75" />
      
      {/* Smart Chip */}
      <rect x="20" y="34" width="24" height="19" rx="4" fill="currentColor" fillOpacity="0.15" stroke="currentColor" strokeOpacity="0.7" strokeWidth="1.2" />
      <path d="M20 43h24M32 34v19M25 38h3m6 0h3M25 48h3m6 0h3" stroke="currentColor" strokeOpacity="0.55" strokeWidth="1" />
      
      {/* Car Outline */}
      <path d="M72 44h22l7 8H65l7-8Zm4 0 3-5h10l4 5M74 54a3.5 3.5 0 1 0 0-7 3.5 3.5 0 0 0 0 7Zm21 0a3.5 3.5 0 1 0 0-7 3.5 3.5 0 0 0 0 7Z" fill="currentColor" fillOpacity="0.1" stroke="currentColor" strokeOpacity="0.8" strokeWidth="1.4" strokeLinejoin="round" />
      
      <rect x="114" y="34" width="28" height="24" rx="4" stroke="currentColor" strokeOpacity="0.4" strokeWidth="1.2" strokeDasharray="3 3" />
      <circle cx="128" cy="46" r="6" fill="currentColor" fillOpacity="0.6" />
      
      <path d="M20 68h120" stroke="currentColor" strokeOpacity="0.3" strokeWidth="1" />
      <path d="M20 80h48M76 80h40" stroke="currentColor" strokeOpacity="0.7" strokeWidth="2.2" strokeLinecap="round" />
    </Canvas>
  )
}

// 17. INSURANCE VISUAL - Protective Shield / Umbrella motif
export function InsuranceVisual(props: VisualProps) {
  return (
    <Canvas {...props}>
      <defs>
        <linearGradient id="insBg" x1="0%" y1="0%" x2="100%" y2="100%">
          <stop offset="0%" stopColor="currentColor" stopOpacity="0.18" />
          <stop offset="100%" stopColor="currentColor" stopOpacity="0.06" />
        </linearGradient>
      </defs>
      <rect x="8" y="10" width="144" height="88" rx="16" fill="url(#insBg)" stroke="currentColor" strokeOpacity="0.45" strokeWidth="1.2" />
      
      {/* Shield Motif */}
      <path d="M80 20c14-5 24 2 24 2v24c0 18-14 28-24 32-10-4-24-14-24-32V22s10-7 24-2Z" fill="currentColor" fillOpacity="0.12" stroke="currentColor" strokeOpacity="0.85" strokeWidth="1.5" strokeLinejoin="round" />
      <path d="m72 45 6 6 12-14" stroke="currentColor" strokeOpacity="0.9" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />
      
      {/* Policy line text */}
      <path d="M20 78h32M108 78h32M20 84h40M100 84h40" stroke="currentColor" strokeOpacity="0.5" strokeWidth="1.8" strokeLinecap="round" />
      <rect x="18" y="16" width="30" height="4" rx="2" fill="currentColor" fillOpacity="0.7" />
    </Canvas>
  )
}

// 18. TAX FORM / FORM 16 VISUAL - Tabular Fiscal Rows & Assessment Seal
export function TaxFormVisual(props: VisualProps) {
  return (
    <Canvas {...props}>
      <defs>
        <linearGradient id="taxBg" x1="0%" y1="0%" x2="100%" y2="100%">
          <stop offset="0%" stopColor="currentColor" stopOpacity="0.16" />
          <stop offset="100%" stopColor="currentColor" stopOpacity="0.05" />
        </linearGradient>
      </defs>
      <path d="M22 10h88l26 26v62H22V10Z" fill="url(#taxBg)" stroke="currentColor" strokeOpacity="0.5" strokeWidth="1.3" strokeLinejoin="round" />
      <path d="M110 10v26h26" fill="currentColor" fillOpacity="0.1" stroke="currentColor" strokeOpacity="0.5" strokeWidth="1.3" />
      
      {/* Table grid header */}
      <rect x="30" y="22" width="70" height="12" rx="3" fill="currentColor" fillOpacity="0.12" stroke="currentColor" strokeOpacity="0.5" strokeWidth="1" />
      <path d="M52 22v12M76 22v12" stroke="currentColor" strokeOpacity="0.4" strokeWidth="1" />
      
      {/* Data Rows */}
      <path d="M30 44h88M30 54h88M30 64h88" stroke="currentColor" strokeOpacity="0.3" strokeWidth="1" />
      <path d="M34 40h12M58 40h14M82 40h18" stroke="currentColor" strokeOpacity="0.65" strokeWidth="1.6" strokeLinecap="round" />
      <path d="M34 50h14M58 50h10M82 50h22" stroke="currentColor" strokeOpacity="0.65" strokeWidth="1.6" strokeLinecap="round" />
      <path d="M34 60h10M58 60h16M82 60h14" stroke="currentColor" strokeOpacity="0.65" strokeWidth="1.6" strokeLinecap="round" />
      
      {/* TDS Stamp */}
      <rect x="88" y="72" width="34" height="16" rx="3" stroke="currentColor" strokeOpacity="0.8" strokeWidth="1.3" strokeDasharray="3 2" />
      <rect x="94" y="78" width="22" height="4" rx="1.5" fill="currentColor" fillOpacity="0.8" />
    </Canvas>
  )
}

const visuals: Record<DocumentVisualType, (props: VisualProps) => JSX.Element> = {
  aadhaar: AadhaarVisual,
  pan: PanVisual,
  'driving-licence': DrivingLicenceVisual,
  passport: PassportVisual,
  'voter-id': VoterIdVisual,
  degree: DegreeVisual,
  marksheet: MarksheetVisual,
  diploma: DiplomaVisual,
  certificate: CertificateVisual,
  domicile: DomicileVisual,
  'income-certificate': IncomeCertificateVisual,
  'caste-certificate': CasteCertificateVisual,
  'birth-certificate': BirthCertificateVisual,
  'vehicle-rc': VehicleRcVisual,
  insurance: InsuranceVisual,
  'tax-form': TaxFormVisual,
  'class-10-certificate': Class10CertificateVisual,
}

export function DocumentVisual({ type, ...props }: VisualProps & { type: DocumentVisualType }) {
  const Visual = visuals[type] || CertificateVisual
  return <Visual {...props} />
}
