# Smart NID Backend Foundation Standards

This `README.md` is the entry point for the backend rulebook of this project.
It defines how the backend must be designed, implemented, reviewed, tested, and deployed for a production-grade web application.

These standards are written to act as the standing engineering contract for all contributors.
They are intentionally prescriptive: the backend must follow these documents instead of inventing rules per feature.

## Scope

These standards apply to the full backend surface of this project:

- authentication and user accounts
- citizen profiles
- applications
- appointments
- centers
- support tickets
- admin operations
- audit logging
- reporting and exports
- runtime configuration and deployment

## Engineering posture

This backend is governed by the following non-negotiable principles:

- the backend is the final authority on identity, role, status, ownership, and transitions
- business rules belong to domain services, not scattered controllers
- system-owned fields are never accepted from client payloads
- one canonical response contract is used across all routes
- one canonical admin API surface is exposed publicly
- all write inputs are validated before business logic runs
- privileged mutations are auditable
- list endpoints are bounded and paginated
- secrets are never stored in source control
- a feature is not production-ready until tests, docs, and review gates are satisfied

## Recommended implementation sequence

### Stage 1 - foundation

Build shared backend foundations first:

- environment validation
- database bootstrap
- shared constants
- auth middleware
- response helpers
- error middleware
- request logging
- request ID handling

### Stage 2 - core modules

Build business modules on top of the shared foundation:

- auth
- users
- applications
- appointments
- centers
- support
- audit

### Stage 3 - operational readiness

Harden the system for production:

- pagination and performance controls
- structured logging and audit coverage
- tests and CI quality gates
- deployment validation
- health, readiness, and incident readiness

## Document map

Read these files in order:

1. [00 Backend Charter and Engineering Principles](./root/00-backend-charter-and-engineering-principles.md)  
   Project-level backend principles, domain boundaries, and mandatory guardrails.

2. [01 Architecture and Folder Ownership](./root/01-architecture-and-folder-ownership.md)  
   Canonical architecture, folder strategy, and ownership by layer.

3. [02 API Design and Route Standards](./root/02-api-design-and-route-standards.md)  
   API versioning, route naming, public contract shape, and admin surface rules.

4. [03 Authentication and Authorization Rules](./root/03-authentication-and-authorization-rules.md)  
   Registration, login, roles, tokens, status enforcement, and access control.

5. [04 Validation, Sanitization, and Input Rules](./root/04-validation-sanitization-and-input-rules.md)  
   Input allow-lists, request validation, unknown-field rejection, and normalization.

6. [05 Response, Error, and Exception Rules](./root/05-response-error-and-exception-rules.md)  
   Success and error contracts, error classes, and middleware behavior.

7. [06 Data Modeling and MongoDB Rules](./root/06-data-modeling-and-mongodb-rules.md)  
   Schemas, references, indexes, id strategy, migration expectations, and data integrity.

8. [07 Domain Workflows and State Transitions](./root/07-domain-workflows-and-state-transitions.md)  
   Allowed lifecycles for applications, appointments, support tickets, centers, and audit records.

9. [08 Security, Secrets, and Compliance](./root/08-security-secrets-and-compliance.md)  
   Secret hygiene, API security baseline, data handling, and operational security posture.

10. [09 Logging, Auditing, and Observability](./root/09-logging-auditing-and-observability.md)  
    Structured logs, audit requirements, request IDs, metrics, and health visibility.

11. [10 Testing, Quality Gates, and Definition of Done](./root/10-testing-quality-gates-and-definition-of-done.md)  
    Required tests, CI expectations, and merge readiness standards.

12. [11 Performance, Pagination, and Reliability](./root/11-performance-pagination-and-reliability.md)  
    Bounded queries, index expectations, graceful shutdown, and operational reliability.

13. [12 Environment Config and Deployment](./root/12-environment-config-and-deployment.md)  
    Configuration policy, startup validation, deployment checklist, and runtime behavior.

14. [13 Implementation Rollout Plan](./root/13-implementation-rollout-plan.md)  
    Practical rollout order for building and hardening the backend in a disciplined way.

15. [14 Code Review Checklist](./root/14-code-review-checklist.md)  
    Reviewer checklist for correctness, security, consistency, and production readiness.

16. [15 Implementation Templates](./root/15-implementation-templates.md)  
    Example patterns for controllers, services, validators, responses, and middleware.

## Definition of production-ready for this repository

A backend change is production-ready only when all of the following are true:

- architecture ownership is clear
- request payloads are validated
- authorization is explicit
- state transitions are enforced centrally
- response and error shapes follow the shared contract
- privileged mutations produce audit coverage
- list endpoints are bounded
- configuration is documented and validated
- tests cover success and failure paths
- relevant docs are updated together with the change

## Usage rule

`README.md` is the entry point.
The `root/` folder contains the detailed source of truth.
If any implementation choice conflicts with these documents, update the rules first or pause the implementation.
