# 08 — Security, Secrets, and Compliance

This backend handles citizen identity-related data. That means security is not optional engineering polish. It is part of the product itself.

## Secret hygiene baseline

The repository must be set up with these security basics from the start:

- use strong database credentials
- use a strong JWT secret
- keep `.env` out of version control
- maintain `.env.example` for documentation
- rotate any exposed secret immediately if an exposure ever occurs

## Secret management rules

### Never commit

Never commit:

- `.env`
- API keys
- database credentials
- JWT secrets
- service account files
- SMTP secrets
- storage credentials

### Required replacement

Commit only:

- `.env.example`
- environment documentation
- config schema validation

### Rotation rule

If a secret is exposed in source control, logs, screenshots, or chat, rotate it immediately. Do not “leave it for later”.

## Least privilege rules

### Database user

The database user used by the app must have only the permissions needed by the app.

### Admin actions

Privileged actions must require authenticated admin actors and generate audit logs.

## Sensitive data handling

This project may store personal identity information. Therefore:

- log redaction is mandatory
- raw tokens must never be logged
- passwords must never be logged
- document/file URLs must be access-controlled
- audit logs must avoid storing unnecessary PII
- exports must be restricted to authorized actors

## Auth security baseline

Required controls:

- bcrypt hashing with configurable rounds
- short-lived access tokens in production
- login rate limiting
- blocked/inactive account enforcement
- optional refresh token rotation when implemented
- role changes audited

## API security baseline

Required controls:

- Helmet enabled
- strict CORS allow-list
- request body size limits
- input validation on every write route
- rate limiting by route sensitivity
- standardized unauthorized/forbidden handling
- no trust in frontend-supplied ownership or role fields

## File upload security rules

If file/document upload is enabled later:

- validate file type and size
- scan or verify file content if feasible
- use controlled storage paths or signed URLs
- never trust original filename
- store metadata separately from storage key
- enforce per-document ownership and authorization
- do not expose raw storage URLs publicly by default

## Dependency security

- remove unused dependencies
- pin or review major upgrades carefully
- run dependency scanning regularly
- document why each security-sensitive dependency exists

## Operational security

### Production runtime rules

- `NODE_ENV=production`
- trust proxy configured if behind reverse proxy
- HTTPS terminated correctly
- health endpoints do not leak secrets
- logs aggregated securely
- backups protected

### Incident response baseline

When a security issue is found:

1. contain the issue
2. rotate relevant credentials
3. assess affected data
4. document remediation
5. add a test or process guard so it does not recur

## Compliance mindset

Even if formal regulation is not yet implemented, the backend must behave as though sensitive citizen data requires:

- minimization
- auditability
- controlled access
- incident readiness
- retention awareness

## Final policy

Security is not a single middleware.  
It is the combined result of secret hygiene, strict authorization, safe defaults, and disciplined operational behavior.
