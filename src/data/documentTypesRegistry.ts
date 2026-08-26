import type {
  DocumentCategory,
  DocumentMultiplicity,
  DocumentPageMode,
  DocumentVisualType,
} from './types'

export type DocumentTypeConfig = {
  type: string
  displayName: string
  shortName: string
  category: DocumentCategory
  multiplicity: DocumentMultiplicity
  pageMode: DocumentPageMode
  supportsBackSide: boolean
  visualType: DocumentVisualType
  defaultIssuer: string
  description: string
  keywords: string[]
  identifierPattern?: RegExp
  identifierFormatDescription?: string
}

export const DOCUMENT_TYPE_REGISTRY: Record<string, DocumentTypeConfig> = {
  // --- IDENTITY ---
  aadhaar: {
    type: 'aadhaar',
    displayName: 'Aadhaar Card',
    shortName: 'Aadhaar',
    category: 'identity',
    multiplicity: 'versioned',
    pageMode: 'front_back',
    supportsBackSide: true,
    visualType: 'aadhaar',
    defaultIssuer: 'Unique Identification Authority of India (UIDAI)',
    description: '12-digit Indian national biometric identity document with front and back address.',
    keywords: ['aadhaar', 'uidai', 'unique identification', 'mera aadhaar', 'government of india', 'vid', 'enrollment', 'help@uidai.gov.in', 'www.uidai.gov.in', '1947'],
    identifierPattern: /^\d{4}\s?\d{4}\s?\d{4}$/,
    identifierFormatDescription: '12-digit number (XXXX XXXX XXXX)',
  },
  pan: {
    type: 'pan',
    displayName: 'Permanent Account Number (PAN)',
    shortName: 'PAN Card',
    category: 'identity',
    multiplicity: 'singleton',
    pageMode: 'single',
    supportsBackSide: false,
    visualType: 'pan',
    defaultIssuer: 'Income Tax Department, Government of India',
    description: '10-character alphanumeric tax identity card issued by Income Tax Department.',
    keywords: ['income tax department', 'permanent account number', 'pan', 'govt of india', 'father', 'incometaxindia.gov.in'],
    identifierPattern: /^[A-Z]{5}[0-9]{4}[A-Z]{1}$/,
    identifierFormatDescription: '10-character alphanumeric (ABCDE1234F)',
  },
  passport: {
    type: 'passport',
    displayName: 'Indian Passport',
    shortName: 'Passport',
    category: 'identity',
    multiplicity: 'versioned',
    pageMode: 'front_back',
    supportsBackSide: true,
    visualType: 'passport',
    defaultIssuer: 'Ministry of External Affairs, Government of India',
    description: 'Official travel document containing biographical front and address back pages.',
    keywords: ['passport', 'republic of india', 'ministry of external affairs', 'type p', 'nationality', 'given names'],
    identifierPattern: /^[A-Z]{1}[0-9]{7}$/,
    identifierFormatDescription: 'Letter followed by 7 digits (e.g. Z1234567)',
  },
  'voter-id': {
    type: 'voter-id',
    displayName: 'Voter ID (EPIC)',
    shortName: 'Voter ID',
    category: 'identity',
    multiplicity: 'versioned',
    pageMode: 'front_back',
    supportsBackSide: true,
    visualType: 'voter-id',
    defaultIssuer: 'Election Commission of India',
    description: 'Electoral Photo Identity Card for voting rights and address proof.',
    keywords: ['election commission of india', 'electoral photo identity', 'epic', 'voter', 'elector name'],
    identifierPattern: /^[A-Z]{3}[0-9]{7}$/,
    identifierFormatDescription: '3 letters followed by 7 digits (e.g. ABC1234567)',
  },

  // --- EDUCATION ---
  degree: {
    type: 'degree',
    displayName: 'Degree Certificate',
    shortName: 'Degree',
    category: 'education',
    multiplicity: 'multiple',
    pageMode: 'multi_page',
    supportsBackSide: false,
    visualType: 'degree',
    defaultIssuer: 'University / Higher Education Institution',
    description: 'Undergraduate, Postgraduate, or Doctoral graduation degree certificate.',
    keywords: ['degree', 'university', 'bachelor', 'master', 'doctor of philosophy', 'institute of technology', 'faculty of', 'conferred', 'convocation'],
  },
  marksheet: {
    type: 'marksheet',
    displayName: 'Marksheet / Grade Transcript',
    shortName: 'Marksheet',
    category: 'education',
    multiplicity: 'multiple',
    pageMode: 'multi_page',
    supportsBackSide: false,
    visualType: 'marksheet',
    defaultIssuer: 'Examination Board / University',
    description: 'Semester marksheet, consolidated transcript, or grade record card.',
    keywords: ['statement of marks', 'grade card', 'marksheet', 'credits', 'cgpa', 'sgpa', 'semester', 'roll no', 'examination'],
  },
  'class-10-certificate': {
    type: 'class-10-certificate',
    displayName: 'Class 10 Matriculation Certificate',
    shortName: 'Class 10',
    category: 'education',
    multiplicity: 'multiple',
    pageMode: 'single',
    supportsBackSide: false,
    visualType: 'class-10-certificate',
    defaultIssuer: 'Central / State Secondary Education Board',
    description: 'Secondary School Examination passing certificate and date of birth proof.',
    keywords: ['secondary school examination', 'class 10', 'matriculation', 'cbse', 'icse', 'state board', 'passing certificate', 'date of birth'],
  },
  diploma: {
    type: 'diploma',
    displayName: 'Diploma Certificate',
    shortName: 'Diploma',
    category: 'education',
    multiplicity: 'multiple',
    pageMode: 'multi_page',
    supportsBackSide: false,
    visualType: 'diploma',
    defaultIssuer: 'Polytechnic / Educational Board',
    description: 'Technical or vocational diploma certification of completion.',
    keywords: ['diploma', 'polytechnic', 'state board of technical education', 'certificate in'],
  },

  // --- CERTIFICATES ---
  domicile: {
    type: 'domicile',
    displayName: 'Domicile / Residence Certificate',
    shortName: 'Domicile',
    category: 'certificate',
    multiplicity: 'versioned',
    pageMode: 'single',
    supportsBackSide: false,
    visualType: 'domicile',
    defaultIssuer: 'State Revenue Department / Tehsildar',
    description: 'Official proof of permanent residence within a specific state or territory.',
    keywords: ['domicile', 'residence certificate', 'permanent resident', 'tehsildar', 'sub-divisional magistrate', 'district magistrate'],
  },
  'income-certificate': {
    type: 'income-certificate',
    displayName: 'Income Certificate',
    shortName: 'Income Cert',
    category: 'certificate',
    multiplicity: 'versioned',
    pageMode: 'single',
    supportsBackSide: false,
    visualType: 'income-certificate',
    defaultIssuer: 'Revenue Department / District Magistrate',
    description: 'Annual family income certificate issued for academic or tax assessments.',
    keywords: ['income certificate', 'annual income', 'revenue department', 'family income', 'rupees'],
  },
  'caste-certificate': {
    type: 'caste-certificate',
    displayName: 'Caste / Community Certificate',
    shortName: 'Caste Cert',
    category: 'certificate',
    multiplicity: 'singleton',
    pageMode: 'single',
    supportsBackSide: false,
    visualType: 'caste-certificate',
    defaultIssuer: 'District Administration / Sub-Divisional Officer',
    description: 'Community or category proof issued under state government administration.',
    keywords: ['caste certificate', 'scheduled caste', 'scheduled tribe', 'other backward class', 'community', 'constitution'],
  },
  'birth-certificate': {
    type: 'birth-certificate',
    displayName: 'Birth Certificate',
    shortName: 'Birth Cert',
    category: 'certificate',
    multiplicity: 'singleton',
    pageMode: 'single',
    supportsBackSide: false,
    visualType: 'birth-certificate',
    defaultIssuer: 'Municipal Corporation / Registrar of Births',
    description: 'Official registration certificate of birth issued under national registration act.',
    keywords: ['birth certificate', 'registration of births', 'form 5', 'municipal corporation', 'date of birth', 'place of birth'],
  },

  // --- TRANSPORT ---
  'driving-licence': {
    type: 'driving-licence',
    displayName: 'Driving Licence',
    shortName: 'Driving Licence',
    category: 'transport',
    multiplicity: 'versioned',
    pageMode: 'front_back',
    supportsBackSide: true,
    visualType: 'driving-licence',
    defaultIssuer: 'Regional Transport Office (RTO), MoRTH',
    description: 'Motor vehicle driving licence containing vehicle endorsements, validity, and address.',
    keywords: ['driving licence', 'driving license', 'union of india', 'form 7', 'transport department', 'rto', 'morth', 'licence to drive', 'non-transport', 'transport'],
    identifierPattern: /^[A-Z]{2}[0-9]{2}[0-9]{11}$/,
    identifierFormatDescription: 'State code followed by RTO and registration numbers (e.g. DL01 20201234567)',
  },
  'vehicle-rc': {
    type: 'vehicle-rc',
    displayName: 'Vehicle Registration Certificate (RC)',
    shortName: 'Vehicle RC',
    category: 'transport',
    multiplicity: 'multiple',
    pageMode: 'front_back',
    supportsBackSide: true,
    visualType: 'vehicle-rc',
    defaultIssuer: 'Transport Department / Registering Authority',
    description: 'Motor vehicle registration card containing chassis, engine, and owner details.',
    keywords: ['certificate of registration', 'form 23', 'registration no', 'chassis no', 'engine no', 'registering authority', 'vahan'],
  },
  insurance: {
    type: 'insurance',
    displayName: 'Vehicle / General Insurance Policy',
    shortName: 'Insurance',
    category: 'transport',
    multiplicity: 'versioned',
    pageMode: 'multi_page',
    supportsBackSide: false,
    visualType: 'insurance',
    defaultIssuer: 'Insurance Regulatory and Development Authority (IRDAI) Registered Insurer',
    description: 'Comprehensive or third-party vehicle policy coverage and schedule certificate.',
    keywords: ['certificate of insurance', 'policy schedule', 'insured', 'premium', 'period of insurance', 'motor package'],
  },

  // --- FINANCIAL ---
  'tax-form': {
    type: 'tax-form',
    displayName: 'Form 16 / Tax Statement',
    shortName: 'Form 16',
    category: 'financial',
    multiplicity: 'multiple',
    pageMode: 'multi_page',
    supportsBackSide: false,
    visualType: 'tax-form',
    defaultIssuer: 'Employer / Central Board of Direct Taxes (CBDT)',
    description: 'Certificate under Section 203 of Income-tax Act for tax deducted at source.',
    keywords: ['form no 16', 'certificate under section 203', 'income tax act', 'tds', 'pan of employee', 'tan of employer', 'assessment year'],
  },

  // --- OTHER ---
  custom: {
    type: 'custom',
    displayName: 'Custom Document',
    shortName: 'Document',
    category: 'other',
    multiplicity: 'multiple',
    pageMode: 'multi_page',
    supportsBackSide: false,
    visualType: 'certificate',
    defaultIssuer: 'Document Issuer',
    description: 'Custom user document archived in the private vault.',
    keywords: [],
  },
}

export function getDocumentTypeConfig(typeKey: string): DocumentTypeConfig {
  if (DOCUMENT_TYPE_REGISTRY[typeKey]) {
    return DOCUMENT_TYPE_REGISTRY[typeKey]
  }

  // Fallback for custom or unrecognized document types
  return {
    type: typeKey,
    displayName: typeKey.charAt(0).toUpperCase() + typeKey.slice(1),
    shortName: typeKey.charAt(0).toUpperCase() + typeKey.slice(1),
    category: 'other',
    multiplicity: 'multiple',
    pageMode: 'single',
    supportsBackSide: false,
    visualType: 'certificate',
    defaultIssuer: 'Document Issuer',
    description: 'Archived document.',
    keywords: [],
  }
}

export function getDocumentTypesByCategory(category: DocumentCategory): DocumentTypeConfig[] {
  return Object.values(DOCUMENT_TYPE_REGISTRY).filter((cfg) => cfg.category === category)
}
