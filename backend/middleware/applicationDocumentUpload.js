const multer = require('multer');

const memoryStorage = multer.memoryStorage();

const allowedMimeTypes = [
  'image/jpeg',
  'image/jpg',
  'image/png',
  'application/pdf'
];

const fileFilter = (req, file, cb) => {
  if (!allowedMimeTypes.includes(file.mimetype)) {
    return cb(new Error('Only JPG, PNG, and PDF files are allowed'));
  }

  cb(null, true);
};

const applicationDocumentUpload = multer({
  storage: memoryStorage,
  fileFilter,
  limits: {
    fileSize: 5 * 1024 * 1024
  }
});

const uploadSingleApplicationDocument = (req, res, next) => {
  const uploadHandler = applicationDocumentUpload.single('file');

  uploadHandler(req, res, (error) => {
    if (error) {
      return res.status(400).json({
        success: false,
        message: error.message
      });
    }

    next();
  });
};

const uploadBirthCertificateVerificationDocument = (req, res, next) => {
  const uploadHandler = applicationDocumentUpload.single('birthCertificate');

  uploadHandler(req, res, (error) => {
    if (error) {
      return res.status(400).json({
        success: false,
        message: error.message
      });
    }

    next();
  });
};

module.exports = {
  applicationDocumentUpload,
  uploadSingleApplicationDocument,
  uploadBirthCertificateVerificationDocument
};
