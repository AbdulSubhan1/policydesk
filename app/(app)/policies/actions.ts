"use server";

import { eq } from "drizzle-orm";
import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { z } from "zod";
import { logAudit } from "@/lib/audit";
import { requirePermission } from "@/lib/auth";
import { db, schema } from "@/lib/db";
import { PAYMENT_METHODS } from "@/lib/db/schema";
import { getLead } from "@/lib/queries";
import type { Permission } from "@/lib/rbac";

const { policies, leads, kycRecords, users } = schema;

async function scopedPolicy(permission: Permission, policyId: number) {
  const user = await requirePermission(permission);
  const [policy] = await db.select().from(policies).where(eq(policies.id, policyId));
  const row = policy && (await getLead(user, policy.leadId));
  if (!policy || !row) throw new Error("Policy not found");
  return { user, policy, lead: row.lead };
}

function refresh(leadId: number) {
  revalidatePath("/policies");
  revalidatePath(`/leads/${leadId}`);
}

export async function recordPayment(formData: FormData) {
  const { user, policy, lead } = await scopedPolicy("payments:record", Number(formData.get("policyId")));
  const data = z
    .object({
      paymentStatus: z.enum(["paid", "failed", "refunded"]),
      paymentMethod: z.enum(PAYMENT_METHODS),
      paymentReference: z.string().trim().max(60).default(""),
    })
    .parse(Object.fromEntries(formData));
  if (policy.status === "cancelled" && data.paymentStatus === "paid") throw new Error("Cancelled policies cannot be paid");

  // Paying a booked policy activates it; a refund cancels it
  const status = data.paymentStatus === "paid" ? "active" : data.paymentStatus === "refunded" ? "cancelled" : policy.status;
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
    details: `${policy.policyNumber} · ${data.paymentMethod.replace("_", " ")}${data.paymentReference ? ` · ${data.paymentReference}` : ""}`,
  });
  refresh(lead.id);
}

export async function cancelPolicy(formData: FormData) {
  const { user, policy, lead } = await scopedPolicy("policies:cancel", Number(formData.get("policyId")));
  await db.update(policies).set({ status: "cancelled" }).where(eq(policies.id, policy.id));
  await logAudit({ userId: user.id, action: "cancel", entity: "policy", entityId: policy.id, leadId: lead.id, details: policy.policyNumber });
  refresh(lead.id);
}

export async function startRenewal(formData: FormData) {
  const { user, policy, lead } = await scopedPolicy("policies:renew", Number(formData.get("policyId")));
  if (policy.status !== "active") throw new Error("Only active policies can be renewed");
  if (policy.renewedByLeadId) redirect(`/leads/${policy.renewedByLeadId}`);

  // Keep the same advisor if they are still active, otherwise leave it for the manager to assign
  const [advisor] = lead.advisorId ? await db.select({ active: users.active }).from(users).where(eq(users.id, lead.advisorId)) : [];
  const [renewal] = await db
    .insert(leads)
    .values({
      opportunityId: lead.opportunityId,
      departmentId: lead.departmentId,
      advisorId: advisor?.active ? lead.advisorId : null,
      type: "renewal",
      previousPolicyId: policy.id,
    })
    .returning();

  // Approved KYC with a valid ID carries over; anything else has to be collected again
  const [oldKyc] = await db.select().from(kycRecords).where(eq(kycRecords.leadId, lead.id));
  const stillValid = oldKyc?.status === "approved" && !!oldKyc.idExpiry && new Date(oldKyc.idExpiry) > new Date(policy.endDate);
  if (oldKyc) {
    await db.insert(kycRecords).values({
      leadId: renewal.id,
      idNumber: oldKyc.idNumber,
      nationality: oldKyc.nationality,
      dateOfBirth: oldKyc.dateOfBirth,
      idExpiry: oldKyc.idExpiry,
      occupation: oldKyc.occupation,
      sourceOfFunds: oldKyc.sourceOfFunds,
      isPep: oldKyc.isPep,
      watchlistMatch: oldKyc.watchlistMatch,
      riskRating: oldKyc.riskRating,
      riskReasons: oldKyc.riskReasons,
      eddRequired: oldKyc.eddRequired,
      submittedBy: oldKyc.submittedBy,
      submittedAt: oldKyc.submittedAt,
      reviewedBy: stillValid ? oldKyc.reviewedBy : null,
      reviewedAt: stillValid ? oldKyc.reviewedAt : null,
      status: stillValid ? "approved" : "pending",
      reviewNote: stillValid ? `Carried over from ${policy.policyNumber}` : null,
    });
  } else {
    await db.insert(kycRecords).values({ leadId: renewal.id });
  }

  await db.update(policies).set({ renewedByLeadId: renewal.id }).where(eq(policies.id, policy.id));
  await logAudit({ userId: user.id, action: "renew", entity: "policy", entityId: policy.id, leadId: lead.id, details: `Renewal lead #${renewal.id} created` });
  await logAudit({ userId: user.id, action: "create", entity: "renewal", entityId: renewal.id, leadId: renewal.id, details: `Renewal of ${policy.policyNumber}${stillValid ? ", KYC carried over" : ", KYC needed again"}` });
  redirect(`/leads/${renewal.id}`);
}
