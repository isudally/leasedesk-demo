# LeaseDesk Deployment And Handover Runbook

This runbook covers a normal LeaseDesk customer installation. It is intentionally practical: no enterprise disaster-recovery programme, no invented SLA and no product-scope expansion.

## Product Boundary

LeaseDesk is sold as a focused small-commercial-property operations system for units/stores, tenants, leases, payments, arrears, documents, expenses and basic settings.

Do not sell or configure it as online rent collection, a tenant portal, maintenance/work-order software, advanced accounting, a property marketplace or enterprise property management.

## Infrastructure

A normal customer installation requires:

- application hosting capable of running the built Node/Vite app;
- PostgreSQL database;
- persistent filesystem or mounted storage directory for uploaded documents;
- HTTPS and the customer's chosen domain or subdomain;
- an agreed backup owner for the database and upload storage.

Customer infrastructure should be customer-paid and customer-controlled where practical.

## Configuration

Required production variables:

- `LEASEDESK_MODE=production`
- `DATABASE_URL`
- `SESSION_SECRET`
- `LEASEDESK_ADMIN_USERNAME`
- one of `LEASEDESK_ADMIN_PASSWORD` or `LEASEDESK_ADMIN_PASSWORD_HASH`
- `LEASEDESK_UPLOAD_DIR`

Use a strong `SESSION_SECRET`. Prefer `LEASEDESK_ADMIN_PASSWORD_HASH` for production. Do not commit real values.

## Database

Apply the committed schema before handover:

```bash
npm run db:push
```

Use a new customer database. Do not point a customer installation at demo, founder-review or disposable verification data.

## Storage

Create the upload directory before starting production:

```bash
mkdir -p "$LEASEDESK_UPLOAD_DIR"
```

The directory must be readable and writable by the application process and included in the agreed backup responsibility.

## Admin Bootstrap

Configure the first administrator through the production environment variables above, then sign in and immediately verify that the administrator can access the operational dashboard.

Do not leave temporary/plaintext bootstrap credentials in shared notes, repository files or deployment logs.

## First Customer Data Setup

For a standard setup, prepare clean starting records for:

- landlords/building identity where applicable;
- units/stores;
- tenants;
- lease dates/rent status;
- opening arrears/payment status;
- documents that should be uploaded at handover;
- starting expense categories or records if agreed.

Substantial data cleanup, historical payment migration, large document migration, custom reporting, integrations or product changes are separately scoped work.

## Demo And Production Separation

`LEASEDESK_MODE=demo` is for fictional walkthroughs and local validation only. It uses isolated fictional seed data and local demo storage.

`LEASEDESK_MODE=production` must not seed fictional tenants, payments, documents or expenses.

## Smoke Verification

Before handover, verify with fictional or approved setup data:

```bash
npm run check
npm test
npm run build
```

Then in the deployed environment verify:

- login works;
- `/health` responds;
- `/ready` confirms database and storage readiness;
- a unit/store can be viewed;
- a tenant/lease can be viewed;
- a payment can be recorded;
- dashboard arrears/payment totals update;
- a document upload/download works;
- logout works.

## Handover

Provide the customer:

- application URL;
- first administrator access details through a secure channel;
- infrastructure owner and backup responsibility;
- database/storage location summary without secrets;
- brief operating walkthrough for units, tenants, leases, payments, arrears, documents and expenses;
- support/change-request boundary.

## Rollback And Recovery Basics

Before production data import, take a database backup and confirm how uploaded documents are backed up.

If a deployment fails before handover, return to the previous known-good application build and restore the latest valid database/upload backup if data was changed.

Do not manually patch production data unless a specific recovery decision is made and recorded.

## Post-Handover Responsibilities

Core software is a one-off purchase. Included setup, handover and correction of defects within agreed delivery scope are part of the delivery.

After handover, support, maintenance, substantial data work, integrations, custom reports and product changes are optional and quoted separately. No monthly software subscription or mandatory maintenance package is approved.
