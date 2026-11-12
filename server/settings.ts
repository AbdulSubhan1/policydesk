import "server-only";
import { cache } from "react";
import { readSetting, type SettingKey, type SettingValue } from "@/lib/settings";
import { db, schema } from "@/server/db";

// App settings live in the `app_settings` table and are changed only in the database (Neon's SQL editor, behind the
// owner's Vercel login). The app reads them; no screen or action writes them.

// One query per request for all settings, however many checks a page makes. If the table can't be read (a preview
// deploy before its migration ran), every setting falls back to its default instead of breaking the page.
const loadSettings = cache(async (): Promise<Map<string, unknown>> => {
  try {
    const rows = await db
      .select({ key: schema.appSettings.key, value: schema.appSettings.value })
      .from(schema.appSettings);
    return new Map(rows.map((r) => [r.key, r.value]));
  } catch {
    return new Map();
  }
});

export async function getSetting<K extends SettingKey>(key: K): Promise<SettingValue<K>> {
  return readSetting(key, (await loadSettings()).get(key));
}

export function isDemoMode(): Promise<boolean> {
  return getSetting("demo_mode");
}
