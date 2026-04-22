const AuditLog = require('../models/AuditLog');

const removeUndefinedValues = (value) => {
  if (Array.isArray(value)) {
    return value.map(removeUndefinedValues);
  }

  if (value && typeof value === 'object' && !(value instanceof Date)) {
    return Object.entries(value).reduce((acc, [key, currentValue]) => {
      if (currentValue !== undefined) {
        acc[key] = removeUndefinedValues(currentValue);
      }
      return acc;
    }, {});
  }

  return value;
};

const extractChangedFields = (beforeState = null, afterState = null) => {
  if (
    !beforeState ||
    !afterState ||
    typeof beforeState !== 'object' ||
    typeof afterState !== 'object'
  ) {
    return [];
  }

  const keys = new Set([
    ...Object.keys(beforeState),
    ...Object.keys(afterState)
  ]);

  const changedFields = [];

  for (const key of keys) {
    const beforeValue = beforeState[key];
    const afterValue = afterState[key];

    if (JSON.stringify(beforeValue) !== JSON.stringify(afterValue)) {
      changedFields.push(key);
    }
  }

  return changedFields;
};

const getRequestAuditContext = (req) => {
  const forwardedHeader = req?.headers?.['x-forwarded-for'];
  const forwardedValue = Array.isArray(forwardedHeader)
    ? forwardedHeader[0]
    : forwardedHeader;

  const ipAddress = forwardedValue
    ? String(forwardedValue).split(',')[0].trim()
    : req?.ip || req?.socket?.remoteAddress || '';

  const requestId =
    req?.headers?.['x-request-id'] ||
    req?.headers?.['x-correlation-id'] ||
    '';

  const baseUrl = String(req?.baseUrl || '').toLowerCase();

  let sourceModule = 'api';

  if (baseUrl.includes('/admin')) {
    sourceModule = 'admin';
  } else if (baseUrl.includes('/support')) {
    sourceModule = 'support';
  } else if (baseUrl.includes('/applications')) {
    sourceModule = 'applications';
  }

  return {
    ipAddress,
    userAgent: req?.headers?.['user-agent'] || '',
    requestId: String(requestId || '').trim(),
    sourceModule
  };
};

const createAuditLog = async ({
  actor,
  actorRole,
  action,
  entityType,
  entityId,
  message,
  meta = {},
  reason = '',
  severity = 'info',
  sourceModule = 'api',
  requestContext = {},
  beforeState = null,
  afterState = null,
  changedFields = []
}) => {
  try {
    const normalizedBefore =
      beforeState && typeof beforeState === 'object'
        ? removeUndefinedValues(beforeState)
        : beforeState;

    const normalizedAfter =
      afterState && typeof afterState === 'object'
        ? removeUndefinedValues(afterState)
        : afterState;

    const finalChangedFields =
      Array.isArray(changedFields) && changedFields.length > 0
        ? changedFields
        : extractChangedFields(normalizedBefore, normalizedAfter);

    await AuditLog.create(
      removeUndefinedValues({
        actor,
        actorRole,
        action,
        entityType,
        entityId,
        message,
        reason,
        severity,
        sourceModule: sourceModule || requestContext.sourceModule || 'api',
        requestId: requestContext.requestId || '',
        ipAddress: requestContext.ipAddress || '',
        userAgent: requestContext.userAgent || '',
        beforeState: normalizedBefore,
        afterState: normalizedAfter,
        changedFields: finalChangedFields,
        meta
      })
    );
  } catch (error) {
    console.error('Audit log error:', error.message);
  }
};

module.exports = {
  createAuditLog,
  extractChangedFields,
  getRequestAuditContext
};