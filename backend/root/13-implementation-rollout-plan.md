# 13 - Implementation Rollout Plan

This document defines the recommended order for building and hardening the backend in a disciplined way.
It is designed to keep architecture ownership, business rules, and production readiness aligned from the start.

## Rollout strategy

Do not build the backend as a collection of isolated route handlers.
Build it in phases so shared foundations are in place before domain complexity grows.

## Phase 1 - foundation bootstrap

### Goals

Establish shared backend infrastructure before domain features expand.

### Tasks

1. Create the shared folder structure and module boundaries.
2. Add environment loading and startup validation.
3. Add centralized response helpers.
4. Add `AppError`, `notFound`, and global `errorHandler` middleware.
5. Add authentication middleware primitives.
6. Add request ID support and baseline logging.
7. Define shared constants for roles, statuses, and limits.
8. Add `.env.example` and `.gitignore` rules for secrets.

### Acceptance criteria

- app fails fast on invalid config
- all routes can return standardized responses
- global error handling is in place
- shared constants exist for domain rules

## Phase 2 - identity and users

### Goals

Build secure account and profile foundations.

### Tasks

1. Implement public registration for `citizen` only.
2. Implement login with status enforcement.
3. Normalize email handling across register, login, and profile updates.
4. Define privileged account provisioning policy.
5. Add profile read/update rules with allow-listed fields only.
6. Add audit coverage for privileged role or status changes.

### Acceptance criteria

- public registration cannot assign privileged roles
- blocked or pending users are handled by policy
- profile updates cannot mutate privileged fields

## Phase 3 - applications domain

### Goals

Implement the application lifecycle with explicit ownership and transitions.

### Tasks

1. Define create, read, update, submit, cancel, and resubmit flows.
2. Centralize application transition rules in one service.
3. Generate stable server-side application identifiers.
4. Keep citizen-editable fields separate from review-only fields.
5. Build the admin review, print, and delivery workflows through the same service layer.
6. Add audit coverage for all privileged application transitions.

### Acceptance criteria

- application transitions are centralized
- citizen payloads cannot mutate review-only fields
- privileged application actions are auditable

## Phase 4 - appointments and centers

### Goals

Implement operational scheduling with center integrity.

### Tasks

1. Model centers as operational resources.
2. Use real center references in appointments.
3. Enforce approved-application preconditions for booking.
4. Enforce active-center, future-slot, and capacity rules.
5. Define appointment completion, cancellation, and reschedule policy.
6. Add audit coverage for admin appointment mutations.

### Acceptance criteria

- appointments cannot be created for invalid or inactive centers
- appointment transitions are explicit and bounded
- admin appointment changes are audited

## Phase 5 - support and admin operations

### Goals

Complete support workflows and keep admin routes thin.

### Tasks

1. Implement support ticket creation, response, assignment, and resolution policy.
2. Restrict citizen access to own tickets only.
3. Use one public admin namespace for privileged workflows.
4. Keep admin route handlers as wrappers over domain services.
5. Define bulk-action limits and reporting behavior.

### Acceptance criteria

- support ownership and assignment rules are enforced
- admin surfaces remain consistent and not duplicated
- bulk operations remain bounded and auditable

## Phase 6 - observability, testing, and release readiness

### Goals

Prepare the backend for safe production operation.

### Tasks

1. Add structured production logging.
2. Add request tracing and health endpoints.
3. Add integration tests for auth and domain-critical flows.
4. Add CI checks for tests, secret hygiene, and review gates.
5. Add graceful shutdown.
6. Document deployment and smoke-test steps.

### Acceptance criteria

- critical routes are test-covered
- logs and health endpoints support operations
- deploys are validated and reversible

## Rollout rule for teams starting from a classic Express structure

If implementation begins from a flat `controllers/`, `routes/`, and `models/` layout, move toward the target module structure in the same order:

1. shared infrastructure
2. auth and users
3. applications
4. appointments and centers
5. support
6. admin wrappers
7. observability and CI

This keeps business rules from spreading uncontrollably while the codebase grows.

## Final policy

The backend should grow by design, not by accumulation.
Every new phase should make the system more explicit, more testable, and more production-ready.
