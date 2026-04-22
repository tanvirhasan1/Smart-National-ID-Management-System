# 15 — Implementation Templates

These examples show the coding style expected by the rules in this folder.

## Example module structure

```text
src/modules/applications/
  applications.routes.js
  applications.controller.js
  applications.service.js
  applications.repository.js
  applications.validation.js
  applications.policy.js
```

## Example response helper

```js
function sendSuccess(res, { statusCode = 200, message, data = {}, meta } = {}) {
  const payload = {
    success: true,
    message,
    data
  };

  if (meta) payload.meta = meta;

  return res.status(statusCode).json(payload);
}
```

## Example AppError

```js
class AppError extends Error {
  constructor({ statusCode = 500, code = 'INTERNAL_SERVER_ERROR', message, details, meta } = {}) {
    super(message);
    this.statusCode = statusCode;
    this.code = code;
    this.details = details;
    this.meta = meta;
  }
}
```

## Example async handler

```js
const asyncHandler = (fn) => (req, res, next) =>
  Promise.resolve(fn(req, res, next)).catch(next);
```

## Example validator file

```js
const { body, param } = require('express-validator');

const createApplicationRules = [
  body('fullNameEnglish').trim().notEmpty(),
  body('fatherName').trim().notEmpty(),
  body('motherName').trim().notEmpty(),
  body('dateOfBirth').isISO8601(),
  body('gender').isIn(['male', 'female', 'other']),
  body('phone').trim().notEmpty()
];

const applicationIdParamRules = [
  param('id').isMongoId().withMessage('Invalid application id')
];

module.exports = {
  createApplicationRules,
  applicationIdParamRules
};
```

## Example controller

```js
const { sendSuccess } = require('../../shared/utils/response');
const { applicationsService } = require('./applications.service');

const createApplication = asyncHandler(async (req, res) => {
  const application = await applicationsService.create({
    actor: req.user,
    input: req.validated.body
  });

  return sendSuccess(res, {
    statusCode: 201,
    message: 'Application created successfully',
    data: { application }
  });
});
```

## Example service

```js
const { AppError } = require('../../shared/errors/app-error');

async function reviewApplication({ actor, applicationId, input }) {
  if (!['admin'].includes(actor.role)) {
    throw new AppError({
      statusCode: 403,
      code: 'FORBIDDEN',
      message: 'Only admin users can review applications'
    });
  }

  const application = await applicationsRepository.findById(applicationId);

  if (!application) {
    throw new AppError({
      statusCode: 404,
      code: 'NOT_FOUND',
      message: 'Application not found'
    });
  }

  if (!canReview(application.status, input.status)) {
    throw new AppError({
      statusCode: 422,
      code: 'BUSINESS_RULE_VIOLATION',
      message: `Application cannot move from ${application.status} to ${input.status}`
    });
  }

  const updated = await applicationsRepository.updateReview(applicationId, input);

  await auditService.create({
    actor,
    action: 'REVIEW_APPLICATION',
    entityType: 'Application',
    entityId: updated._id,
    message: `Reviewed application ${updated.applicationId}`,
    meta: { status: updated.status }
  });

  return updated;
}
```

## Example error middleware

```js
function errorHandler(err, req, res, next) {
  const statusCode = err.statusCode || 500;
  const code = err.code || 'INTERNAL_SERVER_ERROR';

  return res.status(statusCode).json({
    success: false,
    message: err.message || 'Internal server error',
    error: {
      code,
      details: err.details || []
    },
    requestId: req.id
  });
}
```

## Example route

```js
router.post(
  '/',
  requireAuth(),
  createApplicationRules,
  validateRequest,
  applicationsController.createApplication
);
```

## Example transition guard

```js
const allowedTransitions = {
  submitted: ['under_review', 'rejected', 'cancelled'],
  under_review: ['approved', 'rejected', 'cancelled'],
  approved: ['printed'],
  printed: ['delivered']
};

function canReview(currentStatus, nextStatus) {
  return (allowedTransitions[currentStatus] || []).includes(nextStatus);
}
```

## Final note

Templates are starting points, not excuses for copy-paste architecture drift.  
Always keep the domain service as the single source of truth.
