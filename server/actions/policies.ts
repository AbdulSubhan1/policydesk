"use server";

import { eq } from "drizzle-orm";
import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { z } from "zod";
import { PAYMENT_METHODS } from "@/constants/statuses";
import { leadPath, leadReference } from "@/lib/reference";
import { id, option, optionalText } from "@/schemas/fields";
import { logAudit } from "@/server/audit";
import { db, schema } from "@/server/db";
import { requirePolicy, requireQuote } from "@/server/guards";
import { missingRequiredDocuments } from "@/server/queries/documents";

const { policies, leads, kycRecords, users } = schema;
const DAY = 86_400_000;

/** Every lead page and the policy list show policy state. */
function refresh() {
  revalidatePath("/policies");
  revalidatePath("/leads/[id]", "page");
}

export async function issuePolicy(formData: FormData) {
  const { user, lead, opportunity, quote } = await requireQuote("policies:issue", id.parse(formData.get("quoteId")));
  if (quote.status !== "accepted") throw new Error("Only accepted quotes can become policies");

  // Compliance gate: no policy without approved KYC and every required document
  const [kyc] = await db.select({ status: kycRecords.status }).from(kycRecords).where(eq(kycRecords.leadId, lead.id));
  if (kyc?.status !== "approved") throw new Error("KYC must be approved by compliance first");
  if ((await missingRequiredDocuments(lead.id, opportunity.product)).length > 0)
    throw new Error("Upload all required documents first");
  const [existing] = await db.select({ id: policies.id }).from(policies).where(eq(policies.leadId, lead.id));
  if (existing) throw new Error("A policy was already booked for this lead");

  const start = new Date();
  const [policy] = await db
    .insert(policies)
    .values({
      policyNumber: `PD-${start.getFullYear()}-${String(lead.id).padStart(5, "0")}`,
      leadId: lead.id,
      quoteId: quote.id,
      premium: quote.premium,
      startDate: start.toISOString().slice(0, 10),
      endDate: new Date(start.getTime() + 365 * DAY).toISOString().slice(0, 10),
    })
    .returning();
  await db.update(leads).set({ stage: "won", updatedAt: new Date() }).where(eq(leads.id, lead.id));
  await logAudit({
    userId: user.id,
    action: "book",
    entity: "policy",
    entityId: policy.id,
    leadId: lead.id,
    details: policy.policyNumber,
  });
  refresh();
}

const paymentSchema = z.object({
  paymentStatus: option(["paid", "failed", "refunded"] as const),
  paymentMethod: option(PAYMENT_METHODS),
  paymentReference: optionalText(60),
});

export async function recordPayment(formData: FormData) {
  const { user, policy, lead } = await requirePolicy("payments:record", id.parse(formData.get("policyId")));
  const data = paymentSchema.parse(Object.fromEntries(formData));
  if (policy.status === "cancelled" && data.paymentStatus === "paid")
    throw new Error("Cancelled policies cannot be paid");

  // Paying a booked policy activates it; a refund cancels it
  const status =
    data.paymentStatus === "paid" ? "active" : data.paymentStatus === "refunded" ? "cancelled" : policy.status;
  await db
    .update(policies)
    .set({
      ...data,
      paymentReference: data.paymentReference || null,
      status,
      paidAt: data.paymentStatus === "paid" ? new Date() : policy.paidAt,
    })
    .where(eq(policies.id, policy.id));
  await logAudit({
    userId: user.id,
    action: data.paymentStatus,
    entity: "payment",
    entityId: policy.id,
    leadId: lead.id,
    details: [policy.policyNumber, data.paymentReference].filter(Boolean).join(", "),
  });
  refresh();
}

export async function cancelPolicy(formData: FormData) {
  const { user, policy, lead } = await requirePolicy("policies:cancel", id.parse(formData.get("policyId")));
  await db.update(policies).set({ status: "cancelled" }).where(eq(policies.id, policy.id));
  await logAudit({
    userId: user.id,
    action: "cancel",
    entity: "policy",
    entityId: policy.id,
    leadId: lead.id,
    details: policy.policyNumber,
  });
  refresh();
}

export async function startRenewal(formData: FormData) {
  const { user, policy, lead, opportunity } = await requirePolicy("policies:renew", id.parse(formData.get("policyId")));
  if (policy.renewedByLeadId) {
    const [renewed] = await db
      .select({ publicId: leads.publicId })
      .from(leads)
      .where(eq(leads.id, policy.renewedByLeadId));
    redirect(leadPath(renewed.publicId));
  }
  if (policy.status !== "active") throw new Error("Only active policies can be renewed");

  // Keep the same advisor while they are active; otherwise the manager assigns one
  const [advisor] = lead.advisorId
    ? await db.select({ active: users.active }).from(users).where(eq(users.id, lead.advisorId))
    : [];
  const [renewal] = await db
    .insert(leads)
    .values({
      opportunityId: lead.opportunityId,
      reference: leadReference(opportunity.product),
      departmentId: lead.departmentId,
      advisorId: advisor?.active ? lead.advisorId : null,
      type: "renewal",
      previousPolicyId: policy.id,
    })
    .returning();

  // Approved KYC with an ID valid past the renewal carries over; anything else is collected again
  const [old] = await db.select().from(kycRecords).where(eq(kycRecords.leadId, lead.id));
  const carry = old?.status === "approved" && !!old.idExpiry && new Date(old.idExpiry) > new Date(policy.endDate);
  await db.insert(kycRecords).values(
    old
      ? {
          leadId: renewal.id,
          status: carry ? "approved" : "pending",
          idNumber: old.idNumber,
          nationality: old.nationality,
          dateOfBirth: old.dateOfBirth,
          idExpiry: old.idExpiry,
          occupation: old.occupation,
          sourceOfFunds: old.sourceOfFunds,
          isPep: old.isPep,
          watchlistMatch: old.watchlistMatch,
          riskRating: old.riskRating,
          riskReasons: old.riskReasons,
          eddRequired: old.eddRequired,
          reviewedBy: carry ? old.reviewedBy : null,
          reviewedAt: carry ? old.reviewedAt : null,
          reviewNote: carry ? policy.policyNumber : null,
        }
      : { leadId: renewal.id },
  );

  await db.update(policies).set({ renewedByLeadId: renewal.id }).where(eq(policies.id, policy.id));
  await logAudit({
    userId: user.id,
    action: "renew",
    entity: "policy",
    entityId: policy.id,
    leadId: lead.id,
    details: renewal.reference,
  });
  await logAudit({
    userId: user.id,
    action: "create",
    entity: "renewal",
    entityId: renewal.id,
    leadId: renewal.id,
    details: policy.policyNumber,
  });
  redirect(leadPath(renewal.publicId));
}
