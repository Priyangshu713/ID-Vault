import type { ExtractedField, FieldConfidence, MetadataSource } from '../../data/types'
import type { OCRLine, OCRPageResult, OCRResult } from './ocrEngine'

export type ParsedDocumentMetadata = {
  holderName?: ExtractedField<string>
  documentIdentifier?: ExtractedField<string>
  maskedIdentifier?: ExtractedField<string>
  dateOfBirth?: ExtractedField<string>
  gender?: ExtractedField<string>
  address?: ExtractedField<string>
  fatherOrHusbandName?: ExtractedField<string>
  issueDate?: ExtractedField<string>
  expiryDate?: ExtractedField<string>
  issuer?: ExtractedField<string>
  overallPlausibility: 'plausible' | 'not_plausible' | 'unknown'
  plausibilityReason?: string
  detectedKeywords: string[]
}

const DISALLOWED_NAME_TOKENS = [
  'government',
  'govt',
  'india',
  'bharat',
  'sarkar',
  'uidai',
  'aadhaar',
  'aadhar',
  'unique',
  'identification',
  'authority',
  'enrollment',
  'enrolment',
  'father',
  'mother',
  'husband',
  'wife',
  'son',
  'daughter',
  'name',
  'dob',
  'birth',
  'date',
  'male',
  'female',
  'transgender',
  'address',
  'help',
  'income',
  'tax',
  'department',
  'permanent',
  'account',
  'number',
  'republic',
  'passport',
  'election',
  'commission',
  'electoral',
  'epic',
  'voter',
  'transport',
  'licence',
  'license',
  'union',
  'signature',
  'download',
  'issue',
  'expiry',
  'valid',
  'validity',
  'card',
  'mera',
  'pvc',
  'qr',
  'scan',
  'to',
  'digit',
]

/**
 * Cleans OCR lines by stripping punctuation artifacts, bars, and labels.
 */
