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

// --- Verhoeff Checksum & Auto-Correction for Indian 12-Digit Identifiers ---
const dTable = [
  [0, 1, 2, 3, 4, 5, 6, 7, 8, 9],
  [1, 2, 3, 4, 0, 6, 7, 8, 9, 5],
  [2, 3, 4, 0, 1, 7, 8, 9, 5, 6],
  [3, 4, 0, 1, 2, 8, 9, 5, 6, 7],
  [4, 0, 1, 2, 3, 9, 5, 6, 7, 8],
  [5, 9, 8, 7, 6, 0, 4, 3, 2, 1],
  [6, 5, 9, 8, 7, 1, 0, 4, 3, 2],
  [7, 6, 5, 9, 8, 2, 1, 0, 4, 3],
  [8, 7, 6, 5, 9, 3, 2, 1, 0, 4],
  [9, 8, 7, 6, 5, 4, 3, 2, 1, 0],
]

const pTable = [
  [0, 1, 2, 3, 4, 5, 6, 7, 8, 9],
  [1, 5, 7, 6, 2, 8, 3, 0, 9, 4],
  [5, 8, 0, 3, 7, 9, 6, 1, 4, 2],
  [8, 9, 1, 6, 0, 4, 3, 5, 2, 7],
  [9, 4, 5, 3, 1, 2, 6, 8, 7, 0],
  [4, 2, 8, 6, 5, 7, 3, 9, 0, 1],
  [2, 7, 9, 3, 8, 0, 6, 4, 1, 5],
  [7, 0, 4, 6, 9, 1, 3, 2, 5, 8],
]

export function validateVerhoeff(numStr: string): boolean {
  const digits = numStr.replace(/\D/g, '')
  if (digits.length !== 12) return false

  let c = 0
  const reversed = digits.split('').reverse().map(Number)
  for (let i = 0; i < reversed.length; i++) {
    c = dTable[c][pTable[i % 8][reversed[i]]]
  }
  return c === 0
}

const DIGIT_OCR_CONFUSIONS: Record<string, string[]> = {
  '0': ['9', '8', '6', '1'],
  '9': ['0', '8', '3'],
  '8': ['0', '9', '3', '6'],
  '6': ['0', '5', '8'],
  '5': ['6', '3', '9'],
  '3': ['8', '9', '5'],
  '1': ['7', '4'],
  '7': ['1', '2'],
  '2': ['7', '3'],
  '4': ['1', '9'],
}

export function correctAadhaarVerhoeff(raw12Digits: string): string {
  const clean = raw12Digits.replace(/\D/g, '')
  if (clean.length !== 12) return clean

  if (validateVerhoeff(clean)) {
    return clean
  }

  // Try 1-digit confusion correction
  for (let i = 0; i < clean.length; i++) {
    const origChar = clean[i]
    const alternates = DIGIT_OCR_CONFUSIONS[origChar] || []
    for (const alt of alternates) {
      const candidate = clean.slice(0, i) + alt + clean.slice(i + 1)
      if (validateVerhoeff(candidate)) {
        return candidate
      }
    }
  }

  return clean
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
  'purush',
  'mahila',
  'gender',
  'sex',
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
  'meri',
  'pehchan',
  'pechan',
  'pvc',
  'qr',
  'scan',
  'to',
  'digit',
  'vid',
  'janm',
  'tithi',
  'dinank',
  'pata',
  'praman',
  'suchna',
  'offline',
  'xml',
  'online',
  'authentication',
  'proof',
  'citizenship',
]

/**
 * Cleans OCR lines by stripping punctuation artifacts, bars, and labels.
 */
function cleanCandidateText(raw: string): string {
  return raw
    .replace(/[^A-Za-z\s.]/g, ' ')
    .replace(/\s{2,}/g, ' ')
    .trim()
}

/**
 * Formats name string to standard Title Case (e.g. "PRIYANGSHU DUTTA" -> "Priyangshu Dutta").
 */
function toTitleCase(str: string): string {
  return str
    .toLowerCase()
    .split(/\s+/)
    .map((w) => w.charAt(0).toUpperCase() + w.slice(1))
    .join(' ')
}

/**
 * Checks whether a line consists purely of noise / boilerplate document keywords.
 */
