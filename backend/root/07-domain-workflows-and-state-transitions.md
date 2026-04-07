# 07 — Domain Workflows and State Transitions

This document defines the allowed lifecycle of the project’s core business entities.

## Why this matters

This system uses statuses for applications, appointments, support tickets, and centers. Without a formal transition policy, the same entity can be moved incorrectly from different entry points.

This document makes transitions explicit.

---

## 1) Application lifecycle

### Canonical statuses

- `draft`
- `submitted`
- `under_review`
- `approved`
- `rejected`
- `printed`
- `delivered`
- `cancelled`

### Ownership rules

- citizen owns draft preparation and resubmission inputs
- admin owns review, print, and delivery workflow
- server owns timestamps and transition enforcement

### Allowed transitions

- `draft -> submitted`
- `submitted -> under_review`
- `submitted -> rejected`
- `submitted -> cancelled`
- `under_review -> approved`
- `under_review -> rejected`
- `under_review -> cancelled`
- `rejected -> submitted` via explicit resubmit action
- `approved -> printed`
- `printed -> delivered`

### Disallowed transitions

- `delivered -> anything else`
- `printed -> approved`
- `cancelled -> approved`
- `approved -> rejected`
- direct `submitted -> delivered`
- any citizen-controlled update of review fields

### Edit rules

Citizen may edit only when status is:

- `draft`
- `rejected`

Citizen may cancel only when status is:

- `draft`
- `submitted`
- `under_review`

Rejection reason:

- written only by admin
- required when rejected
- cleared on approved or resubmitted states

### API recommendation

Use explicit actions:

- `POST /applications/:id/submit`
- `POST /applications/:id/resubmit`
- `POST /applications/:id/cancel`
- `POST /admin/applications/:id/review`
- `POST /admin/applications/:id/mark-printed`
- `POST /admin/applications/:id/mark-delivered`

---

## 2) Appointment lifecycle

### Canonical statuses

- `booked`
- `completed`
- `cancelled`

### Preconditions for booking

An appointment may be booked only when:

- application exists
- application belongs to requesting citizen
- application status is `approved`
- center is active
- slot exists
- slot is in the future
- capacity is available
- no conflicting active appointment exists for the same application

### Allowed transitions

- `booked -> completed`
- `booked -> cancelled`

### Final states

- `completed`
- `cancelled`

### Reschedule rule

Rescheduling should update the existing appointment record or create a controlled versioned flow. It should not silently create duplicate active appointments.

### Audit rule

Admin appointment status changes must create audit logs.

---

## 3) Support ticket lifecycle

### Canonical statuses

- `open`
- `in_progress`
- `resolved`
- `closed`

### Allowed transitions

- `open -> in_progress`
- `in_progress -> resolved`
- `resolved -> closed`

Optional controlled action:

- `resolved -> in_progress` through explicit reopen command
- `closed -> in_progress` only through explicit super-admin-approved reopen policy

### Response rules

- citizen may respond only to own ticket
- admin/super_admin may respond to tickets in scope
- closed tickets reject new responses unless reopened

### Assignment rule

Assignment may happen only to `admin` or `super_admin`.

### Resolution rule

Moving a ticket to `resolved` should require resolution notes by policy.

---

## 4) Center lifecycle

### Canonical states

- `active`
- `inactive`

### Rules

- inactive centers are hidden from citizen booking flows
- deactivating a center with future booked appointments requires operational review
- hard delete is discouraged if historical appointments exist

---

## 5) Audit log lifecycle

Audit logs are append-only.  
They do not transition through business states.

### Required write events

At minimum, create audit logs for:

- admin user provisioning and role changes
- application review
- application print and delivery actions
- support assignment and status changes
- center create/update/activation changes
- appointment admin status changes
- privileged export or bulk operations when policy requires it

---

## 6) Bulk operations policy

Bulk operations are allowed only when:

- input IDs are validated
- each record is checked against transition rules
- skipped records are reported clearly
- audit records are created
- maximum batch size is enforced

Recommended maximum batch size: `100`

---

## Final policy

State transitions are part of business law.  
They must live in one place, be test-covered, and never be duplicated across controllers.