function cleanCandidateText(raw: string): string {
  return raw
    .replace(/^[|\-_:.,~`'"]+/, '')
    .replace(/[|\-_:.,~`'"]+$/, '')
    .replace(/\s{2,}/g, ' ')
    .trim()
}

/**
 * Checks whether a line consists purely of noise / boilerplate document keywords.
 */
function isBoilerplateLine(line: string): boolean {
  const cleaned = cleanCandidateText(line).toLowerCase()
  if (cleaned.length < 3) return true

  const words = cleaned.split(/[\s/\\,]+/).filter((w) => w.length > 0)
  if (words.length === 0) return true

  const stopCount = words.filter((w) =>
    DISALLOWED_NAME_TOKENS.some((stop) => w === stop || w.includes(stop))
  ).length

  return stopCount >= Math.ceil(words.length * 0.6)
}

/**
 * Validates if a text string looks like a legitimate person name.
 */
function isPlausiblePersonName(name: string): boolean {
  const cleaned = cleanCandidateText(name)
  if (cleaned.length < 3 || cleaned.length > 40) return false
  if (isBoilerplateLine(cleaned)) return false

  // Must contain only alphabetic characters, spaces, and periods
  if (!/^[A-Za-z\s.]{3,40}$/.test(cleaned)) return false

  const words = cleaned.split(/\s+/).filter((w) => w.length > 1)
  return words.length >= 1 && words.length <= 5
}

// --------------------------------------------------------------------------
// 1. AADHAAR PARSER (Advanced Candidate Scoring)
// --------------------------------------------------------------------------
export function parseAadhaar(ocr: OCRResult): ParsedDocumentMetadata {
  const allText = ocr.rawText
  const lowerText = allText.toLowerCase()
  const frontPage = ocr.pages.find((p) => p.side === 'front') || ocr.pages[0]
  const backPage = ocr.pages.find((p) => p.side === 'back') || (ocr.pages.length > 1 ? ocr.pages[1] : undefined)

  const detectedKeywords: string[] = []
  const aadhaarKeywords = [
    'aadhaar',
    'aadhar',
    'uidai',
    'unique identification',
    'government of india',
    'mera aadhaar',
    'enrollment',
    'vid',
    'mera aadhar',
    'meraaadhaar',
  ]
  aadhaarKeywords.forEach((kw) => {
    if (lowerText.includes(kw)) detectedKeywords.push(kw)
  })

  const result: ParsedDocumentMetadata = {
    overallPlausibility: detectedKeywords.length > 0 ? 'plausible' : 'unknown',
    detectedKeywords,
  }

  // 1. Aadhaar Number (12 digits, often formatted as 4-4-4)
  const uidRegex = /\b([2-9]\d{3}\s?\d{4}\s?\d{4})\b/
  const numMatch = allText.match(uidRegex)
  if (numMatch) {
    const rawNum = numMatch[1].replace(/\s+/g, '')
    if (rawNum.length === 12) {
      const formatted = `${rawNum.slice(0, 4)} ${rawNum.slice(4, 8)} ${rawNum.slice(8, 12)}`
      result.documentIdentifier = {
        value: formatted,
        source: 'document',
        confidence: 'high',
        evidence: `Detected 12-digit Aadhaar: "${numMatch[0]}"`,
      }
      result.maskedIdentifier = {
        value: `XXXX XXXX ${rawNum.slice(8, 12)}`,
        source: 'document',
        confidence: 'high',
      }
    }
  }

  // 2. Date of Birth (DOB / YOB / Multilingual)
  const dobRegex = /(?:DOB|Date\s*of\s*Birth|जन्म\s*तिथि|DOB\s*[:\-\/]|Birth)\s*[:\-\/]?\s*(\d{2}[/-]\d{2}[/-]\d{4})/i
  const yobRegex = /(?:Year\s*of\s*Birth|जन्म\s*वर्ष|YOB)\s*[:\-\/]?\s*(\d{4})/i
  const dobMatch = allText.match(dobRegex)
  const yobMatch = allText.match(yobRegex)

  if (dobMatch) {
    result.dateOfBirth = {
      value: dobMatch[1].replace(/-/g, '/'),
      source: 'document',
      confidence: 'high',
      evidence: dobMatch[0],
    }
  } else if (yobMatch) {
    result.dateOfBirth = {
      value: yobMatch[1],
      source: 'document',
      confidence: 'medium',
      evidence: yobMatch[0],
    }
  } else {
    // Standard DD/MM/YYYY date fallback
    const dateMatch = allText.match(/\b(\d{2}\/\d{2}\/\d{4})\b/)
    if (dateMatch) {
      result.dateOfBirth = {
        value: dateMatch[1],
        source: 'document',
        confidence: 'medium',
      }
    }
  }

  // 3. Gender
  const genderMatch = allText.match(/\b(MALE|FEMALE|TRANSGENDER|पुरुष|महिला)\b/i)
  if (genderMatch) {
    const rawG = genderMatch[1].toUpperCase()
    const normalized = rawG === 'FEMALE' || rawG === 'महिला' ? 'Female' : 'Male'
    result.gender = {
      value: normalized,
      source: 'document',
      confidence: 'high',
    }
  }

  // 4. Candidate Name Scoring Engine for Front Page
  const linesToScan = frontPage ? frontPage.lines : ocr.pages.flatMap((p) => p.lines)
  type ScoredCandidate = { name: string; score: number; evidence: string }
  const candidates: ScoredCandidate[] = []

  for (let i = 0; i < linesToScan.length; i++) {
    const rawLine = linesToScan[i]
    let cleaned = cleanCandidateText(rawLine)

    // Strip prefixes like "Name:", "To,", "To ", etc.
    cleaned = cleaned.replace(/^(?:Name|To|Holder)\s*[:\-,]?\s*/i, '').trim()

    if (!isPlausiblePersonName(cleaned)) continue

    let score = 30 // Base score for valid alphabetic line
    let evidence = `Line ${i + 1}: "${cleaned}"`

    // Check adjacent lines for DOB, Gender, or Government header
    const prevLine = linesToScan[i - 1]?.toLowerCase() || ''
    const nextLine = linesToScan[i + 1]?.toLowerCase() || ''
    const nextNextLine = linesToScan[i + 2]?.toLowerCase() || ''

    if (nextLine.includes('dob') || nextLine.includes('birth') || nextLine.includes('जन्म') || /\d{2}\/\d{2}\/\d{4}/.test(nextLine)) {
      score += 50
      evidence = `Found directly above DOB line: "${cleaned}"`
    } else if (nextNextLine.includes('dob') || nextNextLine.includes('birth') || /\d{2}\/\d{2}\/\d{4}/.test(nextNextLine)) {
      score += 35
    }

    if (nextLine.includes('male') || nextLine.includes('female') || nextLine.includes('पुरुष') || nextLine.includes('महिला')) {
      score += 30
    }

    if (prevLine.includes('government') || prevLine.includes('india') || prevLine.includes('bharat') || prevLine.includes('uidai')) {
      score += 25
    }

    // Capitalization & multi-word structure bonuses
    const words = cleaned.split(/\s+/)
    if (words.length >= 2 && words.length <= 4) score += 20
    if (cleaned === cleaned.toUpperCase() && cleaned.length >= 6) score += 15
    if (/^[A-Z][a-z]+(\s[A-Z][a-z]+)+$/.test(cleaned)) score += 15

    candidates.push({ name: cleaned, score, evidence })
  }

  // Sort candidates by score descending
  candidates.sort((a, b) => b.score - a.score)

  if (candidates.length > 0 && candidates[0].score >= 40) {
    const winner = candidates[0]
    result.holderName = {
      value: winner.name,
      source: 'document',
      confidence: winner.score >= 70 ? 'high' : 'medium',
      evidence: winner.evidence,
    }
  }

  // 5. Back Side Address Extraction
  const targetForAddress = backPage ? backPage.text : allText
  const addressMatch = targetForAddress.match(/(?:Address|Address\s*[:\-\/]|पता)\s*[:\-\/]?\s*([\s\S]{12,180}?)(?:\b\d{6}\b)/i)
  if (addressMatch) {
    const rawAddr = addressMatch[1].replace(/\n+/g, ', ').replace(/\s{2,}/g, ' ').trim()
    const pinMatch = targetForAddress.match(/\b(\d{6})\b/)
    const fullAddress = pinMatch && !rawAddr.includes(pinMatch[1]) ? `${rawAddr}, ${pinMatch[1]}` : rawAddr

    result.address = {
      value: fullAddress,
      source: 'document',
      confidence: 'high',
      evidence: 'Extracted from back side address block',
    }
  }

  result.issuer = {
    value: 'Unique Identification Authority of India (UIDAI)',
    source: 'document',
    confidence: 'high',
  }

  if (detectedKeywords.length === 0 && !result.documentIdentifier) {
    result.overallPlausibility = 'not_plausible'
    result.plausibilityReason = "This file doesn't appear to match the selected Aadhaar document."
  }

  return result
}

// --------------------------------------------------------------------------
// 2. PAN PARSER (Advanced Candidate Scoring)
// --------------------------------------------------------------------------
export function parsePAN(ocr: OCRResult): ParsedDocumentMetadata {
  const allText = ocr.rawText
  const lowerText = allText.toLowerCase()

  const detectedKeywords: string[] = []
  const panKeywords = ['income tax department', 'permanent account number', 'govt. of india', 'incometax', 'pan card']
  panKeywords.forEach((kw) => {
    if (lowerText.includes(kw)) detectedKeywords.push(kw)
  })

  const result: ParsedDocumentMetadata = {
    overallPlausibility: detectedKeywords.length > 0 ? 'plausible' : 'unknown',
    detectedKeywords,
  }

  // 1. PAN Regex: 5 letters, 4 digits, 1 letter
  const panRegex = /\b([A-Z]{5}[0-9]{4}[A-Z]{1})\b/
  const panMatch = allText.match(panRegex)
  if (panMatch) {
    const panNum = panMatch[1]
    result.documentIdentifier = {
      value: panNum,
      source: 'document',
      confidence: 'high',
      evidence: `Detected valid PAN format: "${panNum}"`,
    }
    result.maskedIdentifier = {
      value: `XXXXX${panNum.slice(5)}`,
      source: 'document',
      confidence: 'high',
    }
  }

  // 2. Date of Birth
  const dobMatch = allText.match(/\b(\d{2}[/-]\d{2}[/-]\d{4})\b/)
  if (dobMatch) {
    result.dateOfBirth = {
      value: dobMatch[1].replace(/-/g, '/'),
      source: 'document',
      confidence: 'high',
    }
  }

  // 3. Holder Name & Father's Name via positional anchors
  const lines = allText.split('\n').map(cleanCandidateText).filter((l) => l.length > 0)
  for (let i = 0; i < lines.length; i++) {
    const line = lines[i]
    if (line.match(/Father's Name|Father Name|Father/i)) {
      // Line above Father's Name is usually the Holder Name
      if (i > 0) {
        const candidateHolder = lines[i - 1]
        if (isPlausiblePersonName(candidateHolder)) {
          result.holderName = {
            value: candidateHolder,
            source: 'document',
            confidence: 'high',
            evidence: `Found above Father's Name line: "${candidateHolder}"`,
          }
        }
      }
      // Line below Father's Name is the Father's Name
      if (i < lines.length - 1) {
        const candidateFather = lines[i + 1]
        if (isPlausiblePersonName(candidateFather)) {
          result.fatherOrHusbandName = {
            value: candidateFather,
            source: 'document',
            confidence: 'high',
            evidence: `Found below Father's Name line: "${candidateFather}"`,
          }
        }
      }
    }
  }

  // Fallback: search for uppercase name between Income Tax header and DOB
  if (!result.holderName) {
    for (const l of lines) {
      if (isPlausiblePersonName(l) && l === l.toUpperCase() && l.length >= 6) {
        result.holderName = {
          value: l,
          source: 'document',
          confidence: 'medium',
        }
        break
      }
    }
  }

  result.issuer = {
    value: 'Income Tax Department, Government of India',
    source: 'document',
    confidence: 'high',
  }

  if (detectedKeywords.length === 0 && !result.documentIdentifier) {
    result.overallPlausibility = 'not_plausible'
    result.plausibilityReason = "This file doesn't appear to match the selected PAN Card."
  }

  return result
}

// --------------------------------------------------------------------------
// 3. DRIVING LICENCE PARSER
// --------------------------------------------------------------------------
export function parseDrivingLicence(ocr: OCRResult): ParsedDocumentMetadata {
  const allText = ocr.rawText
  const lowerText = allText.toLowerCase()

  const detectedKeywords: string[] = []
  const dlKeywords = ['driving licence', 'driving license', 'transport', 'union of india', 'form 7', 'rto', 'morth', 'licence no']
  dlKeywords.forEach((kw) => {
    if (lowerText.includes(kw)) detectedKeywords.push(kw)
  })

  const result: ParsedDocumentMetadata = {
    overallPlausibility: detectedKeywords.length > 0 ? 'plausible' : 'unknown',
    detectedKeywords,
  }

  // 1. DL Number Regex
  const dlRegex = /\b([A-Z]{2}[-\s]?[0-9]{2}[-\s]?[0-9]{4}[0-9]{7})\b|\b([A-Z]{2}[0-9]{2}\s?[0-9]{11})\b|\b(DL[-\s]?[0-9A-Z]{10,16})\b/
  const dlMatch = allText.match(dlRegex)
  if (dlMatch) {
    const rawDl = (dlMatch[1] || dlMatch[2] || dlMatch[3]).replace(/\s+/g, '')
    result.documentIdentifier = {
      value: rawDl,
      source: 'document',
      confidence: 'high',
    }
    result.maskedIdentifier = {
      value: `XXXXXXXX${rawDl.slice(-4)}`,
      source: 'document',
      confidence: 'high',
    }
  }

  // 2. Dates
  const dobMatch = allText.match(/(?:DOB|Date\s*of\s*Birth)\s*[:\-]?\s*(\d{2}[/-]\d{2}[/-]\d{4})/i)
  if (dobMatch) {
    result.dateOfBirth = {
      value: dobMatch[1].replace(/-/g, '/'),
      source: 'document',
      confidence: 'high',
    }
  }

  const validMatch = allText.match(/(?:Valid Till|Validity|Valid Upto|NT)\s*[:\-]?\s*(\d{2}[/-]\d{2}[/-]\d{4})/i)
  if (validMatch) {
    result.expiryDate = {
      value: validMatch[1].replace(/-/g, '/'),
      source: 'document',
      confidence: 'high',
    }
  }

  // 3. Holder Name
  const nameMatch = allText.match(/(?:Name|Holder)\s*[:\-]?\s*([A-Za-z\s.]{3,35})/i)
  if (nameMatch && isPlausiblePersonName(nameMatch[1])) {
    result.holderName = {
      value: cleanCandidateText(nameMatch[1]),
      source: 'document',
      confidence: 'high',
    }
  }

  result.issuer = {
    value: 'Regional Transport Office (RTO), MoRTH',
    source: 'document',
    confidence: 'high',
  }

  if (detectedKeywords.length === 0 && !result.documentIdentifier) {
    result.overallPlausibility = 'not_plausible'
    result.plausibilityReason = "This file doesn't appear to match the selected Driving Licence."
  }

  return result
}

// --------------------------------------------------------------------------
// 4. PASSPORT PARSER
// --------------------------------------------------------------------------
export function parsePassport(ocr: OCRResult): ParsedDocumentMetadata {
  const allText = ocr.rawText
  const lowerText = allText.toLowerCase()

  const detectedKeywords: string[] = []
  const passportKeywords = ['passport', 'republic of india', 'ministry of external affairs', 'type p', 'nationality', 'given name']
  passportKeywords.forEach((kw) => {
    if (lowerText.includes(kw)) detectedKeywords.push(kw)
  })

  const result: ParsedDocumentMetadata = {
    overallPlausibility: detectedKeywords.length > 0 ? 'plausible' : 'unknown',
    detectedKeywords,
  }

  // 1. Passport Number: 1 letter followed by 7 digits
  const passRegex = /\b([A-Z]{1}[0-9]{7})\b/
  const passMatch = allText.match(passRegex)
  if (passMatch) {
    const pNum = passMatch[1]
    result.documentIdentifier = {
      value: pNum,
      source: 'document',
      confidence: 'high',
    }
    result.maskedIdentifier = {
      value: `XXXXXXX${pNum.slice(-3)}`,
      source: 'document',
      confidence: 'high',
    }
  }

  // 2. Dates
  const dobMatch = allText.match(/(?:Date\s*of\s*Birth|DOB)\s*[:\-]?\s*(\d{2}[/-]\d{2}[/-]\d{4})/i)
  if (dobMatch) {
    result.dateOfBirth = {
      value: dobMatch[1].replace(/-/g, '/'),
      source: 'document',
      confidence: 'high',
    }
  }

  const expiryMatch = allText.match(/(?:Date\s*of\s*Expiry|Expiry)\s*[:\-]?\s*(\d{2}[/-]\d{2}[/-]\d{4})/i)
  if (expiryMatch) {
    result.expiryDate = {
      value: expiryMatch[1].replace(/-/g, '/'),
      source: 'document',
      confidence: 'high',
    }
  }

  // 3. Names
  const givenNameMatch = allText.match(/(?:Given Name[s]?)\s*[:\-]?\s*([A-Za-z\s.]{2,35})/i)
  const surnameMatch = allText.match(/(?:Surname)\s*[:\-]?\s*([A-Za-z\s.]{2,30})/i)
  if (givenNameMatch) {
    const fullName = surnameMatch ? `${givenNameMatch[1].trim()} ${surnameMatch[1].trim()}` : givenNameMatch[1].trim()
    result.holderName = {
      value: cleanCandidateText(fullName),
      source: 'document',
      confidence: 'high',
    }
  }

  result.issuer = {
    value: 'Ministry of External Affairs, Government of India',
    source: 'document',
    confidence: 'high',
  }

  if (detectedKeywords.length === 0 && !result.documentIdentifier) {
    result.overallPlausibility = 'not_plausible'
    result.plausibilityReason = "This file doesn't appear to match the selected Passport."
  }

  return result
}

// --------------------------------------------------------------------------
// 5. VOTER ID (EPIC) PARSER
// --------------------------------------------------------------------------
export function parseVoterId(ocr: OCRResult): ParsedDocumentMetadata {
  const allText = ocr.rawText
  const lowerText = allText.toLowerCase()

  const detectedKeywords: string[] = []
  const voterKeywords = ['election commission', 'electoral photo identity', 'epic', 'voter', 'elector name']
  voterKeywords.forEach((kw) => {
    if (lowerText.includes(kw)) detectedKeywords.push(kw)
  })

  const result: ParsedDocumentMetadata = {
    overallPlausibility: detectedKeywords.length > 0 ? 'plausible' : 'unknown',
    detectedKeywords,
  }

  // 1. EPIC No: 3 letters followed by 7 digits
  const epicRegex = /\b([A-Z]{3}[0-9]{7})\b/
  const epicMatch = allText.match(epicRegex)
  if (epicMatch) {
    const eNum = epicMatch[1]
    result.documentIdentifier = {
      value: eNum,
      source: 'document',
      confidence: 'high',
    }
    result.maskedIdentifier = {
      value: `XXXXXXX${eNum.slice(-3)}`,
      source: 'document',
      confidence: 'high',
    }
  }

  // 2. Elector Name
  const nameMatch = allText.match(/(?:Elector['\s]*s Name|Name)\s*[:\-]?\s*([A-Za-z\s.]{3,35})/i)
  if (nameMatch && isPlausiblePersonName(nameMatch[1])) {
    result.holderName = {
      value: cleanCandidateText(nameMatch[1]),
      source: 'document',
      confidence: 'high',
    }
  }

  result.issuer = {
    value: 'Election Commission of India',
    source: 'document',
    confidence: 'high',
  }

  return result
}

// --------------------------------------------------------------------------
// 6. GENERIC / CERTIFICATE / EDUCATION PARSER
// --------------------------------------------------------------------------
export function parseGenericDocument(ocr: OCRResult, documentTypeLabel: string): ParsedDocumentMetadata {
  const allText = ocr.rawText

  const result: ParsedDocumentMetadata = {
    overallPlausibility: allText.trim().length > 20 ? 'plausible' : 'unknown',
    detectedKeywords: [],
  }

  // Look for dates
  const dateMatch = allText.match(/\b(\d{2}[/-]\d{2}[/-]\d{4})\b/)
  if (dateMatch) {
    result.issueDate = {
      value: dateMatch[1].replace(/-/g, '/'),
      source: 'document',
      confidence: 'medium',
    }
  }

  // Look for explicit Name lines
  const nameMatch = allText.match(/(?:Name|Student Name|Candidate Name|Holder)\s*[:\-]?\s*([A-Za-z\s.]{3,35})/i)
  if (nameMatch && isPlausiblePersonName(nameMatch[1])) {
    result.holderName = {
      value: cleanCandidateText(nameMatch[1]),
      source: 'document',
      confidence: 'medium',
    }
  }

  return result
}

// --------------------------------------------------------------------------
// DISPATCHER
// --------------------------------------------------------------------------
export function parseOCRResult(ocr: OCRResult, documentTypeKey: string): ParsedDocumentMetadata {
  switch (documentTypeKey) {
    case 'aadhaar':
      return parseAadhaar(ocr)
    case 'pan':
      return parsePAN(ocr)
    case 'driving-licence':
      return parseDrivingLicence(ocr)
    case 'passport':
      return parsePassport(ocr)
    case 'voter-id':
      return parseVoterId(ocr)
    default:
      return parseGenericDocument(ocr, documentTypeKey)
  }
}
