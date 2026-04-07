# 05 — Response, Error, and Exception Rules

This document defines the single response contract for the backend.

## Contract goal

Without a shared contract, APIs drift into many response shapes such as:

- `user`
- `application`
- `applications`
- `center`
- `data`
- `rows`
- `stats`
- `logs`

This project forbids that drift. One response contract must be used consistently.

## Standard success response

Every successful response must follow this contract:

```json
{
  "success": true,
  "message": "Human-readable message",
  "data": {},
  "meta": {}
}
```

### Notes

- `message` should be short and useful
- `data` contains the payload
- `meta` is optional, but preferred for list responses and debug-friendly metadata such as pagination

## Standard single-resource response example

```json
{
  "success": true,
  "message": "Application fetched successfully",
  "data": {
    "application": {}
  }
}
```

## Standard list response example

```json
{
  "success": true,
  "message": "Applications fetched successfully",
  "data": {
    "items": []
  },
  "meta": {
    "page": 1,
    "limit": 20,
    "total": 0,
    "hasNextPage": false
  }
}
```

## Standard error response

Every error response must follow this contract:

```json
{
  "success": false,
  "message": "Validation failed",
  "error": {
    "code": "VALIDATION_ERROR",
    "details": []
  },
  "requestId": "req_123"
}
```

## Approved error codes

Recommended application-level codes:

- `VALIDATION_ERROR`
- `UNAUTHORIZED`
- `FORBIDDEN`
- `NOT_FOUND`
- `CONFLICT`
- `RATE_LIMITED`
- `BUSINESS_RULE_VIOLATION`
- `EXTERNAL_SERVICE_ERROR`
- `INTERNAL_SERVER_ERROR`

## HTTP status mapping

Recommended mapping:

- `200` — success read/update
- `201` — resource created
- `204` — no content when intentionally empty
- `400` — invalid request shape
- `401` — unauthenticated
- `403` — authenticated but forbidden
- `404` — resource not found
- `409` — duplicate/conflict
- `422` — well-formed request but business rule violation
- `429` — rate limited
- `500` — internal server error

## Global error handling rule

Controllers must not own global error policy.

Required shared middleware:

- `notFoundHandler`
- `errorHandler`

Optional helper:

- `asyncHandler`

### Pattern

Controller:

```js
const getApplication = asyncHandler(async (req, res) => {
  const application = await applicationsService.getById(req.user, req.params.id);

  return sendSuccess(res, {
    message: 'Application fetched successfully',
    data: { application }
  });
});
```

Error middleware decides how errors are serialized.

## AppError rule

Create a shared `AppError` class or equivalent typed error utility with:

- `statusCode`
- `code`
- `message`
- `details`
- optional `meta`

Services throw `AppError`. Middleware serializes it.

## Production safety rule

Never expose:

- raw stack traces
- raw database error objects
- raw token errors without normalization
- internal system messages that reveal implementation details

`error.message` from unknown exceptions must not be returned directly in production.

## Request ID rule

Every request must carry or receive a request ID. Error responses should include it so production incidents are traceable.

## Logging relationship

- error middleware logs the internal error with request ID
- response payload stays clean and safe
- client receives stable error code and human-readable message

## Final policy

A backend response is part of the public contract.  
It must be as stable and well-designed as the route itself.
