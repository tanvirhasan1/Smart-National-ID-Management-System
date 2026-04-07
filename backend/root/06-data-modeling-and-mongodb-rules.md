# 06 — Data Modeling and MongoDB Rules

This document defines how schemas, references, indexes, and persistence must work.

## Core rule

**Models represent business truth, not just convenient storage.**

That means schemas must protect invariants, not merely mirror frontend forms.

## Schema design rules

### 1) Every business model uses timestamps

All business collections must use `timestamps: true`.

### 2) Enums live in constants

Enum values should be shared as constants, not duplicated ad hoc across routes, controllers, and models.

Examples:

- roles
- application statuses
- appointment statuses
- support ticket statuses
- support priorities

### 3) System-managed fields are immutable to clients

These fields are server-owned:

- ids
- status timestamps
- approval metadata
- ticket numbers
- application numbers
- audit actor information

### 4) Prefer references for relational integrity

If one document depends on another domain entity, store a real reference.

Project-specific modeling rule:

- `Appointment` should store `center` as a `Center` reference
- optional snapshot fields such as `centerNameSnapshot` may be added for historical display, but the source of truth remains the reference

### 5) Use denormalized snapshots only intentionally

Snapshot fields are acceptable for immutable history or report display, but they must be documented.

## Model-specific rules for this project

### User

Required rules:

- `email` unique and normalized
- `role` enum
- `status` enum
- `password` never selected in standard reads
- add `tokenVersion` if token revocation is introduced

Recommended indexes:

- unique `email`
- index on `role`
- index on `status`

### Application

Required rules:

- `applicationId` must be unique, stable, and generated server-side
- `applicant` must reference `User`
- status transitions must be enforced in service layer
- review-only fields are server-managed
- final statuses should become effectively immutable

Recommended indexes:

- unique `applicationId`
- index on `applicant, createdAt`
- index on `status, createdAt`
- index on `applicationType, createdAt`

### Appointment

Required rules:

- one appointment lifecycle per application unless the product explicitly supports multiple historical appointments
- `application` references `Application`
- `applicant` references `User`
- `center` references `Center`
- `appointmentDate` stores exact timestamp in UTC
- `status` enum must be enforced centrally

Recommended indexes:

- unique index on `application` if one appointment per application is the business rule
- index on `applicant, createdAt`
- index on `center, appointmentDate`
- index on `status, appointmentDate`

### SupportTicket

Required rules:

- `ticketNumber` unique and server-generated
- `citizen` reference required
- `assignedTo` references admin or super admin only
- `responses` entries must include actor role and timestamp
- closed/resolved workflow must follow service rule

Recommended indexes:

- unique `ticketNumber`
- index on `citizen, createdAt`
- index on `status, priority, createdAt`
- index on `assignedTo, status`

### Center

Required rules:

- compound uniqueness on logical identity
- inactive centers remain queryable for history but unavailable for new citizen bookings

Recommended indexes:

- unique `name + district`
- index on `district, isActive`

### AuditLog

Required rules:

- audit records are append-only
- normal API paths must not edit or delete audit logs
- actor, action, entity, and timestamp are mandatory
- `meta` may remain flexible, but its content must be documented and must not store secrets

Recommended indexes:

- index on `entityType, entityId, createdAt`
- index on `actor, createdAt`
- index on `action, createdAt`

## ID generation rule

Application IDs must not rely only on a raw timestamp. Use a stronger server-side generation strategy for production.

Recommended options:

- UUID-based identifiers
- sequence-based business IDs
- time + random suffix
- scoped prefixes by entity type

The same principle applies to support ticket numbers.

## Transactions rule

Use MongoDB transactions for multi-document workflows when consistency matters.

Examples:

- creating admin user + audit log
- application finalization + related appointment lifecycle change
- complex bulk state changes with associated audit writes

## Migration rule

Any schema change must include:

- migration or backfill strategy
- index rollout strategy
- rollback plan if needed
- updated API docs if response shape changes

## PII rule

This project handles sensitive citizen information. That means:

- no unnecessary duplication of PII
- no secrets in audit metadata
- no password or token-like data outside auth storage
- document/file references must be controlled and validated

## Final policy

A schema is not just storage.  
It is a guardrail for correctness, security, and future maintainability.
