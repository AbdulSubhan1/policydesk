"use server";

import { eq } from "drizzle-orm";
import { revalidatePath } from "next/cache";
import type { ActionResult } from "@/schemas/action-result";
import {
  fullCarDetailsSchema,
  websiteConvertSchema,
  websiteDetailsSchema,
  type WebsiteDetailsInput,
} from "@/schemas/website";
import { logAudit } from "@/server/audit";
import { db, schema } from "@/server/db";
import { requireOpportunity } from "@/server/guards";
import { convertWebsiteOpportunityToLead, isWebsiteCarOpportunity } from "@/server/website/opportunities";

// The coordinator's side of a short-form website opportunity: complete the details, then convert without an advisor.

const { opportunities } = schema;

/** A website opportunity in the user's scope that is still open. The UI offers nothing else, so anything else throws. */
async function openWebsiteOpportunity(id: number) {
  const { user, opportunity } = await requireOpportunity("opportunities:convert", id);
  if (!isWebsiteCarOpportunity(opportunity) || opportunity.status === "converted") {
    throw new Error("Only open website opportunities are handled here");
  }
  return { user, opp: opportunity };
}

export async function saveWebsiteDetails(input: WebsiteDetailsInput): Promise<ActionResult> {
  const parsed = websiteDetailsSchema.safeParse(input);
  if (!parsed.success) return { ok: false, error: parsed.error.issues[0].message };
  const { id, ...answers } = parsed.data;
  const { user, opp } = await openWebsiteOpportunity(id);

  // Other keys stay; an answer cleared in the form is removed, as if the website never sent it
  const details = Object.fromEntries(
    Object.entries({ ...opp.details, ...answers }).filter(([, value]) => value !== undefined),
  ) as typeof opp.details;
  const changed = Object.keys({ ...opp.details, ...details }).filter((key) => opp.details[key] !== details[key]);

  await db.update(opportunities).set({ details, updatedAt: new Date() }).where(eq(opportunities.id, opp.id));
  await logAudit({
    userId: user.id,
    action: "details",
    entity: "opportunity",
    entityId: opp.id,
    details: changed.join(", ") || "—",
  });
  revalidatePath(`/opportunities/${opp.id}`);
  return { ok: true };
}

/** Converts once the details are as complete as the full form's. The advisor is assigned after payment. */
export async function convertWebsiteOpportunity(input: { id: number }): Promise<ActionResult> {
  const parsed = websiteConvertSchema.safeParse(input);
  if (!parsed.success) return { ok: false, error: parsed.error.issues[0].message };
  const { user, opp } = await openWebsiteOpportunity(parsed.data.id);
  if (opp.status !== "qualified") throw new Error("Only qualified opportunities can be converted");

  // Names the first field to complete, in the form's order
  const details = fullCarDetailsSchema.safeParse(opp.details);
  if (!details.success) {
    const [issue] = details.error.issues;
    return { ok: false, error: issue.path.length ? `errors.detailsMissing.${String(issue.path[0])}` : issue.message };
  }

  await convertWebsiteOpportunityToLead(opp, user.id, "advisor after payment");
  revalidatePath(`/opportunities/${opp.id}`);
  return { ok: true };
}
