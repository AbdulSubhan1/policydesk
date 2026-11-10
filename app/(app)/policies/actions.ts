"use server";

import { eq } from "drizzle-orm";
import { revalidatePath } from "next/cache";
import { logAudit } from "@/lib/audit";
import { requirePermission } from "@/lib/auth";
import { db, schema } from "@/lib/db";
import { getLead } from "@/lib/queries";

export async function cancelPolicy(formData: FormData) {
  const user = await requirePermission("policies:cancel");
  const [policy] = await db.select().from(schema.policies).where(eq(schema.policies.id, Number(formData.get("policyId"))));
  if (!policy || !(await getLead(user, policy.leadId))) throw new Error("Policy not found");

  await db.update(schema.policies).set({ status: "cancelled" }).where(eq(schema.policies.id, policy.id));
  await logAudit({ userId: user.id, action: "cancel", entity: "policy", entityId: policy.id, details: policy.policyNumber });
  revalidatePath("/policies");
}
