import { db, schema } from "./db";

export async function logAudit(entry: {
  userId: number;
  action: string;
  entity: string;
  entityId?: number;
  details?: string;
}) {
  await db.insert(schema.auditLogs).values({
    userId: entry.userId,
    action: entry.action,
    entity: entry.entity,
    entityId: entry.entityId ?? null,
    details: entry.details ?? "",
  });
}
