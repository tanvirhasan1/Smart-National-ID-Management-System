# 09 — Logging, Auditing, and Observability

This document defines what the system must log, audit, measure, and expose operationally.

## Core principle

Logs help engineers operate the system.  
Audit logs help the business explain who changed what and when.

Do not confuse them.

## Structured logging rule

Production logs must be structured JSON logs, not ad hoc console output.

Recommended logger:

- `pino` or equivalent structured logger

Morgan may remain useful in development, but production logging must be structured and centralized.

## Required log metadata

Every request log should include:

- request ID
- timestamp
- method
- path
- actor id when known
- actor role when known
- status code
- duration
- environment
- service name

## Redaction rule

Logs must redact or avoid:

- passwords
- JWTs
- authorization headers
- cookies
- database credentials
- full document URLs if sensitive
- highly sensitive identity fields when not needed

## Request ID rule

Each request gets a request ID.

Sources:

- incoming header if trusted and allowed
- generated server-side otherwise

This ID must be included in:

- error logs
- important service logs
- client-facing error responses where appropriate

## Audit logging rules

Audit logs are required for privileged mutations.

An audit record must include:

- actor
- actor role
- action
- entity type
- entity id
- timestamp
- short human-readable message
- structured metadata that explains the change

### Good audit examples

- application reviewed
- support ticket assigned
- center deactivated
- appointment marked completed by admin
- admin created or blocked another user
- bulk print action performed

### Bad audit examples

- storing raw passwords
- storing full secret payloads
- vague messages such as “updated stuff”

## Coverage rule for this project

At minimum, audit coverage must exist for:

- application review
- application print/delivery
- support assignment/status changes
- center create/update/toggle
- admin user management
- appointment admin state changes
- export/bulk actions if business policy requires traceability

## Health and readiness

The backend should expose clear operational endpoints.

### Suggested endpoints

- `/health/live` — process is alive
- `/health/ready` — dependencies are ready
- `/health/version` — optional build/version info

A simple `/health` endpoint may exist for convenience, but production systems should separate liveness and readiness.

## Metrics baseline

At minimum, measure:

- request counts
- latency by route
- error rate
- database latency
- auth failures
- rate-limit hits
- queue/export job duration if asynchronous jobs are introduced

## Alerting baseline

Alerts should exist for:

- repeated 5xx spikes
- login abuse spikes
- DB connection failures
- queue backlog spikes
- export failures
- suspicious admin mutation patterns if possible

## Error logging rule

Unexpected errors must be logged internally with:

- request ID
- stack
- sanitized context
- actor if available

But client responses must remain normalized and safe.

## Final policy

If something important changes and nobody can explain who did it, when it happened, or why it failed, the backend is not production-ready.
