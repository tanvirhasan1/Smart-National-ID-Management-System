# 10 — Testing, Quality Gates, and Definition of Done

This document defines what must be tested before backend code is considered complete.

## Testing stack recommendation

Recommended baseline for this project:

- Jest
- Supertest
- mongodb-memory-server or isolated test database
- seed/fixture helpers

Use one testing stack consistently.

## Test layers

### Unit tests

Test:

- service methods
- transition guards
- utility functions
- validators that contain custom logic

### Integration tests

Test full request flows for:

- auth routes
- application routes
- appointment routes
- support routes
- admin routes

### Contract tests

Ensure response shapes and important error contracts do not drift unexpectedly.

## Required tests for this project

### Auth

- register ignores/rejects client-supplied `role`
- duplicate email rejected
- blocked user login denied
- invalid token rejected
- protected route works for valid active user

### Users

- user can update allowed profile fields
- user cannot update role/status/isVerified directly

### Applications

- create application with valid payload succeeds
- citizen cannot update forbidden fields
- citizen cannot update final states
- admin review requires valid transition
- rejection requires reason
- cancelled/printed/delivered state transition restrictions hold
- print/delivery flow creates audit logs

### Appointments

- only approved application can book
- booking requires active center
- booking rejects duplicate active appointment
- invalid or past appointment date rejected
- admin status update respects final-state policy
- admin status update creates audit logs

### Support

- citizen can create own ticket
- citizen cannot access another citizen’s ticket
- admin can assign ticket only to admin
- closed ticket rejects responses unless reopened by policy
- status changes follow workflow

### Centers

- duplicate center identity rejected
- inactive center hidden from citizen booking flow
- deactivation respects future-booking policy if implemented

## Quality gates for pull requests

A PR must not be merged unless all of the following are true:

- tests pass
- no secrets are added
- validation is present
- authorization is explicit
- response contract matches standard
- docs are updated if behavior changed
- dead code is removed or intentionally documented
- new indexes/migrations are documented when schema behavior changes

## Coverage policy

Coverage is not the only quality metric, but there must be meaningful automated coverage on critical flows.

Recommended minimum policy:

- all privileged workflows covered
- all state-transition workflows covered
- all auth failure paths covered
- all public write endpoints covered

## Definition of done

A backend task is done only when:

- code is implemented
- validations are added
- errors are normalized
- auth rules are enforced
- tests exist
- docs are updated
- audit/logging rules are satisfied
- reviewer checklist passes

## Final policy

Untested business rules are unstable business rules.  
A backend change without tests is not finished.
