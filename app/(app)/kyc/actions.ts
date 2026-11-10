"use server";

import { eq } from "drizzle-orm";
import { revalidatePath } from "next/cache";
import { z } from "zod";
import { logAudit } from "@/lib/audit";
import { requirePermission } from "@/lib/auth";
import { db, schema } from "@/lib/db";

const { kycRecords } = schema;

export async function reviewKyc(formData: FormData) {
  const user = await requirePermission("kyc:review");
  const decision = z.enum(["approved", "rejected"]).parse(formData.get("decision"));
  const note = String(formData.get("note") ?? "").trim();

  const [kyc] = await db.select().from(kycRecords).where(eq(kycRecords.id, Number(formData.get("kycId"))));
  if (!kyc || kyc.status !== "submitted") throw new Error("This KYC is not waiting for review");
  // Enhanced due diligence cases and rejections need a written reason
  if ((kyc.eddRequired || decision === "rejected") && note.length < 5) {
    throw new Error("Add a note explaining the decision");
  }
  // Four-eyes rule: the person who collected KYC cannot approve it
  if (kyc.submittedBy === user.id) throw new Error("You cannot review KYC you submitted");

  await db
    .update(kycRecords)
    .set({ status: decision, reviewedBy: user.id, reviewedAt: new Date(), reviewNote: note || null })
    .where(eq(kycRecords.id, kyc.id));
  await logAudit({ userId: user.id, action: decision === "approved" ? "approve" : "reject", entity: "kyc", entityId: kyc.id, leadId: kyc.leadId, details: note || "No note" });
  revalidatePath("/kyc");
  revalidatePath(`/leads/${kyc.leadId}`);
}