function isBoilerplateLine(line: string): boolean {
  const cleaned = cleanCandidateText(line).toLowerCase()
  if (cleaned.length < 3) return true

  const words = cleaned.split(/\s+/).filter((w) => w.length > 0)
  if (words.length === 0) return true

  return words.some((w) => DISALLOWED_NAME_TOKENS.includes(w))
}

/**
 * Validates if a text string looks like a legitimate person name.
 */
function isPlausiblePersonName(name: string): boolean {
  const cleaned = cleanCandidateText(name)
  if (cleaned.length < 3 || cleaned.length > 40) return false

  const words = cleaned.split(/\s+/).filter((w) => w.length > 0)
  if (words.length === 0 || words.length > 5) return false

  const lowerWords = words.map((w) => w.toLowerCase())

  // Disallow if ANY token matches a known stopword or gender
  if (lowerWords.some((w) => DISALLOWED_NAME_TOKENS.includes(w))) {
    return false
  }

  // Each word must have at least one vowel (unless it's a single capital initial like "P.")
  for (const w of words) {
    const pure = w.replace(/[^A-Za-z]/g, '')
    if (pure.length === 1 && !/^[A-Z]$/.test(pure)) return false
    if (pure.length >= 2 && !/[aeiouyAEIOUY]/.test(pure)) return false
  }

  // Disallow all-caps short noise sequences like "TID ITNT HAA" or "IIT HAA"
  if (cleaned === cleaned.toUpperCase()) {
    const isAllShort = words.every((w) => w.length <= 4)
    if (isAllShort && words.length >= 2) {
      return false
    }
  }

  // Must have at least one substantial word (length >= 3 with vowels)
  const hasSubstantialWord = words.some((w) => {
    const pure = w.replace(/[^A-Za-z]/g, '')
    return pure.length >= 3 && /[aeiouyAEIOUY]/.test(pure)
  })
  if (!hasSubstantialWord) return false

  return true
}

