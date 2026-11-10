import { count, desc, eq, ilike, or, type SQL } from "drizzle-orm";
import type { Page } from "@/lib/pagination";
import { db, schema } from "@/server/db";

const { auditLogs, users } = schema;

/** One page of the audit log, newest first. `q` matches the details, entity or person. */
export async function listAudit({ q, page }: { q?: string; page: Page }) {
  const where: SQL | undefined = q
    ? or(ilike(auditLogs.details, `%${q}%`), ilike(auditLogs.entity, `%${q}%`), ilike(users.name, `%${q}%`))
    : undefined;
  const [rows, [{ total }]] = await Promise.all([
    db
      .select({
        id: auditLogs.id,
        action: auditLogs.action,
        entity: auditLogs.entity,
        entityId: auditLogs.entityId,
        leadId: auditLogs.leadId,
        details: auditLogs.details,
        createdAt: auditLogs.createdAt,
        userName: users.name,
      })
      .from(auditLogs)
      .leftJoin(users, eq(auditLogs.userId, users.id))
      .where(where)
      .orderBy(desc(auditLogs.createdAt), desc(auditLogs.id))
      .limit(page.limit)
      .offset(page.offset),
    db.select({ total: count() }).from(auditLogs).leftJoin(users, eq(auditLogs.userId, users.id)).where(where),
  ]);
  return { rows, total };
}
