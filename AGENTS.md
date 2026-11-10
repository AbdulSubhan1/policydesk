# Coding standard

These rules are strict. They apply to every person and every AI model working in this repo. `npm run check` and the PR reviewer enforce them. If a rule blocks you, change the rule here in a PR. Do not work around it.

## 1. Where things live

| Folder                  | What goes there                                                                           | Never put here                               |
| ----------------------- | ----------------------------------------------------------------------------------------- | -------------------------------------------- |
| `app/`                  | Routes only: `page.tsx`, `layout.tsx`, one `route.ts` for file downloads                  | Business logic, queries, reusable components |
| `components/ui/`        | The UI library: one component per file, exported from `index.ts`, listed in `registry.ts` | Data fetching, translations of feature text  |
| `components/forms/`     | Client forms built with React Hook Form + `useActionForm`                                 | Server code                                  |
| `components/<feature>/` | Feature sections, e.g. `leads/quotes-tab.tsx`, `dashboard/funnel.tsx`                     | Raw HTML controls                            |
| `constants/`            | Fixed values: statuses, products, permissions, navigation, config, i18n                   | Functions with side effects                  |
| `schemas/`              | Zod schemas shared by forms and server actions                                            | UI code                                      |
| `server/actions/`       | `"use server"` files, one per feature                                                     | Read-only queries                            |
| `server/queries/`       | Database reads, one file per feature                                                      | Mutations                                    |
| `server/db/`            | Drizzle schema and client                                                                 | Anything else                                |
| `lib/`                  | Small pure helpers: `cn`, `format`, `rbac`, `kyc`, `i18n`                                 | Database access                              |
| `messages/`             | `en.json`, `ar.json`. Every user-facing string                                            | Code                                         |
| `docs/`                 | The knowledge base (shown at `/kb`)                                                       | Generated files                              |

## 2. Single source of truth

- A value is defined once and imported everywhere else. Statuses: `constants/statuses.ts`. Products, covers, departments: `constants/products.ts`. Permissions: `constants/permissions.ts`. Limits and cookie names: `constants/config.ts`. Sidebar: `constants/navigation.ts`.
- Colours, fonts and radii exist only as tokens in `app/globals.css` (`@theme`). Use the token classes (`bg-brand`, `text-muted`), never hex values.
- Shared class recipes live in `components/ui/styles.ts`.
- Each validation rule is one Zod schema in `schemas/`. The form and the server action both use it.
- If you copy a block of code a second time, extract it.

## 3. Next.js rules

- Use the App Router. Pages are **Server Components** by default. Add `"use client"` only when a file needs state, effects or browser APIs.
- **Data loading:** server components call functions from `server/queries/`. Use `cache()` from React when several components on one page need the same data, so they don't pass it down as props. Run independent queries with `Promise.all`.
- **Mutations:** always use **server actions** from `server/actions/`. API routes are not allowed. The one exception is streaming a stored file (`GET` route handler).
- Every server action does three things in this order:
  1. Check the permission with `requirePermission`, or with a guard in `server/guards.ts` that also checks the user's scope.
  2. Validate input with the shared Zod schema.
  3. Write to the database, log to the audit trail, then `revalidatePath` or `redirect`.
- Form actions return `ActionResult` (`{ ok: true }` or `{ ok: false, error: "<message key>" }`). One-click actions take `FormData` and throw on misuse.
- `params` and `searchParams` are Promises. Await them.
- Never trust the UI. Hiding a button is UX only; the real check is in the action.

## 4. UI library (strict)

- Pages and feature components build UI **only** from `@/components/ui`. ESLint blocks raw `<button>`, `<input>`, `<select>`, `<textarea>`, `<a>`, `<img>` and `<svg>` outside `components/ui`. Use `Button`, `Input`, `Select`, `Textarea`, `Hidden`, `Checkbox`, `Radio`, `ButtonLink`, `next/link` and `Icon`.
- **No inline styles.** `style={...}` is a lint error everywhere. Use Tailwind classes.
- **No class overrides on library components.** `className` on a library component may only set layout (margin, width, grid placement). For a different look, add a variant in `components/ui/styles.ts`.
- **One component per file.** File name is the kebab-case component name.
- New component checklist:
  1. Add `components/ui/<name>.tsx` with a `data-ui="<Name>"` attribute on its root.
  2. Export it from `components/ui/index.ts`.
  3. Add a `registry.ts` entry.
  4. Add a preview in `components/design-system/previews.tsx`.
  5. Run `npm run ui:usage`.
- **Icons:** add the path to `components/ui/icon.tsx`. Icon packages are blocked.
- **No UI or styling libraries:** MUI, Radix, shadcn, lucide, clsx and tailwind-merge are blocked by lint.
- **Layout:** mobile-first. Base classes are for phones; add `sm:`, `md:` and `lg:` for larger screens. Every flex or grid child that holds text gets `min-w-0`. Long text uses `truncate` or `[overflow-wrap:anywhere]`. Wide tables use `<Table size>`, which scrolls instead of overflowing. Responsive grids start with `grid-cols-1` (`minmax(0, 1fr)`), so a wide child cannot stretch the page on phones.
- **RTL-safe classes only:** `ms-`, `me-`, `ps-`, `pe-`, `text-start`, `text-end`, `start-`, `end-`. Never `ml-`, `mr-`, `pl-`, `pr-`, `text-left` or `text-right`.
- Avoid wrappers. Do not add a `div` or a component that only passes its children through.

## 5. Forms

- Data-entry forms use **React Hook Form** through `components/forms/use-action-form.ts`. It wires the Zod resolver, the server action, pending state and errors.
- Show field errors with `<Field error={errorOf("field")}>` and server errors with `<FormError message={rootError} />`. Errors are message keys, translated by the library.
- One-click forms (accept, cancel, assign) are plain `<form action={serverAction}>` with `Hidden` fields. Do not use React Hook Form for them.

## 6. Internationalisation

- Every user-facing string goes in `messages/en.json` and `messages/ar.json`, with the same keys in both. Use `getTranslations` in async server components and `useTranslations` everywhere else.
- Message keys may not contain dots. Nest objects instead.
- Status, product, cover and department labels come from messages by key (`t("status.won")`). Do not hard-code them.
- Text that admins type and that users read in their own language is stored as `Localized` jsonb (`{ en, ar }`). Read it with `localized(value, locale)`.
- Zod messages are keys (`"validation.required"`).

## 7. Security and data

- Permission checks: `can(user, permission)` in the UI, `requirePermission` or a guard in actions.
- Row-level scope: every list and detail query applies `opportunityScope` or `leadScope` from `server/queries/scope.ts`. A record outside the user's scope returns 404.
- Every mutation writes an audit entry with `logAudit`. Pass `leadId` when the change belongs to a lead.
- Validate uploads by size and MIME type on the server, and accept only document types configured for the product.

## 8. Code style

- TypeScript strict. No `any`. No unused code.
- Prettier formats everything (`npm run format`). Tailwind classes are sorted by the Prettier plugin.
- Comments explain _why_, not _what_. Keep them short.
- Names: components `PascalCase`, files `kebab-case`, constants `UPPER_SNAKE_CASE`, functions `camelCase`.
- Don't build for hypothetical needs. Build what the current feature uses, nothing more.

## 9. Before you open a PR

```bash
npm run check      # types, lint (incl. UI rules), formatting, UI registry/usage
npm run test:e2e   # Playwright, on demand or before a release
```

Update `docs/` when behaviour changes. The PR reviewer checks every rule in this file.
