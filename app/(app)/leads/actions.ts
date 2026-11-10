"use server";

import { and, eq } from "drizzle-orm";
import { revalidatePath } from "next/cache";
import { z } from "zod";
import { logAudit } from "@/lib/audit";
import { requirePermission } from "@/lib/auth";
import { db, schema } from "@/lib/db";
import { SOURCES_OF_FUNDS } from "@/lib/db/schema";
import { missingRequiredDocuments } from "@/lib/documents";
import { screenCustomer } from "@/lib/kyc";
import { getLead, usersWithPermission } from "@/lib/queries";
import type { Permission } from "@/lib/rbac";

const { leads, quotes, plans, insurers, kycRecords, policies, documents, productDocuments } = schema;

export type FormState = { error?: string; ok?: boolean };

/** Loads a lead the user may act on. Leads outside their scope behave as if they do not exist. */
async function scopedLead(permission: Permission, leadId: number) {
  const user = await requirePermission(permission);
  const row = await getLead(user, leadId);
  if (!row) throw new Error("Lead not found");
  return { user, ...row };
}

const refresh = (leadId: number) => revalidatePath(`/leads/${leadId}`);

export async function updateLeadStage(formData: FormData) {
  const stage = z.enum(["needs_analysis", "quoted", "kyc", "lost"]).parse(formData.get("stage"));
  const { user, lead } = await scopedLead("leads:edit", Number(formData.get("leadId")));
  if (lead.stage === "won") throw new Error("Won leads are closed");

  await db.update(leads).set({ stage, updatedAt: new Date() }).where(eq(leads.id, lead.id));
  await logAudit({ userId: user.id, action: "stage", entity: "lead", entityId: lead.id, leadId: lead.id, details: `${lead.stage} → ${stage}` });
  refresh(lead.id);
}

export async function reassignAdvisor(formData: FormData) {
  const { user, lead } = await scopedLead("leads:assign", Number(formData.get("leadId")));
  const advisors = await usersWithPermission(lead.departmentId, "quotes:create");
  const advisor = advisors.find((a) => a.id === Number(formData.get("advisorId")));
  if (!advisor) throw new Error("Pick an advisor from this department");

  await db.update(leads).set({ advisorId: advisor.id, updatedAt: new Date() }).where(eq(leads.id, lead.id));
  await logAudit({ userId: user.id, action: "assign", entity: "lead", entityId: lead.id, leadId: lead.id, details: advisor.name });
  refresh(lead.id);
}

export async function createQuote(_prev: FormState, formData: FormData): Promise<FormState> {
  const { user, lead, opportunity } = await scopedLead("quotes:create", Number(formData.get("leadId")));
  const parsed = z
    .object({ planId: z.coerce.number().int(), premium: z.coerce.number().int("Whole numbers only").positive("Premium must be positive") })
    .safeParse(Object.fromEntries(formData));
  if (!parsed.success) return { error: parsed.error.issues[0].message };

  const [plan] = await db
    .select({ plan: plans, insurerName: insurers.name })
    .from(plans)
    .innerJoin(insurers, eq(plans.insurerId, insurers.id))
    .where(and(eq(plans.id, parsed.data.planId), eq(plans.active, true), eq(insurers.active, true), eq(plans.product, opportunity.product)));
  if (!plan) return { error: "That plan is not available for this product" };

  const [quote] = await db
    .insert(quotes)
    .values({
      leadId: lead.id,
      planId: plan.plan.id,
      insurer: plan.insurerName,
      coverage: `${plan.plan.name} (${plan.plan.cover})`,
      premium: parsed.data.premium,
      createdBy: user.id,
    })
    .returning();
  if (lead.stage === "needs_analysis") {
    await db.update(leads).set({ stage: "quoted", updatedAt: new Date() }).where(eq(leads.id, lead.id));
  }
  await logAudit({ userId: user.id, action: "create", entity: "quote", entityId: quote.id, leadId: lead.id, details: `${quote.insurer}, ${quote.coverage}` });
  refresh(lead.id);
  return { ok: true };
}

export async function setQuoteStatus(formData: FormData) {
  const status = z.enum(["accepted", "rejected"]).parse(formData.get("status"));
  const [quote] = await db.select().from(quotes).where(eq(quotes.id, Number(formData.get("quoteId"))));
  if (!quote) throw new Error("Quote not found");
  const { user, lead } = await scopedLead("quotes:approve", quote.leadId);

  await db.update(quotes).set({ status }).where(eq(quotes.id, quote.id));
  await logAudit({ userId: user.id, action: status, entity: "quote", entityId: quote.id, leadId: lead.id, details: quote.insurer });
  refresh(lead.id);
}

const kycSchema = z.object({
  idNumber: z.string().trim().min(4, "Enter the ID number"),
  nationality: z.string().trim().min(2),
  dateOfBirth: z.iso.date("Enter the date of birth"),
  idExpiry: z.iso.date("Enter the ID expiry date"),
  occupation: z.string().trim().min(2),
  sourceOfFunds: z.enum(SOURCES_OF_FUNDS),
});

