# 02 — API Design and Route Standards

This document standardizes route naming, API versioning, query behavior, and admin surface design.

## API versioning rule

All production APIs must use an explicit version prefix.

**Canonical format**

```text
/api/v1/...
```

The public API contract for this project is `/api/v1/...`. Local experimentation may mirror handlers elsewhere during setup, but the documented and supported contract remains versioned.

## Route naming rules

### Use nouns for resources

Good:

- `POST /api/v1/applications`
- `GET /api/v1/applications/:id`
- `GET /api/v1/support/tickets/:id`

Avoid inventing verb-style resource names unless it is a command/action endpoint.

### Use action endpoints only for explicit state transitions

Good:

- `POST /api/v1/applications/:id/submit`
- `POST /api/v1/applications/:id/cancel`
- `POST /api/v1/admin/applications/:id/review`
- `POST /api/v1/support/tickets/:id/reopen`

Avoid overloaded `PUT` or `PATCH` endpoints that silently perform status changes without clear semantics.

## Canonical admin surface

Admin capabilities must be exposed through one public namespace only.

Do not split privileged behavior across alternate path trees.

**Rule:** use one admin namespace as the public contract.

Recommended canonical style:

```text
/api/v1/admin/applications
/api/v1/admin/appointments
/api/v1/admin/support/tickets
/api/v1/admin/centers
/api/v1/admin/audit/logs
```

Domain services still own the behavior. The admin namespace only expresses actor access.

## Standard query parameters

All list endpoints must support a consistent query vocabulary.

### Required standard keys

- `page`
- `limit`
- `sort`
- `order`
- `search`

### Optional domain keys

- `status`
- `applicationType`
- `priority`
- `category`
- `district`
- `dateFrom`
- `dateTo`

### Rules

- default `page = 1`
- default `limit = 20`
- max `limit = 100`
- invalid query params return validation error
- sort field must come from an allow-list

## Standard HTTP semantics

### `POST`

Use for create operations or explicit commands.

Examples:

- create application
- submit application
- login
- respond to ticket

### `GET`

Read-only fetch.

### `PATCH`

Partial update of mutable fields when the operation is not better expressed as a named command.

### `PUT`

Replace or fully update a resource only if the payload represents the full mutable shape. If not, prefer `PATCH`.

## Standard route examples for this project

### Auth

- `POST /api/v1/auth/register`
- `POST /api/v1/auth/login`
- `POST /api/v1/auth/refresh`
- `POST /api/v1/auth/forgot-password`
- `POST /api/v1/auth/reset-password`

### Users

- `GET /api/v1/users/me`
- `PATCH /api/v1/users/me`

### Applications

- `POST /api/v1/applications`
- `GET /api/v1/applications/me`
- `GET /api/v1/applications/:id`
- `PATCH /api/v1/applications/:id`
- `POST /api/v1/applications/:id/submit`
- `POST /api/v1/applications/:id/cancel`
- `POST /api/v1/applications/:id/resubmit`

### Admin applications

- `GET /api/v1/admin/applications`
- `GET /api/v1/admin/applications/:id`
- `POST /api/v1/admin/applications/:id/review`
- `POST /api/v1/admin/applications/:id/mark-printed`
- `POST /api/v1/admin/applications/:id/mark-delivered`
- `POST /api/v1/admin/applications/bulk-mark-printed`
- `POST /api/v1/admin/applications/bulk-mark-delivered`

### Appointments

- `GET /api/v1/appointments/me`
- `POST /api/v1/appointments`
- `POST /api/v1/appointments/:id/reschedule`
- `POST /api/v1/appointments/:id/cancel`

### Admin appointments

- `GET /api/v1/admin/appointments`
- `GET /api/v1/admin/appointments/:id`
- `POST /api/v1/admin/appointments/:id/status`

### Support

- `POST /api/v1/support/tickets`
- `GET /api/v1/support/tickets/me`
- `GET /api/v1/support/tickets/:id`
- `POST /api/v1/support/tickets/:id/respond`

### Admin support

- `GET /api/v1/admin/support/tickets`
- `POST /api/v1/admin/support/tickets/:id/assign`
- `POST /api/v1/admin/support/tickets/:id/status`

## Standard list response contract

Every list endpoint must return a uniform `data + meta` shape.

Example:

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

## Deprecation rule

If a route is replaced:

1. document the new route
2. mark the old route as deprecated
3. provide a migration deadline
4. remove the old route after frontend migration is complete

## OpenAPI rule

Every externally consumed endpoint must be represented in an API spec. The spec must include:

- auth requirement
- request shape
- success response
- error response
- example payloads

## Final policy

A route is acceptable only when:

- path naming is predictable
- actor scope is obvious
- payload shape is validated
- response shape is standardized
- the route does not duplicate another route’s responsibility
