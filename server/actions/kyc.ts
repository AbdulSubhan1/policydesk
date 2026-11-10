"use server";

import { eq } from "drizzle-orm";
import { revalidatePath } from "next/cache";
import { KYC_DECISIONS } from "@/constants/statuses";
import { screenCustomer } from "@/lib/kyc";
import { id, option, type ActionResult } from "@/schemas/common";
import { kycSchema, type KycInput } from "@/schemas/kyc";
import { logAudit } from "@/server/audit";
import { requirePermission } from "@/server/auth";
import { db, schema } from "@/server/db";
import { requireLead } from "@/server/guards";

const { leads, quotes, kycRecords } = schema;

export async function submitKyc(input: KycInput): Promise<ActionResult> {
  const parsed = kycSchema.safeParse(input);
  if (!parsed.success) return { ok: false, error: parsed.error.issues[0].message };
  const { leadId, ...data } = parsed.data;
  const { user, lead, opportunity } = await requireLead("kyc:submit", leadId);

  const [kyc] = await db.select().from(kycRecords).where(eq(kycRecords.leadId, lead.id));
  if (kyc.status === "submitted" || kyc.status === "approved") return { ok: false, error: "errors.kycAlreadySent" };

  const premiums = await db.select({ premium: quotes.premium }).from(quotes).where(eq(quotes.leadId, lead.id));
  const screening = screenCustomer({
    customerName: opportunity.customerName,
    ...data,
    highestPremium: Math.max(0, ...premiums.map((q) => q.premium)),
  });

  await db
    .update(kycRecords)
    .set({
      ...data,
      ...screening,
      status: "submitted",
      submittedBy: user.id,
      submittedAt: new Date(),
      reviewedBy: null,
      reviewedAt: null,
      reviewNote: null,
    })
    .where(eq(kycRecords.id, kyc.id));
  await db.update(leads).set({ stage: "kyc", updatedAt: new Date() }).where(eq(leads.id, lead.id));
  await logAudit({
    userId: user.id,
    action: "submit",
    entity: "kyc",
    entityId: kyc.id,
    leadId: lead.id,
    details: screening.riskRating,
  });
  revalidatePath(`/leads/${lead.id}`);
  return { ok: true };
}

export async function reviewKyc(formData: FormData) {
  const user = await requirePermission("kyc:review");
  const decision = option(KYC_DECISIONS).parse(formData.get("decision"));
  const note = String(formData.get("note") ?? "").trim();

  const [kyc] = await db
    .select()
    .from(kycRecords)
    .where(eq(kycRecords.id, id.parse(formData.get("kycId"))));
  if (!kyc || kyc.status !== "submitted") throw new Error("errors.notFound");
  // Enhanced due diligence cases and rejections need a written reason
  if ((kyc.eddRequired || decision === "rejected") && note.length < 5) throw new Error("errors.reviewNoteRequired");
  // Four-eyes rule: whoever collected the KYC cannot approve it
  if (kyc.submittedBy === user.id) throw new Error("errors.ownKyc");

  await db
    .update(kycRecords)
    .set({ status: decision, reviewedBy: user.id, reviewedAt: new Date(), reviewNote: note || null })
    .where(eq(kycRecords.id, kyc.id));
  await logAudit({
    userId: user.id,
    action: decision === "approved" ? "approve" : "reject",
    entity: "kyc",
    entityId: kyc.id,
    leadId: kyc.leadId,
    details: note,
  });
  revalidatePath("/kyc");
  revalidatePath(`/leads/${kyc.leadId}`);
}
