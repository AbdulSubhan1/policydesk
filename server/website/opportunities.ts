import { and, eq } from "drizzle-orm";
import { alias } from "drizzle-orm/pg-core";
import { departmentOf, type Product } from "@/constants/products";
import type { OpportunityStatus } from "@/constants/statuses";
import { isWebsiteProduct, type WebsiteProduct } from "@/constants/website";
import { leadReference } from "@/lib/reference";
import type { WebsiteOpportunityInput } from "@/schemas/website";
import { logAudit } from "@/server/audit";
import { db, schema } from "@/server/db";
import { assignCoordinator } from "./assign";
import { getWebsiteSelection, type WebsiteSelection } from "./plans";

const { opportunities, leads, kycRecords, departments, users } = schema;
const coordinator = alias(users, "coordinator");

/** What the website may see: public ids, the lead reference and the person to show. Never serial ids. */
export type WebsiteOpportunityView = {
  opportunity: { publicId: string; status: OpportunityStatus; product: Product };
  lead: { reference: string } | null;
  contact: { role: "coordinator"; name: string; email: string; phone: string } | null;
  /** The plan the visitor picked on the website, once they have */
  selection: WebsiteSelection | null;
};

type Person = { name: string; email: string; phone: string };

function toView(
  opp: { publicId: string; status: OpportunityStatus; product: Product },
  leadRef: string | null,
  person: Person | null,
  selection: WebsiteSelection | null = null,
): WebsiteOpportunityView {
  return {
    opportunity: { publicId: opp.publicId, status: opp.status, product: opp.product },
    lead: leadRef ? { reference: leadRef } : null,
    contact: person ? { role: "coordinator", name: person.name, email: person.email, phone: person.phone } : null,
    selection,
  };
}

/**
 * Same steps as createOpportunity + convertToLead in server/actions/opportunities.ts, done by the website (audit user null).
 * The short form makes an opportunity; the full form also makes its lead, whose advisor comes after payment.
 */
export async function createWebsiteOpportunity(input: WebsiteOpportunityInput): Promise<WebsiteOpportunityView> {
  const { form, product, details, ...customer } = input;
  const [dept] = await db
    .select({ id: departments.id })
    .from(departments)
    .where(eq(departments.key, departmentOf(product)));
  const person = await assignCoordinator(dept.id);

  const [opp] = await db
    .insert(opportunities)
    .values({
      ...customer,
      product,
      details,
      source: "website",
      departmentId: dept.id,
      coordinatorId: person?.id ?? null,
    })
    .returning();
  await logAudit({
    userId: null,
    action: "create",
    entity: "opportunity",
    entityId: opp.id,
    details: `Website · ${form} form`,
  });
  await logAudit({
    userId: null,
    action: "auto_assign",
    entity: "opportunity",
    entityId: opp.id,
    details: person ? `Coordinator ${person.name} (fewest open)` : "No coordinator available",
  });
  if (form === "short") return toView(opp, null, person);

  const { lead, opportunity } = await convertWebsiteOpportunityToLead(opp, null, "");
  return toView(opportunity, lead.reference, person);
}

/**
 * Opportunities from the website's forms (a product it sells), which their coordinator completes and converts
 * without an advisor. Others marked "Website" by hand (bike, life…) keep the manual screens.
 */
export const isWebsiteOpportunity = <T extends { source: string; product: Product }>(
  opp: T,
): opp is T & { product: WebsiteProduct } => opp.source === "website" && isWebsiteProduct(opp.product);

/**
 * Makes a website opportunity's lead with an empty KYC file and marks it converted, by the website (userId null) or
 * by its coordinator. No advisor: one is assigned automatically once the customer pays.
 */
export async function convertWebsiteOpportunityToLead(
  opp: typeof opportunities.$inferSelect,
  userId: number | null,
  note: string,
) {
  const [lead] = await db
    .insert(leads)
    .values({
      opportunityId: opp.id,
      reference: leadReference(opp.product),
      departmentId: opp.departmentId,
      advisorId: null,
    })
    .returning();
  await db.insert(kycRecords).values({ leadId: lead.id });
  const [opportunity] = await db
    .update(opportunities)
    .set({ status: "converted", updatedAt: new Date() })
    .where(eq(opportunities.id, opp.id))
    .returning();
  await logAudit({
    userId,
    action: "convert",
    entity: "opportunity",
    entityId: opp.id,
    leadId: lead.id,
    details: [lead.reference, note].filter(Boolean).join(" · "),
  });
  return { lead, opportunity };
}

/** The view for one opportunity by its public id, or null. */
export async function getWebsiteOpportunity(publicId: string): Promise<WebsiteOpportunityView | null> {
  const [row] = await db
    .select({
      opportunity: opportunities,
      leadId: leads.id,
      leadReference: leads.reference,
      coordinatorName: coordinator.name,
      coordinatorEmail: coordinator.email,
      coordinatorPhone: coordinator.phone,
    })
    .from(opportunities)
    .leftJoin(coordinator, eq(opportunities.coordinatorId, coordinator.id))
    .leftJoin(leads, and(eq(leads.opportunityId, opportunities.id), eq(leads.type, "new_business")))
    .where(eq(opportunities.publicId, publicId));
  if (!row) return null;

  const person =
    row.coordinatorName !== null
      ? { name: row.coordinatorName, email: row.coordinatorEmail ?? "", phone: row.coordinatorPhone ?? "" }
      : null;
  const selection = row.leadId ? await getWebsiteSelection(row.leadId) : null;
  return toView(row.opportunity, row.leadReference, person, selection);
}
