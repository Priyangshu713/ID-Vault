import type { Collection, VaultDocument } from './types'

export const generateCollections = (documents: VaultDocument[]): Collection[] => {
  const currentDocs = documents.filter((d) => d.isCurrent !== false)

  return [
    {
      category: 'identity',
      name: 'Identity',
      count: currentDocs.filter((d) => d.category === 'identity' || d.secondaryCategories?.includes('identity')).length,
      previewDocumentIds: ['aadhaar', 'pan-card', 'passport', 'voter-id'],
    },
    {
      category: 'education',
      name: 'Education',
      count: currentDocs.filter((d) => d.category === 'education' || d.secondaryCategories?.includes('education')).length,
      previewDocumentIds: ['degree-certificate', 'class-12-certificate', 'class-10-certificate'],
    },
    {
      category: 'certificate',
      name: 'Certificates',
      count: currentDocs.filter((d) => d.category === 'certificate' || d.secondaryCategories?.includes('certificate')).length,
      previewDocumentIds: ['domicile-certificate', 'income-certificate', 'birth-certificate'],
    },
    {
      category: 'transport',
      name: 'Transport',
      count: currentDocs.filter((d) => d.category === 'transport' || d.secondaryCategories?.includes('transport')).length,
      previewDocumentIds: ['driving-licence', 'vehicle-rc', 'vehicle-insurance'],
    },
    {
      category: 'financial',
      name: 'Financial',
      count: currentDocs.filter((d) => d.category === 'financial' || d.secondaryCategories?.includes('financial')).length,
      previewDocumentIds: ['pan-card', 'form-16'],
    },
  ]
}

export const mockCollections: Collection[] = [
  { category: 'identity', name: 'Identity', count: 4, previewDocumentIds: ['aadhaar', 'pan-card', 'passport', 'voter-id'] },
  { category: 'education', name: 'Education', count: 3, previewDocumentIds: ['degree-certificate', 'class-12-certificate', 'class-10-certificate'] },
  { category: 'certificate', name: 'Certificates', count: 3, previewDocumentIds: ['domicile-certificate', 'income-certificate', 'birth-certificate'] },
  { category: 'transport', name: 'Transport', count: 3, previewDocumentIds: ['driving-licence', 'vehicle-rc', 'vehicle-insurance'] },
  { category: 'financial', name: 'Financial', count: 2, previewDocumentIds: ['pan-card', 'form-16'] },
]
