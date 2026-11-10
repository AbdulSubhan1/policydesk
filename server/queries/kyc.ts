import { desc, eq, inArray } from "drizzle-orm";
import { alias } from "drizzle-orm/pg-core";
import { db, schema } from "@/server/db";

const { opportunities, leads, users, departments, kycRecords } = schema;
const advisor = alias(users, "advisor");

export async function kycQueue(statuses: ("submitted" | "approved" | "rejected")[]) {
  return db
    .select({
      kyc: kycRecords,
      leadPublicId: leads.publicId,
      reference: leads.reference,
      customerName: opportunities.customerName,
      product: opportunities.product,
      departmentKey: departments.key,
      advisorName: advisor.name,
    })
    .from(kycRecords)
    .innerJoin(leads, eq(kycRecords.leadId, leads.id))
    .innerJoin(opportunities, eq(leads.opportunityId, opportunities.id))
    .innerJoin(departments, eq(leads.departmentId, departments.id))
    .leftJoin(advisor, eq(leads.advisorId, advisor.id))
    .where(inArray(kycRecords.status, statuses))
    .orderBy(desc(kycRecords.submittedAt));
}
