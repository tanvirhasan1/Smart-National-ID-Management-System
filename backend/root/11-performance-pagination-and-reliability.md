# 11 — Performance, Pagination, and Reliability

This document defines how the backend must behave under growth and operational stress.

## Pagination rule

All list endpoints must paginate.

### Required standard

- default `limit = 20`
- max `limit = 100`
- default `page = 1`
- return `total` and `hasNextPage`
- use stable sort order

Unbounded list responses are forbidden for production-facing routes.

## Query efficiency rules

- use projections (`select`) when full documents are not needed
- use `lean()` for read-only list queries when model methods/virtuals are not required
- avoid unnecessary `populate`
- ensure heavily used filters have indexes
- avoid loading all documents for dashboard counts when aggregated counts can be computed efficiently

## Bulk operation rules

Bulk operations must:

- validate all IDs
- cap batch size
- report skipped records
- remain safe on retry when possible
- create audit logs

Recommended max bulk size: `100`

## Export rules

Large exports must not run as blocking synchronous HTTP requests forever.

When result sets become large:

- move export generation to async jobs
- return job status or signed download flow
- avoid returning massive JSON payloads

If an endpoint returns JSON rows, it should not be named as a file export unless that is intentional and documented.

## Database index rules

Every frequently used filter path should have an index strategy documented. This especially includes:

- application status and applicant
- appointment date and center
- support status and assignee
- audit entity and action
- user email and status

## Reliability rules

### Startup

- fail fast if config is invalid
- fail fast if DB connection is unavailable and the app cannot operate correctly

### Shutdown

Implement graceful shutdown for:

- SIGTERM
- SIGINT

The server should stop accepting new requests and close database connections cleanly.

### Idempotency

For operations likely to be retried:

- prefer idempotent patterns where possible
- use explicit state checks before writes
- avoid duplicate creation on repeated requests

### Time handling

- store timestamps in UTC
- compare time consistently
- validate future slots using server-side time, not frontend trust

## Caching rule

Only cache data that is safe and worth caching.

Good candidates:

- active center list
- static lookup values
- non-sensitive configuration

Do not cache sensitive per-user resources without careful invalidation and authorization strategy.

## Rate limiting rule

Not all routes deserve the same rate limit.

Recommended categories:

- public auth routes: strict
- protected write routes: moderate
- dashboards/exports: admin-specific controls
- health routes: protected or lightly exposed depending environment

## Final policy

Production performance is not “optimize later”.  
It starts with bounded queries, safe transitions, and predictable runtime behavior.
