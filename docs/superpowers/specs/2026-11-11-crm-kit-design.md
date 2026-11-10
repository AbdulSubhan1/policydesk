# CRM Kit: design

Date: 2026-11-11. Owner: Abdul Subhan (GitHub `AbdulSubhan1`).

## Intent

PolicyDesk (this repo) was built from scratch with a strict standard: its own UI library, one coding standard (`AGENTS.md`) enforced by lint, server actions only, React Hook Form + Zod, database-driven RBAC with data scopes, an audit log, English and Arabic with RTL, an in-app knowledge base, Playwright tests and CI. That took a lot of work, and most of it has nothing to do with insurance.

The CRM Kit packages that work so a new CRM for any industry starts from the same foundation and follows the same process. The owner wants to say one thing to Claude, for example "use the CRM kit and build a CRM for gyms", and be confident the new codebase is built exactly like PolicyDesk. Only the business part is new.

Gyms are only an example. The kit must not assume any industry or country; which CRM gets built first, if any, is the owner's later decision.

## Goals

1. **One request starts a new CRM.** The owner names an industry and the kit runs the whole process. It works for any industry and any target country.
2. **Same standard every time, and checked.** Every CRM gets the same `AGENTS.md`, ESLint UI rules, Prettier, the UI registry check and `npm run check`, so code that breaks the standard fails instead of slipping in.
3. **Research-based at every step.** Components, business rules and coding standards are researched on the web, with links to the sources kept in the project.
4. **A fixed order of steps, each stopping for the owner's go-ahead:**
   1. Components
   2. Business knowledge base
   3. Coding standard
   4. Code
   5. Tests
5. **The kit improves over time.** When a CRM produces something generally useful (a component, a better rule), it goes back into the kit, and the next CRM gets it.
6. **Shareable but personal.** Public on the owner's GitHub and shown in the portfolio. Anyone may install it from the repo, but it isn't marketed or supported for others.

## Non-goals

- Not a SaaS or a multi-tenant platform. Each CRM is its own codebase and deployment.
- Not a no-code builder or code generator with templates for every screen. Business code is written fresh per industry, following the knowledge base and the standard.
- No MCP server or hosted service. The kit is a Claude Code plugin made of skills plus a starter codebase.
- No automatic upgrade of CRMs already built. Improvements flow from a CRM back into the kit; pulling kit changes into an existing CRM is a manual job for later.
- No support for stacks other than the PolicyDesk stack in this version.

## Anti-goals (failure even if it "works")

- A generated CRM that drifts from the standard: inline styles, raw HTML controls, API routes, untranslated strings, missing scope checks.
- Copying third-party code or assets: shadcn.io code, other products' UI, or anything from the owner's former employer. We study how good products behave and rebuild that behaviour ourselves.
- Business rules invented without a source, or decided without the owner seeing them.
- Running the full Playwright suite after every change. E2E stays on demand; day to day, only the specs a change touches run.

## Constraints

- **Personal accounts only:** GitHub `AbdulSubhan1` and the owner's personal Vercel. Never company accounts, code or assets.
- **Stack** (same as PolicyDesk):
  - Next.js 15 App Router: Server Components, Server Actions, `params` as Promises
  - TypeScript strict, Tailwind CSS 4 tokens
  - Drizzle ORM: Neon Postgres in production, PGlite locally
  - jose session cookies; next-intl (en/ar, RTL); React Hook Form + Zod
  - Playwright, Prettier with the Tailwind plugin
- **No UI or styling libraries** (MUI, Radix, shadcn, lucide, clsx, tailwind-merge). Icons are our own SVG paths.
- **Deploy:** Vercel + Neon, with the database and the function region in the same place (Singapore suits the owner in Pakistan).
- **Patched dependencies only.** Next.js stays on a version free of known critical advisories (PolicyDesk had to move from 15.5.4 to 15.5.29 for CVE-2025-66478).

## Decided by the owner

- **The process order:** components → business knowledge base → coding standard → code → tests.
- **Research comes first** for components, the business and the coding standard, using what is available on the internet, with the references kept.
- **Our own standard**, not a generic one, lives in the kit and is followed when coding.
- **No fixed industry:** gyms were an example, not a commitment.
- **The component library grows:** every CRM starts with the full library and adds new components when the industry needs them.
- **The kit keeps being updated** as more CRMs are built.
- **Public on the owner's GitHub**, linked from the portfolio, installable by anyone from the repo.

## Shape (builder's calls, stated so the owner can object)

### One repo: `AbdulSubhan1/crm-kit`

A Claude Code plugin with its own marketplace file, so it installs with:

```
/plugin marketplace add AbdulSubhan1/crm-kit
/plugin install crm-kit
```

Contents:

| Path              | What it is                                                                                     |
| ----------------- | ---------------------------------------------------------------------------------------------- |
| `.claude-plugin/` | `plugin.json` (semver) and `marketplace.json`                                                  |
| `skills/`         | One skill per step, plus the entry skill and sync-back (below)                                 |
| `template/`       | The starter codebase: PolicyDesk with the insurance business removed (below)                   |
| `references/`     | The UI component research method, the component checklist, and the knowledge-base page formats |
| `CHANGELOG.md`    | What each version changed, so CRMs know what they're missing                                   |

Skills hold the process and the rules; the template holds working code. The skills say "copy and follow", never "recreate from memory", so every CRM starts byte-for-byte from the same foundation.

### The starter template (`template/`)

This is the PolicyDesk generic core. It is extracted from this repo and kept in sync by hand when the kit changes.

Kept:

