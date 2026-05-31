const {
  sanitizeVerificationResult
} = require('./documentVerification');

const DEFAULT_TIMEOUT_MS = 30000;
const DEFAULT_PROVIDER = 'document-ocr-service';
const OCR_TIMEOUT_MESSAGE =
  'Document verification is taking longer than expected. Please try again.';
const OCR_UNAVAILABLE_MESSAGE =
  'Document verification service is temporarily unavailable. Please try again later.';

const isEnabled = (value) => value === true || value === 'true';

const appendFile = (formData, fieldName, file) => {
  formData.append(
    fieldName,
    new Blob([file.buffer], { type: file.mimetype }),
    file.originalname || `${fieldName}.jpg`
  );
};

const normalizeStatus = (value, success) => {
  const status = String(value || '').trim().toLowerCase();

  if (
    [
      'passed',
      'mismatch',
      'not_found',
      'unreadable',
      'low_confidence',
      'failed'
    ].includes(status)
  ) {
    return status;
  }

  return success ? 'passed' : 'failed';
};

const normalizeOcrResponse = (data = {}) => {
  const source =
    data.verification && typeof data.verification === 'object'
      ? { ...data.verification, status: data.status || data.verification.status }
      : data;

  const status = normalizeStatus(
    source.status || data.status,
    data.success === true || data.canSubmit === true || data.can_submit === true
  );

  return sanitizeVerificationResult({
    status,
    provider: source.provider || data.provider || DEFAULT_PROVIDER,
    confidence: source.confidence ?? data.confidence,
    message: source.message || data.message,
    checkedAt: source.checkedAt || source.checked_at,
    rawTextPreview:
      source.rawTextPreview ||
      source.raw_text_preview ||
      data.rawTextPreview ||
      data.raw_text_preview,
    extractedFields:
      source.extractedFields ||
      source.extracted_fields ||
      data.extractedFields ||
      data.extracted_fields,
    fieldComparisons:
      source.fieldComparisons ||
      source.field_comparisons ||
      data.fieldComparisons ||
      data.field_comparisons,
    failureReason:
      source.failureReason ||
      source.failure_reason ||
      data.failureReason ||
      data.failure_reason ||
      data.detail,
    blocksSubmission:
      source.blocksSubmission ??
      source.blocks_submission ??
      data.blocksSubmission ??
      data.blocks_submission
  });
};

const unavailableResult = (message, failureReason = 'service_unavailable') => ({
  available: false,
  status: 'unavailable',
  unavailableReason: failureReason,
  verification: sanitizeVerificationResult({
    status: 'failed',
    provider: DEFAULT_PROVIDER,
    message,
    failureReason,
    blocksSubmission: true
  })
});

const verifyBirthCertificate = async ({ birthCertificateFile, claimedFields }) => {
  const serviceEnabled = isEnabled(process.env.DOCUMENT_OCR_ENABLED);
  const serviceUrl = (process.env.DOCUMENT_OCR_SERVICE_URL || '').replace(/\/$/, '');
  const serviceSecret = process.env.DOCUMENT_OCR_SERVICE_SECRET;

  if (!serviceEnabled) {
    return unavailableResult(OCR_UNAVAILABLE_MESSAGE, 'service_unavailable');
  }

  if (!serviceUrl || !serviceSecret) {
    return unavailableResult(OCR_UNAVAILABLE_MESSAGE, 'service_unavailable');
  }

  const timeoutMs = Number(process.env.DOCUMENT_OCR_TIMEOUT_MS) || DEFAULT_TIMEOUT_MS;
  const controller = new AbortController();
  const timeout = setTimeout(() => controller.abort(), timeoutMs);

  try {
    const formData = new FormData();
    appendFile(formData, 'birth_certificate', birthCertificateFile);
    formData.append('claimed_fields', JSON.stringify(claimedFields || {}));

    const response = await fetch(`${serviceUrl}/v1/verify-birth-certificate`, {
      method: 'POST',
      headers: {
        'X-AI-Service-Secret': serviceSecret
      },
      body: formData,
      signal: controller.signal
    });

    const responseText = await response.text();
    let parsedBody = {};

    if (responseText) {
      try {
        parsedBody = JSON.parse(responseText);
      } catch {
        return unavailableResult(OCR_UNAVAILABLE_MESSAGE, 'invalid_response');
      }
    }

    const verification = normalizeOcrResponse(parsedBody);

    if (!response.ok && ![400, 422].includes(response.status)) {
      return unavailableResult(OCR_UNAVAILABLE_MESSAGE, 'service_unavailable');
    }

    return {
      available: true,
      status: verification.status,
      verification
    };
  } catch (error) {
    return error.name === 'AbortError'
      ? unavailableResult(OCR_TIMEOUT_MESSAGE, 'timeout')
      : unavailableResult(OCR_UNAVAILABLE_MESSAGE, 'service_unavailable');
  } finally {
    clearTimeout(timeout);
  }
};

module.exports = {
  verifyBirthCertificate,
  normalizeOcrResponse
};
