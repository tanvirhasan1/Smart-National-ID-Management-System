const crypto = require('crypto');

const VERIFICATION_STATUSES = new Set([
  'not_started',
  'pending',
  'passed',
  'mismatch',
  'not_found',
  'unreadable',
  'low_confidence',
  'failed'
]);

const BLOCKING_STATUSES = new Set([
  'mismatch',
  'not_found',
  'unreadable',
  'low_confidence',
  'failed'
]);

const CLAIMED_FIELD_KEYS = [
  'birthRegistrationNumber',
  'fullNameEnglish',
  'fullNameBangla',
  'fatherName',
  'motherName',
  'dateOfBirth',
  'gender'
];

const normalizeString = (value) => {
  if (value === null || value === undefined) {
    return '';
  }

  return String(value).trim();
};

const normalizeDateOnly = (value) => {
  const rawValue = normalizeString(value);

  if (!rawValue) {
    return '';
  }

  if (/^\d{4}-\d{2}-\d{2}/.test(rawValue)) {
    return rawValue.slice(0, 10);
  }

  const parsedDate = new Date(rawValue);

  if (Number.isNaN(parsedDate.getTime())) {
    return rawValue;
  }

  return parsedDate.toISOString().slice(0, 10);
};

const normalizeGender = (value) => normalizeString(value).toLowerCase();

const normalizeClaimedBirthCertificateFields = (fields = {}) => ({
  birthRegistrationNumber: normalizeString(
    fields.birthRegistrationNumber ||
      fields.birthCertificateNumber ||
      fields.birthRegNumber
  ),
  fullNameEnglish: normalizeString(fields.fullNameEnglish),
  fullNameBangla: normalizeString(fields.fullNameBangla),
  fatherName: normalizeString(fields.fatherName),
  motherName: normalizeString(fields.motherName),
  dateOfBirth: normalizeDateOnly(fields.dateOfBirth),
  gender: normalizeGender(fields.gender)
});

const buildClaimedFieldsFromApplicationPayload = (payload = {}) =>
  normalizeClaimedBirthCertificateFields({
    birthRegistrationNumber: payload.birthRegistrationNumber,
    fullNameEnglish: payload.fullNameEnglish,
    fullNameBangla: payload.fullNameBangla,
    fatherName: payload.fatherName,
    motherName: payload.motherName,
    dateOfBirth: payload.dateOfBirth,
    gender: payload.gender
  });

const stableStringify = (value) => {
  if (Array.isArray(value)) {
    return `[${value.map(stableStringify).join(',')}]`;
  }

  if (value && typeof value === 'object' && !(value instanceof Date)) {
    return `{${Object.keys(value)
      .sort()
      .map((key) => `${JSON.stringify(key)}:${stableStringify(value[key])}`)
      .join(',')}}`;
  }

  if (value instanceof Date) {
    return JSON.stringify(value.toISOString());
  }

  return JSON.stringify(value);
};

const sha256Hex = (value) =>
  crypto.createHash('sha256').update(value).digest('hex');

const hashFileBuffer = (buffer) => sha256Hex(buffer);

const hashClaimedFields = (fields) =>
  sha256Hex(stableStringify(normalizeClaimedBirthCertificateFields(fields)));

const generateVerificationToken = () =>
  crypto
    .randomBytes(32)
    .toString('base64')
    .replace(/\+/g, '-')
    .replace(/\//g, '_')
    .replace(/=+$/g, '');

const hashVerificationToken = (token) => sha256Hex(normalizeString(token));

const toNumberOrNull = (value) => {
  const parsed = Number(value);
  return Number.isFinite(parsed) ? parsed : null;
};

const truncateRawTextPreview = (value) => normalizeString(value).slice(0, 4000);

const normalizeExtractedFields = (fields = {}) =>
  normalizeClaimedBirthCertificateFields({
    birthRegistrationNumber:
      fields.birthRegistrationNumber ||
      fields.birth_registration_number ||
      fields.birthCertificateNumber ||
      fields.birth_certificate_number ||
      fields.birthRegNumber,
    fullNameEnglish: fields.fullNameEnglish || fields.full_name_english,
    fullNameBangla: fields.fullNameBangla || fields.full_name_bangla,
    fatherName: fields.fatherName || fields.father_name,
    motherName: fields.motherName || fields.mother_name,
    dateOfBirth: fields.dateOfBirth || fields.date_of_birth,
    gender: fields.gender
  });

const normalizeFieldComparisons = (comparisons = []) => {
  if (!Array.isArray(comparisons)) {
    return [];
  }

  return comparisons.map((item = {}) => ({
    field: normalizeString(item.field),
    submittedValue: normalizeString(
      item.submittedValue || item.submitted_value
    ),
    extractedValue: normalizeString(
      item.extractedValue || item.extracted_value
    ),
    matched: Boolean(item.matched),
    confidence: toNumberOrNull(item.confidence),
    note: normalizeString(item.note)
  }));
};

const sanitizeVerificationResult = (result = {}) => {
  const status = VERIFICATION_STATUSES.has(result.status)
    ? result.status
    : 'failed';

  return {
    status,
    provider: normalizeString(result.provider),
    confidence: toNumberOrNull(result.confidence),
    message: normalizeString(result.message),
    checkedAt: result.checkedAt ? new Date(result.checkedAt) : new Date(),
    rawTextPreview: truncateRawTextPreview(
      result.rawTextPreview || result.raw_text_preview || result.rawText
    ),
    extractedFields: normalizeExtractedFields(
      result.extractedFields || result.extracted_fields
    ),
    fieldComparisons: normalizeFieldComparisons(
      result.fieldComparisons || result.field_comparisons
    ),
    failureReason: normalizeString(
      result.failureReason || result.failure_reason
    ),
    blocksSubmission:
      result.blocksSubmission === undefined
        ? BLOCKING_STATUSES.has(status)
        : Boolean(result.blocksSubmission)
  };
};

const getDocumentVerificationTtlMinutes = () => {
  const configuredValue = Number(process.env.DOCUMENT_VERIFICATION_TTL_MINUTES);
  return Number.isFinite(configuredValue) && configuredValue > 0
    ? Math.min(Math.floor(configuredValue), 120)
    : 30;
};

module.exports = {
  CLAIMED_FIELD_KEYS,
  BLOCKING_STATUSES,
  normalizeClaimedBirthCertificateFields,
  buildClaimedFieldsFromApplicationPayload,
  hashFileBuffer,
  hashClaimedFields,
  generateVerificationToken,
  hashVerificationToken,
  sanitizeVerificationResult,
  getDocumentVerificationTtlMinutes
};
