import { eq } from "drizzle-orm";
import { COORDINATOR_ROLE } from "@/constants/config";
import { db, schema } from "@/server/db";
import { assignmentCandidates } from "@/server/queries/users";

type Candidate = { id: number; openCount: number; lastAssignedAt: Date | null };

/** Fewest open records wins; on a tie, whoever has waited longest (never assigned first), then the lowest id. */
export function pickAssignee(candidates: Candidate[]): number | null {
  const waited = (c: Candidate) => c.lastAssignedAt?.getTime() ?? 0;
  const [first] = [...candidates].sort((a, b) => a.openCount - b.openCount || waited(a) - waited(b) || a.id - b.id);
  return first?.id ?? null;
}

/** Picks someone with this role in the department and stamps them, or null when nobody is available. */
export async function assignByRole(departmentId: number, roleName: string) {
  const candidates = await assignmentCandidates(departmentId, roleName);
  const chosen = candidates.find((c) => c.id === pickAssignee(candidates));
  if (!chosen) return null;

  await db.update(schema.users).set({ lastAssignedAt: new Date() }).where(eq(schema.users.id, chosen.id));
  return { id: chosen.id, name: chosen.name, email: chosen.email, phone: chosen.phone };
}

/** The coordinator for a new website opportunity. */
export const assignCoordinator = (departmentId: number) => assignByRole(departmentId, COORDINATOR_ROLE);
