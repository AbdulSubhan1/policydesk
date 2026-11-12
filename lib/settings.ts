import { z } from "zod";

// Every known app setting: its type, its default (used when the row is missing or holds a wrong type) and what it
// does. A new switch is one entry here plus one row in `app_settings`; no new table, no new column.
export const SETTINGS = {
  demo_mode: {
    schema: z.boolean(),
    default: true,
    description: "Live demo: public demo accounts with visitor limits",
  },
} as const;

export type SettingKey = keyof typeof SETTINGS;
export type SettingValue<K extends SettingKey> = z.infer<(typeof SETTINGS)[K]["schema"]>;

/** The stored value if it has the right type, otherwise the default. */
export function readSetting<K extends SettingKey>(key: K, stored: unknown): SettingValue<K> {
  const parsed = SETTINGS[key].schema.safeParse(stored);
  return (parsed.success ? parsed.data : SETTINGS[key].default) as SettingValue<K>;
}

/** Rows for every known setting at its default, for adding the missing ones. */
export function defaultSettingRows() {
  return (Object.keys(SETTINGS) as SettingKey[]).map((key) => ({
    key,
    value: SETTINGS[key].default,
    description: SETTINGS[key].description,
  }));
}
