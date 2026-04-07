# 00 - Backend Charter and Engineering Principles

This document defines the project-level backend charter for Smart NID.
It is the governing standard for how the backend must be designed, implemented, and operated.

## Mission

Build a backend that is secure, predictable, auditable, and maintainable for a citizen-facing identity workflow.
The backend must support both day-to-day product delivery and long-term production operations.

## Project boundary

The backend covers the following functional areas:

- public authentication and citizen account access
- citizen profile management
- application submission and lifecycle management
- appointment scheduling
- service center management
- support ticket workflows
- admin operational workflows
- audit history and reporting
- deployment and runtime operations

## Core engineering principles

### 1) Backend authority

The backend is the final authority on:

- role
- account status
- ownership
- system timestamps
- business status transitions
- generated identifiers
- audit behavior

No frontend client may override these rules.

### 2) Domain-first architecture

Business rules belong to domain services.
Actor-specific route surfaces, such as admin routes, may call domain services, but they do not own domain logic.

### 3) Explicit contracts

Every route, payload, response, and error shape must follow a documented contract.
The project must not drift into route-specific conventions.

### 4) System-owned fields are server-only

Fields such as role, status, approval metadata, rejection reason, audit metadata, and generated ids are controlled by the server.
They are never accepted as citizen-controlled input.

### 5) Security by default

Secret hygiene, validation, rate limiting, authorization, and audit logging are baseline requirements, not optional hardening tasks.

### 6) Observability by design

The system must make it possible to answer operational questions quickly:

- what changed
- who changed it
- when it changed
- why it failed
- how to trace a request

### 7) Bounded behavior

List endpoints, bulk actions, exports, and background-capable operations must remain bounded and operationally safe.

### 8) Documentation before drift

When behavior changes, the rulebook and API expectations must be updated together with implementation.

## Project-specific baseline decisions

### Roles

The project defines three roles:

- `citizen`
- `admin`
- `super_admin`

Public registration creates only `citizen` accounts.
Privileged roles are provisioned through protected internal workflows.

### Application lifecycle

The project supports the following canonical application states:

- `draft`
- `submitted`
- `under_review`
- `approved`
- `rejected`
- `printed`
- `delivered`
- `cancelled`

Application review, printing, and delivery are privileged workflows.

### Appointment lifecycle

Appointments use a controlled lifecycle:

- `booked`
- `completed`
- `cancelled`

Appointments may be created only for an eligible application and an active center.

### Support lifecycle

Support tickets use a controlled lifecycle:

- `open`
- `in_progress`
- `resolved`
- `closed`

Assignment and operational status changes are privileged workflows.

### Center lifecycle

Centers are treated as operational entities with a simple availability state:

- `active`
- `inactive`

Inactive centers remain visible for history where needed but are not valid for new citizen bookings.

### Audit posture

Privileged backend mutations must be traceable through append-only audit records.
Audit records are not optional for sensitive operational workflows.

## Non-negotiable implementation guardrails

The project must not allow any of the following:

- public role escalation
- client-controlled system fields
- duplicated workflow logic across controllers
- unvalidated write requests
- unbounded production list endpoints
- admin mutations without audit coverage
- secrets committed to the repository
- inconsistent public response shapes
- undocumented state transitions
- deployment without config validation

## Design review questions

Before implementing a backend feature, answer these questions first:

1. Which domain owns the behavior?
2. Which service is the single source of truth?
3. Which actor is allowed to perform the action?
4. Which fields are client-controlled and which are server-controlled?
5. Which transition rules apply?
6. What audit or logging behavior is required?
7. What tests prove the rule?

If these answers are not clear, implementation is not ready.

## Final policy

This rulebook is not an afterthought to implementation.
It is the implementation contract for the backend.
