# LeaseDesk

LeaseDesk is a small-commercial-property operations application for landlords who need one place to manage units, tenants, leases, rent/payment status, arrears, documents, expenses, and basic settings.

## Runtime Modes

`LEASEDESK_MODE=demo` runs with isolated fictional seed data and local demo storage.

`LEASEDESK_MODE=production` uses PostgreSQL and requires explicit production configuration. Production mode does not seed fictional tenants, payments, documents, or expenses.

## Production Configuration

Required production environment variables:

- `DATABASE_URL`
- `SESSION_SECRET`
- `LEASEDESK_ADMIN_USERNAME`
- one of `LEASEDESK_ADMIN_PASSWORD` or `LEASEDESK_ADMIN_PASSWORD_HASH`
- `LEASEDESK_UPLOAD_DIR`

`LEASEDESK_UPLOAD_DIR` must point to an existing readable and writable directory. LeaseDesk intentionally does not fall back to demo upload storage in production.

## Release Checks

Before a production deployment decision, run:

```bash
npm run check
npm test
npm run build
npm audit --omit=dev
```

For production-like persistence/session verification, run the GitHub `LeaseDesk Postgres Foundation` workflow or run:

```bash
npm run db:push -- --force
LEASEDESK_RUN_POSTGRES_TESTS=1 npm run test:postgres
```

Use only disposable test databases and fictional data for verification.

## Operational Endpoints

- `/health` confirms the application process is responding.
- `/ready` confirms the configured storage path and backing data store are reachable.

## Current Scope Boundaries

LeaseDesk currently owns commercial landlord operations for properties/units, tenants, leases, payments, arrears, documents, expenses, and basic settings.

It does not own online rent collection, maintenance ticketing, advanced accounting, tenant marketplaces, enterprise property-management workflows, or jurisdiction-specific tax filing.

Excel bulk import is deferred until a safe post-launch importer is selected.
