"use server";

import { eq } from "drizzle-orm";
import { revalidatePath } from "next/cache";
import { EDITABLE_LEAD_STAGES } from "@/constants/statuses";
import { id, option } from "@/schemas/fields";
import { logAudit } from "@/server/audit";
import { db, schema } from "@/server/db";
import { requireLead } from "@/server/guards";
import { usersWithPermission } from "@/server/queries/users";

const { leads } = schema;

export async function updateLeadStage(formData: FormData) {
  const stage = option(EDITABLE_LEAD_STAGES).parse(formData.get("stage"));
  const { user, lead } = await requireLead("leads:edit", id.parse(formData.get("leadId")));
  if (lead.stage === "won") throw new Error("Won leads are closed");

  await db.update(leads).set({ stage, updatedAt: new Date() }).where(eq(leads.id, lead.id));
  await logAudit({
    userId: user.id,
    action: "stage",
    entity: "lead",
    entityId: lead.id,
    leadId: lead.id,
    details: `${lead.stage} → ${stage}`,
  });
  revalidatePath("/leads/[id]", "page");
}

/** Moves every selected lead to one stage (ActionBar on the leads list). Won leads stay closed. */
export async function updateLeadStages(formData: FormData) {
  const stage = option(EDITABLE_LEAD_STAGES).parse(formData.get("stage"));
  const ids = formData.getAll("leadIds").map((v) => id.parse(v));

  for (const leadId of ids) {
    const { user, lead } = await requireLead("leads:edit", leadId);
    if (lead.stage === "won" || lead.stage === stage) continue;
    await db.update(leads).set({ stage, updatedAt: new Date() }).where(eq(leads.id, lead.id));
    await logAudit({
      userId: user.id,
      action: "stage",
      entity: "lead",
      entityId: lead.id,
      leadId: lead.id,
      details: `${lead.stage} → ${stage}`,
    });
  }
  revalidatePath("/leads");
}

export async function reassignAdvisor(formData: FormData) {
  const { user, lead } = await requireLead("leads:assign", id.parse(formData.get("leadId")));
  const advisor = (await usersWithPermission(lead.departmentId, "quotes:create")).find(
    (a) => a.id === Number(formData.get("advisorId")),
  );
  if (!advisor) throw new Error("Pick an advisor from this department");

  await db.update(leads).set({ advisorId: advisor.id, updatedAt: new Date() }).where(eq(leads.id, lead.id));
  await logAudit({
    userId: user.id,
    action: "assign",
    entity: "lead",
    entityId: lead.id,
    leadId: lead.id,
    details: advisor.name,
  });
  revalidatePath("/leads/[id]", "page");
}
