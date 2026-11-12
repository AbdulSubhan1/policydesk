# Runbook: owner tasks

Things only the owner does, outside the app. Kept here, not in `docs/`, because everything in `docs/` is shown to
every PolicyDesk user at `/kb`.

## App settings (`app_settings` table)

PolicyDesk reads a few switches from the `app_settings` table in its database. **No screen in the app can change
them**, not even the demo Admin account. You change them in Neon's SQL editor, which only opens after you sign in to
your own Vercel account. That login is the protection.

### Open the SQL editor

1. Go to https://vercel.com and sign in with **your personal account** (the one that owns the `policydesk` project).
2. Open **Storage**, pick the **PolicyDesk** database (Neon), then **Open in Neon**.
3. In Neon, open **SQL Editor** (left menu). Make sure the branch is **main** (production).

### See all settings

```sql
select key, value, description, updated_at from app_settings order by key;
```

### Demo mode

`demo_mode = true` means the app runs as the public live demo: the login page shows the demo accounts, and the demo
limits apply. `false` means normal use, without the demo limits.

Turn demo mode **off**:

```sql
update app_settings set value = 'false', updated_at = now() where key = 'demo_mode';
```

Turn demo mode **on** again:

```sql
update app_settings set value = 'true', updated_at = now() where key = 'demo_mode';
```

Check it:

```sql
select value from app_settings where key = 'demo_mode';
```

The change works on the next page load; there is no redeploy.

Write `'true'` / `'false'` exactly like this (JSON, lowercase, in single quotes). Anything else, like `'"false"'` or
`'no'`, is ignored and the app falls back to the safe default, which is demo mode **on**. A deleted row also means
**on**.

### Add a new setting later

1. In `lib/settings.ts`, add the key to `SETTINGS` with its type, default and description.
2. Use it in the code with `getSetting("your_key")` from `server/settings.ts`.
3. The row is added automatically on the next production deploy (`npm run db:setup` locally). Then change it in the SQL
   editor like `demo_mode` above.
