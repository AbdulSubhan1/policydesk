# Quality and testing

## Commands

| Command               | What it does                                                                                                 |
| --------------------- | ------------------------------------------------------------------------------------------------------------ |
| `npm run check`       | Type check, ESLint (including the UI library rules), Prettier check, UI registry and usage check, unit tests |
| `npm test`            | Unit tests (Vitest): `*.test.ts` next to the code, e.g. the website API signature and assignment rule        |
| `npm run format`      | Formats every file with Prettier, including Tailwind class order                                             |
| `npm run ui:usage`    | Regenerates `components/ui/usage.json`                                                                       |
| `npm run test:e2e`    | Runs the Playwright tests against a fresh local database                                                     |
| `npm run test:e2e:ui` | The same tests in Playwright's interactive UI                                                                |

## End-to-end tests

The tests are in `e2e/` and cover:

- **Roles:** each demo role signs in and sees only its own menu.
- **Scope:** an advisor gets a 404 on another advisor's lead.
- **The full journey:** opportunity, convert, quote, KYC, compliance approval, documents, booking, payment, active policy.
- **Renewal:** a renewal lead is created from an expiring policy.
- **Languages:** switching to Arabic turns the layout right-to-left.
- **Bulk actions:** a manager moves two leads to another stage from the ActionBar.
- **Website API:** signed short and full forms create records with a coordinator; unsigned, unknown-field and missing-field requests are refused; nobody available leaves the coordinator empty.
- **Component library:** every component's page renders, and the interactive ones (menus, dialogs, date picker, multi-select…) work.

The whole suite takes about 7 minutes, so it is **on demand only**: nothing runs it automatically. Day to day, run `npm run check` and only the tests for what you changed:

```bash
npx playwright install chromium                                  # once
npm run test:e2e -- e2e/02-journey.spec.ts                       # one file
npm run test:e2e -- e2e/04-ui-library.spec.ts --grep DatePicker  # matching tests only
npm run test:e2e                                                 # everything, before a release
```

They can also run from GitHub: **Actions → E2E tests → Run workflow**.

## Pull requests

Every PR runs two jobs:

1. **Checks:** `npm run check` and `npm run build`. The PR cannot merge if they fail.
2. **Review:** an AI reviewer reads the diff against `AGENTS.md` and comments on any rule it breaks. It needs the `ANTHROPIC_API_KEY` repository secret.
