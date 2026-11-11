# PolicyDesk

An insurance CRM for a brokerage. Opportunities come in and coordinators qualify them. Advisors turn them into policies, compliance runs KYC/AML, finance records payments, and expiring policies come back as renewals. **Database-driven role-based access control** decides every screen, button and row of data. The app is fully bilingual in English and Arabic (RTL).

**Live demo:** https://policydesk-opal.vercel.app/login. Sign in with one click as any role; every demo user's password is `demo1234`. New here? Start with the training guide at `/kb` in the app ([docs/00-start-here.md](docs/00-start-here.md)).

## Highlights

- **Opportunity → lead flow** across five departments and 11 insurance products, each with its own covers.
- **Dynamic RBAC** with a role permission matrix plus department and own-record data scopes, enforced in every query and server action.
- **Insurers & plans catalogue.** Quotes are created from plans.
- **KYC / AML** screening (PEP, watchlist, high-risk country) with a compliance queue and a four-eyes rule.
- **Central document settings.** Required documents per product gate policy booking.
- **Payments** (booked → active), **renewals** and an **audit trail** with a per-lead timeline.
- **i18n:** English and Arabic for the UI, validation messages and the data itself.
- **Own UI library.** One component per file, a machine-readable registry, a live component library page and lint rules that enforce it.
- **Knowledge base** in the app, with Mermaid diagrams, built from `docs/`.
- **Quality gates:** strict TypeScript, ESLint UI rules, Prettier, Playwright E2E, and CI with an AI PR reviewer that follows `AGENTS.md`.

## Stack

Next.js 15 (App Router, Server Components, Server Actions), TypeScript, Tailwind CSS 4, Drizzle ORM, PostgreSQL (Neon in production, PGlite locally), next-intl, React Hook Form, Zod, Playwright.

## Run locally

No database install is needed.

```bash
npm install
npm run db:setup     # tables + demo data (add -- --reset to start over)
npm run dev
```

## Quality

```bash
npm run check        # types, lint, formatting, UI registry
npm run test:e2e     # Playwright (run `npx playwright install chromium` once)
```

## Read next

- `AGENTS.md`: the coding standard every person and AI follows
- `docs/`: the knowledge base, also at `/kb` in the app
- `/design-system` in the app: the component library

## Deploy (Vercel + Neon)

1. Import the repo in Vercel under your own account.
2. Add a Neon Postgres database under **Storage** with the env prefix `DATABASE`, so it sets `DATABASE_URL`. Put the database and the function region (Settings → Functions) in the same region.
3. Add `AUTH_SECRET`, for example from `openssl rand -base64 32`. To accept the Brokwise website's forms, also add `WEBSITE_API_SECRET` with the same value as on the website (see the KB page "Website and online payments"); without it the website API answers 503.
4. Run `DATABASE_URL=<neon url> npm run db:setup` once.
