<p align="center">
  <img src="https://i.ibb.co/TpkBYgF/Overall-TOP.jpg" alt="Smart NID Card Management System Logo" width="600" />
</p>

# Smart NID Card Management System

A full-stack **Smart National ID Card Management System** built with a **React/Vite frontend** and a **Node.js/Express/MongoDB backend**.

This system is designed to automate and simplify Smart National ID services for citizens. It supports citizen registration, OTP verification, Smart NID application submission, appointment booking, application tracking, digital NID viewing, support ticketing, and an admin panel for application review, printing, delivery, support management, user management, centers, and audit logs.

---

## Table of Contents

- [Project Overview](#project-overview)
- [Features](#features)
- [Tech Stack](#tech-stack)
- [Repository Structure](#repository-structure)
- [Roles and Access](#roles-and-access)
- [Prerequisites](#prerequisites)
- [Installation Process](#installation-process)
- [Environment Variables](#environment-variables)
- [Available Scripts](#available-scripts)
- [Main Routes](#main-routes)
- [Backend API Surface](#backend-api-surface)
- [Database Models](#database-models)
- [Security Notes](#security-notes)
- [Production Readiness Checklist](#production-readiness-checklist)
- [Known Integration Checks](#known-integration-checks)
- [Contribution Rules](#contribution-rules)
- [License](#license)

---

## Project Overview

The **Smart NID Card Management System** is a web-based government service management platform for Bangladesh. It allows citizens to register online, verify their account through OTP, submit Smart NID applications, upload required documents, book biometric enrollment appointments, track application progress, download digital NID cards, and communicate with support.

The system also provides an admin panel where authorized administrators can review applications, approve or reject submissions, manage appointments, control biometric centers, manage printing and delivery workflows, handle support tickets, manage users, and monitor audit logs.

The project aims to reduce manual processing, improve transparency, increase service quality, and provide a more efficient identity management system.

---

## Features

### Citizen Features

- Public landing page
- Citizen registration
- Birth certificate-based validation
- OTP verification
- Login and logout
- Forgot/reset password
- Citizen dashboard
- Profile view and update
- Smart NID application form
- Document upload
- Appointment booking
- Application status tracking
- Digital NID view with QR support
- Support ticket creation and replies

### Admin Features

- Admin login
- Admin dashboard statistics
- Internal user management
- Application review and decision workflow
- Appointment management
- Biometric center management
- Printing queue management
- Delivery tracking
- Support ticket management
- Audit log visibility
- Reports and export endpoints

---

## Tech Stack

### Frontend

- React.js
- Vite
- React Router DOM
- Axios
- React Hook Form
- React Toastify
- QRCode React
- Recharts
- React Icons
- Tailwind CSS
- Plain CSS / component-based CSS

### Backend

- Node.js
- Express.js
- MongoDB
- Mongoose
- JSON Web Token authentication
- bcrypt / bcryptjs
- express-validator
- cookie-parser
- helmet
- cors
- multer
- Cloudinary
- Nodemailer
- PDFKit
- QRCode
- Morgan

### Tools

- Git
- GitHub
- Postman
- MongoDB Atlas or local MongoDB
- Cloudinary
- Vercel / Netlify for frontend deployment
- Render / Railway / AWS / DigitalOcean for backend deployment

---

## Repository Structure

```txt
smart-nid-card/
├── README.md
├── backend/
│   ├── config/
│   ├── controllers/
│   ├── middleware/
│   ├── models/
│   ├── routes/
│   ├── root/
│   ├── utils/
│   ├── package.json
│   └── server.js
└── frontend/
    ├── public/
    ├── src/
    │   ├── components/
    │   │   ├── admin/
    │   │   ├── api/
    │   │   ├── citizen/
    │   │   ├── common/
    │   │   ├── context/
    │   │   ├── pages/
    │   │   ├── styles/
    │   │   └── utils/
    │   ├── services/
    │   └── main.jsx
    ├── package.json
    ├── vite.config.js
    ├── tailwind.config.js
    └── postcss.config.js
```

---

## Roles and Access

The system supports the following roles:

| Role | Description |
|---|---|
| `citizen` | Regular public user who can apply for Smart NID services |
| `admin` | Main administrative user who can manage applications, users, appointments, support, printing, and delivery |
| `system_supervisor` | Higher-level authority who can monitor reports, audit logs, and system activities |
| `support_staff` | Internal support user who can handle citizen support tickets |

Frontend protected routes and backend middleware both enforce role-based access. The backend remains the final authority for authentication, authorization, ownership, role, and status transitions.

---

## Prerequisites

Before running this project locally, install or prepare the following:

- Node.js 20 LTS or newer
- npm
- MongoDB database connection string
- Cloudinary account for document/file uploads
- Email account or SMTP provider for OTP and password reset emails
- Git
- Code editor, for example VS Code
- Postman for API testing

---

## Installation Process

Follow these steps to run the project locally.

---

### 1. Clone the Repository

```bash
git clone https://github.com/tanvirhasan1/Smart-National-ID-Management-System.git
cd smart-nid-card
```

Replace `<repository-url>` with your actual GitHub repository link.

---

### 2. Install Backend Dependencies

Go to the backend folder:

```bash
cd backend
```

Install dependencies:

```bash
npm install
```

---

### 3. Create Backend Environment File

Create a `.env` file inside the `backend` folder:

```bash
touch .env
```

Then add the following environment variables:

```env
NODE_ENV=development
PORT=5000
FRONTEND_URL=http://localhost:5173

MONGODB_URI=your_mongodb_connection_string

ACCESS_TOKEN_SECRET=replace_with_strong_access_secret
ACCESS_TOKEN_EXPIRE=15m
REFRESH_TOKEN_SECRET=replace_with_strong_refresh_secret
REFRESH_TOKEN_EXPIRE=7d

COOKIE_SECURE=false
COOKIE_SAME_SITE=lax

CLOUDINARY_CLOUD_NAME=your_cloudinary_cloud_name
CLOUDINARY_API_KEY=your_cloudinary_api_key
CLOUDINARY_API_SECRET=your_cloudinary_api_secret

MAIL_PROVIDER=gmail
MAIL_USER=your_email@example.com
MAIL_PASS=your_email_app_password

MAIL_HOST=smtp.example.com
MAIL_PORT=587
MAIL_SECURE=false
```

Important: Do not commit real `.env` values to GitHub.

---

### 4. Start Backend Server

From the `backend` folder, run:

```bash
npm run dev
```

The backend server should run at:

```txt
http://localhost:5000
```

Health check URL:

```txt
http://localhost:5000/health
```

---

### 5. Install Frontend Dependencies

Open a new terminal and go to the frontend folder:

```bash
cd frontend
```

Install frontend dependencies:

```bash
npm install
```

---

### 6. Create Frontend Environment File

Create a `.env` file inside the `frontend` folder:

```bash
touch .env
```

Add the following variable:

```env
VITE_API_URL=http://localhost:5000/api
```

---

### 7. Start Frontend Server

From the `frontend` folder, run:

```bash
npm run dev
```

The frontend should run at:

```txt
http://localhost:5173
```

---

### 8. Open the Application

Open your browser and visit:

```txt
http://localhost:5173
```

Now the frontend and backend should be connected locally.

---

## Environment Variables

### Backend `.env`

| Variable | Description |
|---|---|
| `NODE_ENV` | Project environment, for example `development` |
| `PORT` | Backend server port |
| `FRONTEND_URL` | Frontend URL for CORS |
| `MONGODB_URI` | MongoDB connection string |
| `ACCESS_TOKEN_SECRET` | Secret key for access token |
| `ACCESS_TOKEN_EXPIRE` | Access token expiration time |
| `REFRESH_TOKEN_SECRET` | Secret key for refresh token |
| `REFRESH_TOKEN_EXPIRE` | Refresh token expiration time |
| `COOKIE_SECURE` | Cookie secure mode |
| `COOKIE_SAME_SITE` | Cookie same-site policy |
| `CLOUDINARY_CLOUD_NAME` | Cloudinary cloud name |
| `CLOUDINARY_API_KEY` | Cloudinary API key |
| `CLOUDINARY_API_SECRET` | Cloudinary API secret |
| `MAIL_PROVIDER` | Email provider |
| `MAIL_USER` | Email username |
| `MAIL_PASS` | Email app password |
| `MAIL_HOST` | SMTP host |
| `MAIL_PORT` | SMTP port |
| `MAIL_SECURE` | SMTP secure mode |

### Frontend `.env`

| Variable | Description |
|---|---|
| `VITE_API_URL` | Backend API base URL |

---

## Available Scripts

### Backend Scripts

Run these commands inside the `backend` folder:

```bash
npm run dev
```

Starts the backend server with development mode.

```bash
npm start
```

Starts the backend server with Node.js.

---

### Frontend Scripts

Run these commands inside the `frontend` folder:

```bash
npm run dev
```

Starts the Vite development server.

```bash
npm run build
```

Builds the frontend for production.

```bash
npm run preview
```

Previews the production build locally.

---

## Main Routes

### Public Routes

| Route | Description |
|---|---|
| `/` | Landing page |
| `/login` | Citizen login |
| `/register` | Citizen registration |
| `/verify-otp` | OTP verification |
| `/forgot-password` | Password reset request |
| `/admin/login` | Admin login |

### Citizen Routes

| Route | Description |
|---|---|
| `/dashboard` | Citizen dashboard |
| `/profile` | Profile page |
| `/apply` | NID application form |
| `/book-appointment/:applicationId` | Appointment booking |
| `/track-application` | Application tracking |
| `/digital-nid/:id` | Digital NID page |
| `/support` | Citizen support tickets |

### Admin Routes

| Route | Description |
|---|---|
| `/admin/dashboard` | Admin dashboard |
| `/admin/users` | Internal user management |
| `/admin/applications` | Application review list |
| `/admin/applications/review/:id` | Application review details |
| `/admin/appointments` | Appointment management |
| `/admin/printing` | Printing queue |
| `/admin/delivery` | Delivery tracking |
| `/admin/support` | Support management |
| `/admin/audit-logs` | Audit log viewer |

---

## Backend API Surface

Base URL:

```txt
/api
```

---

### Auth API

```txt
POST /api/auth/register
POST /api/auth/verify-otp
POST /api/auth/resend-otp
POST /api/auth/login
POST /api/auth/forgot-password
POST /api/auth/reset-password
POST /api/auth/refresh
POST /api/auth/logout
```

---

### User API

```txt
GET /api/users/profile
PUT /api/users/profile
GET /api/users/dashboard/summary
```

---

### Application API

```txt
POST /api/applications
GET /api/applications/prefill
GET /api/applications/my
GET /api/applications/:id
PUT /api/applications/:id
PATCH /api/applications/:id/cancel
POST /api/applications/:id/documents/:documentType
```

---

### Appointment API

```txt
GET /api/appointments/centers
POST /api/appointments
GET /api/appointments/my
GET /api/appointments/admin/stats
GET /api/appointments/admin/all
GET /api/appointments/admin/:id
PATCH /api/appointments/admin/:id/status
```

---

### Support API

```txt
POST /api/support/tickets
GET /api/support/my-tickets
GET /api/support/tickets/:id
POST /api/support/tickets/:id/respond
```

---

### Admin API

```txt
GET /api/admin/dashboard
GET /api/admin/dashboard/summary
GET /api/admin/dashboard/stats

GET /api/admin/applications/stats
GET /api/admin/applications
GET /api/admin/applications/:id
PATCH /api/admin/applications/:id/review

GET /api/admin/application-review/queue
GET /api/admin/application-review/:id
PATCH /api/admin/application-review/:id/decision

GET /api/admin/users
POST /api/admin/users
PUT /api/admin/users/:id
DELETE /api/admin/users/:id

GET /api/admin/support/tickets
GET /api/admin/support/stats
PUT /api/admin/support/tickets/:id/assign
PUT /api/admin/support/tickets/:id/status

POST /api/admin/centers
GET /api/admin/centers
GET /api/admin/centers/:id
PUT /api/admin/centers/:id
PATCH /api/admin/centers/:id/toggle-status

GET /api/admin/printing/stats
PATCH /api/admin/printing/bulk-mark-printed
GET /api/admin/printing/export

GET /api/admin/delivery/queue
PATCH /api/admin/delivery/:id/mark-delivered
GET /api/admin/delivery/stats
PATCH /api/admin/delivery/bulk-mark-delivered
GET /api/admin/delivery/export

GET /api/admin/audit/recent
GET /api/admin/audit/stats
GET /api/admin/audit/export
```

---

## Database Models

Main backend models include:

- `User`
- `CitizenUser`
- `PendingRegistration`
- `PasswordResetRequest`
- `Application`
- `Appointment`
- `SupportTicket`
- `Center`
- `AdminUser`
- `AdminPresence`
- `AuditLog`

---

## Audit Strategy

Audit logging is an important part of this system because this project handles sensitive citizen identity workflows.

Every privileged action should store:

- Actor ID
- Actor role
- Action name
- Entity type
- Entity ID
- Previous state
- New state
- Request metadata
- IP address
- User agent
- Severity
- Timestamp

Recommended audit-covered operations:

- Admin login
- Internal user create/update/delete
- Application status change
- Application review decision
- Document verification/rejection
- Appointment booking/status change
- Center create/update/status change
- Printing status update
- Delivery status update
- Support ticket assignment/status/reply
- Citizen profile update
- Export/report generation

---

## Security Notes

Before production deployment:

- Never commit real `.env` files.
- Use `.env.example` for documentation.
- Rotate any secret that was ever committed or shared.
- Use strong JWT secrets.
- Use HTTP-only refresh token cookies.
- Configure production CORS properly.
- Enable rate limiting for auth, OTP, password reset, and public APIs.
- Validate and sanitize all request bodies.
- Reject unknown or system-owned fields from client payloads.
- Add centralized error handling.
- Avoid returning raw internal error messages to clients.
- Enforce pagination on list and export endpoints.
- Use strict Cloudinary upload rules.
- Do not log sensitive data.
- Keep admin actions traceable through audit logs.

---

## Production Readiness Checklist

### Backend

- [ ] `.env` is not committed
- [ ] `.env.example` exists
- [ ] Startup environment validation exists
- [ ] Database connection is stable
- [ ] Authentication middleware is enforced
- [ ] Role authorization is enforced on every protected route
- [ ] Request validation exists for every write endpoint
- [ ] Rate limiting is enabled
- [ ] Centralized error handler exists
- [ ] All state transitions are validated server-side
- [ ] Every privileged write creates an audit log
- [ ] All list APIs are paginated and bounded
- [ ] Export endpoints have authorization and audit coverage
- [ ] Sensitive data is not logged
- [ ] Indexes exist for high-volume queries

### Frontend

- [ ] `VITE_API_URL` points to the correct backend URL
- [ ] Protected routes match backend roles
- [ ] Token handling is consistent
- [ ] 401/403 handling redirects correctly
- [ ] Forms validate required fields before submit
- [ ] Document upload errors are shown clearly
- [ ] Admin workflows show loading and error states
- [ ] Citizen workflows show clear status updates

### Database and Audit

- [ ] Application status history is preserved
- [ ] Admin actions are traceable
- [ ] Printing actions are traceable
- [ ] Delivery actions are traceable
- [ ] Support ticket actions are traceable
- [ ] Audit logs include actor, action, entity, before/after, and timestamp
- [ ] Destructive actions are soft-delete/archive where possible

---

## Known Integration Checks

Before final submission or production deployment, verify the following:

### 1. Printing Routes

Frontend may call:

```txt
GET /api/admin/printing/queue
PATCH /api/admin/printing/:id/mark-printed
```

Make sure these routes are registered in the backend admin route file.

---

### 2. Support Ticket Routes

Frontend may call:

```txt
GET /api/admin/support/tickets/:id
PATCH /api/admin/support/tickets/:id/assign
PATCH /api/admin/support/tickets/:id/status
```

If backend uses `PUT`, either update frontend methods or add matching backend `PATCH` routes.

---

### 3. Application Detail Route

Frontend fallback may call:

```txt
GET /api/applications/my/:id
```

Backend currently supports:

```txt
GET /api/applications/my
GET /api/applications/:id
```

Either add the missing route or remove the fallback call.

---

### 4. Role Name Consistency

Keep role names consistent across frontend, backend middleware, database documents, and seed data.

Current major roles:

```txt
citizen
admin
system_supervisor
support_staff
```

---

## Contribution Rules

1. Work from a feature branch.
2. Keep frontend and backend API contracts synchronized.
3. Do not bypass backend authorization checks.
4. Do not accept system-owned fields from client payloads.
5. Do not create status changes without audit records.
6. Do not add unbounded list queries.
7. Update this README when setup, routes, roles, or environment variables change.
8. For every admin workflow, confirm that the action is traceable from database records.

---

## Backend Engineering Standards

The backend package may contain a `root/` folder with detailed engineering standards, including:

- Architecture standards
- Route standards
- Authentication standards
- Validation rules
- Data modeling rules
- Security standards
- Auditing rules
- Performance guidelines
- Deployment checklist
- Review checklist

Before making large backend changes, read:

```txt
backend/root/
```

---

## License

MIT License

Copyright (c) 2026 Tanvir Hasan

Permission is hereby granted, free of charge, to any person obtaining a copy
of this software and associated documentation files (the "Software"), to deal
in the Software without restriction, including without limitation the rights
to use, copy, modify, merge, publish, distribute, sublicense, and/or sell
copies of the Software, and to permit persons to whom the Software is
furnished to do so, subject to the following conditions:

The above copyright notice and this permission notice shall be included in all
copies or substantial portions of the Software.

THE SOFTWARE IS PROVIDED "AS IS", WITHOUT WARRANTY OF ANY KIND, EXPRESS OR
IMPLIED, INCLUDING BUT NOT LIMITED TO THE WARRANTIES OF MERCHANTABILITY,
FITNESS FOR A PARTICULAR PURPOSE AND NONINFRINGEMENT. IN NO EVENT SHALL THE
AUTHORS OR COPYRIGHT HOLDERS BE LIABLE FOR ANY CLAIM, DAMAGES OR OTHER
LIABILITY, WHETHER IN AN ACTION OF CONTRACT, TORT OR OTHERWISE, ARISING FROM,
OUT OF OR IN CONNECTION WITH THE SOFTWARE OR THE USE OR OTHER DEALINGS IN THE
SOFTWARE.
