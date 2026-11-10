"use server";

import { eq } from "drizzle-orm";
import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { departmentOf } from "@/constants/products";
import { EDITABLE_OPPORTUNITY_STATUSES } from "@/constants/statuses";
import { can, type Permission } from "@/lib/rbac";
import { id, option, type ActionResult } from "@/schemas/common";
import { opportunitySchema, type OpportunityInput } from "@/schemas/opportunity";
import { logAudit } from "@/server/audit";
import { requirePermission } from "@/server/auth";
import { db, schema } from "@/server/db";
import { getOpportunity } from "@/server/queries/opportunities";
import { usersWithPermission } from "@/server/queries/users";

const { opportunities, leads, kycRecords, departments } = schema;

export async function createOpportunity(input: OpportunityInput): Promise<ActionResult> {
  const user = await requirePermission("opportunities:create");
  const parsed = opportunitySchema.safeParse(input);
  if (!parsed.success) return { ok: false, error: parsed.error.issues[0].message };

  // The product decides the department, and so who can see the opportunity
  const [dept] = await db
    .select({ id: departments.id })
    .from(departments)
    .where(eq(departments.key, departmentOf(parsed.data.product)));
  // A coordinator creating one in their own department owns it straight away
  const coordinatorId = can(user, "opportunities:convert") && user.departmentId === dept.id ? user.id : null;

  const [opp] = await db
    .insert(opportunities)
    .values({ ...parsed.data, departmentId: dept.id, coordinatorId })
    .returning();
  await logAudit({
    userId: user.id,
    action: "create",
    entity: "opportunity",
    entityId: opp.id,
    details: opp.customerName,
  });
  redirect(`/opportunities/${opp.id}`);
}

async function scoped(permission: Permission, formData: FormData) {
  const user = await requirePermission(permission);
  const row = await getOpportunity(user, id.parse(formData.get("id")));
  if (!row) throw new Error("errors.notFound");
  return { user, opp: row.opportunity };
}

export async function updateOpportunityStatus(formData: FormData) {
  const status = option(EDITABLE_OPPORTUNITY_STATUSES).parse(formData.get("status"));
  const { user, opp } = await scoped("opportunities:edit", formData);
  if (opp.status === "converted") throw new Error("Converted opportunities cannot change status");

  await db.update(opportunities).set({ status, updatedAt: new Date() }).where(eq(opportunities.id, opp.id));
  await logAudit({
    userId: user.id,
    action: "status",
    entity: "opportunity",
    entityId: opp.id,
    details: `${opp.status} → ${status}`,
  });
  revalidatePath(`/opportunities/${opp.id}`);
}

export async function assignCoordinator(formData: FormData) {
  const { user, opp } = await scoped("opportunities:assign", formData);
  const raw = String(formData.get("coordinatorId") ?? "");
  const coordinator = raw
    ? (await usersWithPermission(opp.departmentId, "opportunities:convert")).find((c) => c.id === Number(raw))
    : null;
  if (raw && !coordinator) throw new Error("Pick a coordinator from this department");

  await db
    .update(opportunities)
    .set({ coordinatorId: coordinator?.id ?? null, updatedAt: new Date() })
    .where(eq(opportunities.id, opp.id));
  await logAudit({
    userId: user.id,
    action: "assign",
    entity: "opportunity",
    entityId: opp.id,
    details: coordinator?.name ?? "—",
  });
  revalidatePath(`/opportunities/${opp.id}`);
}

export async function convertToLead(formData: FormData) {
  const { user, opp } = await scoped("opportunities:convert", formData);
  if (opp.status !== "qualified") throw new Error("Only qualified opportunities can be converted");

  const advisor = (await usersWithPermission(opp.departmentId, "quotes:create")).find(
    (a) => a.id === Number(formData.get("advisorId")),
  );
  if (!advisor) throw new Error("Pick an advisor from this department");

  const [lead] = await db
    .insert(leads)
    .values({ opportunityId: opp.id, departmentId: opp.departmentId, advisorId: advisor.id })
    .returning();
  await db.insert(kycRecords).values({ leadId: lead.id });
  await db
    .update(opportunities)
    .set({ status: "converted", updatedAt: new Date() })
    .where(eq(opportunities.id, opp.id));
  await logAudit({
    userId: user.id,
    action: "convert",
    entity: "opportunity",
    entityId: opp.id,
    leadId: lead.id,
    details: advisor.name,
  });
  redirect(`/leads/${lead.id}`);
}
