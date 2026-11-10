import { eq, sql, type SQL } from "drizzle-orm";
import { scopeOf, type SessionUser } from "@/lib/rbac";
import { schema } from "@/server/db";

const { opportunities, leads } = schema;
const NOTHING = sql`false`;

/** Row-level scope for opportunities. Every opportunity query must apply it. */
export function opportunityScope(user: SessionUser): SQL | undefined {
  switch (scopeOf(user, "opportunities")) {
    case "all":
      return undefined;
    case "department":
      return user.departmentId ? eq(opportunities.departmentId, user.departmentId) : NOTHING;
    case "own":
      return eq(opportunities.coordinatorId, user.id);
    default:
      return NOTHING;
  }
}

/** Row-level scope for leads, and through them quotes, KYC, documents and policies. */
export function leadScope(user: SessionUser): SQL | undefined {
  switch (scopeOf(user, "leads")) {
    case "all":
      return undefined;
    case "department":
      return user.departmentId ? eq(leads.departmentId, user.departmentId) : NOTHING;
    case "own":
      return eq(leads.advisorId, user.id);
    default:
      return NOTHING;
  }
}
