import api from '../components/api/axios';

const allowedCitizenDocumentTypes = [
  'photograph',
  'signature',
  'birthCertificate',
  'correctionProof'
];

const allowedMimeTypes = [
  'image/jpeg',
  'image/jpg',
  'image/png',
  'application/pdf'
];

const maxFileSizeInBytes = 5 * 1024 * 1024;

const validateCitizenDocumentFile = (file, documentType) => {
  if (!allowedCitizenDocumentTypes.includes(documentType)) {
    throw new Error('Invalid document type');
  }

  if (!file) {
    throw new Error('Please select a file first');
  }

  if (!allowedMimeTypes.includes(file.type)) {
    throw new Error('Only JPG, PNG, and PDF files are allowed');
  }

  if (file.size > maxFileSizeInBytes) {
    throw new Error('File size must be 5MB or less');
  }
};

export const uploadCitizenApplicationDocument = async ({
  applicationId,
  documentType,
  file,
  onUploadProgress
}) => {
  if (!applicationId) {
    throw new Error('Application ID is required');
  }

  validateCitizenDocumentFile(file, documentType);

  const formData = new FormData();
  formData.append('file', file);

  const response = await api.post(
    `/applications/${applicationId}/documents/${documentType}`,
    formData,
    {
      headers: {
        'Content-Type': 'multipart/form-data'
      },
      onUploadProgress: (progressEvent) => {
        if (!onUploadProgress || !progressEvent.total) {
          return;
        }

        const progressPercent = Math.round(
          (progressEvent.loaded * 100) / progressEvent.total
        );

        onUploadProgress(progressPercent);
      }
    }
  );

  return response?.data;
};


export const uploadCitizenCorrectionDocument = async ({
  correctionId,
  documentType,
  file,
  onUploadProgress
}) => {
  if (!correctionId) {
    throw new Error('Correction ID is required');
  }

  validateCitizenDocumentFile(file, documentType === 'verificationDocument' ? 'correctionProof' : documentType);

  const formData = new FormData();
  formData.append('file', file);

  const response = await api.post(
    `/corrections/${correctionId}/documents/${documentType}`,
    formData,
    {
      headers: {
        'Content-Type': 'multipart/form-data'
      },
      onUploadProgress: (progressEvent) => {
        if (!onUploadProgress || !progressEvent.total) {
          return;
        }

        const progressPercent = Math.round(
          (progressEvent.loaded * 100) / progressEvent.total
        );

        onUploadProgress(progressPercent);
      }
    }
  );

  return response?.data;
};

export const verifyBirthCertificateDocument = async ({ file, claimedFields }) => {
  validateCitizenDocumentFile(file, 'birthCertificate');

  const formData = new FormData();
  formData.append('birthCertificate', file);
  formData.append('claimedFields', JSON.stringify(claimedFields || {}));

  const response = await api.post(
    '/applications/document-verification/birth-certificate',
    formData,
    {
      headers: {
        'Content-Type': 'multipart/form-data'
      }
    }
  );

  return response?.data;
};

export const getCitizenDocumentPreview = (documentRecord) => {
  const secureUrl = documentRecord?.cloudinary?.secureUrl || '';
  const format = (documentRecord?.cloudinary?.format || '').toLowerCase();

  return {
    secureUrl,
    isPdf: format === 'pdf',
    isImage: ['jpg', 'jpeg', 'png', 'webp'].includes(format)
  };
};

export const getCitizenDocumentLabel = (documentType) => {
  switch (documentType) {
    case 'photograph':
      return 'Passport-size photo';
    case 'signature':
      return 'Signature';
    case 'birthCertificate':
      return 'Birth Certificate';
    case 'correctionProof':
    case 'verificationDocument':
      return 'Supporting document';
    default:
      return 'Document';
  }
};
