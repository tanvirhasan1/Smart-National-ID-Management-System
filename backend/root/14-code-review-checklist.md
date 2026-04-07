# 14 — Code Review Checklist

Use this checklist for every backend pull request.

## Security

- [ ] No secrets added to source control
- [ ] No public privilege escalation path introduced
- [ ] Auth rules are enforced server-side
- [ ] Sensitive data is not logged
- [ ] New dependencies are justified

## API contract

- [ ] Route naming follows standard
- [ ] Response shape follows standard
- [ ] Status codes are appropriate
- [ ] Breaking API changes are documented

## Validation

- [ ] Params validated
- [ ] Query validated
- [ ] Body validated
- [ ] Unknown/forbidden fields rejected
- [ ] System-owned fields are not client-controlled

## Authorization

- [ ] Ownership rules are explicit
- [ ] Role checks are explicit
- [ ] Blocked/inactive user behavior is correct
- [ ] Admin actions are properly restricted

## Business rules

- [ ] State transitions are enforced
- [ ] No duplicated workflow logic exists
- [ ] Edge cases and invalid transitions are handled
- [ ] Bulk actions validate every record safely

## Data layer

- [ ] Queries are bounded or paginated
- [ ] Index implications considered
- [ ] References vs snapshots are appropriate
- [ ] Migrations/backfills documented if needed

## Observability

- [ ] Important mutations are audited
- [ ] Errors are logged safely
- [ ] Response errors are normalized
- [ ] Request tracing remains possible

## Testing

- [ ] Happy path covered
- [ ] Failure path covered
- [ ] Auth/permission behavior tested
- [ ] Regression risk areas tested

## Documentation

- [ ] Relevant docs updated
- [ ] New env vars documented
- [ ] New route behavior documented
- [ ] Reviewer can understand the change without guessing

## Merge rule

If several boxes above are unchecked, the PR is not ready to merge.
