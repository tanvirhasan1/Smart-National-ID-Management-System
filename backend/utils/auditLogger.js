const AuditLog = require('../models/AuditLog');

const createAuditLog = async ({
  actor,
  actorRole,
  action,
  entityType,
  entityId,
  message,
  meta = {}
}) => {
  try {
    await AuditLog.create({
      actor,
      actorRole,
      action,
      entityType,
      entityId,
      message,
      meta
    });
  } catch (error) {
    console.error('Audit log error:', error.message);
  }
};

module.exports = {
  createAuditLog
};