const streamifier = require('streamifier');
const cloudinary = require('../config/cloudinary');

const documentConfigMap = {
  photograph: {
    resourceType: 'image',
    allowedFormats: ['jpg', 'jpeg', 'png'],
    folderName: 'photograph'
  },
  signature: {
    resourceType: 'image',
    allowedFormats: ['jpg', 'jpeg', 'png'],
    folderName: 'signature'
  },
  birthCertificate: {
    resourceType: 'auto',
    allowedFormats: ['jpg', 'jpeg', 'png', 'pdf'],
    folderName: 'birth-certificate'
  }
};

const uploadApplicationDocumentToCloudinary = ({
  fileBuffer,
  applicationId,
  citizenId,
  documentType
}) => {
  return new Promise((resolve, reject) => {
    const config = documentConfigMap[documentType];

    if (!config) {
      return reject(new Error('Invalid document type'));
    }

    const timestamp = Date.now();

    const uploadOptions = {
      folder: `smart-nid/applications/${applicationId}/${config.folderName}`,
      public_id: `${documentType}_${timestamp}`,
      resource_type: config.resourceType,
      overwrite: false,
      unique_filename: false,
      use_filename: false,
      tags: [
        'smart-nid',
        'application-document',
        `application-${applicationId}`,
        `citizen-${citizenId}`,
        `document-${documentType}`
      ],
      context: {
        application_id: String(applicationId),
        citizen_id: String(citizenId),
        document_type: String(documentType),
        uploaded_from: 'citizen-portal'
      }
    };

    const uploadStream = cloudinary.uploader.upload_stream(
      uploadOptions,
      (error, result) => {
        if (error) {
          return reject(error);
        }

        return resolve({
          assetId: result.asset_id,
          publicId: result.public_id,
          version: result.version,
          secureUrl: result.secure_url,
          resourceType: result.resource_type,
          format: result.format,
          bytes: result.bytes,
          width: result.width || null,
          height: result.height || null,
          originalFilename: result.original_filename || null,
          folder: result.folder || null,
          etag: result.etag || null,
          createdAt: result.created_at
        });
      }
    );

    streamifier.createReadStream(fileBuffer).pipe(uploadStream);
  });
};

module.exports = uploadApplicationDocumentToCloudinary;