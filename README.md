# PolicyDesk

An insurance CRM for a brokerage: opportunities come in, coordinators qualify them, advisors turn them into policies, compliance runs KYC/AML, finance records payments, and expiring policies flow back in as renewals. Every screen, button and row of data is controlled by **database-driven role-based access control**.

**Live demo:** _coming soon_ · log in with one click as any role (password `demo1234`).

## Features

- **Opportunity → Lead flow.** An opportunity is the raw inquiry. A coordinator qualifies it and converts it into a lead for an advisor in the right department.
- **Departments.** Motor & Marine, Health, Life & Savings, Home & Travel and Business. Each product is routed to one of them.
- **11 insurance products, each with its own covers:** car, bike, yacht, health, life, savings, home, travel, business (SME), cyber and trade licence.
- **Insurers & plans catalog.** Admins load plans from each insurer. Advisors quote from active plans of the lead's product, and the premium is prefilled.
- **KYC / AML.** Simulated sanctions-watchlist, PEP and high-risk-country screening with a risk score and enhanced due diligence flags. A separate compliance review applies the four-eyes rule.
- **Central document settings.** One list of document types; each product marks them as optional or required. Lead uploads only offer that product's documents.
- **Policy booking gate.** A policy can only be booked with an accepted quote, approved KYC and every required document.
- **Payments.** Policies are *booked* until finance records a payment, which makes them *active*. Failed and refunded payments are handled too.
- **Renewals.** Policies near expiry can be renewed into a new renewal lead. KYC carries over if the ID is still valid.
- **Audit trail.** A global audit log, plus a per-lead activity timeline.

## RBAC design

- **Permissions** are fixed in code (`lib/rbac.ts`). **Roles** and their permissions live in the database, so admins can create roles and toggle permissions in the UI. Changes apply on the next request.
- **Row-level scope:** `view_all` > `view_department` > `view_own`, applied in every query (`lib/queries.ts`). A record outside your scope returns 404, not 403.
- Every server action re-checks its permission and scope. Hidden buttons are UX only.
- Demo roles: Admin, Department Manager, Coordinator, Advisor, Compliance Officer, Finance, Viewer.

## Stack

Next.js 15 (App Router, Server Actions) · TypeScript · Tailwind CSS 4 · Drizzle ORM · PostgreSQL (Neon in production, embedded PGlite locally) · Zod · JWT sessions (jose).

## Run locally

No database install is needed: locally it uses PGlite, a Postgres that runs inside Node.

```bash
npm install
npm run db:setup      # creates tables and demo data (add -- --reset to start over)
npm run dev
```

## Deploy (Vercel + Neon)

1. Import the repo in Vercel.
2. Add a Neon Postgres database under **Storage**. It sets `DATABASE_URL`.
3. Add `AUTH_SECRET`, a long random string, for example from `openssl rand -base64 32`.
4. Run `DATABASE_URL=<neon url> npm run db:setup` once to create tables and demo data.
