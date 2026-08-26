import { BadgeCheck, FileScan, FileUp, Landmark, ShieldCheck } from 'lucide-react'
import type { DocumentCategory, DocumentSource, DocumentTrustStatus } from '../data/types'

export const trustCopy: Record<DocumentTrustStatus, string> = {
  personal_copy: 'Personal copy',
  processed: 'Normalized copy',
  verified: 'Verified document',
  ocr_processed: 'Information extracted',
  digilocker_matched: 'DigiLocker matched',
  official_digital: 'Official digital document',
}

export const categoryCopy: Record<DocumentCategory, string> = {
  identity: 'Identity',
  education: 'Education',
  certificate: 'Certificates',
  transport: 'Transport',
  financial: 'Financial',
  other: 'Other',
}

const TrustIcon = ({ status }: { status: DocumentTrustStatus }) => {
  if (status === 'digilocker_matched' || status === 'verified') return <BadgeCheck size={13} strokeWidth={2.2} />
  if (status === 'official_digital') return <Landmark size={13} strokeWidth={2.2} />
  if (status === 'ocr_processed') return <FileScan size={13} strokeWidth={2.2} />
  return <FileUp size={13} strokeWidth={2.2} />
}

export function TrustBadge({ status, compact = false }: { status: DocumentTrustStatus; compact?: boolean }) {
  const label = compact
    ? status === 'digilocker_matched'
      ? 'DigiLocker'
      : status === 'ocr_processed'
      ? 'Extracted'
      : status === 'official_digital'
      ? 'Official'
      : status === 'verified'
      ? 'Verified'
      : 'Personal'
    : trustCopy[status] || 'Personal copy'

  return (
    <span className={`trust-badge trust-badge--${status} ${compact ? 'trust-badge--compact' : ''}`}>
      <TrustIcon status={status} />
      <span>{label}</span>
    </span>
  )
}

export function SourceIndicator({ source, label }: { source: DocumentSource; label: string }) {
  const icon =
    source === 'digilocker' ? (
      <BadgeCheck size={14} className="source-icon source-icon--digilocker" />
    ) : source === 'issuer_digital' ? (
      <Landmark size={14} className="source-icon source-icon--issuer" />
    ) : (
      <FileUp size={14} className="source-icon source-icon--upload" />
    )

  return (
    <span className={`source-indicator source-indicator--${source}`}>
      {icon}
      <span>{label}</span>
    </span>
  )
}
