import { describe, expect, it, vi } from "vitest";

// pickAssignee is pure; stub the database so importing the module never opens one
vi.mock("@/server/db", async () => ({ db: {}, schema: await import("@/server/db/schema") }));

const { pickAssignee } = await import("./assign");

const at = (iso: string) => new Date(iso);

describe("pickAssignee", () => {
  it("picks the fewest open", () => {
    expect(
      pickAssignee([
        { id: 1, openCount: 4, lastAssignedAt: null },
        { id: 2, openCount: 1, lastAssignedAt: at("2026-11-10T10:00:00Z") },
        { id: 3, openCount: 2, lastAssignedAt: null },
      ]),
    ).toBe(2);
  });

  it("tie → never-assigned first, then the one assigned longest ago", () => {
    expect(
      pickAssignee([
        { id: 1, openCount: 2, lastAssignedAt: at("2026-11-10T10:00:00Z") },
        { id: 2, openCount: 2, lastAssignedAt: null },
      ]),
    ).toBe(2);
    expect(
      pickAssignee([
        { id: 1, openCount: 2, lastAssignedAt: at("2026-11-10T10:00:00Z") },
        { id: 2, openCount: 2, lastAssignedAt: at("2026-11-09T10:00:00Z") },
      ]),
    ).toBe(2);
  });

  it("tie on both → lowest id", () => {
    const same = at("2026-11-10T10:00:00Z");
    expect(
      pickAssignee([
        { id: 7, openCount: 0, lastAssignedAt: same },
        { id: 3, openCount: 0, lastAssignedAt: same },
      ]),
    ).toBe(3);
    expect(
      pickAssignee([
        { id: 9, openCount: 0, lastAssignedAt: null },
        { id: 4, openCount: 0, lastAssignedAt: null },
      ]),
    ).toBe(4);
  });

  it("empty list → null", () => {
    expect(pickAssignee([])).toBeNull();
  });
});