export async function submitKyc(_prev: FormState, formData: FormData): Promise<FormState> {
  const { user, lead, opportunity } = await scopedLead("kyc:submit", Number(formData.get("leadId")));
  const parsed = kycSchema.safeParse(Object.fromEntries(formData));
  if (!parsed.success) return { error: parsed.error.issues[0].message };

  const [kyc] = await db.select().from(kycRecords).where(eq(kycRecords.leadId, lead.id));
  if (kyc.status === "submitted" || kyc.status === "approved") return { error: "KYC is already with compliance" };

  const leadQuotes = await db.select({ premium: quotes.premium }).from(quotes).where(eq(quotes.leadId, lead.id));
  const screening = screenCustomer({
    customerName: opportunity.customerName,
    ...parsed.data,
    highestPremium: Math.max(0, ...leadQuotes.map((q) => q.premium)),
  });

  await db
    .update(kycRecords)
    .set({
      ...parsed.data,
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
  await logAudit({ userId: user.id, action: "submit", entity: "kyc", entityId: kyc.id, leadId: lead.id, details: `Risk ${screening.riskRating}${screening.eddRequired ? ", EDD required" : ""}` });
  refresh(lead.id);
  return { ok: true };
}

const MAX_FILE_BYTES = 2 * 1024 * 1024;
const ALLOWED_TYPES = ["application/pdf", "image/png", "image/jpeg", "image/webp"];

export async function uploadDocument(_prev: FormState, formData: FormData): Promise<FormState> {
  const { user, lead, opportunity } = await scopedLead("documents:upload", Number(formData.get("leadId")));
  const file = formData.get("file");
  const documentTypeId = Number(formData.get("documentTypeId"));

  if (!(file instanceof File) || file.size === 0) return { error: "Choose a file" };
  if (file.size > MAX_FILE_BYTES) return { error: "Files must be 2 MB or smaller" };
  if (!ALLOWED_TYPES.includes(file.type)) return { error: "Upload a PDF, PNG, JPG or WEBP file" };

  // Only document types configured for this product in Document settings are accepted
  const [allowed] = await db
    .select()
    .from(productDocuments)
    .where(and(eq(productDocuments.product, opportunity.product), eq(productDocuments.documentTypeId, documentTypeId)));
  if (!allowed) return { error: "This document type is not used for this product" };

  const [doc] = await db
    .insert(documents)
    .values({
      leadId: lead.id,
      documentTypeId,
      fileName: file.name.slice(0, 120),
      mimeType: file.type,
      size: file.size,
      data: Buffer.from(await file.arrayBuffer()).toString("base64"),
      uploadedBy: user.id,
    })
    .returning({ id: documents.id, fileName: documents.fileName });
  await logAudit({ userId: user.id, action: "upload", entity: "document", entityId: doc.id, leadId: lead.id, details: doc.fileName });
  refresh(lead.id);
  return { ok: true };
}

export async function deleteDocument(formData: FormData) {
  const [doc] = await db
    .select({ id: documents.id, leadId: documents.leadId, fileName: documents.fileName })
    .from(documents)
    .where(eq(documents.id, Number(formData.get("documentId"))));
  if (!doc) throw new Error("Document not found");
  const { user, lead } = await scopedLead("documents:upload", doc.leadId);

  await db.delete(documents).where(eq(documents.id, doc.id));
  await logAudit({ userId: user.id, action: "delete", entity: "document", entityId: doc.id, leadId: lead.id, details: doc.fileName });
  refresh(lead.id);
}

export async function issuePolicy(formData: FormData) {
  const [quote] = await db.select().from(quotes).where(eq(quotes.id, Number(formData.get("quoteId"))));
  if (!quote || quote.status !== "accepted") throw new Error("Only accepted quotes can become policies");
  const { user, lead, opportunity } = await scopedLead("policies:issue", quote.leadId);

  // Compliance gate: no policy without approved KYC and every required document
  const [kyc] = await db.select({ status: kycRecords.status }).from(kycRecords).where(eq(kycRecords.leadId, lead.id));
  if (kyc?.status !== "approved") throw new Error("KYC must be approved by compliance first");
  if ((await missingRequiredDocuments(lead.id, opportunity.product)).length > 0) {
    throw new Error("Upload all required documents first");
  }
  const [existing] = await db.select({ id: policies.id }).from(policies).where(eq(policies.leadId, lead.id));
  if (existing) throw new Error("A policy was already booked for this lead");

  const start = new Date();
  const end = new Date(start.getTime() + 365 * 86_400_000);
  const [policy] = await db
    .insert(policies)
    .values({
      policyNumber: `PD-${start.getFullYear()}-${String(lead.id).padStart(5, "0")}`,
      leadId: lead.id,
      quoteId: quote.id,
      premium: quote.premium,
      startDate: start.toISOString().slice(0, 10),
      endDate: end.toISOString().slice(0, 10),
    })
    .returning();
  await db.update(leads).set({ stage: "won", updatedAt: new Date() }).where(eq(leads.id, lead.id));
  await logAudit({ userId: user.id, action: "book", entity: "policy", entityId: policy.id, leadId: lead.id, details: `${policy.policyNumber}, awaiting payment` });
  refresh(lead.id);
}
