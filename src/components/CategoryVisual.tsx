import type { SVGProps } from 'react'
import type { DocumentCategory } from '../data/types'

type CategoryVisualProps = SVGProps<SVGSVGElement> & {
  category: DocumentCategory
  size?: number
}

export function CategoryVisual({ category, size = 32, className = '', ...props }: CategoryVisualProps) {
  switch (category) {
    case 'identity':
      return (
        <svg
          width={size}
          height={size}
          viewBox="0 0 32 32"
          fill="none"
          xmlns="http://www.w3.org/2000/svg"
          className={`category-svg-icon category-svg-icon--identity ${className}`}
          {...props}
        >
          <rect width="32" height="32" rx="10" fill="currentColor" fillOpacity="0.12" />
          {/* Shield Outline */}
          <path
            d="M16 6.5L8.5 9.5V15.5C8.5 20.8 11.7 24.8 16 26.5C20.3 24.8 23.5 20.8 23.5 15.5V9.5L16 6.5Z"
            stroke="currentColor"
            strokeWidth="1.5"
            strokeLinecap="round"
            strokeLinejoin="round"
          />
          {/* Biometric / User Silhouette inside */}
          <circle cx="16" cy="13.5" r="2.8" fill="currentColor" fillOpacity="0.85" />
          <path
            d="M11.5 20.5C12.4 18.8 14.1 18 16 18C17.9 18 19.6 18.8 20.5 20.5"
            stroke="currentColor"
            strokeWidth="1.4"
            strokeLinecap="round"
          />
        </svg>
      )

    case 'education':
      return (
        <svg
          width={size}
          height={size}
          viewBox="0 0 32 32"
          fill="none"
          xmlns="http://www.w3.org/2000/svg"
          className={`category-svg-icon category-svg-icon--education ${className}`}
          {...props}
        >
          <rect width="32" height="32" rx="10" fill="currentColor" fillOpacity="0.12" />
          {/* Academic Cap / Mortarboard */}
          <path
            d="M16 8L7 12.5L16 17L25 12.5L16 8Z"
            fill="currentColor"
            fillOpacity="0.25"
            stroke="currentColor"
            strokeWidth="1.5"
            strokeLinejoin="round"
          />
          <path
            d="M10.5 14.5V20.5C10.5 22.5 13 24 16 24C19 24 21.5 22.5 21.5 20.5V14.5"
            stroke="currentColor"
            strokeWidth="1.4"
            strokeLinecap="round"
          />
          {/* Tassel */}
          <path
            d="M23 13.5V19.5M23 19.5L24.5 21M23 19.5L21.5 21"
            stroke="currentColor"
            strokeWidth="1.3"
            strokeLinecap="round"
          />
        </svg>
      )

    case 'certificate':
      return (
        <svg
          width={size}
          height={size}
          viewBox="0 0 32 32"
          fill="none"
          xmlns="http://www.w3.org/2000/svg"
          className={`category-svg-icon category-svg-icon--certificate ${className}`}
          {...props}
        >
          <rect width="32" height="32" rx="10" fill="currentColor" fillOpacity="0.12" />
          {/* Wax Seal Circle */}
          <circle
            cx="16"
            cy="13.5"
            r="6.5"
            fill="currentColor"
            fillOpacity="0.2"
            stroke="currentColor"
            strokeWidth="1.5"
          />
          <circle cx="16" cy="13.5" r="3.2" stroke="currentColor" strokeWidth="1.2" strokeDasharray="1.5 1.5" />
          {/* Ribbon Tails */}
          <path
            d="M13 19L11 25.5L14.5 24L16 26"
            stroke="currentColor"
            strokeWidth="1.4"
            strokeLinecap="round"
            strokeLinejoin="round"
          />
          <path
            d="M19 19L21 25.5L17.5 24L16 26"
            stroke="currentColor"
            strokeWidth="1.4"
            strokeLinecap="round"
            strokeLinejoin="round"
          />
        </svg>
      )

    case 'transport':
      return (
        <svg
          width={size}
          height={size}
          viewBox="0 0 32 32"
          fill="none"
          xmlns="http://www.w3.org/2000/svg"
          className={`category-svg-icon category-svg-icon--transport ${className}`}
          {...props}
        >
          <rect width="32" height="32" rx="10" fill="currentColor" fillOpacity="0.12" />
          {/* Vehicle Profile */}
          <path
            d="M8 17.5L11 11.5H21L24 17.5V22.5C24 23.3 23.3 24 22.5 24H21.5C20.7 24 20 23.3 20 22.5V21.5H12V22.5C12 23.3 11.3 24 10.5 24H9.5C8.7 24 8 23.3 8 22.5V17.5Z"
            fill="currentColor"
            fillOpacity="0.2"
            stroke="currentColor"
            strokeWidth="1.5"
            strokeLinejoin="round"
          />
          {/* Headlights & Wheels */}
          <circle cx="11.5" cy="17.5" r="1.5" fill="currentColor" />
          <circle cx="20.5" cy="17.5" r="1.5" fill="currentColor" />
          <path d="M11 14.5H21" stroke="currentColor" strokeWidth="1.2" strokeLinecap="round" />
        </svg>
      )

    case 'financial':
      return (
        <svg
          width={size}
          height={size}
          viewBox="0 0 32 32"
          fill="none"
          xmlns="http://www.w3.org/2000/svg"
          className={`category-svg-icon category-svg-icon--financial ${className}`}
          {...props}
        >
          <rect width="32" height="32" rx="10" fill="currentColor" fillOpacity="0.12" />
          {/* Card Base */}
          <rect
            x="6.5"
            y="9.5"
            width="19"
            height="13"
            rx="3"
            fill="currentColor"
            fillOpacity="0.2"
            stroke="currentColor"
            strokeWidth="1.5"
          />
          {/* Magnetic Stripe / Chip */}
          <rect x="9.5" y="13.5" width="4.5" height="3.5" rx="1" fill="currentColor" fillOpacity="0.8" />
          <path d="M17 14.5H22.5M17 17H20" stroke="currentColor" strokeWidth="1.2" strokeLinecap="round" />
        </svg>
      )

    case 'other':
    default:
      return (
        <svg
          width={size}
          height={size}
          viewBox="0 0 32 32"
          fill="none"
          xmlns="http://www.w3.org/2000/svg"
          className={`category-svg-icon category-svg-icon--other ${className}`}
          {...props}
        >
          <rect width="32" height="32" rx="10" fill="currentColor" fillOpacity="0.12" />
          {/* Document / Folder Folio */}
          <path
            d="M8.5 9C8.5 7.9 9.4 7 10.5 7H14.5L16.5 9.5H21.5C22.6 9.5 23.5 10.4 23.5 11.5V22C23.5 23.1 22.6 24 21.5 24H10.5C9.4 24 8.5 23.1 8.5 22V9Z"
            fill="currentColor"
            fillOpacity="0.2"
            stroke="currentColor"
            strokeWidth="1.5"
            strokeLinejoin="round"
          />
          <path d="M13 15H19M13 18.5H17" stroke="currentColor" strokeWidth="1.3" strokeLinecap="round" />
        </svg>
      )
  }
}
