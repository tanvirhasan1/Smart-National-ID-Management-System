# 04 — Validation, Sanitization, and Input Rules

This document defines the validation standard for every incoming request.

## Core rule

**No request reaches business logic without validation.**

This includes:

- route params
- query params
- request body
- headers when required

This project standardizes on `express-validator` for request schema validation. Controllers and services may add business-rule checks, but request-shape validation must remain consistent.

## Required validation structure

Each module must contain its own validation file.

Examples:

- `auth.validation.js`
- `applications.validation.js`
- `appointments.validation.js`
- `support.validation.js`
- `centers.validation.js`

Routes attach validators. Controllers assume validated input.

## Validation responsibilities

### Schema-level validation

Use validators to enforce:

- required fields
- type checks
- enum checks
- string length
- email format
- phone format
- date format
- array limits
- ObjectId shape
- numeric ranges

### Business-level validation

Services enforce deeper business rules such as:

- only approved applications can book appointments
- only active centers may receive bookings
- only submitted or under-review applications may be reviewed
- only allowed status transitions may occur

## Unknown field policy

All write endpoints must use an allow-list.

Examples of fields citizens must never control directly:

- `role`
- `status`
- `isVerified`
- `approvedAt`
- `printedAt`
- `deliveredAt`
- `cancelledAt`
- `rejectionReason`
- `ticketNumber`
- `applicationId`
- `assignedTo`
- `resolvedAt`
- `closedAt`

Unknown or forbidden fields should cause a validation error instead of being silently accepted.

## Normalization rules

### Strings

- trim surrounding whitespace
- normalize case where applicable
- reject empty strings for required textual fields
- avoid storing accidental leading/trailing spaces

### Email

- trim
- lowercase before lookup and write

### Dates

- accept only ISO-compatible input
- convert to server-safe UTC-aware Date values
- reject invalid dates
- for appointments, require future date/time

### ObjectId params

Any route with `:id` must validate ObjectId before controller logic executes.

Recommended helper middleware:

- `validateObjectId('id')`

## Per-domain validation rules

### Auth

Register:

- `fullName`: required, trimmed, reasonable max length
- `email`: required, valid email, normalized
- `phone`: optional or required by product policy, normalized
- `password`: required, minimum 8 characters, complexity policy if enabled

Login:

- `email`: required, valid email
- `password`: required

### Users

Profile update:

- only mutable profile fields allowed
- password change should use dedicated flow or stronger validation
- role/status/isVerified cannot be user-controlled

### Applications

Create application:

- required identity fields validated
- address sub-objects validated deeply
- enum values validated
- dates validated
- documents validated by schema if file references are included

Update application:

- use a separate validator from create
- citizen update validator must allow only editable fields
- review-only or system-only fields are forbidden

Admin review:

- `status` must be one of allowed review states
- `rejectionReason` required when status is `rejected`

Bulk actions:

- `applicationIds` must be a non-empty array
- maximum bulk size must be enforced, for example `<= 100`

### Appointments

Booking:

- `applicationId`: required, valid ObjectId
- `centerId`: required, valid ObjectId
- `appointmentDate`: required, valid future date
- `timeSlot`: required, valid slot from allow-list or schedule table
- `notes`: optional, trimmed, max length limited

### Support

Create ticket:

- `subject`: required
- `category`: enum
- `priority`: enum
- `description`: minimum length and max length

Respond to ticket:

- `message`: required, trimmed, min/max length

### Centers

Create/update center:

- `name`: required
- `district`: required
- `address`: required
- `contactNumber`: normalized if present
- `dailyCapacity`: positive integer with upper bound
- `officeHours`: structured format or validated string format

## Manual validation rule

Manual validation inside controllers is allowed only for domain rules that cannot be expressed cleanly as request schema validation. Examples:

- checking center capacity
- checking requested status transition against the allowed matrix
- checking ownership against database

Everything else belongs in validators.

## Validation error contract

Validation errors must return a consistent shape such as:

```json
{
  "success": false,
  "message": "Validation failed",
  "error": {
    "code": "VALIDATION_ERROR",
    "details": []
  }
}
```

## Final policy

If a field is not explicitly allowed, it is not accepted.  
If a request is not validated, it is not ready for production.
