# 01 — Architecture and Folder Ownership

This document defines the target backend architecture and who owns what logic.

## Core principle

**A domain owns its own business rules.**

This prevents domain rules from being fragmented across multiple actor-specific route surfaces.

Example:

- `applications` is a domain
- `admin` is an access surface, not a business domain

That means admin application actions may exist as admin routes, but the implementation must still call the **application service** as the single source of truth.

## Required architectural rules

### 1) Thin controllers

Controllers may do only HTTP-level work:

- receive request
- call validation result
- call service method
- send normalized response
- delegate errors to middleware

Controllers must **not** contain long business workflows, cross-module state logic, or repeated authorization rules.

### 2) Services own business rules

Services are responsible for:

- state transitions
- access checks that depend on domain rules
- orchestration across repositories
- audit triggers
- side effects such as notifications or exports
- policy decisions such as “can this application be cancelled?”

### 3) Repositories own database access

Repositories isolate Mongoose queries:

- reads
- writes
- pagination queries
- projections
- aggregates
- transactions

Controllers should not query Mongoose directly. Services should not repeatedly duplicate raw Mongoose statements either.

### 4) Validation is not mixed into business logic

Each module must own its validators:

- request body validation
- query validation
- param validation
- sanitization
- unknown-field rejection

### 5) Shared infrastructure belongs in shared folders

Cross-cutting pieces belong in shared layers:

- error classes
- async handler
- response helper
- auth middleware
- request ID middleware
- config loader
- logger
- common validators

## Canonical target folder structure

```text
backend/
  README.md
  src/
    app.js
    server.js

    config/
      env.js
      db.js
      logger.js

    shared/
      errors/
        app-error.js
        error-codes.js
      middleware/
        auth.js
        validate-request.js
        not-found.js
        error-handler.js
        request-id.js
      utils/
        response.js
        pagination.js
        object-id.js
      constants/
        roles.js
        statuses.js

    modules/
      auth/
        auth.routes.js
        auth.controller.js
        auth.service.js
        auth.repository.js
        auth.validation.js
        auth.mapper.js

      users/
        users.routes.js
        users.controller.js
        users.service.js
        users.repository.js
        users.validation.js

      applications/
        applications.routes.js
        applications.controller.js
        applications.service.js
        applications.repository.js
        applications.validation.js
        applications.policy.js

      appointments/
        appointments.routes.js
        appointments.controller.js
        appointments.service.js
        appointments.repository.js
        appointments.validation.js

      support/
        support.routes.js
        support.controller.js
        support.service.js
        support.repository.js
        support.validation.js

      centers/
        centers.routes.js
        centers.controller.js
        centers.service.js
        centers.repository.js
        centers.validation.js

      audit/
        audit.service.js
        audit.repository.js

    models/
      user.model.js
      application.model.js
      appointment.model.js
      support-ticket.model.js
      center.model.js
      audit-log.model.js

  tests/
    integration/
    unit/
    fixtures/

  scripts/
    seed-admin.js
    backfill-indexes.js
```

## Ownership rules by layer

### Routes

Routes only:

- bind path + method
- attach auth middleware
- attach validation middleware
- call controller

Routes must never contain business logic.

### Controllers

Controllers only:

- parse validated request inputs
- call service methods
- return standardized response

Controllers must never decide business rules independently if that same rule exists somewhere else.

### Services

Services own:

- transitions
- invariants
- actor checks
- orchestration across modules
- domain-level error messages

### Repositories

Repositories own:

- Mongoose query details
- indexes-aware query patterns
- population rules
- pagination helpers
- transaction session handling

## Structure alignment guide

If the repository begins from a classic Express folder layout, align it into the target architecture like this:

- `controllers/authController.js` → `src/modules/auth/auth.controller.js`
- `controllers/userController.js` → `src/modules/users/users.controller.js`
- `controllers/applicationController.js` → `src/modules/applications/applications.controller.js`
- `controllers/appointmentController.js` → `src/modules/appointments/appointments.controller.js`
- `controllers/supportController.js` → `src/modules/support/support.controller.js`
- `controllers/adminController.js` → split by domain and move logic into services; keep only admin route/controller wrappers if still needed
- `middleware/authMiddleware.js` → `src/shared/middleware/auth.js`
- `utils/auditLogger.js` → `src/modules/audit/audit.service.js`

## Anti-patterns that are now banned

- duplicated business logic across two controllers
- direct model access from route files
- long controllers acting as service layer
- route-specific response contracts
- domain rules depending on request object shape
- hidden side effects without audit or logging
- using `admin` as a dumping ground for unrelated domain behavior

## Decision rule for future work

Before writing any backend code, ask:

1. Which domain owns this behavior?
2. What service should be the single source of truth?
3. Which validations are required before service execution?
4. What audit or logging side effects are mandatory?
5. Which response contract should the controller return?

If the answer is unclear, architecture is not ready yet and implementation should pause until ownership is explicit.
