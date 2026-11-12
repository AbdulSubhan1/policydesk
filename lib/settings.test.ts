import { describe, expect, it } from "vitest";
import { defaultSettingRows, readSetting, SETTINGS } from "./settings";

describe("readSetting", () => {
  it("returns the stored value when it has the right type", () => {
    expect(readSetting("demo_mode", false)).toBe(false);
    expect(readSetting("demo_mode", true)).toBe(true);
  });

  it("falls back to the default when the row is missing or holds a wrong type", () => {
    expect(SETTINGS.demo_mode.default).toBe(true);
    expect(readSetting("demo_mode", undefined)).toBe(true);
    // A typo in the SQL editor ('"false"' as a string) must not switch the demo off by accident
    expect(readSetting("demo_mode", "false")).toBe(true);
    expect(readSetting("demo_mode", 0)).toBe(true);
  });
});

describe("defaultSettingRows", () => {
  it("has one row per known setting, at its default", () => {
    expect(defaultSettingRows()).toEqual([
      { key: "demo_mode", value: true, description: SETTINGS.demo_mode.description },
    ]);
  });
});
