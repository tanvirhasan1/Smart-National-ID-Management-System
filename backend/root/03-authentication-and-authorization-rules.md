# 03 — Authentication and Authorization Rules

This document defines how identity, tokens, roles, and access control must work.

## Roles

The system defines three roles:

- `citizen`
- `admin`
- `system_supervisor`
- `support_stuff`

Role assignment is controlled strictly by backend policy.

## Public registration policy

### Allowed actor

Unauthenticated public users may only create `citizen` accounts.

### Required rule

Public registration must ignore or reject any client-supplied `role`.

Allowed registration payload:

- `fullName`
- `email`
- `phone`
- `password`

Disallowed public registration payload:

- `role`
- `status`
- `isVerified`
- any admin-only fields

### Admin provisioning policy

`admin` accounts may be created only through one of these mechanisms:

- protected internal seed script
- protected super-admin-only user management endpoint
- manual operations workflow outside public API

## Login policy

Login must verify all of the following:

- user exists
- password matches
- `status === active`
- account is not locked
- verification policy is satisfied if verification is enabled

### Mandatory enforcement

`status` must be enforced on login and on protected routes.  
`isVerified` may remain advisory until a full verification flow is implemented, but that policy must be explicit and documented.

## Token rules

### JWT payload

JWT payload must stay minimal.

Recommended payload:

- `sub` (user id)
- `role`
- `tokenVersion`

Do not place profile data, email, phone, or permissions arrays in JWT unless absolutely necessary.

### Expiration

- access token: short-lived
- refresh token: longer-lived and revocable

A single long-lived JWT may be tolerated only during tightly controlled local prototyping. The production target is short-lived access tokens with a revocation-capable strategy.

### Revocation policy

Support one of these:

- token version on user record
- refresh token store
- session blacklist for forced logout events

## Protected route rules

Every protected route must:

1. require a valid access token
2. load current user state from database
3. deny access if user is missing
4. deny access if user is blocked, pending, or disabled by policy
5. attach the current sanitized user object to the request context

## Authorization rules

### Citizen

A citizen may access only their own resources unless a route is explicitly public.

Examples:

- own profile
- own applications
- own appointments
- own support tickets

### Admin

Admin may perform operational workflows that are approved by the business:

- review applications
- assign support tickets
- manage centers
- view operational dashboards
- update appointment state
- manage print/delivery workflows

### Super admin

Super admin includes admin permissions plus governance actions such as:

- creating or managing admin accounts
- changing critical configuration records
- viewing sensitive audit/report data beyond standard admin scope
- overriding restricted operational states when policy allows it

## Authorization middleware rules

The shared auth middleware layer must expose clear primitives:

- `requireAuth()`
- `requireRoles(...roles)`
- `requireActiveUser()`
- `requireOwnership(resolver)` when needed

Do not mix ownership checks ad hoc inside every controller if the pattern can be standardized.

## Password policy

Minimum requirements:

- minimum length: 8
- reject common/breached passwords if possible
- hash with bcrypt using configurable rounds
- never log passwords
- never return password hash
- password reset tokens must be single-use and time-bound

## Email normalization rule

Emails must always be:

- trimmed
- lowercased before comparison and persistence

This is required at registration, login, and profile updates.

## Account status rules

Recommended status values:

- `active`
- `blocked`
- `pending`

Rules:

- `blocked` cannot log in
- `pending` may be denied login depending on onboarding policy
- status changes must be auditable when performed by admins

## Mandatory implementation notes

At minimum, the authentication layer must enforce these rules:

- public registration cannot set `role`
- email is normalized before comparison and persistence
- blocked users are denied at login
- blocked users are denied on protected routes
- role and status changes are restricted to privileged actors
- privileged account changes are audited

## Final policy

Authentication proves identity.  
Authorization proves permission.  
Neither one may rely on frontend trust.

The backend is the final authority on role, status, ownership, and access.
