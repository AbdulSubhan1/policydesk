import { db, schema } from "@/server/db";

export async function logAudit(entry: {
  /** null = done by the website or the system, not a signed-in user */
  userId: number | null;
  action: string;
  entity: string;
  entityId?: number;
  /** Set for anything that happens on a lead, so it shows on that lead's timeline */
  leadId?: number;
  details?: string;
}) {
  await db.insert(schema.auditLogs).values({
    userId: entry.userId,
    action: entry.action,
    entity: entry.entity,
    entityId: entry.entityId ?? null,
    leadId: entry.leadId ?? null,
    details: entry.details ?? "",
  });
}
