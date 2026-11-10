import { and, desc, eq } from "drizzle-orm";
import { alias } from "drizzle-orm/pg-core";
import { notFound } from "next/navigation";
import { cache } from "react";
import { requireUser } from "@/server/auth";
import { db, schema } from "@/server/db";
import { documentsForProduct } from "./documents";
import { getLead } from "./leads";

// Everything the lead page shows. Each loader is wrapped in cache(), so the page and every
// tab can call them directly: one request runs each query once and nothing is passed as props.

const { quotes, kycRecords, documents, policies, auditLogs, users, plans, insurers, leads } = schema;
const reviewer = alias(users, "reviewer");
const renewalLead = alias(leads, "renewal_lead");

/** The signed-in user and the lead, scoped to what they may see. 404 otherwise. */
/** The page passes the public UUID from the URL; the tabs pass the numeric id. */
export const getLeadContext = cache(async (key: number | string) => {
  const user = await requireUser();
  const row = await getLead(user, key);
  if (!row) notFound();
  return { user, ...row, closed: row.lead.stage === "won" || row.lead.stage === "lost" };
});

export const getQuotes = cache((leadId: number) =>
  db.select().from(quotes).where(eq(quotes.leadId, leadId)).orderBy(desc(quotes.createdAt)),
);

export const getKyc = cache(async (leadId: number) => {
  const [row] = await db
    .select({ record: kycRecords, reviewerName: reviewer.name })
    .from(kycRecords)
    .leftJoin(reviewer, eq(kycRecords.reviewedBy, reviewer.id))
    .where(eq(kycRecords.leadId, leadId));
  return row;
});

/** The lead's policy, with the link to its renewal lead once renewed. */
export const getPolicy = cache(async (leadId: number) => {
  const [row] = await db
    .select({ policy: policies, renewalPublicId: renewalLead.publicId })
    .from(policies)
    .leftJoin(renewalLead, eq(policies.renewedByLeadId, renewalLead.id))
    .where(eq(policies.leadId, leadId));
  return row && { ...row.policy, renewalPublicId: row.renewalPublicId };
});

export const getPolicyById = cache(async (policyId: number) => {
  const [policy] = await db.select().from(policies).where(eq(policies.id, policyId));
  return policy;
});

/** Uploaded files plus the product's checklist, with what is still missing. */
export const getDocuments = cache(async (leadId: number) => {
  const { opportunity } = await getLeadContext(leadId);
  const [files, checklist] = await Promise.all([
    db
      .select({
        id: documents.id,
        documentTypeId: documents.documentTypeId,
        fileName: documents.fileName,
        size: documents.size,
        createdAt: documents.createdAt,
        uploadedBy: users.name,
      })
      .from(documents)
      .leftJoin(users, eq(documents.uploadedBy, users.id))
      .where(eq(documents.leadId, leadId))
      .orderBy(desc(documents.createdAt)),
    documentsForProduct(opportunity.product),
  ]);
  const uploaded = new Set(files.map((f) => f.documentTypeId));
  const required = checklist.filter((d) => d.required);
  return { files, checklist, uploaded, required, missing: required.filter((d) => !uploaded.has(d.id)) };
});

/** Active plans for the lead's product, for the quote form. */
export const getPlans = cache(async (leadId: number) => {
  const { opportunity } = await getLeadContext(leadId);
  return db
    .select({
      id: plans.id,
      name: plans.name,
      insurer: insurers.name,
      cover: plans.cover,
      basePremium: plans.basePremium,
      excess: plans.excess,
      benefits: plans.benefits,
    })
    .from(plans)
    .innerJoin(insurers, eq(plans.insurerId, insurers.id))
    .where(and(eq(plans.product, opportunity.product), eq(plans.active, true), eq(insurers.active, true)))
    .orderBy(insurers.name, plans.basePremium);
});

export const getTimeline = cache((leadId: number) =>
  db
    .select({
      id: auditLogs.id,
      action: auditLogs.action,
      entity: auditLogs.entity,
      details: auditLogs.details,
      createdAt: auditLogs.createdAt,
      userName: users.name,
    })
    .from(auditLogs)
    .leftJoin(users, eq(auditLogs.userId, users.id))
    .where(eq(auditLogs.leadId, leadId))
    .orderBy(desc(auditLogs.createdAt), desc(auditLogs.id)),
);
