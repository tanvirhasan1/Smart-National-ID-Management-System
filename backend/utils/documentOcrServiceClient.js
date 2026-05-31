const {
  sanitizeVerificationResult
} = require('./documentVerification');

const DEFAULT_DOCUMENT_OCR_TIMEOUT_MS = 90000;
const MIN_DOCUMENT_OCR_TIMEOUT_MS = 10000;
const DEFAULT_PROVIDER = 'document-ocr-service';
const OCR_TIMEOUT_MESSAGE =
  'Document verification is taking longer than expected. Please try again.';
const OCR_UNAVAILABLE_MESSAGE =
  'Document verification service is temporarily unavailable. Please try again later.';

const isEnabled = (value) => value === true || value === 'true';
const shouldLogOcrDiagnostics = () => process.env.NODE_ENV !== 'production';

const getDocumentOcrTimeoutMs = () => {
  const timeoutMs = Number(process.env.DOCUMENT_OCR_TIMEOUT_MS);

  return Number.isFinite(timeoutMs) && timeoutMs >= MIN_DOCUMENT_OCR_TIMEOUT_MS
    ? timeoutMs
    : DEFAULT_DOCUMENT_OCR_TIMEOUT_MS;
};

const logOcrDiagnostic = (event, details = {}) => {
  if (!shouldLogOcrDiagnostics()) {
    return;
  }

  console.info(`[document-ocr] ${event}`, details);
};

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
  const timeoutMs = getDocumentOcrTimeoutMs();

  if (!serviceEnabled) {
    logOcrDiagnostic('service_disabled', {
      serviceUrlConfigured: Boolean(serviceUrl),
      timeoutMs
    });
    return unavailableResult(OCR_UNAVAILABLE_MESSAGE, 'service_unavailable');
  }

  if (!serviceUrl || !serviceSecret) {
    logOcrDiagnostic('service_not_configured', {
      serviceUrlConfigured: Boolean(serviceUrl),
      serviceSecretConfigured: Boolean(serviceSecret),
      timeoutMs
    });
    return unavailableResult(OCR_UNAVAILABLE_MESSAGE, 'service_unavailable');
  }

  const controller = new AbortController();
  const timeout = setTimeout(() => controller.abort(), timeoutMs);
  const startedAtMs = Date.now();
  const startedAt = new Date(startedAtMs).toISOString();

  try {
    logOcrDiagnostic('request_started', {
      serviceUrlConfigured: Boolean(serviceUrl),
      timeoutMs,
      startedAt
    });

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
        logOcrDiagnostic('invalid_response', {
          durationMs: Date.now() - startedAtMs,
          httpStatus: response.status
        });
        return unavailableResult(OCR_UNAVAILABLE_MESSAGE, 'invalid_response');
      }
    }

    const verification = normalizeOcrResponse(parsedBody);

    logOcrDiagnostic('request_finished', {
      durationMs: Date.now() - startedAtMs,
      httpStatus: response.status,
      ocrStatus: verification.status,
      failureReason: verification.failureReason || ''
    });

    return {
      available: true,
      status: verification.status,
      verification
    };
  } catch (error) {
    const failureReason =
      error.name === 'AbortError' ? 'timeout' : 'service_unavailable';

    logOcrDiagnostic('request_failed', {
      durationMs: Date.now() - startedAtMs,
      failureReason,
      errorName: error.name || 'Error'
    });

    return error.name === 'AbortError'
      ? unavailableResult(OCR_TIMEOUT_MESSAGE, 'timeout')
      : unavailableResult(OCR_UNAVAILABLE_MESSAGE, 'service_unavailable');
  } finally {
    clearTimeout(timeout);
  }
};

module.exports = {
  verifyBirthCertificate,
  normalizeOcrResponse,
  getDocumentOcrTimeoutMs
};