// --------------------------------------------------------------------------
// 1. AADHAAR PARSER (Advanced Candidate Scoring)
// --------------------------------------------------------------------------
export function parseAadhaar(ocr: OCRResult): ParsedDocumentMetadata {
  const allText = ocr.rawText
  const lowerText = allText.toLowerCase()
  const frontPage = ocr.pages.find((p) => p.side === 'front') || ocr.pages[0]
  const backPage = ocr.pages.find((p) => p.side === 'back') || (ocr.pages.length > 1 ? ocr.pages[1] : undefined)
  const linesToScan = frontPage ? frontPage.lines : ocr.pages.flatMap((p) => p.lines)

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

  // 1. Aadhaar Number (Multi-Strategy: Standard UID, 3x 4-digit groups, OCR confusion normalization, Masked UID)
  let detectedUid: { formatted: string; masked: string; evidence: string } | null = null

  // Strategy 1A: Standard 12-digit UID pattern
  const uid12Regex = /\b([2-9]\d{3}[\s.\-_]?\d{4}[\s.\-_]?\d{4})\b|\b([2-9]\d{11})\b/
  const m1 = allText.match(uid12Regex)
  if (m1) {
    const raw = (m1[1] || m1[2]).replace(/\D/g, '')
    if (raw.length === 12) {
      const corrected = correctAadhaarVerhoeff(raw)
      detectedUid = {
        formatted: `${corrected.slice(0, 4)} ${corrected.slice(4, 8)} ${corrected.slice(8, 12)}`,
        masked: `XXXX XXXX ${corrected.slice(8, 12)}`,
        evidence: m1[0],
      }
    }
  }

  // Strategy 1B: Scan all lines for three 4-digit groups
  if (!detectedUid) {
    for (const line of linesToScan) {
      const cleaned = line.replace(/[^\d\sXx*•]/g, ' ').replace(/\s{2,}/g, ' ').trim()
      const fourDigitGroups = cleaned.match(/\b\d{4}\b/g)
      if (fourDigitGroups && fourDigitGroups.length >= 3) {
        const candidateRaw = fourDigitGroups.slice(0, 3).join('')
        if (/^[2-9]\d{11}$/.test(candidateRaw)) {
          const corrected = correctAadhaarVerhoeff(candidateRaw)
          detectedUid = {
            formatted: `${corrected.slice(0, 4)} ${corrected.slice(4, 8)} ${corrected.slice(8, 12)}`,
            masked: `XXXX XXXX ${corrected.slice(8, 12)}`,
            evidence: line,
          }
          break
        }
      }
    }
  }

  // Strategy 1C: Normalize OCR character confusions (e.g. O->0, l/I->1, S->5, b->6, B->8, Z->2)
  if (!detectedUid) {
    for (const line of linesToScan) {
      const normalized = line
        .replace(/[oO]/g, '0')
        .replace(/[Il|]/g, '1')
        .replace(/[Zz]/g, '2')
        .replace(/[sS]/g, '5')
        .replace(/[b]/g, '6')
        .replace(/[B]/g, '8')

      const mNorm = normalized.match(/\b([2-9]\d{3}[\s.\-_]?\d{4}[\s.\-_]?\d{4})\b|\b([2-9]\d{11})\b/)
      if (mNorm) {
        const raw = (mNorm[1] || mNorm[2]).replace(/\D/g, '')
        if (raw.length === 12) {
          const corrected = correctAadhaarVerhoeff(raw)
          detectedUid = {
            formatted: `${corrected.slice(0, 4)} ${corrected.slice(4, 8)} ${corrected.slice(8, 12)}`,
            masked: `XXXX XXXX ${corrected.slice(8, 12)}`,
            evidence: line,
          }
          break
        }
      }
    }
  }

  // Strategy 1D: Masked UID pattern (XXXX XXXX 1234)
  if (!detectedUid) {
    const maskedUidRegex = /\b([Xx*•]{4}[\s.\-_]?[Xx*•]{4}[\s.\-_]?\d{4})\b/i
    const mMask = allText.match(maskedUidRegex)
    if (mMask) {
      const digitsOnly = mMask[1].replace(/\D/g, '')
      const last4 = digitsOnly.slice(-4)
      detectedUid = {
        formatted: `XXXX XXXX ${last4}`,
        masked: `XXXX XXXX ${last4}`,
        evidence: mMask[0],
      }
    }
  }

  if (detectedUid) {
    result.documentIdentifier = {
      value: detectedUid.formatted,
      source: 'document',
      confidence: 'high',
      evidence: `Detected Aadhaar number: "${detectedUid.formatted}"`,
    }
    result.maskedIdentifier = {
      value: detectedUid.masked,
      source: 'document',
      confidence: 'high',
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
  // Step 4A: Check for lines immediately above DOB line (highest spatial certainty on Indian Aadhaar)
  let dobLineIndex = -1
  for (let i = 0; i < linesToScan.length; i++) {
    const l = linesToScan[i].toLowerCase()
    if (l.includes('dob') || l.includes('birth') || l.includes('जन्म') || /\d{2}[/-]\d{2}[/-]\d{4}/.test(l)) {
      dobLineIndex = i
      break
    }
  }

  let extractedName: string | undefined

  if (dobLineIndex > 0) {
    for (let j = dobLineIndex - 1; j >= Math.max(0, dobLineIndex - 3); j--) {
      const rawLine = linesToScan[j]
      const cleaned = cleanCandidateText(rawLine).replace(/^(?:Name|To|Holder)\s*[:\-,]?\s*/i, '').trim()

      const latinMatch = cleaned.match(/([A-Za-z]{2,}(?:\s+[A-Za-z]{2,})+)/)
      const candidate = latinMatch ? latinMatch[1].trim() : cleaned

      if (isPlausiblePersonName(candidate)) {
        extractedName = toTitleCase(candidate)
        break
      }
    }
  }

  // Step 4B: Scan all lines if above DOB line wasn't found
  if (!extractedName) {
    for (let i = 0; i < linesToScan.length; i++) {
      const rawLine = linesToScan[i]
      const cleaned = cleanCandidateText(rawLine).replace(/^(?:Name|To|Holder)\s*[:\-,]?\s*/i, '').trim()

      const latinMatch = cleaned.match(/([A-Za-z]{2,}(?:\s+[A-Za-z]{2,})+)/)
      const candidate = latinMatch ? latinMatch[1].trim() : cleaned

      if (isPlausiblePersonName(candidate)) {
        extractedName = toTitleCase(candidate)
        break
      }
    }
  }

  if (extractedName) {
    result.holderName = {
      value: extractedName,
      source: 'document',
      confidence: 'high',
      evidence: `Detected cardholder name: "${extractedName}"`,
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
// --------------------------------------------------------------------------
// 2. PAN PARSER (Multi-Strategy Extraction with OCR Normalization)
// --------------------------------------------------------------------------
export function parsePAN(ocr: OCRResult): ParsedDocumentMetadata {
  const allText = ocr.rawText
  const lowerText = allText.toLowerCase()
  const frontPage = ocr.pages.find((p) => p.side === 'front') || ocr.pages[0]
  const linesToScan = frontPage ? frontPage.lines : ocr.pages.flatMap((p) => p.lines)

  const detectedKeywords: string[] = []
  const panKeywords = [
    'income tax department',
    'permanent account number',
    'govt. of india',
    'govt of india',
    'incometax',
    'pan card',
    'income tax',
    'आयकर विभाग',
    'भारत सरकार',
    'स्थायी खाता संख्या',
  ]
  panKeywords.forEach((kw) => {
    if (lowerText.includes(kw)) detectedKeywords.push(kw)
  })

  const result: ParsedDocumentMetadata = {
    overallPlausibility: detectedKeywords.length > 0 ? 'plausible' : 'unknown',
    detectedKeywords,
  }

  // 1. PAN Number Extraction (Multi-Strategy with OCR Confusion Normalization)
  let detectedPAN: { pan: string; masked: string; evidence: string } | null = null

  // Strategy 1A: Direct Regex Match: 5 letters, 4 digits, 1 letter (case insensitive)
  const directMatch = allText.match(/\b([A-Za-z]{5}[0-9]{4}[A-Za-z]{1})\b/)
  if (directMatch) {
    const pan = directMatch[1].toUpperCase()
    detectedPAN = {
      pan,
      masked: `XXXXX${pan.slice(5)}`,
      evidence: directMatch[0],
    }
  }

  // Strategy 1B: Continuous or Spaced PAN in lines (e.g. "ABCDP 1234 D", "ABCDE-1234-F", "ABCDP 12O4 D")
  if (!detectedPAN) {
    for (const line of linesToScan) {
      const cleanLine = line.replace(/[^A-Za-z0-9]/g, '')

      for (let i = 0; i <= cleanLine.length - 10; i++) {
        const candidate10 = cleanLine.slice(i, i + 10)

        // Part 1: First 5 should be letters (correct digits 0->O, 1->I, 5->S, 8->B, 2->Z)
        const part1 = candidate10
          .slice(0, 5)
          .replace(/0/g, 'O')
          .replace(/1/g, 'I')
          .replace(/5/g, 'S')
          .replace(/8/g, 'B')
          .replace(/2/g, 'Z')
          .toUpperCase()

        // Part 2: Middle 4 should be digits (correct letters O->0, I/l/|->1, S->5, B->8, Z->2, b->6)
        const part2 = candidate10
          .slice(5, 9)
          .replace(/[oO]/g, '0')
          .replace(/[Il|]/g, '1')
          .replace(/[sS]/g, '5')
          .replace(/[bB]/g, '8')
          .replace(/[zZ]/g, '2')

        // Part 3: Last 1 should be letter
        const part3 = candidate10
          .slice(9, 10)
          .replace(/0/g, 'O')
          .replace(/1/g, 'I')
          .replace(/5/g, 'S')
          .replace(/8/g, 'B')
          .toUpperCase()

        const candidate = part1 + part2 + part3
        if (/^[A-Z]{5}[0-9]{4}[A-Z]{1}$/.test(candidate)) {
          detectedPAN = {
            pan: candidate,
            masked: `XXXXX${candidate.slice(5)}`,
            evidence: line,
          }
          break
        }
      }
      if (detectedPAN) break
    }
  }

  // Strategy 1C: Masked PAN pattern (e.g. XXXXX1234F)
  if (!detectedPAN) {
    const maskedMatch = allText.match(/\b([Xx*•]{5}[0-9]{4}[A-Za-z]{1})\b/)
    if (maskedMatch) {
      const masked = maskedMatch[1].toUpperCase()
      detectedPAN = {
        pan: masked,
        masked: masked,
        evidence: maskedMatch[0],
      }
    }
  }

  if (detectedPAN) {
    result.documentIdentifier = {
      value: detectedPAN.pan,
      source: 'document',
      confidence: 'high',
      evidence: `Detected PAN: "${detectedPAN.pan}"`,
    }
    result.maskedIdentifier = {
      value: detectedPAN.masked,
      source: 'document',
      confidence: 'high',
    }
  }

  // 2. Date of Birth Extraction
  const dobMatch = allText.match(/\b(\d{2}[/-]\d{2}[/-]\d{4})\b/)
  if (dobMatch) {
    result.dateOfBirth = {
      value: dobMatch[1].replace(/-/g, '/'),
      source: 'document',
      confidence: 'high',
      evidence: dobMatch[0],
    }
  }

  // 3. Holder Name & Father's Name Extraction (Multi-Anchor positional algorithm)
  let holderName: string | undefined
  let fatherName: string | undefined

  // Find DOB Line index
  let dobIndex = -1
  for (let i = 0; i < linesToScan.length; i++) {
    const l = linesToScan[i].toLowerCase()
    if (/\b\d{2}[/-]\d{2}[/-]\d{4}\b/.test(linesToScan[i]) || l.includes('dob') || l.includes('birth') || l.includes('जन्म')) {
      dobIndex = i
      break
    }
  }

  // Anchor 3A: Search for "Name" and "Father's Name" keywords
  for (let i = 0; i < linesToScan.length; i++) {
    const raw = linesToScan[i]
    const lower = raw.toLowerCase()

    if (lower.includes('father') || lower.includes('पिता')) {
      if (i > 0 && !holderName) {
        const candidate = cleanCandidateText(linesToScan[i - 1])
        if (isPlausiblePersonName(candidate)) {
          holderName = toTitleCase(candidate)
        }
      }
      if (i < linesToScan.length - 1 && !fatherName) {
        const candidate = cleanCandidateText(linesToScan[i + 1])
        if (isPlausiblePersonName(candidate)) {
          fatherName = toTitleCase(candidate)
        }
      }
    }

    if (
      (lower.includes('name') || lower.includes('नाम')) &&
      !lower.includes('father') &&
      !lower.includes('पिता') &&
      !lower.includes('permanent') &&
      !lower.includes('account') &&
      !lower.includes('department')
    ) {
      if (i < linesToScan.length - 1 && !holderName) {
        const candidate = cleanCandidateText(linesToScan[i + 1])
        if (isPlausiblePersonName(candidate)) {
          holderName = toTitleCase(candidate)
        }
      }
    }
  }

  // Anchor 3B: Position relative to DOB
  if (dobIndex > 0) {
    const lineAbove1 = cleanCandidateText(linesToScan[dobIndex - 1])
    const lineAbove2 = dobIndex >= 2 ? cleanCandidateText(linesToScan[dobIndex - 2]) : ''

    if (!fatherName && isPlausiblePersonName(lineAbove1)) {
      fatherName = toTitleCase(lineAbove1)
    }
    if (!holderName && isPlausiblePersonName(lineAbove2)) {
      holderName = toTitleCase(lineAbove2)
    }
    if (!holderName && isPlausiblePersonName(lineAbove1)) {
      holderName = toTitleCase(lineAbove1)
    }
  }

  // Anchor 3C: General scan for valid name lines between header and PAN number
  if (!holderName) {
    for (let i = 0; i < linesToScan.length; i++) {
      const candidate = cleanCandidateText(linesToScan[i])
      if (isPlausiblePersonName(candidate)) {
        holderName = toTitleCase(candidate)
        break
      }
    }
  }

  if (holderName) {
    result.holderName = {
      value: holderName,
      source: 'document',
      confidence: 'high',
      evidence: `Detected cardholder name: "${holderName}"`,
    }
  }

  if (fatherName && fatherName !== holderName) {
    result.fatherOrHusbandName = {
      value: fatherName,
      source: 'document',
      confidence: 'high',
      evidence: `Detected father name: "${fatherName}"`,
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