- sign-in with demo-role buttons, the session, and a sidebar driven by permissions
- users, roles and the permission matrix; teams (PolicyDesk's "departments" made generic) and data scopes: all / team / own
- the audit log and a per-record timeline
- i18n with RTL and translated stored data (`Localized`). The template ships en + ar, but locales, the RTL list, the default phone country and the currency are settings in `constants/`, so `new-crm` can set them for the market (for example en + ur and PKR for Pakistan).
- the whole UI library (54 components), the registry, `usage.json`, the docs-style component library pages and demos
- the in-app knowledge base viewer and the training-guide page format
- Playwright config, helpers and generic tests (access, scopes, UI library)
- CI (checks + build, an AI PR reviewer, on-demand E2E), `AGENTS.md`, `CLAUDE.md`
- `scripts/setup-db.ts` (seed shape only), `scripts/ui-usage.ts`, and the Vercel + Neon deploy notes
- **one small reference module, "Contacts"** (list, detail, create form, server action, audit, translations, test). It shows the full pattern once, and every industry has customers anyway.

Removed: everything about opportunities, leads, quotes, KYC, documents, policies, plans, insurers and renewals, plus the insurance products, covers and KB pages.

### The steps (each is a skill; each stops for "go")

1. **`new-crm` (entry).** Asks for the industry, a working name, the target country or countries, and the languages (English plus an optional second one, which may be RTL like Arabic or Urdu). Creates `~/<name>` from `template/` and a fresh git repo, then sets the market settings: locales and RTL list, default phone country, currency and date formats. The business research uses that country's rules. Then runs steps 2–6 in order, stopping after each one with a short summary and links to what it produced. It never runs ahead.
2. **`research-components`.**
   - Study leading products in the industry (for gyms, for example Mindbody, Glofox, PushPress) and good UI libraries (shadcn.io and similar), looking at behaviour only.
   - Output `docs/research/components.md`: the screens these products have, the components each needs, which ones the library already covers, which are new and why, with source links.
   - After "go", build the new components by the library checklist: file, `data-ui`, export, registry entry with category and keyboard keys, demos, a test if it has behaviour, `ui:usage`.
3. **`research-business`.**
   - Research how the industry runs: roles, records, journeys, statuses, money, renewals, local rules (UAE/Pakistan where relevant), with sources.
   - Output the knowledge base in `docs/` in PolicyDesk's format: start-here training guide, overview, roles and access, workflows with Mermaid diagrams, data model, glossary, and a sources page.
   - Rules the research couldn't settle are listed as questions for the owner instead of guessed.
4. **`standards`.**
   - Check `AGENTS.md` against current official guidance: Next.js and React docs, OWASP for auth and uploads, WCAG for accessibility. Done in depth once while building the kit; later CRMs only check what changed since the kit's last review.
   - Propose changes as a diff with reasons and sources. After approval, apply them to the CRM **and to the kit** (through `sync-back`), so there is still one standard and every later CRM follows the latest version.
5. **`build-module`.**
   - Implement the knowledge base module by module, following `AGENTS.md`, in this order: constants, schema and migration, Zod schemas, queries with scopes, server actions with guards and audit, pages and feature components from the UI library only, en/ar messages, seed data, docs updates.
   - `npm run check` must pass after each module.
6. **`test`.**
   - Write Playwright specs for each role's access and each main journey from the knowledge base.
   - Run only the new specs, then the full suite once at the end.

Plus **`sync-back`**, used from inside any CRM:

- Find generic improvements made there: new components, changes to `AGENTS.md` or lint rules, script fixes.
- Copy them into the kit's `template/` and `references/`.
- Bump the plugin version and add a `CHANGELOG.md` entry.
- Industry-specific code stays in its CRM.

### Teams and data scope

The template keeps PolicyDesk's model: each user belongs to at most one team (PolicyDesk's department), and data scopes are all / team / own. If an industry needs more (for example staff working across several gym branches), `build-module` extends it for that CRM when the knowledge base shows the need, and `sync-back` decides whether it is generic enough for the kit. The kit does not design for it up front.

### Where things live

- The kit: `AbdulSubhan1/crm-kit`, public, linked from the portfolio.
- Each CRM: its own public repo under `AbdulSubhan1` and its own Vercel project, created when the owner decides to publish it.
- PolicyDesk stays as it is: the first CRM and the showcase. Its generic improvements are ported into the kit while it is being created; after that, PolicyDesk is just another CRM that can `sync-back`.

## Success looks like

This project ends when the kit is built and published. Building a real CRM with it is a separate, later project.

- The kit installs from `AbdulSubhan1/crm-kit` with the two commands above.
- `new-crm` with a sample industry and market creates a repo where:
  - `npm run check` passes;
  - the generic tests pass (access, scopes, UI library, the Contacts module);
  - `AGENTS.md`, the lint rules and the UI library match the kit.
- The smoke run stops after `new-crm` creates the project; it doesn't do the research or build steps.
- Each step's skill tells Claude exactly what to produce, where, with sources, and when to stop for the owner.
- `sync-back` moves a sample generic change (for example a new component) from a CRM into the kit, with a version bump and a changelog entry.
- The kit appears in the README and on the owner's portfolio.

## Left to the builder

- Exact wording and internal structure of each skill (keep them focused; put long references in `references/`).
- How the template extraction is done (script vs. manual), as long as PolicyDesk itself is not changed.
- Naming of the reference module's fields and seed data.
- Whether `new-crm` also creates the GitHub repo and Vercel project (it must ask first: both are outward-facing).
