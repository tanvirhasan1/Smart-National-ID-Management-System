# 12 — Environment Config and Deployment

This document defines how configuration and deployment must work.

## Configuration rule

Configuration must be explicit, validated, and environment-specific.

The app must not boot with missing or invalid critical configuration.

## `.env` policy

### Allowed in repo

- `.env.example`

### Forbidden in repo

- `.env`
- production secrets
- staging secrets
- personal local secret dumps

## Startup validation rule

Create a config loader that validates required environment variables on boot.

At minimum, validate:

- `NODE_ENV`
- `PORT`
- `MONGODB_URI`
- `JWT_SECRET`
- `JWT_EXPIRE`
- `ALLOWED_ORIGINS` or equivalent

Recommended additions:

- `BCRYPT_ROUNDS`
- `RATE_LIMIT_WINDOW_MS`
- `RATE_LIMIT_MAX`
- `LOG_LEVEL`
- `APP_NAME`
- `APP_URL`

## Example environment documentation

```env
NODE_ENV=development
PORT=5000
ALLOWED_ORIGINS=http://localhost:3000,http://localhost:5173
MONGODB_URI=
JWT_SECRET=
JWT_EXPIRE=15m
BCRYPT_ROUNDS=10
RATE_LIMIT_WINDOW_MS=900000
RATE_LIMIT_MAX=100
LOG_LEVEL=info
```

## Runtime structure rule

Split process boot from app construction.

Recommended pattern:

- `app.js` — express app creation, middleware, routes
- `server.js` — DB connection, listener, shutdown hooks

## Deployment rules

### Production baseline

- `NODE_ENV=production`
- secrets injected by deployment platform or secret manager
- HTTPS enabled
- reverse proxy configured correctly
- health endpoints available
- logs aggregated centrally
- graceful shutdown enabled

### Database deployment

- use least-privilege DB user
- enable backups
- monitor connection health
- plan index creation carefully on large collections

## Migration/deploy checklist

Before deploy:

- config validation passes
- tests pass
- no secrets in diff
- schema/index changes documented
- rollback plan exists if needed
- version/build information available

After deploy:

- health checks pass
- logs clean
- auth works
- critical flows smoke-tested
- alerting checked

## Environment baseline notes

The project should adopt these configuration conventions:

- prefer a clear allow-list variable such as `ALLOWED_ORIGINS`
- keep package metadata aligned with the actual runtime entrypoint
- validate configuration on startup
- enable graceful shutdown handling
- maintain a real `.env.example`

## Document OCR timeout notes

Document OCR is slower than face/liveness verification because Tesseract may need
more time for first-request startup and image OCR. Keep these services separate:

- `DOCUMENT_OCR_TIMEOUT_MS` controls only document OCR verification.
- `AI_SERVICE_TIMEOUT_MS` controls only face/liveness verification.
- Local development and Render cold-start testing should use
  `DOCUMENT_OCR_TIMEOUT_MS=90000` or `120000`.
- Production with a warm OCR service should use `45000-90000` based on measured
  performance.
- Frontend API timeouts should be greater than the backend OCR timeout so the
  backend can return a structured error instead of the browser showing a raw
  network timeout.

## Final policy

A backend is not production-ready if configuration is tribal knowledge.  
Configuration must be explicit, validated, and safe by default.
